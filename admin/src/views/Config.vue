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
          title="mock = 内置模拟数据（用于演示/联调）；http = 调用你自己的第三方查询接口。切到 http 后填好地址和密钥即可，无需改代码。" />
        <el-form label-width="160px" style="max-width: 620px">
          <el-form-item label="数据源">
            <el-radio-group v-model="form.provider">
              <el-radio-button label="mock">模拟数据</el-radio-button>
              <el-radio-button label="http">第三方接口</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <template v-if="form.provider === 'http'">
            <el-form-item label="接口地址"><el-input v-model="form.provider_url" placeholder="https://api.xxx.com/mark/query" /></el-form-item>
            <el-form-item label="请求方式">
              <el-select v-model="form.provider_method" style="width: 140px">
                <el-option label="GET" value="GET" /><el-option label="POST" value="POST" />
              </el-select>
            </el-form-item>
            <el-form-item label="号码参数名"><el-input v-model="form.provider_phone_field" placeholder="mobile" /></el-form-item>
            <el-form-item label="密钥参数名"><el-input v-model="form.provider_key_field" placeholder="key" /></el-form-item>
            <el-form-item label="接口密钥"><el-input v-model="form.provider_key" show-password /></el-form-item>
          </template>
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
import { api } from '../api';
import UploadImage from '../components/UploadImage.vue';

const tab = ref('price');
const form = ref({});
const saving = ref(false);

const priceYuan = computed({
  get: () => Number(form.value.price || 0) / 100,
  set: (v) => { form.value.price = Math.round(v * 100); },
});
const originYuan = computed({
  get: () => Number(form.value.origin_price || 0) / 100,
  set: (v) => { form.value.origin_price = Math.round(v * 100); },
});

async function load() {
  const r = await api.configs();
  const o = {};
  r.rows.forEach((x) => { o[x.k] = x.type === 'number' ? Number(x.v || 0) : x.v; });
  form.value = o;
}
async function save() {
  saving.value = true;
  try { await api.saveConfigs(form.value); } finally { saving.value = false; }
}
onMounted(load);
</script>

<style scoped>
.hint { margin-left: 12px; color: #909399; font-size: 12px; }
</style>
