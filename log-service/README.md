# Log Service

Samostojna mikrostoritev za upravljanje logov iz RabbitMQ sporočilne vrste.

## Opis

Log Service je namensko razvita mikrostoritev za upravljanje centralnih logov. Povezuje se na RabbitMQ sporočilni posrednik, iz katerega pridobiva loge in jih shranjuje v PostgreSQL bazo. Omogoča poizvedovanje po logih in njihovo brisanje.

## Tehnologije

- **Node.js** 18
- **Express** 4.18
- **PostgreSQL** (pg driver)
- **RabbitMQ** (amqplib)

## Endpointi

### 1. POST /logs

Prenese vse loge iz RabbitMQ sporočilne vrste `logging_queue` in jih shrani v PostgreSQL bazo.

**URL**: `http://localhost:5002/logs`

**Metoda**: `POST`

**Odziv**:
```json
{
  "success": true,
  "message": "50 logs fetched and stored",
  "count": 50
}
```

**Primer**:
```bash
curl -X POST http://localhost:5002/logs
```

### 2. GET /logs/{datumOd}/{datumDo}

Vrne vse loge iz baze, ki so bili shranjeni med dvema datumoma.

**URL**: `http://localhost:5002/logs/:dateFrom/:dateTo`

**Metoda**: `GET`

**Parametri**:
- `dateFrom` (path): Začetni datum v formatu YYYY-MM-DD
- `dateTo` (path): Končni datum v formatu YYYY-MM-DD

**Query parametri** (opcijsko):
- `level`: Filtriranje po nivoju (INFO, ERROR, WARN)
- `service`: Filtriranje po imenu storitve
- `correlation_id`: Filtriranje po correlation ID
- `limit`: Maksimalno število rezultatov (privzeto: 1000)
- `offset`: Odmik za paginacijo (privzeto: 0)

**Odziv**:
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "timestamp": "2024-01-15T10:30:45.123Z",
      "level": "INFO",
      "url": "http://localhost:3001/api/auth/login",
      "correlationId": "abc-123",
      "serviceName": "auth-service",
      "message": "POST request received",
      "additionalData": {
        "method": "POST",
        "statusCode": 200,
        "duration": 145
      },
      "createdAt": "2024-01-15T10:30:45.456Z"
    }
  ],
  "total": 1,
  "limit": 1000,
  "offset": 0,
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31"
}
```

**Primeri**:
```bash
# Vsi logi med datumoma
curl "http://localhost:5002/logs/2024-01-01/2024-12-31"

# Samo napake
curl "http://localhost:5002/logs/2024-01-01/2024-12-31?level=ERROR"

# Logi določene storitve
curl "http://localhost:5002/logs/2024-01-01/2024-12-31?service=auth-service"

# Sledenje zahtevi po correlation ID
curl "http://localhost:5002/logs/2024-01-01/2024-12-31?correlation_id=abc-123"

# S paginacijo
curl "http://localhost:5002/logs/2024-01-01/2024-12-31?limit=50&offset=0"
```

### 3. DELETE /logs

Izbriše vse loge iz baze podatkov.

**URL**: `http://localhost:5002/logs`

**Metoda**: `DELETE`

**Odziv**:
```json
{
  "success": true,
  "message": "All logs deleted successfully",
  "deleted_count": 150
}
```

**Primer**:
```bash
curl -X DELETE http://localhost:5002/logs
```

### 4. GET /health

Preveri stanje storitve.

**URL**: `http://localhost:5002/health`

**Metoda**: `GET`

**Odziv**:
```json
{
  "status": "OK",
  "service": "log-service",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### 5. GET /

Informacije o storitvi in razpoložljivih endpointih.

**URL**: `http://localhost:5002/`

**Metoda**: `GET`

**Odziv**:
```json
{
  "service": "log-service",
  "version": "1.0.0",
  "description": "Log management service for RabbitMQ logs",
  "endpoints": {
    "POST /logs": "Fetch logs from RabbitMQ and store in database",
    "GET /logs/:dateFrom/:dateTo": "Get logs between two dates (YYYY-MM-DD)",
    "DELETE /logs": "Delete all logs from database",
    "GET /health": "Health check endpoint"
  }
}
```

## Zagon

### Z Docker Compose

Storitev se avtomatsko zažene z vsemi ostalimi storitvami:

```bash
docker-compose up -d
```

### Lokalno (za razvoj)

```bash
cd log-service
npm install
npm start
```

Ali za development z auto-reload:

```bash
npm run dev
```

## Konfiguracija

Storitev uporablja naslednje okoljske spremenljivke:

- `PORT`: Port na katerem teče storitev (privzeto: 5002)
- `DATABASE_URL`: PostgreSQL connection string
- `RABBITMQ_URL`: RabbitMQ connection URL

Primer `.env` datoteke:

```env
PORT=5002
DATABASE_URL=postgresql://analytics_user:analytics_pass@analytics-db:5432/analytics_db
RABBITMQ_URL=amqp://admin:admin123@rabbitmq:5672
```

## Baza Podatkov

Storitev uporablja PostgreSQL tabelo `logs`:

```sql
CREATE TABLE logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  level VARCHAR(20) NOT NULL,
  url VARCHAR(500),
  correlation_id VARCHAR(100),
  service_name VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  additional_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indeksi za hitrejše poizvedovanje
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_correlation_id ON logs(correlation_id);
CREATE INDEX idx_logs_service_name ON logs(service_name);
CREATE INDEX idx_logs_created_at ON logs(created_at);
```

Tabela se avtomatsko ustvari ob zagonu storitve, če še ne obstaja.

## RabbitMQ

Storitev se povezuje na RabbitMQ in bere sporočila iz vrste:

- **Exchange**: `logs_exchange` (fanout, durable)
- **Queue**: `logging_queue` (durable)

Vsi logi iz mikrostoritev (auth-service, user-service, analytics-server) se pošiljajo v to vrsto.

## Testiranje

### Celoten tok

```bash
# 1. Generiraj loge (kliči katero koli storitev)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: test-123" \
  -d '{"username":"test","email":"test@example.com","password":"pass123"}'

# 2. Počakaj nekaj sekund da se logi pošljejo v RabbitMQ

# 3. Prenesi loge iz RabbitMQ v bazo
curl -X POST http://localhost:5002/logs

# 4. Poizveduj po logih
curl "http://localhost:5002/logs/2024-01-01/2024-12-31?correlation_id=test-123"

# 5. Izbriši loge
curl -X DELETE http://localhost:5002/logs
```

### Preveri zdravje storitve

```bash
curl http://localhost:5002/health
```

## Primeri uporabe

### Primer 1: Dnevno prenašanje logov

```bash
# Cron job, ki vsako uro prenese loge
*/60 * * * * curl -X POST http://localhost:5002/logs
```

### Primer 2: Sledenje zahtevi

```bash
# Uporabnik javi težavo ob 10:30
# Poiščeš vse loge iz tega časa
curl "http://localhost:5002/logs/2024-01-15/2024-01-15" | jq '.logs[] | select(.timestamp | contains("10:3"))'

# Iz logov dobiš correlation ID
# Poiščeš vse loge s tem ID-jem
curl "http://localhost:5002/logs/2024-01-15/2024-01-15?correlation_id=NAJDENI_ID"
```

### Primer 3: Monitoring napak

```bash
# Preveri napake zadnjih 24 ur
TODAY=$(date +%Y-%m-%d)
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)

curl "http://localhost:5002/logs/$YESTERDAY/$TODAY?level=ERROR"
```

### Primer 4: Analiza performans

```bash
# Poišči počasne zahteve (duration > 1000ms)
curl "http://localhost:5002/logs/2024-01-01/2024-12-31" | \
  jq '.logs[] | select(.additionalData.duration > 1000)'
```

## Struktura projekta

```
log-service/
├── src/
│   ├── config/
│   │   └── database.js       # PostgreSQL konfiguracija
│   ├── controllers/
│   │   └── logController.js  # Logika endpointov
│   ├── routes/
│   │   └── logRoutes.js      # Definicija poti
│   └── index.js              # Glavni entry point
├── Dockerfile                # Docker konfiguracija
├── package.json              # NPM dependencies
└── README.md                 # Ta dokument
```

## Odvisnosti

```json
{
  "express": "^4.18.2",
  "pg": "^8.11.3",
  "amqplib": "^0.10.3",
  "dotenv": "^16.3.1",
  "cors": "^2.8.5"
}
```

## Troubleshooting

### Storitev se ne more povezati z RabbitMQ

```bash
# Preveri ali RabbitMQ teče
docker ps | grep rabbitmq

# Preveri RabbitMQ loge
docker logs rabbitmq
```

### Storitev se ne more povezati z bazo

```bash
# Preveri ali PostgreSQL teče
docker ps | grep postgres

# Preveri ali lahko dostopaš do baze
docker exec -it analytics-postgres psql -U analytics_user -d analytics_db
```

### Ni logov v RabbitMQ

```bash
# Preveri RabbitMQ Management UI
# http://localhost:15672 (admin/admin123)
# Pojdi na Queues -> logging_queue
# Preveri število sporočil
```

## Licenca

MIT

## Avtor

SOA Fintech Team

