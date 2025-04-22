#!/usr/bin/env bash

echo "🚀 Starting advanced deployment script..."

# Optional: Print Node.js and npm versions
echo "📦 Node.js version:"
node -v
echo "📦 npm version:"
npm -v

# Install dependencies (already done during build phase, but safe to add)
echo "📦 Ensuring dependencies are installed..."
npm install --force

# Optional: Run build step if needed
# echo "⚙️ Building project..."
# npm run build

# Start your server
echo "🏁 Starting server..."
npm run start

echo "✅ Server started successfully."
