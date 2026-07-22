# 🚀 AWS Deployment Guide for CodeRunner

Deploy your CodeRunner platform on AWS with production-grade infrastructure.

## **🎯 Quick Start (Recommended)**

### **AWS App Runner - Easiest Option**

**Perfect for:** Learning, demos, small-scale production

```bash
# 1. Run the deployment script
chmod +x aws/deploy-to-aws.sh
./aws/deploy-to-aws.sh

# 2. Choose option 1 (App Runner)
# 3. Follow the prompts
```

**Result:** Your app will be live at `https://xxx.region.awsapprunner.com`

---

## **🏗️ AWS Architecture Options**

### **1. AWS App Runner (Beginner-Friendly)**
```
Internet → App Runner → Your CodeRunner App
```
- ✅ **Pros**: Easiest setup, auto-scaling, managed infrastructure
- ❌ **Cons**: Less control, newer service
- 💰 **Cost**: ~$25-50/month for moderate usage

### **2. Amazon ECS Fargate (Production)**
```
Internet → ALB → ECS Fargate → ECR Container
```
- ✅ **Pros**: Production-ready, auto-scaling, container orchestration
- ❌ **Cons**: More complex setup
- 💰 **Cost**: ~$30-100/month depending on scale

### **3. EC2 + Auto Scaling (Full Control)**
```
Internet → ALB → Auto Scaling Group → EC2 Instances
```
- ✅ **Pros**: Full control, can optimize costs, SSH access
- ❌ **Cons**: More maintenance required
- 💰 **Cost**: ~$20-80/month depending on instance types

---

## **📋 Prerequisites**

### **1. AWS Account Setup**
```bash
# Install AWS CLI
brew install awscli  # macOS
# or
pip install awscli   # Python

# Configure credentials
aws configure
# Enter: Access Key ID, Secret Key, Region (us-east-1), Format (json)
```

### **2. Required Tools**
```bash
# Docker (for containerization)
brew install docker  # macOS

# Git (for code management)
git --version  # Should be installed

# Optional: AWS CDK for advanced infrastructure
npm install -g aws-cdk
```

---

## **🚀 Step-by-Step Deployments**

### **Option A: AWS App Runner (Recommended)**

**Time: 10-15 minutes**

1. **Prepare Your Code**
   ```bash
   # Push to GitHub first
   git add .
   git commit -m "Ready for AWS deployment"
   git push origin main
   ```

2. **Run Deployment Script**
   ```bash
   ./aws/deploy-to-aws.sh
   # Choose option 1
   ```

3. **Complete in AWS Console**
   - Go to [AWS App Runner Console](https://console.aws.amazon.com/apprunner/)
   - Click "Create service"
   - Choose "Container registry"
   - Select your ECR image
   - Configure:
     ```
     Port: 5000
     Environment variables:
       NODE_ENV=production
       PORT=5000
     ```

4. **Get Your URL**
   ```
   https://xxxxx.us-east-1.awsapprunner.com
   ```

### **Option B: Amazon ECS Fargate**

**Time: 20-30 minutes**

1. **Deploy Infrastructure**
   ```bash
   ./aws/deploy-to-aws.sh
   # Choose option 2
   ```

2. **Create ECS Service**
   - Go to [ECS Console](https://console.aws.amazon.com/ecs/)
   - Select your cluster
   - Create service:
     ```
     Launch type: Fargate
     Task definition: coderunner-task
     Desired tasks: 1
     VPC: Default VPC
     Subnets: Public subnets
     Security group: Allow HTTP (80) and HTTPS (443)
     ```

3. **Configure Load Balancer**
   - Create Application Load Balancer
   - Target group: Point to ECS service on port 5000
   - Health check: `/api/health`

### **Option C: CloudFormation (Infrastructure as Code)**

**Time: 15-25 minutes**

```bash
# Update with your GitHub username
sed -i 's/YOUR-USERNAME/your-actual-username/g' aws/cloudformation.yaml

# Deploy stack
aws cloudformation deploy \
  --template-file aws/cloudformation.yaml \
  --stack-name coderunner-platform \
  --capabilities CAPABILITY_IAM \
  --region us-east-1

# Get the URL
aws cloudformation describe-stacks \
  --stack-name coderunner-platform \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
  --output text
```

---

## **🔒 Production Configuration**

### **Environment Variables**
```bash
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_MAX=50
EXECUTION_TIMEOUT=10000
LOG_LEVEL=warn
```

### **Security Best Practices**

1. **HTTPS/SSL Certificate**
   ```bash
   # Request SSL certificate
   aws acm request-certificate \
     --domain-name your-domain.com \
     --validation-method DNS
   ```

2. **Custom Domain with Route 53**
   ```bash
   # Create hosted zone
   aws route53 create-hosted-zone \
     --name your-domain.com \
     --caller-reference $(date +%s)
   ```

3. **CloudFront CDN**
   ```bash
   # Create distribution for global performance
   aws cloudfront create-distribution \
     --distribution-config file://cloudfront-config.json
   ```

---

## **📊 Monitoring & Logging**

### **CloudWatch Setup**
```bash
# Create log group
aws logs create-log-group \
  --log-group-name /aws/coderunner/application

# Set up alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "CodeRunner-HighCPU" \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

### **Application Performance**
```bash
# Enable X-Ray tracing (optional)
aws xray create-group \
  --group-name "CodeRunner" \
  --filter-expression "service(\"coderunner\")"
```

---

## **💰 Cost Optimization**

### **Free Tier Usage**
- **EC2**: 750 hours/month of t2.micro instances
- **Application Load Balancer**: 750 hours/month
- **CloudWatch**: 10 metrics, 10 alarms

### **Cost Estimates**
| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| App Runner | 1 vCPU, 2GB RAM | $25-40 |
| ECS Fargate | 0.5 vCPU, 1GB RAM | $15-30 |
| EC2 t3.micro | With ALB | $15-25 |
| ALB | Always running | $16 |
| Route 53 | Hosted zone | $0.50 |

### **Cost Optimization Tips**
```bash
# Use Spot instances for development
aws ec2 request-spot-instances \
  --spot-price "0.05" \
  --instance-count 1 \
  --type "one-time" \
  --launch-specification file://spot-spec.json
```

---

## **🔧 Troubleshooting**

### **Common Issues**

1. **Service Won't Start**
   ```bash
   # Check ECS logs
   aws logs get-log-events \
     --log-group-name /ecs/coderunner \
     --log-stream-name ecs/coderunner/$(date +%Y/%m/%d)
   ```

2. **Health Check Failing**
   ```bash
   # Test health endpoint
   curl https://your-app-url.com/api/health
   
   # Check target group health
   aws elbv2 describe-target-health \
     --target-group-arn your-target-group-arn
   ```

3. **High Latency**
   ```bash
   # Enable CloudFront for global distribution
   # Use RDS read replicas for database queries
   # Implement Redis caching
   ```

---

## **🚀 Advanced Features**

### **Auto Scaling Configuration**
```bash
# CPU-based scaling
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/coderunner-cluster/coderunner-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 10
```

### **Blue/Green Deployments**
```bash
# Use CodeDeploy for zero-downtime deployments
aws deploy create-application \
  --application-name CodeRunner \
  --compute-platform ECS
```

### **Multi-Region Setup**
```bash
# Deploy to multiple regions for global availability
regions=("us-east-1" "eu-west-1" "ap-southeast-1")
for region in "${regions[@]}"; do
  aws cloudformation deploy \
    --template-file aws/cloudformation.yaml \
    --stack-name coderunner-$region \
    --region $region
done
```

---

## **📈 Scaling for Production**

### **Expected Load Handling**
- **App Runner**: Up to 25 concurrent requests
- **ECS Fargate**: Scales to 100+ concurrent requests
- **EC2 Auto Scaling**: Unlimited with proper configuration

### **Database Integration**
```bash
# Add RDS PostgreSQL for user data
aws rds create-db-instance \
  --db-name coderunner \
  --db-instance-identifier coderunner-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password your-password \
  --allocated-storage 20
```

---

## **🎯 Success Metrics**

### **Your Deployed App Will Have:**
- ✅ **Global Accessibility**: Available worldwide
- ✅ **Auto Scaling**: Handles traffic spikes
- ✅ **High Availability**: 99.9%+ uptime
- ✅ **Security**: HTTPS, WAF protection
- ✅ **Monitoring**: CloudWatch metrics and alarms
- ✅ **Professional URL**: Custom domain ready

### **Resume-Worthy Achievement**
```
Deployed scalable code execution platform on AWS using:
• Amazon ECS Fargate for container orchestration
• Application Load Balancer for high availability  
• CloudWatch for monitoring and alerting
• Infrastructure as Code with CloudFormation
• Auto-scaling based on CPU/memory metrics
```

**🚀 Your CodeRunner platform will be production-ready on AWS infrastructure used by Fortune 500 companies!**