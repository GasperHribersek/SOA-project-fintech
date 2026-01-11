#!/bin/bash

# Test script for RabbitMQ logging implementation
# This script tests the complete logging flow

set -e

echo "================================================"
echo "Testing RabbitMQ Logging Implementation"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Generate a unique correlation ID for this test
CORRELATION_ID="test-$(date +%s)-$(uuidgen | cut -d'-' -f1)"
echo -e "${BLUE}Using Correlation ID: ${CORRELATION_ID}${NC}"
echo ""

# Test 1: Register a user with correlation ID
echo -e "${YELLOW}Test 1: Register user with correlation ID${NC}"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORRELATION_ID}" \
  -d "{
    \"username\": \"testuser$(date +%s)\",
    \"email\": \"test$(date +%s)@example.com\",
    \"password\": \"password123\"
  }")

echo "Response: $REGISTER_RESPONSE"
echo -e "${GREEN}✓ User registered${NC}"
echo ""

# Wait a bit for logs to be sent to RabbitMQ
sleep 2

# Test 2: Login with correlation ID
echo -e "${YELLOW}Test 2: Login with correlation ID${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORRELATION_ID}" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

# Extract token if login successful
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo -e "${GREEN}✓ Login successful${NC}"
  echo "Token: ${TOKEN:0:20}..."
else
  echo -e "${RED}✗ Login failed (user may not exist yet)${NC}"
  echo "Response: $LOGIN_RESPONSE"
fi
echo ""

# Wait for logs
sleep 2

# Test 3: Check RabbitMQ queue
echo -e "${YELLOW}Test 3: Check RabbitMQ queue status${NC}"
QUEUE_INFO=$(curl -s -u admin:admin123 http://localhost:15672/api/queues/%2F/logging_queue)
MESSAGE_COUNT=$(echo $QUEUE_INFO | grep -o '"messages":[0-9]*' | cut -d':' -f2)

echo "Messages in queue: $MESSAGE_COUNT"
if [ "$MESSAGE_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Logs are in RabbitMQ queue${NC}"
else
  echo -e "${YELLOW}⚠ No messages in queue (may have been consumed already)${NC}"
fi
echo ""

# Test 4: Fetch logs from RabbitMQ to database
echo -e "${YELLOW}Test 4: Fetch logs from RabbitMQ to database${NC}"
FETCH_RESPONSE=$(curl -s -X POST http://localhost:5001/logs)
echo "Response: $FETCH_RESPONSE"

LOGS_FETCHED=$(echo $FETCH_RESPONSE | grep -o '"count":[0-9]*' | cut -d':' -f2)
if [ -n "$LOGS_FETCHED" ] && [ "$LOGS_FETCHED" -gt 0 ]; then
  echo -e "${GREEN}✓ Fetched $LOGS_FETCHED logs from RabbitMQ${NC}"
else
  echo -e "${YELLOW}⚠ No logs fetched (queue may be empty)${NC}"
fi
echo ""

# Test 5: Query logs by correlation ID
echo -e "${YELLOW}Test 5: Query logs by correlation ID${NC}"
TODAY=$(date +%Y-%m-%d)
QUERY_RESPONSE=$(curl -s "http://localhost:5001/logs/2024-01-01/2025-12-31?correlation_id=${CORRELATION_ID}")

TOTAL_LOGS=$(echo $QUERY_RESPONSE | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "Total logs found: $TOTAL_LOGS"

if [ -n "$TOTAL_LOGS" ] && [ "$TOTAL_LOGS" -gt 0 ]; then
  echo -e "${GREEN}✓ Found logs with correlation ID: ${CORRELATION_ID}${NC}"
  echo ""
  echo "Sample log entries:"
  echo $QUERY_RESPONSE | python3 -m json.tool | head -50
else
  echo -e "${RED}✗ No logs found with correlation ID${NC}"
  echo "This could mean:"
  echo "  - Logs haven't been fetched from RabbitMQ yet (run Test 4 again)"
  echo "  - Services are not sending logs to RabbitMQ"
  echo "  - Correlation ID was not propagated correctly"
fi
echo ""

# Test 6: Get logs by service
echo -e "${YELLOW}Test 6: Query logs by service (auth-service)${NC}"
SERVICE_LOGS=$(curl -s "http://localhost:5001/logs/2024-01-01/2025-12-31?service=auth-service&limit=5")
SERVICE_COUNT=$(echo $SERVICE_LOGS | grep -o '"total":[0-9]*' | cut -d':' -f2)

echo "Auth service logs: $SERVICE_COUNT"
if [ -n "$SERVICE_COUNT" ] && [ "$SERVICE_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Found logs from auth-service${NC}"
else
  echo -e "${YELLOW}⚠ No logs from auth-service${NC}"
fi
echo ""

# Test 7: Get error logs only
echo -e "${YELLOW}Test 7: Query error logs only${NC}"
ERROR_LOGS=$(curl -s "http://localhost:5001/logs/2024-01-01/2025-12-31?level=ERROR")
ERROR_COUNT=$(echo $ERROR_LOGS | grep -o '"total":[0-9]*' | cut -d':' -f2)

echo "Error logs: $ERROR_COUNT"
if [ -n "$ERROR_COUNT" ]; then
  echo -e "${GREEN}✓ Error log query successful${NC}"
else
  echo -e "${YELLOW}⚠ Could not query error logs${NC}"
fi
echo ""

# Summary
echo "================================================"
echo -e "${BLUE}Test Summary${NC}"
echo "================================================"
echo ""
echo "Correlation ID used: ${CORRELATION_ID}"
echo ""
echo "To view all logs for this test run:"
echo "  curl \"http://localhost:5001/logs/2024-01-01/2025-12-31?correlation_id=${CORRELATION_ID}\" | python3 -m json.tool"
echo ""
echo "To access RabbitMQ Management UI:"
echo "  http://localhost:15672"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "To view Swagger API docs:"
echo "  http://localhost:5001/api-docs"
echo ""
echo -e "${GREEN}Testing complete!${NC}"

