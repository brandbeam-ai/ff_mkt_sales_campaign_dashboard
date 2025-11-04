#!/bin/bash

# Quick Update Script for Fundraising Flywheel Portal
# Use this for minor updates that don't require rebuilding

set -e

APP_NAME="ff_mkt_sale_dashboard"

echo "🔄 Starting quick update for Marketing & Sales Funnel Dashboard..."


echo "📥 Pulling latest changes from GitHub..."
git pull

echo "📦 Installing dependencies..."
npm install

echo "🏗️  Building Next.js application..."
npm run build

echo "♻️  Restarting PM2 process..."
pm2 restart $APP_NAME

echo "✅ Update completed successfully!"
echo ""
echo "📊 Application Status:"
pm2 info $APP_NAME

echo ""
echo "📝 View logs with: pm2 logs $APP_NAME"
