#!/usr/bin/env bash

set -e  # Exit immediately if any command fails
set -o pipefail  # Fail a pipeline if any command fails

echo "🚀 Starting advanced deployment script..."

# 1. Define variables
APP_DIR="/opt/render/project/src"  # Default Render app directory
LOG_DIR="$APP_DIR/logs"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# 2. Create logs directory if not exists
mkdir -p "$LOG_DIR"

# 3. Pull latest code (optional if you auto-deploy via Render GitHub integration)
echo "📥 Pulling latest code from git..."
git pull origin main

# 4. Install dependencies
echo "📦 Installing/updating dependencies..."
npm install --only=production

# 6. Start or restart server with PM2
echo "⚡ Starting or restarting server with PM2..."
npx pm2 startOrRestart ecosystem.config.js --only server --update-env \
  --log-date-format 'YYYY-MM-DD HH:mm:ss' \
  --output "$LOG_DIR/out-$TIMESTAMP.log" \
  --error "$LOG_DIR/err-$TIMESTAMP.log"

echo "✅ Deployment complete at $TIMESTAMP"
