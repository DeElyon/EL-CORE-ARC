module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)sx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@el-verse/shared-utils$': '<rootDir>/../../libs/shared-utils/src/index.ts',
    '^@el-verse/ai-hub$': '<rootDir>/../../libs/ai-hub/index.ts',
    '^@el-verse/wallet-engine$': '<rootDir>/../../libs/wallet-engine/index.ts',
    '^@el-verse/database$': '<rootDir>/../../libs/database/index.ts',
  },
};
