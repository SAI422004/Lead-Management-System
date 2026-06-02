const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');

const SALT_ROUNDS = 12;

const generateAccessToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const generateRefreshToken = async (userId) => {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
  return token;
};

const register = async ({ name, email, password, role }) => {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [name, email, passwordHash, role || 'agent']
  );

  const user = result.rows[0];

  // init tracker for agents
  if (user.role === 'agent') {
    await query(
      'INSERT INTO agent_assignment_tracker (user_id, lead_count) VALUES ($1, 0) ON CONFLICT DO NOTHING',
      [user.id]
    );
  }

  return user;
};

const login = async ({ email, password }) => {
  const result = await query(
    'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
    [email]
  );
  const user = result.rows[0];
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  if (!user.is_active) {
    const err = new Error('Account deactivated');
    err.status = 403;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = await generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
};

const refreshAccessToken = async (refreshToken) => {
  const result = await query(
    'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
    [refreshToken]
  );
  if (!result.rows.length) {
    const err = new Error('Invalid or expired refresh token');
    err.status = 401;
    throw err;
  }

  const { user_id } = result.rows[0];
  const userResult = await query('SELECT id, role FROM users WHERE id = $1', [user_id]);
  const user = userResult.rows[0];

  const accessToken = generateAccessToken(user.id, user.role);
  return { accessToken };
};

const logout = async (refreshToken) => {
  await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
};

module.exports = { register, login, refreshAccessToken, logout };
