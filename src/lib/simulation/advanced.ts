import type { Node } from '@xyflow/react'
import type {
  AWSServiceType,
  ServiceConfig,
  TrafficProfile,
  LatencyBreakdownResult,
  ServiceLatencyEntry,
  ScalabilityResult,
  ScalabilityServiceEntry,
  OperationalCostBreakdown,
  CostCategory,
  CostCategoryEntry,
  AdvancedResult,
} from '@/types'
import { AWS_LATENCIES } from '@/lib/constants/latencies'
import {
  calculateECSMonthlyCost,
  calculateEKSMonthlyCost,
  calculateEC2MonthlyCost,
  calculateLambdaMonthlyCost,
  calculateRDSMonthlyCost,
  calculateElastiCacheMonthlyCost,
  calculateSQSMonthlyCost,
  calculateSNSMonthlyCost,
  calculateKinesisMonthlyCost,
} from '@/lib/costs/calculator'
import { AWS_COSTS } from '@/lib/constants/costs'
import { getNodeConfig, getServiceType, isFlowNode } from './node-helpers'

// --- Latency Breakdown ---

function getLatencyRange(serviceType: AWSServiceType, config: ServiceConfig): {
  readonly min: number
  readonly base: number
  readonly max: number
} {
  const known = AWS_LATENCIES[serviceType as keyof typeof AWS_LATENCIES]
  if (known) {
    return known
  }
  return { min: 0, base: config.latency.base, max: config.latency.base * 2 }
}

export function calculateLatencyBreakdown(
  orderedNodes: readonly Node[],
  _traffic: TrafficProfile,
): LatencyBreakdownResult {
  const flowNodes = orderedNodes.filter(isFlowNode)

  const perService: ServiceLatencyEntry[] = flowNodes.map((node) => {
    const serviceType = getServiceType(node)
    const config = getNodeConfig(node)
    const range = getLatencyRange(serviceType, config)

    const p50 = range.min + (range.base - range.min) * 0.6
    const p99 = range.base + (range.max - range.base) * 0.9

    return {
      service: config.name,
      serviceType,
      baseMs: range.base,
      p50Ms: Math.round(p50 * 100) / 100,
      p99Ms: Math.round(p99 * 100) / 100,
    }
  })

  const totalP50 = Math.round(perService.reduce((sum, e) => sum + e.p50Ms, 0) * 100) / 100
  const totalP99 = Math.round(perService.reduce((sum, e) => sum + e.p99Ms, 0) * 100) / 100

  return { perService, totalP50, totalP99 }
}

// --- Scalability ---

type ComputeServiceType = 'ecs' | 'eks' | 'ec2' | 'lambda' | 'api-gateway'

const COMPUTE_SERVICES = new Set<AWSServiceType>(['ecs', 'eks', 'ec2', 'lambda', 'api-gateway'])

function isComputeService(serviceType: AWSServiceType): serviceType is ComputeServiceType {
  return COMPUTE_SERVICES.has(serviceType)
}

function calculateServiceMaxRPS(
  serviceType: ComputeServiceType,
  specific: Record<string, unknown>,
  latencyBase: number,
): { readonly maxRPS: number; readonly isFargate: boolean; readonly autoScaling: boolean } {
  const effectiveLatency = Math.max(latencyBase, 1)

  switch (serviceType) {
    case 'ecs': {
      const autoScaling = specific.autoScaling as { enabled: boolean; max: number } | undefined
      const taskCount = (specific.taskCount as number) ?? 2
      const isFargate = specific.launchType === 'fargate'

      if (autoScaling?.enabled) {
        return {
          maxRPS: autoScaling.max * (1000 / effectiveLatency),
          isFargate,
          autoScaling: true,
        }
      }
      return {
        maxRPS: taskCount * (1000 / effectiveLatency),
        isFargate,
        autoScaling: false,
      }
    }
    case 'eks': {
      const autoScaling = specific.autoScaling as { enabled: boolean; max: number } | undefined
      const nodeCount = (specific.nodeCount as number) ?? 2
      const isFargate = specific.nodeGroupType === 'fargate'

      if (autoScaling?.enabled) {
        return {
          maxRPS: autoScaling.max * (1000 / effectiveLatency),
          isFargate,
          autoScaling: true,
        }
      }
      return {
        maxRPS: nodeCount * (1000 / effectiveLatency),
        isFargate,
        autoScaling: false,
      }
    }
    case 'ec2': {
      const instanceCount = (specific.instanceCount as number) ?? 1
      const hasAutoScaling = specific.autoScaling === true
      return {
        maxRPS: instanceCount * (1000 / effectiveLatency),
        isFargate: false,
        autoScaling: hasAutoScaling,
      }
    }
    case 'lambda': {
      const concurrency = (specific.concurrency as number) ?? 100
      return {
        maxRPS: concurrency,
        isFargate: false,
        autoScaling: true,
      }
    }
    case 'api-gateway': {
      const throttlingRate = (specific.throttlingRate as number) ?? 10000
      return {
        maxRPS: throttlingRate,
        isFargate: false,
        autoScaling: true,
      }
    }
  }
}

export function calculateScalability(
  orderedNodes: readonly Node[],
  traffic: TrafficProfile,
): ScalabilityResult {
  const flowNodes = orderedNodes.filter(isFlowNode)
  const computeNodes = flowNodes.filter((n) => isComputeService(getServiceType(n)))

  if (computeNodes.length === 0) {
    return {
      bottleneckService: null,
      maxRPS: 0,
      headroomPercent: 0,
      autoScalingEnabled: false,
      perService: [],
    }
  }

  const entries = computeNodes.map((node) => {
    const serviceType = getServiceType(node) as ComputeServiceType
    const config = getNodeConfig(node)
    const specific = (config.specific as Record<string, unknown>) ?? {}
    const result = calculateServiceMaxRPS(serviceType, specific, config.latency.base)

    return {
      entry: {
        service: config.name,
        currentCapacity: traffic.requestsPerSecond,
        maxCapacity: Math.round(result.maxRPS),
        isFargate: result.isFargate,
      } satisfies ScalabilityServiceEntry,
      maxRPS: result.maxRPS,
      autoScaling: result.autoScaling,
      serviceName: config.name,
    }
  })

  const bottleneck = entries.reduce((min, e) => (e.maxRPS < min.maxRPS ? e : min))
  const overallAutoScaling = entries.every((e) => e.autoScaling)
  const maxRPS = Math.round(bottleneck.maxRPS)
  const headroomPercent =
    maxRPS > 0
      ? Math.max(0, Math.round(((maxRPS - traffic.requestsPerSecond) / maxRPS) * 100))
      : 0

  return {
    bottleneckService: bottleneck.serviceName,
    maxRPS,
    headroomPercent,
    autoScalingEnabled: overallAutoScaling,
    perService: entries.map((e) => e.entry),
  }
}

// --- Operational Cost Breakdown ---

function classifyServiceCategory(serviceType: AWSServiceType): CostCategory {
  switch (serviceType) {
    case 'ecs':
    case 'eks':
    case 'ec2':
    case 'lambda':
      return 'compute'
    case 'rds':
    case 's3':
    case 'dynamodb':
    case 'elasticache':
      return 'storage'
    case 'cloudfront':
    case 'nat-gateway':
      return 'dataTransfer'
    case 'route53':
    case 'api-gateway':
    case 'sqs':
    case 'sns':
    case 'kinesis':
    case 'waf':
    case 'shield':
    case 'alb':
    case 'nlb':
    default:
      return 'requests'
  }
}

function calculateDetailedServiceCost(
  serviceType: AWSServiceType,
  config: ServiceConfig,
  traffic: TrafficProfile,
): number {
  const specific = (config.specific as Record<string, unknown>) ?? {}

  switch (serviceType) {
    case 'ecs': {
      return calculateECSMonthlyCost(
        (specific.launchType as string) ?? 'fargate',
        (specific.taskCount as number) ?? 2,
        (specific.cpu as number) ?? 0.25,
        (specific.memory as number) ?? 0.5,
      )
    }
    case 'eks': {
      return calculateEKSMonthlyCost(
        (specific.nodeGroupType as string) ?? 'managed',
        (specific.nodeCount as number) ?? 2,
        (specific.instanceType as string) ?? 't3.medium',
      )
    }
    case 'ec2': {
      return calculateEC2MonthlyCost(
        (specific.instanceType as string) ?? 't3.micro',
        (specific.instanceCount as number) ?? 1,
      )
    }
    case 'lambda': {
      return calculateLambdaMonthlyCost((specific.memoryMB as number) ?? 128)
    }
    case 'rds': {
      return calculateRDSMonthlyCost(
        (specific.instanceClass as string) ?? 'db.t3.micro',
        (specific.multiAZ as boolean) ?? false,
        (specific.readReplicas as number) ?? 0,
        (specific.storageGB as number) ?? 20,
      )
    }
    case 'elasticache': {
      return calculateElastiCacheMonthlyCost(
        (specific.nodeType as string) ?? 'cache.t3.micro',
        (specific.numNodes as number) ?? 1,
      )
    }
    case 'dynamodb': {
      const requestsPerMonth = traffic.requestsPerSecond * 30 * 24 * 3600
      const millions = requestsPerMonth / 1_000_000
      const readCost = millions * traffic.readWriteRatio * AWS_COSTS.dynamodb.perMillionReadUnits
      const writeCost = millions * (1 - traffic.readWriteRatio) * AWS_COSTS.dynamodb.perMillionWriteUnits
      return readCost + writeCost
    }
    case 'sqs': {
      return calculateSQSMonthlyCost((specific.queueType as string) ?? 'standard')
    }
    case 'sns': {
      return calculateSNSMonthlyCost((specific.subscriptionCount as number) ?? 1)
    }
    case 'kinesis': {
      return calculateKinesisMonthlyCost(
        (specific.streamMode as string) ?? 'on-demand',
        (specific.shardCount as number) ?? 1,
      )
    }
    case 's3': {
      const requestsPerMonth = traffic.requestsPerSecond * 30 * 24 * 3600
      const dataGB = (requestsPerMonth * traffic.averagePayloadSize) / (1024 * 1024)
      return dataGB * AWS_COSTS.s3.perGBPerMonth
    }
    case 'cloudfront': {
      const requestsPerMonth = traffic.requestsPerSecond * 30 * 24 * 3600
      const dataGB = (requestsPerMonth * traffic.averagePayloadSize) / (1024 * 1024)
      return dataGB * AWS_COSTS.cloudfront.perGBFirst10TB
    }
    default: {
      const requestsPerMonth = traffic.requestsPerSecond * 30 * 24 * 3600
      const perRequestCost = (config.cost.perRequest ?? 0) * requestsPerMonth
      const monthlyCost = config.cost.monthly ?? 0
      return perRequestCost + monthlyCost
    }
  }
}

export function calculateCostBreakdown(
  orderedNodes: readonly Node[],
  traffic: TrafficProfile,
): OperationalCostBreakdown {
  const flowNodes = orderedNodes.filter(isFlowNode)

  const perService: CostCategoryEntry[] = flowNodes.map((node) => {
    const serviceType = getServiceType(node)
    const config = getNodeConfig(node)
    const category = classifyServiceCategory(serviceType)
    const amount = calculateDetailedServiceCost(serviceType, config, traffic)

    return { service: config.name, category, amount }
  })

  const compute = perService
    .filter((e) => e.category === 'compute')
    .reduce((sum, e) => sum + e.amount, 0)
  const storage = perService
    .filter((e) => e.category === 'storage')
    .reduce((sum, e) => sum + e.amount, 0)
  const dataTransfer = perService
    .filter((e) => e.category === 'dataTransfer')
    .reduce((sum, e) => sum + e.amount, 0)
  const requests = perService
    .filter((e) => e.category === 'requests')
    .reduce((sum, e) => sum + e.amount, 0)

  return {
    compute: Math.round(compute * 100) / 100,
    storage: Math.round(storage * 100) / 100,
    dataTransfer: Math.round(dataTransfer * 100) / 100,
    requests: Math.round(requests * 100) / 100,
    perService,
  }
}

// --- Main Advanced Entry Point ---

export function calculateAdvancedResults(
  orderedNodes: readonly Node[],
  traffic: TrafficProfile,
): AdvancedResult {
  return {
    latencyBreakdown: calculateLatencyBreakdown(orderedNodes, traffic),
    scalability: calculateScalability(orderedNodes, traffic),
    operationalCost: calculateCostBreakdown(orderedNodes, traffic),
  }
}
