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
    "status": "active"                  {active, inactive, suspended}
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