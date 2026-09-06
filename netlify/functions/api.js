const crypto = require('crypto');

const users = {};

function genToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashPw(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch {
    return {};
  }
}

function json(code, data) {
  return {
    statusCode: code,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    },
    body: JSON.stringify(data)
  };
}

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
      },
      body: ''
    };
  }

  const path = event.path.replace(/^\/api\//, '/api/');
  const method = event.httpMethod;

  // Health check
  if (path === '/api/health' && method === 'GET') {
    return json(200, { status: 'ok', time: new Date().toISOString(), platform: 'netlify' });
  }

  // Register
  if (path === '/api/register' && method === 'POST') {
    const body = parseBody(event);
    const { phone, password, nickname } = body;
    if (!phone || !password) return json(400, { error: '手机号和密码必填' });
    if (users[phone]) return json(400, { error: '该手机号已注册' });
    const token = genToken();
    users[phone] = {
      phone,
      password: hashPw(password),
      nickname: nickname || '用户' + phone.slice(-4),
      token,
      createdAt: new Date().toISOString()
    };
    return json(200, {
      ok: true,
      token,
      user: { phone, nickname: users[phone].nickname }
    });
  }

  // Login
  if (path === '/api/login' && method === 'POST') {
    const body = parseBody(event);
    const { phone, password } = body;
    if (!phone || !password) return json(400, { error: '手机号和密码必填' });
    const user = users[phone];
    if (!user || user.password !== hashPw(password)) {
      return json(401, { error: '手机号或密码错误' });
    }
    const token = genToken();
    user.token = token;
    return json(200, {
      ok: true,
      token,
      user: { phone, nickname: user.nickname }
    });
  }

  // Profile (GET)
  if (path === '/api/profile' && method === 'GET') {
    const auth = event.headers.authorization || '';
    const token = auth.replace('Bearer ', '');
    if (!token) return json(401, { error: '未登录' });
    const user = Object.values(users).find(u => u.token === token);
    if (!user) return json(401, { error: 'token无效' });
    return json(200, {
      ok: true,
      user: { phone: user.phone, nickname: user.nickname, createdAt: user.createdAt }
    });
  }

  return json(404, { error: 'Not Found: ' + path });
};
