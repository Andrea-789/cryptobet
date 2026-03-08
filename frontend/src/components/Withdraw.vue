<template>
  <div class="withdraw">
    <h3>💸 Withdrawal</h3>
    <div v-if="result" :class="['result-box',result.success?'success':'fail']">
      <p>{{ result.success ? result.message : result.error }}</p>
    </div>
    <div class="form-group">
      <label>Destination address</label>
      <div class="input-row">
        <input v-model="toAddress" placeholder="0x..." class="inp full"/>
        <button @click="useOwnWallet" class="btn btn-s">My wallet</button>
      </div>
    </div>
    <div class="form-group">
      <label>Chain</label>
      <select v-model="chain" class="inp">
        <option value="polygon-amoy">Polygon Amoy</option>
        <option value="base-sepolia">Base Sepolia</option>
      </select>
    </div>
    <div class="form-group">
      <div class="label-row">
        <label>Amount</label>
        <span class="bal-hint">Balance: <b>{{ currentBalance().toFixed(4) }}</b> {{ token }}</span>
      </div>
      <div class="input-row">
        <input v-model.number="amount" type="number" step="0.01" min="0.01" class="inp full"/>
        <button @click="setMax" class="btn btn-s">MAX</button>
      </div>
    </div>
    <button @click="withdraw" :disabled="processing||amount<=0" class="btn btn-primary">
      {{ processing?'Processing...':'Withdraw' }}
    </button>
    <div v-if="history.length" class="history">
      <div class="hist-title">Recent withdrawals</div>
      <div v-for="tx in history" :key="tx.id" class="hist-row">
        <div class="hist-left">
          <span class="hist-amount">{{ parseFloat(tx.amount).toFixed(4) }} {{ tx.token }}</span>
          <span class="hist-chain">{{ tx.chain }}</span>
        </div>
        <div class="hist-right">
          <span class="hist-status">{{ statusLabel(tx.status) }}</span>
          <span v-if="tx.tx_hash" class="hist-hash">{{ shortHash(tx.tx_hash) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api.js';
const emit=defineEmits(['balanceUpdate']);
const props=defineProps({wallet:String,balances:Array});
const toAddress=ref(''),amount=ref(0.1),chain=ref('polygon-amoy'),token=ref('NATIVE');
const processing=ref(false),result=ref(null),history=ref([]);
onMounted(async()=>{toAddress.value=props.wallet||'';await loadHistory();});
const loadHistory=async()=>{try{const data=await api.getWithdrawalHistory();history.value=data.withdrawals;}catch{}};
const useOwnWallet=()=>{toAddress.value=props.wallet;};
const currentBalance=()=>{const b=props.balances?.find(b=>b.chain===chain.value&&b.token===token.value);return b?parseFloat(b.amount):0;};
const setMax=()=>{amount.value=currentBalance();};
const withdraw=async()=>{
  if(processing.value)return;result.value=null;processing.value=true;
  try{const data=await api.requestWithdrawal(parseFloat(amount.value),token.value,chain.value,toAddress.value);result.value={success:true,...data};emit('balanceUpdate');await loadHistory();}
  catch(err){result.value={success:false,error:err.message};}
  finally{processing.value=false;}
};
const statusLabel=(s)=>({pending:'⏳ Pending',processing:'🔄 Processing',confirmed:'✅ Confirmed',failed:'❌ Failed'}[s]||s);
const shortHash=(h)=>h?`${h.slice(0,10)}...${h.slice(-6)}`:'-';
</script>
<style scoped>
.withdraw{display:flex;flex-direction:column;gap:14px;font-family:'Poppins',sans-serif}
h3{font-size:16px;font-weight:800;background:linear-gradient(90deg,#ffa830,#ff50ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;margin:0}
.form-group{display:flex;flex-direction:column;gap:6px}
.form-group label{font-size:10px;color:#6b82a0;text-transform:uppercase;letter-spacing:1px;font-weight:600}
.label-row{display:flex;justify-content:space-between;align-items:center}
.bal-hint{font-size:11px;color:#6b82a0}
.bal-hint b{color:#3df06a}
.input-row{display:flex;gap:8px}
.inp{padding:10px 14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;font-size:13px;font-family:'Poppins',sans-serif;outline:none;transition:border-color .15s}
.inp:focus{border-color:#3df06a55}
.inp.full{flex:1}
select.inp{cursor:pointer}
select.inp option{background:#0e1f38}
.result-box{padding:12px 16px;border-radius:12px;font-size:12px;font-weight:600}
.result-box.success{background:rgba(61,240,106,.08);color:#3df06a;border:1px solid rgba(61,240,106,.2)}
.result-box.fail{background:rgba(255,64,64,.08);color:#ff6b6b;border:1px solid rgba(255,64,64,.2)}
.btn{border:none;border-radius:12px;cursor:pointer;font-family:'Poppins',sans-serif;font-weight:700;transition:all .15s}
.btn:disabled{opacity:.4;cursor:not-allowed}
.btn-s{padding:10px 14px;font-size:11px;background:rgba(255,255,255,.07);color:#fff;border:1px solid rgba(255,255,255,.1);white-space:nowrap}
.btn-s:hover{background:rgba(255,255,255,.13)}
.btn-primary{width:100%;padding:14px;font-size:15px;font-weight:800;background:linear-gradient(180deg,#3df06a,#22b845);color:#fff;box-shadow:0 4px 20px rgba(52,220,89,.35);border-radius:20px}
.btn-primary:hover:not(:disabled){transform:scale(1.02)}
.history{display:flex;flex-direction:column;gap:6px;margin-top:4px}
.hist-title{font-size:10px;color:#6b82a0;text-transform:uppercase;letter-spacing:1px;font-weight:600}
.hist-row{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px}
.hist-left,.hist-right{display:flex;flex-direction:column;gap:2px}
.hist-right{align-items:flex-end}
.hist-amount{font-size:13px;font-weight:800;color:#fff}
.hist-chain{font-size:10px;color:#6b82a0}
.hist-status{font-size:11px;font-weight:600}
.hist-hash{color:#8050ff;font-family:monospace;font-size:10px}
</style>