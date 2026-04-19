import { describe, expect, test } from 'bun:test'
import { parseRunnerResult } from '../src/result'

describe('parseRunnerResult', () => {
  test('accepts a valid runner result', () => {
    expect(
      parseRunnerResult({
        score: 8,
        maxScore: 10,
        buildStatus: 'passed',
        buildLogSummary: 'Build passed.',
        feedback: 'Good work.',
        rubricResults: [
          {
            criterionId: 'criteria-1',
            label: 'Correctness',
            score: 8,
            maxScore: 10,
            feedback: 'Mostly correct.',
          },
        ],
      })
    ).toEqual({
      score: 8,
      maxScore: 10,
      buildStatus: 'passed',
      buildLogSummary: 'Build passed.',
      feedback: 'Good work.',
      rubricResults: [
        {
          criterionId: 'criteria-1',
          label: 'Correctness',
          score: 8,
          maxScore: 10,
          feedback: 'Mostly correct.',
        },
      ],
    })
  })

  test('rejects invalid build status', () => {
    expect(() =>
      parseRunnerResult({
        score: 0,
        maxScore: 10,
        buildStatus: 'broken',
        buildLogSummary: '',
        feedback: '',
        rubricResults: [],
      })
    ).toThrow('buildStatus is invalid')
  })
})
