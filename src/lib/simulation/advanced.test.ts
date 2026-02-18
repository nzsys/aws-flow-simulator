import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateLatencyBreakdown,
  calculateScalability,
  calculateCostBreakdown,
  calculateAdvancedResults,
} from './advanced'
import {
  createTestNode,
  createTestEdge,
  createTestTrafficProfile,
  resetIdCounter,
} from '@/test/helpers/node-factory'
import { topologicalSort } from './engine'

beforeEach(() => {
  resetIdCounter()
})

describe('calculateLatencyBreakdown', () => {
  it('should return per-service latency entries for flow nodes', () => {
    const nodes = [
      createTestNode('route53'),
      createTestNode('cloudfront'),
      createTestNode('alb'),
    ]
    const traffic = createTestTrafficProfile()

    const result = calculateLatencyBreakdown(nodes, traffic)

    expect(result.perService).toHaveLength(3)
    expect(result.perService[0].service).toBe('Route 53')
    expect(result.perService[0].serviceType).toBe('route53')
    expect(result.perService[0].baseMs).toBe(3)
  })

  it('should calculate P50 deterministically using min + (base - min) * 0.6', () => {
    const nodes = [createTestNode('route53')]
    const traffic = createTestTrafficProfile()

    const result = calculateLatencyBreakdown(nodes, traffic)

    // route53: min=1, base=3, max=10
    // P50 = 1 + (3 - 1) * 0.6 = 1 + 1.2 = 2.2
    expect(result.perService[0].p50Ms).toBeCloseTo(2.2)
  })

  it('should calculate P99 deterministically using base + (max - base) * 0.9', () => {
    const nodes = [createTestNode('route53')]
    const traffic = createTestTrafficProfile()

    const result = calculateLatencyBreakdown(nodes, traffic)

    // route53: min=1, base=3, max=10
    // P99 = 3 + (10 - 3) * 0.9 = 3 + 6.3 = 9.3
    expect(result.perService[0].p99Ms).toBeCloseTo(9.3)
  })

  it('should sum P50 and P99 across all services for totals', () => {
    const nodes = [
      createTestNode('route53'),
      createTestNode('alb'),
    ]
    const traffic = createTestTrafficProfile()

    const result = calculateLatencyBreakdown(nodes, traffic)

    const expectedP50 = result.perService.reduce((sum, e) => sum + e.p50Ms, 0)
    const expectedP99 = result.perService.reduce((sum, e) => sum + e.p99Ms, 0)

    expect(result.totalP50).toBeCloseTo(expectedP50)
    expect(result.totalP99).toBeCloseTo(expectedP99)
  })

  it('should exclude infrastructure nodes', () => {
    const nodes = [
      createTestNode('route53'),
      createTestNode('vpc'),
      createTestNode('subnet'),
    ]
    const traffic = createTestTrafficProfile()

    const result = calculateLatencyBreakdown(nodes, traffic)

    expect(result.perService).toHaveLength(1)
    expect(result.perService[0].service).toBe('Route 53')
  })

  it('should handle empty node list', () => {
    const traffic = createTestTrafficProfile()

    const result = calculateLatencyBreakdown([], traffic)

    expect(result.perService).toHaveLength(0)
    expect(result.totalP50).toBe(0)
    expect(result.totalP99).toBe(0)
  })

  it('should include EKS/SQS/SNS/Kinesis with correct latency values', () => {
    const nodes = [
      createTestNode('eks'),
      createTestNode('sqs'),
      createTestNode('sns'),
      createTestNode('kinesis'),
    ]
    const traffic = createTestTrafficProfile()

    const result = calculateLatencyBreakdown(nodes, traffic)

    expect(result.perService).toHaveLength(4)
    expect(result.perService[0].baseMs).toBe(50) // eks
    expect(result.perService[1].baseMs).toBe(10) // sqs
    expect(result.perService[2].baseMs).toBe(5) // sns
    expect(result.perService[3].baseMs).toBe(8) // kinesis
  })
})

describe('calculateScalability', () => {
  it('should identify bottleneck service with lowest maxRPS', () => {
    const nodes = [
      createTestNode('api-gateway'), // throttlingRate: 10000
      createTestNode('ecs'), // fargate, autoScaling max:10, latency 50ms → 10*(1000/50) = 200
    ]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateScalability(nodes, traffic)

    expect(result.bottleneckService).toBe('ECS')
    expect(result.maxRPS).toBe(200)
  })

  it('should calculate headroom correctly', () => {
    const nodes = [
      createTestNode('lambda', {
        config: { specific: { memoryMB: 128, timeoutSeconds: 30, concurrency: 1000, runtime: 'nodejs20.x', avgDurationMs: 200 } },
      }),
    ]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateScalability(nodes, traffic)

    // maxRPS = 1000, currentRPS = 100
    // headroom = (1000 - 100) / 1000 * 100 = 90%
    expect(result.maxRPS).toBe(1000)
    expect(result.headroomPercent).toBe(90)
  })

  it('should detect autoScaling enabled for all compute nodes', () => {
    const nodes = [
      createTestNode('ecs'), // default has autoScaling enabled
      createTestNode('lambda'), // inherently auto-scaling
    ]
    const traffic = createTestTrafficProfile()

    const result = calculateScalability(nodes, traffic)

    expect(result.autoScalingEnabled).toBe(true)
  })

  it('should detect autoScaling disabled when any node lacks it', () => {
    const nodes = [
      createTestNode('ec2', {
        config: { specific: { instanceType: 't3.micro', instanceCount: 2, autoScaling: false } },
      }),
    ]
    const traffic = createTestTrafficProfile()

    const result = calculateScalability(nodes, traffic)

    expect(result.autoScalingEnabled).toBe(false)
  })

  it('should detect Fargate for ECS nodes', () => {
    const nodes = [createTestNode('ecs')]
    const traffic = createTestTrafficProfile()

    const result = calculateScalability(nodes, traffic)

    expect(result.perService[0].isFargate).toBe(true)
  })

  it('should detect Fargate for EKS nodes with fargate nodeGroupType', () => {
    const nodes = [
      createTestNode('eks', {
        config: {
          specific: {
            nodeGroupType: 'fargate',
            nodeCount: 2,
            instanceType: 't3.medium',
            autoScaling: { enabled: true, min: 2, max: 10, targetCPU: 70 },
          },
        },
      }),
    ]
    const traffic = createTestTrafficProfile()

    const result = calculateScalability(nodes, traffic)

    expect(result.perService[0].isFargate).toBe(true)
  })

  it('should return empty result for no compute nodes', () => {
    const nodes = [createTestNode('route53'), createTestNode('s3')]
    const traffic = createTestTrafficProfile()

    const result = calculateScalability(nodes, traffic)

    expect(result.bottleneckService).toBeNull()
    expect(result.maxRPS).toBe(0)
    expect(result.perService).toHaveLength(0)
  })

  it('should handle EC2 without autoScaling', () => {
    const nodes = [
      createTestNode('ec2', {
        config: {
          specific: { instanceType: 't3.micro', instanceCount: 4, autoScaling: false },
        },
      }),
    ]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 10 })

    const result = calculateScalability(nodes, traffic)

    // ec2: latency 50ms, 4 instances → 4 * (1000/50) = 80 RPS
    expect(result.maxRPS).toBe(80)
    expect(result.autoScalingEnabled).toBe(false)
  })

  it('should clamp headroom to 0 when over capacity', () => {
    const nodes = [
      createTestNode('ec2', {
        config: {
          specific: { instanceType: 't3.micro', instanceCount: 1, autoScaling: false },
        },
      }),
    ]
    // ec2: latency 50ms, 1 instance → 1 * (1000/50) = 20 RPS
    const traffic = createTestTrafficProfile({ requestsPerSecond: 50 })

    const result = calculateScalability(nodes, traffic)

    expect(result.headroomPercent).toBe(0)
  })

  it('should exclude infrastructure nodes', () => {
    const nodes = [
      createTestNode('ecs'),
      createTestNode('vpc'),
    ]
    const traffic = createTestTrafficProfile()

    const result = calculateScalability(nodes, traffic)

    // Only ECS should appear, not VPC
    expect(result.perService).toHaveLength(1)
    expect(result.perService[0].service).toBe('ECS')
  })
})

describe('calculateCostBreakdown', () => {
  it('should categorize ECS as compute', () => {
    const nodes = [createTestNode('ecs')]
    const traffic = createTestTrafficProfile()

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('compute')
    expect(result.compute).toBeGreaterThan(0)
  })

  it('should categorize RDS as storage', () => {
    const nodes = [createTestNode('rds')]
    const traffic = createTestTrafficProfile()

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('storage')
    expect(result.storage).toBeGreaterThan(0)
  })

  it('should categorize CloudFront as dataTransfer', () => {
    const nodes = [createTestNode('cloudfront')]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('dataTransfer')
    expect(result.dataTransfer).toBeGreaterThan(0)
  })

  it('should categorize API Gateway as requests', () => {
    const nodes = [createTestNode('api-gateway')]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('requests')
    expect(result.requests).toBeGreaterThan(0)
  })

  it('should use readWriteRatio for DynamoDB cost calculation', () => {
    const nodes = [createTestNode('dynamodb')]
    const readHeavyTraffic = createTestTrafficProfile({ readWriteRatio: 0.9, requestsPerSecond: 100 })
    const writeHeavyTraffic = createTestTrafficProfile({ readWriteRatio: 0.1, requestsPerSecond: 100 })

    const readResult = calculateCostBreakdown(nodes, readHeavyTraffic)
    const writeResult = calculateCostBreakdown(nodes, writeHeavyTraffic)

    // Write-heavy should cost more since write cost is 5x read cost
    expect(writeResult.storage).toBeGreaterThan(readResult.storage)
  })

  it('should use calculator.ts functions for detailed costs', () => {
    const nodes = [
      createTestNode('ecs'), // should use calculateECSMonthlyCost
    ]
    const traffic = createTestTrafficProfile()

    const result = calculateCostBreakdown(nodes, traffic)

    // Default ECS: fargate, 2 tasks, 0.25 vCPU, 0.5 GB
    // Should be > 0 since Fargate has compute cost
    expect(result.compute).toBeGreaterThan(0)
  })

  it('should handle empty node list', () => {
    const traffic = createTestTrafficProfile()

    const result = calculateCostBreakdown([], traffic)

    expect(result.compute).toBe(0)
    expect(result.storage).toBe(0)
    expect(result.dataTransfer).toBe(0)
    expect(result.requests).toBe(0)
    expect(result.perService).toHaveLength(0)
  })

  it('should exclude infrastructure nodes', () => {
    const nodes = [
      createTestNode('ecs'),
      createTestNode('vpc'),
    ]
    const traffic = createTestTrafficProfile()

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService).toHaveLength(1)
    expect(result.perService[0].service).toBe('ECS')
  })

  it('should calculate SQS cost using calculator', () => {
    const nodes = [createTestNode('sqs')]
    const traffic = createTestTrafficProfile()

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('requests')
    expect(result.perService[0].amount).toBeGreaterThan(0)
  })

  it('should calculate Lambda cost from traffic', () => {
    const nodes = [createTestNode('lambda')]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('compute')
    expect(result.compute).toBeGreaterThan(0)
  })

  it('should calculate EC2 cost', () => {
    const nodes = [createTestNode('ec2')]
    const traffic = createTestTrafficProfile()

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('compute')
    expect(result.compute).toBeGreaterThan(0)
  })

  it('should calculate EKS cost', () => {
    const nodes = [createTestNode('eks')]
    const traffic = createTestTrafficProfile()

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('compute')
    expect(result.compute).toBeGreaterThan(0)
  })

  it('should calculate ElastiCache cost', () => {
    const nodes = [createTestNode('elasticache')]
    const traffic = createTestTrafficProfile()

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('storage')
    expect(result.storage).toBeGreaterThan(0)
  })

  it('should calculate S3 cost with request charges', () => {
    const nodes = [createTestNode('s3')]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('storage')
    expect(result.storage).toBeGreaterThan(0)
  })

  it('should calculate ALB cost with LCU', () => {
    const nodes = [createTestNode('alb')]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('requests')
    expect(result.requests).toBeGreaterThan(0)
  })

  it('should calculate NLB cost with NLCU', () => {
    const nodes = [createTestNode('nlb')]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('requests')
    expect(result.requests).toBeGreaterThan(0)
  })

  it('should calculate SNS cost from traffic', () => {
    const nodes = [createTestNode('sns')]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('requests')
    expect(result.perService[0].amount).toBeGreaterThan(0)
  })

  it('should calculate Kinesis cost for on-demand mode', () => {
    const nodes = [createTestNode('kinesis')]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('requests')
    expect(result.perService[0].amount).toBeGreaterThan(0)
  })

  it('should calculate WAF cost with rules and requests', () => {
    const nodes = [createTestNode('waf')]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('requests')
    expect(result.perService[0].amount).toBeGreaterThan(0)
  })

  it('should calculate Shield standard cost as 0', () => {
    const nodes = [createTestNode('shield')]
    const traffic = createTestTrafficProfile()

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('requests')
    expect(result.perService[0].amount).toBe(0)
  })

  it('should calculate Route53 cost with queries', () => {
    const nodes = [createTestNode('route53')]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.perService[0].category).toBe('requests')
    expect(result.perService[0].amount).toBeGreaterThan(0)
  })

  it('should calculate DynamoDB provisioned cost', () => {
    const nodes = [createTestNode('dynamodb', {
      config: {
        specific: {
          capacityMode: 'provisioned' as const,
          readCapacityUnits: 100,
          writeCapacityUnits: 50,
          globalTables: false,
          storageGB: 50,
        },
      },
    })]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.storage).toBeGreaterThan(0)
  })

  it('should include NAT Gateway costs from infrastructure nodes', () => {
    const nodes = [
      createTestNode('ecs'),
      createTestNode('nat-gateway'),
    ]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.dataTransfer).toBeGreaterThan(0)
  })

  it('should calculate a full realistic architecture cost', () => {
    const nodes = [
      createTestNode('route53'),
      createTestNode('cloudfront'),
      createTestNode('alb'),
      createTestNode('ecs'),
      createTestNode('rds'),
    ]
    const traffic = createTestTrafficProfile({ requestsPerSecond: 100 })

    const result = calculateCostBreakdown(nodes, traffic)

    expect(result.compute).toBeGreaterThan(0)
    expect(result.storage).toBeGreaterThan(0)
    expect(result.dataTransfer).toBeGreaterThan(0)
    expect(result.requests).toBeGreaterThan(0)
  })
})

describe('calculateAdvancedResults', () => {
  it('should return all three result sections', () => {
    const nodes = [
      createTestNode('route53', { id: 'r53' }),
      createTestNode('ecs', { id: 'ecs' }),
      createTestNode('rds', { id: 'rds' }),
    ]
    const edges = [
      createTestEdge('r53', 'ecs'),
      createTestEdge('ecs', 'rds'),
    ]
    const traffic = createTestTrafficProfile()

    const orderedNodes = topologicalSort(nodes, edges)
    const result = calculateAdvancedResults(orderedNodes, traffic)

    expect(result.latencyBreakdown).toBeDefined()
    expect(result.latencyBreakdown.perService.length).toBeGreaterThan(0)
    expect(result.scalability).toBeDefined()
    expect(result.operationalCost).toBeDefined()
  })

  it('should produce consistent results for same input', () => {
    const nodes = [
      createTestNode('route53', { id: 'r53' }),
      createTestNode('ecs', { id: 'ecs' }),
    ]
    const edges = [createTestEdge('r53', 'ecs')]
    const traffic = createTestTrafficProfile()

    const orderedNodes = topologicalSort(nodes, edges)
    const r1 = calculateAdvancedResults(orderedNodes, traffic)
    resetIdCounter()
    const r2 = calculateAdvancedResults(orderedNodes, traffic)

    expect(r1.latencyBreakdown.totalP50).toBe(r2.latencyBreakdown.totalP50)
    expect(r1.latencyBreakdown.totalP99).toBe(r2.latencyBreakdown.totalP99)
    expect(r1.scalability.maxRPS).toBe(r2.scalability.maxRPS)
    expect(r1.operationalCost.compute).toBe(r2.operationalCost.compute)
  })
})

describe('runSimulation with advancedMode', () => {
  it('should not include advanced results when advancedMode is false', async () => {
    const { runSimulation } = await import('./engine')
    const nodes = [
      createTestNode('route53', { id: 'r53' }),
      createTestNode('ecs', { id: 'ecs' }),
    ]
    const edges = [createTestEdge('r53', 'ecs')]
    const traffic = createTestTrafficProfile()

    const result = runSimulation(nodes, edges, traffic)

    expect(result.advanced).toBeUndefined()
  })

  it('should not include advanced results when options not provided', async () => {
    const { runSimulation } = await import('./engine')
    const nodes = [
      createTestNode('route53', { id: 'r53' }),
      createTestNode('ecs', { id: 'ecs' }),
    ]
    const edges = [createTestEdge('r53', 'ecs')]
    const traffic = createTestTrafficProfile()

    const result = runSimulation(nodes, edges, traffic)

    expect(result.advanced).toBeUndefined()
  })

  it('should include advanced results when advancedMode is true', async () => {
    const { runSimulation } = await import('./engine')
    const nodes = [
      createTestNode('route53', { id: 'r53' }),
      createTestNode('ecs', { id: 'ecs' }),
      createTestNode('rds', { id: 'rds' }),
    ]
    const edges = [
      createTestEdge('r53', 'ecs'),
      createTestEdge('ecs', 'rds'),
    ]
    const traffic = createTestTrafficProfile()

    const result = runSimulation(nodes, edges, traffic, { advancedMode: true })

    expect(result.advanced).toBeDefined()
    expect(result.advanced!.latencyBreakdown.perService.length).toBe(3)
    expect(result.advanced!.scalability).toBeDefined()
    expect(result.advanced!.operationalCost).toBeDefined()
  })
})
