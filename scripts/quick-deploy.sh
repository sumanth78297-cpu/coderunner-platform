#!/bin/bash

# CodeRunner Quick Deploy Script
# Deploys to various cloud platforms

set -e

echo "🚀 CodeRunner Quick Deploy"
echo "=========================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📂 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit: CodeRunner platform"
fi

echo ""
echo "Choose deployment platform:"
echo "1) GitHub + Render (Free, Recommended)"
echo "2) GitHub + Railway"  
echo "3) GitHub + Vercel"
echo "4) DigitalOcean App Platform"
echo "5) Manual Docker deployment"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
    1)
        echo "🎯 Deploying to Render..."
        echo ""
        echo "Steps to complete deployment:"
        echo "1. Push code to GitHub:"
        echo "   git remote add origin https://github.com/YOUR-USERNAME/coderunner.git"
        echo "   git branch -M main"
        echo "   git push -u origin main"
        echo ""
        echo "2. Go to https://render.com"
        echo "3. Click 'New +' > 'Web Service'"
        echo "4. Connect your GitHub repository"
        echo "5. Use these settings:"
        echo "   - Build Command: npm install && cd client && npm install && npm run build && cd ../server && npm install"
        echo "   - Start Command: cd server && node real-server.js"
        echo "   - Environment: Node"
        echo ""
        echo "🌐 Your app will be available at: https://YOUR-APP-NAME.onrender.com"
        ;;
    2)
        echo "🚂 Deploying to Railway..."
        echo ""
        echo "Steps:"
        echo "1. Push to GitHub (same as above)"
        echo "2. Go to https://railway.app"
        echo "3. Click 'Deploy from GitHub repo'"
        echo "4. Select your repository"
        echo "5. Railway will auto-detect and deploy"
        echo ""
        echo "🌐 Your app will be available at: https://YOUR-APP.up.railway.app"
        ;;
    3)
        echo "▲ Deploying to Vercel..."
        echo ""
        echo "Note: Vercel is optimized for frontend. For full-stack with real code execution,"
        echo "Render or Railway are better choices."
        echo ""
        echo "Steps:"
        echo "1. Push to GitHub"
        echo "2. Go to https://vercel.com"
        echo "3. Import your repository"
        echo "4. Set build settings for Node.js"
        ;;
    4)
        echo "🌊 Deploying to DigitalOcean..."
        echo ""
        echo "Steps:"
        echo "1. Push to GitHub"
        echo "2. Go to https://cloud.digitalocean.com/apps"
        echo "3. Click 'Create App'"
        echo "4. Connect GitHub and select repository"
        echo "5. Use the .do/app.yaml configuration"
        ;;
    5)
        echo "🐳 Manual Docker deployment..."
        echo ""
        echo "Build and run locally:"
        echo "  docker build -t coderunner ."
        echo "  docker run -p 3000:5000 coderunner"
        echo ""
        echo "Or deploy to any cloud with Docker support:"
        echo "- AWS ECS"
        echo "- Google Cloud Run"  
        echo "- Azure Container Instances"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment instructions complete!"
echo ""
echo "💡 Pro Tips:"
echo "- Use environment variables for production configuration"
echo "- Enable HTTPS for security"
echo "- Monitor application performance and logs"
echo "- Consider rate limiting for public access"