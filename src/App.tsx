import { useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { Header } from './components/Header/Header'
import { ServicePalette } from './components/Palette/ServicePalette'
import { FlowCanvas } from './components/Canvas/FlowCanvas'
import { ConnectionToast } from './components/Canvas/ConnectionToast'
import { ConfigPanel } from './components/ConfigPanel/ConfigPanel'
import { SimulationControls } from './components/Simulation/SimulationControls'
import { ResultsDashboard } from './components/Results/ResultsDashboard'
import { SaveDialog } from './components/Storage/SaveDialog'
import { LoadDialog } from './components/Storage/LoadDialog'
import { useUIStore } from './store/ui'
import { seedPresetsIfEmpty } from './lib/db/seed'

export default function App() {
  const saveDialogOpen = useUIStore((s) => s.saveDialogOpen)
  const loadDialogOpen = useUIStore((s) => s.loadDialogOpen)
  const simulationPanelOpen = useUIStore((s) => s.simulationPanelOpen)

  useEffect(() => {
    seedPresetsIfEmpty().catch(() => {
      // Preset seeding is non-critical; app functions without presets
    })
  }, [])

  return (
    <div className="flex h-screen flex-col">
      <Header />

      <div className="flex min-h-0 flex-1">
        <ServicePalette />
        <div className="flex-1">
          <ReactFlowProvider>
            <FlowCanvas />
          </ReactFlowProvider>
        </div>
      </div>

      <ConfigPanel />
      {simulationPanelOpen && <SimulationControls />}
      {simulationPanelOpen && <ResultsDashboard />}

      <ConnectionToast />
      {saveDialogOpen && <SaveDialog />}
      {loadDialogOpen && <LoadDialog />}
    </div>
  )
}
