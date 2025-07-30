<?php
namespace Stanford\EHSPeopleIntegration;

use DateTime;

require 'vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;




class EHSPeopleIntegration extends \ExternalModules\AbstractExternalModule {

    const BUILD_FILE_DIR = 'ehs-dashboard/dist/assets';

    const EXCEL_GENERATOR_DIR = 'excel-generator/dist/assets';

    const OSHA_DATE_OF_INJURY = 'emp_incident_date';
    const OSHA_FIELDS = [
      'osha_name' => 'osha_hide_name_3',
      'job_title' => 'osha_job_title',
      'description' => 'osha_description',
      'location' => 'osha_location',
      'date_of_injury'  => self::OSHA_DATE_OF_INJURY,
      'injury_location' => 'osha_address_hide',
      'case_type' => 'osha_type',
      'combined_total_days'  => 'osha_combined_total_days',
      'total_restrict_days' => 'osha_total_restrict_days',
      'inj_ill_class' => 'osha_inj_ill_class'
    ];
    public function __construct() {
        parent::__construct();
        // Other code to run when object is instantiated
    }

    public function injectJSMO($data = null, $init_method = null) {
        echo $this->initializeJavascriptModuleObject();
        $cmds = [
            "const module = " . $this->getJavascriptModuleObjectName()
        ];
        if (!empty($data)) $cmds[] = "module.data = " . json_encode($data);
        if (!empty($init_method)) $cmds[] = "module.afterRender(module." . $init_method . ")";
        ?>
        <script src="<?=$this->getUrl("assets/jsmo.js",true)?>"></script>
        <?php
    }

    /**
     * @return array
     */
    public function generateAssetFiles($path): array
    {
        $cwd = $this->getModulePath();
        $assets = [];

        $full_path = $cwd . $path . '/';
        $dir_files = scandir($full_path);

        // Check if scandir failed
        if ($dir_files === false) {
            $this->emError("Failed to open directory: $full_path");
            return $assets; // Return an empty array or handle the error as needed
        }

        $dir_files = array_diff($dir_files, array('..', '.'));

        foreach ($dir_files as $file) {
            $url = $this->getUrl($path . '/' . $file);
            $html = '';
            if (str_contains($file, '.js')) {
                $html = "<script type='module' crossorigin src='{$url}'></script>";
            } elseif (str_contains($file, '.css')) {
                $html = "<link rel='stylesheet' href='{$url}'>";
            }
            if ($html !== '') {
                $assets[] = $html;
            }
        }

        return $assets;
    }

    public function redcap_module_ajax($action, $payload, $project_id, $record, $instrument, $event_id, $repeat_instance,
                                       $survey_hash, $response_id, $survey_queue_hash, $page, $page_full, $user_id, $group_id)
    {
        try {
//            $sanitized = $this->sanitizeInput($payload);
            return match ($action) {
                'getRecords' => $this->getRecords($payload),
                'generateExcelFile' => $this->generateExcelFile($payload),
                default => throw new Exception ("Action $action is not defined"),
            };
        } catch (\Exception $e) {
            // log error
            \REDCap::logEvent($e);
            return [
                "success" => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * @param $payload
     * @return array
     */
    public function getRecords($payload): array
    {
        $pSettings = $this->getProjectSettings();
        $completeFields = [];
        foreach($pSettings['status-column'] as $formName){
            $completeFields[] = $formName . "_complete";
        }
        $default = ["record_id", "non_type", "emp_inc_type", "non_name", "emp_first_name", "emp_last_name", "non_date", "emp_incident_date", "tri_lead_name", "tri_lead_safety_group"];

        $detailsParams = [
            "return_format" => "json",
            "fields" => array_merge($default, $completeFields),
            "project_id" => $this->getProjectId(),
        ];

        $res = json_decode(\REDCap::getData($detailsParams), true);
        $res = $this->normalizeData($res, $completeFields);

        return [
            "success" => true,
            "data" => $res,
            "columns" => $this->generateStatusColumns($completeFields)
        ];
    }

    /**
     * @param $completeFields
     * @return array
     */
    public function generateStatusColumns($completeFields): array
    {
        $statusList = [];
        foreach($completeFields as $field) {
            // Parse label
            $parts = explode('_', $field);
            array_pop($parts); // remove 'complete'
            $label = ucwords(implode(' ', $parts)); // e.g., "some_words" -> "Some Words"

            $statusList[] = $label;
        }
        return $statusList;
    }

    /**
     * @param $records
     * @param $completeFields
     * @return array
     */
    function normalizeData($records, $completeFields): array
    {
        $nonTypeValues = [];
        $statusList = [];
        $project = new \Project(PROJECT_ID);
        $parsed = $this->parseEnumField($project->metadata["non_type"]['element_enum']);

        foreach ($records as $k => $record) {
            $nonTypeValues = []; // move inside to reset per-record
            $statusList = [];

            foreach ($record as $key => $value) {
                // Convert non_type checkbox to list of values
                if (preg_match('/^non_type___(\d+)$/', $key, $matches) && $value === "1") {
                    $num = (int)$matches[1];
                    $nonTypeValues[] = $parsed[$num];
                }

                // Format date field
                if ($key === "non_date") {
                    $date = DateTime::createFromFormat('Y-m-d', $value);
                    if ($date) {
                        $records[$k]["non_date"] = $date->format('m-d-Y');
                    }
                }
            }

            // Build completed_statuses array with parsed labels

            foreach ($completeFields as $fieldName) {
                $statusValue = $record[$fieldName] ?? '';

                // Parse label
                $parts = explode('_', $fieldName);
                array_pop($parts); // remove 'complete'
                $label = ucwords(implode(' ', $parts)); // e.g., "some_words" -> "Some Words"

                $statusList[$label] = $statusValue;
            }

            $records[$k]['completed_statuses'] = $statusList;
            $records[$k]['non_type_concat'] = implode(', ', $nonTypeValues);
        }

        return $records;
    }

    public function parseEnumField($str): array
    {
        //REDCap uses explicit \n embedded into strings
        $lines = explode("\\n", $str);

        $parsedArray = [];
        foreach ($lines as $line) {
            $parts = array_map('trim', explode(',', $line, 2)); // Split only on first comma, trim spaces
            if (count($parts) === 2) {
                $parsedArray[(int)$parts[0]] = $parts[1]; // Convert key to integer
            }
        }
        return $parsedArray;
    }

    public function generateExcelFile($payload)
    {
        $records = $this->getDateRangeRecords($payload['start'], $payload['end']);
        $preparedData = $this->prepareOshaRecords($records);
        $this->insertRecordToExcelFile($preparedData);

        return [
            "success" => true,
            'url' => $this->getUrl('OSHA_Form_300_Filled.xlsx'),
        ];
    }

    public function prepareOshaRecords($records)
    {
        $preparedRecords = [];
        $eventId = $this->getFirstEventId();
        foreach ($records as $recordId =>$record) {
            $temp = [];
            foreach (self::OSHA_FIELDS as $key => $field) {
                $temp[$key] = $record[$eventId][$field];
            }
            $preparedRecords[] = $temp;
        }
        return $preparedRecords;
    }
    public function getDateRangeRecords($start, $end)
    {

        $filter = "[".self::OSHA_DATE_OF_INJURY."] >='" . date('Y-m-d', strtotime($start)) . "' AND [".self::OSHA_DATE_OF_INJURY."] <='" . date('Y-m-d', strtotime($end)) . "'";
        $param = [
            'project_id' => $this->getProjectId(),
            'filterLogic' => $filter,
        ];
        return \REDCap::getData($param);
    }
    public function insertRecordToExcelFile($preparedData)
    {
        // Load existing Excel file (your OSHA Form 300 template)
        $spreadsheet = IOFactory::load(__DIR__ . '/osha_template.xlsx');
        $sheet = $spreadsheet->getActiveSheet();

        // establishment name
        $sheet->setCellValue("I11", "Stanford University");
        // establishment city
        $sheet->setCellValue("J12", "Palo Alto");
        // establishment state
        $sheet->setCellValue("N12", "California");

// Start inserting at row 25
        $startRow = 25;
        $caseNum = 1;
        foreach ($preparedData as $index => $row) {
            $rowIndex = $startRow + $index;

            if($index > 9){
                $sheet->insertNewRowBefore($rowIndex, 1); // Insert 1 new row before the current index
            }

            // Optional: copy style from previous row (24 in this example)
            $sheet->duplicateStyle($sheet->getStyle('A24:F24'), "A{$rowIndex}:F{$rowIndex}");


            $sheet->setCellValue("A{$rowIndex}", $caseNum); // Case No.
            $sheet->setCellValue("B{$rowIndex}", $row['osha_name']); // Employee Name
            $sheet->setCellValue("C{$rowIndex}", $row['job_title']); // Job title
            $sheet->setCellValue("D{$rowIndex}", date('m/d', strtotime($row['date_of_injury']))); // Date of injury
            $sheet->setCellValue("E{$rowIndex}", $row['location']); // Location
            $sheet->setCellValue("F{$rowIndex}", $row['description']); // Description

            // CHECK ONLY ONE box for each case based on the most serious outcome for that case:
            if($row['case_type']['1'] === '1') {
                $sheet->setCellValue("G{$rowIndex}", 'x'); // Death
            }
            if($row['case_type']['2'] === '1') {
                $sheet->setCellValue("H{$rowIndex}", 'x'); // Days away from work
            }
            if($row['case_type']['3'] === '1') {
                $sheet->setCellValue("H{$rowIndex}", 'x'); // Job transfer or restriction
            }
            if($row['case_type']['99'] === '1') {
                $sheet->setCellValue("H{$rowIndex}", 'x'); // Other record-able cases
            }

            $sheet->setCellValue("K{$rowIndex}", $row['combined_total_days']); // Away From Work (days)
            $sheet->setCellValue("L{$rowIndex}", $row['total_restrict_days']); // On job transfer or restriction (days)

            //Enter the number of days the injured or ill worker was:
            if($row['inj_ill_class']['1'] === '1') {
                $sheet->setCellValue("M{$rowIndex}", 'x'); // Injury
            }
            if($row['inj_ill_class']['2'] === '1') {
                $sheet->setCellValue("N{$rowIndex}", 'x'); // Skin Disorder
            }
            if($row['inj_ill_class']['3'] === '1') {
                $sheet->setCellValue("N{$rowIndex}", 'x'); // Respiratory Condition
            }
            if($row['inj_ill_class']['4'] === '1') {
                $sheet->setCellValue("N{$rowIndex}", 'x'); // Poisoning
            }
            if($row['inj_ill_class']['5'] === '1') {
                $sheet->setCellValue("N{$rowIndex}", 'x'); // Hearing Loss
            }
            if($row['inj_ill_class']['6'] === '1') {
                $sheet->setCellValue("N{$rowIndex}", 'x'); // All other illnesses
            }

            // update excel calculation fields (Page Totals)
            $pageTotalIndexField = $startRow + $index + 10;
            $previousTotalIndexField = $pageTotalIndexField - 1;

            // only update calculation fields for Page totals when more than 10 records exists
            if($index > 9) {
                // death column G
                $sheet->setCellValue("G{$pageTotalIndexField}", "=COUNTIF(G$startRow:G$previousTotalIndexField,\"=x\")");

                // Days away from work column H
                $sheet->setCellValue("H{$pageTotalIndexField}", "=COUNTIF(H$startRow:H$previousTotalIndexField,\"=x\")");

                // Job transfer or restriction column I
                $sheet->setCellValue("I{$pageTotalIndexField}", "=COUNTIF(I$startRow:I$previousTotalIndexField,\"=x\")");

                // Other record-able cases column J
                $sheet->setCellValue("J{$pageTotalIndexField}", "=COUNTIF(J$startRow:J$previousTotalIndexField,\"=x\")");

                // Away From Work (days) column K
                $sheet->setCellValue("K{$pageTotalIndexField}", "=SUM(K$startRow:K$previousTotalIndexField)");

                // On job transfer or restriction (days) column L
                $sheet->setCellValue("L{$pageTotalIndexField}", "=SUM(L$startRow:L$previousTotalIndexField)");

                // Injury column M
                $sheet->setCellValue("M{$pageTotalIndexField}", "=COUNTIF(M$startRow:M$previousTotalIndexField,\"=x\")");

                // Skin Disorder column N
                $sheet->setCellValue("N{$pageTotalIndexField}", "=COUNTIF(N$startRow:N$previousTotalIndexField,\"=x\")");

                // Respiratory Condition column O
                $sheet->setCellValue("O{$pageTotalIndexField}", "=COUNTIF(O$startRow:O$previousTotalIndexField,\"=x\")");

                // Poisoning column P
                $sheet->setCellValue("P{$pageTotalIndexField}", "=COUNTIF(P$startRow:P$previousTotalIndexField,\"=x\")");

                // Hearing Loss column Q
                $sheet->setCellValue("Q{$pageTotalIndexField}", "=COUNTIF(Q$startRow:Q$previousTotalIndexField,\"=x\")");

                // All other illnesses column R
                $sheet->setCellValue("R{$pageTotalIndexField}", "=COUNTIF(R$startRow:R$previousTotalIndexField,\"=x\")");
            }
            $caseNum++;
        }

        // Save the updated file
        $data = $this->downloadExcelFile($spreadsheet);

        \REDCap::logEvent( "OSHA Form 300 updated successfully.");
        return $data;
    }

    public function downloadExcelFile($spreadsheet)
    {
        try{
            // Write to output buffer
            $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
            $tempFilePath = $this->getTmpFilePath();
            $writer->save($tempFilePath);
        }catch (\Exception $e){
            \REDCap::logEvent('EXCEL generation failed: ', $e->getMessage());
        }finally{
            if($tempFilePath){
                 @unlink(realpath($tempFilePath));
            }
        }
    }

    private function getTmpFilePath(){
        return tempnam(sys_get_temp_dir() , 'OSHA_Form_300_Filled', ) . '.xlsx';
    }
}
