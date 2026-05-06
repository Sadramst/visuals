import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts'],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^powerbi-visuals-api$': '<rootDir>/src/test/__mocks__/powerbi.ts',
  },
}

export default config
