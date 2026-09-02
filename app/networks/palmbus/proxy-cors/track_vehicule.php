<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$dbFile = __DIR__ . '/vehicle_service.sqlite';
$pdo = new PDO('sqlite:' . $dbFile);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('PRAGMA journal_mode=WAL;'); 
$pdo->exec("CREATE TABLE IF NOT EXISTS vehicle_service (
    vehicle_id   TEXT PRIMARY KEY,
    service_date TEXT NOT NULL,
    first_seen   INTEGER NOT NULL,
    last_seen    INTEGER NOT NULL
)");

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['ids']) || !is_array($input['ids'])) {
    http_response_code(400);
    echo json_encode(['error' => 'payload invalide']);
    exit;
}

$today = date('Y-m-d');
$now   = time();
$upsert = $pdo->prepare("INSERT INTO vehicle_service (vehicle_id, service_date, first_seen, last_seen)
    VALUES (:id, :date, :now, :now)
    ON CONFLICT(vehicle_id) DO UPDATE SET
        first_seen   = CASE WHEN service_date = :date THEN first_seen ELSE :now END,
        service_date = :date,
        last_seen    = :now");

$select = $pdo->prepare("SELECT first_seen FROM vehicle_service WHERE vehicle_id = :id");

$response = [];
$pdo->beginTransaction();
foreach ($input['ids'] as $id) {
    $id = trim((string)$id);
    if ($id === '') continue;

    $upsert->execute([':id' => $id, ':date' => $today, ':now' => $now]);
    $select->execute([':id' => $id]);
    $row = $select->fetch(PDO::FETCH_ASSOC);
    $response[$id] = $row ? (int)$row['first_seen'] : $now;
}
$pdo->commit();

echo json_encode($response);
