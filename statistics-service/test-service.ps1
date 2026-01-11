# Statistics Service Test Script (PowerShell)
# This script tests all 4 required endpoints

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Statistics Service Test Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$STATS_URL = if ($env:STATISTICS_SERVICE_URL) { $env:STATISTICS_SERVICE_URL } else { "http://localhost:5002" }

Write-Host "Testing statistics service at: $STATS_URL" -ForegroundColor Yellow
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing health endpoint..." -ForegroundColor Green
$response = Invoke-RestMethod -Uri "$STATS_URL/health" -Method Get
$response | ConvertTo-Json
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# Test 2: Add some test data
Write-Host "2. Adding test data..." -ForegroundColor Green

$body1 = @{ klicanaStoritev = "/api/users/register" } | ConvertTo-Json
$response1 = Invoke-RestMethod -Uri "$STATS_URL/api/stats/update" -Method Post -Body $body1 -ContentType "application/json"
$response1 | ConvertTo-Json
Write-Host ""

Start-Sleep -Seconds 1

$body2 = @{ klicanaStoritev = "/api/users/login" } | ConvertTo-Json
$response2 = Invoke-RestMethod -Uri "$STATS_URL/api/stats/update" -Method Post -Body $body2 -ContentType "application/json"
$response2 | ConvertTo-Json
Write-Host ""

Start-Sleep -Seconds 1

$response3 = Invoke-RestMethod -Uri "$STATS_URL/api/stats/update" -Method Post -Body $body2 -ContentType "application/json"
$response3 | ConvertTo-Json
Write-Host ""

Start-Sleep -Seconds 1

$body3 = @{ klicanaStoritev = "/api/users/profile" } | ConvertTo-Json
$response4 = Invoke-RestMethod -Uri "$STATS_URL/api/stats/update" -Method Post -Body $body3 -ContentType "application/json"
$response4 | ConvertTo-Json
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# Test 3: Get Last Called Endpoint (Required endpoint #1)
Write-Host "3. GET /api/stats/last-called (Required Endpoint #1)" -ForegroundColor Green
try {
    $lastCalled = Invoke-RestMethod -Uri "$STATS_URL/api/stats/last-called" -Method Get
    $lastCalled | ConvertTo-Json
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# Test 4: Get Most Frequent Endpoint (Required endpoint #2)
Write-Host "4. GET /api/stats/most-frequent (Required Endpoint #2)" -ForegroundColor Green
try {
    $mostFrequent = Invoke-RestMethod -Uri "$STATS_URL/api/stats/most-frequent" -Method Get
    $mostFrequent | ConvertTo-Json
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# Test 5: Get All Statistics (Required endpoint #3)
Write-Host "5. GET /api/stats/all (Required Endpoint #3 - Call counts per endpoint)" -ForegroundColor Green
try {
    $allStats = Invoke-RestMethod -Uri "$STATS_URL/api/stats/all" -Method Get
    $allStats | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 View Swagger documentation at:" -ForegroundColor Yellow
Write-Host "   $STATS_URL/swagger" -ForegroundColor White
Write-Host ""
Write-Host "🎨 View frontend dashboard at:" -ForegroundColor Yellow
Write-Host "   http://localhost:3000/statistics" -ForegroundColor White
Write-Host ""
