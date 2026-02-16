import { describe, it, expect } from 'vitest'
import { validateArchitecture } from './validator'
import type { AWSServiceType } from '@/types'

function makeNode(id: string, serviceType: AWSServiceType, parentId?: string) {
  return {
    id,
    data: { serviceType, parentId },
  }
}

function makeEdge(id: string, source: string, target: string) {
  return { id, source, target }
}

describe('validateArchitecture', () => {
  it('should pass for valid architecture', () => {
    const nodes = [
      makeNode('1', 'route53'),
      makeNode('2', 'cloudfront'),
      makeNode('3', 'alb'),
      makeNode('4', 'ecs'),
    ]
    const edges = [
      makeEdge('e1', '1', '2'),
      makeEdge('e2', '2', '3'),
      makeEdge('e3', '3', '4'),
    ]

    const result = validateArchitecture(nodes, edges)

    expect(result.isValid).toBe(true)
    expect(result.errorCount).toBe(0)
  })

  it('should detect invalid connections', () => {
    const nodes = [
      makeNode('1', 's3'),
      makeNode('2', 'ec2'),
    ]
    const edges = [makeEdge('e1', '1', '2')]

    const result = validateArchitecture(nodes, edges)

    const connectionErrors = result.issues.filter(
      (i) => i.category === 'connection' && i.severity === 'error',
    )
    expect(connectionErrors.length).toBeGreaterThan(0)
  })

  it('should warn about suboptimal connections', () => {
    const nodes = [
      makeNode('1', 'cloudfront'),
      makeNode('2', 'rds'),
    ]
    const edges = [makeEdge('e1', '1', '2')]

    const result = validateArchitecture(nodes, edges)

    const warnings = result.issues.filter(
      (i) => i.severity === 'warning' && i.category === 'connection',
    )
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('should warn about placement violations', () => {
    const nodes = [
      makeNode('1', 'rds'),
    ]

    const result = validateArchitecture(nodes, [])

    const placementWarnings = result.issues.filter((i) => i.category === 'placement')
    expect(placementWarnings.length).toBeGreaterThan(0)
  })

  it('should warn about missing dependencies', () => {
    const nodes = [
      makeNode('1', 'nat-gateway'),
    ]

    const result = validateArchitecture(nodes, [])

    const depWarnings = result.issues.filter((i) => i.category === 'dependency')
    expect(depWarnings.length).toBeGreaterThan(0)
    expect(depWarnings[0].message).toContain('internet-gateway')
  })

  it('should handle empty architecture', () => {
    const result = validateArchitecture([], [])

    expect(result.isValid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('should count errors, warnings, and info correctly', () => {
    const nodes = [
      makeNode('1', 'nat-gateway'),
      makeNode('2', 'rds'),
    ]

    const result = validateArchitecture(nodes, [])

    expect(result.warningCount).toBeGreaterThan(0)
    expect(result.errorCount + result.warningCount + result.infoCount).toBe(
      result.issues.length,
    )
  })
})

describe('validateViability', () => {
  it('should warn when no entry point exists', () => {
    const nodes = [
      makeNode('1', 'ecs'),
      makeNode('2', 'rds'),
    ]
    const edges = [makeEdge('e1', '1', '2')]

    const result = validateArchitecture(nodes, edges)

    const viabilityWarnings = result.issues.filter(
      (i) => i.category === 'viability' && i.severity === 'warning',
    )
    expect(viabilityWarnings.some((w) => w.message.includes('entry point'))).toBe(true)
  })

  it('should warn when database exists without compute layer', () => {
    const nodes = [
      makeNode('1', 'route53'),
      makeNode('2', 'rds'),
    ]
    const edges = [makeEdge('e1', '1', '2')]

    const result = validateArchitecture(nodes, edges)

    const viabilityWarnings = result.issues.filter(
      (i) => i.category === 'viability' && i.severity === 'warning',
    )
    expect(viabilityWarnings.some((w) => w.message.includes('compute layer'))).toBe(true)
  })

  it('should not warn about compute when no database exists', () => {
    const nodes = [
      makeNode('1', 'route53'),
      makeNode('2', 'cloudfront'),
      makeNode('3', 's3'),
    ]
    const edges = [
      makeEdge('e1', '1', '2'),
      makeEdge('e2', '2', '3'),
    ]

    const result = validateArchitecture(nodes, edges)

    const computeWarnings = result.issues.filter(
      (i) => i.category === 'viability' && i.message.includes('compute layer'),
    )
    expect(computeWarnings).toHaveLength(0)
  })

  it('should warn about unreachable backend services', () => {
    const nodes = [
      makeNode('1', 'route53'),
      makeNode('2', 'cloudfront'),
      makeNode('3', 'ecs'),
      makeNode('4', 'rds'),
    ]
    const edges = [makeEdge('e1', '1', '2')]

    const result = validateArchitecture(nodes, edges)

    const unreachableWarnings = result.issues.filter(
      (i) => i.category === 'viability' && i.message.includes('unreachable'),
    )
    expect(unreachableWarnings.length).toBeGreaterThan(0)
  })

  it('should detect isolated flow nodes', () => {
    const nodes = [
      makeNode('1', 'route53'),
      makeNode('2', 'ecs'),
    ]

    const result = validateArchitecture(nodes, [])

    const isolatedInfos = result.issues.filter(
      (i) => i.category === 'viability' && i.severity === 'info' && i.message.includes('isolated'),
    )
    expect(isolatedInfos).toHaveLength(2)
  })

  it('should not flag infrastructure-only nodes for viability', () => {
    const nodes = [
      makeNode('1', 'vpc'),
      makeNode('2', 'subnet'),
    ]

    const result = validateArchitecture(nodes, [])

    const viabilityIssues = result.issues.filter((i) => i.category === 'viability')
    expect(viabilityIssues).toHaveLength(0)
  })
})
