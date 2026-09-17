const { fail } = require('../utils/helper');

function notFound(req, res) {
  res.status(404).json(fail('接口不存在', 404));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error('[ERROR]', req.method, req.originalUrl, err);
  res.status(status).json(fail(err.expose || status < 500 ? err.message : '服务器开小差了', status));
}

class HttpError extends Error {
  constructor(msg, status = 400) {
    super(msg);
    this.status = status;
    this.expose = true;
  }
}

module.exports = { notFound, errorHandler, HttpError };
