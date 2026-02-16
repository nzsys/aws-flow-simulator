import type { AWSServiceType, ServiceConfig } from '@/types'
import { SERVICE_DEFINITIONS } from '@/lib/constants/services'
import { getConnectionProtocol, type ConnectionProtocol } from '@/lib/validation/rules'

type PresetNode = {
  readonly id: string
  readonly type: string
  readonly position: { readonly x: number; readonly y: number }
  readonly data: {
    readonly serviceType: AWSServiceType
    readonly config: ServiceConfig
    readonly label: string
    readonly subnetType?: 'public' | 'private'
  }
  readonly parentId?: string
  readonly extent?: 'parent'
  readonly style?: { readonly width?: number; readonly height?: number }
}

type PresetEdge = {
  readonly id: string
  readonly source: string
  readonly target: string
  readonly type: 'flow'
  readonly animated: true
  readonly data: { readonly protocol: ConnectionProtocol }
}

type PresetArchitecture = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly nodes: readonly PresetNode[]
  readonly edges: readonly PresetEdge[]
}

type MakeNodeOptions = {
  readonly parentId?: string
  readonly subnetType?: 'public' | 'private'
  readonly configOverrides?: Partial<ServiceConfig>
  readonly style?: { readonly width?: number; readonly height?: number }
}

function makeNode(
  id: string,
  serviceType: AWSServiceType,
  x: number,
  y: number,
  options?: MakeNodeOptions,
): PresetNode {
  const def = SERVICE_DEFINITIONS[serviceType]
  const nodeType =
    serviceType === 'vpc' ? 'vpcGroup' : serviceType === 'subnet' ? 'subnetGroup' : 'awsService'

  const config = options?.configOverrides
    ? { ...def.defaultConfig, ...options.configOverrides }
    : def.defaultConfig

  const data: PresetNode['data'] = {
    serviceType,
    config,
    label: def.label,
    ...(options?.subnetType ? { subnetType: options.subnetType } : {}),
  }

  return {
    id,
    type: nodeType,
    position: { x, y },
    data,
    ...(options?.parentId ? { parentId: options.parentId, extent: 'parent' as const } : {}),
    ...(options?.style ? { style: options.style } : {}),
  }
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  sourceType: AWSServiceType,
  targetType: AWSServiceType,
): PresetEdge {
  return {
    id,
    source,
    target,
    type: 'flow',
    animated: true,
    data: { protocol: getConnectionProtocol(sourceType, targetType) },
  }
}

// Basic Web App: Route53 → CloudFront → [VPC: PubSubnet(ALB), PrivSubnet(ECS → RDS)]
const basicWebApp: PresetArchitecture = {
  id: 'preset-basic-web-app',
  name: 'Basic Web App',
  description: 'Route53 → CloudFront → VPC内ALB → ECS → RDS の基本的な Web アプリケーション構成',
  nodes: [
    makeNode('bwa-route53', 'route53', 0, 200),
    makeNode('bwa-cloudfront', 'cloudfront', 250, 200),
    makeNode('bwa-vpc', 'vpc', 500, 100, { style: { width: 640, height: 400 } }),
    makeNode('bwa-pub-subnet', 'subnet', 30, 110, {
      parentId: 'bwa-vpc',
      subnetType: 'public',
      style: { width: 260, height: 160 },
      configOverrides: {
        name: 'Public Subnet',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.1.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'public' },
      },
    }),
    makeNode('bwa-alb', 'alb', 30, 40, { parentId: 'bwa-pub-subnet' }),
    makeNode('bwa-priv-subnet', 'subnet', 330, 110, {
      parentId: 'bwa-vpc',
      subnetType: 'private',
      style: { width: 260, height: 260 },
      configOverrides: {
        name: 'Private Subnet',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.2.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'private' },
      },
    }),
    makeNode('bwa-ecs', 'ecs', 30, 40, {
      parentId: 'bwa-priv-subnet',
      configOverrides: {
        name: 'ECS',
        latency: { base: 50, perRequest: 0.5 },
        cost: { monthly: 0 },
        specific: {
          launchType: 'fargate' as const,
          taskCount: 2,
          cpu: 0.25,
          memory: 0.5,
          autoScaling: { enabled: true, min: 2, max: 10, targetCPU: 70 },
        },
      },
    }),
    makeNode('bwa-rds', 'rds', 30, 140, { parentId: 'bwa-priv-subnet' }),
  ],
  edges: [
    makeEdge('bwa-e1', 'bwa-route53', 'bwa-cloudfront', 'route53', 'cloudfront'),
    makeEdge('bwa-e2', 'bwa-cloudfront', 'bwa-alb', 'cloudfront', 'alb'),
    makeEdge('bwa-e3', 'bwa-alb', 'bwa-ecs', 'alb', 'ecs'),
    makeEdge('bwa-e4', 'bwa-ecs', 'bwa-rds', 'ecs', 'rds'),
  ],
}

// Serverless API: Route53 → API Gateway → Lambda → DynamoDB (no VPC)
const serverlessApi: PresetArchitecture = {
  id: 'preset-serverless-api',
  name: 'Serverless API',
  description: 'Route53 → API Gateway → Lambda → DynamoDB のサーバーレス構成',
  nodes: [
    makeNode('sa-route53', 'route53', 0, 200),
    makeNode('sa-apigw', 'api-gateway', 250, 200),
    makeNode('sa-lambda', 'lambda', 500, 200),
    makeNode('sa-dynamodb', 'dynamodb', 750, 200),
  ],
  edges: [
    makeEdge('sa-e1', 'sa-route53', 'sa-apigw', 'route53', 'api-gateway'),
    makeEdge('sa-e2', 'sa-apigw', 'sa-lambda', 'api-gateway', 'lambda'),
    makeEdge('sa-e3', 'sa-lambda', 'sa-dynamodb', 'lambda', 'dynamodb'),
  ],
}

// Static Website + API: Route53 → CloudFront → S3 + API Gateway → Lambda → DynamoDB
const staticWebsiteWithApi: PresetArchitecture = {
  id: 'preset-static-website-api',
  name: 'Static Website + API',
  description: 'Route53 → CloudFront → S3 (静的サイト) + API Gateway → Lambda → DynamoDB (API)',
  nodes: [
    makeNode('swa-route53', 'route53', 0, 200),
    makeNode('swa-cloudfront', 'cloudfront', 250, 80),
    makeNode('swa-s3', 's3', 500, 80),
    makeNode('swa-apigw', 'api-gateway', 250, 320),
    makeNode('swa-lambda', 'lambda', 500, 320),
    makeNode('swa-dynamodb', 'dynamodb', 750, 320),
  ],
  edges: [
    makeEdge('swa-e1', 'swa-route53', 'swa-cloudfront', 'route53', 'cloudfront'),
    makeEdge('swa-e2', 'swa-cloudfront', 'swa-s3', 'cloudfront', 's3'),
    makeEdge('swa-e3', 'swa-route53', 'swa-apigw', 'route53', 'api-gateway'),
    makeEdge('swa-e4', 'swa-apigw', 'swa-lambda', 'api-gateway', 'lambda'),
    makeEdge('swa-e5', 'swa-lambda', 'swa-dynamodb', 'lambda', 'dynamodb'),
  ],
}

// HA Web App: Route53 → CloudFront → [VPC: PubSubnet(ALB), PrivSubnet1(ECS), PrivSubnet2(RDS + ElastiCache)]
const haWebApp: PresetArchitecture = {
  id: 'preset-ha-web-app',
  name: 'HA Web App',
  description:
    'Route53 → CloudFront → VPC内ALB → ECS(AutoScaling) → RDS(Multi-AZ) + ElastiCache の高可用性構成',
  nodes: [
    makeNode('ha-route53', 'route53', 0, 200),
    makeNode('ha-cloudfront', 'cloudfront', 250, 200),
    makeNode('ha-vpc', 'vpc', 500, 30, { style: { width: 660, height: 560 } }),
    makeNode('ha-pub-subnet', 'subnet', 30, 130, {
      parentId: 'ha-vpc',
      subnetType: 'public',
      style: { width: 260, height: 160 },
      configOverrides: {
        name: 'Public Subnet',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.1.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'public' },
      },
    }),
    makeNode('ha-alb', 'alb', 30, 40, { parentId: 'ha-pub-subnet' }),
    makeNode('ha-priv-subnet-1', 'subnet', 330, 130, {
      parentId: 'ha-vpc',
      subnetType: 'private',
      style: { width: 270, height: 160 },
      configOverrides: {
        name: 'Private Subnet (Compute)',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.2.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'private' },
      },
    }),
    makeNode('ha-ecs', 'ecs', 35, 40, {
      parentId: 'ha-priv-subnet-1',
      configOverrides: {
        name: 'ECS',
        latency: { base: 50, perRequest: 0.5 },
        cost: { monthly: 0 },
        specific: {
          launchType: 'fargate' as const,
          taskCount: 4,
          cpu: 0.5,
          memory: 1,
          autoScaling: { enabled: true, min: 4, max: 20, targetCPU: 60 },
        },
      },
    }),
    makeNode('ha-priv-subnet-2', 'subnet', 330, 330, {
      parentId: 'ha-vpc',
      subnetType: 'private',
      style: { width: 270, height: 210 },
      configOverrides: {
        name: 'Private Subnet (Data)',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.3.0/24', availabilityZone: 'ap-northeast-1c', subnetType: 'private' },
      },
    }),
    makeNode('ha-rds', 'rds', 35, 40, {
      parentId: 'ha-priv-subnet-2',
      configOverrides: {
        name: 'RDS',
        latency: { base: 3, perRequest: 0.1 },
        cost: { monthly: 50 },
        security: { encryption: true },
        specific: {
          instanceClass: 'db.t3.medium',
          multiAZ: true,
          readReplicas: 1,
          storageGB: 100,
        },
      },
    }),
    makeNode('ha-cache', 'elasticache', 35, 120, {
      parentId: 'ha-priv-subnet-2',
      configOverrides: {
        name: 'ElastiCache',
        cache: { enabled: true, ttl: 300, hitRate: 0.9 },
        latency: { base: 1 },
        cost: { monthly: 25 },
        specific: {
          engine: 'redis' as const,
          nodeType: 'cache.t3.small',
          numNodes: 2,
          clusterMode: false,
        },
      },
    }),
  ],
  edges: [
    makeEdge('ha-e1', 'ha-route53', 'ha-cloudfront', 'route53', 'cloudfront'),
    makeEdge('ha-e2', 'ha-cloudfront', 'ha-alb', 'cloudfront', 'alb'),
    makeEdge('ha-e3', 'ha-alb', 'ha-ecs', 'alb', 'ecs'),
    makeEdge('ha-e4', 'ha-ecs', 'ha-rds', 'ecs', 'rds'),
    makeEdge('ha-e5', 'ha-ecs', 'ha-cache', 'ecs', 'elasticache'),
  ],
}

// EKS Microservices: Route53 → CloudFront → VPC[PubSubnet(ALB) → PrivSubnet(EKS → RDS, EKS → ElastiCache)]
const eksMicroservices: PresetArchitecture = {
  id: 'preset-eks-microservices',
  name: 'EKS Microservices',
  description:
    'Route53 → CloudFront → VPC内ALB → EKS → RDS + ElastiCache のマイクロサービス構成',
  nodes: [
    makeNode('ems-route53', 'route53', 0, 200),
    makeNode('ems-cloudfront', 'cloudfront', 250, 200),
    makeNode('ems-vpc', 'vpc', 500, 30, { style: { width: 660, height: 560 } }),
    makeNode('ems-pub-subnet', 'subnet', 30, 130, {
      parentId: 'ems-vpc',
      subnetType: 'public',
      style: { width: 260, height: 160 },
      configOverrides: {
        name: 'Public Subnet',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.1.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'public' },
      },
    }),
    makeNode('ems-alb', 'alb', 30, 40, { parentId: 'ems-pub-subnet' }),
    makeNode('ems-priv-compute', 'subnet', 330, 130, {
      parentId: 'ems-vpc',
      subnetType: 'private',
      style: { width: 270, height: 160 },
      configOverrides: {
        name: 'Private Subnet (Compute)',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.2.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'private' },
      },
    }),
    makeNode('ems-eks', 'eks', 35, 40, {
      parentId: 'ems-priv-compute',
      configOverrides: {
        name: 'EKS',
        latency: { base: 50, perRequest: 0.5 },
        cost: { monthly: 73 },
        specific: {
          nodeGroupType: 'managed' as const,
          nodeCount: 3,
          instanceType: 't3.medium',
          autoScaling: { enabled: true, min: 2, max: 10, targetCPU: 70 },
        },
      },
    }),
    makeNode('ems-priv-data', 'subnet', 330, 330, {
      parentId: 'ems-vpc',
      subnetType: 'private',
      style: { width: 270, height: 210 },
      configOverrides: {
        name: 'Private Subnet (Data)',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.3.0/24', availabilityZone: 'ap-northeast-1c', subnetType: 'private' },
      },
    }),
    makeNode('ems-rds', 'rds', 35, 40, { parentId: 'ems-priv-data' }),
    makeNode('ems-cache', 'elasticache', 35, 120, {
      parentId: 'ems-priv-data',
      configOverrides: {
        name: 'ElastiCache',
        cache: { enabled: true, ttl: 300, hitRate: 0.9 },
        latency: { base: 1 },
        cost: { monthly: 12.5 },
        specific: {
          engine: 'redis' as const,
          nodeType: 'cache.t3.micro',
          numNodes: 2,
          clusterMode: false,
        },
      },
    }),
  ],
  edges: [
    makeEdge('ems-e1', 'ems-route53', 'ems-cloudfront', 'route53', 'cloudfront'),
    makeEdge('ems-e2', 'ems-cloudfront', 'ems-alb', 'cloudfront', 'alb'),
    makeEdge('ems-e3', 'ems-alb', 'ems-eks', 'alb', 'eks'),
    makeEdge('ems-e4', 'ems-eks', 'ems-rds', 'eks', 'rds'),
    makeEdge('ems-e5', 'ems-eks', 'ems-cache', 'eks', 'elasticache'),
  ],
}

// Event-Driven: Route53 → API GW → Lambda → SNS → {SQS → Lambda → DynamoDB, Kinesis → Lambda → S3}
const eventDriven: PresetArchitecture = {
  id: 'preset-event-driven',
  name: 'Event-Driven Architecture',
  description:
    'Route53 → API Gateway → Lambda → SNS → SQS/Kinesis → Lambda → DynamoDB/S3 のイベント駆動型構成',
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

// Enterprise E-Commerce Platform: 18 service types (20 nodes), 15 edges
// Left-to-right flow: Entry → Edge → VPC(Compute→Data) → Messaging
//
// Layout (left → right):
//   Col 1 (x=0):    WAF, Route53, API GW          — Entry points
//   Col 2 (x=300):  CloudFront, S3, Lambda         — Edge / CDN
//   Col 3-4 (VPC):  ALB → ECS/EC2 → RDS/Cache/DDB — Core processing
//   Col 5 (x=1420): SQS, SNS, Kinesis              — Async messaging
const enterpriseEcommerce: PresetArchitecture = {
  id: 'preset-enterprise-ecommerce',
  name: 'Enterprise E-Commerce',
  description:
    'WAF + CloudFront + ALB → ECS → RDS/ElastiCache/DynamoDB + API GW → Lambda + SNS/SQS/Kinesis の包括的なエンタープライズEC構成（18サービス）',
  nodes: [
    // ── Col 1: Entry Points (x=0) ──
    makeNode('eec-waf', 'waf', 0, 50),
    makeNode('eec-route53', 'route53', 0, 200),
    makeNode('eec-apigw', 'api-gateway', 0, 470),

    // ── Col 2: Edge / CDN (x=300) ──
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

    // ── Col 3-4: VPC (750x770) ──
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

    // Public Subnet — ALB (left-top of VPC)
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

    // Private Subnet (Compute) — ECS + EC2 stacked (left-bottom of VPC)
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

    // Private Subnet (Data) — RDS + ElastiCache + DynamoDB stacked (right of VPC)
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

    // ── Col 5: Async Messaging (x=1420) ──
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

// Secure Three-Tier: Shield + WAF + Route53 → CloudFront → VPC[PubSubnet(ALB) → PrivCompute(ECS) → PrivData(RDS + ElastiCache)] + NAT GW
const secureThreeTier: PresetArchitecture = {
  id: 'preset-secure-three-tier',
  name: 'Secure Three-Tier Web App',
  description:
    'Shield + WAF + Route53 → CloudFront → VPC内ALB → ECS → RDS + ElastiCache のセキュリティベストプラクティス構成（NAT Gateway付き）',
  nodes: [
    // Col 1: Entry Points (x=0)
    makeNode('stt-shield', 'shield', 0, 80, {
      configOverrides: {
        name: 'Shield',
        latency: { base: 0 },
        cost: { monthly: 3000 },
        security: { ddosProtection: true },
        specific: { tier: 'advanced' },
      },
    }),
    makeNode('stt-waf', 'waf', 0, 200),
    makeNode('stt-route53', 'route53', 0, 360),

    // Col 2: CDN (x=300)
    makeNode('stt-cloudfront', 'cloudfront', 280, 200),

    // Col 3: VPC (x=570, 600x550)
    makeNode('stt-vpc', 'vpc', 560, 20, { style: { width: 680, height: 570 } }),

    // Public Subnet (30,60, 250x160): ALB
    makeNode('stt-pub-subnet', 'subnet', 30, 140, {
      parentId: 'stt-vpc',
      subnetType: 'public',
      style: { width: 260, height: 160 },
      configOverrides: {
        name: 'Public Subnet',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.1.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'public' },
      },
    }),
    makeNode('stt-alb', 'alb', 30, 40, { parentId: 'stt-pub-subnet' }),

    // Private Compute (30,270, 250x160): ECS
    makeNode('stt-priv-compute', 'subnet', 330, 140, {
      parentId: 'stt-vpc',
      subnetType: 'private',
      style: { width: 270, height: 160 },
      configOverrides: {
        name: 'Private Subnet (Compute)',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.2.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'private' },
      },
    }),
    makeNode('stt-ecs', 'ecs', 35, 40, {
      parentId: 'stt-priv-compute',
      configOverrides: {
        name: 'ECS',
        latency: { base: 50, perRequest: 0.5 },
        cost: { monthly: 0 },
        specific: {
          launchType: 'fargate' as const,
          taskCount: 3,
          cpu: 0.5,
          memory: 1,
          autoScaling: { enabled: true, min: 2, max: 12, targetCPU: 70 },
        },
      },
    }),

    // Private Data (320,60, 250x340): RDS + ElastiCache
    makeNode('stt-priv-data', 'subnet', 330, 340, {
      parentId: 'stt-vpc',
      subnetType: 'private',
      style: { width: 270, height: 180 },
      configOverrides: {
        name: 'Private Subnet (Data)',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.3.0/24', availabilityZone: 'ap-northeast-1c', subnetType: 'private' },
      },
    }),
    makeNode('stt-rds', 'rds', 35, 35, {
      parentId: 'stt-priv-data',
      configOverrides: {
        name: 'RDS',
        latency: { base: 3, perRequest: 0.1 },
        cost: { monthly: 50 },
        security: { encryption: true },
        specific: {
          instanceClass: 'db.t3.medium',
          multiAZ: true,
          readReplicas: 0,
          storageGB: 100,
        },
      },
    }),
    makeNode('stt-cache', 'elasticache', 35, 110, {
      parentId: 'stt-priv-data',
      configOverrides: {
        name: 'ElastiCache',
        cache: { enabled: true, ttl: 300, hitRate: 0.9 },
        latency: { base: 1 },
        cost: { monthly: 25 },
        specific: {
          engine: 'redis' as const,
          nodeType: 'cache.t3.small',
          numNodes: 2,
          clusterMode: false,
        },
      },
    }),

    // NAT Gateway (30,440)
    makeNode('stt-nat', 'nat-gateway', 30, 470, { parentId: 'stt-vpc' }),
  ],
  edges: [
    makeEdge('stt-e1', 'stt-shield', 'stt-cloudfront', 'shield', 'cloudfront'),
    makeEdge('stt-e2', 'stt-waf', 'stt-cloudfront', 'waf', 'cloudfront'),
    makeEdge('stt-e3', 'stt-route53', 'stt-cloudfront', 'route53', 'cloudfront'),
    makeEdge('stt-e4', 'stt-cloudfront', 'stt-alb', 'cloudfront', 'alb'),
    makeEdge('stt-e5', 'stt-alb', 'stt-ecs', 'alb', 'ecs'),
    makeEdge('stt-e6', 'stt-ecs', 'stt-rds', 'ecs', 'rds'),
    makeEdge('stt-e7', 'stt-ecs', 'stt-cache', 'ecs', 'elasticache'),
  ],
}

// Serverless Full-Stack SPA: Route53 → CloudFront → S3 + API GW → Lambda(VPC) → RDS/ElastiCache/DynamoDB
const serverlessFullStack: PresetArchitecture = {
  id: 'preset-serverless-fullstack',
  name: 'Serverless Full-Stack SPA',
  description:
    'Route53 → CloudFront → S3(静的SPA) + API Gateway → Lambda(VPC内) → RDS + ElastiCache + DynamoDB のモダンサーバーレス構成',
  nodes: [
    // Col 1 (x=0): Route53
    makeNode('sfs-route53', 'route53', 0, 200),

    // Col 2 (x=250): S3 + CloudFront
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

    // Col 3 (x=500): DynamoDB + API Gateway
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
        },
      },
    }),
    makeNode('sfs-apigw', 'api-gateway', 540, 200),

    // Col 4: VPC (x=720, 500x450)
    makeNode('sfs-vpc', 'vpc', 780, 40, { style: { width: 480, height: 440 } }),

    // Private Subnet (30,60, 420x260): Lambda, RDS, ElastiCache
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

    // NAT Gateway (30,360)
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

export const PRESET_ARCHITECTURES: readonly PresetArchitecture[] = [
  basicWebApp,
  serverlessApi,
  staticWebsiteWithApi,
  haWebApp,
  eksMicroservices,
  eventDriven,
  enterpriseEcommerce,
  secureThreeTier,
  serverlessFullStack,
]
