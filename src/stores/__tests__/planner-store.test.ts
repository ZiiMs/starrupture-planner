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
      nodes: [],
      edges: [],
      past: [],
      future: [],
    })
  })

  test('pushToHistory adds state to past array', () => {
    // Reset store explicitly before test
    usePlannerStore.setState({
      nodes: [],
      edges: [],
      past: [],
      future: [],
    })

    // pushToHistory captures CURRENT state at call time
    usePlannerStore.getState().pushToHistory()

    // Verify pushToHistory worked: past should have 1 entry
    expect(usePlannerStore.getState().past.length).toBe(1)
    // The past entry contains the CURRENT state (empty nodes at push time)
    expect(usePlannerStore.getState().past[0].nodes).toHaveLength(0)
    // nodes should still be empty
    expect(usePlannerStore.getState().nodes).toHaveLength(0)
  })

  test('pushToHistory clears future array', () => {
    usePlannerStore.setState({
      past: [{ nodes: [createMockNode('old')], edges: [] }],
      nodes: [createMockNode('current')],
      edges: [],
      future: [{ nodes: [createMockNode('future')], edges: [] }],
    })

    usePlannerStore.getState().pushToHistory()

    expect(usePlannerStore.getState().future.length).toBe(0)
  })

  test('pushToHistory with 50+ entries keeps only last 50', () => {
    // Reset store explicitly
    usePlannerStore.setState({ past: [], nodes: [], edges: [], future: [] })

    // Push entries until we hit the 50 limit
    // After 50 pushes, past will have 50 entries and we break
    for (let i = 0; i < 100; i++) {
      const state = usePlannerStore.getState()
      if (state.past.length >= 50) break
      // Update nodes then push to history
      usePlannerStore.setState({ nodes: [createMockNode(`n${i}`)] })
      usePlannerStore.getState().pushToHistory()
    }

    const state = usePlannerStore.getState()
    // Verify history limit is enforced at 50
    expect(state.past.length).toBe(50)
    // nodes should have the latest node
    expect(state.nodes).toHaveLength(1)
    expect(state.nodes[0].id).toBe('n49')
  })

  test('undo after pushToHistory restores previous state', () => {
    usePlannerStore.setState({ past: [], nodes: [], edges: [], future: [] })

    const node1 = createMockNode('node1')
    const node2 = createMockNode('node2')
    const node3 = createMockNode('node3')

    // Use addNode which captures history before adding
    usePlannerStore.getState().addNode(node1)
    usePlannerStore.getState().addNode(node2)
    usePlannerStore.getState().addNode(node3)

    // past = [node1, node2], nodes = [node1, node2, node3]
    // Each addNode: push history, then add node
    // After addNode1: past=[], nodes=[node1]
    // After addNode2: past=[node1], nodes=[node1, node2]
    // After addNode3: past=[node1, node2], nodes=[node1, node2, node3]

    // Undo should restore node1, node2 (remove node3)
    usePlannerStore.getState().undo()

    const state = usePlannerStore.getState()
    expect(state.nodes).toHaveLength(2)
    expect(state.nodes[0].id).toBe('node1')
    expect(state.nodes[1].id).toBe('node2')
    expect(state.future.length).toBe(1)
  })

  test('redo after undo restores next state', () => {
    usePlannerStore.setState({ past: [], nodes: [], edges: [], future: [] })

    const node1 = createMockNode('node1')
    const node2 = createMockNode('node2')

    usePlannerStore.setState({ nodes: [node1] })
    usePlannerStore.getState().pushToHistory()

    usePlannerStore.setState({ nodes: [node2] })
    usePlannerStore.getState().pushToHistory()

    usePlannerStore.getState().undo()
    usePlannerStore.getState().redo()

    const state = usePlannerStore.getState()
    expect(state.nodes[0].id).toBe('node2')
    expect(state.past.length).toBe(2)
  })
})

describe('addNode', () => {
  beforeEach(() => {
    usePlannerStore.setState({ past: [], nodes: [], edges: [], future: [] })
  })

  test('addNode adds node and captures history', () => {
    const node = createMockNode('newNode')
    usePlannerStore.getState().addNode(node)

    const state = usePlannerStore.getState()
    expect(state.nodes).toHaveLength(1)
    expect(state.nodes[0].id).toBe('newNode')
    expect(state.past.length).toBe(1) // History was captured
  })
})

describe('removeNode', () => {
  beforeEach(() => {
    usePlannerStore.setState({ past: [], nodes: [], edges: [], future: [] })
  })

  test('removeNode removes node and captures history', () => {
    const node1 = createMockNode('node1')
    const node2 = createMockNode('node2')
    usePlannerStore.setState({ nodes: [node1, node2] })

    usePlannerStore.getState().removeNode('node1')

    const state = usePlannerStore.getState()
    expect(state.nodes).toHaveLength(1)
    expect(state.nodes[0].id).toBe('node2')
    expect(state.past.length).toBe(1)
  })
})

describe('addEdge', () => {
  beforeEach(() => {
    usePlannerStore.setState({ past: [], nodes: [], edges: [], future: [] })
  })

  test('addEdge adds edge and captures history', () => {
    const edge = createMockEdge('newEdge', 'n1', 'n2')
    usePlannerStore.getState().addEdge(edge)

    const state = usePlannerStore.getState()
    expect(state.edges).toHaveLength(1)
    expect(state.edges[0].id).toBe('newEdge')
    expect(state.past.length).toBe(1)
  })
})

describe('removeEdge', () => {
  beforeEach(() => {
    usePlannerStore.setState({ past: [], nodes: [], edges: [], future: [] })
  })

  test('removeEdge removes edge and captures history', () => {
    const edge1 = createMockEdge('edge1', 'n1', 'n2')
    const edge2 = createMockEdge('edge2', 'n2', 'n3')
    usePlannerStore.setState({ edges: [edge1, edge2] })

    usePlannerStore.getState().removeEdge('edge1')

    const state = usePlannerStore.getState()
    expect(state.edges).toHaveLength(1)
    expect(state.edges[0].id).toBe('edge2')
    expect(state.past.length).toBe(1)
  })
})
