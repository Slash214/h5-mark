require('dotenv').config();
const path = require('path');

const bool = (v, d = false) => (v === undefined ? d : v === '1' || v === 'true');

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  siteUrl: (process.env.SITE_URL || '').replace(/\/$/, ''),
  jwt: {
    secret: process.env.JWT_SECRET || 'h5-mark-dev-secret',
    expires: process.env.JWT_EXPIRES || '7d',
  },
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'h5_mark',
  },
  wx: {
    appid: process.env.WX_APPID || '',
    secret: process.env.WX_APPSECRET || '',
    token: process.env.WX_TOKEN || '',
  },
  wxpay: {
    mchid: process.env.WXPAY_MCHID || '',
    serialNo: process.env.WXPAY_SERIAL_NO || '',
    privateKeyPath: path.resolve(
      __dirname, '../../', process.env.WXPAY_PRIVATE_KEY_PATH || './cert/apiclient_key.pem'
    ),
    apiV3Key: process.env.WXPAY_API_V3_KEY || '',
    notifyUrl: process.env.WXPAY_NOTIFY_URL || '',
  },
  dev: {
    fakeLogin: bool(process.env.DEV_FAKE_LOGIN),
    mockOpenid: process.env.MOCK_OPENID || 'o_dev_mock_openid_0001',
    fakePay: bool(process.env.DEV_FAKE_PAY),
  },
};
