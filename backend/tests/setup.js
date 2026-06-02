// tests/setup.js
// Runs before all tests — sets env vars and global mocks

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.EMAIL_HOST = 'smtp.test.com';
process.env.EMAIL_USER = 'test@test.com';
process.env.EMAIL_PASS = 'testpass';

// Silence console.error during tests (keep console.log for debugging)
jest.spyOn(console, 'error').mockImplementation(() => {});
