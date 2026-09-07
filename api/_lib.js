// 共享工具函数 - Supabase 版本
const crypto = require('crypto');

// Supabase 配置
const SUPABASE_URL = 'https://hvdqivgygkcpkzikibkp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_igOmb4KEBqcG8lwOSYbbEQ_S4UcjkBT';

// CORS 头
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  ...CORS_HEADERS,
};

// Supabase REST API 请求
async function supabaseRequest(path, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : undefined,
  };

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Supabase request failed');
  }

  return data;
}

// 生成 token
function generateToken() {
  return 'cs_' + crypto.randomBytes(32).toString('hex');
}

// 密码哈希
function hashPassword(password) {
  return crypto.createHash('sha256')
    .update(password + 'careerstart_salt_2026')
    .digest('hex');
}

// 从 token 获取手机号（简单实现，生产环境应用 JWT）
// 这里用 Supabase 存储 token 映射
const tokenMap = {};

async function getPhoneFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');

  // 先检查内存缓存
  if (tokenMap[token]) return tokenMap[token];

  // 查询 Supabase
  try {
    const users = await supabaseRequest(`users?token=eq.${token}&select=phone`);
    if (users && users.length > 0) {
      tokenMap[token] = users[0].phone;
      return users[0].phone;
    }
  } catch (e) {
    console.error('Token lookup failed:', e);
  }

  return null;
}

// 注册用户
async function registerUser(phone, password, nickname) {
  // 检查用户是否已存在
  const existing = await supabaseRequest(`users?phone=eq.${phone}&select=phone`);
  if (existing && existing.length > 0) {
    return { error: '该手机号已注册', status: 409 };
  }

  const token = generateToken();
  const hashedPwd = hashPassword(password);
  const user = {
    phone,
    nickname: nickname || `启航用户${phone.slice(-4)}`,
    password: hashedPwd,
    token,
    is_vip: false,
    vip_plan: null,
    vip_expiry: null,
    created_at: new Date().toISOString(),
  };

  // 插入到 Supabase
  const result = await supabaseRequest('users', 'POST', user);

  // 缓存 token
  tokenMap[token] = phone;

  return {
    success: true,
    token,
    user: { phone, nickname: user.nickname, isVip: false },
  };
}

// 登录用户
async function loginUser(phone, password) {
  // 查询用户
  const users = await supabaseRequest(`users?phone=eq.${phone}&select=*`);
  if (!users || users.length === 0) {
    return { error: '用户不存在', status: 404 };
  }

  const user = users[0];
  const hashedPwd = hashPassword(password);
  if (user.password !== hashedPwd) {
    return { error: '密码错误', status: 401 };
  }

  const token = generateToken();

  // 更新 token
  await supabaseRequest(`users?phone=eq.${phone}`, 'PATCH', { token });

  // 缓存 token
  tokenMap[token] = phone;

  return {
    success: true,
    token,
    user: {
      phone, nickname: user.nickname, isVip: user.is_vip,
      vipPlan: user.vip_plan, vipExpiry: user.vip_expiry,
    },
  };
}

// 获取用户信息
async function getUserProfile(phone) {
  const users = await supabaseRequest(`users?phone=eq.${phone}&select=phone,nickname,is_vip,vip_plan,vip_expiry,created_at`);
  if (!users || users.length === 0) {
    return { error: '用户不存在', status: 404 };
  }

  const user = users[0];
  return {
    success: true,
    user: {
      phone: user.phone, nickname: user.nickname, isVip: user.is_vip,
      vipPlan: user.vip_plan, vipExpiry: user.vip_expiry, createdAt: user.created_at,
    },
  };
}

module.exports = {
  CORS_HEADERS, JSON_HEADERS,
  generateToken, hashPassword, getPhoneFromToken,
  registerUser, loginUser, getUserProfile,
};
