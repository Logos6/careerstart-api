const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;

const users = {};

function genToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashPw(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const p = parsed.pathname;

  if (req.method === 'OPTIONS') { res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }); return res.end(); }

  if (p === '/api/health') return json(res, 200, { status: 'ok', time: new Date().toISOString() });

  if (p === '/api/register' && req.method === 'POST') {
    const body = await parseBody(req);
    const { phone, password, nickname } = body;
    if (!phone || !password) return json(res, 400, { error: '手机号和密码必填' });
    if (users[phone]) return json(res, 400, { error: '该手机号已注册' });
    const token = genToken();
    users[phone] = { phone, password: hashPw(password), nickname: nickname || '用户' + phone.slice(-4), token, createdAt: new Date().toISOString() };
    return json(res, 200, { ok: true, token, user: { phone, nickname: users[phone].nickname } });
  }

  if (p === '/api/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const { phone, password } = body;
    const u = users[phone];
    if (!u || u.password !== hashPw(password)) return json(res, 401, { error: '手机号或密码错误' });
    u.token = genToken();
    return json(res, 200, { ok: true, token: u.token, user: { phone, nickname: u.nickname } });
  }

  if (p === '/api/user/profile') {
    const auth = req.headers.authorization;
    if (!auth) return json(res, 401, { error: '未登录' });
    const token = auth.replace('Bearer ', '');
    const u = Object.values(users).find(u => u.token === token);
    if (!u) return json(res, 401, { error: '登录已过期' });
    return json(res, 200, { ok: true, user: { phone: u.phone, nickname: u.nickname, createdAt: u.createdAt } });
  }

  json(res, 404, { error: 'not found' });
});

server.listen(PORT, () => console.log('Server running on port ' + PORT));
