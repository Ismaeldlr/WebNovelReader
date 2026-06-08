const crypto = require('crypto');
const db = require('../db/db');

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const KEY_LENGTH = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

function getTokenSecret() {
  const secret = process.env.AUTH_SECRET || process.env.SESSION_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is required in production');
  }

  return 'development-only-change-me';
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function sign(value) {
  return crypto
    .createHmac('sha256', getTokenSecret())
    .update(value)
    .digest('base64url');
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('base64url');
    crypto.scrypt(password, salt, KEY_LENGTH, SCRYPT_PARAMS, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(`scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt}$${derivedKey.toString('base64url')}`);
    });
  });
}

function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    const [algorithm, n, r, p, salt, hash] = storedHash.split('$');
    if (algorithm !== 'scrypt' || !salt || !hash) {
      resolve(false);
      return;
    }

    const params = { N: Number(n), r: Number(r), p: Number(p) };
    crypto.scrypt(password, salt, KEY_LENGTH, params, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(timingSafeEqualString(derivedKey.toString('base64url'), hash));
    });
  });
}

function normalizeUsername(username) {
  return String(username || '').trim();
}

function validateCredentials(username, password) {
  const normalizedUsername = normalizeUsername(username);

  if (!/^[a-zA-Z0-9_]{3,32}$/.test(normalizedUsername)) {
    return {
      valid: false,
      message: 'Username must be 3-32 characters and use only letters, numbers, and underscores.',
    };
  }

  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return {
      valid: false,
      message: 'Password must be 8-128 characters.',
    };
  }

  return { valid: true, username: normalizedUsername };
}

function createToken(user) {
  const payload = {
    sub: user.id,
    username: user.username,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encodedPayload = encode(payload);
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature || !timingSafeEqualString(sign(encodedPayload), signature)) {
    return null;
  }

  try {
    const payload = decode(encodedPayload);
    if (!payload.sub || !payload.exp || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function userResponse(user) {
  return {
    id: user.id,
    username: user.username,
  };
}

class AuthService {
  static async register(username, password) {
    const validation = validateCredentials(username, password);
    if (!validation.valid) {
      const error = new Error(validation.message);
      error.status = 400;
      throw error;
    }

    const passwordHash = await hashPassword(password);

    try {
      const user = await db.withTransaction(async (client) => {
        const { rows } = await client.query(
          `INSERT INTO users (username, password_hash)
           VALUES ($1, $2)
           RETURNING id, username`,
          [validation.username, passwordHash]
        );

        await client.query(
          `INSERT INTO reader_preferences (user_id)
           VALUES ($1)
           ON CONFLICT (user_id) DO NOTHING`,
          [rows[0].id]
        );

        return rows[0];
      });

      return { user: userResponse(user), token: createToken(user) };
    } catch (err) {
      if (err.code === '23505') {
        const error = new Error('Username is already taken.');
        error.status = 409;
        throw error;
      }
      throw err;
    }
  }

  static async login(username, password) {
    if (typeof username !== 'string' || typeof password !== 'string') {
      const error = new Error('Invalid username or password.');
      error.status = 401;
      throw error;
    }

    const normalizedUsername = normalizeUsername(username);
    const { rows } = await db.query(
      `SELECT id, username, password_hash
       FROM users
       WHERE username = $1`,
      [normalizedUsername]
    );

    const user = rows[0];
    if (!user || !(await verifyPassword(password || '', user.password_hash))) {
      const error = new Error('Invalid username or password.');
      error.status = 401;
      throw error;
    }

    return { user: userResponse(user), token: createToken(user) };
  }

  static async getUserFromToken(token) {
    const payload = verifyToken(token);
    if (!payload) return null;

    const { rows } = await db.query(
      `SELECT id, username
       FROM users
       WHERE id = $1`,
      [payload.sub]
    );

    return rows[0] ? userResponse(rows[0]) : null;
  }
}

module.exports = {
  AuthService,
  TOKEN_TTL_MS,
};
