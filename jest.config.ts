import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.spec.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverage: false,
  verbose: true,
};

export default config;
