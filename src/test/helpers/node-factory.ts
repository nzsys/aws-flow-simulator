import type { Node, Edge } from '@xyflow/react'
import { SERVICE_DEFINITIONS } from '@/lib/constants/services'
import type { AWSServiceType, ServiceConfig } from '@/types'

let idCounter = 0

export function resetIdCounter() {
  idCounter = 0
}

export function createTestNode(
  serviceType: AWSServiceType,
  overrides?: {
    id?: string
    config?: Partial<ServiceConfig>
    position?: { x: number; y: number }
  },
): Node {
  idCounter++
  const definition = SERVICE_DEFINITIONS[serviceType]
  const id = overrides?.id ?? `node-${idCounter}`
  const config = {
    ...definition.defaultConfig,
    ...overrides?.config,
  }

  return {
    id,
    type: 'awsService',
    position: overrides?.position ?? { x: 0, y: idCounter * 100 },
    data: {
      serviceType,
      config,
      label: definition.label,
    },
  }
}

export function createTestEdge(
  source: string,
  target: string,
  overrides?: {
    id?: string
    protocol?: string
  },
): Edge {
  idCounter++
  return {
    id: overrides?.id ?? `edge-${idCounter}`,
    source,
    target,
    type: 'flow',
    ...(overrides?.protocol ? { data: { protocol: overrides.protocol } } : {}),
  }
}

export function createTestTrafficProfile(overrides?: {
  requestsPerSecond?: number
  averagePayloadSize?: number
  readWriteRatio?: number
}) {
  return {
    requestsPerSecond: overrides?.requestsPerSecond ?? 100,
    averagePayloadSize: overrides?.averagePayloadSize ?? 10,
    readWriteRatio: overrides?.readWriteRatio ?? 0.2,
    geoDistribution: [{ region: 'us-east-1', percentage: 100 }],
  }
}

export function createTypicalArchitecture() {
  const route53 = createTestNode('route53', { id: 'route53' })
  const cloudfront = createTestNode('cloudfront', { id: 'cloudfront' })
  const alb = createTestNode('alb', { id: 'alb' })
  const ecs = createTestNode('ecs', { id: 'ecs' })
  const rds = createTestNode('rds', { id: 'rds' })

  const nodes = [route53, cloudfront, alb, ecs, rds]

  const edges = [
    createTestEdge('route53', 'cloudfront', { id: 'e1' }),
    createTestEdge('cloudfront', 'alb', { id: 'e2' }),
    createTestEdge('alb', 'ecs', { id: 'e3' }),
    createTestEdge('ecs', 'rds', { id: 'e4' }),
  ]

  return { nodes, edges }
}
