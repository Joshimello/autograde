import { describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { internal } from '../src/netlify'
import { parseDeploymentRunnerResult } from '../src/result'

describe('buildFileManifest', () => {
  test('builds a digest manifest with posix paths', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'netlify-manifest-'))
    const assetsDir = path.join(root, 'assets')

    await mkdir(assetsDir, { recursive: true })
    await writeFile(path.join(root, 'index.html'), '<html></html>')
    await writeFile(path.join(assetsDir, 'main.js'), 'console.log("ok")')

    const manifest = await internal.buildFileManifest(root)

    expect(Array.from(manifest.files.keys())).toEqual([
      '/assets/main.js',
      '/index.html',
    ])
    expect(manifest.byDigest.size).toBe(2)
  })
})

describe('parseDeploymentRunnerResult', () => {
  test('accepts a valid deployment runner result', () => {
    expect(
      parseDeploymentRunnerResult({
        buildStatus: 'passed',
        buildLogSummary: 'Build passed.',
        outputDir: 'site',
      })
    ).toEqual({
      buildStatus: 'passed',
      buildLogSummary: 'Build passed.',
      outputDir: 'site',
    })
  })

  test('rejects invalid build status', () => {
    expect(() =>
      parseDeploymentRunnerResult({
        buildStatus: 'failed',
        buildLogSummary: 'Nope',
        outputDir: 'site',
      })
    ).toThrow('buildStatus is invalid')
  })
})
