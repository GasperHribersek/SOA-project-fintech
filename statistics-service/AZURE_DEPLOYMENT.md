# Azure Deployment Guide for Statistics Service

This guide will help you deploy the statistics service to Microsoft Azure using Azure App Service and Azure Database for MySQL.

## Prerequisites

- Microsoft Azure account (GitHub Student Developer Pack provides free credits)
- Azure CLI installed (`https://aka.ms/installazurecli`)
- Docker installed locally

## Step 1: Login to Azure

```bash
az login
```

## Step 2: Create Resource Group

```bash
az group create --name statistics-service-rg --location westeurope
```

## Step 3: Create Azure Database for MySQL Flexible Server

```bash
# Create MySQL Flexible Server
az mysql flexible-server create \
  --resource-group statistics-service-rg \
  --name statistics-mysql-server \
  --location westeurope \
  --admin-user statsadmin \
  --admin-password YourSecurePassword123! \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 8.0

# Create database
az mysql flexible-server db create \
  --resource-group statistics-service-rg \
  --server-name statistics-mysql-server \
  --database-name statistics_db

# Configure firewall to allow Azure services
az mysql flexible-server firewall-rule create \
  --resource-group statistics-service-rg \
  --name statistics-mysql-server \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

**Note:** Save the connection string for later:
```
Server: statistics-mysql-server.mysql.database.azure.com
Database: statistics_db
User: statsadmin
Password: YourSecurePassword123!
```

## Step 4: Create Azure Container Registry (ACR)

```bash
# Create ACR
az acr create \
  --resource-group statistics-service-rg \
  --name statisticsacr \
  --sku Basic \
  --admin-enabled true

# Get ACR credentials
az acr credential show --name statisticsacr --resource-group statistics-service-rg
```

## Step 5: Build and Push Docker Image

```bash
# Login to ACR
az acr login --name statisticsacr

# Build image (from statistics-service directory)
docker build -t statisticsacr.azurecr.io/statistics-service:latest .

# Push image
docker push statisticsacr.azurecr.io/statistics-service:latest
```

## Step 6: Create App Service Plan

```bash
az appservice plan create \
  --name statistics-service-plan \
  --resource-group statistics-service-rg \
  --is-linux \
  --sku B1
```

## Step 7: Create Web App

```bash
# Get ACR password
ACR_PASSWORD=$(az acr credential show --name statisticsacr --resource-group statistics-service-rg --query "passwords[0].value" -o tsv)

# Create web app
az webapp create \
  --resource-group statistics-service-rg \
  --plan statistics-service-plan \
  --name statistics-service-app \
  --deployment-container-image-name statisticsacr.azurecr.io/statistics-service:latest

# Configure container registry credentials
az webapp config container set \
  --name statistics-service-app \
  --resource-group statistics-service-rg \
  --docker-custom-image-name statisticsacr.azurecr.io/statistics-service:latest \
  --docker-registry-server-url https://statisticsacr.azurecr.io \
  --docker-registry-server-user statisticsacr \
  --docker-registry-server-password $ACR_PASSWORD
```

## Step 8: Configure Environment Variables

```bash
az webapp config appsettings set \
  --resource-group statistics-service-rg \
  --name statistics-service-app \
  --settings \
    PORT=80 \
    DB_HOST=statistics-mysql-server.mysql.database.azure.com \
    DB_PORT=3306 \
    DB_USER=statsadmin \
    DB_PASSWORD=YourSecurePassword123! \
    DB_NAME=statistics_db \
    WEBSITES_PORT=80
```

## Step 9: Enable Continuous Deployment (Optional)

```bash
az webapp deployment container config \
  --name statistics-service-app \
  --resource-group statistics-service-rg \
  --enable-cd true
```

## Step 10: Test the Deployment

Your service should now be available at:
```
https://statistics-service-app.azurewebsites.net
```

Test endpoints:
- Health: `https://statistics-service-app.azurewebsites.net/health`
- Swagger: `https://statistics-service-app.azurewebsites.net/swagger`
- Last called: `https://statistics-service-app.azurewebsites.net/api/stats/last-called`

## Update Your Local Services

Update your local services to point to the Azure-deployed statistics service:

```javascript
const STATISTICS_SERVICE_URL = 'https://statistics-service-app.azurewebsites.net';
```

## Monitoring and Logs

```bash
# View logs
az webapp log tail \
  --resource-group statistics-service-rg \
  --name statistics-service-app

# Enable logging
az webapp log config \
  --resource-group statistics-service-rg \
  --name statistics-service-app \
  --docker-container-logging filesystem
```

## Cost Management

**Free Tier Options:**
- App Service: B1 tier (~$13/month, or use F1 free tier with limitations)
- MySQL: Burstable tier B1ms (~$12/month)
- Container Registry: Basic tier (~$5/month)

**GitHub Student Pack Benefits:**
- $100 Azure credit
- Various free services

## Cleanup (when done)

```bash
# Delete all resources
az group delete --name statistics-service-rg --yes --no-wait
```

## Troubleshooting

### Container won't start
- Check logs: `az webapp log tail --name statistics-service-app --resource-group statistics-service-rg`
- Verify environment variables are set correctly
- Ensure PORT is set to 80 or 8080

### Database connection issues
- Verify firewall rules allow Azure services
- Check connection string format
- Ensure SSL is enabled if required

### Image pull errors
- Verify ACR credentials are correct
- Ensure image was pushed successfully: `az acr repository list --name statisticsacr`

## Alternative: Simpler Deployment with Azure App Service (without ACR)

If you want to avoid using Container Registry:

```bash
# Enable Docker Hub deployment
az webapp create \
  --resource-group statistics-service-rg \
  --plan statistics-service-plan \
  --name statistics-service-app \
  --deployment-container-image-name yourdockerhubusername/statistics-service:latest
```

Then configure environment variables as shown in Step 8.
