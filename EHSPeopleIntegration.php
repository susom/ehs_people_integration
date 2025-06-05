<?php
namespace Stanford\EHSPeopleIntegration;

require 'vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;




class EHSPeopleIntegration extends \ExternalModules\AbstractExternalModule {

    const BUILD_FILE_DIR = 'ehs-dashboard/dist/assets';
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
    public function generateAssetFiles(): array
    {
        $cwd = $this->getModulePath();
        $assets = [];

        $full_path = $cwd . self::BUILD_FILE_DIR . '/';
        $dir_files = scandir($full_path);

        // Check if scandir failed
        if ($dir_files === false) {
            $this->emError("Failed to open directory: $full_path");
            return $assets; // Return an empty array or handle the error as needed
        }

        $dir_files = array_diff($dir_files, array('..', '.'));

        foreach ($dir_files as $file) {
            $url = $this->getUrl(self::BUILD_FILE_DIR . '/' . $file);
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
        switch($action) {
            case "TestAction":
                \REDCap::logEvent("Test Action Received");
                $result = [
                    "success"=>true,
                    "user_id"=>$user_id
                ];
                break;
            case "getRecords":
                $payload = json_decode($payload, true);
                $param = [];
                if(in_array('filterLogic', $payload)) {
                    $param = array(
                        'filterLogic' => $payload['filterLogic'],
                    );
                }
                $data = \REDCap::getData($project_id, "json", $param);
                $result = [
                    "success"=>true,
                    "data"=>$data[$event_id]
                ];
                break;
            default:
                // Action not defined
                throw new \Exception ("Action $action is not defined");
        }

        // Return is left as php object, is converted to json automatically
        return $result;
    }

    public function testExcelFile()
    {

        // Load existing Excel file (your OSHA Form 300 template)
        $spreadsheet = IOFactory::load(__DIR__ . '/osha_template.xlsx');
        $sheet = $spreadsheet->getActiveSheet();

        $caseData = [
            ['1', 'John Doe', 'Cut on hand', '01/15/2024', 'Manufacturing', 'Days Away'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            ['2', 'Jane Smith', 'Slip and fall', '02/20/2024', 'Warehouse', 'Job Transfer'],
            // Add more rows here
        ];

// Start inserting at row 25
        $startRow = 25;
        $caseNum = 1;
        foreach ($caseData as $index => $row) {
            $rowIndex = $startRow + $index;

            $sheet->insertNewRowBefore($rowIndex, 1); // Insert 1 new row before the current index

            // Optional: copy style from previous row (24 in this example)
            $sheet->duplicateStyle($sheet->getStyle('A24:F24'), "A{$rowIndex}:F{$rowIndex}");


            $sheet->setCellValue("A{$rowIndex}", $caseNum); // Case No.
            $sheet->setCellValue("B{$rowIndex}", $row[1]); // Employee Name
            $sheet->setCellValue("C{$rowIndex}", $row[2]); // Description
            $sheet->setCellValue("D{$rowIndex}", $row[3]); // Date
            $sheet->setCellValue("E{$rowIndex}", $row[4]); // Department
            $sheet->setCellValue("F{$rowIndex}", $row[5]); // Outcome
            $caseNum++;
        }

// Save the updated file
        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->save(__DIR__ ."/OSHA_Form_300_Filled.xlsx");

        echo "OSHA Form 300 updated successfully.";
    }
}
