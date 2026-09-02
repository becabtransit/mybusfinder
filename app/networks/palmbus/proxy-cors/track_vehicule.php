<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$dbFile = __DIR__ . '/vehicle_service.sqlite';
$pdo = new PDO('sqlite:' . $dbFile);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('PRAGMA journal_mode=WAL;');
$pdo->exec("CREATE TABLE IF NOT EXISTS vehicle_service (
    vehicle_id          TEXT PRIMARY KEY,
    service_date        TEXT NOT NULL,
    first_seen          INTEGER NOT NULL,
    last_seen           INTEGER NOT NULL,
    last_out_of_service INTEGER DEFAULT NULL
)");

$columns = $pdo->query("PRAGMA table_info(vehicle_service)")->fetchAll(PDO::FETCH_ASSOC);
$hasOutOfService = false;
foreach ($columns as $column) {
    if (($column['name'] ?? '') === 'last_out_of_service') {
        $hasOutOfService = true;
        break;
    }
}
if (!$hasOutOfService) {
    $pdo->exec("ALTER TABLE vehicle_service ADD COLUMN last_out_of_service INTEGER DEFAULT NULL");
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['ids']) || !is_array($input['ids'])) {
    http_response_code(400);
    echo json_encode(['error' => 'payload invalide']);
    exit;
}

$today = date('Y-m-d');
$now = time();
$statuses = [];
if (!empty($input['statuses']) && is_array($input['statuses'])) {
    foreach ($input['statuses'] as $id => $status) {
        $statuses[(string)$id] = (int)$status;
    }
}

$upsert = $pdo->prepare("INSERT INTO vehicle_service (vehicle_id, service_date, first_seen, last_seen, last_out_of_service)
    VALUES (:id, :date, :now, :now, NULL)
    ON CONFLICT(vehicle_id) DO UPDATE SET
        first_seen = CASE WHEN service_date = :date THEN first_seen ELSE :now END,
        service_date = :date,
        last_seen = :now");

$markOutOfService = $pdo->prepare("UPDATE vehicle_service
    SET last_out_of_service = COALESCE(last_out_of_service, :now),
        last_seen = :now
    WHERE vehicle_id = :id");

$select = $pdo->prepare("SELECT first_seen, last_out_of_service, last_seen FROM vehicle_service WHERE vehicle_id = :id");

$response = [
    'firstSeen' => [],
    'outOfService' => []
];

$pdo->beginTransaction();
foreach ($input['ids'] as $id) {
    $id = trim((string)$id);
    if ($id === '') continue;

    $status = array_key_exists($id, $statuses) ? $statuses[$id] : 2;
    $isInService = $status !== 0 && $status !== '0';

    if ($isInService) {
        $upsert->execute([':id' => $id, ':date' => $today, ':now' => $now]);
    } else {
        $markOutOfService->execute([':id' => $id, ':now' => $now]);
    }

    $select->execute([':id' => $id]);
    $row = $select->fetch(PDO::FETCH_ASSOC);

    $response['firstSeen'][$id] = $row ? (int)$row['first_seen'] : $now;
    $response['outOfService'][$id] = $row && $row['last_out_of_service'] !== null ? (int)$row['last_out_of_service'] : null;
}
$pdo->commit();

echo json_encode($response);
