import { describe, it, expect, beforeEach } from 'vitest'
import {
  topologicalSort,
  calculatePerformance,
  calculateCost,
  analyzeSecurity,
  analyzeAvailability,
  runSimulation,
} from './engine'
import {
  createTestNode,
  createTestEdge,
  createTestTrafficProfile,
  createTypicalArchitecture,
  resetIdCounter,
} from '@/test/helpers/node-factory'

beforeEach(() => {
  resetIdCounter()
})

describe('topologicalSort', () => {
  it('should return nodes in topological order', () => {
    const a = createTestNode('route53', { id: 'a' })
    const b = createTestNode('cloudfront', { id: 'b' })
    const c = createTestNode('alb', { id: 'c' })
    const edges = [createTestEdge('a', 'b'), createTestEdge('b', 'c')]

    const sorted = topologicalSort([a, b, c], edges)

    const ids = sorted.map((n) => n.id)
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'))
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('c'))
  })

  it('should handle nodes with no edges', () => {
    const a = createTestNode('route53', { id: 'a' })
    const b = createTestNode('cloudfront', { id: 'b' })

    const sorted = topologicalSort([a, b], [])
    expect(sorted).toHaveLength(2)
  })

  it('should handle single node', () => {
    const a = createTestNode('route53', { id: 'a' })
    const sorted = topologicalSort([a], [])
    expect(sorted).toHaveLength(1)
    expect(sorted[0].id).toBe('a')
  })

  it('should handle empty inputs', () => {
    const sorted = topologicalSort([], [])
    expect(sorted).toHaveLength(0)
  })

  it('should handle diamond dependency graph', () => {
    const a = createTestNode('route53', { id: 'a' })
    const b = createTestNode('cloudfront', { id: 'b' })
    const c = createTestNode('alb', { id: 'c' })
    const d = createTestNode('ecs', { id: 'd' })

    const edges = [
      createTestEdge('a', 'b'),
      createTestEdge('a', 'c'),
      createTestEdge('b', 'd'),
      createTestEdge('c', 'd'),
    ]

    const sorted = topologicalSort([a, b, c, d], edges)
    const ids = sorted.map((n) => n.id)
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'))
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('c'))
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('d'))
    expect(ids.indexOf('c')).toBeLessThan(ids.indexOf('d'))
  })
})

describe('calculatePerformance', () => {
  it('should sum latencies of all nodes', () => {
    const nodes = [
      createTestNode('route53'),
      createTestNode('cloudfront'),
      createTestNode('alb'),
    ]
    const traffic = createTestTrafficProfile()

    const result = calculatePerformance(nodes, traffic)

    // route53: 3ms + cloudfront: 20ms + alb: 5ms = 28ms
    expect(result.totalLatency).toBe(28)
  })

  it('should calculate p50 and p99 from total latency', () => {
    const nodes = [createTestNode('route53')]
    const traffic = createTestTrafficProfile()

    const result = calculatePerformance(nodes, traffic)

    expect(result.p50Latency).toBe(result.totalLatency * 0.9)
    expect(result.p99Latency).toBe(result.totalLatency * 1.8)
  })

  it('should use first node latency as TTFB', () => {
    const nodes = [createTestNode('route53'), createTestNode('ecs')]
    const traffic = createTestTrafficProfile()

    const result = calculatePerformance(nodes, traffic)

    expect(result.ttfb).toBe(3) // route53 base latency
  })

  it('should return 0 TTFB for empty nodes', () => {
    const traffic = createTestTrafficProfile()
    const result = calculatePerformance([], traffic)
    expect(result.ttfb).toBe(0)
  })

  it('should calculate cache hit rate from CloudFront', () => {
    const nodes = [
      createTestNode('cloudfront', {
        config: { cache: { enabled: true, ttl: 86400, hitRate: 0.85 } },
      }),
    ]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculatePerformance(nodes, traffic)

    expect(result.cacheHitRate).toBeCloseTo(0.85)
    expect(result.requestsReachingOrigin).toBeCloseTo(15)
  })

  it('should handle 0 requests per second', () => {
    const nodes = [createTestNode('route53')]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 0 })

    const result = calculatePerformance(nodes, traffic)

    expect(result.cacheHitRate).toBe(0)
  })

  it('should exclude infrastructure nodes from latency calculation', () => {
    const nodes = [
      createTestNode('route53'),
      createTestNode('vpc'),
      createTestNode('subnet'),
    ]
    const traffic = createTestTrafficProfile()

    const result = calculatePerformance(nodes, traffic)

    // Only route53 should contribute: 3ms
    expect(result.totalLatency).toBe(3)
  })
})

describe('calculateCost', () => {
  it('should aggregate monthly costs', () => {
    const nodes = [
      createTestNode('alb'), // monthly: 16.2
      createTestNode('rds'), // monthly: 25
    ]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 0 })

    const result = calculateCost(nodes, traffic)

    expect(result.monthly).toBeCloseTo(41.2)
  })

  it('should calculate per-request costs', () => {
    const nodes = [createTestNode('route53')]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateCost(nodes, traffic)

    const expectedRequestsPerMonth = 100 * 30 * 24 * 3600
    const expectedPerRequestTotal = 0.0000005 * expectedRequestsPerMonth
    const expectedMonthly = expectedPerRequestTotal + 0.5

    expect(result.monthly).toBeCloseTo(expectedMonthly, 0)
  })

  it('should include cost breakdown per service', () => {
    const nodes = [createTestNode('alb'), createTestNode('rds')]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 0 })

    const result = calculateCost(nodes, traffic)

    expect(result.breakdown).toHaveLength(2)
    expect(result.breakdown[0].service).toBe('ALB')
    expect(result.breakdown[1].service).toBe('RDS')
  })

  it('should reduce effective RPS after cache layer', () => {
    const nodes = [
      createTestNode('cloudfront', {
        config: { cache: { enabled: true, ttl: 86400, hitRate: 0.85 } },
      }),
      createTestNode('ecs'),
    ]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateCost(nodes, traffic)

    // ECS cost should be based on 15 RPS (after 85% cache hit)
    const ecsBreakdown = result.breakdown.find((b) => b.service === 'ECS')
    expect(ecsBreakdown).toBeDefined()
  })

  it('should handle empty nodes', () => {
    const traffic = createTestTrafficProfile()
    const result = calculateCost([], traffic)

    expect(result.monthly).toBe(0)
    expect(result.perRequest).toBe(0)
    expect(result.breakdown).toHaveLength(0)
  })

  it('should exclude infrastructure nodes from cost calculation', () => {
    const nodes = [
      createTestNode('alb'), // monthly: 16.2
      createTestNode('vpc'), // infra, should be excluded
    ]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 0 })

    const result = calculateCost(nodes, traffic)

    expect(result.monthly).toBeCloseTo(16.2)
    expect(result.breakdown).toHaveLength(1)
  })
})

describe('analyzeSecurity', () => {
  it('should detect DDoS protection', () => {
    const nodes = [createTestNode('cloudfront')]
    const result = analyzeSecurity(nodes, [])

    expect(result.ddosProtection).toBe(true)
  })

  it('should detect WAF', () => {
    const nodes = [createTestNode('waf')]
    const result = analyzeSecurity(nodes, [])

    expect(result.wafEnabled).toBe(true)
  })

  it('should check encryption in transit via edge protocols', () => {
    const n1 = createTestNode('route53', { id: 'n1' })
    const n2 = createTestNode('alb', { id: 'n2' })

    const httpsEdge = createTestEdge('n1', 'n2', { protocol: 'https' })
    const result = analyzeSecurity([n1, n2], [httpsEdge])

    expect(result.encryptionInTransit).toBe(true)
  })

  it('should treat VPC-internal protocols as secure', () => {
    const n1 = createTestNode('alb', { id: 'n1' })
    const n2 = createTestNode('ecs', { id: 'n2' })

    const httpEdge = createTestEdge('n1', 'n2', { protocol: 'http' })
    const result = analyzeSecurity([n1, n2], [httpEdge])

    expect(result.encryptionInTransit).toBe(true)
  })

  it('should treat tcp protocol as secure', () => {
    const n1 = createTestNode('ecs', { id: 'n1' })
    const n2 = createTestNode('rds', { id: 'n2' })

    const tcpEdge = createTestEdge('n1', 'n2', { protocol: 'tcp' })
    const result = analyzeSecurity([n1, n2], [tcpEdge])

    expect(result.encryptionInTransit).toBe(true)
  })

  it('should treat invoke and dns protocols as secure', () => {
    const n1 = createTestNode('api-gateway', { id: 'n1' })
    const n2 = createTestNode('lambda', { id: 'n2' })

    const invokeEdge = createTestEdge('n1', 'n2', { protocol: 'invoke' })
    const result = analyzeSecurity([n1, n2], [invokeEdge])

    expect(result.encryptionInTransit).toBe(true)
  })

  it('should check encryption at rest for storage/db nodes', () => {
    const nodes = [
      createTestNode('s3', { config: { security: { encryption: true } } }),
      createTestNode('rds', { config: { security: { encryption: true } } }),
    ]
    const result = analyzeSecurity(nodes, [])

    expect(result.encryptionAtRest).toBe(true)
  })

  it('should give max 100 score with all features', () => {
    const nodes = [
      createTestNode('cloudfront'), // ddos
      createTestNode('waf'), // waf
      createTestNode('s3', { config: { security: { encryption: true } } }),
      createTestNode('vpc'),
    ]

    // Add a private subnet for bonus
    const subnetNode = createTestNode('subnet', { id: 'subnet-private' })
    const subnetData = subnetNode.data as Record<string, unknown>
    const currentConfig = subnetData.config as Record<string, unknown>
    subnetData.config = {
      ...currentConfig,
      specific: { cidrBlock: '10.0.1.0/24', availabilityZone: 'us-east-1a', subnetType: 'private' },
    }

    const result = analyzeSecurity([...nodes, subnetNode], [])

    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('should give low score with minimal security features', () => {
    const nodes = [createTestNode('ecs')]
    // No DDoS, no WAF → 0+0 = 0 from those
    // No edges → encryptionInTransit = true (20)
    // No storage nodes → encryptionAtRest = true (20)
    const result = analyzeSecurity(nodes, [])

    expect(result.ddosProtection).toBe(false)
    expect(result.wafEnabled).toBe(false)
    expect(result.score).toBe(40) // only encryption defaults
  })
})

describe('analyzeAvailability', () => {
  it('should identify single points of failure', () => {
    const nodes = [
      createTestNode('ecs', {
        config: { specific: { launchType: 'fargate', taskCount: 1, cpu: 0.25, memory: 0.5, autoScaling: { enabled: false, min: 1, max: 1, targetCPU: 70 } } },
      }),
    ]
    const result = analyzeAvailability(nodes)

    expect(result.singlePointsOfFailure).toContain('ECS')
  })

  it('should recognize inherently redundant services', () => {
    const nodes = [
      createTestNode('cloudfront'),
      createTestNode('route53'),
      createTestNode('s3'),
    ]
    const result = analyzeAvailability(nodes)

    expect(result.singlePointsOfFailure).toHaveLength(0)
    expect(result.redundancyScore).toBe(100)
  })

  it('should recognize multi-AZ RDS as redundant', () => {
    const nodes = [
      createTestNode('rds', {
        config: { specific: { instanceClass: 'db.t3.micro', multiAZ: true, readReplicas: 0, storageGB: 20 } },
      }),
    ]
    const result = analyzeAvailability(nodes)

    expect(result.singlePointsOfFailure).toHaveLength(0)
  })

  it('should handle empty nodes', () => {
    const result = analyzeAvailability([])

    expect(result.singlePointsOfFailure).toHaveLength(0)
    expect(result.redundancyScore).toBe(100)
    expect(result.estimatedUptime).toBe(0.9999)
  })

  it('should calculate estimated uptime based on redundancy', () => {
    const nodes = [
      createTestNode('cloudfront'), // redundant
      createTestNode('ecs', {
        config: { specific: { launchType: 'fargate', taskCount: 1, cpu: 0.25, memory: 0.5, autoScaling: { enabled: false, min: 1, max: 1, targetCPU: 70 } } },
      }), // not redundant
    ]
    const result = analyzeAvailability(nodes)

    expect(result.estimatedUptime).toBeGreaterThanOrEqual(0.99)
    expect(result.estimatedUptime).toBeLessThanOrEqual(0.9999)
  })

  it('should exclude infrastructure nodes', () => {
    const nodes = [
      createTestNode('vpc'),
      createTestNode('subnet'),
    ]
    const result = analyzeAvailability(nodes)

    expect(result.singlePointsOfFailure).toHaveLength(0)
    expect(result.redundancyScore).toBe(100)
  })

  it('should recognize Lambda as inherently redundant', () => {
    const nodes = [createTestNode('lambda')]
    const result = analyzeAvailability(nodes)

    expect(result.singlePointsOfFailure).toHaveLength(0)
  })

  it('should recognize DynamoDB as inherently redundant', () => {
    const nodes = [createTestNode('dynamodb')]
    const result = analyzeAvailability(nodes)

    expect(result.singlePointsOfFailure).toHaveLength(0)
  })

  it('should recognize EKS with multiple nodes as redundant', () => {
    const nodes = [
      createTestNode('eks', {
        config: {
          specific: {
            nodeGroupType: 'managed',
            nodeCount: 3,
            instanceType: 't3.medium',
            autoScaling: { enabled: true, min: 2, max: 10, targetCPU: 70 },
          },
        },
      }),
    ]
    const result = analyzeAvailability(nodes)

    expect(result.singlePointsOfFailure).toHaveLength(0)
  })

  it('should identify EKS with single node as SPOF', () => {
    const nodes = [
      createTestNode('eks', {
        config: {
          specific: {
            nodeGroupType: 'managed',
            nodeCount: 1,
            instanceType: 't3.medium',
            autoScaling: { enabled: false, min: 1, max: 1, targetCPU: 70 },
          },
        },
      }),
    ]
    const result = analyzeAvailability(nodes)

    expect(result.singlePointsOfFailure).toContain('EKS')
  })

  it('should recognize SQS as inherently redundant', () => {
    const nodes = [createTestNode('sqs')]
    const result = analyzeAvailability(nodes)

    expect(result.singlePointsOfFailure).toHaveLength(0)
  })

  it('should recognize SNS as inherently redundant', () => {
    const nodes = [createTestNode('sns')]
    const result = analyzeAvailability(nodes)

    expect(result.singlePointsOfFailure).toHaveLength(0)
  })

  it('should recognize Kinesis as inherently redundant', () => {
    const nodes = [createTestNode('kinesis')]
    const result = analyzeAvailability(nodes)

    expect(result.singlePointsOfFailure).toHaveLength(0)
  })
})

describe('runSimulation', () => {
  it('should return all result sections', () => {
    const { nodes, edges } = createTypicalArchitecture()
    const traffic = createTestTrafficProfile()

    const result = runSimulation(nodes, edges, traffic)

    expect(result.performance).toBeDefined()
    expect(result.cost).toBeDefined()
    expect(result.security).toBeDefined()
    expect(result.availability).toBeDefined()
    expect(result.validation).toBeDefined()
  })

  it('should produce consistent results for same input', () => {
    const { nodes, edges } = createTypicalArchitecture()
    const traffic = createTestTrafficProfile()

    const r1 = runSimulation(nodes, edges, traffic)
    resetIdCounter()
    const r2 = runSimulation(nodes, edges, traffic)

    expect(r1.performance.totalLatency).toBe(r2.performance.totalLatency)
    expect(r1.cost.monthly).toBe(r2.cost.monthly)
    expect(r1.security.score).toBe(r2.security.score)
  })

  it('should include validation results', () => {
    const { nodes, edges } = createTypicalArchitecture()
    const traffic = createTestTrafficProfile()

    const result = runSimulation(nodes, edges, traffic)

    expect(result.validation).toBeDefined()
    expect(result.validation!.isValid).toBeDefined()
    expect(result.validation!.issues).toBeDefined()
  })
})
