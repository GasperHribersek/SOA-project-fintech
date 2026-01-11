#!/bin/bash

# Statistics Service Test Script
# This script tests all 4 required endpoints

echo "================================"
echo "Statistics Service Test Script"
echo "================================"
echo ""

# Configuration
STATS_URL="${STATISTICS_SERVICE_URL:-http://localhost:5002}"

echo "Testing statistics service at: $STATS_URL"
echo ""

# Test 1: Health Check
echo "1. Testing health endpoint..."
curl -s "$STATS_URL/health" | json_pp
echo ""
echo "---"
echo ""

# Test 2: Add some test data
echo "2. Adding test data..."
curl -s -X POST "$STATS_URL/api/stats/update" \
  -H "Content-Type: application/json" \
  -d '{"klicanaStoritev": "/api/users/register"}' | json_pp
echo ""

sleep 1

curl -s -X POST "$STATS_URL/api/stats/update" \
  -H "Content-Type: application/json" \
  -d '{"klicanaStoritev": "/api/users/login"}' | json_pp
echo ""

sleep 1

curl -s -X POST "$STATS_URL/api/stats/update" \
  -H "Content-Type: application/json" \
  -d '{"klicanaStoritev": "/api/users/login"}' | json_pp
echo ""

sleep 1

curl -s -X POST "$STATS_URL/api/stats/update" \
  -H "Content-Type: application/json" \
  -d '{"klicanaStoritev": "/api/users/profile"}' | json_pp
echo ""
echo "---"
echo ""

# Test 3: Get Last Called Endpoint (Required endpoint #1)
echo "3. GET /api/stats/last-called (Required Endpoint #1)"
curl -s "$STATS_URL/api/stats/last-called" | json_pp
echo ""
echo "---"
echo ""

# Test 4: Get Most Frequent Endpoint (Required endpoint #2)
echo "4. GET /api/stats/most-frequent (Required Endpoint #2)"
curl -s "$STATS_URL/api/stats/most-frequent" | json_pp
echo ""
echo "---"
echo ""

# Test 5: Get All Statistics (Required endpoint #3)
echo "5. GET /api/stats/all (Required Endpoint #3 - Call counts per endpoint)"
curl -s "$STATS_URL/api/stats/all" | json_pp
echo ""
echo "---"
echo ""

echo "================================"
echo "✅ All tests completed!"
echo "================================"
echo ""
echo "📊 View Swagger documentation at:"
echo "   $STATS_URL/swagger"
echo ""
echo "🎨 View frontend dashboard at:"
echo "   http://localhost:3000/statistics"
echo ""
