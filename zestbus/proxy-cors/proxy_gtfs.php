<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, HEAD, OPTIONS");
header("Access-Control-Allow-Headers: X-Content-Only-Header");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$url = 'https://www.data.gouv.fr/fr/datasets/r/72609821-2459-47fb-a63b-3dbbc0d96c92';

if ($_SERVER['REQUEST_METHOD'] === 'HEAD') {
    $headers = get_headers($url, 1);
    if ($headers) {
        if (isset($headers['Last-Modified'])) {
            header('Last-Modified: ' . $headers['Last-Modified']);
        }
        if (isset($headers['ETag'])) {
            header('ETag: ' . $headers['ETag']);
        }
        if (isset($headers['Content-Length'])) {
            header('Content-Length: ' . $headers['Content-Length']);
        }
    }
    exit(0);
}

if (isset($_SERVER['HTTP_X_CONTENT_ONLY_HEADER'])) {
    $context = stream_context_create(array(
        'http' => array(
            'method' => 'GET',
            'header' => 'Range: bytes=0-51200' 
        )
    ));
    $data = file_get_contents($url, false, $context);
} else {
    $data = file_get_contents($url);
}

header("Content-Type: application/zip");
echo $data;
?>
