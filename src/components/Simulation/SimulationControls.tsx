import { useCallback } from 'react'
import { useSimulationStore } from '@/store/simulation'
import { useArchitectureStore } from '@/store/architecture'
import { runSimulation } from '@/lib/simulation/engine'

export function SimulationControls() {
  const trafficProfile = useSimulationStore((s) => s.trafficProfile)
  const isRunning = useSimulationStore((s) => s.isRunning)
  const setTrafficProfile = useSimulationStore((s) => s.setTrafficProfile)
  const setResults = useSimulationStore((s) => s.setResults)
  const setIsRunning = useSimulationStore((s) => s.setIsRunning)

  const nodes = useArchitectureStore((s) => s.nodes)
  const edges = useArchitectureStore((s) => s.edges)

  const handleRequestsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(1, Math.min(10000, Number(e.target.value) || 1))
      setTrafficProfile({ requestsPerSecond: value })
    },
    [setTrafficProfile]
  )

  const handlePayloadChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(1, Math.min(1000, Number(e.target.value) || 1))
      setTrafficProfile({ averagePayloadSize: value })
    },
    [setTrafficProfile]
  )

  const handleRatioChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTrafficProfile({ readWriteRatio: Number(e.target.value) })
    },
    [setTrafficProfile]
  )

  const handleRunSimulation = useCallback(async () => {
    setIsRunning(true)
    try {
      const result = runSimulation(nodes, edges, trafficProfile)
      setResults(result)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Simulation failed'
      setResults(null)
      throw new Error(message)
    } finally {
      setIsRunning(false)
    }
  }, [nodes, edges, trafficProfile, setIsRunning, setResults])

  return (
    <div className="flex items-center gap-6 border-t border-slate-200 bg-white px-6 py-3">
      <div className="flex items-center gap-2">
        <label
          htmlFor="requests-per-sec"
          className="whitespace-nowrap text-sm font-medium text-slate-700"
        >
          Requests/sec
        </label>
        <input
          id="requests-per-sec"
          type="number"
          min={1}
          max={10000}
          value={trafficProfile.requestsPerSecond}
          onChange={handleRequestsChange}
          className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <label
          htmlFor="payload-size"
          className="whitespace-nowrap text-sm font-medium text-slate-700"
        >
          Payload Size
        </label>
        <div className="flex items-center gap-1">
          <input
            id="payload-size"
            type="number"
            min={1}
            max={1000}
            value={trafficProfile.averagePayloadSize}
            onChange={handlePayloadChange}
            className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-500">KB</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label
          htmlFor="read-write-ratio"
          className="whitespace-nowrap text-sm font-medium text-slate-700"
        >
          Read/Write
        </label>
        <input
          id="read-write-ratio"
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={trafficProfile.readWriteRatio}
          onChange={handleRatioChange}
          className="w-24"
        />
        <span className="w-8 text-sm text-slate-500">
          {trafficProfile.readWriteRatio.toFixed(1)}
        </span>
      </div>

      <button
        type="button"
        disabled={isRunning || nodes.length === 0}
        onClick={handleRunSimulation}
        className="ml-auto flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRunning && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {isRunning ? 'Running...' : 'Run Simulation'}
      </button>
    </div>
  )
}
