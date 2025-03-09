<?php
// génère le fichier index json qui liste tous les fichiers .txt 
// dans setvar/vehicules

$directory = 'setvar/vehicules';
$fileList = [];

// Parcourir repertoire pour trouver tous les fichiers txt
$files = scandir($directory);
foreach ($files as $file) {
    if (pathinfo($file, PATHINFO_EXTENSION) === 'txt') {
        $fileList[] = $file;
    }
}

// ecriture json
$jsonContent = json_encode($fileList, JSON_PRETTY_PRINT);
file_put_contents($directory . 'index.json', $jsonContent);

echo "index.json généré avec " . count($fileList);
?>