<template>
  <div class="dw">
  <div class="bg-glow bg1"></div>
  <div class="bg-glow bg2"></div>
  <div class="topbar">
  <button class="back" @click="$router.back()">‹</button>
  <span class="top-title">Wallet</span>
  <button class="back" style="font-size:14px">📜</button>
  </div>
  <div class="main-tabs">
  <button :class="['mt','mt-dep',mode==='dep'?'on':'']" @click="mode='dep'">🔥 Deposit</button>
  <button :class="['mt','mt-wth',mode==='wth'?'on':'']" @click="mode='wth'">📤 Withdraw</button>
  </div>
  <!-- ══════ DEPOSIT ══════ -->
  <div v-if="mode==='dep'" class="view">
  <div style="margin-top:12px">
  <div class="gframe"><div class="gf-in"><div class="gf-in2"><div class="gf-body">
  <div class="bal-card">
  <div class="bal-lbl">Available Balance</div>
  <div class="bal-val">{{ totalBalanceUsd }}</div>
  <div class="bal-btc">{{ balances?.length||0 }} token(s) across chains</div>
  </div>
  </div></div></div></div>
  </div>
  <div class="sec">
  <div class="sec-title">Select Chain</div>
  <div class="coin-grid">
  <div v-for="c in chains" :key="c.key" :class="['coin-opt',selChain===c.key?'on':'']" @click="selectChainAndSwitch(c)">
  <div class="co-ico">{{ c.ico }}</div>
  <div class="co-name">{{ c.label }}</div>
  <div class="co-chain">{{ c.symbol }}</div>
  </div>
  </div>
  </div>
  <div class="sec">
  <div class="sec-title">Deposit Address</div>
  <div v-if="loadingAddr" style="text-align:center;padding:20px"><div class="spinner"></div></div>
  <div v-else-if="hotWalletAddr" class="gframe"><div class="gf-in"><div class="gf-in2"><div class="gf-body" style="text-align:center">
  <div class="qr-wrap"><div class="qr-box"><canvas ref="qrCanvas" width="150" height="150" style="width:150px;height:150px"></canvas><div class="qr-logo">{{ selectedChainData?.ico||'💰' }}</div></div></div>
  <div style="margin-top:14px">
  <div class="addr-lbl">Deposit Address ({{ selChain }})</div>
  <div class="addr-val">{{ hotWalletAddr }}</div>
  <button class="addr-copy" @click="copyAddr">📋 Copy Address</button>
  <div class="send-row">
  <input class="inp-send" v-model.number="sendAmt" placeholder="Amount" type="number" step="0.0001" min="0">
  <span class="inp-send-sym">{{ selectedChainData?.symbol }}</span>
  </div>
  <button class="addr-send" @click="sendViaMetaMask" :disabled="sendLoading || !sendAmt">
  {{ sendLoading ? 'Opening MetaMask...' : '🦊 Send via MetaMask' }}
  </button>
  <p v-if="sendError" class="err" style="margin-top:6px">{{ sendError }}</p>
  </div>
  </div></div></div></div>
  <div class="warn warn-y" style="margin-top:10px">
  <span class="warn-ico">⚠️</span>
  <span>Send tokens <strong>only on the correct chain</strong> to this address. Wrong chain = permanent loss.</span>
  </div>
  <div class="warn warn-b">
  <span class="warn-ico">⏱</span>
  <span>Deposits are detected automatically via webhook. Your balance will update in real-time.</span>
  </div>
  </div>
  <div class="sec">
  <div class="sec-title">Your Balances</div>
  <div v-if="!balances||balances.length===0" style="color:#6b82a0;font-size:12px;padding:10px 0">No funds yet — make a deposit to start</div>
  <div v-else class="hist-list">
  <div v-for="b in balances" :key="b.chain+b.token" class="hist-row">
  <div class="hr-ico hr-dep">{{ tokenIco(b.token) }}</div>
  <div class="hr-info"><div class="hr-title">{{ b.token }}</div><div class="hr-meta">{{ b.chain }}</div></div>
  <div class="hr-right"><div class="hr-amt" style="color:#3df06a">{{ parseFloat(b.amount).toLocaleString(undefined,{minimumFractionDigits:4}) }}</div></div>
  </div>
  </div>
  </div>
  </div>
  <!-- ══════ WITHDRAW ══════ -->
  <div v-if="mode==='wth'" class="view">
  <div style="margin-top:12px">
  <div class="gframe"><div class="gf-in"><div class="gf-in2"><div class="gf-body">
  <div class="bal-card">
  <div class="bal-lbl">Available to Withdraw</div>
  <div class="bal-val">{{ selectedBal.toFixed(4) }} {{ selToken }}</div>
  <div class="bal-btc">on {{ selWthChain }}</div>
  </div>
  </div></div></div></div>
  </div>
  <div class="sec">
  <div class="sec-title">Select Token</div>
  <div v-if="!balances||balances.length===0" style="color:#6b82a0;font-size:12px">No balance available</div>
  <div v-else class="coin-grid">
  <div v-for="b in posBalances" :key="b.chain+b.token" :class="['coin-opt',selToken===b.token&&selWthChain===b.chain?'on':'']" @click="selToken=b.token;selWthChain=b.chain">
  <div class="co-ico">{{ tokenIco(b.token) }}</div>
  <div class="co-name">{{ b.token }}</div>
  <div class="co-chain">{{ b.chain }} · {{ parseFloat(b.amount).toFixed(4) }}</div>
  </div>
  </div>
  </div>
  <div class="sec">
  <div class="sec-title">Amount</div>
  <div class="inp-wrap">
  <input class="inp" v-model.number="wthAmt" placeholder="0.00" type="number" step="0.0001" min="0">
  <span class="inp-suf">{{ selToken }}</span>
  <button class="inp-max" @click="wthAmt=selectedBal">MAX</button>
  </div>
  <div class="presets">
  <div class="preset" v-for="p in [0.25,0.5,0.75,1]" :key="p" @click="wthAmt=+(selectedBal*p).toFixed(6)">{{ p===1?'MAX':(p*100)+'%' }}</div>
  </div>
  </div>
  <div class="sec">
  <div class="sec-title">Destination Address</div>
  <div class="inp-wrap">
  <input class="inp" v-model="wthAddr" placeholder="Enter wallet address" style="font-size:13px;font-weight:600">
  <span style="font-size:14px;cursor:pointer" @click="pasteAddr">📋</span>
  </div>
  </div>
  <div v-if="wthAmt>0&&wthAddr" class="sec">
  <div class="sec-title">Summary</div>
  <div class="gframe"><div class="gf-in"><div class="gf-in2"><div class="gf-body">
  <div class="summary">
  <div class="sum-row"><span class="l">Amount</span><span class="v">{{ wthAmt }} {{ selToken }}</span></div>
  <div class="sum-row"><span class="l">Chain</span><span class="v" style="color:#20f0ff">{{ selWthChain }}</span></div>
  <div class="sum-row"><span class="l">To</span><span class="v" style="font-size:10px;color:#20f0ff">{{ wthAddr.slice(0,12) }}...{{ wthAddr.slice(-6) }}</span></div>
  </div>
  </div></div></div></div>
  </div>
  <div class="warn warn-y">
  <span class="warn-ico">⚠️</span>
  <span>Double-check the destination address and chain. Withdrawals cannot be reversed.</span>
  </div>
  <button class="btn-main btn-red" @click="showConfirm=true" :disabled="!wthAmt||wthAmt<=0||!wthAddr||wthLoading">Withdraw</button>
  <p v-if="wthError" class="err">{{ wthError }}</p>
  <div class="sec" style="margin-top:14px">
  <div class="sec-title">Recent Withdrawals</div>
  <div v-if="loadingWthHist" style="text-align:center;padding:12px"><div class="spinner"></div></div>
  <div v-else-if="wthHist.length===0" style="color:#6b82a0;font-size:12px;padding:10px 0">No withdrawals yet</div>
  <div v-else class="hist-list">
  <div v-for="h in wthHist" :key="h.id" class="hist-row">
  <div class="hr-ico hr-wth">📤</div>
  <div class="hr-info"><div class="hr-title">{{ h.token }} · {{ h.chain }}</div><div class="hr-meta">{{ timeAgo(h.created_at) }} · {{ h.tx_hash?h.tx_hash.slice(0,10)+'...':'—' }}</div></div>
  <div class="hr-right"><div class="hr-amt" style="color:#ff5050">-{{ parseFloat(h.amount).toFixed(4) }}</div><div :class="['hr-status',statusCls(h.status)]">{{ statusLabel(h.status) }}</div></div>
  </div>
  </div>
  </div>
  </div>
  <!-- CONFIRM OVERLAY -->
  <div :class="['overlay',showConfirm?'on':'']" @click.self="showConfirm=false">
  <div class="ov-card">
  <div class="ov-header ov-header-wth">
  <div class="ov-ico">📤</div>
  <div class="ov-title">Confirm Withdrawal</div>
  <div class="ov-amt" style="color:#ff5050">-{{ wthAmt }} {{ selToken }}</div>
  <div style="font-size:11px;color:#6b82a0;margin-top:2px">on {{ selWthChain }}</div>
  </div>
  <div class="ov-body">
  <div class="ov-row"><span class="l">To</span><span class="v" style="color:#20f0ff;font-size:10px">{{ wthAddr?.slice(0,14) }}...{{ wthAddr?.slice(-6) }}</span></div>
  <div class="ov-row"><span class="l">Chain</span><span class="v">{{ selWthChain }}</span></div>
  <div class="ov-row"><span class="l">Amount</span><span class="v" style="color:#ff5050">{{ wthAmt }} {{ selToken }}</span></div>
  </div>
  <div class="warn warn-r" style="margin:0 20px 14px">
  <span class="warn-ico">🔒</span>
  <span>This action is irreversible. Please verify all details.</span>
  </div>
  <div class="ov-btns">
  <button class="ov-btn ov-cancel" @click="showConfirm=false">Cancel</button>
  <button class="ov-btn ov-confirm-wth" :disabled="wthLoading" @click="processWithdraw">{{ wthLoading?'Processing...':'Confirm' }}</button>
  </div>
  </div>
  </div>
  <!-- SUCCESS OVERLAY -->
  <div :class="['overlay',showSuccess?'on':'']">
  <div class="suc-view">
  <div class="suc-check">✔</div>
  <div style="font-size:20px;font-weight:900;margin-top:8px">Withdrawal Submitted!</div>
  <div style="font-size:13px;color:#6b82a0">Your withdrawal is being processed</div>
  <div style="margin-top:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;width:100%">
  <div style="font-size:10px;color:#6b82a0;font-weight:600">Status</div>
  <div style="font-size:13px;font-weight:700;color:#ffa830;margin-top:4px">Pending — processing on chain</div>
  </div>
  <button class="ov-btn ov-cancel" style="width:100%;margin-top:14px" @click="showSuccess=false">Done</button>
  </div>
  </div>
  <div :class="['toast-msg',toastShow?'show':'']">{{ toastText }}</div>
  </div>
  </template>
  <script setup>
  import { ref, computed, watch, nextTick, onMounted } from 'vue';
  import api from '../services/api.js';
  import { useWallet } from '../composables/useWallet.js';
  const props = defineProps({ balances: Array, wallet: [Object,String], user: Object });
  const emit = defineEmits(['balanceUpdate']);
  const { switchChain } = useWallet();
  const mode = ref('dep');
  const selChain = ref('polygon-amoy');
  const toastText = ref('');
  const toastShow = ref(false);
  const qrCanvas = ref(null);
  const hotWalletAddr = ref('');
  const loadingAddr = ref(false);
  const supportedChains = ref([]);
  const selToken = ref('');
  const selWthChain = ref('');
  const wthAmt = ref(null);
  const wthAddr = ref('');
  const wthLoading = ref(false);
  const wthError = ref(null);
  const showConfirm = ref(false);
  const showSuccess = ref(false);
  const wthHist = ref([]);
  const loadingWthHist = ref(false);
  const sendAmt = ref(null);
  const sendLoading = ref(false);
  const sendError = ref(null);
  const chains = [
    { key:'polygon-amoy', label:'Polygon Amoy', ico:'🟣', symbol:'POL', chainId:80002 },
    { key:'base-sepolia', label:'Base Sepolia', ico:'🔵', symbol:'ETH', chainId:84532 },
    { key:'arbitrum-sepolia', label:'Arbitrum Sepolia', ico:'🔷', symbol:'ETH', chainId:421614 },
    { key:'sepolia', label:'Sepolia ETH', ico:'⟠', symbol:'ETH', chainId:11155111 },
    { key:'bsc-testnet', label:'BSC Testnet', ico:'🟡', symbol:'tBNB', chainId:97 },
    { key:'avalanche-fuji', label:'Avalanche Fuji', ico:'🔺', symbol:'AVAX', chainId:43113 },
    { key:'optimism-sepolia', label:'Optimism Sepolia', ico:'🔴', symbol:'ETH', chainId:11155420 },
    { key:'fantom-testnet', label:'Fantom Testnet', ico:'👻', symbol:'FTM', chainId:4002 },
    { key:'scroll-sepolia', label:'Scroll Sepolia', ico:'📜', symbol:'ETH', chainId:534351 },
    { key:'mantle-sepolia', label:'Mantle Sepolia', ico:'🟤', symbol:'MNT', chainId:5003 },
  ];
  const rpcMap = {'polygon-amoy':'https://rpc-amoy.polygon.technology','base-sepolia':'https://sepolia.base.org','arbitrum-sepolia':'https://sepolia-rollup.arbitrum.io/rpc','sepolia':'https://rpc.sepolia.org','bsc-testnet':'https://data-seed-prebsc-1-s1.binance.org:8545','avalanche-fuji':'https://api.avax-test.network/ext/bc/C/rpc','optimism-sepolia':'https://sepolia.optimism.io','fantom-testnet':'https://rpc.testnet.fantom.network','scroll-sepolia':'https://sepolia-rpc.scroll.io','mantle-sepolia':'https://rpc.sepolia.mantle.xyz'};
  const explorerMap = {'polygon-amoy':'https://amoy.polygonscan.com','base-sepolia':'https://sepolia.basescan.org','arbitrum-sepolia':'https://sepolia.arbiscan.io','sepolia':'https://sepolia.etherscan.io','bsc-testnet':'https://testnet.bscscan.com','avalanche-fuji':'https://testnet.snowtrace.io','optimism-sepolia':'https://sepolia-optimism.etherscan.io','fantom-testnet':'https://testnet.ftmscan.com','scroll-sepolia':'https://sepolia.scrollscan.com','mantle-sepolia':'https://sepolia.mantlescan.xyz'};
  const selectedChainData = computed(() => chains.find(c => c.key === selChain.value));
  const posBalances = computed(() => (props.balances || []).filter(b => parseFloat(b.amount) > 0));
  const selectedBal = computed(() => {
    const b = (props.balances || []).find(b => b.token === selToken.value && b.chain === selWthChain.value);
    return b ? parseFloat(b.amount) : 0;
  });
  const totalBalanceUsd = computed(() => {
    if (!props.balances?.length) return '$0.00';
    const sum = props.balances.reduce((s, b) => s + parseFloat(b.amount || 0), 0);
    return sum < 0.0001 ? '$0.00' : `$${sum.toFixed(2)}`;
  });
  function tokenIco(t) {
    const map = { NATIVE:'⟠',MATIC:'🟣',POL:'🟣',ETH:'⟠',USDC:'$',USDT:'₮',BTC:'₿',tBNB:'🟡',BNB:'🟡',AVAX:'🔺',FTM:'👻',MNT:'🟤' };
    return map[t?.toUpperCase()] || '●';
  }
  function timeAgo(d) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return 'Just now'; if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
  function statusCls(s) { return s==='confirmed'?'hs-done':s==='pending'||s==='processing'?'hs-pend':'hs-fail'; }
  function statusLabel(s) { return s==='confirmed'?'Completed':s==='pending'?'Pending':s==='processing'?'Processing':'Failed'; }
  function toast(m) { toastText.value=m; toastShow.value=true; setTimeout(()=>toastShow.value=false,2200); }
  async function selectChainAndSwitch(c) {
    selChain.value = c.key;
    try { await switchChain(c.chainId); }
    catch (e) { toast(`Switch to ${c.label} — check wallet`); }
  }
  async function fetchDepositAddr() {
    loadingAddr.value = true;
    try { const d = await api.getDepositAddress(); hotWalletAddr.value=d.address||''; supportedChains.value=d.chains||[]; }
    catch (e) { console.error(e); }
    loadingAddr.value = false;
  }
  async function fetchWthHistory() {
    loadingWthHist.value = true;
    try { const d = await api.getWithdrawalHistory(); wthHist.value=d.withdrawals||[]; }
    catch (e) { console.error(e); }
    loadingWthHist.value = false;
  }
  async function processWithdraw() {
    wthError.value = null;
    wthLoading.value = true;
    try {
      await api.requestWithdrawal(wthAmt.value, selToken.value, selWthChain.value, wthAddr.value);
      showConfirm.value = false;
      showSuccess.value = true;
      emit('balanceUpdate');
      wthAmt.value = null;
      wthAddr.value = '';
      fetchWthHistory();
    } catch (e) { wthError.value=e.message; showConfirm.value=false; }
    wthLoading.value = false;
  }
  async function sendViaMetaMask() {
    if (!sendAmt.value || sendAmt.value <= 0) return;
    if (!hotWalletAddr.value) return;
    if (!window.ethereum) { sendError.value='MetaMask not found'; return; }
    sendLoading.value = true;
    sendError.value = null;
    try {
      const chain = chains.find(c => c.key === selChain.value);
      if (chain) {
        const hexId = '0x' + chain.chainId.toString(16);
        try {
          await window.ethereum.request({ method:'wallet_switchEthereumChain', params:[{ chainId:hexId }] });
        } catch (e) {
          if (e.code === 4902) {
            await window.ethereum.request({ method:'wallet_addEthereumChain', params:[{ chainId:hexId, chainName:chain.label, nativeCurrency:{ name:chain.symbol, symbol:chain.symbol, decimals:18 }, rpcUrls:[rpcMap[chain.key]], blockExplorerUrls:[explorerMap[chain.key]] }] });
          } else throw e;
        }
      }
      const amtWei = BigInt(Math.floor(sendAmt.value * 1e18));
      const hexAmt = '0x' + amtWei.toString(16);
      const accounts = await window.ethereum.request({ method:'eth_accounts' });
      if (!accounts.length) throw new Error('No account connected on MetaMask');
      const txHash = await window.ethereum.request({ method:'eth_sendTransaction', params:[{ from:accounts[0], to:hotWalletAddr.value, value:hexAmt, gas:'0x5208' }] });
      toast(`Tx sent! ${txHash.slice(0,14)}...`);
      sendAmt.value = null;
    } catch (e) {
      sendError.value = e.code===4001 ? 'Transaction rejected.' : e.message;
    }
    sendLoading.value = false;
  }
  function copyAddr() { navigator.clipboard.writeText(hotWalletAddr.value).catch(()=>{}); toast('Address copied!'); }
  async function pasteAddr() { try { wthAddr.value=await navigator.clipboard.readText(); toast('Pasted'); } catch { toast('Paste not available'); } }
  function drawQR() {
    if (!qrCanvas.value) return;
    const cv=qrCanvas.value, ctx=cv.getContext('2d');
    ctx.clearRect(0,0,150,150);
    const s=5; ctx.fillStyle='#000';
    for (let y=0;y<30;y++) for (let x=0;x<30;x++) {
      if (Math.random()>0.45||(x<7&&y<7)||(x>22&&y<7)||(x<7&&y>22)) ctx.fillRect(x*s,y*s,s,s);
    }
    ctx.fillStyle='#000'; ctx.fillRect(0,0,35,35); ctx.fillRect(115,0,35,35); ctx.fillRect(0,115,35,35);
    ctx.fillStyle='#fff'; ctx.fillRect(5,5,25,25); ctx.fillRect(120,5,25,25); ctx.fillRect(5,120,25,25);
    ctx.fillStyle='#000'; ctx.fillRect(10,10,15,15); ctx.fillRect(125,10,15,15); ctx.fillRect(10,125,15,15);
    ctx.clearRect(60,60,30,30);
  }
  watch(()=>props.balances, (bals)=>{
    if (bals?.length && !selToken.value) {
      const first=bals.find(b=>parseFloat(b.amount)>0)||bals[0];
      if (first) { selToken.value=first.token; selWthChain.value=first.chain; }
    }
  }, { immediate:true });
  watch(mode, m=>{ if (m==='wth') fetchWthHistory(); });
  watch(selChain, ()=>nextTick(drawQR));
  onMounted(async ()=>{ await fetchDepositAddr(); nextTick(drawQR); });
  </script>
  <style scoped>
  .dw{display:flex;flex-direction:column;padding-bottom:24px;position:relative;overflow-x:hidden}
  .bg-glow{position:absolute;border-radius:50%;filter:blur(80px);opacity:.12;pointer-events:none;z-index:0}
  .bg1{width:250px;height:250px;background:#3df06a;top:-80px;right:-60px}
  .bg2{width:200px;height:200px;background:#8050ff;bottom:200px;left:-80px}
  .topbar{display:flex;align-items:center;gap:10px;padding:14px 16px 0;position:relative;z-index:1}
  .back{width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,.07);border:none;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .top-title{font-size:16px;font-weight:800;flex:1}
  .main-tabs{display:flex;gap:4px;padding:12px 16px 0;position:relative;z-index:1}
  .mt{flex:1;padding:12px;border-radius:14px;border:none;font-size:14px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .2s;text-align:center}
  .mt-dep{background:rgba(61,240,106,.08);color:#3df06a;border:2px solid rgba(61,240,106,.15)}
  .mt-dep.on{background:linear-gradient(180deg,#3df06a,#22b845);color:#fff;box-shadow:0 4px 20px rgba(52,220,89,.35);border-color:transparent}
  .mt-wth{background:rgba(255,64,64,.08);color:#ff6060;border:2px solid rgba(255,64,64,.15)}
  .mt-wth.on{background:linear-gradient(180deg,#ff5050,#d01515);color:#fff;box-shadow:0 4px 20px rgba(255,40,40,.3);border-color:transparent}
  .view{display:flex;flex-direction:column;padding:0 16px;position:relative;z-index:1}
  .gframe{width:100%;padding:2px;border-radius:16px;background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff)}
  .gf-in{background:#0c1a30;border-radius:15px;padding:2px}
  .gf-in2{padding:2px;border-radius:13px;background:conic-gradient(#ff30ff33,#ffde5933,#30ff7033,#20f0ff33,#8050ff33,#ff30ff33)}
  .gf-body{background:linear-gradient(180deg,#0e1f38,#0a1628);border-radius:12px;padding:16px}
  .bal-card{text-align:center;padding:6px 0}
  .bal-lbl{font-size:10px;color:#6b82a0;font-weight:600;text-transform:uppercase;letter-spacing:1px}
  .bal-val{font-size:28px;font-weight:900;color:#3df06a;margin-top:2px}
  .bal-btc{font-size:12px;color:#6b82a0;font-weight:600}
  .sec{margin-top:14px}
  .sec-title{font-size:11px;color:#6b82a0;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
  .coin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
  .coin-opt{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 6px;border-radius:14px;border:2px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);cursor:pointer;transition:all .2s}
  .coin-opt:hover{background:rgba(255,255,255,.06)}
  .coin-opt.on{border-color:#3df06a;background:rgba(61,240,106,.06);box-shadow:0 0 16px rgba(61,240,106,.1)}
  .co-ico{font-size:24px}.co-name{font-size:11px;font-weight:800}.co-chain{font-size:8px;color:#6b82a0;font-weight:600}
  .inp-wrap{display:flex;align-items:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:0 14px;transition:border-color .2s}
  .inp-wrap:focus-within{border-color:rgba(61,240,106,.4)}
  .inp{background:none;border:none;color:#fff;font-size:18px;font-weight:800;font-family:'Poppins',sans-serif;padding:14px 0;flex:1;outline:none;width:0}
  .inp::placeholder{color:#2a4060;font-weight:600}
  .inp-suf{color:#6b82a0;font-size:12px;font-weight:700}
  .inp-max{padding:4px 10px;border-radius:8px;border:1px solid #3df06a44;background:rgba(61,240,106,.08);color:#3df06a;font-size:10px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;margin-left:6px}
  .presets{display:flex;gap:6px;margin-top:8px}
  .preset{flex:1;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);text-align:center;font-size:12px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;color:#6b82a0;transition:all .15s}
  .preset:hover{background:rgba(255,255,255,.07);color:#fff}
  .addr-lbl{font-size:10px;color:#6b82a0;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
  .addr-val{font-size:11px;font-weight:700;color:#20f0ff;margin-top:6px;word-break:break-all;line-height:1.5}
  .addr-copy{margin-top:8px;padding:8px 20px;border-radius:10px;border:none;background:rgba(32,240,255,.1);color:#20f0ff;font-size:11px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .15s}
  .addr-copy:hover{background:rgba(32,240,255,.2)}
  .send-row{display:flex;align-items:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:0 12px;margin-top:10px}
  .inp-send{background:none;border:none;color:#fff;font-size:16px;font-weight:800;font-family:'Poppins',sans-serif;padding:12px 0;flex:1;outline:none;width:0}
  .inp-send::placeholder{color:#2a4060}
  .inp-send-sym{color:#6b82a0;font-size:12px;font-weight:700}
  .addr-send{margin-top:8px;width:100%;padding:12px;border-radius:12px;border:none;background:linear-gradient(180deg,#f6851b,#e2761b);color:#fff;font-size:13px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .15s}
  .addr-send:hover{transform:scale(1.02)}
  .addr-send:disabled{opacity:.5;cursor:not-allowed;transform:none}
  .qr-wrap{display:flex;justify-content:center}
  .qr-box{width:180px;height:180px;border-radius:20px;background:#fff;display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 4px 30px rgba(0,0,0,.3)}
  .qr-logo{position:absolute;width:36px;height:36px;border-radius:8px;background:#0c1a30;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.2)}
  .warn{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border-radius:12px;margin-top:10px;font-size:10px;font-weight:600;line-height:1.4}
  .warn-ico{font-size:16px;flex-shrink:0}
  .warn-y{background:rgba(255,168,48,.08);border:1px solid rgba(255,168,48,.2);color:#ffa830}
  .warn-r{background:rgba(255,64,64,.08);border:1px solid rgba(255,64,64,.2);color:#ff6060}
  .warn-b{background:rgba(32,240,255,.08);border:1px solid rgba(32,240,255,.2);color:#20f0ff}
  .summary{display:flex;flex-direction:column;gap:4px}
  .sum-row{display:flex;justify-content:space-between;padding:6px 0;font-size:11px}
  .sum-row .l{color:#6b82a0;font-weight:600}.sum-row .v{font-weight:700}
  .btn-main{width:100%;padding:16px;border-radius:24px;border:none;font-size:16px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .15s;margin-top:14px}
  .btn-main:hover{transform:scale(1.02)}.btn-main:active{transform:scale(.98)}
  .btn-main:disabled{opacity:.4;cursor:not-allowed;transform:none}
  .btn-red{background:linear-gradient(180deg,#ff5050,#d01515);color:#fff;box-shadow:0 4px 24px rgba(255,40,40,.3)}
  .err{color:#ff6b6b;font-size:11px;font-weight:600;text-align:center;background:rgba(255,64,64,.08);padding:8px;border-radius:8px;margin-top:8px}
  .hist-list{display:flex;flex-direction:column;gap:4px}
  .hist-row{display:flex;align-items:center;padding:10px;background:rgba(255,255,255,.02);border-radius:12px;gap:10px}
  .hr-ico{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
  .hr-dep{background:rgba(61,240,106,.1);color:#3df06a}.hr-wth{background:rgba(255,64,64,.1);color:#ff4040}
  .hr-info{flex:1;min-width:0}.hr-title{font-size:11px;font-weight:700}.hr-meta{font-size:9px;color:#6b82a0;font-weight:500}
  .hr-right{text-align:right;flex-shrink:0}.hr-amt{font-size:12px;font-weight:800}
  .hr-status{font-size:9px;font-weight:700;padding:2px 8px;border-radius:6px;display:inline-block;margin-top:2px}
  .hs-done{background:rgba(61,240,106,.12);color:#3df06a}.hs-pend{background:rgba(255,168,48,.12);color:#ffa830}.hs-fail{background:rgba(255,64,64,.12);color:#ff4040}
  .spinner{width:28px;height:28px;border:3px solid rgba(255,255,255,.1);border-top-color:#3df06a;border-radius:50%;animation:spin .6s linear infinite;margin:0 auto}
  @keyframes spin{to{transform:rotate(360deg)}}
  .overlay{position:fixed;inset:0;background:rgba(8,18,34,.96);z-index:50;display:none;flex-direction:column;align-items:center;justify-content:center;padding:30px}
  .overlay.on{display:flex}
  .ov-card{width:100%;max-width:360px;border-radius:20px;overflow:hidden}
  .ov-header{padding:20px;text-align:center}
  .ov-header-wth{background:linear-gradient(180deg,rgba(255,64,64,.15),rgba(255,64,64,.02))}
  .ov-ico{font-size:40px}.ov-title{font-size:18px;font-weight:800;margin-top:6px}.ov-amt{font-size:28px;font-weight:900;margin-top:4px}
  .ov-body{padding:16px 20px;display:flex;flex-direction:column;gap:6px}
  .ov-row{display:flex;justify-content:space-between;font-size:12px}.ov-row .l{color:#6b82a0;font-weight:600}.ov-row .v{font-weight:700}
  .ov-btns{display:flex;gap:8px;padding:0 20px 20px}
  .ov-btn{flex:1;padding:14px;border-radius:20px;border:none;font-size:14px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .15s}
  .ov-btn:hover{transform:scale(1.02)}.ov-btn:disabled{opacity:.5;cursor:not-allowed}
  .ov-cancel{background:rgba(255,255,255,.06);color:#6b82a0}
  .ov-confirm-wth{background:linear-gradient(180deg,#ff5050,#d01515);color:#fff;box-shadow:0 3px 16px rgba(255,40,40,.25)}
  .suc-view{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;width:100%;max-width:360px}
  .suc-check{width:70px;height:70px;border-radius:50%;background:linear-gradient(180deg,#3df06a,#22b845);display:flex;align-items:center;justify-content:center;font-size:32px;animation:popIn .5s cubic-bezier(.2,1,.3,1);box-shadow:0 0 40px rgba(61,240,106,.25)}
  @keyframes popIn{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}}
  .toast-msg{position:fixed;top:20px;left:50%;transform:translateX(-50%) translateY(-100px);padding:10px 22px;border-radius:12px;font-size:12px;font-weight:700;z-index:60;transition:transform .4s cubic-bezier(.2,1,.3,1);background:#0e2a1a;border:2px solid #3df06a;color:#3df06a}
  .toast-msg.show{transform:translateX(-50%) translateY(0)}
  </style>