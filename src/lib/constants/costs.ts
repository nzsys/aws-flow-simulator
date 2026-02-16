export const AWS_COSTS = {
  route53: {
    perMillionQueries: 0.4,
    hostedZoneMonthly: 0.5,
  },
  cloudfront: {
    perGBFirst10TB: 0.085,
    per10000Requests: 0.0075,
  },
  alb: {
    perHour: 0.0225,
    perLCU: 0.008,
  },
  nlb: {
    perHour: 0.0225,
    perNLCU: 0.006,
  },
  'api-gateway': {
    perMillionRequests: 3.5,
    cachingPerHour: 0.02,
  },
  ecs: {
    fargateVCPUPerHour: 0.04048,
    fargateMemoryPerGBPerHour: 0.004445,
  },
  ec2: {
    t3MicroPerHour: 0.0104,
    t3SmallPerHour: 0.0208,
    t3MediumPerHour: 0.0416,
    t3LargePerHour: 0.0832,
    t3XlargePerHour: 0.1664,
  },
  lambda: {
    perMillionRequests: 0.2,
    perGBSecond: 0.0000166667,
  },
  s3: {
    perGBPerMonth: 0.023,
    per1000GETRequests: 0.0004,
    per1000PUTRequests: 0.005,
  },
  rds: {
    microPerHour: 0.017,
    smallPerHour: 0.034,
    mediumPerHour: 0.068,
    largePerHour: 0.136,
    storagePerGBPerMonth: 0.115,
    multiAZMultiplier: 2,
  },
  dynamodb: {
    perMillionReadUnits: 0.25,
    perMillionWriteUnits: 1.25,
    storagePerGBPerMonth: 0.25,
  },
  elasticache: {
    t3MicroPerHour: 0.017,
    t3SmallPerHour: 0.034,
    t3MediumPerHour: 0.068,
  },
  waf: {
    perWebACLMonthly: 5,
    perRuleMonthly: 1,
    perMillionRequests: 0.6,
  },
  shield: {
    standardMonthly: 0,
    advancedMonthly: 3000,
  },
  eks: {
    controlPlanePerHour: 0.10,
    t3MediumPerHour: 0.0416,
    t3LargePerHour: 0.0832,
    t3XlargePerHour: 0.1664,
  },
  sqs: {
    perMillionRequests: 0.40,
    perMillionRequestsFifo: 0.50,
  },
  sns: {
    perMillionPublishes: 0.50,
    perMillionDeliveries: 0.09,
  },
  kinesis: {
    shardHourProvisioned: 0.015,
    perGBIngested: 0.08,
    perShardHour: 0.04,
  },
  'nat-gateway': {
    perHour: 0.045,
    perGBProcessed: 0.045,
  },
} as const
