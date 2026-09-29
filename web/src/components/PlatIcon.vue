<template>
  <div class="plat-icon" :class="sizeClass" :style="wrapStyle">
    <img v-if="src" :src="src" :alt="name" />
    <span v-else-if="svgHtml" class="svg-wrap" v-html="svgHtml" />
    <span v-else class="fallback">{{ shortText }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  code: { type: String, default: '' },
  name: { type: String, default: '' },
  short: { type: String, default: '' },
  color: { type: String, default: '#3b6cf6' },
  icon: { type: String, default: '' },
  size: { type: String, default: 'md' },
});

const INNER = {
  '360': '<circle cx="24" cy="24" r="16" fill="none" stroke="#fff" stroke-width="3"/><path d="M17 24c0-3.9 3.1-7 7-7s7 3.1 7 7-3.1 7-7 7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="24" r="2.8" fill="#fff"/>',
  baidu: '<ellipse cx="24" cy="28" rx="12" ry="10" fill="#fff"/><circle cx="18" cy="17" r="3.2" fill="#fff"/><circle cx="30" cy="17" r="3.2" fill="#fff"/>',
  teddy: '<circle cx="15" cy="15" r="5.5" fill="#fff"/><circle cx="33" cy="15" r="5.5" fill="#fff"/><circle cx="24" cy="27" r="11" fill="#fff"/><circle cx="20" cy="25" r="1.8" fill="#d97706"/><circle cx="28" cy="25" r="1.8" fill="#d97706"/><ellipse cx="24" cy="31" rx="3" ry="2.2" fill="#d97706"/>',
  unicom: '<circle cx="24" cy="24" r="14" fill="none" stroke="#fff" stroke-width="3"/><path d="M24 12v24M12 24h24" stroke="#fff" stroke-width="3"/><circle cx="24" cy="24" r="4.5" fill="#fff"/>',
  tencent: '<path d="M15 27c0-7 4-12.5 9-12.5S33 20 33 27c0 2.5-1.2 4.5-3.5 5.5l1.8 3.5c-2.6-.8-4.5-.9-7.3-.9s-4.7.1-7.3.9l1.8-3.5C16.2 31.5 15 29.5 15 27z" fill="#fff"/><circle cx="20.5" cy="25.5" r="1.6" fill="#0284c7"/><circle cx="27.5" cy="25.5" r="1.6" fill="#0284c7"/>',
  cmcc: '<rect x="11" y="15" width="26" height="18" rx="3.5" fill="none" stroke="#fff" stroke-width="3"/><path d="M17 24h14M24 18v12" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  dianhuabang: '<path d="M17 11h14l2 8H15l2-8z" fill="#fff"/><rect x="15" y="19" width="18" height="16" rx="2" fill="#fff"/><circle cx="24" cy="28" r="2.8" fill="#1d4ed8"/>',
  sogou: '<circle cx="22" cy="22" r="9" fill="none" stroke="#fff" stroke-width="3"/><path d="M28.5 28.5L36 36" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
};

const src = computed(() => props.icon || '');
const svgHtml = computed(() => {
  const inner = INNER[props.code];
  if (!inner) return '';
  return `<svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
});
const shortText = computed(() => props.short || (props.name || '?').slice(0, 1));
const sizeClass = computed(() => (props.size === 'sm' ? 'sm' : 'md'));
const wrapStyle = computed(() => ({
  background: `linear-gradient(145deg, ${lighten(props.color, 14)} 0%, ${props.color} 100%)`,
}));

function lighten(hex, pct) {
  try {
    const h = String(hex || '').replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.min(255, Math.round(r + (255 - r) * (pct / 100)));
    g = Math.min(255, Math.round(g + (255 - g) * (pct / 100)));
    b = Math.min(255, Math.round(b + (255 - b) * (pct / 100)));
    return `rgb(${r},${g},${b})`;
  } catch (e) {
    return hex;
  }
}
</script>

<style scoped>
.plat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  color: #fff;
  overflow: hidden;
  flex-shrink: 0;
}
.plat-icon.md { width: 48px; height: 48px; }
.plat-icon.sm { width: 36px; height: 36px; border-radius: 10px; }
.plat-icon img { width: 100%; height: 100%; object-fit: cover; }
.plat-icon .svg-wrap {
  width: 62%;
  height: 62%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.plat-icon .svg-wrap :deep(svg) { display: block; width: 100%; height: 100%; }
.plat-icon .fallback { font-size: 16px; font-weight: 700; }
.plat-icon.sm .fallback { font-size: 13px; }
</style>
