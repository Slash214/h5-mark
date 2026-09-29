<template>
  <el-card shadow="never" class="page-card">
    <el-tabs v-model="tab">
      <el-tab-pane label="价格设置" name="price">
        <el-alert
          type="warning" :closable="false" show-icon style="margin-bottom: 16px"
          title="价格单位为「分」。例如 9.90 元请填 990；修改后 H5 端 10 秒内自动生效，无需重启。" />
        <el-form label-width="160px" style="max-width: 620px">
          <el-form-item label="会员价格（元）">
            <el-input-number v-model="priceYuan" :min="0.01" :step="1" :precision="2" />
            <span class="hint">= {{ Math.round(priceYuan * 100) }} 分</span>
          </el-form-item>
          <el-form-item label="划线原价（元）">
            <el-input-number v-model="originYuan" :min="0" :step="1" :precision="2" />
            <span class="hint">填 0 则不显示</span>
          </el-form-item>
          <el-form-item label="开通天数">
            <el-input-number v-model="form.member_days" :min="1" :max="3650" />
            <span class="hint">支付成功后自动计时，未到期续费自动叠加</span>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="联系方式" name="contact">
        <el-form label-width="160px" style="max-width: 620px">
          <el-form-item label="客服微信号"><el-input v-model="form.service_wechat" placeholder="如 kefu_001" /></el-form-item>
          <el-form-item label="客服微信二维码">
            <UploadImage v-model="form.service_qrcode" />
          </el-form-item>
          <el-form-item label="客服电话"><el-input v-model="form.service_phone" /></el-form-item>
          <el-form-item label="在线客服链接">
            <el-input v-model="form.service_link" placeholder="填了优先跳转，如第三方客服系统地址" />
          </el-form-item>
          <el-divider>公众号</el-divider>
          <el-form-item label="公众号名称"><el-input v-model="form.oa_name" /></el-form-item>
          <el-form-item label="公众号二维码"><UploadImage v-model="form.oa_qrcode" /></el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="数据源" name="provider">
        <el-alert
          type="info" :closable="false" show-icon style="margin-bottom: 16px"
          title="mock = 模拟数据；qbc = 当前正式查询接口（api_key 可改）；密钥只保存在服务端。" />
        <el-form label-width="160px" style="max-width: 620px">
          <el-form-item label="数据源">
            <el-radio-group v-model="form.provider">
              <el-radio-button label="mock">模拟数据</el-radio-button>
              <el-radio-button label="qbc">qbc 接口</el-radio-button>
              <el-radio-button label="tmini">tmini</el-radio-button>
              <el-radio-button label="http">通用 HTTP</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <template v-if="form.provider === 'qbc'">
            <el-form-item label="接口地址">
              <el-input
                v-model="form.provider_url"
                placeholder="http://175.24.191.201/api/query.php" />
            </el-form-item>
            <el-form-item label="api_key">
              <el-input v-model="form.provider_key" show-password placeholder="如 qbc_xxxx，密钥变更时在此修改" />
            </el-form-item>
          </template>
          <template v-else-if="form.provider === 'tmini'">
            <el-form-item label="接口地址">
              <el-input
                v-model="form.provider_url"
                placeholder="留空则使用 http://api.tmini.net/apis/checkmark" />
            </el-form-item>
            <el-form-item label="接口密钥">
              <el-input v-model="form.provider_key" show-password placeholder="后台获取的 key" />
            </el-form-item>
          </template>
          <template v-else-if="form.provider === 'http'">
            <el-form-item label="接口地址"><el-input v-model="form.provider_url" placeholder="https://api.xxx.com/mark/query" /></el-form-item>
            <el-form-item label="请求方式">
              <el-select v-model="form.provider_method" style="width: 140px">
                <el-option label="GET" value="GET" /><el-option label="POST" value="POST" />
              </el-select>
            </el-form-item>
            <el-form-item label="号码参数名"><el-input v-model="form.provider_phone_field" placeholder="phone" /></el-form-item>
            <el-form-item label="密钥参数名"><el-input v-model="form.provider_key_field" placeholder="api_key" /></el-form-item>
            <el-form-item label="接口密钥"><el-input v-model="form.provider_key" show-password /></el-form-item>
          </template>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="微信支付" name="wechat">
        <el-alert
          type="warning" :closable="false" show-icon style="margin-bottom: 16px"
          title="模板多商户：每个客户在后台填自己的 AppID / 商户号 / APIv3 / 私钥即可，无需改服务器代码。.env 仅作空值兜底。" />
        <el-form label-width="170px" style="max-width: 720px">
          <el-divider content-position="left">站点</el-divider>
          <el-form-item label="站点域名 SITE_URL">
            <el-input v-model="form.site_url" placeholder="https://haoma.example.com 不要末尾斜杠" />
            <div class="hint" style="margin-left:0">用于微信授权回跳、图片完整 URL；必须 HTTPS</div>
          </el-form-item>

          <el-divider content-position="left">公众号（服务号）</el-divider>
          <el-form-item label="AppID">
            <el-input v-model="form.wx_appid" placeholder="wx 开头" />
          </el-form-item>
          <el-form-item label="AppSecret">
            <el-input v-model="form.wx_appsecret" show-password placeholder="公众号 AppSecret" />
          </el-form-item>

          <el-divider content-position="left">微信支付 V3（JSAPI）</el-divider>
          <el-form-item label="商户号 mchid">
            <el-input v-model="form.wxpay_mchid" placeholder="10 位商户号" />
          </el-form-item>
          <el-form-item label="证书序列号" required>
            <div class="pem-row">
              <el-input v-model="form.wxpay_serial_no" placeholder="上传 apiclient_cert.pem 后自动填入" readonly />
              <el-upload
                :action="pemAction"
                :headers="uploadHeaders"
                :data="{ kind: 'cert' }"
                name="file"
                :show-file-list="false"
                accept=".pem,.crt"
                :on-success="onCertOk"
                :on-error="onPemErr"
              >
                <el-button type="primary" plain>上传证书 apiclient_cert.pem</el-button>
              </el-upload>
            </div>
            <div class="hint" style="margin-left:0">从商户 API 证书自动解析序列号，一般无需手填</div>
          </el-form-item>
          <el-form-item label="APIv3 密钥">
            <el-input v-model="form.wxpay_api_v3_key" show-password placeholder="32 位 APIv3 Key" />
          </el-form-item>
          <el-form-item label="支付回调 URL">
            <el-input v-model="form.wxpay_notify_url" placeholder="https://域名/api/pay/notify" />
          </el-form-item>
          <el-form-item label="商户私钥" required>
            <div class="pem-row">
              <el-tag v-if="form.wxpay_private_key" type="success" effect="plain">已配置私钥（{{ privateKeyHint }}）</el-tag>
              <el-tag v-else type="info" effect="plain">未配置</el-tag>
              <el-upload
                :action="pemAction"
                :headers="uploadHeaders"
                :data="{ kind: 'key' }"
                name="file"
                :show-file-list="false"
                accept=".pem,.key"
                :on-success="onKeyOk"
                :on-error="onPemErr"
              >
                <el-button type="primary" plain>上传私钥 apiclient_key.pem</el-button>
              </el-upload>
              <el-button v-if="form.wxpay_private_key" link type="danger" @click="form.wxpay_private_key = ''">清除</el-button>
            </div>
            <div class="hint" style="margin-left:0">上传后自动写入配置；保存设置后生效</div>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="文案设置" name="base">
        <el-form label-width="160px" style="max-width: 720px">
          <el-form-item label="站点标题"><el-input v-model="form.site_title" /></el-form-item>
          <el-form-item label="副标题"><el-input v-model="form.site_subtitle" /></el-form-item>
          <el-form-item label="支付页提示文案">
            <el-input v-model="form.notice" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="用户协议（HTML）">
            <el-input v-model="form.agreement" type="textarea" :rows="10" />
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <div style="margin-top: 20px">
      <el-button type="primary" :loading="saving" @click="save">保存设置</el-button>
      <el-button @click="load">重置</el-button>
    </div>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api, getToken } from '../api';
import UploadImage from '../components/UploadImage.vue';
import { ElMessage } from 'element-plus';

const tab = ref('price');
const form = ref({});
const saving = ref(false);

const pemAction = '/api/admin/upload/wxpay-pem';
const uploadHeaders = computed(() => ({ Authorization: `Bearer ${getToken()}` }));
const privateKeyHint = computed(() => {
  const k = form.value.wxpay_private_key || '';
  if (!k) return '';
  return `${Math.round(k.length / 1024 * 10) / 10 || '<1'}KB`;
});

const priceYuan = computed({
  get: () => Number(form.value.price || 0) / 100,
  set: (v) => { form.value.price = Math.round(v * 100); },
});
const originYuan = computed({
  get: () => Number(form.value.origin_price || 0) / 100,
  set: (v) => { form.value.origin_price = Math.round(v * 100); },
});

function onCertOk(res) {
  if (res?.code === 0 && res.data?.serialNo) {
    form.value.wxpay_serial_no = res.data.serialNo;
    ElMessage.success('证书序列号已自动填入：' + res.data.serialNo);
  } else {
    ElMessage.error(res?.msg || '证书解析失败');
  }
}
function onKeyOk(res) {
  if (res?.code === 0 && res.data?.privateKey) {
    form.value.wxpay_private_key = res.data.privateKey;
    ElMessage.success('商户私钥已读取，请点击下方「保存设置」');
  } else {
    ElMessage.error(res?.msg || '私钥解析失败');
  }
}
function onPemErr() {
  ElMessage.error('上传失败，请确认文件为微信商户平台下载的 pem');
}

async function load() {
  const r = await api.configs();
  const o = {};
  r.rows.forEach((x) => { o[x.k] = x.type === 'number' ? Number(x.v || 0) : x.v; });
  form.value = o;
}
async function save() {
  saving.value = true;
  try {
    await api.saveConfigs(form.value);
  } finally { saving.value = false; }
}
onMounted(load);
</script>

<style scoped>
.hint { margin-left: 12px; color: #909399; font-size: 12px; }
.pem-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; width: 100%; }
.pem-row .el-input { flex: 1; min-width: 220px; }
</style>
