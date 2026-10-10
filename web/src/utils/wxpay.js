/** 等待微信桥接对象，避免重复注册监听或在普通浏览器中创建无效订单。 */
export function waitForWxBridge({ win = window, doc = document, timeoutMs = 10000 } = {}) {
  if (typeof win.WeixinJSBridge?.invoke === 'function') return Promise.resolve(win.WeixinJSBridge);
  if (!/MicroMessenger/i.test(win.navigator?.userAgent || '')) {
    return Promise.reject(new Error('请在手机微信中打开本页面完成支付'));
  }
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      doc.removeEventListener('WeixinJSBridgeReady', ready);
    };
    const ready = () => {
      if (typeof win.WeixinJSBridge?.invoke !== 'function') return;
      cleanup();
      resolve(win.WeixinJSBridge);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('微信支付组件加载超时，请重新打开页面'));
    }, timeoutMs);
    doc.addEventListener('WeixinJSBridgeReady', ready);
    ready();
  });
}

export function invokeWxPay(bridge, params) {
  return new Promise((resolve, reject) => {
    if (!params || !['appId', 'timeStamp', 'nonceStr', 'package', 'signType', 'paySign'].every((key) => params[key])) {
      reject(new Error('支付参数不完整，请重新下单'));
      return;
    }
    bridge.invoke('getBrandWCPayRequest', params, (result) => {
      if (result.err_msg === 'get_brand_wcpay_request:ok') resolve('ok');
      else if (result.err_msg === 'get_brand_wcpay_request:cancel') resolve('cancel');
      else reject(new Error('微信支付未完成，请检查商户绑定和支付授权目录或联系客服'));
    });
  });
}
