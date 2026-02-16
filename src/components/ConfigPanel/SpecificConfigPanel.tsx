import type {
  AWSServiceType,
  ServiceConfig,
  ServiceSpecificConfig,
  EC2Config,
  RDSConfig,
  ECSConfig,
  EKSConfig,
  LambdaConfig,
  ElastiCacheConfig,
  SQSConfig,
} from '@/types'
import { SelectInput, NumberInput, CheckboxInput } from './config-inputs'
import {
  calculateEC2MonthlyCost,
  calculateRDSMonthlyCost,
  calculateECSMonthlyCost,
  calculateEKSMonthlyCost,
  calculateLambdaMonthlyCost,
  calculateElastiCacheMonthlyCost,
  calculateSQSMonthlyCost,
  EC2_INSTANCE_TYPES,
  RDS_INSTANCE_CLASSES,
  ECS_CPU_OPTIONS,
  ECS_MEMORY_OPTIONS,
  LAMBDA_MEMORY_OPTIONS,
  ELASTICACHE_NODE_TYPES,
  EKS_INSTANCE_TYPES,
  EKS_NODE_GROUP_TYPES,
  SQS_QUEUE_TYPES,
} from '@/lib/costs/calculator'

type Props = {
  readonly serviceType: AWSServiceType
  readonly specific: ServiceSpecificConfig | undefined
  readonly config: ServiceConfig
  readonly updateConfig: (partial: Partial<ServiceConfig>) => void
}

function updateSpecificAndCost(
  currentConfig: ServiceConfig,
  specificUpdate: ServiceSpecificConfig,
  monthlyCost: number,
  updateConfig: (partial: Partial<ServiceConfig>) => void,
) {
  updateConfig({
    specific: specificUpdate,
    cost: { ...currentConfig.cost, monthly: Math.round(monthlyCost * 100) / 100 },
  })
}

function EC2Panel({
  specific,
  config,
  updateConfig,
}: {
  readonly specific: EC2Config
  readonly config: ServiceConfig
  readonly updateConfig: (partial: Partial<ServiceConfig>) => void
}) {
  function handleInstanceTypeChange(value: string) {
    const updated = { ...specific, instanceType: value }
    const cost = calculateEC2MonthlyCost(value, specific.instanceCount)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  function handleInstanceCountChange(value: number) {
    const count = Math.max(1, Math.round(value))
    const updated = { ...specific, instanceCount: count }
    const cost = calculateEC2MonthlyCost(specific.instanceType, count)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  function handleAutoScalingChange(value: boolean) {
    const updated = { ...specific, autoScaling: value }
    updateConfig({ specific: updated })
  }

  return (
    <>
      <SelectInput
        label="Instance Type"
        value={specific.instanceType}
        options={EC2_INSTANCE_TYPES.map((t) => ({ value: t, label: t }))}
        onChange={handleInstanceTypeChange}
      />
      <NumberInput
        label="Instance Count"
        value={specific.instanceCount}
        onChange={handleInstanceCountChange}
        min={1}
        max={100}
      />
      <CheckboxInput
        label="Auto Scaling"
        checked={specific.autoScaling}
        onChange={handleAutoScalingChange}
      />
    </>
  )
}

function RDSPanel({
  specific,
  config,
  updateConfig,
}: {
  readonly specific: RDSConfig
  readonly config: ServiceConfig
  readonly updateConfig: (partial: Partial<ServiceConfig>) => void
}) {
  function handleInstanceClassChange(value: string) {
    const updated = { ...specific, instanceClass: value }
    const cost = calculateRDSMonthlyCost(value, specific.multiAZ, specific.readReplicas, specific.storageGB)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  function handleMultiAZChange(value: boolean) {
    const updated = { ...specific, multiAZ: value }
    const cost = calculateRDSMonthlyCost(specific.instanceClass, value, specific.readReplicas, specific.storageGB)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  function handleReadReplicasChange(value: number) {
    const replicas = Math.max(0, Math.round(value))
    const updated = { ...specific, readReplicas: replicas }
    const cost = calculateRDSMonthlyCost(specific.instanceClass, specific.multiAZ, replicas, specific.storageGB)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  function handleStorageGBChange(value: number) {
    const storage = Math.max(20, Math.round(value))
    const updated = { ...specific, storageGB: storage }
    const cost = calculateRDSMonthlyCost(specific.instanceClass, specific.multiAZ, specific.readReplicas, storage)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  return (
    <>
      <SelectInput
        label="Instance Class"
        value={specific.instanceClass}
        options={RDS_INSTANCE_CLASSES.map((c) => ({ value: c, label: c }))}
        onChange={handleInstanceClassChange}
      />
      <CheckboxInput
        label="Multi-AZ"
        checked={specific.multiAZ}
        onChange={handleMultiAZChange}
      />
      <NumberInput
        label="Read Replicas"
        value={specific.readReplicas}
        onChange={handleReadReplicasChange}
        min={0}
        max={5}
      />
      <NumberInput
        label="Storage"
        value={specific.storageGB}
        onChange={handleStorageGBChange}
        min={20}
        max={65536}
        unit="GB"
      />
    </>
  )
}

function ECSPanel({
  specific,
  config,
  updateConfig,
}: {
  readonly specific: ECSConfig
  readonly config: ServiceConfig
  readonly updateConfig: (partial: Partial<ServiceConfig>) => void
}) {
  function handleLaunchTypeChange(value: string) {
    const launchType = value as 'fargate' | 'ec2'
    const updated = { ...specific, launchType }
    const cost = calculateECSMonthlyCost(launchType, specific.taskCount, specific.cpu, specific.memory)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  function handleTaskCountChange(value: number) {
    const taskCount = Math.max(1, Math.round(value))
    const updated = { ...specific, taskCount }
    const cost = calculateECSMonthlyCost(specific.launchType, taskCount, specific.cpu, specific.memory)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  function handleCPUChange(value: string) {
    const cpu = parseFloat(value)
    const updated = { ...specific, cpu }
    const cost = calculateECSMonthlyCost(specific.launchType, specific.taskCount, cpu, specific.memory)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  function handleMemoryChange(value: string) {
    const memory = parseFloat(value)
    const updated = { ...specific, memory }
    const cost = calculateECSMonthlyCost(specific.launchType, specific.taskCount, specific.cpu, memory)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  function handleAutoScalingEnabledChange(value: boolean) {
    const updated = {
      ...specific,
      autoScaling: { ...specific.autoScaling, enabled: value },
    }
    updateConfig({ specific: updated })
  }

  function handleAutoScalingMinChange(value: number) {
    const min = Math.max(1, Math.round(value))
    const max = Math.max(min, specific.autoScaling.max)
    const updated = {
      ...specific,
      autoScaling: { ...specific.autoScaling, min, max },
    }
    updateConfig({ specific: updated })
  }

  function handleAutoScalingMaxChange(value: number) {
    const max = Math.max(1, Math.round(value))
    const min = Math.min(max, specific.autoScaling.min)
    const updated = {
      ...specific,
      autoScaling: { ...specific.autoScaling, min, max },
    }
    updateConfig({ specific: updated })
  }

  function handleTargetCPUChange(value: number) {
    const targetCPU = Math.min(100, Math.max(1, Math.round(value)))
    const updated = {
      ...specific,
      autoScaling: { ...specific.autoScaling, targetCPU },
    }
    updateConfig({ specific: updated })
  }

  return (
    <>
      <SelectInput
        label="Launch Type"
        value={specific.launchType}
        options={[
          { value: 'fargate', label: 'Fargate' },
          { value: 'ec2', label: 'EC2' },
        ]}
        onChange={handleLaunchTypeChange}
      />
      <NumberInput
        label="Task Count"
        value={specific.taskCount}
        onChange={handleTaskCountChange}
        min={1}
        max={100}
      />
      <SelectInput
        label="CPU (vCPU)"
        value={String(specific.cpu)}
        options={ECS_CPU_OPTIONS.map((c) => ({ value: String(c), label: `${c} vCPU` }))}
        onChange={handleCPUChange}
      />
      <SelectInput
        label="Memory (GB)"
        value={String(specific.memory)}
        options={ECS_MEMORY_OPTIONS.map((m) => ({ value: String(m), label: `${m} GB` }))}
        onChange={handleMemoryChange}
      />
      <CheckboxInput
        label="Auto Scaling"
        checked={specific.autoScaling.enabled}
        onChange={handleAutoScalingEnabledChange}
      />
      {specific.autoScaling.enabled ? (
        <>
          <NumberInput
            label="Min Tasks"
            value={specific.autoScaling.min}
            onChange={handleAutoScalingMinChange}
            min={1}
            max={100}
          />
          <NumberInput
            label="Max Tasks"
            value={specific.autoScaling.max}
            onChange={handleAutoScalingMaxChange}
            min={1}
            max={100}
          />
          <NumberInput
            label="Target CPU %"
            value={specific.autoScaling.targetCPU}
            onChange={handleTargetCPUChange}
            min={1}
            max={100}
            unit="%"
          />
        </>
      ) : null}
    </>
  )
}

function LambdaPanel({
  specific,
  config,
  updateConfig,
}: {
  readonly specific: LambdaConfig
  readonly config: ServiceConfig
  readonly updateConfig: (partial: Partial<ServiceConfig>) => void
}) {
  function handleMemoryChange(value: string) {
    const memoryMB = parseInt(value, 10)
    const updated = { ...specific, memoryMB }
    const cost = calculateLambdaMonthlyCost(memoryMB)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  function handleTimeoutChange(value: number) {
    const timeoutSeconds = Math.max(1, Math.min(900, Math.round(value)))
    const updated = { ...specific, timeoutSeconds }
    updateConfig({ specific: updated })
  }

  function handleConcurrencyChange(value: number) {
    const concurrency = Math.max(1, Math.round(value))
    const updated = { ...specific, concurrency }
    updateConfig({ specific: updated })
  }

  return (
    <>
      <SelectInput
        label="Memory"
        value={String(specific.memoryMB)}
        options={LAMBDA_MEMORY_OPTIONS.map((m) => ({ value: String(m), label: `${m} MB` }))}
        onChange={handleMemoryChange}
      />
      <NumberInput
        label="Timeout"
        value={specific.timeoutSeconds}
        onChange={handleTimeoutChange}
        min={1}
        max={900}
        unit="sec"
      />
      <NumberInput
        label="Concurrency"
        value={specific.concurrency}
        onChange={handleConcurrencyChange}
        min={1}
        max={10000}
      />
    </>
  )
}

function ElastiCachePanel({
  specific,
  config,
  updateConfig,
}: {
  readonly specific: ElastiCacheConfig
  readonly config: ServiceConfig
  readonly updateConfig: (partial: Partial<ServiceConfig>) => void
}) {
  function handleEngineChange(value: string) {
    const engine = value as 'redis' | 'memcached'
    const updated = { ...specific, engine }
    updateConfig({ specific: updated })
  }

  function handleNodeTypeChange(value: string) {
    const updated = { ...specific, nodeType: value }
    const cost = calculateElastiCacheMonthlyCost(value, specific.numNodes)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  function handleNumNodesChange(value: number) {
    const numNodes = Math.max(1, Math.round(value))
    const updated = { ...specific, numNodes }
    const cost = calculateElastiCacheMonthlyCost(specific.nodeType, numNodes)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  function handleClusterModeChange(value: boolean) {
    const updated = { ...specific, clusterMode: value }
    updateConfig({ specific: updated })
  }

  return (
    <>
      <SelectInput
        label="Engine"
        value={specific.engine}
        options={[
          { value: 'redis', label: 'Redis' },
          { value: 'memcached', label: 'Memcached' },
        ]}
        onChange={handleEngineChange}
      />
      <SelectInput
        label="Node Type"
        value={specific.nodeType}
        options={ELASTICACHE_NODE_TYPES.map((t) => ({ value: t, label: t }))}
        onChange={handleNodeTypeChange}
      />
      <NumberInput
        label="Nodes"
        value={specific.numNodes}
        onChange={handleNumNodesChange}
        min={1}
        max={40}
      />
      <CheckboxInput
        label="Cluster Mode"
        checked={specific.clusterMode}
        onChange={handleClusterModeChange}
      />
    </>
  )
}

function EKSPanel({
  specific,
  config,
  updateConfig,
}: {
  readonly specific: EKSConfig
  readonly config: ServiceConfig
  readonly updateConfig: (partial: Partial<ServiceConfig>) => void
}) {
  function handleNodeGroupTypeChange(value: string) {
    const nodeGroupType = value as 'managed' | 'fargate'
    const updated = { ...specific, nodeGroupType }
    const cost = calculateEKSMonthlyCost(nodeGroupType, specific.nodeCount, specific.instanceType)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  function handleNodeCountChange(value: number) {
    const nodeCount = Math.max(1, Math.round(value))
    const updated = { ...specific, nodeCount }
    const cost = calculateEKSMonthlyCost(specific.nodeGroupType, nodeCount, specific.instanceType)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  function handleInstanceTypeChange(value: string) {
    const updated = { ...specific, instanceType: value }
    const cost = calculateEKSMonthlyCost(specific.nodeGroupType, specific.nodeCount, value)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  function handleAutoScalingEnabledChange(value: boolean) {
    const updated = {
      ...specific,
      autoScaling: { ...specific.autoScaling, enabled: value },
    }
    updateConfig({ specific: updated })
  }

  return (
    <>
      <SelectInput
        label="Node Group Type"
        value={specific.nodeGroupType}
        options={EKS_NODE_GROUP_TYPES.map((t) => ({ value: t, label: t === 'managed' ? 'Managed' : 'Fargate' }))}
        onChange={handleNodeGroupTypeChange}
      />
      <NumberInput
        label="Node Count"
        value={specific.nodeCount}
        onChange={handleNodeCountChange}
        min={1}
        max={100}
      />
      <SelectInput
        label="Instance Type"
        value={specific.instanceType}
        options={EKS_INSTANCE_TYPES.map((t) => ({ value: t, label: t }))}
        onChange={handleInstanceTypeChange}
      />
      <CheckboxInput
        label="Auto Scaling"
        checked={specific.autoScaling.enabled}
        onChange={handleAutoScalingEnabledChange}
      />
    </>
  )
}

function SQSPanel({
  specific,
  config,
  updateConfig,
}: {
  readonly specific: SQSConfig
  readonly config: ServiceConfig
  readonly updateConfig: (partial: Partial<ServiceConfig>) => void
}) {
  function handleQueueTypeChange(value: string) {
    const queueType = value as 'standard' | 'fifo'
    const updated = { ...specific, queueType }
    const cost = calculateSQSMonthlyCost(queueType)
    updateSpecificAndCost(config, updated, cost, updateConfig)
  }

  function handleVisibilityTimeoutChange(value: number) {
    const visibilityTimeout = Math.max(0, Math.min(43200, Math.round(value)))
    const updated = { ...specific, visibilityTimeout }
    updateConfig({ specific: updated })
  }

  function handleMessageRetentionChange(value: number) {
    const messageRetention = Math.max(60, Math.min(1209600, Math.round(value)))
    const updated = { ...specific, messageRetention }
    updateConfig({ specific: updated })
  }

  function handleDlqEnabledChange(value: boolean) {
    const updated = { ...specific, dlqEnabled: value }
    updateConfig({ specific: updated })
  }

  return (
    <>
      <SelectInput
        label="Queue Type"
        value={specific.queueType}
        options={SQS_QUEUE_TYPES.map((t) => ({ value: t, label: t === 'standard' ? 'Standard' : 'FIFO' }))}
        onChange={handleQueueTypeChange}
      />
      <NumberInput
        label="Visibility Timeout"
        value={specific.visibilityTimeout}
        onChange={handleVisibilityTimeoutChange}
        min={0}
        max={43200}
        unit="sec"
      />
      <NumberInput
        label="Message Retention"
        value={specific.messageRetention}
        onChange={handleMessageRetentionChange}
        min={60}
        max={1209600}
        unit="sec"
      />
      <CheckboxInput
        label="Dead Letter Queue"
        checked={specific.dlqEnabled}
        onChange={handleDlqEnabledChange}
      />
    </>
  )
}

const SERVICES_WITH_SPECIFIC_PANEL: ReadonlySet<AWSServiceType> = new Set([
  'ec2',
  'rds',
  'ecs',
  'eks',
  'lambda',
  'elasticache',
  'sqs',
])

export function SpecificConfigPanel({ serviceType, specific, config, updateConfig }: Props) {
  if (!specific || !SERVICES_WITH_SPECIFIC_PANEL.has(serviceType)) {
    return null
  }

  return (
    <section className="mb-3 border-b border-gray-100 pb-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        スペック設定
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {serviceType === 'ec2' ? (
          <EC2Panel specific={specific as EC2Config} config={config} updateConfig={updateConfig} />
        ) : null}
        {serviceType === 'rds' ? (
          <RDSPanel specific={specific as RDSConfig} config={config} updateConfig={updateConfig} />
        ) : null}
        {serviceType === 'ecs' ? (
          <ECSPanel specific={specific as ECSConfig} config={config} updateConfig={updateConfig} />
        ) : null}
        {serviceType === 'eks' ? (
          <EKSPanel specific={specific as EKSConfig} config={config} updateConfig={updateConfig} />
        ) : null}
        {serviceType === 'lambda' ? (
          <LambdaPanel specific={specific as LambdaConfig} config={config} updateConfig={updateConfig} />
        ) : null}
        {serviceType === 'elasticache' ? (
          <ElastiCachePanel specific={specific as ElastiCacheConfig} config={config} updateConfig={updateConfig} />
        ) : null}
        {serviceType === 'sqs' ? (
          <SQSPanel specific={specific as SQSConfig} config={config} updateConfig={updateConfig} />
        ) : null}
      </div>
    </section>
  )
}
