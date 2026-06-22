# SOA Fintech Project

Microservices-based fintech application with authentication, user management, logging, analytics, and API statistics tracking.

## 🏗️ Architecture

This project consists of multiple microservices:

- **auth-service** (port 3001) - User authentication and authorization
- **user-service** (port 3002) - User profile management
- **log-service** (port 5003) - Centralized logging with RabbitMQ
- **analytics_server** (port 5000) - Analytics and event tracking
- **statistics-service** (port 5002) - **NEW!** API statistics tracking (Azure deployment ready)
- **sua_ui** (port 3000) - Next.js frontend application

---

## 🆕 Statistics Service (NEW)

A dedicated microservice for tracking API endpoint statistics, designed for cloud deployment on Microsoft Azure.

### Features
- ✅ Track last called endpoint
- ✅ Track most frequently called endpoint
- ✅ Get statistics for all endpoints (call counts)
- ✅ POST endpoint to update statistics
- ✅ Swagger documentation
- ✅ MySQL database
- ✅ Docker containerization
- ✅ Azure deployment ready
- ✅ Frontend dashboard page

### Quick Start
```bash
cd statistics-service
docker-compose up -d
```

Service: `http://localhost:5002`  
Swagger: `http://localhost:5002/swagger`  
Frontend: `http://localhost:3000/statistics`

**📚 Complete guides:**
- [SETUP_GUIDE.md](statistics-service/SETUP_GUIDE.md) - Complete setup instructions
- [AZURE_DEPLOYMENT.md](statistics-service/AZURE_DEPLOYMENT.md) - Azure deployment guide
- [QUICK_REFERENCE.md](statistics-service/QUICK_REFERENCE.md) - Quick commands reference

---

# AUTH SERVICE (port 3001)

## REGISTER [POST]

http://localhost:3001/api/auth/register
{
"username": "",
"email": "",
"password": ""
}

## LOGIN [POST]

http://localhost:3001/api/auth/login
{
"email": "",
"password": ""
}

## VALIDATE TOKEN [GET]

http://localhost:3001/api/auth/validate-token
Authorization: Bearer <token>

## LOGOUT [POST]

http://localhost:3001/api/auth/logout
Authorization: Bearer <token>

## GET SESSIONS [GET]

http://localhost:3001/api/auth/sessions/{userId}

## UPDATE PASSWORD [PUT]

http://localhost:3001/api/auth/password/{userId}
{
"currentPassword": "",
"newPassword": ""
}

## UPDATE CREDENTIALS [PUT]

http://localhost:3001/api/auth/credentials/{userId}
{
"username": "",
"email": ""
}

## DELETE ALL SESSIONS [DELETE]

http://localhost:3001/api/auth/sessions/{userId}

## DELETE SINGLE SESSION [DELETE]

http://localhost:3001/api/auth/session/{sessionId}

# USER SERVICE (port 3002)

## CREATE PROFILE [POST]

http://localhost:3002/api/users/profile
{
"userId": 1,
"username": "",
"email": "",
"firstName": "",
"lastName": "",
"phone": "",
"address": "",
"dateOfBirth": "YYYY-MM-DD"
}

## CREATE USER SETTINGS [POST]

http://localhost:3002/api/users/{userId}/settings
{
"language": "en",
"currency": "EUR",
"notificationsEnabled": true,
"emailNotifications": true,
"theme": "light",
"timezone": "UTC"
}

## GET ALL PROFILES [GET]

http://localhost:3002/api/users

## GET PROFILE [GET]

http://localhost:3002/api/users/{userId}

## UPDATE PROFILE [PUT]

http://localhost:3002/api/users/{userId}
{
"firstName": "",
"lastName": "",
"phone": "",
"address": "",
"dateOfBirth": "YYYY-MM-DD",
"status": "active" {active, inactive, suspended}
}

## UPDATE USER SETTINGS [PUT]

http://localhost:3002/api/users/{userId}/settings
{
"language": "sl",
"currency": "EUR",
"notificationsEnabled": true,
"emailNotifications": true,
"theme": "dark",
"timezone": "UTC"
}

## SYNC CREDENTIALS [PUT]

http://localhost:3002/api/users/{userId}/sync-credentials
{
"username": "",
"email": ""
}

## DELETE PROFILE [DELETE]

http://localhost:3002/api/users/{userId}
(add ?permanent=true for hard delete)

## RESET USER SETTINGS [DELETE]

http://localhost:3002/api/users/{userId}/settings

# TRANSACTIONS SERVICE (port 3003)

JWT zaščitena storitev za upravljanje transakcij uporabnika. Ob ustvarjeni transakciji
oddaljeno pokliče **budget-service** (`/budgets/update-spend`) in posodobi porabo
(medstoritvena komunikacija). Loge pošilja v RabbitMQ s correlation ID, klice javlja
statistics-service.

Swagger: http://localhost:3003/api-docs

## GET ALL TRANSACTIONS [GET]
http://localhost:3003/transactions

## GET TRANSACTION BY ID [GET]
http://localhost:3003/transactions/{id}

## CREATE TRANSACTION [POST]
http://localhost:3003/transactions
{ "amount": 0, "category": "", "note": "" }

## BULK IMPORT [POST]
http://localhost:3003/transactions/import
{ "transactions": [ { "amount": 0, "category": "", "note": "" } ] }

## UPDATE TRANSACTION [PUT]
http://localhost:3003/transactions/{id}

## UPDATE CATEGORY [PUT]
http://localhost:3003/transactions/{id}/category

## DELETE TRANSACTION [DELETE]
http://localhost:3003/transactions/{id}

## DELETE ALL USER TRANSACTIONS [DELETE]
http://localhost:3003/transactions/user/me

# BUDGET SERVICE (port 3004)

JWT zaščitena storitev za upravljanje proračunov uporabnika. Loge pošilja v RabbitMQ
s correlation ID, klice javlja statistics-service.

Swagger: http://localhost:3004/api-docs

## GET ALL BUDGETS [GET]
http://localhost:3004/budgets

## GET BUDGET BY ID [GET]
http://localhost:3004/budgets/{id}

## CREATE BUDGET [POST]
http://localhost:3004/budgets
{ "limitAmount": 0 }

## UPDATE SPEND [POST]
http://localhost:3004/budgets/update-spend
{ "amount": 0 }

## UPDATE BUDGET [PUT]
http://localhost:3004/budgets/{id}

## UPDATE LIMIT [PUT]
http://localhost:3004/budgets/{id}/limit

## DELETE BUDGET [DELETE]
http://localhost:3004/budgets/{id}

## DELETE ALL USER BUDGETS [DELETE]
http://localhost:3004/budgets/user/me

# ANALYTICS SERVICE (port 5001)

See Swagger documentation at: http://localhost:5001/api-docs

# LOG SERVICE (port 5002) - NOVA SAMOSTOJNA STORITEV

Samostojna mikrostoritev za upravljanje logov iz RabbitMQ.

## FETCH LOGS FROM RABBITMQ [POST]

http://localhost:5002/logs

Prenese vse loge iz RabbitMQ sporočilne vrste in jih shrani v bazo.

## GET LOGS BY DATE RANGE [GET]

http://localhost:5002/logs/{datumOd}/{datumDo}

Primer:
http://localhost:5002/logs/2024-01-01/2024-12-31

Query parametri (opcijsko):

- level: INFO, ERROR, WARN
- service: auth-service, user-service, analytics-server
- correlation_id: za sledenje zahtevi
- limit: maksimalno število rezultatov
- offset: za paginacijo

Primeri:
http://localhost:5002/logs/2024-01-01/2024-12-31?level=ERROR
http://localhost:5002/logs/2024-01-01/2024-12-31?service=auth-service
http://localhost:5002/logs/2024-01-01/2024-12-31?correlation_id=abc-123

## DELETE ALL LOGS [DELETE]

http://localhost:5002/logs

Izbriše vse loge iz baze.

## HEALTH CHECK [GET]

http://localhost:5002/health

## INFO [GET]

http://localhost:5002/

Vrne informacije o storitvi in razpoložljivih endpointih.

# LOGGING SERVICE (RabbitMQ)

## RabbitMQ Management UI

http://localhost:15672
Username: admin
Password: admin123

## FETCH LOGS FROM RABBITMQ [POST]

http://localhost:5001/logs

## GET LOGS BY DATE RANGE [GET]

http://localhost:5001/logs/{dateFrom}/{dateTo}
Query params: level, service, correlation_id, limit, offset

Example:
http://localhost:5001/logs/2024-01-01/2024-12-31?level=ERROR&service=auth-service

## DELETE ALL LOGS [DELETE]

http://localhost:5001/logs

## Correlation ID

All requests support X-Correlation-Id header for request tracing across services.
If not provided, a UUID will be automatically generated.

Example:
curl -H "X-Correlation-Id: my-test-123" http://localhost:3001/api/auth/login

# START SERVICES

docker-compose up -d

# REBUILD

docker-compose up --build -d

# STOP

docker-compose down

# TEST LOGGING

./test_logging.sh

# LOGIN

test@test.si
123test

# TEST JWT SECRET

soa-je-kul

## Swagger / OpenAPI Docs

Both services expose Swagger UI for interactive API documentation once dependencies are installed and the service is running.

- Auth Service: http://localhost:3001/api/auth/docs
- User Service: http://localhost:3002/api/users/docs

To enable locally (developer machine):

1. Install the new dependencies in each service:

```powershell
cd auth-service; npm install
cd ../user-service; npm install
```

2. Restart services (or rebuild Docker images):

```powershell
docker-compose up --build -d
```

Notes:
- The Swagger UI loads the OpenAPI spec files `auth-service/openapi.yaml` and `user-service/openapi.yaml`.
- In production, consider restricting access to these docs (they expose API surface and may aid attackers if left public).
