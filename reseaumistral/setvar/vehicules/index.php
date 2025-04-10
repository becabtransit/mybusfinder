<?php

header('Content-Type: application/json');

$directory = __DIR__;

$files = glob($directory . "/*.txt");

$fileNames = array_map(function($file) use ($directory) {
    return basename($file);
}, $files);

echo json_encode($fileNames);
?>
