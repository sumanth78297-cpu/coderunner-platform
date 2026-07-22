# CodeRunner Deployment Guide

This guide covers various deployment options for CodeRunner.

## Quick Start (Docker Compose)

The fastest way to deploy CodeRunner:

```bash
# Clone the repository
git clone <your-repo-url>
cd coderunner

# Start with Docker Compose
docker-compose up --build

# Access at http://localhost:3000
```

## Manual Deployment

### Prerequisites

- Node.js 18+
- Docker (for code execution containers)
- 2GB+ available memory
- Docker socket access

### Steps

1. **Setup Environment**
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

2. **Development Mode**
   ```bash
   npm run dev
   ```

3. **Production Build**
   ```bash
   npm run build
   npm start
   ```

## Cloud Deployment

### AWS EC2

1. **Launch EC2 Instance**
   - AMI: Amazon Linux 2 or Ubuntu 20.04+
   - Instance Type: t3.medium (2 vCPU, 4GB RAM)
   - Security Group: Allow HTTP (80), HTTPS (443), SSH (22)

2. **Setup Commands**
   ```bash
   # Install Docker
   sudo yum update -y
   sudo yum install -y docker
   sudo service docker start
   sudo usermod -a -G docker ec2-user

   # Install Node.js
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 18

   # Deploy CodeRunner
   git clone <your-repo>
   cd coderunner
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

3. **Configure Reverse Proxy (Optional)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

### Google Cloud Platform

1. **Create Compute Engine Instance**
   ```bash
   gcloud compute instances create coderunner-vm \
     --image-family=ubuntu-2004-lts \
     --image-project=ubuntu-os-cloud \
     --machine-type=e2-medium \
     --tags=http-server,https-server
   ```

2. **Deploy Application**
   ```bash
   # SSH to instance
   gcloud compute ssh coderunner-vm

   # Install dependencies and deploy
   sudo apt update
   sudo apt install -y docker.io nodejs npm
   sudo usermod -aG docker $USER

   # Deploy CodeRunner (same as EC2 steps above)
   ```

### DigitalOcean

1. **Create Droplet**
   - Ubuntu 20.04+ 
   - 2GB+ RAM
   - Enable Docker pre-installation

2. **Deploy**
   ```bash
   # SSH to droplet
   ssh root@your-droplet-ip

   # Install Node.js and deploy (same steps as above)
   ```

## Container Orchestration

### Docker Swarm

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  coderunner:
    image: coderunner-platform:latest
    ports:
      - "3000:5000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
    networks:
      - coderunner-network

networks:
  coderunner-network:
    driver: overlay
```

### Kubernetes

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coderunner
spec:
  replicas: 3
  selector:
    matchLabels:
      app: coderunner
  template:
    metadata:
      labels:
        app: coderunner
    spec:
      containers:
      - name: coderunner
        image: coderunner-platform:latest
        ports:
        - containerPort: 5000
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        volumeMounts:
        - name: docker-sock
          mountPath: /var/run/docker.sock
      volumes:
      - name: docker-sock
        hostPath:
          path: /var/run/docker.sock
---
apiVersion: v1
kind: Service
metadata:
  name: coderunner-service
spec:
  selector:
    app: coderunner
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5000
  type: LoadBalancer
```

## Security Considerations

### Production Security

1. **Network Security**
   - Use HTTPS in production
   - Configure firewall rules
   - Limit Docker socket access

2. **Container Security**
   - Run containers with limited privileges
   - Use security contexts
   - Enable AppArmor/SELinux

3. **Rate Limiting**
   - Configure appropriate rate limits
   - Use Redis for distributed rate limiting
   - Monitor abuse patterns

4. **Monitoring**
   ```yaml
   # docker-compose.monitoring.yml
   services:
     prometheus:
       image: prom/prometheus
       ports:
         - "9090:9090"
       volumes:
         - ./prometheus.yml:/etc/prometheus/prometheus.yml

     grafana:
       image: grafana/grafana
       ports:
         - "3001:3000"
       environment:
         - GF_SECURITY_ADMIN_PASSWORD=admin
   ```

## Performance Optimization

### Scaling

1. **Horizontal Scaling**
   - Use load balancer (nginx/HAProxy)
   - Scale container replicas
   - Distribute across multiple nodes

2. **Vertical Scaling**
   - Increase container resources
   - Optimize Docker image size
   - Use multi-stage builds

### Monitoring

```bash
# Container resource usage
docker stats coderunner-app

# Application logs
docker logs -f coderunner-app

# Health checks
curl http://localhost:3000/api/health
```

## Troubleshooting

### Common Issues

1. **Docker Permission Denied**
   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   ```

2. **Port Already in Use**
   ```bash
   # Find process using port
   lsof -i :3000
   
   # Kill process
   kill -9 <PID>
   ```

3. **Out of Memory**
   - Increase server memory
   - Reduce execution memory limits
   - Implement better cleanup

4. **Container Startup Failure**
   ```bash
   # Check logs
   docker logs coderunner-app
   
   # Check container status
   docker ps -a
   
   # Inspect container
   docker inspect coderunner-app
   ```

### Performance Monitoring

```bash
# System resources
htop

# Docker stats
docker stats --no-stream

# Network connections
netstat -tlnp
```

## Backup and Recovery

### Data Backup
```bash
# Backup logs
tar -czf coderunner-logs-$(date +%Y%m%d).tar.gz logs/

# Backup configuration
cp .env .env.backup
```

### Disaster Recovery
1. Keep infrastructure as code
2. Automated deployment scripts
3. Regular testing of deployment process
4. Monitor system health continuously