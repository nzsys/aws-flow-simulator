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
  EC2_INSTANCE_TYPES,
  RDS_INSTANCE_CLASSES,
  ELASTICACHE_NODE_TYPES,
  EKS_INSTANCE_TYPES,
  EKS_NODE_GROUP_TYPES,
  SQS_QUEUE_TYPES,
  SNS_TOPIC_TYPES,
  KINESIS_STREAM_MODES,
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
    const cost = calculateLambdaMonthlyCost(128)
    expect(cost).toBeGreaterThan(0)
  })

  it('increases with memory', () => {
    const small = calculateLambdaMonthlyCost(128)
    const large = calculateLambdaMonthlyCost(3072)
    expect(large).toBeGreaterThan(small)
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
    const cost = calculateSQSMonthlyCost('standard')
    expect(cost).toBeGreaterThan(0)
  })

  it('returns higher cost for FIFO queue', () => {
    const standard = calculateSQSMonthlyCost('standard')
    const fifo = calculateSQSMonthlyCost('fifo')
    expect(fifo).toBeGreaterThan(standard)
  })
})

describe('calculateSNSMonthlyCost', () => {
  it('returns positive cost', () => {
    const cost = calculateSNSMonthlyCost(1)
    expect(cost).toBeGreaterThan(0)
  })

  it('increases with subscription count', () => {
    const one = calculateSNSMonthlyCost(1)
    const five = calculateSNSMonthlyCost(5)
    expect(five).toBeGreaterThan(one)
  })
})

describe('calculateKinesisMonthlyCost', () => {
  it('returns 0 for on-demand mode', () => {
    const cost = calculateKinesisMonthlyCost('on-demand', 4)
    expect(cost).toBe(0)
  })

  it('returns positive cost for provisioned mode', () => {
    const cost = calculateKinesisMonthlyCost('provisioned', 2)
    expect(cost).toBeGreaterThan(0)
  })

  it('scales with shard count', () => {
    const one = calculateKinesisMonthlyCost('provisioned', 1)
    const three = calculateKinesisMonthlyCost('provisioned', 3)
    expect(three).toBeCloseTo(one * 3, 2)
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
})
