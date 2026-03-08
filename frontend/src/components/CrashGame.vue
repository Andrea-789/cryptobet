<template>
  <div class="crash-game">
    <div class="topbar"><div class="bal-box"><span class="bal-lbl">Balance</span><span class="bal-v">{{ fmtBal() }}</span></div></div>
    <div class="title">🚀 Crash</div>
    <div class="gframe"><div class="gf-in"><div class="gf-body">
      <canvas ref="cv" :width="W" :height="H" class="cv"></canvas>
      <div class="mult" :class="{red:crashed}">{{ mtText() }}</div>
    </div></div></div>
    <div class="ctrl">
      <div class="token-row" v-if="tokenList.length>1">
        <button v-for="t in tokenList" :key="t.token+t.chain" :class="['tok',selToken===t.token&&selChain===t.chain?'on':'']" @click="selToken=t.token;selChain=t.chain" :disabled="run">{{ t.token }}<span class="tok-c">{{ t.chain }}</span></button>
      </div>
      <div v-if="!tokenList.length" class="no-funds"><p>No funds available</p><router-link to="/deposit" class="btn btn-g">DEPOSIT</router-link></div>
      <template v-if="tokenList.length">
        <div class="bet-row">
          <div class="bet-label">Bet</div>
          <div class="bet-wrap">
            <input class="inp" type="number" v-model.number="betAmt" min="0.001" max="0.001" step="0.001" :disabled="run">
            <button class="qb" @click="betAmt=+((Math.max(0.001,betAmt/2)).toFixed(6))" :disabled="run">½</button>
            <button class="qb" @click="betAmt=Math.min(0.001,+((betAmt*2).toFixed(6)))" :disabled="run">2×</button>
            <button class="qb" @click="betAmt=Math.min(0.001,curBal())" :disabled="run">MAX</button>
          </div>
        </div>
        <button class="btn" :class="run?'btn-o':'btn-g'" @click="go" :disabled="loading||(!run&&betAmt<=0)">
          {{ loading?'...':run?'CASHOUT @ '+mt.toFixed(2)+'×':'START' }}
        </button>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import api from '../services/api.js';
import { useWallet } from '../composables/useWallet.js';
import { useSocket } from '../composables/useSocket.js';
const { balances, fetchProfile, ensureProfile } = useWallet();
const { onEvent, offEvent } = useSocket();
const betAmt = ref(0.001), run = ref(false), loading = ref(false), error = ref(null);
const mt = ref(1), pts = ref([]), crashed = ref(false), cashMsg = ref(''), crashAtVal = ref(0);
const cv = ref(null), sessionId = ref(null);
let anim = null, t0 = 0;
const W = 780, H = 520;
const selToken = ref(''), selChain = ref('');
const tokenList = computed(() => balances.value || []);
const showResult=ref(false),resultWin=ref(false),resultAmt=ref(''),loseTitle=ref('BETTER LUCK!');
function showOverlay(win,amt,title){
  resultWin.value=win;resultAmt.value=amt;if(title)loseTitle.value=title;
  showResult.value=true;setTimeout(()=>{showResult.value=false;},3500);
}
watch(tokenList, list => { if (list.length && !selToken.value) { selToken.value=list[0].token; selChain.value=list[0].chain; } }, { immediate: true });
function curBal() { const b=(balances.value||[]).find(b=>b.token===selToken.value&&b.chain===selChain.value); return b?parseFloat(b.amount):0; }
function fmtBal() { return curBal().toFixed(6)+' '+selToken.value; }
function bg(x) {
  x.clearRect(0,0,W,H); x.fillStyle='#0a1628'; x.fillRect(0,0,W,H);
  x.strokeStyle='rgba(255,255,255,0.04)'; x.lineWidth=1;
  for(let i=0;i<14;i++){x.beginPath();x.moveTo(0,i*40);x.lineTo(W,i*40);x.stroke();}
  for(let i=0;i<20;i++){x.beginPath();x.moveTo(i*40,0);x.lineTo(i*40,H);x.stroke();}
}
function draw() {
  if(!cv.value) return;
  const x=cv.value.getContext('2d'); bg(x);
  if(pts.value.length<2) return;
  x.beginPath();x.moveTo(pts.value[0].x,H);
  for(const p of pts.value) x.lineTo(p.x,p.y);
  x.lineTo(pts.value[pts.value.length-1].x,H);x.closePath();
  const fg=x.createLinearGradient(0,H,0,0);
  fg.addColorStop(0,'rgba(61,240,106,0.08)');fg.addColorStop(0.5,'rgba(32,240,255,0.28)');
  fg.addColorStop(0.85,'rgba(255,48,255,0.45)');fg.addColorStop(1,'rgba(255,80,80,0.55)');
  x.fillStyle=fg;x.fill();
  x.beginPath();x.moveTo(pts.value[0].x,pts.value[0].y);
  for(let i=1;i<pts.value.length;i++) x.lineTo(pts.value[i].x,pts.value[i].y);
  const lg=x.createLinearGradient(0,H,0,0);
  lg.addColorStop(0,'#3df06a');lg.addColorStop(0.4,'#20f0ff');lg.addColorStop(0.7,'#8050ff');lg.addColorStop(1,'#ff30ff');
  x.strokeStyle=lg;x.lineWidth=3;x.shadowColor='#3df06a';x.shadowBlur=12;x.stroke();x.shadowBlur=0;
  const last=pts.value[pts.value.length-1];
  x.beginPath();x.arc(last.x,last.y,6,0,2*Math.PI);
  x.fillStyle='#fff';x.shadowColor='#3df06a';x.shadowBlur=20;x.fill();x.shadowBlur=0;
}
function tick() {
  if(!run.value) return;
  const t=(Date.now()-t0)/1000;
  mt.value=Math.pow(Math.E,0.08*t);
  const px=Math.min(t*55,W-10),py=H-Math.min(mt.value-1,9)/9*(H-40);
  pts.value=[...pts.value,{x:px,y:py}];
  draw();
  anim=requestAnimationFrame(tick);
}
function onCrashBust(data) {
  if(data.sessionId!==sessionId.value) return;
  if(anim) cancelAnimationFrame(anim);
  crashed.value=true; run.value=false; crashAtVal.value=data.crashAt;
  draw(); fetchProfile();
  showOverlay(false,'-'+betAmt.value.toFixed(6)+' '+selToken.value,'CRASHED!');
}
async function go() {
  if(run.value){ cashout(); return; }
  if(loading.value||betAmt.value<=0) return;
  if(!selToken.value||!selChain.value){ error.value='Select a token first'; return; }
  if(betAmt.value>0.001){ error.value='Max bet: 0.001'; return; }
  if(betAmt.value>curBal()){ error.value='Insufficient balance'; return; }
  error.value=null; loading.value=true;
  try {
    const data = await api.crashStart({ amount:betAmt.value, token:selToken.value, chain:selChain.value });
    sessionId.value=data.sessionId;
    run.value=true; mt.value=1; pts.value=[]; crashed.value=false; cashMsg.value=''; crashAtVal.value=0;
    t0=Date.now(); fetchProfile(); tick();
  } catch(err){ error.value=err.message; }
  finally{ loading.value=false; }
}
async function cashout() {
  if(!run.value||loading.value) return;
  if(anim) cancelAnimationFrame(anim);
  loading.value=true; error.value=null;
  try {
    const data = await api.crashCashout(sessionId.value, parseFloat(mt.value.toFixed(2)));
    run.value=false;
    if(data.win){
      cashMsg.value='+'+data.payout.toFixed(6)+' '+selToken.value;
      crashAtVal.value=data.crashAt;
      showOverlay(true,cashMsg.value);
    }else{
      crashed.value=true;crashAtVal.value=data.crashAt;
      showOverlay(false,'-'+betAmt.value.toFixed(6)+' '+selToken.value,'CRASHED!');
    }
    fetchProfile();
  } catch(err){ error.value=err.message; run.value=false; }
  finally{ loading.value=false; }
}
function mtText() {
  if(cashMsg.value) return cashMsg.value;
  if(crashed.value) return 'CRASHED @ '+crashAtVal.value.toFixed(2)+'×';
  return mt.value.toFixed(2)+'×';
}
onMounted(async ()=>{
  await ensureProfile();
  if(cv.value){ const x=cv.value.getContext('2d'); bg(x); }
  onEvent('crash:bust', onCrashBust);
});
onUnmounted(()=>{ if(anim) cancelAnimationFrame(anim); offEvent('crash:bust', onCrashBust); });
</script>
<style scoped>
.crash-game{display:flex;flex-direction:column;align-items:center;padding:10px 16px 20px;max-width:420px;margin:0 auto;font-family:'Poppins',sans-serif}
.topbar{display:flex;justify-content:center;width:100%;padding:10px 0}
.bal-box{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:5px 14px;display:flex;align-items:center;gap:6px}
.bal-lbl{color:#6b82a0;font-size:10px;font-weight:600}.bal-v{color:#3df06a;font-size:15px;font-weight:800}
.title{font-size:20px;font-weight:900;margin:8px 0;background:linear-gradient(90deg,#ff5050,#ffa830);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
.gframe{width:100%;padding:3px;border-radius:18px;background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff);margin-top:12px}
.gf-in{background:#0c1a30;border-radius:16px;padding:6px}
.gf-body{background:linear-gradient(180deg,#0e1f38,#0a1628);border-radius:12px;padding:12px;position:relative;overflow:hidden}
.cv{width:100%;height:260px;display:block}
.mult{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:48px;font-weight:900;color:#fff;pointer-events:none;text-shadow:0 0 30px rgba(61,240,106,.5)}
.mult.red{color:#ff4040;text-shadow:0 0 30px rgba(255,40,40,.5)}
.ctrl{width:100%;margin-top:12px;display:flex;flex-direction:column;gap:8px}
.bet-row{display:flex;flex-direction:column;gap:4px}
.bet-label{color:#6b82a0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px}
.bet-wrap{display:flex;align-items:center;gap:6px}
.inp{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 12px;color:#fff;font-size:14px;font-weight:700;font-family:'Poppins',sans-serif;outline:none;min-width:0}
.inp:disabled{opacity:.5;cursor:not-allowed}
.qb{padding:9px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#6b82a0;font-size:11px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .15s;white-space:nowrap}
.qb:hover{color:#fff;border-color:rgba(255,255,255,.2)}.qb:disabled{opacity:.3;cursor:not-allowed}
.token-row{display:flex;gap:4px;flex-wrap:wrap}
.tok{padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#6b82a0;font-size:10px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif}
.tok.on{border-color:#3df06a44;background:rgba(61,240,106,.06);color:#3df06a}
.tok:disabled{opacity:.4;cursor:not-allowed}
.tok-c{font-size:7px;opacity:.6;margin-left:2px}
.btn{width:100%;padding:13px;border-radius:24px;border:none;font-size:15px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;transition:transform .15s}
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