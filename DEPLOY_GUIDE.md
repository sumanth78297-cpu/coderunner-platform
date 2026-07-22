# 🚀 CodeRunner Deployment Guide

Get your CodeRunner platform live with a sharable link in minutes!

## **🎯 Recommended: Render (Free & Easy)**

### **Step 1: Prepare Your Code**

```bash
# Initialize Git if not already done
git init
git add .
git commit -m "Initial commit: CodeRunner platform"
```

### **Step 2: Push to GitHub**

1. **Create GitHub Repository**
   - Go to https://github.com/new
   - Repository name: `coderunner-platform`
   - Make it public
   - Click "Create repository"

2. **Push Your Code**
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/coderunner-platform.git
   git branch -M main
   git push -u origin main
   ```

### **Step 3: Deploy on Render**

1. **Go to Render**
   - Visit https://render.com
   - Sign up/Login with GitHub

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your `coderunner-platform` repository
   - Click "Connect"

3. **Configure Settings**
   ```
   Name: coderunner-platform
   Environment: Node
   Region: Oregon (US West) [or closest to you]
   Branch: main
   Root Directory: (leave blank)
   
   Build Command: 
   npm install && cd client && npm install && npm run build && cd ../server && npm install
   
   Start Command:
   cd server && node real-server.js
   ```

4. **Environment Variables** (Optional)
   ```
   NODE_ENV=production
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait 3-5 minutes for deployment

### **🌐 Your Live Link**
```
https://coderunner-platform.onrender.com
```

---

## **🚂 Alternative: Railway (Also Great)**

### **Quick Railway Deploy**

1. **Push to GitHub** (same as above)

2. **Deploy on Railway**
   - Go to https://railway.app
   - Login with GitHub
   - Click "Deploy from GitHub repo"
   - Select `coderunner-platform`
   - Railway auto-detects and deploys!

### **🌐 Your Live Link**
```
https://coderunner-platform.up.railway.app
```

---

## **⚡ One-Click Deploy Buttons**

Add these to your README for easy deployment:

### **Render**
```markdown
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)
```

### **Railway** 
```markdown
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https%3A%2F%2Fgithub.com%2FYOUR-USERNAME%2Fcoderunner-platform)
```

---

## **🐳 Docker Deployment**

### **Build and Test Locally**
```bash
# Build the image
docker build -t coderunner .

# Run locally
docker run -p 3000:5000 coderunner

# Test at http://localhost:3000
```

### **Deploy to Cloud**

**Google Cloud Run:**
```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT-ID/coderunner

# Deploy
gcloud run deploy --image gcr.io/PROJECT-ID/coderunner --platform managed
```

**AWS ECS/Fargate:**
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

docker tag coderunner:latest ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/coderunner:latest
docker push ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/coderunner:latest
```

---

## **📊 Performance & Scaling**

### **Free Tier Capabilities**
- **Render Free**: 512MB RAM, sleeps after 15min inactivity
- **Railway Free**: 512MB RAM, $5 credit monthly
- **Vercel**: Good for frontend, limited backend execution

### **Scaling Recommendations**
```
Light Usage (Demo): Free tiers work great
Medium Usage: $7-15/month paid plans  
Heavy Usage: $25-50/month with auto-scaling
```

---

## **🔒 Production Security**

### **Environment Variables**
```bash
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_MAX=50
EXECUTION_TIMEOUT=10000
```

### **Security Headers** (Already Included)
- Helmet.js for security headers
- CORS protection
- Rate limiting
- Input validation

---

## **🎯 Custom Domain Setup**

### **Render Custom Domain**
1. Go to your service settings
2. Click "Custom Domains"
3. Add your domain: `coderunner.yourdomain.com`
4. Update DNS: `CNAME coderunner.yourdomain.com -> your-app.onrender.com`

### **Free Domain Options**
- **Freenom**: Free .tk, .ml domains
- **GitHub Pages**: username.github.io subdomain
- **Netlify**: Custom subdomain

---

## **📈 Monitoring & Analytics**

### **Built-in Health Check**
```
https://your-app.onrender.com/api/health
```

### **Monitoring Tools**
- **Render**: Built-in metrics and logs
- **Railway**: Performance dashboard
- **External**: UptimeRobot, Pingdom

---

## **🚀 Quick Deploy Script**

Run this for guided deployment:
```bash
chmod +x scripts/quick-deploy.sh
./scripts/quick-deploy.sh
```

---

## **💡 Pro Tips**

### **Optimize for Production**
1. **Enable HTTPS** - Automatically handled by Render/Railway
2. **Add Favicon** - Better professional appearance  
3. **Custom Domain** - More professional than .onrender.com
4. **Analytics** - Add Google Analytics for usage tracking

### **Share Your Project**
```markdown
🎯 **Live Demo**: https://coderunner-platform.onrender.com
🔗 **GitHub**: https://github.com/YOUR-USERNAME/coderunner-platform  
📊 **Features**: Real-time code execution, Interactive terminal, Multi-language support
```

### **Resume/Portfolio Integration**
```markdown
## CodeRunner - Real-time Code Execution Platform
- **Live Demo**: [coderunner-platform.onrender.com](https://coderunner-platform.onrender.com)
- **Technologies**: Node.js, React, WebSockets, Docker
- **Features**: Interactive code execution, real-time streaming, security hardening
```

---

## **🎉 You're Live!**

Once deployed, your CodeRunner platform will be accessible worldwide with a professional sharable link. Perfect for:

- **Job Applications** - Live demo in your resume
- **Portfolio** - Showcase your full-stack skills  
- **Teaching** - Share with students or colleagues
- **Open Source** - Community contributions welcome

**Your platform demonstrates senior-level engineering skills that top companies value!** 🚀