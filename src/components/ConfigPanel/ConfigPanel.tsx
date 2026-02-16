import { useMemo } from 'react'
import { useArchitectureStore } from '@/store/architecture'
import { getServiceDefinition } from '@/lib/constants/services'
import { SpecificConfigPanel } from './SpecificConfigPanel'
import { NumberInput, CheckboxInput } from './config-inputs'
import type { AWSServiceType, ServiceConfig } from '@/types'
import type { ChangeEvent } from 'react'

const REGION_OPTIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'EU (Ireland)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
] as const

export function ConfigPanel() {
  const selectedNodeId = useArchitectureStore((state) => state.selectedNodeId)
  const nodes = useArchitectureStore((state) => state.nodes)
  const updateNodeConfig = useArchitectureStore((state) => state.updateNodeConfig)

  const selectedNode = useMemo(
    () => selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) : undefined,
    [selectedNodeId, nodes]
  )

  if (!selectedNode) {
    return (
      <div className="flex items-center justify-center border-t border-gray-200 bg-white px-4 py-6">
        <p className="text-sm text-gray-400">ノードを選択して設定を編集</p>
      </div>
    )
  }

  const config = selectedNode.data.config as ServiceConfig
  const serviceType = selectedNode.data.serviceType as string
  const definition = getServiceDefinition(serviceType as Parameters<typeof getServiceDefinition>[0])

  function updateConfig(partial: Partial<ServiceConfig>) {
    if (!selectedNodeId) return
    updateNodeConfig(selectedNodeId, partial)
  }

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    updateConfig({ name: event.target.value })
  }

  function handleRegionChange(event: ChangeEvent<HTMLSelectElement>) {
    updateConfig({ region: event.target.value })
  }

  function handleBaseLatencyChange(value: number) {
    updateConfig({
      latency: { ...config.latency, base: value },
    })
  }

  function handleCacheEnabledChange(value: boolean) {
    updateConfig({
      cache: { ...config.cache, enabled: value, ttl: config.cache?.ttl ?? 300, hitRate: config.cache?.hitRate ?? 0.5 },
    })
  }

  function handleCacheTTLChange(value: number) {
    updateConfig({
      cache: { ...config.cache, enabled: config.cache?.enabled ?? false, ttl: value, hitRate: config.cache?.hitRate ?? 0.5 },
    })
  }

  function handleCacheHitRateChange(event: ChangeEvent<HTMLInputElement>) {
    const percentage = parseInt(event.target.value, 10)
    updateConfig({
      cache: {
        ...config.cache,
        enabled: config.cache?.enabled ?? false,
        ttl: config.cache?.ttl ?? 300,
        hitRate: percentage / 100,
      },
    })
  }

  function handleCostPerRequestChange(value: number) {
    updateConfig({
      cost: { ...config.cost, perRequest: value },
    })
  }

  function handleCostPerGBChange(value: number) {
    updateConfig({
      cost: { ...config.cost, perGB: value },
    })
  }

  function handleCostMonthlyChange(value: number) {
    updateConfig({
      cost: { ...config.cost, monthly: value },
    })
  }

  function handleWAFChange(value: boolean) {
    updateConfig({
      security: { ...config.security, waf: value },
    })
  }

  function handleDDoSChange(value: boolean) {
    updateConfig({
      security: { ...config.security, ddosProtection: value },
    })
  }

  function handleEncryptionChange(value: boolean) {
    updateConfig({
      security: { ...config.security, encryption: value },
    })
  }

  return (
    <div className="max-h-64 overflow-y-auto border-t border-gray-200 bg-white px-4 py-3">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <div
          className="card-icon text-[10px] text-white"
          style={{ backgroundColor: definition.color }}
        >
          {definition.type.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{definition.label}</h3>
          <p className="text-xs text-gray-500">{definition.type}</p>
        </div>
      </div>

      {/* Common Settings */}
      <section className="mb-3 border-b border-gray-100 pb-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          基本設定
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-600">Name</span>
            <input
              type="text"
              value={config.name}
              onChange={handleNameChange}
              className="input-compact"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-600">Region</span>
            <select
              value={config.region ?? 'ap-northeast-1'}
              onChange={handleRegionChange}
              className="input-compact"
            >
              {REGION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Latency Settings */}
      <section className="mb-3 border-b border-gray-100 pb-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          レイテンシ
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Base Latency"
            value={config.latency.base}
            onChange={handleBaseLatencyChange}
            step={1}
            min={0}
            unit="ms"
          />
        </div>
      </section>

      {/* Cache Settings (conditional) */}
      {config.cache !== undefined ? (
        <section className="mb-3 border-b border-gray-100 pb-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            キャッシュ
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <CheckboxInput
              label="Enabled"
              checked={config.cache.enabled}
              onChange={handleCacheEnabledChange}
            />
            <NumberInput
              label="TTL"
              value={config.cache.ttl}
              onChange={handleCacheTTLChange}
              step={1}
              min={0}
              unit="sec"
            />
            <label className="col-span-2 flex flex-col gap-0.5">
              <span className="text-xs text-gray-600">
                Hit Rate: {Math.round(config.cache.hitRate * 100)}%
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(config.cache.hitRate * 100)}
                onChange={handleCacheHitRateChange}
                className="h-1.5 w-full cursor-pointer accent-blue-600"
              />
            </label>
          </div>
        </section>
      ) : null}

      {/* Cost Settings */}
      <section className="mb-3 border-b border-gray-100 pb-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          コスト
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Per Request"
            value={config.cost.perRequest}
            onChange={handleCostPerRequestChange}
            step={0.0000001}
            min={0}
            unit="USD"
          />
          <NumberInput
            label="Per GB"
            value={config.cost.perGB}
            onChange={handleCostPerGBChange}
            step={0.001}
            min={0}
            unit="USD"
          />
          <NumberInput
            label="Monthly Fixed"
            value={config.cost.monthly}
            onChange={handleCostMonthlyChange}
            step={0.1}
            min={0}
            unit="USD"
          />
        </div>
      </section>

      {/* Security Settings */}
      <section className="mb-3 border-b border-gray-100 pb-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          セキュリティ
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <CheckboxInput
            label="WAF"
            checked={config.security?.waf ?? false}
            onChange={handleWAFChange}
          />
          <CheckboxInput
            label="DDoS Protection"
            checked={config.security?.ddosProtection ?? false}
            onChange={handleDDoSChange}
          />
          <CheckboxInput
            label="Encryption"
            checked={config.security?.encryption ?? false}
            onChange={handleEncryptionChange}
          />
        </div>
      </section>

      {/* Service-specific Settings */}
      <SpecificConfigPanel
        serviceType={serviceType as AWSServiceType}
        specific={config.specific}
        config={config}
        updateConfig={updateConfig}
      />
    </div>
  )
}
