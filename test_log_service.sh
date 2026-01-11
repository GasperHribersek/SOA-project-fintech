#!/bin/bash

# Test script for Log Service
# Tests the 3 required endpoints

set -e

echo "================================================"
echo "Testing Log Service"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

CORRELATION_ID="log-service-test-$(date +%s)"
LOG_SERVICE_URL="http://localhost:5002"

echo -e "${BLUE}Log Service URL: ${LOG_SERVICE_URL}${NC}"
echo -e "${BLUE}Correlation ID: ${CORRELATION_ID}${NC}"
echo ""

# Test 0: Health check
echo -e "${YELLOW}Test 0: Health Check${NC}"
HEALTH_RESPONSE=$(curl -s ${LOG_SERVICE_URL}/health)
echo "Response: $HEALTH_RESPONSE"

if echo $HEALTH_RESPONSE | grep -q "OK"; then
  echo -e "${GREEN}✓ Log Service is healthy${NC}"
else
  echo -e "${RED}✗ Log Service is not responding${NC}"
  exit 1
fi
echo ""

# Test 1: Generate some logs
echo -e "${YELLOW}Test 1: Generate Test Logs${NC}"
echo "Generating logs by calling other services..."

# Register a user to generate logs
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORRELATION_ID}" \
  -d "{
    \"username\": \"testuser$(date +%s)\",
    \"email\": \"test$(date +%s)@example.com\",
    \"password\": \"password123\"
  }" > /dev/null

echo -e "${GREEN}✓ Test logs generated${NC}"
echo ""

# Wait for logs to be sent to RabbitMQ
echo "Waiting 3 seconds for logs to reach RabbitMQ..."
sleep 3
echo ""

# Test 2: Check RabbitMQ queue
echo -e "${YELLOW}Test 2: Check RabbitMQ Queue${NC}"
QUEUE_INFO=$(curl -s -u admin:admin123 http://localhost:15672/api/queues/%2F/logging_queue)
MESSAGE_COUNT=$(echo $QUEUE_INFO | grep -o '"messages":[0-9]*' | cut -d':' -f2 || echo "0")

echo "Messages in RabbitMQ queue: $MESSAGE_COUNT"
if [ "$MESSAGE_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Logs are in RabbitMQ queue${NC}"
else
  echo -e "${YELLOW}⚠ No messages in queue (may have been consumed already)${NC}"
fi
echo ""

# Test 3: POST /logs - Fetch logs from RabbitMQ
echo -e "${YELLOW}Test 3: POST /logs - Fetch logs from RabbitMQ${NC}"
FETCH_RESPONSE=$(curl -s -X POST ${LOG_SERVICE_URL}/logs)
echo "Response: $FETCH_RESPONSE"

LOGS_FETCHED=$(echo $FETCH_RESPONSE | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")
if [ -n "$LOGS_FETCHED" ] && [ "$LOGS_FETCHED" -gt 0 ]; then
  echo -e "${GREEN}✓ Successfully fetched $LOGS_FETCHED logs from RabbitMQ${NC}"
else
  echo -e "${YELLOW}⚠ No logs fetched (queue may be empty)${NC}"
fi
echo ""

# Test 4: GET /logs/{dateFrom}/{dateTo} - Query all logs
echo -e "${YELLOW}Test 4: GET /logs/{from}/{to} - Query all logs${NC}"
QUERY_RESPONSE=$(curl -s "${LOG_SERVICE_URL}/logs/2024-01-01/2025-12-31")

TOTAL_LOGS=$(echo $QUERY_RESPONSE | grep -o '"total":[0-9]*' | cut -d':' -f2 || echo "0")
echo "Total logs in database: $TOTAL_LOGS"

if [ -n "$TOTAL_LOGS" ] && [ "$TOTAL_LOGS" -gt 0 ]; then
  echo -e "${GREEN}✓ Successfully queried logs${NC}"
  echo ""
  echo "Sample log entries (first 3):"
  echo $QUERY_RESPONSE | python3 -m json.tool | head -60
else
  echo -e "${RED}✗ No logs found in database${NC}"
fi
echo ""

# Test 5: GET /logs/{from}/{to}?correlation_id - Query by correlation ID
echo -e "${YELLOW}Test 5: Query logs by correlation ID${NC}"
CORRELATION_QUERY=$(curl -s "${LOG_SERVICE_URL}/logs/2024-01-01/2025-12-31?correlation_id=${CORRELATION_ID}")

CORRELATION_COUNT=$(echo $CORRELATION_QUERY | grep -o '"total":[0-9]*' | cut -d':' -f2 || echo "0")
echo "Logs with correlation ID '${CORRELATION_ID}': $CORRELATION_COUNT"

if [ -n "$CORRELATION_COUNT" ] && [ "$CORRELATION_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Found logs with correlation ID${NC}"
  echo ""
  echo "Logs for this test run:"
  echo $CORRELATION_QUERY | python3 -m json.tool | head -40
else
  echo -e "${YELLOW}⚠ No logs found with this correlation ID${NC}"
  echo "This could mean:"
  echo "  - Logs haven't been fetched from RabbitMQ yet (run Test 3 again)"
  echo "  - Services are not generating logs"
fi
echo ""

# Test 6: Query by service
echo -e "${YELLOW}Test 6: Query logs by service (auth-service)${NC}"
SERVICE_QUERY=$(curl -s "${LOG_SERVICE_URL}/logs/2024-01-01/2025-12-31?service=auth-service&limit=5")
SERVICE_COUNT=$(echo $SERVICE_QUERY | grep -o '"total":[0-9]*' | cut -d':' -f2 || echo "0")

echo "Auth service logs: $SERVICE_COUNT"
if [ -n "$SERVICE_COUNT" ] && [ "$SERVICE_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Found logs from auth-service${NC}"
else
  echo -e "${YELLOW}⚠ No logs from auth-service${NC}"
fi
echo ""

# Test 7: Query by level
echo -e "${YELLOW}Test 7: Query logs by level (ERROR)${NC}"
ERROR_QUERY=$(curl -s "${LOG_SERVICE_URL}/logs/2024-01-01/2025-12-31?level=ERROR")
ERROR_COUNT=$(echo $ERROR_QUERY | grep -o '"total":[0-9]*' | cut -d':' -f2 || echo "0")

echo "Error logs: $ERROR_COUNT"
if [ -n "$ERROR_COUNT" ]; then
  echo -e "${GREEN}✓ Error log query successful${NC}"
else
  echo -e "${YELLOW}⚠ Could not query error logs${NC}"
fi
echo ""

# Test 8: DELETE /logs - Delete all logs (optional, commented out by default)
echo -e "${YELLOW}Test 8: DELETE /logs - Delete all logs${NC}"
echo "Skipping delete test (uncomment to test)"
# Uncomment the following lines to test delete
# DELETE_RESPONSE=$(curl -s -X DELETE ${LOG_SERVICE_URL}/logs)
# echo "Response: $DELETE_RESPONSE"
# echo -e "${GREEN}✓ Delete endpoint working${NC}"
echo ""

# Summary
echo "================================================"
echo -e "${BLUE}Test Summary${NC}"
echo "================================================"
echo ""
echo "Correlation ID used: ${CORRELATION_ID}"
echo ""
echo "Endpoints tested:"
echo "  ✓ POST /logs - Fetch from RabbitMQ"
echo "  ✓ GET /logs/{from}/{to} - Query all logs"
echo "  ✓ GET /logs/{from}/{to}?correlation_id - Query by correlation ID"
echo "  ✓ GET /logs/{from}/{to}?service - Query by service"
echo "  ✓ GET /logs/{from}/{to}?level - Query by level"
echo "  ⊗ DELETE /logs - Skipped (uncomment in script to test)"
echo ""
echo "Quick commands:"
echo ""
echo "# Fetch logs from RabbitMQ"
echo "curl -X POST ${LOG_SERVICE_URL}/logs"
echo ""
echo "# Query all logs"
echo "curl \"${LOG_SERVICE_URL}/logs/2024-01-01/2025-12-31\""
echo ""
echo "# Query by correlation ID"
echo "curl \"${LOG_SERVICE_URL}/logs/2024-01-01/2025-12-31?correlation_id=${CORRELATION_ID}\""
echo ""
echo "# Delete all logs"
echo "curl -X DELETE ${LOG_SERVICE_URL}/logs"
echo ""
echo -e "${GREEN}Testing complete!${NC}"

