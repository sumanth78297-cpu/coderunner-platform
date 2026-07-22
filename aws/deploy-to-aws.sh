#!/bin/bash

# CodeRunner AWS Deployment Script
# Supports multiple AWS deployment methods

set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
APP_NAME="coderunner-platform"
ECR_REPOSITORY="$APP_NAME"
CLUSTER_NAME="$APP_NAME-cluster"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 CodeRunner AWS Deployment${NC}"
echo "=================================="
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure'${NC}"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ AWS Account: $ACCOUNT_ID${NC}"
echo -e "${GREEN}✅ Region: $AWS_REGION${NC}"
echo ""

echo "Choose deployment method:"
echo "1) AWS App Runner (Recommended for beginners)"
echo "2) Amazon ECS Fargate (Production-ready containers)"
echo "3) AWS Elastic Beanstalk (Platform-as-a-Service)"
echo "4) EC2 with Auto Scaling (Full control)"
echo "5) AWS Lambda + API Gateway (Serverless)"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
    1)
        echo -e "${BLUE}🏃 Deploying with AWS App Runner...${NC}"
        
        # Create ECR repository if it doesn't exist
        if ! aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION &> /dev/null; then
            echo "Creating ECR repository..."
            aws ecr create-repository --repository-name $ECR_REPOSITORY --region $AWS_REGION
        fi
        
        # Build and push Docker image
        echo "Building Docker image..."
        docker build -t $APP_NAME .
        
        # Get ECR login token
        aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
        
        # Tag and push image
        docker tag $APP_NAME:latest $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
        docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
        
        echo ""
        echo -e "${GREEN}✅ Image pushed to ECR${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Go to AWS Console > App Runner"
        echo "2. Create a new App Runner service"
        echo "3. Choose 'Container registry' as source"
        echo "4. Use ECR image: $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest"
        echo "5. Set port to 5000"
        echo ""
        echo -e "${YELLOW}💡 Your app will be available at: https://xxx.region.awsapprunner.com${NC}"
        ;;
        
    2)
        echo -e "${BLUE}🐳 Deploying with Amazon ECS Fargate...${NC}"
        
        # Create ECR repository
        if ! aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION &> /dev/null; then
            echo "Creating ECR repository..."
            aws ecr create-repository --repository-name $ECR_REPOSITORY --region $AWS_REGION
        fi
        
        # Build and push image
        echo "Building and pushing Docker image..."
        docker build -t $APP_NAME .
        aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
        docker tag $APP_NAME:latest $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
        docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
        
        # Create ECS cluster
        if ! aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION &> /dev/null; then
            echo "Creating ECS cluster..."
            aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION
        fi
        
        # Update task definition with account ID
        sed "s/ACCOUNT/$ACCOUNT_ID/g; s/REGION/$AWS_REGION/g" aws/ecs-task-definition.json > /tmp/task-definition.json
        
        # Register task definition
        echo "Registering ECS task definition..."
        aws ecs register-task-definition --cli-input-json file:///tmp/task-definition.json --region $AWS_REGION
        
        echo ""
        echo -e "${GREEN}✅ ECS setup complete${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Go to AWS Console > ECS > Clusters > $CLUSTER_NAME"
        echo "2. Create a new Fargate service"
        echo "3. Use the registered task definition: coderunner-task"
        echo "4. Configure Application Load Balancer"
        echo "5. Set health check path to /api/health"
        ;;
        
    3)
        echo -e "${BLUE}🌱 Deploying with AWS Elastic Beanstalk...${NC}"
        
        # Create application zip
        echo "Creating deployment package..."
        zip -r coderunner-app.zip . -x "*.git*" "*node_modules*" "*aws*" "*temp-files*"
        
        echo ""
        echo -e "${GREEN}✅ Deployment package created: coderunner-app.zip${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Go to AWS Console > Elastic Beanstalk"
        echo "2. Create a new application: $APP_NAME"
        echo "3. Choose 'Node.js' platform"
        echo "4. Upload coderunner-app.zip"
        echo "5. Configure environment variables:"
        echo "   NODE_ENV=production"
        echo "   PORT=5000"
        ;;
        
    4)
        echo -e "${BLUE}🖥️  Deploying with EC2 + Auto Scaling...${NC}"
        
        # Deploy CloudFormation stack
        echo "Deploying CloudFormation stack..."
        
        # Update CloudFormation template with GitHub repo
        read -p "Enter your GitHub username: " github_user
        sed "s/YOUR-USERNAME/$github_user/g" aws/cloudformation.yaml > /tmp/cloudformation.yaml
        
        aws cloudformation deploy \
            --template-file /tmp/cloudformation.yaml \
            --stack-name $APP_NAME-stack \
            --parameter-overrides AppName=$APP_NAME \
            --capabilities CAPABILITY_IAM \
            --region $AWS_REGION
        
        # Get load balancer URL
        LB_URL=$(aws cloudformation describe-stacks \
            --stack-name $APP_NAME-stack \
            --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
            --output text \
            --region $AWS_REGION)
        
        echo ""
        echo -e "${GREEN}✅ EC2 deployment complete${NC}"
        echo -e "${YELLOW}🌐 Your app will be available at: $LB_URL${NC}"
        ;;
        
    5)
        echo -e "${BLUE}⚡ Deploying with AWS Lambda (Serverless)...${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  Note: Lambda has execution time limits (15 minutes max)${NC}"
        echo "This may not be suitable for long-running code execution."
        echo ""
        echo "For Lambda deployment:"
        echo "1. Use AWS SAM (Serverless Application Model)"
        echo "2. Consider API Gateway integration"
        echo "3. Use SQS for longer-running code execution"
        echo "4. Store temporary files in /tmp (512MB limit)"
        echo ""
        echo "Recommended: Use App Runner or ECS instead for this use case."
        ;;
        
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Deployment process initiated!${NC}"
echo ""
echo -e "${BLUE}💡 Pro Tips:${NC}"
echo "• Enable HTTPS using AWS Certificate Manager"
echo "• Use CloudFront for global CDN"
echo "• Set up Route 53 for custom domain"
echo "• Configure CloudWatch for monitoring"
echo "• Use AWS Systems Manager for secure access"