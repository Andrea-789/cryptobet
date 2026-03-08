<template>
  <div class="notif-page">
  <div class="topbar"><span class="top-title">🔔 Notifications</span><div v-if="unreadCount" class="top-badge">{{ unreadCount }} new</div></div>
  <div class="tabs"><button v-for="t in tabs" :key="t.f" class="tab" :class="{on:curF===t.f}" @click="curF=t.f">{{ t.l }}<span v-if="t.f==='all'&&unreadCount" class="cnt">{{ unreadCount }}</span></button></div>
  <div class="qa">
  <div class="qa-btn" @click="markAll">✔ Mark all read</div>
  <div class="qa-btn danger" @click="clearAll">🗑 Clear all</div>
  </div>
  <div class="section">
  <div class="notif-list">
  <template v-for="(n,i) in filtered" :key="n.id">
  <div v-if="i===0||dayLabel(filtered[i-1])!==dayLabel(n)" class="date-sep">{{ dayLabel(n) }}</div>
  <div class="notif" :class="{unread:!n.read}" @click="markRead(n)">
  <div class="n-ico" :class="icoClass(n.type)">{{ icoEmoji(n.type) }}</div>
  <div class="n-body">
  <div class="n-title">{{ n.text }}</div>
  <div class="n-time"><span class="n-tag" :class="tagClass(n.type)">{{ tagLabel(n.type) }}</span>{{ timeAgo(n.ts) }}</div>
  </div>
  </div>
  </template>
  <div v-if="!filtered.length" class="empty"><div class="empty-ico">🔕</div><div class="empty-txt">No notifications yet</div><div class="empty-sub">Play games and interact to receive notifications</div></div>
  </div>
  </div>
  </div>
  </template>
  <script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useSocket } from '../composables/useSocket.js';
  const { notifications: socketNotifs, onEvent, offEvent, removeNotification } = useSocket();
  const curF = ref('all');
  const localNotifs = ref([]);
  const tabs = [{f:'all',l:'All'},{f:'win',l:'🏆 Wins'},{f:'deposit',l:'💰 Deposits'},{f:'withdrawal',l:'↑ Withdrawals'},{f:'system',l:'⚙️ System'}];
  // Merge socket notifications into local list
  function syncFromSocket() {
  for (const sn of socketNotifs.value) {
  if (!localNotifs.value.find(l => l.id === sn.id)) {
  localNotifs.value.unshift({ id: sn.id, type: sn.type || 'system', text: sn.text || '', ts: sn.ts || Date.now(), read: false });
  }
  }
  }
  // Listen for real-time events and add notifications
  function handleDeposit(d) {
  addLocal('deposit', `Deposit confirmed: ${d.amount} ${d.token} (${d.chain})`);
  }
  function handleBetResult(d) {
  if (d.win) addLocal('win', `Won ${d.payout?.toFixed(4)}! (${d.game||'Game'})`);
  }
  function handleWithdrawProcessing(d) {
  addLocal('withdrawal', `Withdrawal sent: ${d.txHash?.slice(0,12)}...`);
  }
  function handleWithdrawConfirmed(d) {
  addLocal('withdrawal', `Withdrawal confirmed: ${d.amount} ${d.token||''} (${d.chain||''})`);
  }
  function handleWithdrawFailed(d) {
  addLocal('system', `Withdrawal failed: ${d.reason}`);
  }
  function handleSwap(d) {
  addLocal('system', `Swap: ${d.fromAmount} ${d.fromToken} → ${d.toAmount?.toFixed(6)} ${d.toToken}`);
  }
  function addLocal(type, text) {
  localNotifs.value.unshift({ id: Date.now() + Math.random(), type, text, ts: Date.now(), read: false });
  if (localNotifs.value.length > 50) localNotifs.value.pop();
  }
  onMounted(() => {
  syncFromSocket();
  onEvent('deposit:confirmed', handleDeposit);
  onEvent('bet:result', handleBetResult);
  onEvent('withdrawal:processing', handleWithdrawProcessing);
  onEvent('withdrawal:confirmed', handleWithdrawConfirmed);
  onEvent('withdrawal:failed', handleWithdrawFailed);
  onEvent('swap:completed', handleSwap);
  });
  onUnmounted(() => {
  offEvent('deposit:confirmed', handleDeposit);
  offEvent('bet:result', handleBetResult);
  offEvent('withdrawal:processing', handleWithdrawProcessing);
  offEvent('withdrawal:confirmed', handleWithdrawConfirmed);
  offEvent('withdrawal:failed', handleWithdrawFailed);
  offEvent('swap:completed', handleSwap);
  });
  const filtered = computed(() => curF.value === 'all' ? localNotifs.value : localNotifs.value.filter(n => n.type === curF.value));
  const unreadCount = computed(() => localNotifs.value.filter(n => !n.read).length);
  function markRead(n) { n.read = true; }
  function markAll() { localNotifs.value.forEach(n => n.read = true); }
  function clearAll() { localNotifs.value = []; }
  function dayLabel(n) {
  const d = new Date(n.ts); const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function timeAgo(ts) {
  const diff = Date.now() - ts; const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now'; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
  }
  function icoEmoji(t) { return { win:'🏆', deposit:'✅', withdrawal:'↑', system:'⚙️' }[t] || '🔔'; }
  function icoClass(t) { return { win:'ni-win', deposit:'ni-dep', withdrawal:'ni-wth', system:'ni-sys' }[t] || 'ni-sys'; }
  function tagLabel(t) { return { win:'Win', deposit:'Deposit', withdrawal:'Withdrawal', system:'System' }[t] || 'Info'; }
  function tagClass(t) { return { win:'nt-win', deposit:'nt-dep', withdrawal:'nt-wth', system:'nt-sys' }[t] || 'nt-sys'; }
  </script>
  <style scoped>
  .notif-page{max-width:420px;margin:0 auto;padding-bottom:40px}
  .topbar{display:flex;align-items:center;gap:10px;padding:14px 16px 0}
  .top-title{font-size:16px;font-weight:800;flex:1;color:#fff}
  .top-badge{background:rgba(255,64,64,.15);color:#ff4040;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:800}
  .tabs{display:flex;gap:4px;padding:12px 16px 0;overflow-x:auto}
  .tab{padding:8px 14px;border-radius:12px;border:none;background:rgba(255,255,255,.04);color:#6b82a0;font-size:11px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;white-space:nowrap;flex-shrink:0;display:flex;align-items:center;gap:4px}
  .tab.on{background:linear-gradient(180deg,#3df06a22,#22b84522);color:#3df06a;border:1px solid #3df06a44}
  .cnt{min-width:16px;height:16px;border-radius:8px;background:rgba(255,64,64,.8);color:#fff;font-size:8px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 4px}
  .qa{display:flex;gap:6px;padding:10px 16px 0}
  .qa-btn{flex:1;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);text-align:center;font-size:10px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;color:#6b82a0;transition:all .15s}
  .qa-btn:hover{background:rgba(255,255,255,.06);color:#fff}
  .qa-btn.danger{border-color:rgba(255,64,64,.2);color:#ff5050}
  .section{padding:0 16px;margin-top:14px}
  .notif-list{display:flex;flex-direction:column;gap:4px}
  .date-sep{font-size:10px;color:#4a6080;font-weight:700;padding:10px 0 4px;display:flex;align-items:center;gap:8px}
  .date-sep::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.06)}
  .notif{display:flex;gap:10px;padding:12px;border-radius:14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);cursor:pointer;transition:all .2s;position:relative}
  .notif:hover{background:rgba(255,255,255,.04)}
  .notif.unread{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.08)}
  .notif.unread::before{content:'';position:absolute;top:14px;left:4px;width:5px;height:5px;border-radius:50%;background:#3df06a}
  .n-ico{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
  .ni-win{background:rgba(61,240,106,.1)}.ni-dep{background:rgba(128,80,255,.1)}.ni-wth{background:rgba(255,168,48,.1)}.ni-sys{background:rgba(32,240,255,.1)}
  .n-body{flex:1;min-width:0}
  .n-title{font-size:12px;font-weight:700;color:#fff;line-height:1.3}
  .n-time{font-size:9px;color:#4a6080;font-weight:600;margin-top:4px;display:flex;align-items:center;gap:6px}
  .n-tag{padding:2px 6px;border-radius:4px;font-size:8px;font-weight:800}
  .nt-win{background:rgba(61,240,106,.12);color:#3df06a}.nt-dep{background:rgba(128,80,255,.12);color:#a080ff}
  .nt-wth{background:rgba(255,168,48,.12);color:#ffa830}.nt-sys{background:rgba(32,240,255,.12);color:#20f0ff}
  .empty{text-align:center;padding:40px 20px;color:#6b82a0}
  .empty-ico{font-size:48px;opacity:.4;margin-bottom:8px}
  .empty-txt{font-size:13px;font-weight:600}
  .empty-sub{font-size:11px;color:#4a6080;margin-top:4px}
  </style>