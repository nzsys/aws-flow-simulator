import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from './ui'

beforeEach(() => {
  useUIStore.setState({
    configPanelOpen: false,
    resultsPanelOpen: false,
    saveDialogOpen: false,
    loadDialogOpen: false,
    simulationPanelOpen: false,
  })
})

describe('useUIStore', () => {
  it('should start with all panels closed', () => {
    const state = useUIStore.getState()

    expect(state.configPanelOpen).toBe(false)
    expect(state.resultsPanelOpen).toBe(false)
    expect(state.saveDialogOpen).toBe(false)
    expect(state.loadDialogOpen).toBe(false)
    expect(state.simulationPanelOpen).toBe(false)
  })

  it('should toggle panels independently', () => {
    useUIStore.getState().setConfigPanelOpen(true)

    expect(useUIStore.getState().configPanelOpen).toBe(true)
    expect(useUIStore.getState().saveDialogOpen).toBe(false)
  })

  it('should open and close dialogs', () => {
    useUIStore.getState().setSaveDialogOpen(true)
    expect(useUIStore.getState().saveDialogOpen).toBe(true)

    useUIStore.getState().setSaveDialogOpen(false)
    expect(useUIStore.getState().saveDialogOpen).toBe(false)
  })

  it('should toggle simulation panel', () => {
    expect(useUIStore.getState().simulationPanelOpen).toBe(false)

    useUIStore.getState().toggleSimulationPanel()
    expect(useUIStore.getState().simulationPanelOpen).toBe(true)

    useUIStore.getState().toggleSimulationPanel()
    expect(useUIStore.getState().simulationPanelOpen).toBe(false)
  })
})
