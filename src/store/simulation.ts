import { create } from 'zustand'
import type { TrafficProfile, SimulationResult } from '@/types'

interface SimulationState {
  trafficProfile: TrafficProfile
  results: SimulationResult | null
  isRunning: boolean

  setTrafficProfile: (profile: Partial<TrafficProfile>) => void
  setResults: (results: SimulationResult | null) => void
  setIsRunning: (running: boolean) => void
  reset: () => void
}

const defaultTrafficProfile: TrafficProfile = {
  requestsPerSecond: 100,
  averagePayloadSize: 10,
  readWriteRatio: 0.2,
  geoDistribution: [{ region: 'us-east-1', percentage: 100 }],
}

export const useSimulationStore = create<SimulationState>((set) => ({
  trafficProfile: { ...defaultTrafficProfile },
  results: null,
  isRunning: false,

  setTrafficProfile: (profile) =>
    set((state) => ({
      trafficProfile: {
        ...state.trafficProfile,
        ...profile,
      },
    })),

  setResults: (results) => set({ results }),

  setIsRunning: (running) => set({ isRunning: running }),

  reset: () =>
    set({
      trafficProfile: { ...defaultTrafficProfile },
      results: null,
      isRunning: false,
    }),
}))
