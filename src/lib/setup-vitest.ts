import { vi, afterEach } from 'vitest'

// Set up localStorage for jsdom environment
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
}

global.localStorage = localStorageMock

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})
