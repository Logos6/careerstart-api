const crypto = require('crypto');
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

function supaRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : undefined
      }
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function genToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashPw(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

function parseBody(event) {
  try { return JSON.parse(event.body || '{}'); } catch { return {}; }
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

  if (path === '/api/health' && method === 'GET') {
    return json(200, { status: 'ok', time: new Date().toISOString(), platform: 'netlify+supabase' });
  }

  // Register
  if (path === '/api/register' && method === 'POST') {
    const body = parseBody(event);
    const { phone, password, nickname } = body;
    if (!phone || !password) return json(400, { error: '手机号和密码必填' });

    const exists = await supaRequest(`/rest/v1/users?phone=eq.${encodeURIComponent(phone)}&select=id`, 'GET');
    if (exists.status === 200 && exists.data && exists.data.length > 0) {
      return json(400, { error: '该手机号已注册' });
    }

    const token = genToken();
    const insertResult = await supaRequest('/rest/v1/users', 'POST', {
      phone,
      password_hash: hashPw(password),
      nickname: nickname || '用户' + phone.slice(-4),
      member_type: 'free',
      member_expire_at: 0
    });

    if (insertResult.status !== 201 && insertResult.status !== 200) {
      return json(500, { error: '注册失败', detail: insertResult.data });
    }

    const user = Array.isArray(insertResult.data) ? insertResult.data[0] : insertResult.data;

    await supaRequest('/rest/v1/users?phone=eq.' + encodeURIComponent(phone), 'PATCH', { token });

    return json(200, {
      ok: true,
      token,
      user: { phone, nickname: user.nickname }
    });
  }

  // Login
  if (path === '/api/login' && method === 'POST') {
    const body = parseBody(event);
    const { phone, password } = body;
    if (!phone || !password) return json(400, { error: '手机号和密码必填' });

    const res = await supaRequest(
      `/rest/v1/users?phone=eq.${encodeURIComponent(phone)}&select=id,phone,password_hash,nickname,member_type,member_expire_at,created_at`,
      'GET'
    );

    if (res.status !== 200 || !res.data || res.data.length === 0) {
      return json(401, { error: '手机号或密码错误' });
    }

    const user = res.data[0];
    if (user.password_hash !== hashPw(password)) {
      return json(401, { error: '手机号或密码错误' });
    }

    const token = genToken();
    await supaRequest('/rest/v1/users?phone=eq.' + encodeURIComponent(phone), 'PATCH', { token });

    return json(200, {
      ok: true,
      token,
      user: { phone: user.phone, nickname: user.nickname, member_type: user.member_type }
    });
  }

  // Profile (GET)
  if (path === '/api/profile' && method === 'GET') {
    const auth = event.headers.authorization || '';
    const token = auth.replace('Bearer ', '');
    if (!token) return json(401, { error: '未登录' });

    const res = await supaRequest(
      `/rest/v1/users?token=eq.${encodeURIComponent(token)}&select=phone,nickname,avatar_url,member_type,member_expire_at,created_at`,
      'GET'
    );

    if (res.status !== 200 || !res.data || res.data.length === 0) {
      return json(401, { error: 'token无效' });
    }

    return json(200, { ok: true, user: res.data[0] });
  }

  return json(404, { error: 'Not Found: ' + path });
};
