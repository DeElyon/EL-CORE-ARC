module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)sx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@el-verse/shared-utils$': '<rootDir>/../../libs/shared-utils/index.ts',
    '^@el-verse/shared-utils/(.*)$': '<rootDir>/../../libs/shared-utils/$1',
    '^@el-verse/ai-hub$': '<rootDir>/../../libs/ai-hub/index.ts',
    '^@el-verse/ai-hub/(.*)$': '<rootDir>/../../libs/ai-hub/$1',
    '^@el-verse/wallet-engine$': '<rootDir>/../../libs/wallet-engine/index.ts',
    '^@el-verse/wallet-engine/(.*)$': '<rootDir>/../../libs/wallet-engine/$1',
    '^@el-verse/database$': '<rootDir>/../../libs/database/index.ts',
    '^@el-verse/database/(.*)$': '<rootDir>/../../libs/database/$1',
    '^@el-verse/nexel-service$': '<rootDir>/../../services/nexel-service/src/index.ts',
    '^@el-verse/nexel-service/(.*)$': '<rootDir>/../../services/nexel-service/src/$1',
  },
};
