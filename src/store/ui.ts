import { create } from 'zustand'

type ConnectionFeedback = {
  readonly message: string
  readonly type: 'error' | 'warning'
}

type UIState = {
  readonly configPanelOpen: boolean
  readonly resultsPanelOpen: boolean
  readonly saveDialogOpen: boolean
  readonly loadDialogOpen: boolean
  readonly simulationPanelOpen: boolean
  readonly advancedMode: boolean
  readonly connectionFeedback: ConnectionFeedback | null

  readonly setConfigPanelOpen: (open: boolean) => void
  readonly setResultsPanelOpen: (open: boolean) => void
  readonly setSaveDialogOpen: (open: boolean) => void
  readonly setLoadDialogOpen: (open: boolean) => void
  readonly toggleSimulationPanel: () => void
  readonly toggleAdvancedMode: () => void
  readonly setConnectionFeedback: (feedback: ConnectionFeedback | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  configPanelOpen: false,
  resultsPanelOpen: false,
  saveDialogOpen: false,
  loadDialogOpen: false,
  simulationPanelOpen: false,
  advancedMode: false,
  connectionFeedback: null,

  setConfigPanelOpen: (open) => set({ configPanelOpen: open }),
  setResultsPanelOpen: (open) => set({ resultsPanelOpen: open }),
  setSaveDialogOpen: (open) => set({ saveDialogOpen: open }),
  setLoadDialogOpen: (open) => set({ loadDialogOpen: open }),
  toggleSimulationPanel: () => set((state) => ({ simulationPanelOpen: !state.simulationPanelOpen })),
  toggleAdvancedMode: () => set((state) => ({ advancedMode: !state.advancedMode })),
  setConnectionFeedback: (feedback) => set({ connectionFeedback: feedback }),
}))
