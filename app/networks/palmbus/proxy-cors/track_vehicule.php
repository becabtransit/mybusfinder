<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$dbFile = __DIR__ . '/vehicle_service.sqlite';
$pdo = new PDO('sqlite:' . $dbFile);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$input = json_decode(file_get_contents('php://input'), true);
$ids = (!empty($input['ids']) && is_array($input['ids'])) ? $input['ids'] : null;

$sql = "SELECT vehicle_id, first_seen, last_out_of_service, last_route_id FROM vehicle_service";
if ($ids) {
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $sql .= " WHERE vehicle_id IN ($placeholders)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($ids);
} else {
    $stmt = $pdo->query($sql);
}

$response = ['firstSeen' => [], 'outOfService' => [], 'lastRoute' => []];
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $response['firstSeen'][$row['vehicle_id']] = (int)$row['first_seen'];
    $response['outOfService'][$row['vehicle_id']] = $row['last_out_of_service'] !== null
        ? (int)$row['last_out_of_service']
        : null;
    $response['lastRoute'][$row['vehicle_id']] = $row['last_route_id'];
}

echo json_encode($response);
