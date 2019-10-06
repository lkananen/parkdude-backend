module.exports = {
    "roots": [
      "<rootDir>/lib", "<rootDir>/app"
    ],
    testMatch: [ '**/*.test.ts'],
    "transform": {
      "^.+\\.tsx?$": "ts-jest"
    },
  }
