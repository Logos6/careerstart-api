// 共享工具函数
const crypto = require('crypto');

// 内存存储（Vercel Serverless 重启会丢失，生产环境应接数据库）
const users = {};
const tokens = {};

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

// 从 token 获取手机号
function getPhoneFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  return tokens[token] || null;
}

// 注册用户
function registerUser(phone, password, nickname) {
  if (users[phone]) {
    return { error: '该手机号已注册', status: 409 };
  }
  const token = generateToken();
  const hashedPwd = hashPassword(password);
  users[phone] = {
    phone,
    nickname: nickname || `启航用户${phone.slice(-4)}`,
    password: hashedPwd,
    isVip: false,
    vipPlan: null,
    vipExpiry: null,
    createdAt: new Date().toISOString(),
  };
  tokens[token] = phone;
  return {
    success: true,
    token,
    user: { phone, nickname: users[phone].nickname, isVip: false },
  };
}

// 登录用户
function loginUser(phone, password) {
  const user = users[phone];
  if (!user) {
    return { error: '用户不存在', status: 404 };
  }
  const hashedPwd = hashPassword(password);
  if (user.password !== hashedPwd) {
    return { error: '密码错误', status: 401 };
  }
  const token = generateToken();
  tokens[token] = phone;
  return {
    success: true,
    token,
    user: {
      phone, nickname: user.nickname, isVip: user.isVip,
      vipPlan: user.vipPlan, vipExpiry: user.vipExpiry,
    },
  };
}

// 获取用户信息
function getUserProfile(phone) {
  const user = users[phone];
  if (!user) return { error: '用户不存在', status: 404 };
  return {
    success: true,
    user: {
      phone: user.phone, nickname: user.nickname, isVip: user.isVip,
      vipPlan: user.vipPlan, vipExpiry: user.vipExpiry, createdAt: user.createdAt,
    },
  };
}

module.exports = {
  CORS_HEADERS, JSON_HEADERS, users, tokens,
  generateToken, hashPassword, getPhoneFromToken,
  registerUser, loginUser, getUserProfile,
};
