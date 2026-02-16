import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { TrafficProfile, SimulationResult } from '@/types'

type AWSFlowSimulatorDB = {
  architectures: {
    key: string
    value: {
      id: string
      name: string
      description?: string
      nodes: unknown[]
      edges: unknown[]
      createdAt: Date
      updatedAt: Date
    }
    indexes: { 'by-date': Date }
  }
  simulations: {
    key: string
    value: {
      id: string
      architectureId: string
      trafficProfile: TrafficProfile
      results: SimulationResult
      timestamp: Date
    }
    indexes: { 'by-architecture': string; 'by-date': Date }
  }
} & DBSchema

let dbPromise: Promise<IDBPDatabase<AWSFlowSimulatorDB>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AWSFlowSimulatorDB>('aws-flow-simulator', 1, {
      upgrade(db) {
        const archStore = db.createObjectStore('architectures', { keyPath: 'id' })
        archStore.createIndex('by-date', 'updatedAt')
        const simStore = db.createObjectStore('simulations', { keyPath: 'id' })
        simStore.createIndex('by-architecture', 'architectureId')
        simStore.createIndex('by-date', 'timestamp')
      },
    })
  }
  return dbPromise
}

export function _resetForTesting() {
  dbPromise = null
}
