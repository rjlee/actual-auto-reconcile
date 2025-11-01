/** @type {import('jest').Config} */
module.exports = {
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  verbose: true,
  collectCoverage: false,
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/resources/'],
  modulePathIgnorePatterns: ['/resources/'],
};
