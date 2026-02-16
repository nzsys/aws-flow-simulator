import { describe, it, expect } from 'vitest'
import {
  trafficProfileSchema,
  architectureNameSchema,
  serviceNodePositionSchema,
  serviceConfigSchema,
} from './schemas'

describe('trafficProfileSchema', () => {
  it('should accept valid traffic profile', () => {
    const result = trafficProfileSchema.safeParse({
      requestsPerSecond: 100,
      averagePayloadSize: 10,
      readWriteRatio: 0.2,
      geoDistribution: [{ region: 'us-east-1', percentage: 100 }],
    })
    expect(result.success).toBe(true)
  })

  it('should reject negative requestsPerSecond', () => {
    const result = trafficProfileSchema.safeParse({
      requestsPerSecond: -1,
      averagePayloadSize: 10,
      readWriteRatio: 0.2,
      geoDistribution: [],
    })
    expect(result.success).toBe(false)
  })

  it('should reject readWriteRatio > 1', () => {
    const result = trafficProfileSchema.safeParse({
      requestsPerSecond: 100,
      averagePayloadSize: 10,
      readWriteRatio: 1.5,
      geoDistribution: [],
    })
    expect(result.success).toBe(false)
  })

  it('should accept empty geoDistribution', () => {
    const result = trafficProfileSchema.safeParse({
      requestsPerSecond: 100,
      averagePayloadSize: 10,
      readWriteRatio: 0.2,
      geoDistribution: [],
    })
    expect(result.success).toBe(true)
  })
})

describe('architectureNameSchema', () => {
  it('should accept valid name', () => {
    const result = architectureNameSchema.safeParse('My Architecture')
    expect(result.success).toBe(true)
  })

  it('should reject empty name', () => {
    const result = architectureNameSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('should reject name over 100 chars', () => {
    const result = architectureNameSchema.safeParse('a'.repeat(101))
    expect(result.success).toBe(false)
  })
})

describe('serviceNodePositionSchema', () => {
  it('should accept valid position', () => {
    const result = serviceNodePositionSchema.safeParse({ x: 100, y: 200 })
    expect(result.success).toBe(true)
  })

  it('should reject missing coordinates', () => {
    const result = serviceNodePositionSchema.safeParse({ x: 100 })
    expect(result.success).toBe(false)
  })
})

describe('serviceConfigSchema', () => {
  it('should accept minimal config', () => {
    const result = serviceConfigSchema.safeParse({
      name: 'Route 53',
      latency: { base: 3 },
      cost: {},
    })
    expect(result.success).toBe(true)
  })

  it('should accept full config', () => {
    const result = serviceConfigSchema.safeParse({
      name: 'CloudFront',
      region: 'us-east-1',
      cache: { enabled: true, ttl: 86400, hitRate: 0.85 },
      latency: { base: 20, perRequest: 0.5 },
      cost: { perRequest: 0.001, perGB: 0.085, monthly: 5 },
      security: { waf: true, ddosProtection: true },
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing name', () => {
    const result = serviceConfigSchema.safeParse({
      latency: { base: 3 },
      cost: {},
    })
    expect(result.success).toBe(false)
  })
})
