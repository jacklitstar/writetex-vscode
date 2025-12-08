import { describe, it } from 'node:test'
import assert from 'node:assert'
import { insertOrClipboard } from '../insert'

describe('insertOrClipboard', () => {
  it('does not throw when no editor', async () => {
    const res = await insertOrClipboard('x^2', { file: '', languageId: 'plain', surroundingText: '', mode: 'plain' } as any)
    assert.strictEqual(typeof res.inserted, 'boolean')
  })
})

