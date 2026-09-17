const crypto = require('crypto');

/**
 * 模拟数据源：不请求任何外部接口。
 * 用号码做哈希，保证同一个号码每次查询结果一致（便于演示和联调）。
 */
const TAGS = ['骚扰电话', '推销广告', '房产中介', '快递外卖', '教育培训', '诈骗电话', '保险理财', '响一声'];

module.exports = {
  name: 'mock',
  /**
   * @param {string} phone
   * @param {Array<{code:string,name:string}>} platforms
   * @returns {Promise<Array<{code,name,marked,tag,count}>>}
   */
  async query(phone, platforms) {
    const h = crypto.createHash('md5').update('mark:' + phone).digest();
    return platforms.map((p, i) => {
      const b = h[i % h.length];
      const marked = b % 5 === 0; // 约 20% 概率被标记
      return {
        code: p.code,
        name: p.name,
        marked,
        tag: marked ? TAGS[b % TAGS.length] : '',
        count: marked ? (b % 37) + 1 : 0,
      };
    });
  },
};
