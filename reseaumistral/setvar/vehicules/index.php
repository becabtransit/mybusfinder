<?php

// Désactiver le cache pour le développement
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Définir le type de contenu comme JSON
header('Content-Type: application/json');

// Obtenir le chemin du répertoire courant
$directory = __DIR__;

// Lire tous les fichiers .txt dans le répertoire
$files = glob($directory . "/*.txt");

// Créer un tableau avec les noms de fichiers (sans le chemin complet)
$fileNames = array_map(function($file) use ($directory) {
    return basename($file);
}, $files);

// Retourner la liste des fichiers au format JSON
echo json_encode($fileNames);
?>