<?php

/** @var \Stanford\EHSPeopleIntegration\EHSPeopleIntegration $module */

try{
    $module->testExcelFile();
}
catch(Exception $e){
    echo $e->getMessage();
}
