<?php
/**
 * Cron script : met a jour vehicle_service.sqlite à partir du flux
 * GTFS-RT VehiclePosition relayer par proxy_vehpos.php

 * crontab -e
 * A exécuter via cron, par ex toutes les minutes :
 *   * * * * * php /var/www/mybusfinder/app/networks/palmbus/proxy-cors/update_vehicle_service.php >> /var/log/vehicle_service.log 2>&1
 */

declare(strict_types=1);

$dbFile      = __DIR__ . '/vehicle_service.sqlite';
$proxyScript = __DIR__ . '/proxy_vehpos.php';

function fetchGtfsRtData(string $proxyScript): string
{
    ob_start();
    include $proxyScript;
    $data = ob_get_clean();

    if ($data === false || $data === '') {
        throw new RuntimeException('Flux GTFS-RT vide ou proxy_vehpos.php a échoué');
    }
    return $data;
}

class ProtobufReader
{
    private string $buf;
    private int $pos = 0;
    private int $len;

    public function __construct(string $buf)
    {
        $this->buf = $buf;
        $this->len = strlen($buf);
    }

    public function eof(): bool
    {
        return $this->pos >= $this->len;
    }

    public function readVarint(): int
    {
        $result = 0;
        $shift = 0;
        while (true) {
            if ($this->pos >= $this->len) {
                throw new RuntimeException('Varint tronqué');
            }
            $byte = ord($this->buf[$this->pos++]);
            $result |= ($byte & 0x7F) << $shift;
            if (($byte & 0x80) === 0) {
                break;
            }
            $shift += 7;
        }
        return $result;
    }

    /** @return array{0:int,1:int} [numéro de champ, wire type] */
    public function readTag(): array
    {
        $tag = $this->readVarint();
        return [$tag >> 3, $tag & 0x7];
    }

    public function readBytes(): string
    {
        $len = $this->readVarint();
        $bytes = substr($this->buf, $this->pos, $len);
        $this->pos += $len;
        return $bytes;
    }

    public function skip(int $wireType): void
    {
        switch ($wireType) {
            case 0: $this->readVarint(); break;
            case 1: $this->pos += 8; break;
            case 2: $this->readBytes(); break;
            case 5: $this->pos += 4; break;
            default: throw new RuntimeException("Wire type inconnu $wireType");
        }
    }
}

function decodeGtfsRtVehicles(string $raw): array
{
    $reader = new ProtobufReader($raw);
    $vehicles = [];

    while (!$reader->eof()) {
        [$field, $wireType] = $reader->readTag();
        if ($field === 2 && $wireType === 2) {
            $entityBytes = $reader->readBytes();
            $vehicle = decodeFeedEntity($entityBytes);
            if ($vehicle !== null && $vehicle['id'] !== '') {
                $vehicles[$vehicle['id']] = $vehicle['status'];
            }
        } else {
            $reader->skip($wireType);
        }
    }

    return $vehicles;
}

function decodeFeedEntity(string $raw): ?array
{
    $reader = new ProtobufReader($raw);
    while (!$reader->eof()) {
        [$field, $wireType] = $reader->readTag();
        if ($field === 4 && $wireType === 2) {
            return decodeVehiclePosition($reader->readBytes());
        }
        $reader->skip($wireType);
    }
    return null;
}

function decodeVehiclePosition(string $raw): array
{
    $reader = new ProtobufReader($raw);
    $id = '';
    $status = null;

    while (!$reader->eof()) {
        [$field, $wireType] = $reader->readTag();
        if ($field === 8 && $wireType === 2) {
            $id = decodeVehicleDescriptorId($reader->readBytes());
        } elseif ($field === 5 && $wireType === 0) {
            $status = $reader->readVarint();
        } else {
            $reader->skip($wireType);
        }
    }

    return ['id' => $id, 'status' => $status];
}

function decodeVehicleDescriptorId(string $raw): string
{
    $reader = new ProtobufReader($raw);
    while (!$reader->eof()) {
        [$field, $wireType] = $reader->readTag();
        if ($field === 1 && $wireType === 2) {
            return $reader->readBytes();
        }
        $reader->skip($wireType);
    }
    return '';
}

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

$ensureVehicle = $pdo->prepare("INSERT INTO vehicle_service (vehicle_id, service_date, first_seen, last_seen, last_out_of_service)
    VALUES (:id, :date, :now, :now, NULL)
    ON CONFLICT(vehicle_id) DO NOTHING");

$upsert = $pdo->prepare("INSERT INTO vehicle_service (vehicle_id, service_date, first_seen, last_seen, last_out_of_service)
    VALUES (:id, :date, :now, :now, NULL)
    ON CONFLICT(vehicle_id) DO UPDATE SET
        first_seen = CASE WHEN service_date = :date THEN first_seen ELSE :now END,
        service_date = :date,
        last_seen = :now,
        last_out_of_service = NULL"); // réapparu dans le flux -> de nouveau en service

$markOutOfService = $pdo->prepare("UPDATE vehicle_service
    SET last_out_of_service = COALESCE(last_out_of_service, :now)
    WHERE vehicle_id = :id");

$selectActive = $pdo->prepare("SELECT vehicle_id FROM vehicle_service WHERE last_out_of_service IS NULL");

// ---------------------------------------------------------------------
// 4. Traitement
// ---------------------------------------------------------------------
try {
    $raw = fetchGtfsRtData($proxyScript);
    $currentVehicles = decodeGtfsRtVehicles($raw); // vehicle_id => status|null
} catch (Throwable $e) {
    error_log('[mbh] echec récup/décodage GTFSRT: ' . $e->getMessage());
    exit(1);
}

if (empty($currentVehicles)) {
    error_log('[mbh] aucun véhicule dans le flux GTFSRT, exec ignorée');
    exit(0);
}

$today = date('Y-m-d');
$now = time();

$pdo->beginTransaction();

foreach ($currentVehicles as $id => $status) {
    $id = trim((string)$id);
    if ($id === '') continue;

    $ensureVehicle->execute([':id' => $id, ':date' => $today, ':now' => $now]);
    $upsert->execute([':id' => $id, ':date' => $today, ':now' => $now]);
}

$activeIds = $selectActive->fetchAll(PDO::FETCH_COLUMN);
$missingIds = array_diff($activeIds, array_keys($currentVehicles));

foreach ($missingIds as $id) {
    $markOutOfService->execute([':id' => $id, ':now' => $now]);
}

$pdo->commit();

error_log(sprintf(
    '[mbh] OK %d véhicules en service %d passés hors service',
    count($currentVehicles),
    count($missingIds)
));
