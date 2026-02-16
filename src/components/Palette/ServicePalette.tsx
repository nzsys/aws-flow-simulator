import { useMemo } from 'react'
import {
  ENABLED_SERVICES,
  INFRASTRUCTURE_SERVICES,
  SERVICE_DEFINITIONS,
} from '@/lib/constants/services'
import { ServiceCard } from './ServiceCard'
import type { ServiceDefinition } from '@/lib/constants/services'

type ServiceCategory = ServiceDefinition['category']

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  networking: 'ネットワーキング',
  compute: 'コンピューティング',
  storage: 'ストレージ',
  database: 'データベース',
  messaging: 'メッセージング',
  security: 'セキュリティ',
  infrastructure: 'インフラストラクチャ',
}

const CATEGORY_ORDER: readonly ServiceCategory[] = [
  'networking',
  'compute',
  'storage',
  'database',
  'messaging',
  'security',
  'infrastructure',
] as const

function groupByCategory(
  definitions: readonly ServiceDefinition[],
): Map<ServiceCategory, ServiceDefinition[]> {
  const groups = new Map<ServiceCategory, ServiceDefinition[]>()

  for (const definition of definitions) {
    const existing = groups.get(definition.category) ?? []
    groups.set(definition.category, [...existing, definition])
  }

  return groups
}

export function ServicePalette() {
  const grouped = useMemo(() => {
    const allServiceTypes = [...ENABLED_SERVICES, ...INFRASTRUCTURE_SERVICES]
    const allDefinitions = allServiceTypes.map((type) => SERVICE_DEFINITIONS[type])
    return groupByCategory(allDefinitions)
  }, [])

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-gray-50">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">AWS Services</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-4">
          {CATEGORY_ORDER.map((category) => {
            const services = grouped.get(category)
            if (!services || services.length === 0) {
              return null
            }

            return (
              <section key={category}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="flex flex-col gap-1.5">
                  {services.map((definition) => (
                    <ServiceCard key={definition.type} definition={definition} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
