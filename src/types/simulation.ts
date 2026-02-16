import type { ValidationResult } from '../lib/validation/validator'

export type TrafficProfile = {
  readonly requestsPerSecond: number
  readonly averagePayloadSize: number
  readonly readWriteRatio: number
  readonly geoDistribution: readonly {
    readonly region: string
    readonly percentage: number
  }[]
}

export type PerformanceResult = {
  readonly totalLatency: number
  readonly p50Latency: number
  readonly p99Latency: number
  readonly ttfb: number
  readonly cacheHitRate: number
  readonly requestsReachingOrigin: number
}

export type CostResult = {
  readonly monthly: number
  readonly perRequest: number
  readonly breakdown: readonly {
    readonly service: string
    readonly amount: number
  }[]
}

export type SecurityResult = {
  readonly ddosProtection: boolean
  readonly wafEnabled: boolean
  readonly encryptionInTransit: boolean
  readonly encryptionAtRest: boolean
  readonly score: number
}

export type AvailabilityResult = {
  readonly singlePointsOfFailure: readonly string[]
  readonly redundancyScore: number
  readonly estimatedUptime: number
}

export type SimulationResult = {
  readonly performance: PerformanceResult
  readonly cost: CostResult
  readonly security: SecurityResult
  readonly availability: AvailabilityResult
  readonly validation?: ValidationResult
}

export type SimulationRecord = {
  readonly id: string
  readonly architectureId: string
  readonly trafficProfile: TrafficProfile
  readonly results: SimulationResult
  readonly timestamp: Date
}
