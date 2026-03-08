<template>
  <div class="hilo-game">
    <div class="topbar"><div class="bal-box"><span class="bal-lbl">Balance</span><span class="bal-v">{{ fmtBal() }}</span></div></div>
    <div class="title">⬆️ HiLo</div>
    <div class="game-body-wrap">
      <div class="game-body">
        <div class="info"><span class="hs">Streak: {{ streak }}</span><span class="hm">{{ mult.toFixed(2) }}×</span></div>
        <div class="hist">
          <div v-for="(c,i) in hist.slice(-6)" :key="i" class="sc" :class="col(c)">
            <div class="rank">{{ c.r }}</div><div class="suit">{{ c.s }}</div>
          </div>
        </div>
        <div v-if="cur" class="bc" :class="col(cur)">
          <div class="rank">{{ cur.r }}</div><div class="suit">{{ cur.s }}</div>
        </div>
        <div class="msg" :class="msgCls">{{ msg }}</div>
        <div v-if="on && !loading" class="hr">
          <div class="ha-btn" @click="guess('hi')"><div class="ic ic-hi">▲</div><div class="at">Higher</div></div>
          <div class="ha-btn" @click="cash"><div class="ic ic-co">$</div><div class="at">Cash Out</div></div>
          <div class="ha-btn" @click="guess('lo')"><div class="ic ic-lo">▼</div><div class="at">Lower</div></div>
        </div>
        <div v-if="loading" class="msg">...</div>
      </div>
    </div>
    <div class="ctrl">
      <div class="token-row" v-if="tokenList.length>1">
        <button v-for="t in tokenList" :key="t.token+t.chain" :class="['tok',selToken===t.token&&selChain===t.chain?'on':'']" @click="selToken=t.token;selChain=t.chain" :disabled="on">{{ t.token }}<span class="tok-c">{{ t.chain }}</span></button>
      </div>
      <div v-if="!tokenList.length" class="no-funds"><p>No funds available</p><router-link to="/deposit" class="btn btn-g">DEPOSIT</router-link></div>
      <template v-if="tokenList.length">
        <div class="bet-row">
          <div class="bet-label">Bet</div>
          <div class="bet-wrap">
            <input class="inp" type="number" v-model.number="betAmt" min="0.001" max="0.001" step="0.001" :disabled="on">
            <button class="qb" @click="betAmt=+((betAmt/2).toFixed(6))" :disabled="on">½</button>
            <button class="qb" @click="betAmt=Math.min(0.001,+((betAmt*2).toFixed(6)))" :disabled="on">2×</button>
            <button class="qb" @click="betAmt=Math.min(0.001,curBal())" :disabled="on">MAX</button>
          </div>
        </div>
        <button v-if="!on" class="btn btn-g" @click="start" :disabled="loading||betAmt<=0">{{ loading?'...':'START' }}</button>
        <p v-if="error" class="err">{{ error }}</p>
      </template>
    </div>
    <div class="result-overlay" :class="{show:showResult,win:resultWin}" @click="showResult=false">
      <div class="ro-border"><div class="ro-inner">
        <div class="ro-icon">{{ resultWin?'🏆':'😔' }}</div>
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
onMounted(async()=>{ await ensureProfile(); });
const betAmt=ref(0.001),on=ref(false),loading=ref(false),error=ref(null);
const streak=ref(0),mult=ref(1),cur=ref(null),hist=ref([]);
const msg=ref(''),msgCls=ref(''),sessionId=ref(null);
const selToken=ref(''),selChain=ref('');
const showResult=ref(false),resultWin=ref(false),resultAmt=ref(''),loseTitle=ref('BETTER LUCK!');
const tokenList=computed(()=>balances.value||[]);
function showOverlay(win,amt,title){
  resultWin.value=win;resultAmt.value=amt;if(title)loseTitle.value=title;
  showResult.value=true;setTimeout(()=>{showResult.value=false;},3500);
}
watch(tokenList,list=>{ if(list.length&&!selToken.value){selToken.value=list[0].token;selChain.value=list[0].chain;} },{immediate:true});
function curBal(){const b=(balances.value||[]).find(b=>b.token===selToken.value&&b.chain===selChain.value);return b?parseFloat(b.amount):0;}
function fmtBal(){return curBal().toFixed(6)+' '+selToken.value;}
function col(c){return c.s==='♥'||c.s==='♦'?'red':'black';}
async function start(){
  if(on.value||loading.value||betAmt.value<=0)return;
  if(!selToken.value||!selChain.value){error.value='Select a token first';return;}
  if(betAmt.value>0.001){error.value='Max bet: 0.001';return;}
  if(betAmt.value>curBal()){error.value='Insufficient balance';return;}
  error.value=null;loading.value=true;msg.value='';msgCls.value='';showResult.value=false;
  try{
    const data=await api.hiloStart({amount:betAmt.value,token:selToken.value,chain:selChain.value});
    sessionId.value=data.sessionId;cur.value=data.card;hist.value=[];streak.value=0;mult.value=1;on.value=true;fetchProfile();
  }catch(err){error.value=err.message;}
  finally{loading.value=false;}
}
async function guess(dir){
  if(!on.value||loading.value)return;
  error.value=null;loading.value=true;
  try{
    const data=await api.hiloGuess(sessionId.value,dir);
    hist.value=[...hist.value,cur.value];cur.value=data.card;
    if(data.correct){streak.value=data.streak;mult.value=data.multiplier;msg.value='Correct!';msgCls.value='msg-w';}
    else{on.value=false;streak.value=data.streak;msg.value='Wrong!';msgCls.value='msg-l';showOverlay(false,'-'+betAmt.value.toFixed(6)+' '+selToken.value,'WRONG!');fetchProfile();}
  }catch(err){error.value=err.message;}
  finally{loading.value=false;}
}
async function cash(){
  if(!on.value||loading.value||streak.value===0)return;
  error.value=null;loading.value=true;
  try{
    const data=await api.hiloCashout(sessionId.value);
    on.value=false;msg.value='Cashed out';msgCls.value='msg-w';showOverlay(true,'+'+data.payout.toFixed(6)+' '+selToken.value);fetchProfile();
  }catch(err){error.value=err.message;}
  finally{loading.value=false;}
}
</script>
<style scoped>
.hilo-game{display:flex;flex-direction:column;align-items:center;padding:10px 16px 20px;max-width:440px;margin:0 auto;font-family:'Poppins',sans-serif}
.topbar{display:flex;justify-content:center;width:100%;padding:10px 0}
.bal-box{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:5px 14px;display:flex;align-items:center;gap:6px}
.bal-lbl{color:#6b82a0;font-size:10px;font-weight:600}.bal-v{color:#3df06a;font-size:15px;font-weight:800}
.title{font-size:20px;font-weight:900;margin:6px 0;background:linear-gradient(90deg,#ff5050,#ffa830);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
.game-body-wrap{width:100%;margin-top:10px;padding:2px;border-radius:20px;background:linear-gradient(135deg,#ff5050,#ffa830,#ffde59,#3df06a,#20f0ff,#8050ff)}
.game-body{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px;width:100%;background:#0c1a2e;border-radius:18px}
.info{display:flex;gap:16px;align-items:center}
.hs{font-size:11px;color:#6b82a0;font-weight:600}.hm{font-size:14px;font-weight:800;color:#3df06a}
.hist{display:flex;gap:6px;justify-content:center}
.sc{width:40px;height:56px;border-radius:7px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.sc .suit{font-size:13px}.sc .rank{font-size:9px;font-weight:800}
.sc.red{color:#cc1111}.sc.black{color:#111}
.bc{width:100px;height:140px;border-radius:14px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(0,0,0,.5)}
.bc .suit{font-size:42px}.bc .rank{font-size:30px;font-weight:900}
.bc.red{color:#cc1111}.bc.black{color:#111}
.msg{font-size:17px;font-weight:800;text-align:center;min-height:24px;color:#fff}
.msg-w{color:#3df06a}.msg-l{color:#ff4040}
.hr{display:flex;gap:20px;align-items:center;margin-top:4px}
.ha-btn{display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;transition:transform .15s}
.ha-btn:hover{transform:scale(1.1)}.ha-btn:active{transform:scale(.95)}
.ic{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;border:none;color:#fff}
.at{font-size:9px;font-weight:700;color:#6b82a0}
.ic-hi{background:linear-gradient(180deg,#3df06a,#22b845);box-shadow:0 3px 14px rgba(52,220,89,.4)}
.ic-lo{background:linear-gradient(180deg,#ff5050,#d01515);box-shadow:0 3px 14px rgba(255,40,40,.3)}
.ic-co{background:linear-gradient(180deg,#ffa830,#e08800);box-shadow:0 3px 14px rgba(255,160,40,.3);font-size:16px}
.ctrl{width:100%;margin-top:12px;display:flex;flex-direction:column;gap:8px}
.bet-row{display:flex;flex-direction:column;gap:4px}
.bet-label{color:#6b82a0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px}
.bet-wrap{display:flex;align-items:center;gap:6px}
.inp{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 12px;color:#fff;font-size:14px;font-weight:700;font-family:'Poppins',sans-serif;outline:none;min-width:0}
.inp:disabled{opacity:.5;cursor:not-allowed}
.qb{padding:9px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#6b82a0;font-size:11px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .15s;white-space:nowrap}
.qb:hover{color:#fff;border-color:rgba(255,255,255,.2)}.qb:disabled{opacity:.3;cursor:not-allowed}
.token-row{display:flex;gap:4px;flex-wrap:wrap;justify-content:center}
.tok{padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#6b82a0;font-size:10px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif}
.tok.on{border-color:#3df06a44;background:rgba(61,240,106,.06);color:#3df06a}
.tok:disabled{opacity:.4;cursor:not-allowed}
.tok-c{font-size:7px;opacity:.6;margin-left:2px}
.btn{width:100%;padding:12px;border-radius:24px;border:none;font-size:14px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;transition:transform .15s}
.btn:hover:not(:disabled){transform:scale(1.03)}.btn:active:not(:disabled){transform:scale(.97)}.btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
.btn-g{background:linear-gradient(180deg,#3df06a,#22b845);color:#fff;box-shadow:0 4px 20px rgba(52,220,89,.4)}
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