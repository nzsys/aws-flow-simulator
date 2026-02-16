import { describe, it, expect } from 'vitest'
import { PRESET_ARCHITECTURES } from './presets'
import { canConnect } from '@/lib/validation/connection-validator'
import { canNestIn } from '@/lib/constants/services'
import { validateArchitecture } from '@/lib/validation/validator'
import { getConnectionProtocol } from '@/lib/validation/rules'
import type { AWSServiceType } from '@/types'

describe('PRESET_ARCHITECTURES', () => {
  it('contains exactly 9 presets', () => {
    expect(PRESET_ARCHITECTURES).toHaveLength(9)
  })

  it('each preset has unique ID', () => {
    const ids = PRESET_ARCHITECTURES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('each preset has name, description, nodes, and edges', () => {
    for (const preset of PRESET_ARCHITECTURES) {
      expect(preset.name).toBeTruthy()
      expect(preset.description).toBeTruthy()
      expect(preset.nodes.length).toBeGreaterThan(0)
      expect(preset.edges.length).toBeGreaterThan(0)
    }
  })

  it('all node IDs within a preset are unique', () => {
    for (const preset of PRESET_ARCHITECTURES) {
      const nodeIds = preset.nodes.map((n) => n.id)
      expect(new Set(nodeIds).size).toBe(nodeIds.length)
    }
  })

  it('all edge source/target references exist in the preset nodes', () => {
    for (const preset of PRESET_ARCHITECTURES) {
      const nodeIds = new Set(preset.nodes.map((n) => n.id))
      for (const edge of preset.edges) {
        expect(nodeIds.has(edge.source)).toBe(true)
        expect(nodeIds.has(edge.target)).toBe(true)
      }
    }
  })

  it('all edges represent valid connections', () => {
    for (const preset of PRESET_ARCHITECTURES) {
      const nodeMap = new Map(preset.nodes.map((n) => [n.id, n.data.serviceType]))
      for (const edge of preset.edges) {
        const sourceType = nodeMap.get(edge.source) as AWSServiceType
        const targetType = nodeMap.get(edge.target) as AWSServiceType
        const result = canConnect(sourceType, targetType)
        expect(result.allowed).toBe(true)
      }
    }
  })

  it('each node has a valid config with name and latency', () => {
    for (const preset of PRESET_ARCHITECTURES) {
      for (const node of preset.nodes) {
        expect(node.data.config.name).toBeTruthy()
        expect(node.data.config.latency).toBeDefined()
        expect(node.data.config.latency.base).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('preset IDs start with "preset-"', () => {
    for (const preset of PRESET_ARCHITECTURES) {
      expect(preset.id).toMatch(/^preset-/)
    }
  })

  it('all parentId references point to existing nodes with valid nesting', () => {
    for (const preset of PRESET_ARCHITECTURES) {
      const nodeMap = new Map(preset.nodes.map((n) => [n.id, n]))
      for (const node of preset.nodes) {
        if (node.parentId) {
          const parent = nodeMap.get(node.parentId)
          expect(parent).toBeDefined()
          expect(node.extent).toBe('parent')
          expect(
            canNestIn(node.data.serviceType, parent!.data.serviceType),
          ).toBe(true)
        }
      }
    }
  })

  it('VPC-based presets use correct node types', () => {
    for (const preset of PRESET_ARCHITECTURES) {
      for (const node of preset.nodes) {
        if (node.data.serviceType === 'vpc') {
          expect(node.type).toBe('vpcGroup')
        } else if (node.data.serviceType === 'subnet') {
          expect(node.type).toBe('subnetGroup')
        } else {
          expect(node.type).toBe('awsService')
        }
      }
    }
  })

  it('all presets pass viability validation without errors', () => {
    for (const preset of PRESET_ARCHITECTURES) {
      const flowNodes = preset.nodes.map((n) => ({
        id: n.id,
        data: { serviceType: n.data.serviceType, parentId: n.parentId },
      }))
      const flowEdges = preset.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }))
      const result = validateArchitecture(flowNodes, flowEdges)
      expect(result.isValid).toBe(true)
    }
  })

  it('all preset edges have correct protocol assigned', () => {
    for (const preset of PRESET_ARCHITECTURES) {
      const nodeMap = new Map(preset.nodes.map((n) => [n.id, n.data.serviceType]))
      for (const edge of preset.edges) {
        const sourceType = nodeMap.get(edge.source) as AWSServiceType
        const targetType = nodeMap.get(edge.target) as AWSServiceType
        const expectedProtocol = getConnectionProtocol(sourceType, targetType)
        expect(edge.data.protocol).toBe(expectedProtocol)
      }
    }
  })

  it('EKS Microservices preset contains EKS service', () => {
    const eksPreset = PRESET_ARCHITECTURES.find((p) => p.id === 'preset-eks-microservices')
    expect(eksPreset).toBeDefined()
    const serviceTypes = eksPreset!.nodes.map((n) => n.data.serviceType)
    expect(serviceTypes).toContain('eks')
    expect(serviceTypes).toContain('rds')
    expect(serviceTypes).toContain('elasticache')
    expect(eksPreset!.edges.length).toBe(5)
  })

  it('Event-Driven preset contains messaging services', () => {
    const edPreset = PRESET_ARCHITECTURES.find((p) => p.id === 'preset-event-driven')
    expect(edPreset).toBeDefined()
    const serviceTypes = edPreset!.nodes.map((n) => n.data.serviceType)
    expect(serviceTypes).toContain('sns')
    expect(serviceTypes).toContain('sqs')
    expect(serviceTypes).toContain('kinesis')
    expect(edPreset!.edges.length).toBe(9)
  })

  it('Enterprise E-Commerce preset uses 18 services with 14 edges', () => {
    const eecPreset = PRESET_ARCHITECTURES.find((p) => p.id === 'preset-enterprise-ecommerce')
    expect(eecPreset).toBeDefined()
    const serviceTypes = eecPreset!.nodes.map((n) => n.data.serviceType)
    const uniqueTypes = new Set(serviceTypes)

    // 18 unique service types, 20 nodes total (subnet x3)
    expect(uniqueTypes.size).toBe(18)
    expect(eecPreset!.nodes).toHaveLength(20)

    // Flow services
    expect(serviceTypes).toContain('route53')
    expect(serviceTypes).toContain('cloudfront')
    expect(serviceTypes).toContain('waf')
    expect(serviceTypes).toContain('alb')
    expect(serviceTypes).toContain('api-gateway')
    expect(serviceTypes).toContain('ecs')
    expect(serviceTypes).toContain('lambda')
    expect(serviceTypes).toContain('rds')
    expect(serviceTypes).toContain('elasticache')
    expect(serviceTypes).toContain('dynamodb')
    expect(serviceTypes).toContain('s3')
    expect(serviceTypes).toContain('sqs')
    expect(serviceTypes).toContain('sns')
    expect(serviceTypes).toContain('kinesis')
    expect(serviceTypes).toContain('ec2')

    // Infrastructure services
    expect(serviceTypes).toContain('vpc')
    expect(serviceTypes).toContain('subnet')
    expect(serviceTypes).toContain('nat-gateway')

    // 15 edges
    expect(eecPreset!.edges).toHaveLength(15)
  })

  it('Secure Three-Tier preset contains shield, waf, and security services', () => {
    const sttPreset = PRESET_ARCHITECTURES.find((p) => p.id === 'preset-secure-three-tier')
    expect(sttPreset).toBeDefined()
    const serviceTypes = sttPreset!.nodes.map((n) => n.data.serviceType)

    expect(serviceTypes).toContain('shield')
    expect(serviceTypes).toContain('waf')
    expect(serviceTypes).toContain('route53')
    expect(serviceTypes).toContain('cloudfront')
    expect(serviceTypes).toContain('alb')
    expect(serviceTypes).toContain('ecs')
    expect(serviceTypes).toContain('rds')
    expect(serviceTypes).toContain('elasticache')
    expect(serviceTypes).toContain('nat-gateway')
    expect(sttPreset!.nodes).toHaveLength(13)
    expect(sttPreset!.edges).toHaveLength(7)
  })

  it('Serverless Full-Stack SPA preset contains lambda, rds, s3 with VPC nesting', () => {
    const sfsPreset = PRESET_ARCHITECTURES.find((p) => p.id === 'preset-serverless-fullstack')
    expect(sfsPreset).toBeDefined()
    const serviceTypes = sfsPreset!.nodes.map((n) => n.data.serviceType)

    expect(serviceTypes).toContain('lambda')
    expect(serviceTypes).toContain('rds')
    expect(serviceTypes).toContain('s3')
    expect(serviceTypes).toContain('api-gateway')
    expect(serviceTypes).toContain('cloudfront')
    expect(serviceTypes).toContain('dynamodb')
    expect(serviceTypes).toContain('elasticache')
    expect(serviceTypes).toContain('nat-gateway')

    // Lambda is inside VPC (has parentId through subnet)
    const lambdaNode = sfsPreset!.nodes.find((n) => n.data.serviceType === 'lambda')
    expect(lambdaNode!.parentId).toBeDefined()

    expect(sfsPreset!.nodes).toHaveLength(11)
    expect(sfsPreset!.edges).toHaveLength(7)
  })
})
