import { describe, it, expect } from 'vitest'
import type { Node } from '@xyflow/react'
import { getAbsolutePosition } from './FlowCanvas'

function makeNode(
  id: string,
  position: { x: number; y: number },
  parentId?: string,
): Node {
  return {
    id,
    position,
    data: {},
    ...(parentId ? { parentId } : {}),
  }
}

describe('getAbsolutePosition', () => {
  it('returns position as-is for root-level node (no parentId)', () => {
    const vpc = makeNode('vpc-1', { x: 100, y: 200 })

    const result = getAbsolutePosition(vpc, [vpc])

    expect(result).toEqual({ x: 100, y: 200 })
  })

  it('adds parent position for 1-level nested node', () => {
    const vpc = makeNode('vpc-1', { x: 100, y: 100 })
    const subnet = makeNode('subnet-1', { x: 20, y: 40 }, 'vpc-1')

    const result = getAbsolutePosition(subnet, [vpc, subnet])

    expect(result).toEqual({ x: 120, y: 140 })
  })

  it('accumulates positions through multiple nesting levels', () => {
    const vpc = makeNode('vpc-1', { x: 50, y: 50 })
    const subnet = makeNode('subnet-1', { x: 10, y: 20 }, 'vpc-1')
    const ec2 = makeNode('ec2-1', { x: 5, y: 5 }, 'subnet-1')

    const result = getAbsolutePosition(ec2, [vpc, subnet, ec2])

    expect(result).toEqual({ x: 65, y: 75 })
  })

  it('stops accumulating if parent node is not found', () => {
    const orphan = makeNode('orphan', { x: 30, y: 40 }, 'missing-parent')

    const result = getAbsolutePosition(orphan, [orphan])

    expect(result).toEqual({ x: 30, y: 40 })
  })
})
