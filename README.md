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
