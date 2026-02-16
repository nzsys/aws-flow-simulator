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
  // EC2 launch type: cost is managed via EC2 instances directly
  return 0
}

export function calculateLambdaMonthlyCost(memoryMB: number): number {
  // Estimate: 1M invocations/month, 200ms avg duration
  const invocations = 1_000_000
  const avgDurationSeconds = 0.2
  const requestCost = (invocations / 1_000_000) * AWS_COSTS.lambda.perMillionRequests
  const gbSeconds = (memoryMB / 1024) * avgDurationSeconds * invocations
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

export function calculateSQSMonthlyCost(queueType: string): number {
  const ratePerMillion =
    queueType === 'fifo' ? AWS_COSTS.sqs.perMillionRequestsFifo : AWS_COSTS.sqs.perMillionRequests
  // Estimate: 10M messages/month
  return (10_000_000 / 1_000_000) * ratePerMillion
}

export function calculateSNSMonthlyCost(subscriptionCount: number): number {
  // Estimate: 1M publishes/month
  const publishCost = (1_000_000 / 1_000_000) * AWS_COSTS.sns.perMillionPublishes
  const deliveryCost =
    (1_000_000 * subscriptionCount / 1_000_000) * AWS_COSTS.sns.perMillionDeliveries
  return publishCost + deliveryCost
}

export function calculateKinesisMonthlyCost(
  streamMode: string,
  shardCount: number,
): number {
  if (streamMode === 'on-demand') {
    return 0
  }
  const shardCost = shardCount * AWS_COSTS.kinesis.shardHourProvisioned * HOURS_PER_MONTH
  const putCost = shardCount * AWS_COSTS.kinesis.perShardHour * HOURS_PER_MONTH
  return shardCost + putCost
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
