<template>
  <div class="mines-game">
    <div class="topbar"><div class="bal-box"><span class="bal-lbl">Balance</span><span class="bal-v">{{ fmtBal() }}</span></div></div>
    <div class="title">💣 Mines</div>
    <div class="field">
      <div class="grid">
        <div v-for="i in 25" :key="i-1" :class="cellClass(i-1)" @click="click(i-1)">{{ cellText(i-1) }}</div>
      </div>
      <div class="info">
        <div><span class="lbl">Mines: </span><span class="fw8">{{ mcIn }}</span></div>
        <div><span class="lbl">Multiplier: </span><span class="fw8 green">{{ mm.toFixed(2) }}×</span></div>
      </div>
    </div>
    <div class="ctrl">
      <div class="token-row" v-if="tokenList.length>1">
        <button v-for="t in tokenList" :key="t.token+t.chain" :class="['tok',selToken===t.token&&selChain===t.chain?'on':'']" @click="selToken=t.token;selChain=t.chain" :disabled="on">{{ t.token }}<span class="tok-c">{{ t.chain }}</span></button>
      </div>
      <div v-if="!tokenList.length" class="no-funds"><p>No funds available</p><router-link to="/deposit" class="btn btn-g">DEPOSIT</router-link></div>
      <template v-if="tokenList.length">
        <div class="row">
          <div class="f1">
            <div class="lbl">Bet</div>
            <div class="bet-wrap">
              <input class="inp" type="number" v-model.number="betAmt" min="0.001" max="0.001" step="0.001" :disabled="on">
              <button class="qb" @click="betAmt=+((Math.max(0.001,betAmt/2)).toFixed(6))" :disabled="on">½</button>
              <button class="qb" @click="betAmt=Math.min(0.001,+((betAmt*2).toFixed(6)))" :disabled="on">2×</button>
              <button class="qb" @click="betAmt=Math.min(0.001,curBal())" :disabled="on">MAX</button>
            </div>
          </div>
          <div class="f1"><div class="lbl">Mines</div><input class="inp" type="number" v-model.number="mcIn" min="1" max="24" :disabled="on"></div>
        </div>
        <div class="row">
          <button v-if="!on" class="btn btn-g" @click="go" :disabled="loading||betAmt<=0">{{ loading?'...':'START' }}</button>
          <button v-else class="btn btn-o" @click="cash" :disabled="loading||revCount===0">{{ loading?'...':'CASHOUT' }}</button>
        </div>
        <p v-if="error" class="err">{{ error }}</p>
      </template>
    </div>
    <div class="result-overlay" :class="{show:showResult,win:resultWin}" @click="showResult=false">
      <div class="ro-border"><div class="ro-inner">
        <div class="ro-icon">{{ resultWin?'🏆':'💣' }}</div>
        <h3 class="ro-title">{{ resultWin?'YOU WIN!':loseTitle }}</h3>
        <p class="ro-amt">{{ resultAmt }}</p>
        <div class="ro-close">tap to close</div>
      </div></div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import api from '../services/api.js';
import { useWallet } from '../composables/useWallet.js';
const { balances, fetchProfile, ensureProfile } = useWallet();
const betAmt=ref(0.001),mcIn=ref(10);
const on=ref(false),loading=ref(false),error=ref(null);
const revealed=ref([]),bombs=ref([]),mm=ref(1),revCount=ref(0);
const sessionId=ref(null);
const selToken=ref(''),selChain=ref('');
const showResult=ref(false),resultWin=ref(false),resultAmt=ref(''),loseTitle=ref('BOOM!');
const tokenList=computed(()=>balances.value||[]);
function showOverlay(win,amt,title){
  resultWin.value=win;resultAmt.value=amt;if(title)loseTitle.value=title;
  showResult.value=true;setTimeout(()=>{showResult.value=false;},3500);
}
watch(tokenList,list=>{ if(list.length&&!selToken.value){selToken.value=list[0].token;selChain.value=list[0].chain;} },{immediate:true});
function curBal(){const b=(balances.value||[]).find(b=>b.token===selToken.value&&b.chain===selChain.value);return b?parseFloat(b.amount):0;}
function fmtBal(){return curBal().toFixed(6)+' '+selToken.value;}
async function go(){
  if(on.value||loading.value||betAmt.value<=0)return;
  if(!selToken.value||!selChain.value){error.value='Select a token first';return;}
  if(betAmt.value>0.001){error.value='Max bet: 0.001';return;}
  if(betAmt.value>curBal()){error.value='Insufficient balance';return;}
  error.value=null;loading.value=true;showResult.value=false;
  try{
    const data=await api.minesStart({amount:betAmt.value,token:selToken.value,chain:selChain.value,minesCount:mcIn.value});
    sessionId.value=data.sessionId;on.value=true;revCount.value=0;mm.value=1;revealed.value=Array(25).fill(false);bombs.value=[];fetchProfile();
  }catch(err){error.value=err.message;}
  finally{loading.value=false;}
}
async function click(i){
  if(!on.value||revealed.value[i]||loading.value)return;
  error.value=null;loading.value=true;
  try{
    const data=await api.minesReveal(sessionId.value,i);
    const rv=[...revealed.value];rv[i]=true;revealed.value=rv;
    if(data.bomb){
      bombs.value=data.mines;on.value=false;
      const rv2=[...revealed.value];data.mines.forEach(m=>{rv2[m]=true;});revealed.value=rv2;mm.value=0;
      showOverlay(false,'-'+betAmt.value.toFixed(6)+' '+selToken.value,'BOOM!');
    }else{revCount.value++;mm.value=data.multiplier;}
    fetchProfile();
  }catch(err){error.value=err.message;}
  finally{loading.value=false;}
}
async function cash(){
  if(!on.value||loading.value||revCount.value===0)return;
  error.value=null;loading.value=true;
  try{
    const data=await api.minesCashout(sessionId.value);
    bombs.value=data.mines;on.value=false;revealed.value=Array(25).fill(true);mm.value=data.multiplier;
    showOverlay(true,'+'+data.payout.toFixed(6)+' '+selToken.value);fetchProfile();
  }catch(err){error.value=err.message;}
  finally{loading.value=false;}
}
function cellClass(i){if(!revealed.value[i])return 'cell';return bombs.value.includes(i)?'cell open bomb':'cell open safe';}
function cellText(i){if(!revealed.value[i])return '';return bombs.value.includes(i)?'💣':'💎';}
onMounted(async()=>{await ensureProfile();});
</script>
<style scoped>
.mines-game{display:flex;flex-direction:column;align-items:center;padding:10px 16px 20px;max-width:420px;margin:0 auto;font-family:'Poppins',sans-serif}
.topbar{display:flex;justify-content:center;width:100%;padding:10px 0}
.bal-box{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:5px 14px;display:flex;align-items:center;gap:6px}
.bal-lbl{color:#6b82a0;font-size:10px;font-weight:600}.bal-v{color:#3df06a;font-size:15px;font-weight:800}
.title{font-size:20px;font-weight:900;margin:8px 0;background:linear-gradient(90deg,#ffa830,#ff50ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
.field{padding:12px;background:rgba(255,255,255,.03);border-radius:18px;width:100%;margin-top:10px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.cell{aspect-ratio:1;border-radius:10px;background:rgba(10,22,40,.75);border:2px solid rgba(255,255,255,.1);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;transition:all .2s}
.cell:hover:not(.open){background:rgba(255,255,255,.12);transform:scale(1.05)}
.cell.safe{background:linear-gradient(135deg,rgba(61,240,106,.55),rgba(34,184,69,.45));border-color:#3df06acc;box-shadow:0 0 12px rgba(61,240,106,.3);animation:pop .3s}
.cell.bomb{background:linear-gradient(135deg,rgba(255,60,60,.55),rgba(208,21,21,.45));border-color:#ff4040cc;box-shadow:0 0 12px rgba(255,60,60,.3);animation:shk .4s}
@keyframes pop{0%{transform:scale(.7)}50%{transform:scale(1.1)}100%{transform:scale(1)}}
@keyframes shk{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.info{display:flex;justify-content:space-between;margin-top:8px}
.fw8{font-weight:800;color:#fff}.green{color:#3df06a}
.ctrl{width:100%;margin-top:12px;display:flex;flex-direction:column;gap:8px}
.row{display:flex;gap:8px;width:100%}.f1{flex:1}
.lbl{color:#6b82a0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px}
.bet-wrap{display:flex;align-items:center;gap:4px;margin-top:2px}
.inp{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:8px 12px;color:#fff;font-size:14px;font-weight:700;font-family:'Poppins',sans-serif;width:100%;outline:none}
.inp:disabled{opacity:.5;cursor:not-allowed}
.bet-wrap .inp{flex:1;min-width:0}
.qb{padding:8px 7px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#6b82a0;font-size:10px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .15s;white-space:nowrap}
.qb:hover{color:#fff;border-color:rgba(255,255,255,.2)}.qb:disabled{opacity:.3;cursor:not-allowed}
.token-row{display:flex;gap:4px;flex-wrap:wrap}
.tok{padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#6b82a0;font-size:10px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif}
.tok.on{border-color:#3df06a44;background:rgba(61,240,106,.06);color:#3df06a}
.tok:disabled{opacity:.4;cursor:not-allowed}
.tok-c{font-size:7px;opacity:.6;margin-left:2px}
.btn{padding:13px;border-radius:24px;border:none;font-size:15px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;transition:transform .15s;flex:1}
.btn:hover:not(:disabled){transform:scale(1.03)}.btn:active:not(:disabled){transform:scale(.97)}.btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
.btn-g{background:linear-gradient(180deg,#3df06a,#22b845);color:#fff;box-shadow:0 4px 20px rgba(52,220,89,.4)}
.btn-o{background:linear-gradient(180deg,#ffa830,#e08800);color:#fff;box-shadow:0 4px 20px rgba(255,160,40,.3)}
.err{color:#ff6b6b;font-size:11px;font-weight:600;text-align:center;background:rgba(255,64,64,.08);padding:8px;border-radius:8px}
.no-funds{text-align:center;padding:20px;width:100%}
.no-funds p{color:#6b82a0;font-size:13px;font-weight:600;margin-bottom:10px}
.no-funds .btn{display:inline-block;text-decoration:none;padding:12px 40px}
.result-overlay{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);z-index:50;opacity:0;transition:all .35s cubic-bezier(0.2,1,0.3,1);cursor:pointer;border-radius:24px}
.result-overlay.show{transform:translate(-50%,-50%) scale(1);opacity:1}
.result-overlay.win .ro-border{background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff)}
.result-overlay:not(.win) .ro-border{background:conic-gradient(#ff4040,#ff8030,#ff4040,#cc1010,#ff4040)}
.ro-border{padding:3px;border-radius:24px}
.ro-inner{background:rgba(10,22,40,.96);border-radius:22px;padding:28px 48px;text-align:center;min-width:220px}
.ro-icon{font-size:40px;line-height:1;margin-bottom:6px}
.ro-title{font-size:22px;font-weight:900;margin:0 0 4px}
.result-overlay.win .ro-title{color:#ffde59}
.result-overlay:not(.win) .ro-title{color:#ff6060}
.ro-amt{font-size:30px;font-weight:800;margin:4px 0}
.result-overlay.win .ro-amt{color:#3df06a}
.result-overlay:not(.win) .ro-amt{color:#ff4040}
.ro-close{color:#6b82a0;font-size:10px;margin-top:10px}
</style>