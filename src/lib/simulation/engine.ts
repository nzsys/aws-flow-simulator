import type {
  SimulationResult,
  TrafficProfile,
  PerformanceResult,
  CostResult,
  SecurityResult,
  AvailabilityResult,
  AWSServiceType,
  ServiceConfig,
} from '@/types'
import type { Node, Edge } from '@xyflow/react'
import { validateArchitecture } from '@/lib/validation/validator'
import { calculateAdvancedResults } from './advanced'
import { getNodeData, getNodeConfig, getServiceType, isFlowNode } from './node-helpers'
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
  calculateALBMonthlyCost,
  calculateNLBMonthlyCost,
  calculateCloudFrontMonthlyCost,
  calculateS3MonthlyCost,
  calculateAPIGatewayMonthlyCost,
  calculateDynamoDBMonthlyCost,
  calculateWAFMonthlyCost,
  calculateShieldMonthlyCost,
  calculateRoute53MonthlyCost,
  calculateNATGatewayMonthlyCost,
} from '@/lib/costs/calculator'

export type SimulationOptions = {
  readonly advancedMode?: boolean
}

// --- Topological Sort ---

function buildAdjacencyList(edges: readonly Edge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>()

  for (const edge of edges) {
    const existing = adjacency.get(edge.source) ?? []
    adjacency.set(edge.source, [...existing, edge.target])

    if (!adjacency.has(edge.target)) {
      adjacency.set(edge.target, [])
    }
  }

  return adjacency
}

function findInDegrees(nodes: readonly Node[], edges: readonly Edge[]): Map<string, number> {
  const inDegrees = new Map<string, number>()

  for (const node of nodes) {
    inDegrees.set(node.id, 0)
  }

  for (const edge of edges) {
    const current = inDegrees.get(edge.target) ?? 0
    inDegrees.set(edge.target, current + 1)
  }

  return inDegrees
}

export function topologicalSort(nodes: readonly Node[], edges: readonly Edge[]): Node[] {
  const adjacency = buildAdjacencyList(edges)
  const inDegrees = findInDegrees(nodes, edges)
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const queue: string[] = []
  for (const [id, degree] of inDegrees) {
    if (degree === 0) {
      queue.push(id)
    }
  }

  const sorted: Node[] = []
  const remaining = new Map(inDegrees)

  while (queue.length > 0) {
    const current = queue.shift()!
    const node = nodeMap.get(current)
    if (node) {
      sorted.push(node)
    }

    const neighbors = adjacency.get(current) ?? []
    for (const neighbor of neighbors) {
      const updatedDegree = (remaining.get(neighbor) ?? 1) - 1
      remaining.set(neighbor, updatedDegree)
      if (updatedDegree === 0) {
        queue.push(neighbor)
      }
    }
  }

  return sorted
}

const SECURE_PROTOCOLS = new Set(['https', 'http', 'tcp', 'udp', 'dns', 'invoke', 'inline'])

function isEdgeSecure(edge: Edge): boolean {
  const data = edge.data as Record<string, unknown> | undefined
  const protocol = data?.protocol ?? (edge as unknown as Record<string, unknown>).protocol
  if (typeof protocol !== 'string') return true
  return SECURE_PROTOCOLS.has(protocol)
}

// --- Performance Calculation ---

export function calculatePerformance(
  orderedNodes: readonly Node[],
  traffic: TrafficProfile,
): PerformanceResult {
  const flowNodes = orderedNodes.filter(isFlowNode)
  const totalRequests = traffic.requestsPerSecond

  const { totalLatency, remainingRequests } = flowNodes.reduce(
    (acc, node) => {
      const config = getNodeConfig(node)
      const nodeLatency = config.latency.base

      const cacheReduction =
        config.cache?.enabled && config.cache.hitRate
          ? acc.remainingRequests * config.cache.hitRate
          : 0

      return {
        totalLatency: acc.totalLatency + nodeLatency,
        remainingRequests: acc.remainingRequests - cacheReduction,
      }
    },
    { totalLatency: 0, remainingRequests: totalRequests },
  )

  const firstNodeConfig = flowNodes.length > 0 ? getNodeConfig(flowNodes[0]) : null

  return {
    totalLatency,
    p50Latency: totalLatency * 0.9,
    p99Latency: totalLatency * 1.8,
    ttfb: firstNodeConfig ? firstNodeConfig.latency.base : 0,
    cacheHitRate: totalRequests > 0 ? 1 - remainingRequests / totalRequests : 0,
    requestsReachingOrigin: remainingRequests,
  }
}

// --- Cost Calculation ---

function calculateServiceCostByType(
  serviceType: AWSServiceType,
  config: ServiceConfig,
  specific: Record<string, unknown>,
  requestsPerMonth: number,
  dataTransferGB: number,
  traffic: TrafficProfile,
): number {
  switch (serviceType) {
    case 'route53':
      return calculateRoute53MonthlyCost(requestsPerMonth)
    case 'cloudfront':
      return calculateCloudFrontMonthlyCost(requestsPerMonth, dataTransferGB)
    case 'alb':
      return calculateALBMonthlyCost(requestsPerMonth, dataTransferGB)
    case 'nlb':
      return calculateNLBMonthlyCost(requestsPerMonth, dataTransferGB)
    case 'api-gateway':
      return calculateAPIGatewayMonthlyCost(
        (specific.apiType as string) ?? 'rest',
        requestsPerMonth,
        (specific.cachingEnabled as boolean) ?? false,
      )
    case 'ecs':
      return calculateECSMonthlyCost(
        (specific.launchType as string) ?? 'fargate',
        (specific.taskCount as number) ?? 2,
        (specific.cpu as number) ?? 0.25,
        (specific.memory as number) ?? 0.5,
      )
    case 'eks':
      return calculateEKSMonthlyCost(
        (specific.nodeGroupType as string) ?? 'managed',
        (specific.nodeCount as number) ?? 2,
        (specific.instanceType as string) ?? 't3.medium',
      )
    case 'ec2':
      return calculateEC2MonthlyCost(
        (specific.instanceType as string) ?? 't3.micro',
        (specific.instanceCount as number) ?? 1,
      )
    case 'lambda':
      return calculateLambdaMonthlyCost(
        (specific.memoryMB as number) ?? 128,
        requestsPerMonth,
        (specific.avgDurationMs as number) ?? 200,
      )
    case 's3':
      return calculateS3MonthlyCost(requestsPerMonth, 0, traffic.readWriteRatio)
    case 'rds':
      return calculateRDSMonthlyCost(
        (specific.instanceClass as string) ?? 'db.t3.micro',
        (specific.multiAZ as boolean) ?? false,
        (specific.readReplicas as number) ?? 0,
        (specific.storageGB as number) ?? 20,
      )
    case 'dynamodb':
      return calculateDynamoDBMonthlyCost(
        (specific.capacityMode as string) ?? 'on-demand',
        requestsPerMonth,
        traffic.readWriteRatio,
        (specific.readCapacityUnits as number) ?? 5,
        (specific.writeCapacityUnits as number) ?? 5,
        (specific.storageGB as number) ?? 50,
      )
    case 'elasticache':
      return calculateElastiCacheMonthlyCost(
        (specific.nodeType as string) ?? 'cache.t3.micro',
        (specific.numNodes as number) ?? 1,
      )
    case 'sqs':
      return calculateSQSMonthlyCost(
        (specific.queueType as string) ?? 'standard',
        requestsPerMonth,
      )
    case 'sns':
      return calculateSNSMonthlyCost(
        (specific.subscriptionCount as number) ?? 1,
        requestsPerMonth,
      )
    case 'kinesis':
      return calculateKinesisMonthlyCost(
        (specific.streamMode as string) ?? 'on-demand',
        (specific.shardCount as number) ?? 1,
        dataTransferGB,
      )
    case 'waf':
      return calculateWAFMonthlyCost(
        (specific.ruleCount as number) ?? 10,
        requestsPerMonth,
      )
    case 'shield':
      return calculateShieldMonthlyCost((specific.tier as string) ?? 'standard')
    case 'nat-gateway':
      return calculateNATGatewayMonthlyCost(dataTransferGB)
    default: {
      // Infrastructure types (vpc, subnet, security-group, internet-gateway)
      // are normally filtered by isFlowNode before reaching here.
      const perRequestCost = (config.cost.perRequest ?? 0) * requestsPerMonth
      const perGBCost = (config.cost.perGB ?? 0) * dataTransferGB
      const monthlyCost = config.cost.monthly ?? 0
      return perRequestCost + perGBCost + monthlyCost
    }
  }
}

function calculateNodeCost(
  node: Node,
  effectiveRequestsPerSecond: number,
  traffic: TrafficProfile,
): { readonly amount: number; readonly remainingFactor: number } {
  const config = getNodeConfig(node)
  const serviceType = getServiceType(node)
  const specific = (config.specific as Record<string, unknown>) ?? {}

  const requestsPerMonth = effectiveRequestsPerSecond * 30 * 24 * 3600
  const dataTransferGB = (requestsPerMonth * traffic.averagePayloadSize) / (1024 * 1024)

  const totalCost = calculateServiceCostByType(
    serviceType, config, specific, requestsPerMonth, dataTransferGB, traffic,
  )

  const cacheFactor =
    config.cache?.enabled && config.cache.hitRate ? 1 - config.cache.hitRate : 1

  return {
    amount: totalCost,
    remainingFactor: cacheFactor,
  }
}

export function calculateCost(
  orderedNodes: readonly Node[],
  traffic: TrafficProfile,
): CostResult {
  const flowNodes = orderedNodes.filter(isFlowNode)

  const { breakdown, totalMonthly } = flowNodes.reduce(
    (acc, node) => {
      const { amount, remainingFactor } = calculateNodeCost(node, acc.effectiveRPS, traffic)

      const config = getNodeConfig(node)

      return {
        breakdown: [...acc.breakdown, { service: config.name, amount }],
        totalMonthly: acc.totalMonthly + amount,
        effectiveRPS: acc.effectiveRPS * remainingFactor,
      }
    },
    {
      breakdown: [] as { service: string; amount: number }[],
      totalMonthly: 0,
      effectiveRPS: traffic.requestsPerSecond,
    },
  )

  const requestsPerMonth = traffic.requestsPerSecond * 30 * 24 * 3600
  const perRequest = requestsPerMonth > 0 ? totalMonthly / requestsPerMonth : 0

  return {
    monthly: totalMonthly,
    perRequest,
    breakdown,
  }
}

// --- Security Analysis ---

export function analyzeSecurity(orderedNodes: readonly Node[], edges: readonly Edge[]): SecurityResult {
  const flowNodes = orderedNodes.filter(isFlowNode)

  const ddosProtection = flowNodes.some(
    (node) => getNodeConfig(node).security?.ddosProtection === true,
  )

  const wafEnabled = flowNodes.some((node) => getNodeConfig(node).security?.waf === true)

  const encryptionInTransit = edges.length === 0 || edges.every(isEdgeSecure)

  const storageAndDbTypes: AWSServiceType[] = ['s3', 'rds', 'elasticache', 'dynamodb']

  const storageNodes = flowNodes.filter((node) =>
    storageAndDbTypes.includes(getServiceType(node)),
  )

  const encryptionAtRest =
    storageNodes.length === 0 ||
    storageNodes.every((node) => getNodeConfig(node).security?.encryption === true)

  const hasVPC = orderedNodes.some((node) => getServiceType(node) === 'vpc')
  const hasPrivateSubnet = orderedNodes.some((node) => {
    if (getServiceType(node) !== 'subnet') return false
    const data = getNodeData(node)
    const specific = data.config.specific as Record<string, unknown> | undefined
    return specific?.subnetType === 'private'
  })

  const baseFeatures = [
    ddosProtection ? 20 : 0,
    wafEnabled ? 20 : 0,
    encryptionInTransit ? 20 : 0,
    encryptionAtRest ? 20 : 0,
  ]

  const infraBonus = hasVPC && hasPrivateSubnet ? 20 : hasVPC ? 10 : 0
  const score = Math.min(100, baseFeatures.reduce((sum, s) => sum + s, 0) + infraBonus)

  return {
    ddosProtection,
    wafEnabled,
    encryptionInTransit,
    encryptionAtRest,
    score,
  }
}

// --- Availability Analysis ---

function isNodeRedundant(node: Node): boolean {
  const serviceType = getServiceType(node)
  const config = getNodeConfig(node)
  const specific = config.specific as Record<string, unknown> | undefined

  if (!specific) {
    return false
  }

  switch (serviceType) {
    case 'ecs':
      return ((specific.taskCount as number) ?? 1) > 1
    case 'eks':
      return ((specific.nodeCount as number) ?? 1) > 1
    case 'rds':
      return specific.multiAZ === true || ((specific.readReplicas as number) ?? 0) > 0
    case 'alb':
    case 'nlb':
      return ((specific.targetCount as number) ?? 1) > 1
    case 'cloudfront':
    case 'route53':
    case 's3':
    case 'dynamodb':
      return true // inherently distributed/redundant
    case 'ec2':
      return ((specific.instanceCount as number) ?? 1) > 1
    case 'lambda':
      return true // inherently redundant
    case 'elasticache':
      return ((specific.numNodes as number) ?? 1) > 1
    case 'sqs':
    case 'sns':
    case 'kinesis':
      return true // AWS managed, inherently redundant
    default:
      return false
  }
}

export function analyzeAvailability(orderedNodes: readonly Node[]): AvailabilityResult {
  const flowNodes = orderedNodes.filter(isFlowNode)

  if (flowNodes.length === 0) {
    return {
      singlePointsOfFailure: [],
      redundancyScore: 100,
      estimatedUptime: 0.9999,
    }
  }

  const singlePointsOfFailure = flowNodes
    .filter((node) => !isNodeRedundant(node))
    .map((node) => getNodeConfig(node).name)

  const redundantCount = flowNodes.filter(isNodeRedundant).length
  const redundancyScore = Math.round((redundantCount / flowNodes.length) * 100)

  const baseUptime = 0.99
  const maxUptime = 0.9999
  const uptimeRange = maxUptime - baseUptime
  const estimatedUptime = baseUptime + uptimeRange * (redundancyScore / 100)

  return {
    singlePointsOfFailure,
    redundancyScore,
    estimatedUptime: Math.round(estimatedUptime * 10000) / 10000,
  }
}

// --- Main Simulation Entry Point ---

export function runSimulation(
  nodes: readonly Node[],
  edges: readonly Edge[],
  traffic: TrafficProfile,
  options?: SimulationOptions,
): SimulationResult {
  const orderedNodes = topologicalSort(nodes, edges)

  const performance = calculatePerformance(orderedNodes, traffic)
  const cost = calculateCost(orderedNodes, traffic)
  const security = analyzeSecurity(orderedNodes, edges)
  const availability = analyzeAvailability(orderedNodes)
  const validation = validateArchitecture(
    nodes.map((n) => ({
      id: n.id,
      data: {
        serviceType: getServiceType(n),
        parentId: (n as unknown as Record<string, unknown>).parentId as string | undefined,
      },
    })),
    edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  )

  const advanced = options?.advancedMode
    ? calculateAdvancedResults(orderedNodes, traffic)
    : undefined

  return {
    performance,
    cost,
    security,
    availability,
    validation,
    advanced,
  }
}
