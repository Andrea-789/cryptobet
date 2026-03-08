<template>
  <div class="vip-page">
  <div class="topbar"><span class="top-title">👑 VIP Club</span></div>
  <div class="vip-hero">
  <div class="vip-crown">👑</div>
  <div class="vip-h">VIP <span>Club</span></div>
  <div class="vip-sub">Play more, earn more. Exclusive perks at every level.</div>
  </div>
  <!-- STATUS (dynamic) -->
  <div class="section">
  <div class="sec-title">Your VIP Status</div>
  <div v-if="loadingStats" style="text-align:center;padding:20px"><div class="spinner"></div></div>
  <div v-else class="gframe"><div class="gf-in"><div class="gf-body">
  <div class="my-vip">
  <div class="mv-left">
  <div class="mv-tier">{{ currentTier.ico }} {{ currentTier.name }} <span class="mv-sub">Tier {{ currentTierIdx+1 }} / {{ tiers.length }}</span></div>
  <div class="mv-next">{{ fmtUsd(wagered) }} wagered of {{ nextTier ? fmtUsd(nextTier.threshold) : 'MAX' }}{{ nextTier ? ' to '+nextTier.name : '' }}</div>
  <div class="mv-bar-w"><div class="mv-bar" :style="{width:progressPct+'%'}"></div></div>
  <div class="mv-xp">{{ nextTier ? fmtUsd(nextTier.threshold-wagered)+' more to unlock '+nextTier.name+' perks' : '🎉 Maximum tier reached!' }}</div>
  </div>
  <div class="mv-shield">🛡️</div>
  </div>
  </div></div></div>
  </div>
  <!-- TIERS -->
  <div class="section">
  <div class="sec-title">All Tiers</div>
  <div class="tiers">
  <div v-for="(t,i) in tiers" :key="i" class="tier" :class="{current:i===currentTierIdx}">
  <div v-if="i===currentTierIdx" class="tier-you">YOU</div>
  <div class="t-top">
  <div class="t-ico">{{ t.ico }}</div>
  <div class="t-info"><div class="t-name" :style="{color:t.clr}">{{ t.name }}</div><div class="t-req">Wager {{ fmtUsd(t.threshold) }}</div></div>
  </div>
  <div class="t-perks"><span v-for="p in t.perks" :key="p" class="t-perk">{{ p }}</span></div>
  </div>
  </div>
  </div>
  <!-- BENEFITS TABLE -->
  <div class="section">
  <div class="sec-title">Benefits Comparison</div>
  <div class="ben-scroll">
  <table class="ben-table">
  <tr><th></th><th v-for="(t,i) in tiers" :key="i" :style="{color:t.clr}">{{ t.ico }}<br>{{ t.name }}</th></tr>
  <tr v-for="(b,bi) in benefitLabels" :key="bi" :class="{hl:bi%2===0}">
  <td class="ben-label">{{ b }}</td>
  <td v-for="(t,ti) in tiers" :key="ti" :class="cellCls(ti,bi)" style="text-align:center">{{ cellVal(ti,bi) }}</td>
  </tr>
  </table>
  </div>
  </div>
  </div>
  </template>
  <script setup>
  import { ref, computed, onMounted } from 'vue';
  import api from '../services/api.js';
  const props = defineProps({ user: Object, wallet: [Object,String] });
  const loadingStats = ref(false);
  const wagered = ref(0);
  const tiers = [
  {ico:'🥉',name:'Bronze',threshold:0,clr:'#cd7f32',perks:['1% Rakeback','Weekly Bonus','Basic Support']},
  {ico:'🥈',name:'Silver',threshold:1000,clr:'#c0c0c0',perks:['2% Rakeback','Weekly Bonus','Email Support']},
  {ico:'🥇',name:'Gold',threshold:5000,clr:'#ffa830',perks:['3% Rakeback','Bi-weekly Bonus','Priority Support']},
  {ico:'💎',name:'Diamond',threshold:20000,clr:'#20f0ff',perks:['5% Rakeback','Weekly Bonus','Priority Support','Daily Wheel Boost']},
  {ico:'👑',name:'Platinum',threshold:50000,clr:'#a080ff',perks:['8% Rakeback','Daily Bonus','VIP Manager','Exclusive Events']},
  {ico:'🌟',name:'Obsidian',threshold:200000,clr:'#ff70ff',perks:['15% Rakeback','Daily Bonus','Personal Manager','Private Events','Cashback']}
  ];
  const benefitLabels = ['Rakeback','Weekly Bonus','Daily Bonus','Priority Support','VIP Manager','Exclusive Events','Custom Limits','Personal Gifts'];
  const matrix = [
  ['1%','$10','✗','✗','✗','✗','✗','✗'],
  ['2%','$25','✗','✗','✗','✗','✗','✗'],
  ['3%','$50','✗','✓','✗','✗','✗','✗'],
  ['5%','$100','✗','✓','✗','✗','✗','✗'],
  ['8%','$250','✓','✓','✓','✓','✓','✗'],
  ['15%','$1K','✓','✓','✓','✓','✓','✓']
  ];
  const currentTierIdx = computed(() => {
  let idx = 0;
  for (let i = tiers.length - 1; i >= 0; i--) { if (wagered.value >= tiers[i].threshold) { idx = i; break; } }
  return idx;
  });
  const currentTier = computed(() => tiers[currentTierIdx.value]);
  const nextTier = computed(() => tiers[currentTierIdx.value + 1] || null);
  const progressPct = computed(() => {
  if (!nextTier.value) return 100;
  const cur = tiers[currentTierIdx.value].threshold;
  const nxt = nextTier.value.threshold;
  return Math.min(100, ((wagered.value - cur) / (nxt - cur)) * 100);
  });
  function fmtUsd(n) { return '$' + n.toLocaleString(); }
  function cellVal(ti, bi) { return matrix[ti]?.[bi] || '✗'; }
  function cellCls(ti, bi) { const v = cellVal(ti, bi); return v === '✗' ? 'no' : v === '✓' ? 'ck' : ''; }
  async function fetchStats() {
  loadingStats.value = true;
  try {
  const data = await api.getUserStats();
  wagered.value = data.totalWagered || 0;
  } catch (e) { console.error('VIP stats error:', e); }
  loadingStats.value = false;
  }
  onMounted(fetchStats);
  </script>
  <style scoped>
  .vip-page{max-width:420px;margin:0 auto;padding-bottom:40px}
  .topbar{display:flex;align-items:center;padding:14px 16px 0}
  .top-title{font-size:16px;font-weight:800}
  .vip-hero{text-align:center;padding:24px 16px 0}
  .vip-crown{font-size:56px;filter:drop-shadow(0 4px 20px rgba(255,222,89,.5))}
  .vip-h{font-size:22px;font-weight:900;margin-top:6px}
  .vip-h span{background:linear-gradient(90deg,#ffde59,#ffa830);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
  .vip-sub{font-size:12px;color:#6b82a0;font-weight:500;margin-top:4px}
  .section{padding:0 16px;margin-top:14px}
  .sec-title{font-size:11px;color:#6b82a0;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
  .gframe{padding:2px;border-radius:16px;background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff)}
  .gf-in{background:#0c1a30;border-radius:15px;padding:4px}
  .gf-body{background:linear-gradient(180deg,#0e1f38,#0a1628);border-radius:12px;padding:16px}
  .spinner{width:28px;height:28px;border:3px solid rgba(255,255,255,.1);border-top-color:#ffde59;border-radius:50%;animation:spin .6s linear infinite;margin:0 auto}
  @keyframes spin{to{transform:rotate(360deg)}}
  .my-vip{display:flex;align-items:center;gap:12px}
  .mv-left{flex:1}
  .mv-tier{font-size:14px;font-weight:800;color:#fff;display:flex;align-items:center;gap:6px}
  .mv-sub{font-size:10px;color:#6b82a0;font-weight:600}
  .mv-next{font-size:10px;color:#6b82a0;font-weight:600;margin-top:2px}
  .mv-bar-w{width:100%;height:8px;border-radius:4px;background:rgba(255,255,255,.08);margin-top:8px;overflow:hidden}
  .mv-bar{height:100%;border-radius:4px;background:linear-gradient(90deg,#ff30ff,#ffde59,#30ff70);transition:width .5s}
  .mv-xp{font-size:9px;color:#6b82a0;font-weight:600;margin-top:4px}
  .mv-shield{font-size:44px;filter:drop-shadow(0 4px 12px rgba(255,168,48,.4))}
  .tiers{display:flex;flex-direction:column;gap:8px}
  .tier{border-radius:14px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);padding:14px;position:relative;overflow:hidden;transition:all .2s}
  .tier:hover{background:rgba(255,255,255,.04)}
  .tier.current{border-color:rgba(255,222,89,.3);background:rgba(255,222,89,.04)}
  .tier-you{position:absolute;top:8px;right:8px;padding:2px 8px;border-radius:6px;font-size:8px;font-weight:800;background:linear-gradient(180deg,#ffde59,#ffa830);color:#000}
  .t-top{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .t-ico{font-size:28px}
  .t-info{flex:1}
  .t-name{font-size:14px;font-weight:800}
  .t-req{font-size:10px;color:#6b82a0;font-weight:600}
  .t-perks{display:flex;flex-wrap:wrap;gap:4px}
  .t-perk{padding:3px 8px;border-radius:6px;font-size:9px;font-weight:700;background:rgba(255,255,255,.04);color:#6b82a0;border:1px solid rgba(255,255,255,.06)}
  .tier.current .t-perk{background:rgba(255,222,89,.08);color:#ffde59;border-color:rgba(255,222,89,.2)}
  .ben-scroll{overflow-x:auto;border-radius:14px;border:1px solid rgba(255,255,255,.06)}
  .ben-table{width:100%;font-size:10px;border-collapse:collapse}
  .ben-table th{text-align:center;padding:8px 6px;color:#6b82a0;font-weight:700;font-size:9px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.06)}
  .ben-table td{padding:8px 6px;border-bottom:1px solid rgba(255,255,255,.03);font-weight:600;color:#fff}
  .ben-label{white-space:nowrap;color:#6b82a0}
  .hl{background:rgba(255,222,89,.04)}
  .ck{color:#3df06a}.no{color:#ff4040;opacity:.4}
  </style>