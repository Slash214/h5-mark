const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
module.exports = function load(file, mocks) {
  const filename = path.resolve(__dirname, '..', file);
  const localRequire = createRequire(filename);
  const mod = { exports: {} };
  const fn = vm.runInThisContext(`(function(require,module,exports){${fs.readFileSync(filename, 'utf8')}\n})`, { filename });
  fn((name) => Object.hasOwn(mocks, name) ? mocks[name] : localRequire(name), mod, mod.exports);
  return mod.exports;
};
