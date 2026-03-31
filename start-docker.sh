#!/bin/bash
cd /Users/dawo/ev-log
docker compose up -d db postgrest 2>&1
echo "Exit code: $?"
