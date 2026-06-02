// tests/controllers/authController.test.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../../db', () => ({ query: jest.fn() }));
const db = require('../../db');
const authController = require('../../controllers/authController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ── REGISTER ──────────────────────────────────────────────────────
describe('authController.register', () => {
  beforeEach(() => jest.clearAllMocks());

  test('creates a user and returns 201 with a token', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })                          // email check → not taken
      .mockResolvedValueOnce({                                       // INSERT → new user row
        rows: [{ id: 'new-uuid', name: 'Sai', email: 'sai@test.com', role: 'agent' }],
      });

    const req = {
      body: { name: 'Sai', email: 'sai@test.com', password: 'pass1234', role: 'agent' },
    };
    const res = mockRes();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload).toHaveProperty('token');
    expect(payload.user.email).toBe('sai@test.com');
  });

  test('returns 400 when email is already registered', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 'existing-uuid', email: 'sai@test.com' }],
    });

    const req = {
      body: { name: 'Sai', email: 'sai@test.com', password: 'pass1234', role: 'agent' },
    };
    const res = mockRes();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/already/i) })
    );
  });

  test('returns 400 when required fields are missing', async () => {
    const req = { body: { email: 'sai@test.com' } };  // no name/password
    const res = mockRes();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('hashes the password before storing', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 'x', name: 'A', email: 'a@b.com', role: 'agent' }],
      });

    const req = { body: { name: 'A', email: 'a@b.com', password: 'plain_password', role: 'agent' } };
    const res = mockRes();

    await authController.register(req, res);

    // Second call to db.query is the INSERT; check its args contain a hash not plaintext
    const insertArgs = db.query.mock.calls[1][1];  // parameterised values array
    const storedPassword = insertArgs[2];           // 3rd param is password_hash
    expect(storedPassword).not.toBe('plain_password');
    expect(storedPassword.startsWith('$2')).toBe(true);  // bcrypt hash prefix
  });

  test('returns 500 on unexpected DB error', async () => {
    db.query.mockRejectedValueOnce(new Error('DB connection failed'));

    const req = { body: { name: 'A', email: 'a@b.com', password: 'pass', role: 'agent' } };
    const res = mockRes();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ── LOGIN ─────────────────────────────────────────────────────────
describe('authController.login', () => {
  beforeEach(() => jest.clearAllMocks());

  const hashedPassword = bcrypt.hashSync('correct_pass', 10);

  const fakeUser = {
    id: 'user-uuid',
    name: 'Sai',
    email: 'sai@test.com',
    password_hash: hashedPassword,
    role: 'agent',
    is_active: true,
  };

  test('returns 200 with token on correct credentials', async () => {
    db.query.mockResolvedValueOnce({ rows: [fakeUser] });

    const req = { body: { email: 'sai@test.com', password: 'correct_pass' } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload).toHaveProperty('token');

    // Verify the token is valid and contains expected claims
    const decoded = jwt.verify(payload.token, process.env.JWT_SECRET);
    expect(decoded.id).toBe('user-uuid');
    expect(decoded.role).toBe('agent');
  });

  test('returns 401 when user email not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = { body: { email: 'nobody@test.com', password: 'pass' } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 401 when password is wrong', async () => {
    db.query.mockResolvedValueOnce({ rows: [fakeUser] });

    const req = { body: { email: 'sai@test.com', password: 'wrong_pass' } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 403 when account is inactive', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...fakeUser, is_active: false }] });

    const req = { body: { email: 'sai@test.com', password: 'correct_pass' } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('returns 400 when email or password is missing', async () => {
    const req = { body: { email: 'sai@test.com' } };  // no password
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
