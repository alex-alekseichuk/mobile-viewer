<?php
/**
 * Cmd tool to import JSON structure to DB
 */

require __DIR__ . '/../config.php';
require __DIR__ . '/../vendor/autoload.php';

if (count($argv) > 1 && file_exists($file = $argv[1]))
{
    $model = new Cms\Model();
    $model->importFromFile($file);
}

