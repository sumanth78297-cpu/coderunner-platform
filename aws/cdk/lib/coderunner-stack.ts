import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class CoderunnerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'CoderunnerVPC', {
      maxAzs: 2,
      natGateways: 0, // Use public subnets only for cost optimization
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'CoderunnerCluster', {
      vpc,
      clusterName: 'coderunner-cluster',
    });

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'CoderunnerLogGroup', {
      logGroupName: '/ecs/coderunner',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Fargate Service with Application Load Balancer
    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      'CoderunnerService',
      {
        cluster,
        memoryLimitMiB: 1024,
        cpu: 512,
        desiredCount: 1,
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry('your-account.dkr.ecr.region.amazonaws.com/coderunner:latest'),
          containerPort: 5000,
          environment: {
            NODE_ENV: 'production',
            PORT: '5000',
          },
          logDriver: ecs.LogDrivers.awsLogs({
            streamPrefix: 'coderunner',
            logGroup,
          }),
        },
        publicLoadBalancer: true,
        listenerPort: 80,
        healthCheckGracePeriod: cdk.Duration.seconds(60),
        serviceName: 'coderunner-service',
      }
    );

    // Configure health check
    fargateService.targetGroup.configureHealthCheck({
      path: '/api/health',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    // Auto Scaling
    const scaling = fargateService.service.autoScaleTaskCount({
      maxCapacity: 10,
      minCapacity: 1,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(300),
    });

    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(300),
    });

    // Output the Load Balancer URL
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: fargateService.loadBalancer.loadBalancerDnsName,
      description: 'Load Balancer DNS Name',
    });

    new cdk.CfnOutput(this, 'CoderunnerURL', {
      value: `http://${fargateService.loadBalancer.loadBalancerDnsName}`,
      description: 'CodeRunner Application URL',
    });
  }
}