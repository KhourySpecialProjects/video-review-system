#!/bin/bash

# ==========================================
# AWS SSM Port Forwarding to RDS (via .env)
# ==========================================

# 1. Load variables from the .env file
if [ -f ./.env ]; then
    # 'set -a' automatically exports all variables defined
    set -a
    source ./.env
    set +a
else
    echo "❌ Error: .env file not found in the current directory."
    exit 1
fi

# 2. Verify that the required variables were actually in the .env file
if [ -z "$EC2_INSTANCE_ID" ] || [ -z "$RDS_ENDPOINT" ]; then
    echo "❌ Error: EC2_INSTANCE_ID or RDS_ENDPOINT is missing from your .env file."
    exit 1
fi

# 3. Format the parameters JSON string securely
PARAMETERS="{\"host\":[\"${RDS_ENDPOINT}\"],\"portNumber\":[\"5432\"],\"localPortNumber\":[\"5432\"]}"

# 4. Print status to the terminal
echo "🚀 Starting SSM Port Forwarding Tunnel..."
echo "EC2 Target: $EC2_INSTANCE_ID"
echo "RDS Host:   $RDS_ENDPOINT:5432"
echo "Local Port: 5432"
echo "------------------------------------------"
echo "Press [Ctrl+C] to close the tunnel."
echo "------------------------------------------"

# 5. Execute the command
aws ssm start-session \
    --target "$EC2_INSTANCE_ID" \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --profile "default" \
    --parameters "$PARAMETERS"