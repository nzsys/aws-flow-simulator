import type { PresetArchitecture } from './types'
import { makeNode, makeEdge } from './helpers'

// Enterprise E-Commerce Platform: 18 service types (20 nodes), 15 edges
// Left-to-right flow: Entry → Edge → VPC(Compute→Data) → Messaging
export const enterpriseEcommerce: PresetArchitecture = {
  id: 'preset-enterprise-ecommerce',
  name: 'Enterprise E-Commerce',
  description:
    'WAF + CloudFront + ALB → ECS → RDS/ElastiCache/DynamoDB + API GW → Lambda + SNS/SQS/Kinesis の包括的なエンタープライズEC構成（18サービス）',
  scale: 'XL',
  scaleDescription: '~1M users / 大規模EC',
  nodes: [
    // Col 1: Entry Points (x=0)
    makeNode('eec-waf', 'waf', 0, 50),
    makeNode('eec-route53', 'route53', 0, 200),
    makeNode('eec-apigw', 'api-gateway', 0, 470),

    // Col 2: Edge / CDN (x=300)
    makeNode('eec-cloudfront', 'cloudfront', 300, 130, {
      configOverrides: {
        name: 'CloudFront',
        cache: { enabled: true, ttl: 86400, hitRate: 0.92 },
        latency: { base: 20 },
        cost: { perRequest: 0.00000075, perGB: 0.085 },
        security: { ddosProtection: true },
        specific: {
          edgeLocations: 200,
          behaviors: 3,
          originShield: true,
          compressionEnabled: true,
        },
      },
    }),
    makeNode('eec-s3', 's3', 300, 350),
    makeNode('eec-lambda', 'lambda', 300, 470, {
      configOverrides: {
        name: 'Lambda (Async)',
        latency: { base: 100 },
        cost: { perRequest: 0.0000002 },
        specific: {
          memoryMB: 512,
          timeoutSeconds: 60,
          concurrency: 200,
          runtime: 'nodejs20.x',
        },
      },
    }),

    // Col 3-4: VPC
    makeNode('eec-vpc', 'vpc', 570, 0, {
      style: { width: 880, height: 580 },
      configOverrides: {
        name: 'VPC',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.0.0/16', enableDnsHostnames: true, enableDnsSupport: true },
      },
    }),
    makeNode('eec-nat', 'nat-gateway', 30, 500, { parentId: 'eec-vpc' }),

    // Public Subnet — ALB
    makeNode('eec-pub-subnet', 'subnet', 30, 60, {
      parentId: 'eec-vpc',
      subnetType: 'public',
      style: { width: 240, height: 160 },
      configOverrides: {
        name: 'Public Subnet',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.1.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'public' },
      },
    }),
    makeNode('eec-alb', 'alb', 35, 40, { parentId: 'eec-pub-subnet' }),

    // Private Subnet (Compute) — ECS + EC2
    makeNode('eec-priv-compute', 'subnet', 310, 60, {
      parentId: 'eec-vpc',
      subnetType: 'private',
      style: { width: 250, height: 340 },
      configOverrides: {
        name: 'Private Subnet (Compute)',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.2.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'private' },
      },
    }),
    makeNode('eec-ecs', 'ecs', 35, 45, {
      parentId: 'eec-priv-compute',
      configOverrides: {
        name: 'ECS',
        latency: { base: 50, perRequest: 0.5 },
        cost: { monthly: 0 },
        specific: {
          launchType: 'fargate' as const,
          taskCount: 6,
          cpu: 1,
          memory: 2,
          autoScaling: { enabled: true, min: 4, max: 24, targetCPU: 60 },
        },
      },
    }),
    makeNode('eec-ec2', 'ec2', 35, 165, {
      parentId: 'eec-priv-compute',
      configOverrides: {
        name: 'EC2 (Batch)',
        latency: { base: 30, perRequest: 0.3 },
        cost: { monthly: 30 },
        specific: {
          instanceType: 'c5.xlarge',
          instanceCount: 2,
          autoScaling: false,
        },
      },
    }),

    // Private Subnet (Data) — RDS + ElastiCache + DynamoDB
    makeNode('eec-priv-data', 'subnet', 600, 60, {
      parentId: 'eec-vpc',
      subnetType: 'private',
      style: { width: 250, height: 440 },
      configOverrides: {
        name: 'Private Subnet (Data)',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.3.0/24', availabilityZone: 'ap-northeast-1c', subnetType: 'private' },
      },
    }),
    makeNode('eec-rds', 'rds', 40, 45, {
      parentId: 'eec-priv-data',
      configOverrides: {
        name: 'RDS',
        latency: { base: 3, perRequest: 0.1 },
        cost: { monthly: 80 },
        security: { encryption: true },
        specific: {
          instanceClass: 'db.r5.large',
          multiAZ: true,
          readReplicas: 1,
          storageGB: 200,
        },
      },
    }),
    makeNode('eec-cache', 'elasticache', 40, 200, {
      parentId: 'eec-priv-data',
      configOverrides: {
        name: 'ElastiCache',
        cache: { enabled: true, ttl: 600, hitRate: 0.95 },
        latency: { base: 1 },
        cost: { monthly: 50 },
        specific: {
          engine: 'redis' as const,
          nodeType: 'cache.r5.large',
          numNodes: 3,
          clusterMode: true,
        },
      },
    }),
    makeNode('eec-dynamodb', 'dynamodb', 40, 360, {
      parentId: 'eec-priv-data',
      configOverrides: {
        name: 'DynamoDB',
        latency: { base: 5, perRequest: 0.05 },
        cost: { perRequest: 0.00000125, monthly: 0 },
        specific: {
          capacityMode: 'on-demand' as const,
          readCapacityUnits: 0,
          writeCapacityUnits: 0,
          globalTables: false,
        },
      },
    }),

    // Col 5: Async Messaging (x=1530)
    makeNode('eec-sqs', 'sqs', 1530, 80, {
      configOverrides: {
        name: 'SQS',
        latency: { base: 5 },
        cost: { perRequest: 0.0000004 },
        specific: {
          queueType: 'standard' as const,
          visibilityTimeout: 60,
          messageRetention: 345600,
          dlqEnabled: true,
        },
      },
    }),
    makeNode('eec-sns', 'sns', 1530, 260),
    makeNode('eec-kinesis', 'kinesis', 1530, 440),
  ],
  edges: [
    makeEdge('eec-e1', 'eec-waf', 'eec-cloudfront', 'waf', 'cloudfront'),
    makeEdge('eec-e2', 'eec-route53', 'eec-cloudfront', 'route53', 'cloudfront'),
    makeEdge('eec-e3', 'eec-cloudfront', 'eec-alb', 'cloudfront', 'alb'),
    makeEdge('eec-e4', 'eec-cloudfront', 'eec-s3', 'cloudfront', 's3'),
    makeEdge('eec-e5', 'eec-route53', 'eec-apigw', 'route53', 'api-gateway'),
    makeEdge('eec-e6', 'eec-apigw', 'eec-lambda', 'api-gateway', 'lambda'),
    makeEdge('eec-e7', 'eec-alb', 'eec-ecs', 'alb', 'ecs'),
    makeEdge('eec-e8', 'eec-ecs', 'eec-rds', 'ecs', 'rds'),
    makeEdge('eec-e9', 'eec-ecs', 'eec-cache', 'ecs', 'elasticache'),
    makeEdge('eec-e10', 'eec-ecs', 'eec-dynamodb', 'ecs', 'dynamodb'),
    makeEdge('eec-e11', 'eec-ecs', 'eec-sqs', 'ecs', 'sqs'),
    makeEdge('eec-e12', 'eec-sqs', 'eec-ecs', 'sqs', 'ecs'),
    makeEdge('eec-e13', 'eec-sns', 'eec-sqs', 'sns', 'sqs'),
    makeEdge('eec-e14', 'eec-sns', 'eec-kinesis', 'sns', 'kinesis'),
    makeEdge('eec-e15', 'eec-ec2', 'eec-s3', 'ec2', 's3'),
  ],
}
