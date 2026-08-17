/**
 * Jest global setup — runs before each test file.
 * Silences console.log/warn/error during tests to keep output clean.
 * Tests that want to assert on console output can use jest.spyOn().
 */
global.console = {
  ...console,
  log:   jest.fn(),
  warn:  jest.fn(),
  error: jest.fn(),
  info:  jest.fn(),
};

// Set env so modules using process.env.NODE_ENV behave correctly
process.env.NODE_ENV     = 'test';
process.env.JWT_SECRET   = 'test_jwt_secret_for_testing_only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
