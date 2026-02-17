import type { PresetArchitecture } from './types'
import { makeNode, makeEdge } from './helpers'

// Event-Driven: Route53 → API GW → Lambda → SNS → {SQS → Lambda → DynamoDB, Kinesis → Lambda → S3}
export const eventDriven: PresetArchitecture = {
  id: 'preset-event-driven',
  name: 'Event-Driven Architecture',
  description:
    'Route53 → API Gateway → Lambda → SNS → SQS/Kinesis → Lambda → DynamoDB/S3 のイベント駆動型構成',
  scale: 'XL',
  scaleDescription: '~500K events/day / 複雑なイベント処理',
  nodes: [
    makeNode('ed-route53', 'route53', 0, 300),
    makeNode('ed-apigw', 'api-gateway', 250, 300),
    makeNode('ed-lambda1', 'lambda', 500, 300, {
      configOverrides: {
        name: 'Lambda (Producer)',
        latency: { base: 100 },
        cost: { perRequest: 0.0000002 },
        specific: {
          memoryMB: 256,
          timeoutSeconds: 30,
          concurrency: 100,
          runtime: 'nodejs20.x',
        },
      },
    }),
    makeNode('ed-sns', 'sns', 750, 300),
    makeNode('ed-sqs', 'sqs', 1000, 150),
    makeNode('ed-lambda2', 'lambda', 1250, 150, {
      configOverrides: {
        name: 'Lambda (SQS Consumer)',
        latency: { base: 100 },
        cost: { perRequest: 0.0000002 },
        specific: {
          memoryMB: 256,
          timeoutSeconds: 30,
          concurrency: 100,
          runtime: 'nodejs20.x',
        },
      },
    }),
    makeNode('ed-dynamodb', 'dynamodb', 1500, 150),
    makeNode('ed-kinesis', 'kinesis', 1000, 450),
    makeNode('ed-lambda3', 'lambda', 1250, 450, {
      configOverrides: {
        name: 'Lambda (Stream Consumer)',
        latency: { base: 100 },
        cost: { perRequest: 0.0000002 },
        specific: {
          memoryMB: 512,
          timeoutSeconds: 60,
          concurrency: 50,
          runtime: 'nodejs20.x',
        },
      },
    }),
    makeNode('ed-s3', 's3', 1500, 450),
  ],
  edges: [
    makeEdge('ed-e1', 'ed-route53', 'ed-apigw', 'route53', 'api-gateway'),
    makeEdge('ed-e2', 'ed-apigw', 'ed-lambda1', 'api-gateway', 'lambda'),
    makeEdge('ed-e3', 'ed-lambda1', 'ed-sns', 'lambda', 'sns'),
    makeEdge('ed-e4', 'ed-sns', 'ed-sqs', 'sns', 'sqs'),
    makeEdge('ed-e5', 'ed-sqs', 'ed-lambda2', 'sqs', 'lambda'),
    makeEdge('ed-e6', 'ed-lambda2', 'ed-dynamodb', 'lambda', 'dynamodb'),
    makeEdge('ed-e7', 'ed-sns', 'ed-kinesis', 'sns', 'kinesis'),
    makeEdge('ed-e8', 'ed-kinesis', 'ed-lambda3', 'kinesis', 'lambda'),
    makeEdge('ed-e9', 'ed-lambda3', 'ed-s3', 'lambda', 's3'),
  ],
}

// Real-time Data Pipeline: Route53 → APIGW → Lambda(Ingest) → Kinesis → Lambda(Process) → DynamoDB + S3
export const realtimePipeline: PresetArchitecture = {
  id: 'preset-realtime-pipeline',
  name: 'Real-time Data Pipeline',
  description:
    'Route53 → API Gateway → Lambda(Ingest) → Kinesis → Lambda(Process) → DynamoDB + S3 のストリーミングデータ処理構成',
  scale: 'M',
  scaleDescription: '~10K events/sec / IoT、ログ分析',
  nodes: [
    makeNode('rtp-route53', 'route53', 0, 200),
    makeNode('rtp-apigw', 'api-gateway', 250, 200),
    makeNode('rtp-lambda-ingest', 'lambda', 500, 200, {
      configOverrides: {
        name: 'Lambda (Ingest)',
        latency: { base: 30 },
        cost: { perRequest: 0.0000002 },
        specific: {
          memoryMB: 128,
          timeoutSeconds: 10,
          concurrency: 500,
          runtime: 'nodejs20.x',
        },
      },
    }),
    makeNode('rtp-kinesis', 'kinesis', 750, 200, {
      configOverrides: {
        name: 'Kinesis',
        latency: { base: 70 },
        cost: { monthly: 30 },
        specific: {
          streamMode: 'provisioned' as const,
          shardCount: 4,
          retentionHours: 48,
        },
      },
    }),
    makeNode('rtp-lambda-process', 'lambda', 1000, 200, {
      configOverrides: {
        name: 'Lambda (Process)',
        latency: { base: 200 },
        cost: { perRequest: 0.0000002 },
        specific: {
          memoryMB: 512,
          timeoutSeconds: 60,
          concurrency: 200,
          runtime: 'nodejs20.x',
        },
      },
    }),
    makeNode('rtp-dynamodb', 'dynamodb', 1250, 100),
    makeNode('rtp-s3', 's3', 1250, 300, {
      configOverrides: {
        name: 'S3 (Data Lake)',
        latency: { base: 15 },
        cost: { perRequest: 0.0000004, perGB: 0.023 },
        specific: { storageClass: 'standard', versioningEnabled: false },
      },
    }),
  ],
  edges: [
    makeEdge('rtp-e1', 'rtp-route53', 'rtp-apigw', 'route53', 'api-gateway'),
    makeEdge('rtp-e2', 'rtp-apigw', 'rtp-lambda-ingest', 'api-gateway', 'lambda'),
    makeEdge('rtp-e3', 'rtp-lambda-ingest', 'rtp-kinesis', 'lambda', 'kinesis'),
    makeEdge('rtp-e4', 'rtp-kinesis', 'rtp-lambda-process', 'kinesis', 'lambda'),
    makeEdge('rtp-e5', 'rtp-lambda-process', 'rtp-dynamodb', 'lambda', 'dynamodb'),
    makeEdge('rtp-e6', 'rtp-lambda-process', 'rtp-s3', 'lambda', 's3'),
  ],
}

// Fan-out Notification: Route53 → APIGW → Lambda(Producer) → SNS → SQS(x2) → Lambda(x2) → DynamoDB/S3
export const fanoutNotification: PresetArchitecture = {
  id: 'preset-fanout-notification',
  name: 'Fan-out Notification',
  description:
    'Route53 → API Gateway → Lambda → SNS → SQS(Email/Push) → Lambda(Email/Push) → DynamoDB/S3 のマルチチャネル通知構成',
  scale: 'L',
  scaleDescription: '~50K messages/min / マルチチャネル通知',
  nodes: [
    makeNode('fan-route53', 'route53', 0, 250),
    makeNode('fan-apigw', 'api-gateway', 250, 250),
    makeNode('fan-lambda-producer', 'lambda', 500, 250, {
      configOverrides: {
        name: 'Lambda (Producer)',
        latency: { base: 50 },
        cost: { perRequest: 0.0000002 },
        specific: {
          memoryMB: 256,
          timeoutSeconds: 15,
          concurrency: 200,
          runtime: 'nodejs20.x',
        },
      },
    }),
    makeNode('fan-sns', 'sns', 750, 250),
    // Email channel
    makeNode('fan-sqs-email', 'sqs', 1000, 100, {
      configOverrides: {
        name: 'SQS (Email)',
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
    makeNode('fan-lambda-email', 'lambda', 1250, 100, {
      configOverrides: {
        name: 'Lambda (Email)',
        latency: { base: 200 },
        cost: { perRequest: 0.0000002 },
        specific: {
          memoryMB: 256,
          timeoutSeconds: 30,
          concurrency: 100,
          runtime: 'nodejs20.x',
        },
      },
    }),
    makeNode('fan-dynamodb', 'dynamodb', 1500, 100, {
      configOverrides: {
        name: 'DynamoDB (Logs)',
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
    // Push channel
    makeNode('fan-sqs-push', 'sqs', 1000, 400, {
      configOverrides: {
        name: 'SQS (Push)',
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
    makeNode('fan-lambda-push', 'lambda', 1250, 400, {
      configOverrides: {
        name: 'Lambda (Push)',
        latency: { base: 150 },
        cost: { perRequest: 0.0000002 },
        specific: {
          memoryMB: 256,
          timeoutSeconds: 30,
          concurrency: 100,
          runtime: 'nodejs20.x',
        },
      },
    }),
  ],
  edges: [
    makeEdge('fan-e1', 'fan-route53', 'fan-apigw', 'route53', 'api-gateway'),
    makeEdge('fan-e2', 'fan-apigw', 'fan-lambda-producer', 'api-gateway', 'lambda'),
    makeEdge('fan-e3', 'fan-lambda-producer', 'fan-sns', 'lambda', 'sns'),
    makeEdge('fan-e4', 'fan-sns', 'fan-sqs-email', 'sns', 'sqs'),
    makeEdge('fan-e5', 'fan-sqs-email', 'fan-lambda-email', 'sqs', 'lambda'),
    makeEdge('fan-e6', 'fan-lambda-email', 'fan-dynamodb', 'lambda', 'dynamodb'),
    makeEdge('fan-e7', 'fan-sns', 'fan-sqs-push', 'sns', 'sqs'),
    makeEdge('fan-e8', 'fan-sqs-push', 'fan-lambda-push', 'sqs', 'lambda'),
  ],
}
