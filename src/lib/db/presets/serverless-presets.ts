import type { PresetArchitecture } from './types'
import { makeNode, makeEdge } from './helpers'

// Serverless Full-Stack SPA: Route53 → CloudFront → S3 + API GW → Lambda(VPC) → RDS/ElastiCache/DynamoDB
export const serverlessFullStack: PresetArchitecture = {
  id: 'preset-serverless-fullstack',
  name: 'Serverless Full-Stack SPA',
  description:
    'Route53 → CloudFront → S3(静的SPA) + API Gateway → Lambda(VPC内) → RDS + ElastiCache + DynamoDB のモダンサーバーレス構成',
  scale: 'L',
  scaleDescription: '~100K users / モダンサーバーレス',
  nodes: [
    makeNode('sfs-route53', 'route53', 0, 200),
    makeNode('sfs-s3', 's3', 540, 60, {
      configOverrides: {
        name: 'S3',
        latency: { base: 15 },
        cost: { perRequest: 0.0000004, perGB: 0.023 },
        security: { encryption: true },
        specific: { storageClass: 'standard', versioningEnabled: true },
      },
    }),
    makeNode('sfs-cloudfront', 'cloudfront', 280, 200),
    makeNode('sfs-dynamodb', 'dynamodb', 1320, 130, {
      configOverrides: {
        name: 'DynamoDB',
        latency: { base: 5, perRequest: 0.05 },
        cost: { perRequest: 0.00000125, monthly: 0 },
        security: { encryption: true },
        specific: {
          capacityMode: 'on-demand' as const,
          readCapacityUnits: 0,
          writeCapacityUnits: 0,
          globalTables: false,
          storageGB: 50,
        },
      },
    }),
    makeNode('sfs-apigw', 'api-gateway', 540, 200),
    makeNode('sfs-vpc', 'vpc', 780, 40, { style: { width: 480, height: 440 } }),
    makeNode('sfs-priv-subnet', 'subnet', 30, 50, {
      parentId: 'sfs-vpc',
      subnetType: 'private',
      style: { width: 400, height: 250 },
      configOverrides: {
        name: 'Private Subnet',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.1.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'private' },
      },
    }),
    makeNode('sfs-lambda', 'lambda', 25, 40, {
      parentId: 'sfs-priv-subnet',
      configOverrides: {
        name: 'Lambda',
        latency: { base: 100 },
        cost: { perRequest: 0.0000002 },
        specific: {
          memoryMB: 512,
          timeoutSeconds: 30,
          concurrency: 200,
          runtime: 'nodejs20.x',
          avgDurationMs: 200,
        },
      },
    }),
    makeNode('sfs-rds', 'rds', 210, 40, {
      parentId: 'sfs-priv-subnet',
      configOverrides: {
        name: 'RDS',
        latency: { base: 3, perRequest: 0.1 },
        cost: { monthly: 25 },
        security: { encryption: true },
        specific: {
          instanceClass: 'db.t3.small',
          multiAZ: false,
          readReplicas: 0,
          storageGB: 50,
        },
      },
    }),
    makeNode('sfs-cache', 'elasticache', 210, 140, {
      parentId: 'sfs-priv-subnet',
      configOverrides: {
        name: 'ElastiCache',
        cache: { enabled: true, ttl: 300, hitRate: 0.85 },
        latency: { base: 1 },
        cost: { monthly: 12.5 },
        specific: {
          engine: 'redis' as const,
          nodeType: 'cache.t3.micro',
          numNodes: 1,
          clusterMode: false,
        },
      },
    }),
    makeNode('sfs-nat', 'nat-gateway', 30, 340, { parentId: 'sfs-vpc' }),
  ],
  edges: [
    makeEdge('sfs-e1', 'sfs-route53', 'sfs-cloudfront', 'route53', 'cloudfront'),
    makeEdge('sfs-e2', 'sfs-cloudfront', 'sfs-s3', 'cloudfront', 's3'),
    makeEdge('sfs-e3', 'sfs-cloudfront', 'sfs-apigw', 'cloudfront', 'api-gateway'),
    makeEdge('sfs-e4', 'sfs-apigw', 'sfs-lambda', 'api-gateway', 'lambda'),
    makeEdge('sfs-e5', 'sfs-lambda', 'sfs-rds', 'lambda', 'rds'),
    makeEdge('sfs-e6', 'sfs-lambda', 'sfs-cache', 'lambda', 'elasticache'),
    makeEdge('sfs-e7', 'sfs-lambda', 'sfs-dynamodb', 'lambda', 'dynamodb'),
  ],
}

// Queue Worker: Route53 → APIGW → Lambda(Producer) → SQS → VPC[ECS(Worker) → RDS]
export const queueWorker: PresetArchitecture = {
  id: 'preset-queue-worker',
  name: 'Queue Worker',
  description:
    'Route53 → API Gateway → Lambda → SQS → VPC内ECS(Worker) → RDS の非同期ジョブキュー構成',
  scale: 'M',
  scaleDescription: '~10K jobs/day / 非同期処理',
  nodes: [
    makeNode('qw-route53', 'route53', 0, 200),
    makeNode('qw-apigw', 'api-gateway', 250, 200),
    makeNode('qw-lambda', 'lambda', 500, 200, {
      configOverrides: {
        name: 'Lambda (Producer)',
        latency: { base: 50 },
        cost: { perRequest: 0.0000002 },
        specific: {
          memoryMB: 256,
          timeoutSeconds: 10,
          concurrency: 100,
          runtime: 'nodejs20.x',
          avgDurationMs: 200,
        },
      },
    }),
    makeNode('qw-sqs', 'sqs', 750, 200, {
      configOverrides: {
        name: 'SQS',
        latency: { base: 5 },
        cost: { perRequest: 0.0000004 },
        specific: {
          queueType: 'standard' as const,
          visibilityTimeout: 300,
          messageRetention: 345600,
          dlqEnabled: true,
        },
      },
    }),
    makeNode('qw-vpc', 'vpc', 1000, 60, { style: { width: 380, height: 380 } }),
    makeNode('qw-priv-subnet', 'subnet', 30, 60, {
      parentId: 'qw-vpc',
      subnetType: 'private',
      style: { width: 300, height: 260 },
      configOverrides: {
        name: 'Private Subnet',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.1.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'private' },
      },
    }),
    makeNode('qw-ecs', 'ecs', 30, 40, {
      parentId: 'qw-priv-subnet',
      configOverrides: {
        name: 'ECS (Worker)',
        latency: { base: 100, perRequest: 1 },
        cost: { monthly: 0 },
        specific: {
          launchType: 'fargate' as const,
          taskCount: 2,
          cpu: 0.5,
          memory: 1,
          autoScaling: { enabled: true, min: 1, max: 10, targetCPU: 70 },
        },
      },
    }),
    makeNode('qw-rds', 'rds', 30, 150, {
      parentId: 'qw-priv-subnet',
      configOverrides: {
        name: 'RDS',
        latency: { base: 3, perRequest: 0.1 },
        cost: { monthly: 25 },
        specific: {
          instanceClass: 'db.t3.small',
          multiAZ: false,
          readReplicas: 0,
          storageGB: 50,
        },
      },
    }),
  ],
  edges: [
    makeEdge('qw-e1', 'qw-route53', 'qw-apigw', 'route53', 'api-gateway'),
    makeEdge('qw-e2', 'qw-apigw', 'qw-lambda', 'api-gateway', 'lambda'),
    makeEdge('qw-e3', 'qw-lambda', 'qw-sqs', 'lambda', 'sqs'),
    makeEdge('qw-e4', 'qw-sqs', 'qw-ecs', 'sqs', 'ecs'),
    makeEdge('qw-e5', 'qw-ecs', 'qw-rds', 'ecs', 'rds'),
  ],
}

// CQRS Read/Write Split:
// Write: Route53 → APIGW → Lambda(Write) → DynamoDB + Kinesis
// Sync: Kinesis → Lambda(Sync) → ElastiCache
// Read: APIGW → Lambda(Read) → ElastiCache
export const cqrsReadWrite: PresetArchitecture = {
  id: 'preset-cqrs-read-write',
  name: 'CQRS Read/Write Split',
  description:
    'API Gateway → Lambda(Write) → DynamoDB + Kinesis → Lambda(Sync) → ElastiCache ← Lambda(Read) の読み書き分離パターン',
  scale: 'L',
  scaleDescription: '~100K reads/sec / 読み取りヘビー',
  nodes: [
    makeNode('cqrs-route53', 'route53', 0, 200),
    makeNode('cqrs-apigw', 'api-gateway', 250, 200),
    // Write path
    makeNode('cqrs-lambda-write', 'lambda', 500, 100, {
      configOverrides: {
        name: 'Lambda (Write)',
        latency: { base: 80 },
        cost: { perRequest: 0.0000002 },
        specific: {
          memoryMB: 256,
          timeoutSeconds: 15,
          concurrency: 200,
          runtime: 'nodejs20.x',
          avgDurationMs: 200,
        },
      },
    }),
    makeNode('cqrs-dynamodb', 'dynamodb', 750, 50, {
      configOverrides: {
        name: 'DynamoDB (Write Store)',
        latency: { base: 5, perRequest: 0.05 },
        cost: { perRequest: 0.00000125, monthly: 0 },
        specific: {
          capacityMode: 'on-demand' as const,
          readCapacityUnits: 0,
          writeCapacityUnits: 0,
          globalTables: false,
          storageGB: 50,
        },
      },
    }),
    makeNode('cqrs-kinesis', 'kinesis', 750, 200, {
      configOverrides: {
        name: 'Kinesis (Change Stream)',
        latency: { base: 70 },
        cost: { monthly: 15 },
        specific: {
          streamMode: 'provisioned' as const,
          shardCount: 2,
          retentionHours: 24,
        },
      },
    }),
    // Sync path
    makeNode('cqrs-lambda-sync', 'lambda', 1000, 200, {
      configOverrides: {
        name: 'Lambda (Sync)',
        latency: { base: 50 },
        cost: { perRequest: 0.0000002 },
        specific: {
          memoryMB: 256,
          timeoutSeconds: 30,
          concurrency: 100,
          runtime: 'nodejs20.x',
          avgDurationMs: 200,
        },
      },
    }),
    makeNode('cqrs-cache', 'elasticache', 1250, 200, {
      configOverrides: {
        name: 'ElastiCache (Read Store)',
        cache: { enabled: true, ttl: 0, hitRate: 0.99 },
        latency: { base: 0.5 },
        cost: { monthly: 50 },
        specific: {
          engine: 'redis' as const,
          nodeType: 'cache.r5.large',
          numNodes: 3,
          clusterMode: true,
        },
      },
    }),
    // Read path
    makeNode('cqrs-lambda-read', 'lambda', 500, 350, {
      configOverrides: {
        name: 'Lambda (Read)',
        latency: { base: 20 },
        cost: { perRequest: 0.0000002 },
        specific: {
          memoryMB: 128,
          timeoutSeconds: 5,
          concurrency: 500,
          runtime: 'nodejs20.x',
          avgDurationMs: 200,
        },
      },
    }),
  ],
  edges: [
    makeEdge('cqrs-e1', 'cqrs-route53', 'cqrs-apigw', 'route53', 'api-gateway'),
    // Write path
    makeEdge('cqrs-e2', 'cqrs-apigw', 'cqrs-lambda-write', 'api-gateway', 'lambda'),
    makeEdge('cqrs-e3', 'cqrs-lambda-write', 'cqrs-dynamodb', 'lambda', 'dynamodb'),
    makeEdge('cqrs-e4', 'cqrs-lambda-write', 'cqrs-kinesis', 'lambda', 'kinesis'),
    // Sync path
    makeEdge('cqrs-e5', 'cqrs-kinesis', 'cqrs-lambda-sync', 'kinesis', 'lambda'),
    makeEdge('cqrs-e6', 'cqrs-lambda-sync', 'cqrs-cache', 'lambda', 'elasticache'),
    // Read path
    makeEdge('cqrs-e7', 'cqrs-apigw', 'cqrs-lambda-read', 'api-gateway', 'lambda'),
    makeEdge('cqrs-e8', 'cqrs-lambda-read', 'cqrs-cache', 'lambda', 'elasticache'),
  ],
}
