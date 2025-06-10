<?php
namespace Stanford\EHSPeopleIntegration;

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
                $detailsParams = [
                    "return_format" => "json",
                    "fields" => ["record_id", "non_type", "emp_inc_type"],
                    "project_id" => $project_id,
                ];

                $res = json_decode(\REDCap::getData($detailsParams),true);
                $res = $this->parseNonType($res);
                $result = [
                    "success"=>true,
                    "data"=>$res
                ];
                break;
            default:
                // Action not defined
                throw new Exception ("Action $action is not defined");
        }

        // Return is left as php object, is converted to json automatically
        return $result;
    }

    function parseNonType($records) {
        $nonTypeValues = [];
        $project = new \Project(PROJECT_ID);
        $parsed = $this->parseEnumField($project->metadata["non_type"]['element_enum']);

        foreach($records as $k => $record) {
            foreach ($record as $key => $value) {
                if (preg_match('/^non_type___(\d+)$/', $key, $matches) && $value === "1") {
                    $num = (int) $matches[1];
                    $nonTypeValues[] = $parsed[$num];
                }
            }

//            if(isset($parsed)[]) {}
//            if (isset($parsed[$fieldData[$variableName]])) {
//                $value = $parsed[$fieldData[$variableName]];
//            }
            // Add the new 'non_type' key to the original array
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

        // Output the parsed array
        return $parsedArray;
    }
}
