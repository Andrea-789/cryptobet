<template>
  <div class="page-container">
  <div class="exchange">
    <div class="top-tabs">
      <router-link to="/trading" class="top-tab">📊 Trading</router-link>
      <router-link to="/exchange" class="top-tab active">🔄 Swap</router-link>
    </div>
    <div v-if="result" :class="['result-box', result.success ? 'success' : 'fail']">
      <p v-if="result.success">✅ {{ result.fromAmount }} {{ result.fromToken }} → {{ result.toAmount.toFixed(6) }} {{ result.toToken }}</p>
      <p v-else>❌ {{ result.error }}</p>
    </div>
    <div class="chain-row">
      <label>Chain</label>
      <select v-model="chain" class="input chain-select">
        <option v-for="c in availableChains" :key="c.key" :value="c.key">{{ c.label }}</option>
      </select>
    </div>
    <div class="swap-card sell-card">
      <div class="swap-header">
        <label>Sell</label>
        <span class="balance-hint" @click="setMax">Balance: {{ getBalance(fromToken).toFixed(4) }} <span class="max-tag">MAX</span></span>
      </div>
      <div class="swap-row">
        <input v-model.number="amount" type="number" step="0.01" min="0.01" class="input full" />
        <select v-model="fromToken" class="input token-select">
          <option v-for="t in chainTokens()" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
    </div>
    <div class="swap-arrow">
      <button @click="swapTokens" class="btn-icon">↕</button>
    </div>
    <div class="swap-card buy-card">
      <div class="swap-header">
        <label>Receive</label>
        <span class="balance-hint">Balance: {{ getBalance(toToken).toFixed(4) }}</span>
      </div>
      <div class="swap-row">
        <input :value="quote ? quote.toAmount.toFixed(6) : '—'" disabled class="input full disabled" />
        <select v-model="toToken" class="input token-select">
          <option v-for="t in chainTokens()" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
    </div>
    <div v-if="quoteLoading" class="loading">⏳ Calculating quote...</div>
    <div v-if="quote" class="quote-info">
      <div class="quote-row"><span>Rate</span><span class="quote-val">1 {{ fromToken }} = {{ quote.rate.toFixed(6) }} {{ toToken }}</span></div>
      <div class="quote-row"><span>Platform fee</span><span class="quote-val fee-val">{{ quote.feePct }}%</span></div>
      <div class="quote-row"><span>Price impact</span><span class="quote-val">~{{ quote.priceImpact }}%</span></div>
      <div class="quote-row"><span>Source</span><span class="source-tag">{{ quote.source }}</span></div>
    </div>
    <button @click="executeSwap" :disabled="swapping || !quote || amount <= 0" class="btn-swap">
      {{ swapping ? '⏳ Swapping...' : `Swap ${fromToken} → ${toToken}` }}
    </button>
  </div>
  </div>
</template>
<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import api from '../services/api.js';
const emit = defineEmits(['balanceUpdate']);
const props = defineProps({ balances: Array });
const chain = ref('polygon-amoy');
const fromToken = ref('NATIVE');
const toToken = ref('USDC');
const amount = ref(1);
const tokens = ref({});
const quote = ref(null);
const quoteLoading = ref(false);
const swapping = ref(false);
const result = ref(null);
const quoteTimer = ref(null);
const CHAIN_LABELS = {
  'polygon-amoy':'Polygon Amoy','base-sepolia':'Base Sepolia','arbitrum-sepolia':'Arbitrum Sepolia',
  'sepolia':'Sepolia ETH','bsc-testnet':'BSC Testnet','avalanche-fuji':'Avalanche Fuji',
  'optimism-sepolia':'Optimism Sepolia','fantom-testnet':'Fantom Testnet',
  'scroll-sepolia':'Scroll Sepolia','mantle-sepolia':'Mantle Sepolia',
};
const availableChains = computed(() => Object.keys(tokens.value).map(k => ({ key: k, label: CHAIN_LABELS[k] || k })));
onMounted(async () => { try { const data = await api.getExchangeTokens(); tokens.value = data.tokens; } catch {} });
const chainTokens = () => tokens.value[chain.value] || [];
const getBalance = (tkn) => { const b = props.balances?.find(b => b.chain === chain.value && b.token === tkn); return b ? parseFloat(b.amount) : 0; };
const setMax = () => { amount.value = getBalance(fromToken.value); };
const swapTokens = () => { const tmp = fromToken.value; fromToken.value = toToken.value; toToken.value = tmp; quote.value = null; };
const fetchQuote = async () => {
  if (!amount.value || amount.value <= 0 || fromToken.value === toToken.value) { quote.value = null; return; }
  quoteLoading.value = true;
  try { quote.value = await api.getQuote(fromToken.value, toToken.value, parseFloat(amount.value), chain.value); }
  catch { quote.value = null; }
  finally { quoteLoading.value = false; }
};
watch([fromToken, toToken, amount, chain], () => { clearTimeout(quoteTimer.value); quoteTimer.value = setTimeout(fetchQuote, 400); });
watch(chain, () => { const ct = chainTokens(); if (ct.length) { fromToken.value = ct[0]; toToken.value = ct.length > 1 ? ct[1] : ct[0]; } quote.value = null; });
const executeSwap = async () => {
  if (swapping.value || !quote.value) return;
  swapping.value = true; result.value = null;
  try { const data = await api.executeSwap(fromToken.value, toToken.value, parseFloat(amount.value), chain.value); result.value = { success: true, ...data }; emit('balanceUpdate'); quote.value = null; }
  catch (err) { result.value = { success: false, error: err.message }; }
  finally { swapping.value = false; }
};
</script>
<style scoped>
.page-container{max-width:480px;margin:0 auto;padding:16px}
.exchange{display:flex;flex-direction:column;gap:12px}
.top-tabs{display:flex;gap:0;margin-bottom:4px}
.top-tab{flex:1;text-align:center;padding:10px;font-size:.85rem;font-weight:700;text-decoration:none;color:#64748b;background:#111827;border:1px solid #1e293b;transition:all .2s}
.top-tab:first-child{border-radius:10px 0 0 10px}
.top-tab:last-child{border-radius:0 10px 10px 0}
.top-tab.active,.top-tab.router-link-active{color:#e2e8f0;background:#6366f1;border-color:#6366f1}
.chain-row{display:flex;align-items:center;gap:10px}
.chain-row label{font-size:.8rem;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;white-space:nowrap}
.chain-select{flex:1}
.swap-card{border-radius:12px;padding:16px;border:1px solid}
.sell-card{background:linear-gradient(135deg,#1a0a2e,#111827);border-color:#7c3aed55}
.buy-card{background:linear-gradient(135deg,#0a1e2e,#111827);border-color:#0ea5e955}
.swap-header{display:flex;justify-content:space-between;margin-bottom:10px;align-items:center}
.swap-header label{font-size:.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:700}
.balance-hint{font-size:.78rem;color:#6366f1;cursor:pointer;display:flex;align-items:center;gap:4px}
.max-tag{background:#6366f155;color:#a5b4fc;font-size:.65rem;padding:1px 5px;border-radius:4px;font-weight:700}
.swap-row{display:flex;gap:8px}
.token-select{width:110px;text-align:center;font-weight:700;font-size:.95rem}
.swap-arrow{display:flex;justify-content:center}
.btn-icon{background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;color:#fff;width:38px;height:38px;border-radius:50%;cursor:pointer;font-size:1.2rem;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px #6366f155;transition:all .2s}
.btn-icon:hover{transform:scale(1.1);box-shadow:0 0 20px #6366f188}
.quote-info{background:#0d1424;border:1px solid #1e3a5f;border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px}
.quote-row{display:flex;justify-content:space-between;font-size:.85rem;color:#64748b}
.quote-val{color:#e2e8f0;font-weight:600}
.fee-val{color:#f59e0b}
.source-tag{background:#1e3a5f;color:#38bdf8;padding:2px 10px;border-radius:4px;font-size:.75rem;font-weight:700}
.loading{text-align:center;color:#64748b;font-size:.85rem;padding:4px}
.result-box{padding:12px;border-radius:8px;font-size:.85rem}
.result-box p{margin:0}
.result-box.success{background:#052e16;color:#6ee7b7;border:1px solid #166534}
.result-box.fail{background:#3b1120;color:#f87171;border:1px solid #9f1239}
.input{padding:10px;background:#0a0e17;border:1px solid #1e293b;border-radius:8px;color:#e2e8f0;font-size:1rem;box-sizing:border-box}
.input:focus{outline:none;border-color:#6366f1}
.input.full{flex:1}
.input.disabled{color:#64748b}
select.input{cursor:pointer}
.btn-swap{width:100%;padding:14px;font-size:1rem;font-weight:700;border:none;border-radius:10px;cursor:pointer;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 0 16px #6366f144;transition:all .2s;text-transform:uppercase;letter-spacing:1px}
.btn-swap:hover:not(:disabled){background:linear-gradient(135deg,#4f46e5,#7c3aed);box-shadow:0 0 24px #6366f166;transform:translateY(-1px)}
.btn-swap:disabled{opacity:.5;cursor:not-allowed;transform:none}
</style>