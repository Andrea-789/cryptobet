<template>
  <div class="dice-game">
    <div class="topbar"><div class="bal-box"><span class="bal-lbl">Balance</span><span class="bal-v">{{ fmtBal() }}</span></div></div>
    <div class="title">🎲 Dice</div>
    <div class="dice-body-wrap">
      <div class="dice-body">
        <div class="lbl">Roll Under To Win</div>
        <div class="res" :class="resCls">{{ res }}</div>
        <div class="sw">
          <input type="range" min="5" max="95" v-model.number="slider" :style="pctStyle()" class="slider" :disabled="rolling">
          <div class="sl"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
        </div>
        <div class="ch">
          <div><div class="v">{{ slider }}%</div><div class="cl">Win Chance</div></div>
          <div><div class="v">{{ multiplier() }}×</div><div class="cl">Payout</div></div>
        </div>
      </div>
    </div>
    <div class="ctrl">
      <div class="token-row" v-if="tokenList.length>1">
        <button v-for="t in tokenList" :key="t.token+t.chain" :class="['tok',selToken===t.token&&selChain===t.chain?'on':'']" @click="selToken=t.token;selChain=t.chain" :disabled="rolling">{{ t.token }}<span class="tok-c">{{ t.chain }}</span></button>
      </div>
      <div v-if="!tokenList.length" class="no-funds"><p>No funds available</p><router-link to="/deposit" class="btn btn-g">DEPOSIT</router-link></div>
      <template v-if="tokenList.length">
        <div class="bet-row">
          <div class="bet-label">Bet</div>
          <div class="bet-wrap">
            <input class="inp" type="number" v-model.number="betAmt" min="0.001" max="0.001" step="0.001" :disabled="rolling">
            <button class="qb" @click="betAmt=+((Math.max(0.001,betAmt/2)).toFixed(6))" :disabled="rolling">½</button>
            <button class="qb" @click="betAmt=Math.min(0.001,+((betAmt*2).toFixed(6)))" :disabled="rolling">2×</button>
            <button class="qb" @click="betAmt=Math.min(0.001,curBal())" :disabled="rolling">MAX</button>
          </div>
        </div>
        <button class="btn btn-g" @click="roll" :disabled="rolling||betAmt<=0">{{ rolling?'ROLLING...':'ROLL' }}</button>
        <p v-if="error" class="err">{{ error }}</p>
      </template>
    </div>
    <div class="hist" v-if="history.length">
      <div class="hist-list">
        <div v-for="(h,i) in history" :key="i" :class="['hi',h.win?'hw':'hl']">
          <span class="hi-r">{{ h.roll }}</span>
          <span class="hi-t">&lt; {{ h.target }}</span>
          <span class="hi-a">{{ h.win?'+':'-' }}{{ (h.win?h.payout:h.amount).toFixed(6) }}</span>
        </div>
      </div>
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
onMounted(async () => { await ensureProfile(); });
const slider = ref(50), betAmt = ref(0.001), res = ref('—'), resCls = ref(''), rolling = ref(false), error = ref(null);
const selToken = ref(''), selChain = ref('');
const history = ref([]);
const tokenList = computed(() => balances.value || []);
const showResult=ref(false),resultWin=ref(false),resultAmt=ref(''),loseTitle=ref('BETTER LUCK!');
function showOverlay(win,amt,title){
  resultWin.value=win;resultAmt.value=amt;if(title)loseTitle.value=title;
  showResult.value=true;setTimeout(()=>{showResult.value=false;},3500);
}
watch(tokenList, list => { if (list.length && !selToken.value) { selToken.value=list[0].token; selChain.value=list[0].chain; } }, { immediate: true });
function curBal() { const b=(balances.value||[]).find(b=>b.token===selToken.value&&b.chain===selChain.value); return b?parseFloat(b.amount):0; }
function fmtBal() { return curBal().toFixed(6)+' '+selToken.value; }
function multiplier() { return slider.value>0?(99/slider.value).toFixed(2):'0'; }
function pctStyle() { return {'--pct':slider.value+'%'}; }
async function roll() {
  if (rolling.value||betAmt.value<=0) return;
  if (!selToken.value||!selChain.value) { error.value='Select a token first'; return; }
  if (betAmt.value>0.001) { error.value='Max bet: 0.001'; return; }
  if (betAmt.value>curBal()) { error.value='Insufficient balance'; return; }
  error.value=null; rolling.value=true; resCls.value='';
  try {
    const data = await api.dice(slider.value,'under',betAmt.value,selToken.value,selChain.value);
    let c=0;
    await new Promise(resolve => { const iv=setInterval(()=>{ res.value=(Math.random()*100).toFixed(2); c++; if(c>15){clearInterval(iv);resolve();} },60); });
    res.value=data.result.roll.toFixed(2);
    resCls.value=data.win?'win':'lose';
    history.value.unshift({roll:data.result.roll.toFixed(2),target:slider.value,win:data.win,amount:betAmt.value,payout:data.payout});
    if (history.value.length>20) history.value.pop();
    const amt=data.win?'+'+data.payout.toFixed(6)+' '+selToken.value:'-'+betAmt.value.toFixed(6)+' '+selToken.value;
    showOverlay(data.win,amt);
    fetchProfile();
  } catch(err) { error.value=err.message; }
  finally { rolling.value=false; }
}
</script>
<style scoped>
.dice-game{display:flex;flex-direction:column;align-items:center;padding:10px 16px 20px;max-width:440px;margin:0 auto;font-family:'Poppins',sans-serif}
.topbar{display:flex;justify-content:center;width:100%;padding:10px 0}
.bal-box{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:5px 14px;display:flex;align-items:center;gap:6px}
.bal-lbl{color:#6b82a0;font-size:10px;font-weight:600}.bal-v{color:#3df06a;font-size:15px;font-weight:800}
.title{font-size:20px;font-weight:900;margin:6px 0;background:linear-gradient(90deg,#30ff70,#ffde59);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
/* gradient border trick via wrapper */
.dice-body-wrap{width:100%;margin-top:12px;padding:2px;border-radius:20px;background:linear-gradient(135deg,#3df06a,#20f0ff,#c050ff,#ffa830)}
.dice-body{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;padding:16px;background:#0c1a2e;border-radius:18px}
.lbl{color:#6b82a0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;text-align:center}
.res{font-size:52px;font-weight:900;text-align:center;color:#fff;transition:color .2s;min-width:140px}
.res.win{color:#3df06a;text-shadow:0 0 20px rgba(61,240,106,.5)}.res.lose{color:#ff4040;text-shadow:0 0 20px rgba(255,64,64,.5)}
.sw{width:100%;margin:6px 0}
.sw .slider{appearance:none;-webkit-appearance:none;width:100%;height:8px;border-radius:4px;background:linear-gradient(90deg,#3df06a 0%,#3df06a var(--pct),#ff4040 var(--pct),#ff4040 100%);outline:none}
.sw .slider::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4)}
.sw .slider:disabled{opacity:.5;cursor:not-allowed}
.sl{display:flex;justify-content:space-between;font-size:10px;color:#6b82a0;font-weight:600;margin-top:2px}
.ch{display:flex;justify-content:space-around;width:100%;margin-top:6px}
.ch .v{font-weight:800;font-size:14px;color:#fff;text-align:center}.ch .cl{font-size:9px;color:#6b82a0;text-align:center}
.ctrl{width:100%;margin-top:12px;display:flex;flex-direction:column;gap:8px}
.bet-row{display:flex;flex-direction:column;gap:4px}
.bet-label{color:#6b82a0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px}
.bet-wrap{display:flex;align-items:center;gap:6px}
.inp{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 12px;color:#fff;font-size:14px;font-weight:700;font-family:'Poppins',sans-serif;outline:none;min-width:0}
.inp:disabled{opacity:.5;cursor:not-allowed}
.qb{padding:9px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#6b82a0;font-size:11px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .15s;white-space:nowrap}
.qb:hover{color:#fff;border-color:rgba(255,255,255,.2)}.qb:disabled{opacity:.3;cursor:not-allowed}
.token-row{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:2px}
.tok{padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#6b82a0;font-size:10px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif}
.tok.on{border-color:#3df06a44;background:rgba(61,240,106,.06);color:#3df06a}
.tok:disabled{opacity:.4;cursor:not-allowed}
.tok-c{font-size:7px;opacity:.6;margin-left:2px}
.btn{width:100%;padding:13px;border-radius:24px;border:none;font-size:15px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;transition:transform .15s}
.btn:hover:not(:disabled){transform:scale(1.03)}.btn:active:not(:disabled){transform:scale(.97)}.btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
.btn-g{background:linear-gradient(180deg,#3df06a,#22b845);color:#fff;box-shadow:0 4px 20px rgba(52,220,89,.4)}
.err{color:#ff6b6b;font-size:11px;font-weight:600;text-align:center;background:rgba(255,64,64,.08);padding:8px;border-radius:8px}
.hist{width:100%;margin-top:12px}.hist-list{display:flex;flex-direction:column;gap:3px}
.hi{display:flex;justify-content:space-between;align-items:center;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700}
.hw{background:rgba(61,240,106,.04);border:1px solid rgba(61,240,106,.1)}
.hl{background:rgba(255,64,64,.04);border:1px solid rgba(255,64,64,.1)}
.hi-r{color:#fff;width:50px;font-weight:800}.hi-t{color:#6b82a0;flex:1;text-align:center}
.hi-a{width:90px;text-align:right}.hw .hi-a{color:#3df06a}.hl .hi-a{color:#ff4040}
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