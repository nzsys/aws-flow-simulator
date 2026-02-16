import { describe, it, expect, beforeEach } from 'vitest'
import { useSimulationStore } from './simulation'

beforeEach(() => {
  useSimulationStore.getState().reset()
})

describe('useSimulationStore', () => {
  it('should start with default traffic profile', () => {
    const state = useSimulationStore.getState()

    expect(state.trafficProfile.requestsPerSecond).toBe(100)
    expect(state.trafficProfile.averagePayloadSize).toBe(10)
    expect(state.results).toBeNull()
    expect(state.isRunning).toBe(false)
  })

  it('should update traffic profile immutably', () => {
    const original = useSimulationStore.getState().trafficProfile

    useSimulationStore.getState().setTrafficProfile({ requestsPerSecond: 500 })

    const updated = useSimulationStore.getState().trafficProfile
    expect(updated.requestsPerSecond).toBe(500)
    expect(updated.averagePayloadSize).toBe(10) // preserved
    expect(updated).not.toBe(original)
  })

  it('should set results', () => {
    const mockResults = {
      performance: {
        totalLatency: 100,
        p50Latency: 90,
        p99Latency: 180,
        ttfb: 3,
        cacheHitRate: 0.85,
        requestsReachingOrigin: 15,
      },
      cost: { monthly: 50, perRequest: 0.001, breakdown: [] },
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
    }

    useSimulationStore.getState().setResults(mockResults)

    expect(useSimulationStore.getState().results).toEqual(mockResults)
  })

  it('should toggle running state', () => {
    useSimulationStore.getState().setIsRunning(true)
    expect(useSimulationStore.getState().isRunning).toBe(true)

    useSimulationStore.getState().setIsRunning(false)
    expect(useSimulationStore.getState().isRunning).toBe(false)
  })

  it('should reset to defaults', () => {
    useSimulationStore.getState().setTrafficProfile({ requestsPerSecond: 999 })
    useSimulationStore.getState().setIsRunning(true)

    useSimulationStore.getState().reset()

    const state = useSimulationStore.getState()
    expect(state.trafficProfile.requestsPerSecond).toBe(100)
    expect(state.isRunning).toBe(false)
    expect(state.results).toBeNull()
  })
})
