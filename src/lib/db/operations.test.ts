import { describe, it, expect, beforeEach } from 'vitest'
import { _resetForTesting } from './schema'
import {
  saveArchitecture,
  loadArchitecture,
  listArchitectures,
  deleteArchitecture,
  saveSimulation,
  listSimulations,
} from './operations'
import 'fake-indexeddb/auto'

beforeEach(() => {
  _resetForTesting()
  // Clear all IndexedDB databases
  indexedDB = new IDBFactory()
})

describe('architecture operations', () => {
  it('should save and load an architecture', async () => {
    const arch = {
      id: 'arch-1',
      name: 'Test Architecture',
      nodes: [{ id: 'n1', type: 'awsService' }],
      edges: [],
    }

    await saveArchitecture(arch)
    const loaded = await loadArchitecture('arch-1')

    expect(loaded).toBeDefined()
    expect(loaded!.name).toBe('Test Architecture')
    expect(loaded!.nodes).toHaveLength(1)
  })

  it('should return null for non-existent architecture', async () => {
    const loaded = await loadArchitecture('non-existent')
    expect(loaded).toBeNull()
  })

  it('should preserve createdAt on update', async () => {
    const arch = {
      id: 'arch-1',
      name: 'Original',
      nodes: [],
      edges: [],
    }

    await saveArchitecture(arch)
    const first = await loadArchitecture('arch-1')
    const createdAt = first!.createdAt

    await saveArchitecture({ ...arch, name: 'Updated' })
    const second = await loadArchitecture('arch-1')

    expect(second!.name).toBe('Updated')
    expect(second!.createdAt.getTime()).toBe(createdAt.getTime())
  })

  it('should list architectures sorted by date descending', async () => {
    await saveArchitecture({ id: 'a1', name: 'First', nodes: [], edges: [] })
    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 10))
    await saveArchitecture({ id: 'a2', name: 'Second', nodes: [], edges: [] })

    const list = await listArchitectures()

    expect(list).toHaveLength(2)
    expect(list[0].name).toBe('Second') // most recent first
  })

  it('should delete architecture and related simulations', async () => {
    await saveArchitecture({ id: 'arch-1', name: 'Test', nodes: [], edges: [] })
    await saveSimulation({
      id: 'sim-1',
      architectureId: 'arch-1',
      trafficProfile: {
        requestsPerSecond: 100,
        averagePayloadSize: 10,
        readWriteRatio: 0.2,
        geoDistribution: [],
      },
      results: {
        performance: {
          totalLatency: 0,
          p50Latency: 0,
          p99Latency: 0,
          ttfb: 0,
          cacheHitRate: 0,
          requestsReachingOrigin: 0,
        },
        cost: { monthly: 0, perRequest: 0, breakdown: [] },
        security: {
          ddosProtection: false,
          wafEnabled: false,
          encryptionInTransit: false,
          encryptionAtRest: false,
          score: 0,
        },
        availability: {
          singlePointsOfFailure: [],
          redundancyScore: 0,
          estimatedUptime: 0,
        },
      },
    })

    await deleteArchitecture('arch-1')

    const loaded = await loadArchitecture('arch-1')
    expect(loaded).toBeNull()

    const sims = await listSimulations('arch-1')
    expect(sims).toHaveLength(0)
  })
})

describe('simulation operations', () => {
  it('should save and list simulations', async () => {
    const sim = {
      id: 'sim-1',
      architectureId: 'arch-1',
      trafficProfile: {
        requestsPerSecond: 100,
        averagePayloadSize: 10,
        readWriteRatio: 0.2,
        geoDistribution: [],
      },
      results: {
        performance: {
          totalLatency: 50,
          p50Latency: 45,
          p99Latency: 90,
          ttfb: 3,
          cacheHitRate: 0.85,
          requestsReachingOrigin: 15,
        },
        cost: { monthly: 100, perRequest: 0.001, breakdown: [] },
        security: {
          ddosProtection: true,
          wafEnabled: false,
          encryptionInTransit: true,
          encryptionAtRest: true,
          score: 75,
        },
        availability: {
          singlePointsOfFailure: [],
          redundancyScore: 100,
          estimatedUptime: 0.9999,
        },
      },
    }

    await saveSimulation(sim)
    const list = await listSimulations('arch-1')

    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('sim-1')
    expect(list[0].results.performance.totalLatency).toBe(50)
  })

  it('should filter simulations by architecture', async () => {
    const baseSim = {
      trafficProfile: {
        requestsPerSecond: 100,
        averagePayloadSize: 10,
        readWriteRatio: 0.2,
        geoDistribution: [],
      },
      results: {
        performance: {
          totalLatency: 0,
          p50Latency: 0,
          p99Latency: 0,
          ttfb: 0,
          cacheHitRate: 0,
          requestsReachingOrigin: 0,
        },
        cost: { monthly: 0, perRequest: 0, breakdown: [] },
        security: {
          ddosProtection: false,
          wafEnabled: false,
          encryptionInTransit: false,
          encryptionAtRest: false,
          score: 0,
        },
        availability: {
          singlePointsOfFailure: [],
          redundancyScore: 0,
          estimatedUptime: 0,
        },
      },
    }

    await saveSimulation({ ...baseSim, id: 's1', architectureId: 'arch-1' })
    await saveSimulation({ ...baseSim, id: 's2', architectureId: 'arch-2' })

    const list1 = await listSimulations('arch-1')
    const list2 = await listSimulations('arch-2')

    expect(list1).toHaveLength(1)
    expect(list2).toHaveLength(1)
    expect(list1[0].id).toBe('s1')
    expect(list2[0].id).toBe('s2')
  })
})
