import type { ValidationResult } from '../lib/validation/validator'
import type { AWSServiceType } from './aws-services'

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

export type ServiceLatencyEntry = {
  readonly service: string
  readonly serviceType: AWSServiceType
  readonly baseMs: number
  readonly p50Ms: number
  readonly p99Ms: number
}

export type LatencyBreakdownResult = {
  readonly perService: readonly ServiceLatencyEntry[]
  readonly totalP50: number
  readonly totalP99: number
}

export type ScalabilityServiceEntry = {
  readonly service: string
  readonly currentCapacity: number
  readonly maxCapacity: number
  readonly isFargate: boolean
}

export type ScalabilityResult = {
  readonly bottleneckService: string | null
  readonly maxRPS: number
  readonly headroomPercent: number
  readonly autoScalingEnabled: boolean
  readonly perService: readonly ScalabilityServiceEntry[]
}

export type CostCategory = 'compute' | 'storage' | 'dataTransfer' | 'requests'

export type CostCategoryEntry = {
  readonly service: string
  readonly category: CostCategory
  readonly amount: number
}

export type OperationalCostBreakdown = {
  readonly compute: number
  readonly storage: number
  readonly dataTransfer: number
  readonly requests: number
  readonly perService: readonly CostCategoryEntry[]
}

export type AdvancedResult = {
  readonly latencyBreakdown: LatencyBreakdownResult
  readonly scalability: ScalabilityResult
  readonly operationalCost: OperationalCostBreakdown
}

export type SimulationResult = {
  readonly performance: PerformanceResult
  readonly cost: CostResult
  readonly security: SecurityResult
  readonly availability: AvailabilityResult
  readonly validation?: ValidationResult
  readonly advanced?: AdvancedResult
}

export type SimulationRecord = {
  readonly id: string
  readonly architectureId: string
  readonly trafficProfile: TrafficProfile
  readonly results: SimulationResult
  readonly timestamp: Date
}
