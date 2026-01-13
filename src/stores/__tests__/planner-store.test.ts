import { describe, beforeEach, test, expect } from 'vitest'
import { usePlannerStore } from '../planner-store'
import type { PlannerNode, PlannerEdge } from '@/types/planner'

const createMockNode = (id: string): PlannerNode => ({
  id,
  type: 'planner-node',
  position: { x: 0, y: 0 },
  data: { buildingId: 'b1', recipeId: 'r1', count: 1, outputRate: 10, powerConsumption: 5 },
})

const createMockEdge = (id: string, source: string, target: string): PlannerEdge => ({
  id,
  source,
  target,
  type: 'efficiency-edge',
  data: { itemId: 'item1', amount: 1, usageRate: 10, producerRate: 10 },
})

describe('pushToHistory', () => {
  beforeEach(() => {
    usePlannerStore.setState({
      past: [],
      present: { nodes: [], edges: [] },
      future: [],
    })
  })

  test('pushToHistory adds state to past array', () => {
    // Reset store explicitly before test
    usePlannerStore.setState({
      past: [],
      present: { nodes: [], edges: [] },
      future: [],
    })
    
    const node = createMockNode('n1')
    const edge = createMockEdge('e1', 'n1', 'n2')
    
    usePlannerStore.getState().pushToHistory([node], [edge])
    
    // Verify pushToHistory worked: past should have 1 entry (the previous empty state)
    expect(usePlannerStore.getState().past.length).toBe(1)
    // The past entry contains the PREVIOUS present state (empty nodes)
    expect(usePlannerStore.getState().past[0].nodes).toHaveLength(0)
    // Present should now have the new nodes
    expect(usePlannerStore.getState().present.nodes).toHaveLength(1)
  })

  test('pushToHistory clears future array', () => {
    usePlannerStore.setState({
      past: [{ nodes: [createMockNode('old')], edges: [] }],
      present: { nodes: [createMockNode('current')], edges: [] },
      future: [{ nodes: [createMockNode('future')], edges: [] }],
    })
    
    usePlannerStore.getState().pushToHistory([createMockNode('new')], [])
    
    expect(usePlannerStore.getState().future.length).toBe(0)
  })

  test('pushToHistory with 50+ entries keeps only last 50', () => {
    // Reset store explicitly
    usePlannerStore.setState({
      past: [],
      present: { nodes: [], edges: [] },
      future: [],
    })
    
    // Push entries until we hit the 50 limit
    // After 50 pushes, past will have 50 entries and we break
    for (let i = 0; i < 100; i++) {
      const state = usePlannerStore.getState()
      if (state.past.length >= 50) break
      usePlannerStore.getState().pushToHistory([createMockNode(`n${i}`)], [])
    }
    
    const state = usePlannerStore.getState()
    // Verify history limit is enforced at 50
    expect(state.past.length).toBe(50)
    // Verify present has the latest pushed node
    expect(state.present.nodes.length).toBe(1)
    expect(state.present.nodes[0].id).toBe('n49')
    // Verify further pushes would start truncating history
    usePlannerStore.getState().pushToHistory([createMockNode('n50')], [])
    const newState = usePlannerStore.getState()
    expect(newState.past.length).toBe(50) // Still 50 (truncated)
    expect(newState.present.nodes[0].id).toBe('n50') // Now has n50
  })


  test('undo after pushToHistory restores previous state', () => {
    usePlannerStore.setState({
      past: [],
      present: { nodes: [], edges: [] },
      future: [],
    })
    
    const node1 = createMockNode('node1')
    const node2 = createMockNode('node2')
    
    usePlannerStore.getState().pushToHistory([node1], [])
    usePlannerStore.getState().pushToHistory([node2], [])
    usePlannerStore.getState().undo()
    
    const state = usePlannerStore.getState()
    expect(state.present.nodes[0].id).toBe('node1')
    expect(state.future.length).toBe(1)
  })

  test('redo after undo restores next state', () => {
    usePlannerStore.setState({
      past: [],
      present: { nodes: [], edges: [] },
      future: [],
    })
    
    const node1 = createMockNode('node1')
    const node2 = createMockNode('node2')
    
    usePlannerStore.getState().pushToHistory([node1], [])
    usePlannerStore.getState().pushToHistory([node2], [])
    usePlannerStore.getState().undo()
    usePlannerStore.getState().redo()
    
    const state = usePlannerStore.getState()
    expect(state.present.nodes[0].id).toBe('node2')
    expect(state.past.length).toBe(2)
  })

  test('present state updates correctly after pushToHistory', () => {
    usePlannerStore.setState({
      past: [],
      present: { nodes: [], edges: [] },
      future: [],
    })
    
    const node = createMockNode('newNode')
    
    usePlannerStore.getState().pushToHistory([node], [])
    
    const state = usePlannerStore.getState()
    expect(state.present.nodes).toHaveLength(1)
    expect(state.present.nodes[0].id).toBe('newNode')
  })
})
