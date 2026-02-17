import { memo } from 'react'
import type { LatencyBreakdownResult } from '@/types'

type LatencyBreakdownProps = {
  readonly latencyBreakdown: LatencyBreakdownResult
}

function getP99Color(p99Ms: number): string {
  if (p99Ms < 50) return 'text-green-600'
  if (p99Ms < 200) return 'text-yellow-600'
  return 'text-red-600'
}

function getP99BgColor(p99Ms: number): string {
  if (p99Ms < 50) return 'bg-green-100'
  if (p99Ms < 200) return 'bg-yellow-100'
  return 'bg-red-100'
}

function LatencyBreakdownComponent({ latencyBreakdown }: LatencyBreakdownProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon bg-cyan-100 text-cyan-700">L</div>
        <h3>Latency Breakdown</h3>
      </div>

      <div className="mb-4 flex gap-3">
        <div className="flex-1 rounded-md bg-cyan-50 px-3 py-2">
          <p className="text-xs text-slate-500">Total P50</p>
          <p className="text-lg font-bold text-cyan-700">
            {latencyBreakdown.totalP50.toFixed(1)}
            <span className="ml-1 text-xs font-normal">ms</span>
          </p>
        </div>
        <div className="flex-1 rounded-md bg-cyan-50 px-3 py-2">
          <p className="text-xs text-slate-500">Total P99</p>
          <p className="text-lg font-bold text-cyan-700">
            {latencyBreakdown.totalP99.toFixed(1)}
            <span className="ml-1 text-xs font-normal">ms</span>
          </p>
        </div>
      </div>

      {latencyBreakdown.perService.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-1 text-left font-medium text-slate-500">Service</th>
                <th className="pb-1 text-right font-medium text-slate-500">Base</th>
                <th className="pb-1 text-right font-medium text-slate-500">P50</th>
                <th className="pb-1 text-right font-medium text-slate-500">P99</th>
              </tr>
            </thead>
            <tbody>
              {latencyBreakdown.perService.map((entry) => (
                <tr key={entry.service} className="border-b border-slate-100">
                  <td className="py-1 text-slate-700">{entry.service}</td>
                  <td className="py-1 text-right text-slate-600">{entry.baseMs}ms</td>
                  <td className="py-1 text-right text-slate-600">{entry.p50Ms}ms</td>
                  <td className="py-1 text-right">
                    <span
                      className={`inline-block rounded px-1 ${getP99BgColor(entry.p99Ms)} ${getP99Color(entry.p99Ms)}`}
                    >
                      {entry.p99Ms}ms
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export const LatencyBreakdown = memo(LatencyBreakdownComponent)
