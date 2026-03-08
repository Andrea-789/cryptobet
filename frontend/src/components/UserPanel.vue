<template>
    <div class="up">
      <div class="topbar">
        <button class="bi" @click="$router.back()">‹</button>
        <span class="top-title">My Account</span>
        <button class="bi" style="position:relative" @click="$router.push('/notifications')">🔔<div v-if="hasNotif" class="notif-dot"></div></button>
      </div>
  
      <!-- BOTTOM NAV -->
      <div class="up-nav">
        <button v-for="(n,i) in navItems" :key="i" :class="['up-nv',upTab===i?'on':'']" @click="upTab=i">
          <span class="ni">{{ n.ico }}</span><span class="nl">{{ n.lbl }}</span>
        </button>
      </div>
  
      <!-- LOADING -->
      <div v-if="loadingProfile" class="view" style="text-align:center;padding-top:40px">
        <div class="spinner"></div>
        <div style="color:#6b82a0;font-size:12px;margin-top:10px">Loading...</div>
      </div>
  
      <!-- ═══════════ PROFILE ═══════════ -->
      <div v-else-if="upTab===0" class="view">
        <div class="prof-header">
          <div class="avatar-wrap">
            <div class="avatar-ring"><div class="avatar">🎮</div></div>
            <div class="avatar-badge">✔</div>
          </div>
          <div class="prof-name">{{ shortWallet }}</div>
          <div class="prof-tag">Member since {{ memberSince }} · ID: #{{ user?.id || '—' }}</div>
        </div>
  
        <div class="pstats">
          <div class="pstat">
            <div class="pstat-ico">🏆</div>
            <div class="pstat-v">{{ stats.totalBets?.toLocaleString() ?? '—' }}</div>
            <div class="pstat-l">Total Bets</div>
          </div>
          <div class="pstat">
            <div class="pstat-ico">📈</div>
            <div class="pstat-v" style="color:#3df06a">{{ stats.winRate ?? '—' }}%</div>
            <div class="pstat-l">Win Rate</div>
          </div>
          <div class="pstat">
            <div class="pstat-ico">🔥</div>
            <div class="pstat-v" style="color:#ffa830">{{ stats.maxStreak ?? '—' }}</div>
            <div class="pstat-l">Win Streak</div>
          </div>
        </div>
  
        <div class="section">
          <div class="sec-title">Wagered</div>
          <div class="pstat" style="text-align:center;padding:16px">
            <div class="pstat-v" style="font-size:22px;color:#a080ff">${{ stats.totalWagered?.toLocaleString(undefined,{minimumFractionDigits:2}) ?? '0.00' }}</div>
            <div class="pstat-l">Total Amount Wagered</div>
          </div>
        </div>
      </div>
  
      <!-- ═══════════ WALLET ═══════════ -->
      <div v-else-if="upTab===1" class="view">
        <div class="section" style="margin-top:16px">
          <div class="gframe"><div class="gf-in"><div class="gf-in2"><div class="gf-body">
            <div class="wallet-bal">
              <div class="wb-left">
                <div class="wb-lbl">Your Balances</div>
                <div v-if="!balances || balances.length===0" class="wb-val" style="font-size:16px;color:#6b82a0">No funds yet</div>
              </div>
              <div class="wb-right">
                <div class="wb-btn wb-dep" @click="$router.push('/deposit')"><div class="wico">↓</div><div class="wlbl">Deposit</div></div>
                <div class="wb-btn wb-wth" @click="$router.push('/deposit')"><div class="wico">↑</div><div class="wlbl">Withdraw</div></div>
                <div class="wb-btn wb-swp" @click="$router.push('/exchange')"><div class="wico">⇄</div><div class="wlbl">Swap</div></div>
              </div>
            </div>
            <div class="crypto-list">
              <div v-for="b in balances" :key="b.chain+b.token" class="crypto-row">
                <div class="cr-icon">{{ tokenIcon(b.token) }}</div>
                <div class="cr-info">
                  <div class="cr-name">{{ b.token }}</div>
                  <div class="cr-amt">{{ b.chain }}</div>
                </div>
                <div class="cr-val">
                  <div class="cr-usd" style="font-weight:800">{{ parseFloat(b.amount).toLocaleString(undefined,{minimumFractionDigits:4}) }}</div>
                </div>
              </div>
            </div>
          </div></div></div></div>
        </div>
  
        <div class="section">
          <div class="sec-title">Deposit Address</div>
          <div class="ref-box">
            <input class="ref-code" :value="depositAddr || 'Loading...'" readonly style="color:#a080ff;font-size:12px">
            <button class="ref-copy" style="background:linear-gradient(180deg,#8050ff,#6030dd)" @click="copyAddr">Copy</button>
          </div>
        </div>
      </div>
  
      <!-- ═══════════ HISTORY ═══════════ -->
      <div v-else-if="upTab===2" class="view">
        <div class="section" style="margin-top:16px">
          <div class="sec-title">Recent Activity</div>
          <div v-if="loadingHistory" style="text-align:center;padding:20px"><div class="spinner"></div></div>
          <div v-else-if="history.length===0" style="text-align:center;color:#6b82a0;font-size:12px;padding:30px 0">No activity yet</div>
          <div v-else class="hist-list">
            <div v-for="h in history" :key="h.created_at+h.title" class="hist-row">
              <div :class="['hr-icon', histClass(h)]">{{ histIcon(h) }}</div>
              <div class="hr-info">
                <div class="hr-title">{{ h.title }}</div>
                <div class="hr-time">{{ timeAgo(h.created_at) }}</div>
              </div>
              <div :class="['hr-amt', histAmtClass(h)]">{{ histAmt(h) }}</div>
            </div>
            <button v-if="history.length >= histLimit" class="load-more" @click="loadMoreHistory">Load more</button>
          </div>
        </div>
      </div>
  
      <!-- ═══════════ REFERRAL ═══════════ -->
      <div v-else-if="upTab===3" class="view">
        <div class="section" style="margin-top:16px">
          <div class="sec-title">Your Referral Code</div>
          <div class="ref-box">
            <input class="ref-code" :value="referral.code || 'Loading...'" readonly>
            <button class="ref-copy" @click="copyRef">Copy</button>
          </div>
          <div class="ref-stats">
            <div class="rs"><div class="v">{{ referral.referrals ?? '—' }}</div><div class="l">Referrals</div></div>
            <div class="rs"><div class="v">${{ referral.earned?.toLocaleString(undefined,{minimumFractionDigits:2}) ?? '0' }}</div><div class="l">Earned</div></div>
          </div>
        </div>
  
        <div class="section">
          <div class="sec-title">How It Works</div>
          <div class="gframe"><div class="gf-in"><div class="gf-in2"><div class="gf-body" style="display:flex;flex-direction:column;gap:12px">
            <div v-for="(s,i) in howSteps" :key="i" style="display:flex;gap:10px;align-items:center">
              <div class="how-num" :style="{background:s.bg,color:s.color}">{{ i+1 }}</div>
              <div><div style="font-size:12px;font-weight:700">{{ s.title }}</div><div style="font-size:10px;color:#6b82a0">{{ s.desc }}</div></div>
            </div>
          </div></div></div></div>
        </div>
  
        <div class="section">
          <div class="sec-title">Top Referrers</div>
          <div v-if="topReferrers.length===0" style="color:#6b82a0;font-size:12px;padding:12px 0">No data yet</div>
          <div v-else class="hist-list">
            <div v-for="(r,i) in topReferrers" :key="r.referrer_id" class="hist-row">
              <div class="hr-icon" :style="{background:medalBg(i),color:medalColor(i)}">{{ medalIcon(i) }}</div>
              <div class="hr-info">
                <div class="hr-title">{{ shortAddr(r.wallet_address) }}</div>
                <div class="hr-time">{{ r.refs }} referrals</div>
              </div>
              <div class="hr-amt green">${{ parseFloat(r.earned).toLocaleString() }}</div>
            </div>
          </div>
        </div>
      </div>
  
      <!-- ═══════════ SETTINGS ═══════════ -->
      <div v-else-if="upTab===4" class="view">
        <div class="section" style="margin-top:16px">
          <div class="sec-title">Account</div>
          <div class="set-list">
            <div class="set-row">
              <div class="set-ico" style="background:rgba(61,240,106,.1)">👤</div>
              <div class="set-info"><div class="set-name">Wallet</div><div class="set-desc">{{ wallet || '—' }}</div></div>
            </div>
            <div class="set-row">
              <div class="set-ico" style="background:rgba(128,80,255,.1)">🆔</div>
              <div class="set-info"><div class="set-name">User ID</div><div class="set-desc">#{{ user?.id || '—' }}</div></div>
            </div>
          </div>
        </div>
  
        <div class="section">
          <div class="sec-title">Preferences</div>
          <div class="set-list">
            <div v-for="s in setPrefs" :key="s.name" class="set-row">
              <div class="set-ico" style="background:rgba(255,255,255,.05)">{{ s.ico }}</div>
              <div class="set-info"><div class="set-name">{{ s.name }}</div><div class="set-desc">{{ s.desc }}</div></div>
              <button v-if="s.toggle!==undefined" :class="['toggle',s.toggle?'on':'']" @click="s.toggle=!s.toggle"></button>
              <div v-else class="set-arrow">›</div>
            </div>
          </div>
        </div>
  
        <div class="section">
          <div class="sec-title">Provably Fair</div>
          <div class="set-list">
            <div class="set-row" @click="$router.push('/fair')">
              <div class="set-ico" style="background:rgba(32,240,255,.1)">🔐</div>
              <div class="set-info"><div class="set-name">Seeds & Verification</div><div class="set-desc">View or rotate your seeds</div></div>
              <div class="set-arrow">›</div>
            </div>
          </div>
        </div>
  
        <div class="section" style="margin-top:20px;padding-bottom:10px">
          <button class="logout-btn" @click="handleLogout">Log Out</button>
        </div>
      </div>
  
      <!-- TOAST -->
      <div :class="['toast-msg',toastShow?'show':'']">{{ toastText }}</div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, onMounted, watch } from 'vue';
  import { useRouter } from 'vue-router';
  import api from '../services/api.js';
  
  const props = defineProps({
    balances: Array,
    wallet: [Object, String],
    user: Object,
  });
  const emit = defineEmits(['balanceUpdate', 'logout']);
  const router = useRouter();
  
  const upTab = ref(0);
  const toastText = ref('');
  const toastShow = ref(false);
  const hasNotif = ref(false);
  
  // ── Reactive data from backend ──
  const loadingProfile = ref(false);
  const loadingHistory = ref(false);
  
  const stats = reactive({ totalBets: 0, totalWins: 0, winRate: '0', totalWagered: 0, maxStreak: 0 });
  const history = ref([]);
  const histOffset = ref(0);
  const histLimit = 30;
  const referral = reactive({ code: '', referrals: 0, earned: 0 });
  const topReferrers = ref([]);
  const depositAddr = ref('');
  
  // ── Static UI data ──
  const navItems = [
    { ico: '👤', lbl: 'Profile' },
    { ico: '💰', lbl: 'Wallet' },
    { ico: '📜', lbl: 'History' },
    { ico: '🎁', lbl: 'Referral' },
    { ico: '⚙️', lbl: 'Settings' },
  ];
  
  const howSteps = [
    { title: 'Share Your Code', desc: 'Send your referral link to friends', bg: 'linear-gradient(180deg,#3df06a33,#22b84533)', color: '#3df06a' },
    { title: 'Friends Sign Up', desc: 'They register using your code', bg: 'linear-gradient(180deg,#ffde5933,#ffa83033)', color: '#ffde59' },
    { title: 'Earn Commission', desc: 'Get % of their wagered amount', bg: 'linear-gradient(180deg,#8050ff33,#6030dd33)', color: '#a080ff' },
  ];
  
  const setPrefs = reactive([
    { ico: '🌙', name: 'Dark Mode', desc: 'Always on', toggle: true },
    { ico: '🔔', name: 'Notifications', desc: 'Push alerts', toggle: true },
    { ico: '🔊', name: 'Sound Effects', desc: 'Game sounds', toggle: false },
  ]);
  
  // ── Fetch functions ──
  async function fetchStats() {
    try {
      const data = await api.getUserStats();
      Object.assign(stats, data);
    } catch (e) { console.error('Stats error:', e); }
  }
  
  async function fetchHistory(reset = false) {
    loadingHistory.value = true;
    try {
      if (reset) { histOffset.value = 0; history.value = []; }
      const data = await api.getUserHistory(histLimit, histOffset.value);
      if (reset) history.value = data.history;
      else history.value.push(...data.history);
    } catch (e) { console.error('History error:', e); }
    loadingHistory.value = false;
  }
  
  async function fetchReferral() {
    try {
      const data = await api.getReferral();
      Object.assign(referral, data);
    } catch (e) { console.error('Referral error:', e); }
  }
  
  async function fetchTopReferrers() {
    try {
      const data = await api.getTopReferrers();
      topReferrers.value = data.top || [];
    } catch (e) { console.error('Top referrers error:', e); }
  }
  
  async function fetchDepositAddr() {
    try {
      const data = await api.getDepositAddress();
      depositAddr.value = data.address || data.depositAddress || '';
    } catch (e) { console.error('Deposit addr error:', e); }
  }
  
  function loadMoreHistory() {
    histOffset.value += histLimit;
    fetchHistory(false);
  }
  
  // ── Load data when tab changes ──
  watch(upTab, (tab) => {
    if (tab === 0) fetchStats();
    if (tab === 1) fetchDepositAddr();
    if (tab === 2) fetchHistory(true);
    if (tab === 3) { fetchReferral(); fetchTopReferrers(); }
  });
  
  onMounted(() => {
    fetchStats();
  });
  
  // ── Helpers ──
  const walletStr = () => {
    if (typeof props.wallet === 'string') return props.wallet;
    return props.wallet?.address || props.user?.wallet || '';
  };
  const shortWallet = ref('');
  watch(() => [props.wallet, props.user], () => {
    const w = walletStr();
    shortWallet.value = w ? `${w.slice(0, 6)}...${w.slice(-4)}` : 'Not connected';
  }, { immediate: true });
  
  const memberSince = ref('');
  watch(() => props.user, (u) => {
    if (u?.createdAt) memberSince.value = new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    else memberSince.value = '—';
  }, { immediate: true });
  
  function tokenIcon(token) {
    const map = { BTC: '₿', ETH: 'Ξ', SOL: '◎', USDT: '$', USDC: '$', DOGE: 'Ð' };
    return map[token?.toUpperCase()] || '●';
  }
  
  function shortAddr(addr) {
    if (!addr) return '—';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
  
  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }
  
  function histIcon(h) {
    if (h.source === 'tx') return h.title === 'deposit' ? '↓' : '↑';
    const gameIcons = { dice: '🎲', mines: '💣', crash: '🚀', blackjack: '🃏', hilo: '⬆️', roulette: '🎡', plinko: '⚡', slots: '🎰' };
    return gameIcons[h.title?.toLowerCase()] || '🎮';
  }
  
  function histClass(h) {
    if (h.source === 'tx') return h.title === 'deposit' ? 'hr-dep' : 'hr-wth';
    return parseFloat(h.payout) > 0 ? 'hr-win' : 'hr-loss';
  }
  
  function histAmtClass(h) {
    if (h.source === 'tx') return h.title === 'deposit' ? 'green' : 'red';
    return parseFloat(h.payout) > 0 ? 'green' : 'red';
  }
  
  function histAmt(h) {
    if (h.source === 'tx') {
      const pre = h.title === 'deposit' ? '+' : '-';
      return `${pre}${parseFloat(h.amount).toLocaleString()} ${h.token || ''}`;
    }
    const payout = parseFloat(h.payout);
    const amount = parseFloat(h.amount);
    if (payout > 0) return `+$${payout.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    return `-$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }
  
  function medalIcon(i) { return ['🥇','🥈','🥉'][i] || `#${i+1}`; }
  function medalBg(i) { return ['rgba(255,222,89,.12)','rgba(192,192,192,.1)','rgba(205,127,50,.1)'][i] || 'rgba(255,255,255,.05)'; }
  function medalColor(i) { return ['#ffde59','#c0c0c0','#cd7f32'][i] || '#6b82a0'; }
  
  function handleLogout() {
    emit('logout');
    router.push('/');
  }
  
  function toast(m) { toastText.value = m; toastShow.value = true; setTimeout(() => toastShow.value = false, 2000); }
  function copyRef() { navigator.clipboard.writeText(referral.code).catch(() => {}); toast('Referral code copied!'); }
  function copyAddr() { navigator.clipboard.writeText(depositAddr.value).catch(() => {}); toast('Address copied!'); }
  </script>
  
  <style scoped>
  .up{display:flex;flex-direction:column;padding-bottom:24px}
  .topbar{display:flex;justify-content:space-between;align-items:center;padding:14px 16px 0}
  .bi{width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,.07);border:none;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .top-title{font-size:16px;font-weight:800}
  .notif-dot{width:8px;height:8px;border-radius:50%;background:#ff4040;position:absolute;top:-2px;right:-2px}
  .up-nav{display:flex;justify-content:space-around;padding:10px 10px 0}
  .up-nv{display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;border:none;background:none;font-family:'Poppins',sans-serif;color:#6b82a0;transition:color .2s;padding:4px 6px}
  .up-nv.on{color:#3df06a}
  .up-nv .ni{font-size:20px}
  .up-nv .nl{font-size:9px;font-weight:700}
  .view{padding:0 16px}
  .spinner{width:28px;height:28px;border:3px solid rgba(255,255,255,.1);border-top-color:#3df06a;border-radius:50%;animation:spin .6s linear infinite;margin:0 auto}
  @keyframes spin{to{transform:rotate(360deg)}}
  /* PROFILE */
  .prof-header{display:flex;flex-direction:column;align-items:center;padding:20px 0 0}
  .avatar-wrap{position:relative;width:90px;height:90px}
  .avatar-ring{width:90px;height:90px;border-radius:50%;padding:3px;background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff)}
  .avatar{width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#1a3050,#0e1f38);display:flex;align-items:center;justify-content:center;font-size:36px}
  .avatar-badge{position:absolute;bottom:-2px;right:-2px;width:28px;height:28px;border-radius:50%;background:linear-gradient(180deg,#3df06a,#22b845);border:3px solid #0c1a30;display:flex;align-items:center;justify-content:center;font-size:12px}
  .prof-name{font-size:20px;font-weight:800;margin-top:10px}
  .prof-tag{font-size:12px;color:#6b82a0;font-weight:600;margin-top:2px}
  .pstats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:14px 16px 0}
  .pstat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:12px 8px;text-align:center}
  .pstat-ico{font-size:20px;margin-bottom:4px}
  .pstat-v{font-size:16px;font-weight:800}
  .pstat-l{font-size:9px;color:#6b82a0;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
  .section{padding:0;margin-top:14px}
  .sec-title{font-size:11px;color:#6b82a0;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
  /* GFRAME */
  .gframe{width:100%;padding:2px;border-radius:16px;background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff)}
  .gf-in{background:#0c1a30;border-radius:15px;padding:2px}
  .gf-in2{padding:2px;border-radius:13px;background:conic-gradient(#ff30ff33,#ffde5933,#30ff7033,#20f0ff33,#8050ff33,#ff30ff33)}
  .gf-body{background:linear-gradient(180deg,#0e1f38,#0a1628);border-radius:12px;padding:14px}
  /* WALLET */
  .wallet-bal{display:flex;justify-content:space-between;align-items:center}
  .wb-left .wb-lbl{font-size:10px;color:#6b82a0;font-weight:600}
  .wb-left .wb-val{font-size:28px;font-weight:900;color:#3df06a;margin-top:2px}
  .wb-left .wb-btc{font-size:12px;color:#6b82a0;font-weight:600}
  .wb-right{display:flex;gap:8px}
  .wb-btn{width:44px;height:44px;border-radius:14px;border:none;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;font-family:'Poppins',sans-serif;transition:transform .15s;gap:2px}
  .wb-btn:hover{transform:scale(1.08)}
  .wico{font-size:18px}
  .wlbl{font-size:7px;font-weight:700}
  .wb-dep{background:linear-gradient(180deg,#3df06a22,#22b84522);color:#3df06a;border:1px solid #3df06a44}
  .wb-wth{background:linear-gradient(180deg,#ff505022,#d0151522);color:#ff5050;border:1px solid #ff505044}
  .wb-swp{background:linear-gradient(180deg,#8050ff22,#6030dd22);color:#a080ff;border:1px solid #8050ff44}
  .crypto-list{display:flex;flex-direction:column;gap:6px;margin-top:10px}
  .crypto-row{display:flex;align-items:center;padding:10px 12px;background:rgba(255,255,255,.03);border-radius:12px;gap:10px}
  .cr-icon{font-size:22px;width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center}
  .cr-info{flex:1}
  .cr-name{font-size:12px;font-weight:700}
  .cr-amt{font-size:10px;color:#6b82a0;font-weight:600}
  .cr-val{text-align:right}
  .cr-usd{font-size:12px;font-weight:800}
  .cr-chg{font-size:9px;font-weight:700}
  /* HISTORY */
  .hist-list{display:flex;flex-direction:column;gap:4px}
  .hist-row{display:flex;align-items:center;padding:10px 12px;background:rgba(255,255,255,.03);border-radius:12px;gap:10px}
  .hr-icon{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px}
  .hr-win{background:rgba(61,240,106,.1);color:#3df06a}
  .hr-loss{background:rgba(255,64,64,.1);color:#ff4040}
  .hr-dep{background:rgba(128,80,255,.1);color:#a080ff}
  .hr-wth{background:rgba(255,168,48,.1);color:#ffa830}
  .hr-info{flex:1}
  .hr-title{font-size:12px;font-weight:700}
  .hr-time{font-size:9px;color:#6b82a0;font-weight:500}
  .hr-amt{font-size:13px;font-weight:800;text-align:right}
  .hr-amt.green{color:#3df06a}
  .hr-amt.red{color:#ff4040}
  .load-more{width:100%;padding:10px;margin-top:8px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#6b82a0;font-size:12px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif}
  .load-more:hover{background:rgba(255,255,255,.06)}
  /* REFERRAL */
  .ref-box{display:flex;align-items:center;gap:10px;padding:12px;background:rgba(61,240,106,.04);border:1px solid rgba(61,240,106,.15);border-radius:14px}
  .ref-code{flex:1;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.06);font-size:14px;font-weight:800;font-family:'Poppins',sans-serif;letter-spacing:1px;color:#3df06a;border:none;outline:none;cursor:text}
  .ref-copy{padding:8px 16px;border-radius:10px;border:none;background:linear-gradient(180deg,#3df06a,#22b845);color:#fff;font-size:12px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;transition:transform .15s}
  .ref-copy:hover{transform:scale(1.05)}
  .ref-stats{display:flex;gap:8px;margin-top:8px}
  .rs{flex:1;text-align:center;padding:10px;background:rgba(255,255,255,.03);border-radius:10px}
  .rs .v{font-size:16px;font-weight:800;color:#3df06a}
  .rs .l{font-size:9px;color:#6b82a0;font-weight:600;margin-top:2px}
  .how-num{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;flex-shrink:0}
  /* SETTINGS */
  .set-list{display:flex;flex-direction:column;gap:4px}
  .set-row{display:flex;align-items:center;padding:12px 14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);border-radius:14px;gap:12px;cursor:pointer;transition:background .15s}
  .set-row:hover{background:rgba(255,255,255,.06)}
  .set-ico{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px}
  .set-info{flex:1}
  .set-name{font-size:13px;font-weight:700}
  .set-desc{font-size:10px;color:#6b82a0;font-weight:500;word-break:break-all}
  .set-arrow{color:#6b82a0;font-size:16px}
  .toggle{width:44px;height:24px;border-radius:12px;background:rgba(255,255,255,.1);position:relative;cursor:pointer;transition:background .2s;border:none;flex-shrink:0}
  .toggle.on{background:#3df06a}
  .toggle::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 2px 4px rgba(0,0,0,.3)}
  .toggle.on::after{transform:translateX(20px)}
  .logout-btn{width:100%;padding:13px;border-radius:20px;border:2px solid #ff404044;background:rgba(255,64,64,.08);color:#ff5050;font-size:14px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif}
  /* TOAST */
  .toast-msg{position:fixed;top:20px;left:50%;transform:translateX(-50%) translateY(-100px);padding:10px 22px;border-radius:12px;font-size:12px;font-weight:700;z-index:50;transition:transform .4s cubic-bezier(.2,1,.3,1);background:#0e2a1a;border:2px solid #3df06a;color:#3df06a}
  .toast-msg.show{transform:translateX(-50%) translateY(0)}
  </style>