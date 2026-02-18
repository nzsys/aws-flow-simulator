import { AWS_COSTS } from '@/lib/constants/costs'

const HOURS_PER_MONTH = 730

const EC2_HOURLY_RATES: Record<string, number> = {
  't3.micro': AWS_COSTS.ec2.t3MicroPerHour,
  't3.small': AWS_COSTS.ec2.t3SmallPerHour,
  't3.medium': AWS_COSTS.ec2.t3MediumPerHour,
  't3.large': AWS_COSTS.ec2.t3LargePerHour,
  't3.xlarge': AWS_COSTS.ec2.t3XlargePerHour,
}

const RDS_HOURLY_RATES: Record<string, number> = {
  'db.t3.micro': AWS_COSTS.rds.microPerHour,
  'db.t3.small': AWS_COSTS.rds.smallPerHour,
  'db.t3.medium': AWS_COSTS.rds.mediumPerHour,
  'db.t3.large': AWS_COSTS.rds.largePerHour,
}

const ELASTICACHE_HOURLY_RATES: Record<string, number> = {
  'cache.t3.micro': AWS_COSTS.elasticache.t3MicroPerHour,
  'cache.t3.small': AWS_COSTS.elasticache.t3SmallPerHour,
  'cache.t3.medium': AWS_COSTS.elasticache.t3MediumPerHour,
}

export function calculateEC2MonthlyCost(
  instanceType: string,
  instanceCount: number,
): number {
  const hourlyRate = EC2_HOURLY_RATES[instanceType] ?? AWS_COSTS.ec2.t3MicroPerHour
  return hourlyRate * HOURS_PER_MONTH * instanceCount
}

export function calculateRDSMonthlyCost(
  instanceClass: string,
  multiAZ: boolean,
  readReplicas: number,
  storageGB: number,
): number {
  const hourlyRate = RDS_HOURLY_RATES[instanceClass] ?? AWS_COSTS.rds.microPerHour
  const azMultiplier = multiAZ ? AWS_COSTS.rds.multiAZMultiplier : 1
  const instanceCost = hourlyRate * HOURS_PER_MONTH * azMultiplier
  const replicaCost = hourlyRate * HOURS_PER_MONTH * readReplicas
  const storageCost = storageGB * AWS_COSTS.rds.storagePerGBPerMonth * azMultiplier
  return instanceCost + replicaCost + storageCost
}

export function calculateECSMonthlyCost(
  launchType: string,
  taskCount: number,
  cpu: number,
  memory: number,
): number {
  if (launchType === 'fargate') {
    const cpuCost = cpu * AWS_COSTS.ecs.fargateVCPUPerHour * HOURS_PER_MONTH * taskCount
    const memoryCost = memory * AWS_COSTS.ecs.fargateMemoryPerGBPerHour * HOURS_PER_MONTH * taskCount
    return cpuCost + memoryCost
  }
  return 0
}

export function calculateLambdaMonthlyCost(
  memoryMB: number,
  requestsPerMonth: number,
  avgDurationMs: number,
): number {
  const avgDurationSeconds = avgDurationMs / 1000
  const requestCost = (requestsPerMonth / 1_000_000) * AWS_COSTS.lambda.perMillionRequests
  const gbSeconds = (memoryMB / 1024) * avgDurationSeconds * requestsPerMonth
  const computeCost = gbSeconds * AWS_COSTS.lambda.perGBSecond
  return requestCost + computeCost
}

export function calculateElastiCacheMonthlyCost(
  nodeType: string,
  numNodes: number,
): number {
  const hourlyRate = ELASTICACHE_HOURLY_RATES[nodeType] ?? AWS_COSTS.elasticache.t3MicroPerHour
  return hourlyRate * HOURS_PER_MONTH * numNodes
}

const EKS_NODE_HOURLY_RATES: Record<string, number> = {
  't3.medium': AWS_COSTS.eks.t3MediumPerHour,
  't3.large': AWS_COSTS.eks.t3LargePerHour,
  't3.xlarge': AWS_COSTS.eks.t3XlargePerHour,
}

export function calculateEKSMonthlyCost(
  nodeGroupType: string,
  nodeCount: number,
  instanceType: string,
): number {
  const controlPlaneCost = AWS_COSTS.eks.controlPlanePerHour * HOURS_PER_MONTH
  if (nodeGroupType === 'fargate') {
    return controlPlaneCost
  }
  const nodeHourlyRate = EKS_NODE_HOURLY_RATES[instanceType] ?? AWS_COSTS.eks.t3MediumPerHour
  const nodeCost = nodeHourlyRate * HOURS_PER_MONTH * nodeCount
  return controlPlaneCost + nodeCost
}

export function calculateSQSMonthlyCost(
  queueType: string,
  messagesPerMonth: number,
): number {
  const ratePerMillion =
    queueType === 'fifo' ? AWS_COSTS.sqs.perMillionRequestsFifo : AWS_COSTS.sqs.perMillionRequests
  return (messagesPerMonth / 1_000_000) * ratePerMillion
}

export function calculateSNSMonthlyCost(
  subscriptionCount: number,
  publishesPerMonth: number,
): number {
  const publishCost = (publishesPerMonth / 1_000_000) * AWS_COSTS.sns.perMillionPublishes
  const deliveryCost =
    (publishesPerMonth * subscriptionCount / 1_000_000) * AWS_COSTS.sns.perMillionDeliveries
  return publishCost + deliveryCost
}

export function calculateKinesisMonthlyCost(
  streamMode: string,
  shardCount: number,
  dataTransferGBPerMonth: number,
): number {
  if (streamMode === 'on-demand') {
    const ingestCost = dataTransferGBPerMonth * AWS_COSTS.kinesis.perGBIngested
    const estimatedShards = Math.max(1, Math.ceil(dataTransferGBPerMonth / 730))
    const shardCost = estimatedShards * AWS_COSTS.kinesis.shardHourProvisioned * HOURS_PER_MONTH
    return ingestCost + shardCost
  }
  const shardCost = shardCount * AWS_COSTS.kinesis.shardHourProvisioned * HOURS_PER_MONTH
  const putCost = shardCount * AWS_COSTS.kinesis.perShardHour * HOURS_PER_MONTH
  return shardCost + putCost
}

export function calculateALBMonthlyCost(
  requestsPerMonth: number,
  dataTransferGBPerMonth: number,
): number {
  const fixedCost = AWS_COSTS.alb.perHour * HOURS_PER_MONTH
  const connectionsLCU = requestsPerMonth / (25 * 60 * HOURS_PER_MONTH)
  const processedBytesLCU = dataTransferGBPerMonth
  const lcuUsage = Math.max(connectionsLCU, processedBytesLCU)
  const lcuCost = lcuUsage * AWS_COSTS.alb.perLCU * HOURS_PER_MONTH
  return fixedCost + lcuCost
}

export function calculateNLBMonthlyCost(
  requestsPerMonth: number,
  dataTransferGBPerMonth: number,
): number {
  const fixedCost = AWS_COSTS.nlb.perHour * HOURS_PER_MONTH
  const connectionsNLCU = requestsPerMonth / (800 * 60 * HOURS_PER_MONTH)
  const processedBytesNLCU = dataTransferGBPerMonth
  const nlcuUsage = Math.max(connectionsNLCU, processedBytesNLCU)
  const nlcuCost = nlcuUsage * AWS_COSTS.nlb.perNLCU * HOURS_PER_MONTH
  return fixedCost + nlcuCost
}

export function calculateCloudFrontMonthlyCost(
  requestsPerMonth: number,
  dataTransferGBPerMonth: number,
): number {
  const dataTransferCost = dataTransferGBPerMonth * AWS_COSTS.cloudfront.perGBFirst10TB
  const requestCost = (requestsPerMonth / 10_000) * AWS_COSTS.cloudfront.per10000Requests
  return dataTransferCost + requestCost
}

export function calculateS3MonthlyCost(
  requestsPerMonth: number,
  storageGB: number,
  readWriteRatio: number,
): number {
  const storageCost = storageGB * AWS_COSTS.s3.perGBPerMonth
  const readRequests = requestsPerMonth * readWriteRatio
  const writeRequests = requestsPerMonth * (1 - readWriteRatio)
  const getCost = (readRequests / 1000) * AWS_COSTS.s3.per1000GETRequests
  const putCost = (writeRequests / 1000) * AWS_COSTS.s3.per1000PUTRequests
  return storageCost + getCost + putCost
}

export function calculateAPIGatewayMonthlyCost(
  apiType: string,
  requestsPerMonth: number,
  cachingEnabled: boolean,
): number {
  const ratePerMillion =
    apiType === 'http'
      ? AWS_COSTS['api-gateway'].perMillionRequestsHttp
      : AWS_COSTS['api-gateway'].perMillionRequestsRest
  const requestCost = (requestsPerMonth / 1_000_000) * ratePerMillion
  const cacheCost = cachingEnabled ? AWS_COSTS['api-gateway'].cachingPerHour * HOURS_PER_MONTH : 0
  return requestCost + cacheCost
}

export function calculateDynamoDBMonthlyCost(
  capacityMode: string,
  requestsPerMonth: number,
  readWriteRatio: number,
  rcu: number,
  wcu: number,
  storageGB: number,
): number {
  const storageCost = storageGB * AWS_COSTS.dynamodb.storagePerGBPerMonth

  if (capacityMode === 'provisioned') {
    const rcuCost = rcu * AWS_COSTS.dynamodb.provisionedRCUPerHour * HOURS_PER_MONTH
    const wcuCost = wcu * AWS_COSTS.dynamodb.provisionedWCUPerHour * HOURS_PER_MONTH
    return rcuCost + wcuCost + storageCost
  }

  const millions = requestsPerMonth / 1_000_000
  const readCost = millions * readWriteRatio * AWS_COSTS.dynamodb.onDemandReadPerMillion
  const writeCost = millions * (1 - readWriteRatio) * AWS_COSTS.dynamodb.onDemandWritePerMillion
  return readCost + writeCost + storageCost
}

export function calculateWAFMonthlyCost(
  ruleCount: number,
  requestsPerMonth: number,
): number {
  const webACLCost = AWS_COSTS.waf.perWebACLMonthly
  const ruleCost = ruleCount * AWS_COSTS.waf.perRuleMonthly
  const requestCost = (requestsPerMonth / 1_000_000) * AWS_COSTS.waf.perMillionRequests
  return webACLCost + ruleCost + requestCost
}

export function calculateShieldMonthlyCost(tier: string): number {
  return tier === 'advanced' ? AWS_COSTS.shield.advancedMonthly : AWS_COSTS.shield.standardMonthly
}

export function calculateRoute53MonthlyCost(requestsPerMonth: number): number {
  const hostedZoneCost = AWS_COSTS.route53.hostedZoneMonthly
  const queryCost = (requestsPerMonth / 1_000_000) * AWS_COSTS.route53.perMillionQueries
  return hostedZoneCost + queryCost
}

export function calculateNATGatewayMonthlyCost(dataTransferGBPerMonth: number): number {
  const fixedCost = AWS_COSTS['nat-gateway'].perHour * HOURS_PER_MONTH
  const dataCost = dataTransferGBPerMonth * AWS_COSTS['nat-gateway'].perGBProcessed
  return fixedCost + dataCost
}

export const EKS_INSTANCE_TYPES = [
  't3.medium',
  't3.large',
  't3.xlarge',
] as const

export const EKS_NODE_GROUP_TYPES = ['managed', 'fargate'] as const

export const SQS_QUEUE_TYPES = ['standard', 'fifo'] as const

export const SNS_TOPIC_TYPES = ['standard', 'fifo'] as const

export const KINESIS_STREAM_MODES = ['provisioned', 'on-demand'] as const

export const EC2_INSTANCE_TYPES = [
  't3.micro',
  't3.small',
  't3.medium',
  't3.large',
  't3.xlarge',
] as const

export const RDS_INSTANCE_CLASSES = [
  'db.t3.micro',
  'db.t3.small',
  'db.t3.medium',
  'db.t3.large',
] as const

export const ECS_CPU_OPTIONS = [0.25, 0.5, 1, 2, 4] as const
export const ECS_MEMORY_OPTIONS = [0.5, 1, 2, 4, 8, 16] as const

export const LAMBDA_MEMORY_OPTIONS = [128, 256, 512, 1024, 2048, 3072] as const

export const ELASTICACHE_NODE_TYPES = [
  'cache.t3.micro',
  'cache.t3.small',
  'cache.t3.medium',
] as const

export const DYNAMODB_CAPACITY_MODES = ['on-demand', 'provisioned'] as const

export const API_GATEWAY_TYPES = ['rest', 'http', 'websocket'] as const
