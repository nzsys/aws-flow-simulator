import { memo, useMemo } from 'react'
import type { OperationalCostBreakdown } from '@/types'

type OperationalCostProps = {
  readonly operationalCost: OperationalCostBreakdown
}

const CATEGORY_COLORS = {
  compute: 'bg-orange-500',
  storage: 'bg-blue-500',
  dataTransfer: 'bg-purple-500',
  requests: 'bg-emerald-500',
} as const

const CATEGORY_LABELS = {
  compute: 'Compute',
  storage: 'Storage',
  dataTransfer: 'Data Transfer',
  requests: 'Requests',
} as const

function OperationalCostComponent({ operationalCost }: OperationalCostProps) {
  const total = useMemo(
    () =>
      operationalCost.compute +
      operationalCost.storage +
      operationalCost.dataTransfer +
      operationalCost.requests,
    [operationalCost],
  )

  const categories = useMemo(
    () => [
      { key: 'compute' as const, amount: operationalCost.compute },
      { key: 'storage' as const, amount: operationalCost.storage },
      { key: 'dataTransfer' as const, amount: operationalCost.dataTransfer },
      { key: 'requests' as const, amount: operationalCost.requests },
    ],
    [operationalCost],
  )

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon bg-emerald-100 text-emerald-700">O</div>
        <h3>Operational Cost</h3>
      </div>

      <div className="mb-4 rounded-md bg-emerald-50 px-3 py-2">
        <p className="text-xs text-slate-500">Total Monthly</p>
        <p className="text-2xl font-bold text-emerald-700">${total.toFixed(2)}</p>
      </div>

      {total > 0 && (
        <div className="mb-4">
          <div className="flex h-4 w-full overflow-hidden rounded-full">
            {categories.map(
              ({ key, amount }) =>
                amount > 0 && (
                  <div
                    key={key}
                    className={`${CATEGORY_COLORS[key]} h-full`}
                    style={{ width: `${(amount / total) * 100}%` }}
                    title={`${CATEGORY_LABELS[key]}: $${amount.toFixed(2)}`}
                  />
                ),
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {categories.map(({ key, amount }) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${CATEGORY_COLORS[key]}`} />
              <span className="text-slate-600">{CATEGORY_LABELS[key]}</span>
            </div>
            <span className="font-medium text-slate-800">${amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const OperationalCost = memo(OperationalCostComponent)
