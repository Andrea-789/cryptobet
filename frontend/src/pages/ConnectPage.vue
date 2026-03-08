<template>
  <div class="connect-screen">
  <div class="bg-glow bg1"></div>
  <div class="bg-glow bg2"></div>
  <div class="bg-glow bg3"></div>
  <div class="bg-glow bg4"></div>
  <div class="content">
  <!-- LOGO -->
  <div class="logo-area">
  <div class="logo-ring"><div class="logo-inner">🎰</div></div>
  <div class="logo-name">Crypto<span>Bet</span></div>
  <div class="logo-sub">The #1 Crypto Casino</div>
  </div>
  <!-- WELCOME -->
  <div class="welcome">
  <h2>Welcome to the Future</h2>
  <p>Connect your wallet to start playing instantly</p>
  </div>
  <!-- FEATURES -->
  <div class="features">
  <div class="feat"><div class="feat-ico">⚡</div><div class="feat-name">Instant Play</div><div class="feat-desc">No signup needed</div></div>
  <div class="feat"><div class="feat-ico">🔒</div><div class="feat-name">Non-Custodial</div><div class="feat-desc">Your keys, your crypto</div></div>
  <div class="feat"><div class="feat-ico">🎲</div><div class="feat-name">Provably Fair</div><div class="feat-desc">Verifiable on-chain</div></div>
  <div class="feat"><div class="feat-ico">💸</div><div class="feat-name">Low Fees</div><div class="feat-desc">Near-zero gas costs</div></div>
  </div>
  <!-- CONNECT BUTTONS -->
  <div class="btn-area">

  <!-- CASE 1: Inside MetaMask's in-app browser → direct connect -->
  <template v-if="isMetaMaskBrowser">
  <button class="btn-main btn-green" @click="connectDirect" :disabled="loading">
  {{ loading ? 'Connecting...' : '🦊 Connect with MetaMask' }}
  </button>
  </template>

  <!-- CASE 2: Mobile Safari/Chrome without wallet → open in MetaMask -->
  <template v-else-if="isMobileNoWallet">
  <a :href="metamaskDeepLink" class="btn-main btn-green btn-link">
  🦊 Open in MetaMask
  </a>
  <button class="btn-main btn-secondary" @click="connect" :disabled="loading">
  {{ loading ? 'Connecting...' : '🔗 Other Wallets (WalletConnect)' }}
  </button>
  </template>

  <!-- CASE 3: Desktop → normal AppKit modal -->
  <template v-else>
  <button class="btn-main btn-green" @click="connect" :disabled="loading">
  {{ loading ? 'Connecting...' : '🔗 Connect Wallet' }}
  </button>
  </template>

  </div>
  <p v-if="error" class="err-msg">{{ error }}</p>
  <!-- SUPPORTED WALLETS -->
  <div class="wallets-info">
  <div class="wallets-label">500+ wallets supported</div>
  <div class="wallet-icons">
  <div class="wi">🦊</div>
  <div class="wi">👻</div>
  <div class="wi">🔵</div>
  <div class="wi">💎</div>
  <div class="wi">🔗</div>
  <div class="wi">🔐</div>
  </div>
  <div class="wallet-names">MetaMask • Phantom • Coinbase • Trust • WalletConnect • Ledger</div>
  <p v-if="isMobileNoWallet" class="mobile-hint">
  For the best experience, tap "Open in MetaMask" to use MetaMask's built-in browser
  </p>
  </div>
  <!-- FOOTER -->
  <div class="auth-footer">
  <div class="auth-footer-links">
  <a href="#">Terms</a><a href="#">Privacy</a><a href="#">Provably Fair</a><a href="#">Support</a>
  </div>
  <div class="auth-footer-copy">© 2025 CryptoBet • 18+</div>
  </div>
  </div>
  </div>
  </template>

  <script setup>
  import { computed } from 'vue';
  import { useWallet } from '../composables/useWallet.js';
  const { connect, connectDirect, loading, error, isMetaMaskBrowser } = useWallet();
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isMobileNoWallet = computed(() => isMobile && !window.ethereum);

  // MetaMask deep link → opens current site inside MetaMask browser
  const metamaskDeepLink = computed(() => {
    const host = window.location.host;
    const path = window.location.pathname;
    return `https://metamask.app.link/dapp/${host}${path}`;
  });
  </script>

  <style scoped>
  .connect-screen{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;position:relative;overflow:hidden}
  .bg-glow{position:absolute;border-radius:50%;filter:blur(80px);opacity:0.2;pointer-events:none;z-index:0}
  .bg1{width:300px;height:300px;background:#8050ff;top:-100px;right:-80px}
  .bg2{width:250px;height:250px;background:#3df06a;bottom:100px;left:-100px}
  .bg3{width:200px;height:200px;background:#ff30ff;bottom:-50px;right:-50px}
  .bg4{width:180px;height:180px;background:#20f0ff;top:40%;left:50%;transform:translateX(-50%)}
  .content{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;padding:0 24px;width:100%;max-width:420px;min-height:100vh;min-height:100dvh}
  .logo-area{display:flex;flex-direction:column;align-items:center;margin-top:60px}
  .logo-ring{width:80px;height:80px;border-radius:50%;padding:3px;background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff);animation:logoSpin 8s linear infinite}
  @keyframes logoSpin{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}
  .logo-inner{width:100%;height:100%;border-radius:50%;background:#0c1a30;display:flex;align-items:center;justify-content:center;font-size:36px}
  .logo-name{font-size:28px;font-weight:900;margin-top:12px;letter-spacing:-1px}
  .logo-name span{background:linear-gradient(90deg,#3df06a,#20f0ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
  .logo-sub{font-size:12px;color:#6b82a0;font-weight:500;margin-top:2px}
  .welcome{text-align:center;margin-top:30px}
  .welcome h2{font-size:22px;font-weight:800}
  .welcome p{font-size:13px;color:#6b82a0;font-weight:500;margin-top:4px}
  .features{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;width:100%;margin-top:20px}
  .feat{padding:12px;border-radius:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);text-align:center}
  .feat-ico{font-size:24px;margin-bottom:4px}
  .feat-name{font-size:11px;font-weight:700}
  .feat-desc{font-size:9px;color:#6b82a0;font-weight:500}
  .btn-area{width:100%;margin-top:24px;display:flex;flex-direction:column;gap:10px}
  .btn-main{width:100%;padding:15px;border-radius:24px;border:none;font-size:16px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .15s;text-align:center;text-decoration:none;display:block}
  .btn-main:active{transform:scale(0.98)}
  .btn-main:disabled{opacity:0.5;cursor:not-allowed;transform:none}
  .btn-green{background:linear-gradient(180deg,#3df06a,#22b845);color:#fff;box-shadow:0 4px 24px rgba(52,220,89,0.4)}
  .btn-link{display:flex;align-items:center;justify-content:center}
  .btn-secondary{background:rgba(255,255,255,0.06);color:#8ba3c0;border:1px solid rgba(255,255,255,0.1);font-size:13px;font-weight:700}
  .err-msg{color:#ff6b6b;font-size:11px;font-weight:600;margin-top:10px;text-align:center}
  .wallets-info{margin-top:24px;text-align:center}
  .wallets-label{font-size:11px;color:#6b82a0;font-weight:600;margin-bottom:8px}
  .wallet-icons{display:flex;gap:8px;justify-content:center;margin-bottom:6px}
  .wi{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:20px}
  .wallet-names{font-size:9px;color:#4a6080;font-weight:500}
  .mobile-hint{font-size:10px;color:#6b82a0;margin-top:10px;line-height:1.4;font-weight:500}
  .auth-footer{margin-top:auto;padding:20px 0;text-align:center;width:100%}
  .auth-footer-links{display:flex;gap:12px;justify-content:center;margin-bottom:6px}
  .auth-footer-links a{color:#4a6080;font-size:10px;font-weight:600;text-decoration:none}
  .auth-footer-copy{font-size:9px;color:#2a4060}
  </style>