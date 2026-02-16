import { describe, it, expect } from 'vitest'
import {
  SERVICE_DEFINITIONS,
  ENABLED_SERVICES,
  INFRASTRUCTURE_SERVICES,
  NESTING_RULES,
  getServiceDefinition,
  isInfrastructureService,
  canNestIn,
} from './services'
import type { AWSServiceType } from '@/types'

describe('SERVICE_DEFINITIONS', () => {
  it('should have definitions for all enabled services', () => {
    for (const serviceType of ENABLED_SERVICES) {
      expect(SERVICE_DEFINITIONS[serviceType]).toBeDefined()
      expect(SERVICE_DEFINITIONS[serviceType].type).toBe(serviceType)
    }
  })

  it('should have definitions for all infrastructure services', () => {
    for (const serviceType of INFRASTRUCTURE_SERVICES) {
      expect(SERVICE_DEFINITIONS[serviceType]).toBeDefined()
      expect(SERVICE_DEFINITIONS[serviceType].role).toBe('infrastructure')
    }
  })

  it('should have valid defaultConfig for each service', () => {
    const allTypes = Object.keys(SERVICE_DEFINITIONS) as AWSServiceType[]

    for (const type of allTypes) {
      const def = SERVICE_DEFINITIONS[type]
      expect(def.defaultConfig.name).toBeTruthy()
      expect(def.defaultConfig.latency.base).toBeGreaterThanOrEqual(0)
    }
  })

  it('should have unique labels', () => {
    const labels = Object.values(SERVICE_DEFINITIONS).map((d) => d.label)
    const uniqueLabels = new Set(labels)
    expect(labels.length).toBe(uniqueLabels.size)
  })

  it('should mark all enabled services as flow role', () => {
    for (const serviceType of ENABLED_SERVICES) {
      expect(SERVICE_DEFINITIONS[serviceType].role).toBe('flow')
    }
  })
})

describe('getServiceDefinition', () => {
  it('should return the correct definition', () => {
    const def = getServiceDefinition('route53')
    expect(def.label).toBe('Route 53')
    expect(def.category).toBe('networking')
  })
})

describe('isInfrastructureService', () => {
  it('should return true for infrastructure services', () => {
    expect(isInfrastructureService('vpc')).toBe(true)
    expect(isInfrastructureService('subnet')).toBe(true)
    expect(isInfrastructureService('security-group')).toBe(true)
  })

  it('should return false for flow services', () => {
    expect(isInfrastructureService('route53')).toBe(false)
    expect(isInfrastructureService('ecs')).toBe(false)
    expect(isInfrastructureService('rds')).toBe(false)
  })
})

describe('NESTING_RULES', () => {
  it('should allow subnets inside VPC', () => {
    expect(NESTING_RULES.vpc).toContain('subnet')
  })

  it('should allow compute/db services inside subnet', () => {
    expect(NESTING_RULES.subnet).toContain('ecs')
    expect(NESTING_RULES.subnet).toContain('eks')
    expect(NESTING_RULES.subnet).toContain('rds')
    expect(NESTING_RULES.subnet).toContain('lambda')
  })
})

describe('new service definitions', () => {
  it('should have EKS defined as compute', () => {
    expect(SERVICE_DEFINITIONS.eks).toBeDefined()
    expect(SERVICE_DEFINITIONS.eks.category).toBe('compute')
    expect(SERVICE_DEFINITIONS.eks.role).toBe('flow')
  })

  it('should have SQS defined as messaging', () => {
    expect(SERVICE_DEFINITIONS.sqs).toBeDefined()
    expect(SERVICE_DEFINITIONS.sqs.category).toBe('messaging')
    expect(SERVICE_DEFINITIONS.sqs.role).toBe('flow')
  })

  it('should have SNS defined as messaging', () => {
    expect(SERVICE_DEFINITIONS.sns).toBeDefined()
    expect(SERVICE_DEFINITIONS.sns.category).toBe('messaging')
    expect(SERVICE_DEFINITIONS.sns.role).toBe('flow')
  })

  it('should have Kinesis defined as messaging', () => {
    expect(SERVICE_DEFINITIONS.kinesis).toBeDefined()
    expect(SERVICE_DEFINITIONS.kinesis.category).toBe('messaging')
    expect(SERVICE_DEFINITIONS.kinesis.role).toBe('flow')
  })

  it('should include new services in ENABLED_SERVICES', () => {
    expect(ENABLED_SERVICES).toContain('eks')
    expect(ENABLED_SERVICES).toContain('sqs')
    expect(ENABLED_SERVICES).toContain('sns')
    expect(ENABLED_SERVICES).toContain('kinesis')
  })
})

describe('canNestIn', () => {
  it('should allow subnet inside vpc', () => {
    expect(canNestIn('subnet', 'vpc')).toBe(true)
  })

  it('should allow ecs inside subnet', () => {
    expect(canNestIn('ecs', 'subnet')).toBe(true)
  })

  it('should reject ecs inside vpc directly', () => {
    expect(canNestIn('ecs', 'vpc')).toBe(false)
  })

  it('should reject vpc inside subnet', () => {
    expect(canNestIn('vpc', 'subnet')).toBe(false)
  })

  it('should reject nesting into non-group service', () => {
    expect(canNestIn('ecs', 'route53')).toBe(false)
  })
})
