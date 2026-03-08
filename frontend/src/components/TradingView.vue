<template>
  <div class="page-container">
  <div class="trading">
    <div class="top-tabs">
      <router-link to="/trading" class="top-tab active">📊 Trading</router-link>
      <router-link to="/exchange" class="top-tab">🔄 Swap</router-link>
    </div>
    <!-- Chain tabs -->
    <div class="chain-scroll">
      <button v-for="(info, key) in chains" :key="key" @click="chain=key"
        :class="['chain-btn', chain===key?'chain-active':'']">{{ info.name }}</button>
    </div>
    <!-- Pair tabs -->
    <div class="pair-scroll">
      <button v-for="p in pairs" :key="p.symbol" @click="selectedPair=p.symbol"
        :class="['pair-btn', selectedPair===p.symbol?'pair-active':'']">{{ p.symbol }}</button>
    </div>
    <!-- Ticker -->
    <div v-if="ticker" class="ticker-bar">
      <span class="ticker-pair">{{ selectedPair }}</span>
      <span class="ticker-price">${{ ticker.price?.toFixed(4) }}</span>
      <span :class="['ticker-change', ticker.change24h >= 0 ? 'green' : 'red']">
        {{ ticker.change24h >= 0 ? '+' : '' }}{{ ticker.change24h?.toFixed(2) }}%
      </span>
    </div>
    <div v-if="!isTradable" class="view-only-bar">👁 View only — trading available on testnet only</div>
    <div class="trading-grid">
  <div class="chart-panel">
    <div class="panel-head">
      <span>Chart</span>
      <div class="interval-btns">
        <button v-for="iv in intervals" :key="iv.v" @click="interval=iv.v;loadCandles()"
          :class="['btn-xs', interval===iv.v?'active':'']">{{ iv.l }}</button>
      </div>
    </div>
    <div class="chart-container" ref="chartRef"></div>
  </div>
  <div class="order-panel" :class="{ disabled: !isTradable }">
    <div class="panel-head"><span>New Order</span></div>
    <div class="side-tabs">
      <button @click="side='buy'" :class="['btn-side', side==='buy'?'buy-active':'']" :disabled="!isTradable">Buy</button>
      <button @click="side='sell'" :class="['btn-side', side==='sell'?'sell-active':'']" :disabled="!isTradable">Sell</button>
    </div>
    <div class="type-tabs">
      <button @click="orderType='market'" :class="['btn-xs', orderType==='market'?'active':'']" :disabled="!isTradable">Market</button>
      <button @click="orderType='limit'" :class="['btn-xs', orderType==='limit'?'active':'']" :disabled="!isTradable">Limit</button>
    </div>
    <div v-if="orderType==='limit'" class="form-row">
      <label>Price</label>
      <input v-model.number="limitPrice" type="number" step="0.0001" class="input" :disabled="!isTradable" />
    </div>
    <div class="form-row">
      <label>Amount ({{ currentBase }})</label>
      <input v-model.number="amount" type="number" step="0.001" min="0" class="input" :disabled="!isTradable" />
    </div>
    <div class="form-row">
      <div class="pct-btns">
        <button v-for="p in [25,50,75,100]" :key="p" @click="setPct(p)" class="btn-xs" :disabled="!isTradable">{{ p }}%</button>
      </div>
    </div>
    <div class="order-summary" v-if="amount > 0 && isTradable">
      <div class="sum-row"><span>Total</span><span>{{ orderTotal.toFixed(4) }} {{ currentQuote }}</span></div>
      <div class="sum-row"><span>Fee (0.5%)</span><span>{{ (amount * 0.005).toFixed(6) }}</span></div>
    </div>
    <button @click="submitOrder" :disabled="!isTradable || ordering || amount<=0"
      :class="['btn-order', side==='buy'?'btn-buy':'btn-sell']">
      {{ !isTradable ? '🔒 View only' : ordering ? 'Sending...' : (side==='buy'?'Buy':'Sell') + ' ' + currentBase }}
    </button>
    <div v-if="orderResult" :class="['result-msg', orderResult.ok?'success':'fail']">{{ orderResult.msg }}</div>
  </div>
</div>

<div class="ob-panel">
  <div class="panel-head">
    <span>Order Book — {{ selectedPair }}</span>
    <span v-if="orderBook.asks?.length && orderBook.bids?.length" class="ob-spread-inline">
      Spread: {{ (orderBook.asks[0][0] - orderBook.bids[0][0]).toFixed(4) }}
    </span>
  </div>
  <div class="ob-columns">
    <div class="ob-col">
      <div class="ob-col-header bid-header"><span>Bid Price</span><span>Qty</span></div>
      <div v-for="(b,i) in orderBook.bids?.slice(0,15)" :key="'b'+i" class="ob-row bid">
        <span>{{ b[0]?.toFixed(4) }}</span><span>{{ b[1]?.toFixed(4) }}</span>
      </div>
    </div>
    <div class="ob-col">
      <div class="ob-col-header ask-header"><span>Ask Price</span><span>Qty</span></div>
      <div v-for="(a,i) in orderBook.asks?.slice(0,15)" :key="'a'+i" class="ob-row ask">
        <span>{{ a[0]?.toFixed(4) }}</span><span>{{ a[1]?.toFixed(4) }}</span>
      </div>
    </div>
  </div>
</div>
    <div class="orders-section" v-if="isTradable">
      <div class="panel-head">
        <span>My Orders</span>
        <div class="order-filters">
          <button @click="orderFilter='open';loadOrders()" :class="['btn-xs', orderFilter==='open'?'active':'']">Open</button>
          <button @click="orderFilter='filled';loadOrders()" :class="['btn-xs', orderFilter==='filled'?'active':'']">Filled</button>
          <button @click="orderFilter='';loadOrders()" :class="['btn-xs', orderFilter===''?'active':'']">All</button>
        </div>
      </div>
      <div class="orders-table" v-if="orders.length">
        <div class="ot-header">
          <span>Coppia</span><span>Pair</span><span>Side</span><span>Amount</span>
          <span>Price</span><span>Status</span><span>Date</span><span></span>
        </div>
        <div v-for="o in orders" :key="o.id" class="ot-row">
          <span>{{ o.pair }}</span>
          <span>{{ o.type }}</span>
          <span :class="o.side==='buy'?'green':'red'">{{ o.side.toUpperCase() }}</span>
          <span>{{ parseFloat(o.amount).toFixed(4) }}</span>
          <span>{{ o.filled_price ? parseFloat(o.filled_price).toFixed(4) : parseFloat(o.price).toFixed(4) }}</span>
          <span :class="'st-'+o.status">{{ o.status }}</span>
          <span class="date-col">{{ new Date(o.created_at).toLocaleString() }}</span>
          <span>
            <button v-if="o.status==='open'" @click="cancelOrd(o.id)" class="btn-xs btn-cancel">Cancel</button>
          </span>
        </div>
      </div>
      <div v-else class="no-orders">no-orders</div>
    </div>
  </div>
  </div>
  </template>
  <script setup>
  import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
  import { createChart, CandlestickSeries, HistogramSeries, CrosshairMode } from 'lightweight-charts';
  import api from '../services/api.js';
  const balances = ref([]);
  const fetchBalances = async () => {
    try { const data = await api.getMe(); balances.value = data.balances || []; } catch {}
  };
  const chains = ref({});
  const chain = ref('ethereum');
  const pairs = ref([]);
  const selectedPair = ref('BTC/USDT');
  const ticker = ref(null);
  const orderBook = ref({ bids: [], asks: [] });
  const interval = ref('1h');
  const intervals = [{ v: '1m', l: '1m' }, { v: '5m', l: '5m' }, { v: '15m', l: '15m' }, { v: '1h', l: '1H' }, { v: '4h', l: '4H' }, { v: '1d', l: '1D' }];
  const side = ref('buy');
  const orderType = ref('market');
  const amount = ref(0);
  const limitPrice = ref(0);
  const ordering = ref(false);
  const orderResult = ref(null);
  const orders = ref([]);
  const orderFilter = ref('open');
  const chartRef = ref(null);
  let chart = null;
  let candleSeries = null;
  let volumeSeries = null;
  let refreshTimer = null;
  const isTradable = computed(() => chains.value[chain.value]?.tradable === true);
  const currentBase = computed(() => { const p = pairs.value.find(x => x.symbol === selectedPair.value); return p?.base || 'BTC'; });
  const currentQuote = computed(() => { const p = pairs.value.find(x => x.symbol === selectedPair.value); return p?.quote || 'USDT'; });
  const orderTotal = computed(() => {
    const price = orderType.value === 'limit' ? limitPrice.value : (ticker.value?.price || 0);
    return amount.value * price;
  });
  const getBalance = (tkn) => {
    const b = balances.value?.find(x => x.chain === chain.value && x.token === tkn);
    return b ? parseFloat(b.amount) : 0;
  };
  const setPct = (pct) => {
    if (!isTradable.value) return;
    const bal = side.value === 'buy' ? getBalance(currentQuote.value) : getBalance(currentBase.value);
    if (side.value === 'buy') {
      const price = orderType.value === 'limit' ? limitPrice.value : (ticker.value?.price || 1);
      amount.value = parseFloat(((bal * pct / 100) / price).toFixed(6));
    } else {
      amount.value = parseFloat((bal * pct / 100).toFixed(6));
    }
  };
  function initChart() {
    if (!chartRef.value) return;
    if (chart) { chart.remove(); chart = null; }
    chart = createChart(chartRef.value, {
      width: chartRef.value.clientWidth,
      height: 320,
      layout: { background: { color: '#0a0e17' }, textColor: '#94a3b8', fontSize: 11 },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#6366f1', width: 1, style: 2, labelBackgroundColor: '#6366f1' }, horzLine: { color: '#6366f1', width: 1, style: 2, labelBackgroundColor: '#6366f1' } },
      rightPriceScale: { borderColor: '#1e293b', scaleMargins: { top: 0.1, bottom: 0.2 } },
      timeScale: { borderColor: '#1e293b', timeVisible: true, secondsVisible: false },
      handleScroll: true,
      handleScale: true,
    });
    candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444', borderDownColor: '#ef4444', borderUpColor: '#22c55e',
      wickDownColor: '#ef4444', wickUpColor: '#22c55e',
    });
    volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    new ResizeObserver(entries => {
      if (!chart || !entries[0]) return;
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    }).observe(chartRef.value);
  }
  async function loadChains() {
    try {
      const data = await api.getTradingChains();
      chains.value = data.chains;
    } catch {}
  }
  async function loadPairs() {
    try {
      const data = await api.getTradingPairs(chain.value);
      pairs.value = data.pairs || [];
      if (pairs.value.length && !pairs.value.find(p => p.symbol === selectedPair.value)) {
        selectedPair.value = pairs.value[0].symbol;
      }
    } catch {}
  }
  async function loadTicker() {
    try { ticker.value = await api.getTicker(selectedPair.value, chain.value); } catch {}
  }
  async function loadOrderBook() {
    try { orderBook.value = await api.getOrderBook(selectedPair.value, chain.value); } catch {}
  }
  async function loadCandles() {
    try {
      const raw = await api.getCandles(selectedPair.value, chain.value, interval.value, 200);
      if (!raw.length || !candleSeries) return;
      const cData = raw.map(c => ({ time: Math.floor(c.time / 1000), open: c.open, high: c.high, low: c.low, close: c.close }));
      const vData = raw.map(c => ({ time: Math.floor(c.time / 1000), value: c.volume, color: c.close >= c.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)' }));
      candleSeries.setData(cData);
      volumeSeries.setData(vData);
      chart.timeScale().fitContent();
    } catch {}
  }
  async function loadOrders() {
    if (!isTradable.value) return;
    try { orders.value = (await api.getOrders(orderFilter.value)).orders || []; } catch {}
  }
  async function submitOrder() {
    if (!isTradable.value || ordering.value || amount.value <= 0) return;
    ordering.value = true;
    orderResult.value = null;
    try {
      const price = orderType.value === 'limit' ? limitPrice.value : null;
      const data = await api.placeOrder(selectedPair.value, chain.value, side.value, orderType.value, amount.value, price);
      orderResult.value = { ok: true, msg: orderType.value === 'market' ? `Executed at ${data.rate?.toFixed(4)}` : 'Limit order placed' };
      fetchBalances();
      loadOrders();
    } catch (err) {
      orderResult.value = { ok: false, msg: err.message };
    } finally {
      ordering.value = false;
      setTimeout(() => orderResult.value = null, 4000);
    }
  }
  async function cancelOrd(id) {
    try { await api.cancelOrder(id); fetchBalances(); loadOrders(); } catch {}
  }
  function startRefresh() {
    stopRefresh();
    refreshTimer = setInterval(() => { loadTicker(); loadOrderBook(); }, 10000);
  }
  function stopRefresh() { if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; } }
  watch([chain], () => { loadPairs(); });
  watch([selectedPair, chain], () => {
    loadTicker();
    loadOrderBook();
    loadCandles();
    limitPrice.value = ticker.value?.price || 0;
  });
  onMounted(async () => {
    await fetchBalances();
    await loadChains();
    await loadPairs();
    await loadTicker();
    await nextTick();
    initChart();
    await loadOrderBook();
    await loadCandles();
    loadOrders();
    startRefresh();
    if (ticker.value) limitPrice.value = ticker.value.price;
  });
  onUnmounted(() => { stopRefresh(); if (chart) { chart.remove(); chart = null; } });
  </script>
  <style scoped>
  .trading { display: flex; flex-direction: column; gap: 10px; }
  .page-container { max-width: 1200px; margin: 0 auto; padding: 16px; }
  .top-tabs { display: flex; gap: 0; margin-bottom: 2px; }
  .top-tab { flex: 1; text-align: center; padding: 10px; font-size: 0.85rem; font-weight: 700; text-decoration: none; color: #64748b; background: #111827; border: 1px solid #1e293b; transition: all .2s; }
  .top-tab:first-child { border-radius: 10px 0 0 10px; }
  .top-tab:last-child { border-radius: 0 10px 10px 0; }
  .top-tab.active, .top-tab.router-link-active { color: #e2e8f0; background: #6366f1; border-color: #6366f1; }
  .chain-scroll { display: flex; gap: 6px; overflow-x: auto; padding: 4px 0; scrollbar-width: none; -ms-overflow-style: none; }
  .chain-scroll::-webkit-scrollbar { display: none; }
  .chain-btn { flex-shrink: 0; padding: 7px 14px; font-size: 0.75rem; font-weight: 600; border-radius: 20px; border: 1px solid #1e293b; background: #111827; color: #64748b; cursor: pointer; white-space: nowrap; transition: all .2s; }
  .chain-btn:hover { border-color: #334155; color: #94a3b8; }
  .chain-active { background: #6366f1; color: #fff; border-color: #6366f1; }
  .pair-scroll { display: flex; gap: 6px; overflow-x: auto; padding: 4px 0; scrollbar-width: none; -ms-overflow-style: none; }
  .pair-scroll::-webkit-scrollbar { display: none; }
  .pair-btn { flex-shrink: 0; padding: 6px 12px; font-size: 0.75rem; font-weight: 700; border-radius: 6px; border: 1px solid #1e293b; background: #0a0e17; color: #64748b; cursor: pointer; white-space: nowrap; font-family: monospace; transition: all .2s; }
  .pair-btn:hover { border-color: #334155; color: #94a3b8; }
  .pair-active { background: #1e293b; color: #e2e8f0; border-color: #6366f1; }
  .ticker-bar { display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: #111827; border: 1px solid #1e293b; border-radius: 8px; }
  .ticker-pair { font-size: 0.9rem; font-weight: 700; color: #e2e8f0; }
  .ticker-price { font-size: 1.2rem; font-weight: 700; color: #e2e8f0; }
  .ticker-change { font-size: 0.8rem; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
  .ticker-change.green { color: #22c55e; background: #052e16; }
  .ticker-change.red { color: #ef4444; background: #3b1120; }
  .view-only-bar { background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); color: #a5b4fc; padding: 8px 14px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; text-align: center; }
  .trading-grid { display: flex; flex-direction: column; gap: 10px; }
  .ob-panel { background: #111827; border: 1px solid #1e293b; border-radius: 10px; padding: 10px; margin-top: 10px; }
  .chart-panel, .ob-panel, .order-panel, .orders-section { background: #111827; border: 1px solid #1e293b; border-radius: 10px; padding: 10px; }
  .order-panel.disabled { opacity: 0.5; }
  .panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
  .chart-container { width: 100%; height: 320px; }
  .interval-btns { display: flex; gap: 4px; }
  .btn-xs { padding: 3px 8px; font-size: 0.7rem; background: #1e293b; color: #94a3b8; border: 1px solid #334155; border-radius: 4px; cursor: pointer; }
  .btn-xs:hover { background: #334155; }
  .btn-xs:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-xs.active { background: #6366f1; color: white; border-color: #6366f1; }
  .ob-side { max-height: 180px; overflow-y: auto; }
  .ob-label { font-size: 0.7rem; color: #64748b; padding: 4px 0; text-transform: uppercase; }
  .ob-row { display: flex; justify-content: space-between; font-size: 0.78rem; padding: 1px 4px; font-family: monospace; }
  .ob-row.ask span:first-child { color: #ef4444; }
  .ob-row.bid span:first-child { color: #22c55e; }
  .ob-row span:last-child { color: #94a3b8; }
  .ob-spread { text-align: center; font-size: 0.75rem; color: #64748b; padding: 4px 0; border-top: 1px solid #1e293b; border-bottom: 1px solid #1e293b; margin: 4px 0; }
  .side-tabs { display: flex; gap: 0; margin-bottom: 8px; }
  .btn-side { flex: 1; padding: 8px; font-size: 0.85rem; font-weight: 600; border: 1px solid #334155; background: #1e293b; color: #94a3b8; cursor: pointer; }
  .btn-side:first-child { border-radius: 6px 0 0 6px; }
  .btn-side:last-child { border-radius: 0 6px 6px 0; }
  .btn-side:disabled { opacity: 0.5; cursor: not-allowed; }
  .buy-active { background: #052e16; color: #22c55e; border-color: #166534; }
  .sell-active { background: #3b1120; color: #ef4444; border-color: #9f1239; }
  .type-tabs { display: flex; gap: 4px; margin-bottom: 10px; }
  .form-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
  .form-row label { font-size: 0.75rem; color: #64748b; }
  .pct-btns { display: flex; gap: 4px; }
  .order-summary { background: #0a0e17; border: 1px solid #1e293b; border-radius: 6px; padding: 8px; margin-bottom: 8px; }
  .sum-row { display: flex; justify-content: space-between; font-size: 0.8rem; color: #94a3b8; }
  .btn-order { width: 100%; padding: 12px; font-size: 0.95rem; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; text-transform: uppercase; }
  .btn-order:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-buy { background: #22c55e; color: #052e16; }
  .btn-buy:hover:not(:disabled) { background: #16a34a; }
  .btn-sell { background: #ef4444; color: #fff; }
  .btn-sell:hover:not(:disabled) { background: #dc2626; }
  .result-msg { padding: 8px; border-radius: 6px; font-size: 0.8rem; margin-top: 8px; text-align: center; }
  .result-msg.success { background: #052e16; color: #6ee7b7; }
  .result-msg.fail { background: #3b1120; color: #f87171; }
  .orders-section { margin-top: 4px; }
  .order-filters { display: flex; gap: 4px; }
  .ot-header, .ot-row { display: grid; grid-template-columns: 1fr 0.7fr 0.6fr 0.9fr 0.9fr 0.7fr 1.2fr 0.8fr; gap: 4px; font-size: 0.78rem; padding: 4px 6px; }
  .ot-header { color: #64748b; border-bottom: 1px solid #1e293b; font-weight: 600; }
  .ot-row { color: #cbd5e1; border-bottom: 1px solid #0f172a; }
  .ot-row:hover { background: #1e293b33; }
  .green { color: #22c55e; }
  .red { color: #ef4444; }
  .st-open { color: #f59e0b; }
  .st-filled { color: #22c55e; }
  .st-cancelled { color: #64748b; }
  .date-col { font-size: 0.7rem; color: #64748b; }
  .btn-cancel { background: #7f1d1d; color: #fca5a5; border-color: #991b1b; }
  .no-orders { text-align: center; color: #475569; font-size: 0.85rem; padding: 20px; }
  .input { padding: 8px; background: #0a0e17; border: 1px solid #1e293b; border-radius: 6px; color: #e2e8f0; font-size: 0.9rem; width: 100%; box-sizing: border-box; }
  .input:focus { outline: none; border-color: #6366f1; }
  .input:disabled { opacity: 0.4; cursor: not-allowed; }
  .ob-columns { display: flex; gap: 4px; }
.ob-col { flex: 1; min-width: 0; overflow-y: auto; max-height: 200px; }
.ob-col-header { display: flex; justify-content: space-between; font-size: 0.7rem; color: #64748b; padding: 2px 4px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #1e293b; margin-bottom: 2px; }
.ob-spread { text-align: center; font-size: 0.75rem; color: #64748b; padding: 4px 0; border-top: 1px solid #1e293b; border-bottom: 1px solid #1e293b; margin: 4px 0; }
  </style>