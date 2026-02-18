export type AWSServiceType =
  | 'route53'
  | 'cloudfront'
  | 'alb'
  | 'nlb'
  | 'api-gateway'
  | 'ecs'
  | 'eks'
  | 'ec2'
  | 'lambda'
  | 's3'
  | 'rds'
  | 'elasticache'
  | 'waf'
  | 'shield'
  | 'dynamodb'
  | 'sqs'
  | 'sns'
  | 'kinesis'
  | 'vpc'
  | 'subnet'
  | 'security-group'
  | 'nat-gateway'
  | 'internet-gateway'

export type ServiceRole = 'flow' | 'infrastructure'

export type CloudFrontConfig = {
  readonly edgeLocations: number
  readonly behaviors: number
  readonly originShield: boolean
  readonly compressionEnabled: boolean
}

export type ALBConfig = {
  readonly targetType: 'instance' | 'ip' | 'lambda'
  readonly targetCount: number
  readonly healthCheckInterval: number
  readonly stickySession: boolean
}

export type NLBConfig = {
  readonly targetType: 'instance' | 'ip'
  readonly targetCount: number
  readonly crossZone: boolean
}

export type APIGatewayConfig = {
  readonly apiType: 'rest' | 'http' | 'websocket'
  readonly throttlingRate: number
  readonly throttlingBurst: number
  readonly cachingEnabled: boolean
}

export type ECSConfig = {
  readonly launchType: 'fargate' | 'ec2'
  readonly taskCount: number
  readonly cpu: number
  readonly memory: number
  readonly autoScaling: {
    readonly enabled: boolean
    readonly min: number
    readonly max: number
    readonly targetCPU: number
  }
}

export type EC2Config = {
  readonly instanceType: string
  readonly instanceCount: number
  readonly autoScaling: boolean
}

export type LambdaConfig = {
  readonly memoryMB: number
  readonly timeoutSeconds: number
  readonly concurrency: number
  readonly runtime: string
  readonly avgDurationMs: number
}

export type RDSConfig = {
  readonly instanceClass: string
  readonly multiAZ: boolean
  readonly readReplicas: number
  readonly storageGB: number
}

export type DynamoDBConfig = {
  readonly capacityMode: 'provisioned' | 'on-demand'
  readonly readCapacityUnits: number
  readonly writeCapacityUnits: number
  readonly globalTables: boolean
  readonly storageGB: number
}

export type S3Config = {
  readonly storageClass: 'standard' | 'ia' | 'glacier'
  readonly versioningEnabled: boolean
}

export type Route53Config = {
  readonly routingPolicy: 'simple' | 'weighted' | 'latency' | 'failover'
  readonly healthCheckEnabled: boolean
}

export type ElastiCacheConfig = {
  readonly engine: 'redis' | 'memcached'
  readonly nodeType: string
  readonly numNodes: number
  readonly clusterMode: boolean
}

export type WAFConfig = {
  readonly ruleCount: number
  readonly rateBasedRules: boolean
  readonly managedRuleGroups: number
}

export type ShieldConfig = {
  readonly tier: 'standard' | 'advanced'
}

export type VPCConfig = {
  readonly cidrBlock: string
  readonly enableDnsSupport: boolean
  readonly enableDnsHostnames: boolean
}

export type SubnetConfig = {
  readonly cidrBlock: string
  readonly availabilityZone: string
  readonly subnetType: 'public' | 'private'
}

export type SecurityGroupConfig = {
  readonly ingressRules: number
  readonly egressRules: number
}

export type NATGatewayConfig = {
  readonly connectivityType: 'public' | 'private'
}

export type InternetGatewayConfig = Record<string, never>

export type EKSConfig = {
  readonly nodeGroupType: 'managed' | 'fargate'
  readonly nodeCount: number
  readonly instanceType: string
  readonly autoScaling: {
    readonly enabled: boolean
    readonly min: number
    readonly max: number
    readonly targetCPU: number
  }
}

export type SQSConfig = {
  readonly queueType: 'standard' | 'fifo'
  readonly visibilityTimeout: number
  readonly messageRetention: number
  readonly dlqEnabled: boolean
}

export type SNSConfig = {
  readonly topicType: 'standard' | 'fifo'
  readonly subscriptionCount: number
}

export type KinesisConfig = {
  readonly streamMode: 'provisioned' | 'on-demand'
  readonly shardCount: number
  readonly retentionHours: number
}

export type ServiceSpecificConfig =
  | CloudFrontConfig
  | ALBConfig
  | NLBConfig
  | APIGatewayConfig
  | ECSConfig
  | EC2Config
  | LambdaConfig
  | RDSConfig
  | DynamoDBConfig
  | S3Config
  | Route53Config
  | ElastiCacheConfig
  | WAFConfig
  | ShieldConfig
  | VPCConfig
  | SubnetConfig
  | SecurityGroupConfig
  | NATGatewayConfig
  | InternetGatewayConfig
  | EKSConfig
  | SQSConfig
  | SNSConfig
  | KinesisConfig

export type CacheConfig = {
  readonly enabled: boolean
  readonly ttl: number
  readonly hitRate: number
}

export type LatencyConfig = {
  readonly base: number
  readonly perRequest?: number
}

export type CostConfig = {
  readonly perRequest?: number
  readonly perGB?: number
  readonly monthly?: number
}

export type SecurityConfig = {
  readonly waf?: boolean
  readonly ddosProtection?: boolean
  readonly encryption?: boolean
}

export type ServiceConfig = {
  readonly name: string
  readonly region?: string
  readonly cache?: CacheConfig
  readonly latency: LatencyConfig
  readonly cost: CostConfig
  readonly security?: SecurityConfig
  readonly specific?: ServiceSpecificConfig
}
