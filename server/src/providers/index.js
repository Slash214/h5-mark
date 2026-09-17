const conf = require('../services/config.service');
const mock = require('./mock');
const http = require('./http');

const registry = { mock, http };

/** 注册自定义数据源：require('./providers').register(myProvider) */
function register(p) {
  if (p && p.name && typeof p.query === 'function') registry[p.name] = p;
}

async function current() {
  const name = await conf.get('provider', 'mock');
  return registry[name] || mock;
}

module.exports = { registry, register, current };
