// Auto-generated config - DO NOT EDIT
const https = require('https');

const _b = (s) => Buffer.from(s, 'base64').toString('utf8');

// Encoded fallback values (used when env vars not set)
const _SUPABASE_URL_DEFAULT = 'aHR0cHM6Ly9odmRxcmVneWdrcGt6aWtpYmtwLnN1cGFiYXNlLmNv';
const _SUPABASE_KEY_DEFAULT = 'c2Jfc2VjcmV0X19xcXlsZUtxWWU4SHQ2YXN3VFBTWXl3X3pZZTA0VF91';

function getConfig() {
  return {
    url: process.env.SUPABASE_URL || _b(_SUPABASE_URL_DEFAULT),
    key: process.env.SUPABASE_SERVICE_KEY || _b(_SUPABASE_KEY_DEFAULT)
  };
}

module.exports = { getConfig };
