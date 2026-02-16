import type { AWSServiceType } from '@/types'
import { INFRASTRUCTURE_SERVICES } from '@/lib/constants/services'
import { ALLOWED_TARGETS, SUBOPTIMAL_CONNECTIONS } from './rules'

export type ValidationSeverity = 'error' | 'warning' | 'info'

export type ValidationCategory = 'connection' | 'placement' | 'dependency' | 'viability'

export type ValidationIssue = {
  readonly severity: ValidationSeverity
  readonly category: ValidationCategory
  readonly message: string
  readonly nodeIds: readonly string[]
}

export type ValidationResult = {
  readonly issues: readonly ValidationIssue[]
  readonly isValid: boolean
  readonly errorCount: number
  readonly warningCount: number
  readonly infoCount: number
}

type FlowNode = {
  readonly id: string
  readonly data: {
    readonly serviceType: AWSServiceType
    readonly parentId?: string
  }
}

type FlowEdge = {
  readonly id: string
  readonly source: string
  readonly target: string
}

export function validateArchitecture(
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[],
): ValidationResult {
  const issues: ValidationIssue[] = []

  const connectionIssues = validateConnections(nodes, edges)
  const placementIssues = validatePlacements(nodes)
  const dependencyIssues = validateDependencies(nodes)
  const viabilityIssues = validateViability(nodes, edges)

  issues.push(...connectionIssues, ...placementIssues, ...dependencyIssues, ...viabilityIssues)

  const errorCount = issues.filter((i) => i.severity === 'error').length
  const warningCount = issues.filter((i) => i.severity === 'warning').length
  const infoCount = issues.filter((i) => i.severity === 'info').length

  return {
    issues,
    isValid: errorCount === 0,
    errorCount,
    warningCount,
    infoCount,
  }
}

function validateConnections(
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[],
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source)
    const targetNode = nodeMap.get(edge.target)

    if (!sourceNode || !targetNode) {
      continue
    }

    const sourceType = sourceNode.data.serviceType
    const targetType = targetNode.data.serviceType

    const allowedTargets = ALLOWED_TARGETS[sourceType]
    if (allowedTargets && !allowedTargets.includes(targetType)) {
      issues.push({
        severity: 'error',
        category: 'connection',
        message: `${sourceType} cannot connect to ${targetType}`,
        nodeIds: [edge.source, edge.target],
      })
    }

    const suboptimalKey = `${sourceType}->${targetType}`
    const suboptimalMessage = SUBOPTIMAL_CONNECTIONS[suboptimalKey]
    if (suboptimalMessage) {
      issues.push({
        severity: 'warning',
        category: 'connection',
        message: suboptimalMessage,
        nodeIds: [edge.source, edge.target],
      })
    }
  }

  return issues
}

function validatePlacements(nodes: readonly FlowNode[]): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const { PLACEMENT_RULES } = getPlacementRules()

  for (const node of nodes) {
    const rule = PLACEMENT_RULES[node.data.serviceType]
    if (!rule) {
      continue
    }

    if (rule.requiresPrivateSubnet && !node.data.parentId) {
      issues.push({
        severity: 'warning',
        category: 'placement',
        message: `${node.data.serviceType} should be in a private subnet for security`,
        nodeIds: [node.id],
      })
    }
  }

  return issues
}

function validateDependencies(nodes: readonly FlowNode[]): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const serviceTypes = new Set(nodes.map((n) => n.data.serviceType))

  const { DEPENDENCY_RULES } = getDependencyRules()

  for (const node of nodes) {
    const deps = DEPENDENCY_RULES[node.data.serviceType]
    if (!deps) {
      continue
    }

    for (const required of deps) {
      if (!serviceTypes.has(required)) {
        issues.push({
          severity: 'warning',
          category: 'dependency',
          message: `${node.data.serviceType} typically requires ${required}`,
          nodeIds: [node.id],
        })
      }
    }
  }

  return issues
}

function getPlacementRules(): {
  PLACEMENT_RULES: Partial<Record<AWSServiceType, { requiresPrivateSubnet: boolean }>>
} {
  return {
    PLACEMENT_RULES: {
      rds: { requiresPrivateSubnet: true },
      elasticache: { requiresPrivateSubnet: true },
      dynamodb: { requiresPrivateSubnet: false },
      ecs: { requiresPrivateSubnet: true },
      eks: { requiresPrivateSubnet: true },
      ec2: { requiresPrivateSubnet: true },
      sqs: { requiresPrivateSubnet: false },
      sns: { requiresPrivateSubnet: false },
      kinesis: { requiresPrivateSubnet: false },
    },
  }
}

function getDependencyRules(): {
  DEPENDENCY_RULES: Partial<Record<AWSServiceType, readonly AWSServiceType[]>>
} {
  return {
    DEPENDENCY_RULES: {
      'nat-gateway': ['internet-gateway'],
      subnet: ['vpc'],
      'security-group': ['vpc'],
    },
  }
}

const ENTRY_POINT_TYPES: readonly AWSServiceType[] = [
  'route53',
  'cloudfront',
  'api-gateway',
  'alb',
  'nlb',
]

const COMPUTE_TYPES: readonly AWSServiceType[] = ['ecs', 'eks', 'ec2', 'lambda']

const DATABASE_TYPES: readonly AWSServiceType[] = ['rds', 'dynamodb', 'elasticache']

function validateViability(
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[],
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const flowNodes = nodes.filter((n) => !INFRASTRUCTURE_SERVICES.includes(n.data.serviceType))

  if (flowNodes.length === 0) {
    return issues
  }

  const serviceTypes = new Set(flowNodes.map((n) => n.data.serviceType))

  const hasEntryPoint = ENTRY_POINT_TYPES.some((t) => serviceTypes.has(t))
  if (!hasEntryPoint) {
    issues.push({
      severity: 'warning',
      category: 'viability',
      message:
        'No entry point found. Add Route 53, CloudFront, API Gateway, ALB, or NLB as an entry point.',
      nodeIds: [],
    })
  }

  const hasDatabase = DATABASE_TYPES.some((t) => serviceTypes.has(t))
  const hasCompute = COMPUTE_TYPES.some((t) => serviceTypes.has(t))
  if (hasDatabase && !hasCompute) {
    const dbNodeIds = flowNodes
      .filter((n) => DATABASE_TYPES.includes(n.data.serviceType))
      .map((n) => n.id)
    issues.push({
      severity: 'warning',
      category: 'viability',
      message:
        'Database services found without a compute layer. Add ECS, EC2, or Lambda to process requests.',
      nodeIds: dbNodeIds,
    })
  }

  if (hasEntryPoint && flowNodes.length > 1) {
    const adjacency = new Map<string, string[]>()
    for (const node of flowNodes) {
      adjacency.set(node.id, [])
    }
    for (const edge of edges) {
      const neighbors = adjacency.get(edge.source)
      if (neighbors) {
        neighbors.push(edge.target)
      }
    }

    const entryNodes = flowNodes.filter((n) =>
      ENTRY_POINT_TYPES.includes(n.data.serviceType),
    )
    const reachable = new Set<string>()
    const queue = entryNodes.map((n) => n.id)
    for (const id of queue) {
      reachable.add(id)
    }

    while (queue.length > 0) {
      const current = queue.shift()!
      const neighbors = adjacency.get(current) ?? []
      for (const neighbor of neighbors) {
        if (!reachable.has(neighbor)) {
          reachable.add(neighbor)
          queue.push(neighbor)
        }
      }
    }

    const backendTypes: readonly AWSServiceType[] = [...COMPUTE_TYPES, ...DATABASE_TYPES, 's3']
    const unreachableBackends = flowNodes.filter(
      (n) =>
        backendTypes.includes(n.data.serviceType) && !reachable.has(n.id),
    )

    if (unreachableBackends.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'viability',
        message: `${unreachableBackends.length} backend service(s) unreachable from entry points. Check connections.`,
        nodeIds: unreachableBackends.map((n) => n.id),
      })
    }
  }

  const connectedNodeIds = new Set<string>()
  for (const edge of edges) {
    connectedNodeIds.add(edge.source)
    connectedNodeIds.add(edge.target)
  }

  const isolatedNodes = flowNodes.filter((n) => !connectedNodeIds.has(n.id))
  for (const node of isolatedNodes) {
    issues.push({
      severity: 'info',
      category: 'viability',
      message: `${node.data.serviceType} is isolated with no connections.`,
      nodeIds: [node.id],
    })
  }

  return issues
}
