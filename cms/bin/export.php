<?php
/**
 * Cmd tool to export JSON structure from DB
 */
require __DIR__ . '/../config.php';
require __DIR__ . '/../vendor/autoload.php';

if (count($argv) > 1)
{
    $file = $argv[1];
    $model = new Cms\Model();
    if (!$model->exportToFile($file))
        echo "Can't export the structure to " . $file . "\n";
}

