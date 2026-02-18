import { describe, it, expect } from 'vitest'
import {
  calculateEC2MonthlyCost,
  calculateRDSMonthlyCost,
  calculateECSMonthlyCost,
  calculateEKSMonthlyCost,
  calculateLambdaMonthlyCost,
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
  EC2_INSTANCE_TYPES,
  RDS_INSTANCE_CLASSES,
  ELASTICACHE_NODE_TYPES,
  EKS_INSTANCE_TYPES,
  EKS_NODE_GROUP_TYPES,
  SQS_QUEUE_TYPES,
  SNS_TOPIC_TYPES,
  KINESIS_STREAM_MODES,
  DYNAMODB_CAPACITY_MODES,
  API_GATEWAY_TYPES,
} from './calculator'

const HOURS_PER_MONTH = 730

describe('calculateEC2MonthlyCost', () => {
  it('calculates cost for t3.micro with 1 instance', () => {
    const cost = calculateEC2MonthlyCost('t3.micro', 1)
    expect(cost).toBeCloseTo(0.0104 * HOURS_PER_MONTH, 2)
  })

  it('scales linearly with instance count', () => {
    const single = calculateEC2MonthlyCost('t3.micro', 1)
    const triple = calculateEC2MonthlyCost('t3.micro', 3)
    expect(triple).toBeCloseTo(single * 3, 2)
  })

  it('returns higher cost for larger instances', () => {
    const micro = calculateEC2MonthlyCost('t3.micro', 1)
    const medium = calculateEC2MonthlyCost('t3.medium', 1)
    const xlarge = calculateEC2MonthlyCost('t3.xlarge', 1)
    expect(medium).toBeGreaterThan(micro)
    expect(xlarge).toBeGreaterThan(medium)
  })

  it('falls back to t3.micro rate for unknown instance type', () => {
    const unknown = calculateEC2MonthlyCost('t3.nano', 1)
    const micro = calculateEC2MonthlyCost('t3.micro', 1)
    expect(unknown).toBe(micro)
  })
})

describe('calculateRDSMonthlyCost', () => {
  it('calculates base cost for db.t3.micro without Multi-AZ', () => {
    const cost = calculateRDSMonthlyCost('db.t3.micro', false, 0, 20)
    const expectedInstance = 0.017 * HOURS_PER_MONTH
    const expectedStorage = 20 * 0.115
    expect(cost).toBeCloseTo(expectedInstance + expectedStorage, 2)
  })

  it('doubles instance and storage cost with Multi-AZ', () => {
    const single = calculateRDSMonthlyCost('db.t3.micro', false, 0, 20)
    const multiAZ = calculateRDSMonthlyCost('db.t3.micro', true, 0, 20)
    expect(multiAZ).toBeCloseTo(single * 2, 2)
  })

  it('adds read replica costs', () => {
    const noReplica = calculateRDSMonthlyCost('db.t3.micro', false, 0, 20)
    const withReplica = calculateRDSMonthlyCost('db.t3.micro', false, 2, 20)
    const replicaCost = 0.017 * HOURS_PER_MONTH * 2
    expect(withReplica).toBeCloseTo(noReplica + replicaCost, 2)
  })

  it('scales storage cost linearly', () => {
    const small = calculateRDSMonthlyCost('db.t3.micro', false, 0, 20)
    const large = calculateRDSMonthlyCost('db.t3.micro', false, 0, 100)
    expect(large).toBeGreaterThan(small)
  })
})

describe('calculateECSMonthlyCost', () => {
  it('calculates Fargate cost based on CPU and memory', () => {
    const cost = calculateECSMonthlyCost('fargate', 2, 0.25, 0.5)
    const expectedCPU = 0.25 * 0.04048 * HOURS_PER_MONTH * 2
    const expectedMemory = 0.5 * 0.004445 * HOURS_PER_MONTH * 2
    expect(cost).toBeCloseTo(expectedCPU + expectedMemory, 2)
  })

  it('scales with task count', () => {
    const two = calculateECSMonthlyCost('fargate', 2, 0.25, 0.5)
    const four = calculateECSMonthlyCost('fargate', 4, 0.25, 0.5)
    expect(four).toBeCloseTo(two * 2, 2)
  })

  it('returns 0 for EC2 launch type', () => {
    const cost = calculateECSMonthlyCost('ec2', 10, 4, 16)
    expect(cost).toBe(0)
  })
})

describe('calculateLambdaMonthlyCost', () => {
  it('returns a positive cost for any memory size', () => {
    const cost = calculateLambdaMonthlyCost(128, 1_000_000, 200)
    expect(cost).toBeGreaterThan(0)
  })

  it('increases with memory', () => {
    const small = calculateLambdaMonthlyCost(128, 1_000_000, 200)
    const large = calculateLambdaMonthlyCost(3072, 1_000_000, 200)
    expect(large).toBeGreaterThan(small)
  })

  it('scales with request count', () => {
    const low = calculateLambdaMonthlyCost(256, 1_000_000, 200)
    const high = calculateLambdaMonthlyCost(256, 10_000_000, 200)
    expect(high).toBeGreaterThan(low)
  })

  it('scales with duration', () => {
    const fast = calculateLambdaMonthlyCost(256, 1_000_000, 100)
    const slow = calculateLambdaMonthlyCost(256, 1_000_000, 500)
    expect(slow).toBeGreaterThan(fast)
  })

  it('returns 0 for 0 requests', () => {
    const cost = calculateLambdaMonthlyCost(128, 0, 200)
    expect(cost).toBe(0)
  })
})

describe('calculateElastiCacheMonthlyCost', () => {
  it('calculates cost for single node', () => {
    const cost = calculateElastiCacheMonthlyCost('cache.t3.micro', 1)
    expect(cost).toBeCloseTo(0.017 * HOURS_PER_MONTH, 2)
  })

  it('scales with node count', () => {
    const one = calculateElastiCacheMonthlyCost('cache.t3.micro', 1)
    const three = calculateElastiCacheMonthlyCost('cache.t3.micro', 3)
    expect(three).toBeCloseTo(one * 3, 2)
  })

  it('returns higher cost for larger nodes', () => {
    const micro = calculateElastiCacheMonthlyCost('cache.t3.micro', 1)
    const medium = calculateElastiCacheMonthlyCost('cache.t3.medium', 1)
    expect(medium).toBeGreaterThan(micro)
  })
})

describe('calculateEKSMonthlyCost', () => {
  it('includes control plane cost for managed nodes', () => {
    const cost = calculateEKSMonthlyCost('managed', 2, 't3.medium')
    const controlPlane = 0.10 * HOURS_PER_MONTH
    const nodeCost = 0.0416 * HOURS_PER_MONTH * 2
    expect(cost).toBeCloseTo(controlPlane + nodeCost, 2)
  })

  it('returns only control plane cost for fargate', () => {
    const cost = calculateEKSMonthlyCost('fargate', 5, 't3.medium')
    const controlPlane = 0.10 * HOURS_PER_MONTH
    expect(cost).toBeCloseTo(controlPlane, 2)
  })

  it('scales with node count', () => {
    const two = calculateEKSMonthlyCost('managed', 2, 't3.medium')
    const four = calculateEKSMonthlyCost('managed', 4, 't3.medium')
    const controlPlane = 0.10 * HOURS_PER_MONTH
    expect(four - controlPlane).toBeCloseTo((two - controlPlane) * 2, 2)
  })

  it('falls back to t3.medium rate for unknown instance type', () => {
    const unknown = calculateEKSMonthlyCost('managed', 1, 't3.nano')
    const medium = calculateEKSMonthlyCost('managed', 1, 't3.medium')
    expect(unknown).toBe(medium)
  })
})

describe('calculateSQSMonthlyCost', () => {
  it('returns positive cost for standard queue', () => {
    const cost = calculateSQSMonthlyCost('standard', 10_000_000)
    expect(cost).toBeGreaterThan(0)
  })

  it('returns higher cost for FIFO queue', () => {
    const standard = calculateSQSMonthlyCost('standard', 10_000_000)
    const fifo = calculateSQSMonthlyCost('fifo', 10_000_000)
    expect(fifo).toBeGreaterThan(standard)
  })

  it('scales with message count', () => {
    const low = calculateSQSMonthlyCost('standard', 1_000_000)
    const high = calculateSQSMonthlyCost('standard', 100_000_000)
    expect(high).toBeGreaterThan(low)
  })

  it('returns 0 for 0 messages', () => {
    const cost = calculateSQSMonthlyCost('standard', 0)
    expect(cost).toBe(0)
  })
})

describe('calculateSNSMonthlyCost', () => {
  it('returns positive cost', () => {
    const cost = calculateSNSMonthlyCost(1, 1_000_000)
    expect(cost).toBeGreaterThan(0)
  })

  it('increases with subscription count', () => {
    const one = calculateSNSMonthlyCost(1, 1_000_000)
    const five = calculateSNSMonthlyCost(5, 1_000_000)
    expect(five).toBeGreaterThan(one)
  })

  it('scales with publish count', () => {
    const low = calculateSNSMonthlyCost(1, 1_000_000)
    const high = calculateSNSMonthlyCost(1, 10_000_000)
    expect(high).toBeGreaterThan(low)
  })
})

describe('calculateKinesisMonthlyCost', () => {
  it('returns positive cost for on-demand mode', () => {
    const cost = calculateKinesisMonthlyCost('on-demand', 4, 100)
    expect(cost).toBeGreaterThan(0)
  })

  it('returns positive cost for provisioned mode', () => {
    const cost = calculateKinesisMonthlyCost('provisioned', 2, 100)
    expect(cost).toBeGreaterThan(0)
  })

  it('scales with shard count in provisioned mode', () => {
    const one = calculateKinesisMonthlyCost('provisioned', 1, 100)
    const three = calculateKinesisMonthlyCost('provisioned', 3, 100)
    expect(three).toBeCloseTo(one * 3, 2)
  })

  it('on-demand scales with data transfer', () => {
    const low = calculateKinesisMonthlyCost('on-demand', 1, 10)
    const high = calculateKinesisMonthlyCost('on-demand', 1, 1000)
    expect(high).toBeGreaterThan(low)
  })
})

describe('calculateALBMonthlyCost', () => {
  it('returns positive cost even with no traffic', () => {
    const cost = calculateALBMonthlyCost(0, 0)
    expect(cost).toBeGreaterThan(0)
  })

  it('includes fixed hourly cost', () => {
    const cost = calculateALBMonthlyCost(0, 0)
    expect(cost).toBeCloseTo(0.0225 * HOURS_PER_MONTH, 2)
  })

  it('increases with requests', () => {
    const low = calculateALBMonthlyCost(1_000_000, 1)
    const high = calculateALBMonthlyCost(100_000_000, 100)
    expect(high).toBeGreaterThan(low)
  })
})

describe('calculateNLBMonthlyCost', () => {
  it('returns positive cost even with no traffic', () => {
    const cost = calculateNLBMonthlyCost(0, 0)
    expect(cost).toBeGreaterThan(0)
  })

  it('includes fixed hourly cost', () => {
    const cost = calculateNLBMonthlyCost(0, 0)
    expect(cost).toBeCloseTo(0.0225 * HOURS_PER_MONTH, 2)
  })

  it('increases with data transfer', () => {
    const low = calculateNLBMonthlyCost(1_000_000, 1)
    const high = calculateNLBMonthlyCost(1_000_000, 1000)
    expect(high).toBeGreaterThan(low)
  })
})

describe('calculateCloudFrontMonthlyCost', () => {
  it('returns 0 for no traffic', () => {
    const cost = calculateCloudFrontMonthlyCost(0, 0)
    expect(cost).toBe(0)
  })

  it('includes data transfer cost', () => {
    const cost = calculateCloudFrontMonthlyCost(0, 100)
    expect(cost).toBeCloseTo(100 * 0.085, 2)
  })

  it('includes request cost', () => {
    const cost = calculateCloudFrontMonthlyCost(10_000_000, 0)
    expect(cost).toBeCloseTo((10_000_000 / 10_000) * 0.0075, 2)
  })

  it('combines data transfer and request costs', () => {
    const cost = calculateCloudFrontMonthlyCost(10_000_000, 100)
    const expected = 100 * 0.085 + (10_000_000 / 10_000) * 0.0075
    expect(cost).toBeCloseTo(expected, 2)
  })
})

describe('calculateS3MonthlyCost', () => {
  it('returns storage cost only for 0 requests', () => {
    const cost = calculateS3MonthlyCost(0, 100, 0.5)
    expect(cost).toBeCloseTo(100 * 0.023, 2)
  })

  it('read-heavy traffic costs less than write-heavy', () => {
    const readHeavy = calculateS3MonthlyCost(1_000_000, 0, 0.9)
    const writeHeavy = calculateS3MonthlyCost(1_000_000, 0, 0.1)
    expect(writeHeavy).toBeGreaterThan(readHeavy)
  })

  it('includes both storage and request costs', () => {
    const cost = calculateS3MonthlyCost(1_000_000, 50, 0.5)
    expect(cost).toBeGreaterThan(50 * 0.023)
  })
})

describe('calculateAPIGatewayMonthlyCost', () => {
  it('REST API costs more per request than HTTP API', () => {
    const rest = calculateAPIGatewayMonthlyCost('rest', 10_000_000, false)
    const http = calculateAPIGatewayMonthlyCost('http', 10_000_000, false)
    expect(rest).toBeGreaterThan(http)
  })

  it('adds caching cost when enabled', () => {
    const noCaching = calculateAPIGatewayMonthlyCost('rest', 10_000_000, false)
    const withCaching = calculateAPIGatewayMonthlyCost('rest', 10_000_000, true)
    expect(withCaching).toBeGreaterThan(noCaching)
  })

  it('caching cost equals hourly rate * hours', () => {
    const noCaching = calculateAPIGatewayMonthlyCost('rest', 10_000_000, false)
    const withCaching = calculateAPIGatewayMonthlyCost('rest', 10_000_000, true)
    expect(withCaching - noCaching).toBeCloseTo(0.02 * HOURS_PER_MONTH, 2)
  })
})

describe('calculateDynamoDBMonthlyCost', () => {
  it('on-demand: read-heavy costs less than write-heavy', () => {
    const readHeavy = calculateDynamoDBMonthlyCost('on-demand', 10_000_000, 0.9, 0, 0, 50)
    const writeHeavy = calculateDynamoDBMonthlyCost('on-demand', 10_000_000, 0.1, 0, 0, 50)
    expect(writeHeavy).toBeGreaterThan(readHeavy)
  })

  it('provisioned: cost based on RCU/WCU', () => {
    const cost = calculateDynamoDBMonthlyCost('provisioned', 0, 0.5, 100, 50, 50)
    const expectedRCU = 100 * 0.00013 * HOURS_PER_MONTH
    const expectedWCU = 50 * 0.00065 * HOURS_PER_MONTH
    const expectedStorage = 50 * 0.25
    expect(cost).toBeCloseTo(expectedRCU + expectedWCU + expectedStorage, 2)
  })

  it('includes storage cost in both modes', () => {
    const onDemand = calculateDynamoDBMonthlyCost('on-demand', 0, 0.5, 0, 0, 100)
    const provisioned = calculateDynamoDBMonthlyCost('provisioned', 0, 0.5, 0, 0, 100)
    expect(onDemand).toBeCloseTo(100 * 0.25, 2)
    expect(provisioned).toBeCloseTo(100 * 0.25, 2)
  })
})

describe('calculateWAFMonthlyCost', () => {
  it('includes WebACL and rule costs', () => {
    const cost = calculateWAFMonthlyCost(10, 0)
    expect(cost).toBeCloseTo(5 + 10 * 1, 2)
  })

  it('includes request cost', () => {
    const noTraffic = calculateWAFMonthlyCost(10, 0)
    const withTraffic = calculateWAFMonthlyCost(10, 10_000_000)
    expect(withTraffic).toBeGreaterThan(noTraffic)
  })

  it('scales with rule count', () => {
    const fewRules = calculateWAFMonthlyCost(2, 1_000_000)
    const manyRules = calculateWAFMonthlyCost(20, 1_000_000)
    expect(manyRules).toBeGreaterThan(fewRules)
  })
})

describe('calculateShieldMonthlyCost', () => {
  it('returns 0 for standard tier', () => {
    const cost = calculateShieldMonthlyCost('standard')
    expect(cost).toBe(0)
  })

  it('returns 3000 for advanced tier', () => {
    const cost = calculateShieldMonthlyCost('advanced')
    expect(cost).toBe(3000)
  })
})

describe('calculateRoute53MonthlyCost', () => {
  it('includes hosted zone cost with 0 requests', () => {
    const cost = calculateRoute53MonthlyCost(0)
    expect(cost).toBeCloseTo(0.5, 2)
  })

  it('increases with query count', () => {
    const low = calculateRoute53MonthlyCost(1_000_000)
    const high = calculateRoute53MonthlyCost(100_000_000)
    expect(high).toBeGreaterThan(low)
  })
})

describe('calculateNATGatewayMonthlyCost', () => {
  it('includes fixed hourly cost with 0 data', () => {
    const cost = calculateNATGatewayMonthlyCost(0)
    expect(cost).toBeCloseTo(0.045 * HOURS_PER_MONTH, 2)
  })

  it('increases with data transfer', () => {
    const low = calculateNATGatewayMonthlyCost(10)
    const high = calculateNATGatewayMonthlyCost(1000)
    expect(high).toBeGreaterThan(low)
  })

  it('data cost is per-GB based', () => {
    const base = calculateNATGatewayMonthlyCost(0)
    const with100GB = calculateNATGatewayMonthlyCost(100)
    expect(with100GB - base).toBeCloseTo(100 * 0.045, 2)
  })
})

describe('constant arrays', () => {
  it('EC2_INSTANCE_TYPES contains expected types', () => {
    expect(EC2_INSTANCE_TYPES).toContain('t3.micro')
    expect(EC2_INSTANCE_TYPES).toContain('t3.xlarge')
    expect(EC2_INSTANCE_TYPES.length).toBe(5)
  })

  it('RDS_INSTANCE_CLASSES contains expected classes', () => {
    expect(RDS_INSTANCE_CLASSES).toContain('db.t3.micro')
    expect(RDS_INSTANCE_CLASSES).toContain('db.t3.large')
    expect(RDS_INSTANCE_CLASSES.length).toBe(4)
  })

  it('ELASTICACHE_NODE_TYPES contains expected types', () => {
    expect(ELASTICACHE_NODE_TYPES).toContain('cache.t3.micro')
    expect(ELASTICACHE_NODE_TYPES).toContain('cache.t3.medium')
    expect(ELASTICACHE_NODE_TYPES.length).toBe(3)
  })

  it('EKS_INSTANCE_TYPES contains expected types', () => {
    expect(EKS_INSTANCE_TYPES).toContain('t3.medium')
    expect(EKS_INSTANCE_TYPES).toContain('t3.xlarge')
    expect(EKS_INSTANCE_TYPES.length).toBe(3)
  })

  it('EKS_NODE_GROUP_TYPES contains managed and fargate', () => {
    expect(EKS_NODE_GROUP_TYPES).toContain('managed')
    expect(EKS_NODE_GROUP_TYPES).toContain('fargate')
    expect(EKS_NODE_GROUP_TYPES.length).toBe(2)
  })

  it('SQS_QUEUE_TYPES contains standard and fifo', () => {
    expect(SQS_QUEUE_TYPES).toContain('standard')
    expect(SQS_QUEUE_TYPES).toContain('fifo')
    expect(SQS_QUEUE_TYPES.length).toBe(2)
  })

  it('SNS_TOPIC_TYPES contains standard and fifo', () => {
    expect(SNS_TOPIC_TYPES).toContain('standard')
    expect(SNS_TOPIC_TYPES).toContain('fifo')
    expect(SNS_TOPIC_TYPES.length).toBe(2)
  })

  it('KINESIS_STREAM_MODES contains provisioned and on-demand', () => {
    expect(KINESIS_STREAM_MODES).toContain('provisioned')
    expect(KINESIS_STREAM_MODES).toContain('on-demand')
    expect(KINESIS_STREAM_MODES.length).toBe(2)
  })

  it('DYNAMODB_CAPACITY_MODES contains on-demand and provisioned', () => {
    expect(DYNAMODB_CAPACITY_MODES).toContain('on-demand')
    expect(DYNAMODB_CAPACITY_MODES).toContain('provisioned')
    expect(DYNAMODB_CAPACITY_MODES.length).toBe(2)
  })

  it('API_GATEWAY_TYPES contains rest, http, and websocket', () => {
    expect(API_GATEWAY_TYPES).toContain('rest')
    expect(API_GATEWAY_TYPES).toContain('http')
    expect(API_GATEWAY_TYPES).toContain('websocket')
    expect(API_GATEWAY_TYPES.length).toBe(3)
  })
})
