<template>
  <div class="app">
  <div class="toast-container">
  <div v-for="n in notifications" :key="n.id" :class="['toast',n.type]" @click="removeNotification(n.id)">{{ n.text }}</div>
  </div>
  <template v-if="initializing">
  <div class="init-screen"><div class="init-spinner"></div><p class="init-text">Loading...</p></div>
  </template>
  <template v-else-if="!authenticated && !hasToken">
  <router-view />
  </template>
  <template v-else>
  <header class="header">
  <div class="logo" @click="goTo('/')">
  <div class="logo-icon"><div class="logo-icon-in">🎰</div></div>
  <div class="logo-text">Crypto<span>Bet</span></div>
  </div>
  <div class="hdr-right">
  <div class="hdr-bal" @click="goTo('/wallet')">{{ totalBalance }}</div>
  <button class="hdr-btn" @click="goTo('/notifications')">🔔<div v-if="notifications.length" class="notif-dot"></div></button>
  <button class="hdr-btn" @click="goTo('/account')"><span class="status-dot" :class="socketConnected?'on':'off'"></span></button>
  </div>
  </header>
  <main class="main-content">
  <p v-if="error" class="error-bar">{{ error }}</p>
  <router-view :balances="balances" :wallet="wallet" :user="user" :connected="socketConnected" @balanceUpdate="onBalanceUpdate" @logout="handleLogout" />
  </main>
  <nav class="bnav">
  <a v-for="tab in tabs" :key="tab.to" :class="['nv', isActive(tab.to) && 'on']" @click.prevent="goTo(tab.to)">
  <span class="ni">{{ tab.icon }}</span><span class="nl">{{ tab.label }}</span>
  </a>
  </nav>
  </template>
  </div>
  </template>
  <script setup>
  import { computed, watch, provide, ref } from 'vue';
  import { useRouter, useRoute } from 'vue-router';
  import { useWallet } from './composables/useWallet.js';
  import { useSocket } from './composables/useSocket.js';
  const router = useRouter();
  const route = useRoute();
  const { wallet, user, balances, error, initializing, authenticated, disconnect, fetchProfile } = useWallet();
  const { connected: socketConnected, notifications, connectSocket, disconnectSocket, onEvent, addNotification, removeNotification } = useSocket();
  const hasToken = computed(() => !!localStorage.getItem('token'));
  provide('balances', balances);
  provide('wallet', wallet);
  provide('user', user);
  provide('refreshBalances', async () => { await fetchProfile(); });
  const tabs = [
    { to: '/', icon: '🏠', label: 'Home' },
    { to: '/casino', icon: '🎰', label: 'Casino' },
    { to: '/trading', icon: '📈', label: 'Trade' },
    { to: '/wallet', icon: '💰', label: 'Wallet' },
    { to: '/account', icon: '👤', label: 'Profile' },
  ];
  const isActive = (path) => {
    if (path === '/') return route.path === '/';
    return route.path.startsWith(path);
  };
  let navigating = false;
  const goTo = async (path) => {
    if (navigating || route.path === path) return;
    navigating = true;
    try { await router.push(path); }
    finally { setTimeout(() => { navigating = false; }, 100); }
  };
  const totalBalance = computed(() => {
    if (!balances.value?.length) return '$0.00';
    const sum = balances.value.reduce((s, b) => s + parseFloat(b.amount || 0), 0);
    return sum < 0.0001 ? '$0.00' : `$${sum.toFixed(2)}`;
  });
  const handleLogout = () => { disconnectSocket(); disconnect(); };
  const onBalanceUpdate = async () => { await fetchProfile(); };
  let socketDone = false;
  const setupSocket = () => {
    if (socketDone) return;
    socketDone = true;
    connectSocket();
    onEvent('deposit:confirmed', (d) => { addNotification({ type: 'deposit', text: `Deposit: ${d.amount} ${d.token} (${d.chain})` }); balances.value = d.balances; });
    onEvent('bet:result', (d) => { if (d.win) addNotification({ type: 'win', text: `Won ${d.payout.toFixed(4)}!` }); });
    onEvent('withdrawal:processing', (d) => { addNotification({ type: 'deposit', text: `Withdrawal sent: ${d.txHash.slice(0,12)}...` }); });
    onEvent('withdrawal:confirmed', (d) => { addNotification({ type: 'win', text: `Withdrawal confirmed: ${d.amount} (${d.chain})` }); fetchProfile(); });
    onEvent('withdrawal:failed', (d) => { addNotification({ type: 'error', text: `Withdrawal failed: ${d.reason}` }); fetchProfile(); });
    onEvent('swap:completed', (d) => { addNotification({ type: 'win', text: `Swap: ${d.fromAmount} ${d.fromToken} → ${d.toAmount.toFixed(6)} ${d.toToken}` }); });
  };
  watch(() => authenticated.value, (auth) => {
    if (auth) {
      setupSocket();
      if (route.path === '/connect') router.replace('/');
    } else {
      socketDone = false;
      disconnectSocket();
    }
  }, { immediate: true });
  </script>
  <style scoped>
  .app{width:100%;max-width:420px;margin:0 auto;min-height:100vh;min-height:100dvh;background:linear-gradient(180deg,#0c1a30,#081222);display:flex;flex-direction:column;padding-bottom:72px;overflow-x:hidden;position:relative}
  .init-screen{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
  .init-spinner{width:40px;height:40px;border:3px solid rgba(61,240,106,0.2);border-top-color:#3df06a;border-radius:50%;animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .init-text{color:#6b82a0;font-size:13px;font-weight:600}
  .header{display:flex;justify-content:space-between;align-items:center;padding:14px 16px 0;position:sticky;top:0;z-index:10;background:linear-gradient(180deg,#0c1a30,#0c1a30f0,transparent);padding-bottom:8px}
  .logo{display:flex;align-items:center;gap:8px;cursor:pointer}
  .logo-icon{width:36px;height:36px;border-radius:10px;background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff);display:flex;align-items:center;justify-content:center;padding:2px}
  .logo-icon-in{width:100%;height:100%;border-radius:8px;background:#0c1a30;display:flex;align-items:center;justify-content:center;font-size:18px}
  .logo-text{font-size:16px;font-weight:900;letter-spacing:-0.5px}
  .logo-text span{background:linear-gradient(90deg,#3df06a,#20f0ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
  .hdr-right{display:flex;gap:6px;align-items:center}
  .hdr-bal{background:rgba(61,240,106,0.08);border:1px solid rgba(61,240,106,0.2);border-radius:12px;padding:6px 12px;font-size:12px;font-weight:800;color:#3df06a;cursor:pointer}
  .hdr-btn{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.07);border:none;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative}
  .notif-dot{width:7px;height:7px;border-radius:50%;background:#ff4040;position:absolute;top:4px;right:4px}
  .status-dot{width:10px;height:10px;border-radius:50%}
  .status-dot.on{background:#3df06a;box-shadow:0 0 6px #3df06a}
  .status-dot.off{background:#ff4040}
  .main-content{flex:1}
  .error-bar{background:rgba(255,64,64,0.1);border:1px solid rgba(255,64,64,0.2);color:#ff6b6b;padding:10px 16px;margin:8px 16px 0;border-radius:10px;font-size:11px;font-weight:600}
  .toast-container{position:fixed;top:16px;right:16px;z-index:100;display:flex;flex-direction:column;gap:8px;max-width:320px}
  .toast{padding:12px 16px;border-radius:10px;cursor:pointer;animation:slideIn .3s ease;font-size:12px;font-weight:600}
  .toast.deposit{background:rgba(6,95,70,0.95);color:#6ee7b7}
  .toast.win{background:rgba(66,32,6,0.95);color:#fbbf24}
  .toast.error{background:rgba(59,17,32,0.95);color:#f87171}
  @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
  .bnav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:420px;background:linear-gradient(180deg,#0c1a30f5,#081222);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);padding:6px 12px calc(env(safe-area-inset-bottom,0px) + 10px);display:flex;justify-content:space-around;border-top:1px solid rgba(255,255,255,0.06);z-index:20}
  .nv{display:flex;flex-direction:column;align-items:center;gap:1px;cursor:pointer;text-decoration:none;color:#4a6080;transition:color .2s;padding:4px 8px;background:none;border:none;font-family:'Poppins',sans-serif}
  .nv.on{color:#3df06a}
  .nv .ni{font-size:20px}
  .nv .nl{font-size:8px;font-weight:700}
  </style>