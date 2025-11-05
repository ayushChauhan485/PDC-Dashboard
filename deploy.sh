#!/bin/bash
# Deployment Script for PDC Dashboard
# This script ensures firebase-config.public.js has the correct credentials before deploying

echo "🚀 PDC Dashboard Deployment Script"
echo "=================================="
echo ""

# Check if firebase-config.public.js exists
if [ ! -f "firebase-config.public.js" ]; then
    echo "❌ Error: firebase-config.public.js not found!"
    exit 1
fi

# Check if it contains placeholder values
if grep -q "YOUR_API_KEY_HERE" firebase-config.public.js; then
    echo "⚠️  WARNING: firebase-config.public.js contains placeholder values!"
    echo ""
    echo "Please update firebase-config.public.js with your actual Firebase configuration before deploying."
    echo ""
    echo "Steps:"
    echo "1. Copy values from firebase-config.js (your local file)"
    echo "2. Paste them into firebase-config.public.js"
    echo "3. Run this script again"
    echo ""
    exit 1
fi

echo "✅ Configuration file looks good!"
echo ""
echo "Deploying to Firebase Hosting..."
echo ""

# Deploy to Firebase
firebase deploy

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your site: https://pdc-dashboard-8963a.web.app"
