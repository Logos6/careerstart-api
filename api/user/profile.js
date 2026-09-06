const { JSON_HEADERS, getPhoneFromToken, getUserProfile } = require('../_lib');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const phone = getPhoneFromToken(req);
    if (!phone) {
      return res.status(401).json({ error: '未登录或登录已过期' });
    }

    const result = getUserProfile(phone);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: '服务器错误', message: error.message });
  }
};
