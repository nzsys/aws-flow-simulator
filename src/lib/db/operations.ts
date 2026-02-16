import { getDB } from './schema'
import type { TrafficProfile, SimulationResult } from '@/types'

type ArchitectureInput = {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly nodes: unknown[]
  readonly edges: unknown[]
}

type SimulationInput = {
  readonly id: string
  readonly architectureId: string
  readonly trafficProfile: TrafficProfile
  readonly results: SimulationResult
}

export async function saveArchitecture(arch: ArchitectureInput) {
  try {
    const db = await getDB()
    const existing = await db.get('architectures', arch.id)
    const now = new Date()

    const record = {
      ...arch,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    }

    await db.put('architectures', record)
    return record
  } catch (error) {
    throw new Error(
      `Failed to save architecture "${arch.name}": ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export async function loadArchitecture(id: string) {
  try {
    const db = await getDB()
    const architecture = await db.get('architectures', id)

    if (!architecture) {
      return null
    }

    return architecture
  } catch (error) {
    throw new Error(
      `Failed to load architecture "${id}": ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export async function listArchitectures() {
  try {
    const db = await getDB()
    const all = await db.getAllFromIndex('architectures', 'by-date')

    return [...all].reverse()
  } catch (error) {
    throw new Error(
      `Failed to list architectures: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export async function deleteArchitecture(id: string) {
  try {
    const db = await getDB()
    const tx = db.transaction(['architectures', 'simulations'], 'readwrite')

    const simIndex = tx.objectStore('simulations').index('by-architecture')
    let simCursor = await simIndex.openCursor(IDBKeyRange.only(id))

    while (simCursor) {
      await simCursor.delete()
      simCursor = await simCursor.continue()
    }

    await tx.objectStore('architectures').delete(id)
    await tx.done
  } catch (error) {
    throw new Error(
      `Failed to delete architecture "${id}": ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export async function saveSimulation(sim: SimulationInput) {
  try {
    const db = await getDB()

    const record = {
      ...sim,
      timestamp: new Date(),
    }

    await db.put('simulations', record)
    return record
  } catch (error) {
    throw new Error(
      `Failed to save simulation "${sim.id}": ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export async function listSimulations(architectureId: string) {
  try {
    const db = await getDB()
    const all = await db.getAllFromIndex('simulations', 'by-architecture', architectureId)

    return [...all].reverse()
  } catch (error) {
    throw new Error(
      `Failed to list simulations for architecture "${architectureId}": ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
