import { useSimulationStore } from '@/store/simulation'
import { useUIStore } from '@/store/ui'
import { PerformanceMetrics } from './PerformanceMetrics'
import { CostBreakdown } from './CostBreakdown'
import { SecurityScore } from './SecurityScore'
import { ValidationPanel } from './ValidationPanel'
import { LatencyBreakdown } from './LatencyBreakdown'
import { ScalabilityPanel } from './ScalabilityPanel'
import { OperationalCost } from './OperationalCost'
import type { AvailabilityResult } from '@/types'
import { memo } from 'react'

type AvailabilityCardProps = {
  readonly availability: AvailabilityResult
}

function AvailabilityCardComponent({ availability }: AvailabilityCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon bg-purple-100 text-purple-700">
          A
        </div>
        <h3>Availability</h3>
      </div>

      <div className="mb-4 rounded-md bg-purple-50 px-3 py-2">
        <p className="text-xs text-slate-500">Estimated Uptime</p>
        <p className="text-2xl font-bold text-purple-700">
          {(availability.estimatedUptime * 100).toFixed(1)}
          <span className="ml-1 text-sm font-normal">%</span>
        </p>
      </div>

      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-slate-500">Redundancy Score</span>
        <span className="font-medium text-slate-800">{availability.redundancyScore}%</span>
      </div>

      {availability.singlePointsOfFailure.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-red-600">Single Points of Failure</p>
          <ul className="space-y-1">
            {availability.singlePointsOfFailure.map((spof) => (
              <li key={spof} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                {spof}
              </li>
            ))}
          </ul>
        </div>
      )}

      {availability.singlePointsOfFailure.length === 0 && (
        <p className="text-xs text-green-600">No single points of failure detected</p>
      )}
    </div>
  )
}

const AvailabilityCard = memo(AvailabilityCardComponent)

export function ResultsDashboard() {
  const results = useSimulationStore((s) => s.results)
  const advancedMode = useUIStore((s) => s.advancedMode)
  const toggleAdvancedMode = useUIStore((s) => s.toggleAdvancedMode)

  if (!results) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12">
        <p className="text-sm text-slate-500">シミュレーションを実行して結果を表示</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Simulation Results</h2>
        <button
          type="button"
          onClick={toggleAdvancedMode}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            advancedMode
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {advancedMode ? 'Advanced' : 'Normal'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <PerformanceMetrics performance={results.performance} />
        <CostBreakdown cost={results.cost} />
        <SecurityScore security={results.security} />
        <AvailabilityCard availability={results.availability} />
        {results.validation && <ValidationPanel validation={results.validation} />}
      </div>

      {advancedMode && results.advanced && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <LatencyBreakdown latencyBreakdown={results.advanced.latencyBreakdown} />
          <ScalabilityPanel scalability={results.advanced.scalability} />
          <OperationalCost operationalCost={results.advanced.operationalCost} />
        </div>
      )}

      {advancedMode && !results.advanced && (
        <div className="mt-4 flex items-center justify-center rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-6 py-8">
          <p className="text-sm text-indigo-600">
            Advanced モードで再実行してください
          </p>
        </div>
      )}
    </div>
  )
}
