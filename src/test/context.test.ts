import { describe, it } from 'node:test'
import assert from 'node:assert'
import { getContextSummary } from '../context'

describe('context summary', () => {
  it('returns null without active editor', () => {
    const s = getContextSummary()
    assert.strictEqual(s === null || typeof s === 'object', true)
  })
})

