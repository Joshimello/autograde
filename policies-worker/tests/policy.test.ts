import { describe, expect, test } from 'bun:test'
import {
  parsePolicyJson,
  truncateMarkdown,
  validateExtractedPolicy,
} from '../src/policy'

describe('policy extraction validation', () => {
  test('accepts valid policy JSON', () => {
    expect(
      parsePolicyJson(`{
        "name": "Frontend project",
        "description": "Grade the app",
        "criteria": [
          {
            "label": "Functionality",
            "points": 10,
            "description": "Works as requested"
          }
        ]
      }`)
    ).toEqual({
      name: 'Frontend project',
      description: 'Grade the app',
      criteria: [
        {
          label: 'Functionality',
          points: 10,
          description: 'Works as requested',
        },
      ],
    })
  })

  test('rejects missing criteria', () => {
    expect(() =>
      validateExtractedPolicy({
        name: 'Empty',
        criteria: [],
      })
    ).toThrow('At least one criterion is required')
  })

  test('rejects invalid points', () => {
    expect(() =>
      validateExtractedPolicy({
        name: 'Bad',
        criteria: [
          {
            label: 'Correctness',
            points: 0,
          },
        ],
      })
    ).toThrow('points must be positive')
  })

  test('truncates markdown preview', () => {
    expect(truncateMarkdown('abcdef', 3)).toBe('abc')
  })
})
