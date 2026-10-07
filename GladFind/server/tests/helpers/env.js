// Test bootstrap.
//
// ESM hoists imports, so this file must stay the FIRST import in any test file:
// it sets the environment before config/env.js is evaluated.
process.env.PORT = '0';
process.env.DATA_DRIVER = 'memory';
process.env.JWT_SECRET = 'test_secret_key';
process.env.NODE_ENV = 'test';

export const TEST_JWT_SECRET = 'test_secret_key';