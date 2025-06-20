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

        $detailsParams = [
            "return_format" => "json",
            "combine_checkbox_values" => true,
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

        foreach ($records as $k => $record) {
            $nonTypeValues = [];
            $empTypeValues = [];
            $statusList = [];

            foreach ($record as $key => $value) {
                $ids = array_map('trim', explode(',', $value));

                // Map multi-select fields
                if ($key === "non_type") {
                    $nonTypeValues = array_map(fn($id) => $parsedEnums['non_type'][$id] ?? '', $ids);
                }

                if ($key === "emp_inc_type") {
                    $empTypeValues = array_map(fn($id) => $parsedEnums['emp_inc_type'][$id] ?? '', $ids);
                }

                if (in_array($key, ["non_location_type", "emp_location_type"])) {
                    $mapped = array_map(fn($id) => $parsedEnums['location_type'][$id] ?? '', $ids);
                    $records[$k][$key] = implode(', ', $mapped);
                }

                // Map single-select field
                if ($key === "tri_lead_safety_group") {
                    $records[$k][$key] = $parsedEnums['tri_lead_safety_group'][(int) $value] ?? $value;
                }

                // Format date fields
                if (in_array($key, ["non_date", "emp_incident_date"])) {
                    $date = DateTime::createFromFormat('Y-m-d', $value);
                    if ($date) {
                        $records[$k][$key] = $date->format('m-d-Y');
                    }
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
            $records[$k]['non_type_concat'] = implode(', ', $nonTypeValues);
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

        // Output the parsed array
        return $parsedArray;
    }
}
