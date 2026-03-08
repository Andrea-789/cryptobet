<template>
  <div class="dashboard">
    <div class="card">
      <div class="card-header">
        <h3>💰 Balances</h3>
        <button @click="emit('balanceUpdate')" class="btn btn-small">↻ Refresh</button>
      </div>
      <p v-if="!balances.length" class="empty">No balance yet. Make a deposit.</p>
      <div v-for="b in balances" :key="`${b.chain}-${b.token}`" class="balance-row">
        <div class="bal-left">
          <span class="bal-token">{{ b.token }}</span>
          <span class="bal-chain">{{ b.chain }}</span>
        </div>
        <span class="bal-amount">{{ b.amount }}</span>
      </div>
    </div>
    <div class="card">
      <h3>📥 Deposit</h3>
      <p class="hint">Send crypto to this address on the testnet</p>
      <div class="deposit-box">
        <code>{{ depositAddress }}</code>
        <button @click="copyAddress" class="btn btn-small">{{ copied ? '✓ Copied' : 'Copy' }}</button>
      </div>
      <div class="chains">
        <span v-for="c in depositChains" :key="c" class="chain-tag">{{ c }}</span>
      </div>
    </div>
    <div class="card">
      <Withdraw :wallet="wallet" :balances="balances" @balanceUpdate="emit('balanceUpdate')" />
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import Withdraw from '../components/Withdraw.vue';
import api from '../services/api.js';
const props = defineProps({ wallet: String, balances: Array });
const emit = defineEmits(['balanceUpdate']);
const depositAddress=ref(''),depositChains=ref([]),copied=ref(false);
onMounted(async()=>{
  try{const data=await api.getDepositAddress();depositAddress.value=data.address;depositChains.value=data.chains;}catch{}
});
const copyAddress=()=>{
  navigator.clipboard.writeText(depositAddress.value);copied.value=true;setTimeout(()=>copied.value=false,2000);
};
</script>
<style scoped>
.dashboard{display:flex;flex-direction:column;gap:16px;padding:20px;max-width:600px;margin:0 auto;font-family:'Poppins',sans-serif}
.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:20px;display:flex;flex-direction:column;gap:12px}
.card-header{display:flex;justify-content:space-between;align-items:center}
.card h3{font-size:16px;font-weight:800;background:linear-gradient(90deg,#3df06a,#20f0ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;margin:0}
.empty{color:#6b82a0;font-size:13px}
.balance-row{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px}
.bal-left{display:flex;flex-direction:column;gap:2px}
.bal-token{font-size:14px;font-weight:800;color:#fff}
.bal-chain{font-size:10px;color:#6b82a0;font-weight:600}
.bal-amount{font-size:16px;font-weight:900;color:#3df06a}
.hint{color:#6b82a0;font-size:12px;font-weight:500}
.deposit-box{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.04);border:1px solid rgba(61,240,106,.2);border-radius:12px;padding:10px 14px}
.deposit-box code{flex:1;font-size:11px;color:#20f0ff;word-break:break-all;font-family:monospace}
.chains{display:flex;gap:6px;flex-wrap:wrap}
.chain-tag{padding:4px 10px;border-radius:20px;font-size:10px;font-weight:700;background:rgba(128,80,255,.15);border:1px solid rgba(128,80,255,.3);color:#c090ff}
.btn{border:none;border-radius:10px;cursor:pointer;font-family:'Poppins',sans-serif;font-weight:700;transition:all .15s}
.btn-small{padding:7px 14px;font-size:11px;background:rgba(255,255,255,.07);color:#fff;border:1px solid rgba(255,255,255,.12)}
.btn-small:hover{background:rgba(255,255,255,.13)}
</style>