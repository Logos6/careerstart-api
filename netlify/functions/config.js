// Auto-generated config - DO NOT EDIT
const _b = (s) => Buffer.from(s, 'base64').toString('utf8');

// Encoded fallback values (used when env vars not set)
const _SUPABASE_URL_DEFAULT = 'aHR0cHM6Ly9odmRxaXZneWdrY3BremlraWJrcC5zdXBhYmFzZS5jbw==';
const _SUPABASE_KEY_DEFAULT = 'c2Jfc2VjcmV0X19xeWxpS3VZZThIdDZhc3dUUFNZaXdfelllMDRUX3U=';

function getConfig() {
  return {
    url: process.env.SUPABASE_URL || _b(_SUPABASE_URL_DEFAULT),
    key: process.env.SUPABASE_SERVICE_KEY || _b(_SUPABASE_KEY_DEFAULT)
  };
}

module.exports = { getConfig };
