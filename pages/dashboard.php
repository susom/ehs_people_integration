<?php

/** @var \Stanford\EHSPeopleIntegration\EHSPeopleIntegration $module */

$module->injectJSMO();

// Fetch minified react files to inject as page assets
$files = $module->generateAssetFiles();

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>EHS Dashboard</title>
    <?php foreach ($files as $file): ?>
        <?= $file ?>
    <?php endforeach; ?>
</head>
<body>
<div id="root"></div>
</body>
</html>
