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

        $detailsParams = [
            "return_format" => "json",
            "combine_checkbox_values" => true,
            "project_id" => $this->getProjectId(),
        ];

        $res = json_decode(\REDCap::getData($detailsParams), true);
        foreach($res as $key => $value){
             if(!empty($value['redcap_repeat_instrument'])){
                 unset($res[$key]);
             }
        }

        //Re-index array after deletions of repeat instruments
        $res = array_values($res);
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
            $formName = implode('_', $parts);
            $label = ucwords(implode(' ', $parts)); // e.g., "some_words" -> "Some Words"

            $statusList[] = [$label, $formName];
        }
        return $statusList;
    }

    function normalizeData($records, $completeFields): array
    {
        $project = new \Project(PROJECT_ID);
        $pSettings = $this->getProjectSettings();
        // Parse enum fields once
        $parsedEnums = [
            'non_type' => $this->parseEnumField($project->metadata["non_type"]['element_enum']),
            'emp_inc_type' => $this->parseEnumField($project->metadata["emp_inc_type"]['element_enum']),
            'tri_lead_safety_group' => $this->parseEnumField($project->metadata['tri_lead_safety_group']['element_enum']),
            'location_type' => $this->parseEnumField($project->metadata['non_location_type']['element_enum']),
        ];

//        $this_form_survey_responses = $surveyResponses[$this_record][$attr['event_id']][$attr['form_name']] ?? [];
        foreach ($records as $k => $record) {
            $empTypeValues = [];
            $statusList = [];
//            $formStatusValues = Records::getFormStatus(PROJECT_ID, ['1']);
//            $surveyResponses = Survey::getResponseStatus($project_id, array_keys($formStatusValues)) : [];
//            $a = Survey::getResponseStatus(PROJECT_ID, array_keys($formStatusValues));
            foreach ($record as $key => $value) {
                $ids = array_map('trim', explode(',', $value));

                // Map multi-select fields to one column
                if ($key === "non_type" || $key === "emp_inc_type") {
                    if(!empty($value)){
                        $incidentTypeValues = array_map(
                            fn($id) => $parsedEnums[$key][$id] ?? '',
                            $ids
                        );
                        $records[$k]['incident_type_concat'] = implode(', ', $incidentTypeValues);
                    }
                }

                // Set the 'name_of_person_involved' field based on either non-employee name or employee first name
                if (($key === "non_name" || $key === "emp_first_name") && !empty($value)) {
                    $records[$k]['name_of_person_involved'] = $key === "non_name"
                        // If it's a non-employee name, use the value directly
                        ? $value
                        // If it's an employee, concatenate first and last name (last name may be unset)
                        : $value . ' ' . ($records[$k]['emp_last_name'] ?? '');
                }

                // Map single-select field
                if ($key === "tri_lead_safety_group") {
                    $records[$k][$key] = $parsedEnums['tri_lead_safety_group'][(int) $value] ?? $value;
                }

                // Format date_of_incident field based on either non_date or emp_incident_date
                if (in_array($key, ["non_date", "emp_incident_date"]) && !empty($value)) {
                    $date = DateTime::createFromFormat('Y-m-d', $value);
                    if ($date) {
                        $records[$k]['date_of_incident'] = $date->format('m-d-Y');
                    }
                }

                if (in_array($key, ["non_timestamp", "emp_timestamp"]) && !empty($value)) {
                    // Check if the string includes a minutes/seconds component, but normalize it
                    try {
                        $dt = new DateTime($value);
                        $normalized = $dt->format('Y-m-d');
                    } catch (\Exception $e) {
                        $normalized = null;
                    }

                    // Format as UTC in 'Y-m-d'
                    $records[$k]['date_reported'] = $normalized;
                }

                if (in_array($key, ["non_location_type", "emp_location_type"]) && !empty($value)) {
                    $mapped = array_map(fn($id) => $parsedEnums['location_type'][$id] ?? '', $ids);
                    $records[$k]['location_type'] = implode(', ', $mapped);
                }

                if (in_array($key, ["non_building", "emp_building"]) && !empty($value)) {
                    $records[$k]['building_location'] = $value;
                }

                if ($key === "emp_first_name_manag" && !empty($value)) {
                    $records[$k]['employee_manager_name'] = $value . " " . $records[$k]['emp_last_name_manag'];
                }



            }

            // Construct completed_statuses using label from field name
            foreach ($completeFields as $fieldName) {
                $statusValue = $record[$fieldName] ?? '';
                $label = ucwords(str_replace('_', ' ', preg_replace('/_complete$/', '', $fieldName)));
                $statusList[$label] = $statusValue;
            }
            $records[$k]['open-form'] = $pSettings['open-form'] . "_complete";
            $records[$k]['completed_statuses'] = $statusList;
            $records[$k]['emp_inc_type_concat'] = implode(', ', $empTypeValues);
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
        // Write to output buffer
        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');

        $writer->save(__DIR__ ."/OSHA_Form_300_Filled.xlsx");
    }
}
