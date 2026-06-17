#!/bin/bash
# Start the realtime-service as a fully detached daemon
# Usage: bash start-realtime.sh

cd /home/z/my-project/mini-services/realtime-service

# Kill any existing instances
pkill -f "realtime-service/index.ts" 2>/dev/null
sleep 1

# Start fully detached with setsid - creates a new session,
# detaches from controlling terminal, immune to SIGHUP
setsid bun --hot index.ts < /dev/null > /home/z/my-project/realtime-service.log 2>&1 &
PID=$!
echo "Started realtime-service (initial PID: $PID)"

# Wait for it to bind to port 3003
for i in {1..10}; do
  sleep 1
  if ss -tln 2>/dev/null | grep -q ":3003 "; then
    echo "Service is listening on port 3003"
    # Get the actual bun PID
    ACTUAL_PID=$(ss -tlnp 2>/dev/null | grep ":3003 " | grep -oP 'pid=\K[0-9]+' | head -1)
    echo "Actual bun PID: $ACTUAL_PID"
    exit 0
  fi
done

echo "ERROR: service did not start listening in time"
echo "--- log ---"
cat /home/z/my-project/realtime-service.log
exit 1
