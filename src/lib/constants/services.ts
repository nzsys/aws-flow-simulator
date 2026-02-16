import type { AWSServiceType, ServiceConfig, ServiceRole } from '@/types'

export type ServiceDefinition = {
  readonly type: AWSServiceType
  readonly label: string
  readonly category: 'networking' | 'compute' | 'storage' | 'database' | 'messaging' | 'security' | 'infrastructure'
  readonly role: ServiceRole
  readonly color: string
  readonly description: string
  readonly defaultConfig: ServiceConfig
}

export const SERVICE_DEFINITIONS: Record<AWSServiceType, ServiceDefinition> = {
  route53: {
    type: 'route53',
    label: 'Route 53',
    category: 'networking',
    role: 'flow',
    color: '#8C4FFF',
    description: 'DNS & ドメイン管理',
    defaultConfig: {
      name: 'Route 53',
      latency: { base: 3 },
      cost: { perRequest: 0.0000005, monthly: 0.5 },
      specific: {
        routingPolicy: 'simple',
        healthCheckEnabled: true,
      },
    },
  },
  cloudfront: {
    type: 'cloudfront',
    label: 'CloudFront',
    category: 'networking',
    role: 'flow',
    color: '#8C4FFF',
    description: 'CDN & エッジキャッシュ',
    defaultConfig: {
      name: 'CloudFront',
      cache: { enabled: true, ttl: 86400, hitRate: 0.85 },
      latency: { base: 20 },
      cost: { perRequest: 0.00000075, perGB: 0.085 },
      security: { ddosProtection: true },
      specific: {
        edgeLocations: 200,
        behaviors: 1,
        originShield: false,
        compressionEnabled: true,
      },
    },
  },
  alb: {
    type: 'alb',
    label: 'ALB',
    category: 'networking',
    role: 'flow',
    color: '#8C4FFF',
    description: 'Application Load Balancer',
    defaultConfig: {
      name: 'ALB',
      latency: { base: 5 },
      cost: { monthly: 16.2 },
      specific: {
        targetType: 'instance',
        targetCount: 2,
        healthCheckInterval: 30,
        stickySession: false,
      },
    },
  },
  nlb: {
    type: 'nlb',
    label: 'NLB',
    category: 'networking',
    role: 'flow',
    color: '#8C4FFF',
    description: 'Network Load Balancer',
    defaultConfig: {
      name: 'NLB',
      latency: { base: 3 },
      cost: { monthly: 16.2 },
      specific: {
        targetType: 'instance',
        targetCount: 2,
        crossZone: true,
      },
    },
  },
  'api-gateway': {
    type: 'api-gateway',
    label: 'API Gateway',
    category: 'networking',
    role: 'flow',
    color: '#E7157B',
    description: 'API管理',
    defaultConfig: {
      name: 'API Gateway',
      latency: { base: 30 },
      cost: { perRequest: 0.0000035 },
      specific: {
        apiType: 'rest',
        throttlingRate: 10000,
        throttlingBurst: 5000,
        cachingEnabled: false,
      },
    },
  },
  ecs: {
    type: 'ecs',
    label: 'ECS',
    category: 'compute',
    role: 'flow',
    color: '#ED7100',
    description: 'コンテナオーケストレーション',
    defaultConfig: {
      name: 'ECS',
      latency: { base: 50, perRequest: 0.5 },
      cost: { monthly: 0 },
      specific: {
        launchType: 'fargate',
        taskCount: 2,
        cpu: 0.25,
        memory: 0.5,
        autoScaling: {
          enabled: true,
          min: 2,
          max: 10,
          targetCPU: 70,
        },
      },
    },
  },
  eks: {
    type: 'eks',
    label: 'EKS',
    category: 'compute',
    role: 'flow',
    color: '#ED7100',
    description: 'Kubernetes オーケストレーション',
    defaultConfig: {
      name: 'EKS',
      latency: { base: 50, perRequest: 0.5 },
      cost: { monthly: 73 },
      specific: {
        nodeGroupType: 'managed',
        nodeCount: 2,
        instanceType: 't3.medium',
        autoScaling: {
          enabled: true,
          min: 2,
          max: 10,
          targetCPU: 70,
        },
      },
    },
  },
  ec2: {
    type: 'ec2',
    label: 'EC2',
    category: 'compute',
    role: 'flow',
    color: '#ED7100',
    description: '仮想サーバー',
    defaultConfig: {
      name: 'EC2',
      latency: { base: 50, perRequest: 0.5 },
      cost: { monthly: 8.5 },
      specific: {
        instanceType: 't3.micro',
        instanceCount: 1,
        autoScaling: false,
      },
    },
  },
  lambda: {
    type: 'lambda',
    label: 'Lambda',
    category: 'compute',
    role: 'flow',
    color: '#ED7100',
    description: 'サーバーレス関数',
    defaultConfig: {
      name: 'Lambda',
      latency: { base: 100 },
      cost: { perRequest: 0.0000002 },
      specific: {
        memoryMB: 128,
        timeoutSeconds: 30,
        concurrency: 100,
        runtime: 'nodejs20.x',
      },
    },
  },
  s3: {
    type: 's3',
    label: 'S3',
    category: 'storage',
    role: 'flow',
    color: '#3F8624',
    description: 'オブジェクトストレージ',
    defaultConfig: {
      name: 'S3',
      latency: { base: 15 },
      cost: { perRequest: 0.0000004, perGB: 0.023 },
      security: { encryption: true },
      specific: {
        storageClass: 'standard',
        versioningEnabled: false,
      },
    },
  },
  rds: {
    type: 'rds',
    label: 'RDS',
    category: 'database',
    role: 'flow',
    color: '#C925D1',
    description: 'リレーショナルDB',
    defaultConfig: {
      name: 'RDS',
      latency: { base: 3, perRequest: 0.1 },
      cost: { monthly: 25 },
      security: { encryption: true },
      specific: {
        instanceClass: 'db.t3.micro',
        multiAZ: false,
        readReplicas: 0,
        storageGB: 20,
      },
    },
  },
  dynamodb: {
    type: 'dynamodb',
    label: 'DynamoDB',
    category: 'database',
    role: 'flow',
    color: '#C925D1',
    description: 'NoSQL データベース',
    defaultConfig: {
      name: 'DynamoDB',
      latency: { base: 5, perRequest: 0.05 },
      cost: { perRequest: 0.00000125, monthly: 0 },
      security: { encryption: true },
      specific: {
        capacityMode: 'on-demand',
        readCapacityUnits: 5,
        writeCapacityUnits: 5,
        globalTables: false,
      },
    },
  },
  sqs: {
    type: 'sqs',
    label: 'SQS',
    category: 'messaging',
    role: 'flow',
    color: '#FF4F8B',
    description: 'メッセージキュー',
    defaultConfig: {
      name: 'SQS',
      latency: { base: 10 },
      cost: { perRequest: 0.0000004 },
      specific: {
        queueType: 'standard',
        visibilityTimeout: 30,
        messageRetention: 345600,
        dlqEnabled: false,
      },
    },
  },
  sns: {
    type: 'sns',
    label: 'SNS',
    category: 'messaging',
    role: 'flow',
    color: '#FF4F8B',
    description: 'Pub/Sub 通知',
    defaultConfig: {
      name: 'SNS',
      latency: { base: 5 },
      cost: { perRequest: 0.0000005 },
      specific: {
        topicType: 'standard',
        subscriptionCount: 1,
      },
    },
  },
  kinesis: {
    type: 'kinesis',
    label: 'Kinesis',
    category: 'messaging',
    role: 'flow',
    color: '#FF4F8B',
    description: 'データストリーミング',
    defaultConfig: {
      name: 'Kinesis',
      latency: { base: 8 },
      cost: { monthly: 0 },
      specific: {
        streamMode: 'on-demand',
        shardCount: 1,
        retentionHours: 24,
      },
    },
  },
  elasticache: {
    type: 'elasticache',
    label: 'ElastiCache',
    category: 'database',
    role: 'flow',
    color: '#C925D1',
    description: 'インメモリキャッシュ',
    defaultConfig: {
      name: 'ElastiCache',
      cache: { enabled: true, ttl: 300, hitRate: 0.9 },
      latency: { base: 1 },
      cost: { monthly: 12.5 },
      specific: {
        engine: 'redis',
        nodeType: 'cache.t3.micro',
        numNodes: 1,
        clusterMode: false,
      },
    },
  },
  waf: {
    type: 'waf',
    label: 'WAF',
    category: 'security',
    role: 'flow',
    color: '#DD344C',
    description: 'Web Application Firewall',
    defaultConfig: {
      name: 'WAF',
      latency: { base: 2 },
      cost: { monthly: 5, perRequest: 0.0000006 },
      security: { waf: true },
      specific: {
        ruleCount: 10,
        rateBasedRules: true,
        managedRuleGroups: 2,
      },
    },
  },
  shield: {
    type: 'shield',
    label: 'Shield',
    category: 'security',
    role: 'flow',
    color: '#DD344C',
    description: 'DDoS保護',
    defaultConfig: {
      name: 'Shield',
      latency: { base: 0 },
      cost: { monthly: 0 },
      security: { ddosProtection: true },
      specific: {
        tier: 'standard',
      },
    },
  },
  vpc: {
    type: 'vpc',
    label: 'VPC',
    category: 'infrastructure',
    role: 'infrastructure',
    color: '#248814',
    description: '仮想プライベートクラウド',
    defaultConfig: {
      name: 'VPC',
      latency: { base: 0 },
      cost: { monthly: 0 },
      specific: {
        cidrBlock: '10.0.0.0/16',
        enableDnsSupport: true,
        enableDnsHostnames: true,
      },
    },
  },
  subnet: {
    type: 'subnet',
    label: 'Subnet',
    category: 'infrastructure',
    role: 'infrastructure',
    color: '#248814',
    description: 'サブネット',
    defaultConfig: {
      name: 'Subnet',
      latency: { base: 0 },
      cost: { monthly: 0 },
      specific: {
        cidrBlock: '10.0.1.0/24',
        availabilityZone: 'ap-northeast-1a',
        subnetType: 'public',
      },
    },
  },
  'security-group': {
    type: 'security-group',
    label: 'Security Group',
    category: 'infrastructure',
    role: 'infrastructure',
    color: '#DD344C',
    description: 'セキュリティグループ',
    defaultConfig: {
      name: 'Security Group',
      latency: { base: 0 },
      cost: { monthly: 0 },
      specific: {
        ingressRules: 3,
        egressRules: 1,
      },
    },
  },
  'nat-gateway': {
    type: 'nat-gateway',
    label: 'NAT Gateway',
    category: 'infrastructure',
    role: 'infrastructure',
    color: '#8C4FFF',
    description: 'NATゲートウェイ',
    defaultConfig: {
      name: 'NAT Gateway',
      latency: { base: 1 },
      cost: { monthly: 32.4, perGB: 0.045 },
      specific: {
        connectivityType: 'public',
      },
    },
  },
  'internet-gateway': {
    type: 'internet-gateway',
    label: 'Internet Gateway',
    category: 'infrastructure',
    role: 'infrastructure',
    color: '#8C4FFF',
    description: 'インターネットゲートウェイ',
    defaultConfig: {
      name: 'Internet Gateway',
      latency: { base: 0 },
      cost: { monthly: 0 },
    },
  },
}

export const ENABLED_SERVICES: readonly AWSServiceType[] = [
  'route53',
  'cloudfront',
  'alb',
  'nlb',
  'api-gateway',
  'ecs',
  'eks',
  'ec2',
  'lambda',
  's3',
  'rds',
  'dynamodb',
  'elasticache',
  'sqs',
  'sns',
  'kinesis',
  'waf',
  'shield',
]

export const INFRASTRUCTURE_SERVICES: readonly AWSServiceType[] = [
  'vpc',
  'subnet',
  'security-group',
  'nat-gateway',
  'internet-gateway',
]

export const NESTING_RULES: Partial<Record<AWSServiceType, readonly AWSServiceType[]>> = {
  vpc: ['subnet', 'security-group', 'nat-gateway'],
  subnet: ['alb', 'nlb', 'ecs', 'eks', 'ec2', 'lambda', 'rds', 'elasticache', 'dynamodb'],
}

export function canNestIn(childType: AWSServiceType, parentType: AWSServiceType): boolean {
  const allowed = NESTING_RULES[parentType]
  return allowed !== undefined && allowed.includes(childType)
}

export function getServiceDefinition(type: AWSServiceType): ServiceDefinition {
  return SERVICE_DEFINITIONS[type]
}

export function isInfrastructureService(type: AWSServiceType): boolean {
  return SERVICE_DEFINITIONS[type].role === 'infrastructure'
}
