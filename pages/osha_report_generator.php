<?php

/** @var \Stanford\EHSPeopleIntegration\EHSPeopleIntegration $module */

$module->injectJSMO();

try{
    $module->testExcelFile();
}
catch(Exception $e){
    echo $e->getMessage();
}
