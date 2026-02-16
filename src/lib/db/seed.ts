import { getDB } from './schema'
import { PRESET_ARCHITECTURES } from './presets'

export async function seedPresetsIfEmpty(): Promise<void> {
  try {
    const db = await getDB()
    const count = await db.count('architectures')

    if (count > 0) {
      return
    }

    const now = new Date()
    const tx = db.transaction('architectures', 'readwrite')

    for (const preset of PRESET_ARCHITECTURES) {
      await tx.store.put({
        id: preset.id,
        name: preset.name,
        description: preset.description,
        nodes: preset.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
          ...(n.parentId ? { parentId: n.parentId, extent: n.extent } : {}),
          ...(n.style ? { style: n.style } : {}),
        })),
        edges: preset.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
          animated: e.animated,
        })),
        createdAt: now,
        updatedAt: now,
      })
    }

    await tx.done
  } catch (error) {
    throw new Error(
      `Failed to seed preset architectures: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
