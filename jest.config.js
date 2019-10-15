module.exports = {
  'roots': [
    '<rootDir>/lib', '<rootDir>/app'
  ],
  'testMatch': ['**/*.test.ts'],
  'transform': {
    '^.+\\.tsx?$': 'ts-jest'
  },
  'globalSetup': '<rootDir>/app/test-utils/setup.ts',
  'verbose': true
};
