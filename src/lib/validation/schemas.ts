import { z } from 'zod/v4'

export const trafficProfileSchema = z.object({
  requestsPerSecond: z.number().min(0).max(1_000_000),
  averagePayloadSize: z.number().min(0).max(1_000_000),
  readWriteRatio: z.number().min(0).max(1),
  geoDistribution: z.array(
    z.object({
      region: z.string().min(1),
      percentage: z.number().min(0).max(100),
    }),
  ),
})

export const architectureNameSchema = z.string().min(1).max(100)

export const serviceNodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const dragEventDataSchema = z.object({
  serviceType: z.string().min(1),
})

export const cacheConfigSchema = z.object({
  enabled: z.boolean(),
  ttl: z.number().min(0),
  hitRate: z.number().min(0).max(1),
})

export const latencyConfigSchema = z.object({
  base: z.number().min(0),
  perRequest: z.number().min(0).optional(),
})

export const costConfigSchema = z.object({
  perRequest: z.number().min(0).optional(),
  perGB: z.number().min(0).optional(),
  monthly: z.number().min(0).optional(),
})

export const securityConfigSchema = z.object({
  waf: z.boolean().optional(),
  ddosProtection: z.boolean().optional(),
  encryption: z.boolean().optional(),
})

export const serviceConfigSchema = z.object({
  name: z.string().min(1),
  region: z.string().optional(),
  cache: cacheConfigSchema.optional(),
  latency: latencyConfigSchema,
  cost: costConfigSchema,
  security: securityConfigSchema.optional(),
  specific: z.record(z.string(), z.unknown()).optional(),
})
