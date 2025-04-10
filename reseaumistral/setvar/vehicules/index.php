<?php

header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

header('Content-Type: application/json');

$directory = __DIR__;

$files = glob($directory . "/*.txt");

$fileNames = array_map(function($file) use ($directory) {
    return basename($file);
}, $files);

echo json_encode($fileNames);
?>
