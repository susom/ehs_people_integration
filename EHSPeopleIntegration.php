<?php
namespace Stanford\EHSPeopleIntegration;

use DateTime;

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
        try {
//            $sanitized = $this->sanitizeInput($payload);
            return match ($action) {
                'getRecords' => $this->getRecords($payload),
                default => throw new Exception ("Action $action is not defined"),
            };
        } catch (\Exception $e) {
            // log error
            \REDCap::logEvent($e);
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

        // Output the parsed array
        return $parsedArray;
    }
}
