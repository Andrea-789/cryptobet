<template>
  <div class="bj-game">
    <div class="topbar"><div class="bal-box"><span class="bal-lbl">Balance</span><span class="bal-v">{{ fmtBal() }}</span></div></div>
    <div class="title">🃏 Blackjack</div>
    <div class="tw tw-d">
      <canvas ref="canvasD" width="880" height="520"></canvas>
      <div class="overlay ov-dealer">
        <div class="hand-label">Dealer</div>
        <div class="cards">
          <div v-for="(c,i) in dealerCards" :key="'d'+i" class="card" :class="c.r==='?'?'card-back':col(c)">
            <template v-if="c.r==='?'"><span>?</span></template>
            <template v-else><div class="rank">{{ c.r }}</div><div class="suit">{{ c.s }}</div></template>
          </div>
        </div>
        <div class="hand-score">{{ dealerScore }}</div>
      </div>
    </div>
    <div class="msg" :class="msgCls">{{ msg }}</div>
    <div class="tw tw-p">
      <canvas ref="canvasP" width="880" height="440"></canvas>
      <div class="overlay ov-player">
        <div class="hand-score">{{ playerScore }}</div>
        <div class="cards">
          <div v-for="(c,i) in playerCards" :key="'p'+i" class="card" :class="col(c)">
            <div class="rank">{{ c.r }}</div><div class="suit">{{ c.s }}</div>
          </div>
        </div>
        <div class="hand-label" style="margin-top:2px">You</div>
      </div>
    </div>
    <div class="ctrl">
      <div class="token-row" v-if="tokenList.length>1">
        <button v-for="t in tokenList" :key="t.token+t.chain" :class="['tok',selToken===t.token&&selChain===t.chain?'on':'']" @click="selToken=t.token;selChain=t.chain" :disabled="on">{{ t.token }}<span class="tok-c">{{ t.chain }}</span></button>
      </div>
      <div v-if="!tokenList.length" class="no-funds"><p>No funds available</p><router-link to="/deposit" class="btn btn-g">DEPOSIT</router-link></div>
      <template v-if="tokenList.length">
        <div class="row">
          <div class="field"><div class="lbl">Bet</div><input class="inp" type="number" v-model.number="betAmt" min="0.001" step="0.001" :disabled="on"></div>
          <div class="quick-bets">
            <button class="qb" @click="betAmt=+((betAmt/2).toFixed(6))" :disabled="on">½</button>
            <button class="qb" @click="betAmt=+((betAmt*2).toFixed(6))" :disabled="on">2×</button>
            <button class="qb" @click="betAmt=curBal()" :disabled="on">MAX</button>
          </div>
        </div>
        <div v-if="!on" class="row"><button class="btn btn-g" @click="deal" :disabled="loading">{{ loading?'...':'DEAL' }}</button></div>
        <div v-else class="row">
          <button class="btn btn-g" @click="doAction('hit')" :disabled="done||loading">HIT</button>
          <button class="btn btn-o" @click="doAction('stand')" :disabled="done||loading">STAND</button>
          <button class="btn btn-p" @click="doAction('double')" :disabled="done||loading">2×</button>
        </div>
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
const canvasD = ref(null), canvasP = ref(null);
const on = ref(false), done = ref(false), loading = ref(false), error = ref(null);
const playerCards = ref([]), dealerCards = ref([]);
const playerScore = ref(''), dealerScore = ref('');
const msg = ref(''), msgCls = ref(''), betAmt = ref(0.001);
const sessionId = ref(null);
const selToken = ref(''), selChain = ref('');
const tokenList = computed(() => balances.value || []);
const showResult=ref(false),resultWin=ref(false),resultAmt=ref(''),loseTitle=ref('BETTER LUCK!');
function showOverlay(win,amt,title){
  resultWin.value=win;resultAmt.value=amt;if(title)loseTitle.value=title;
  showResult.value=true;setTimeout(()=>{showResult.value=false;},3500);
}
watch(tokenList, list => { if (list.length && !selToken.value) { selToken.value = list[0].token; selChain.value = list[0].chain; } }, { immediate: true });
function curBal() { const b = (balances.value||[]).find(b=>b.token===selToken.value&&b.chain===selChain.value); return b ? parseFloat(b.amount) : 0; }
function fmtBal() { return curBal().toFixed(6)+' '+selToken.value; }
function col(c) { return c.s==='♥'||c.s==='♦'?'red':'black'; }
function bjVal(h) { let t=0,a=0; for(const c of h){if(c.r==='A'){a++;t+=11;}else if('JQK'.includes(c.r))t+=10;else t+=parseInt(c.r);} while(t>21&&a>0){t-=10;a--;} return t; }
/* ── CANVAS TABLES ── */
const SEGS=[{c:['#ff4040','#ff1515'],d:'#d00808'},{c:['#ffb830','#ff7a00'],d:'#e06000'},{c:['#ffe040','#ffc000'],d:'#d9a000'},{c:['#30ff70','#00e050'],d:'#00b840'},{c:['#20f0ff','#00d0f0'],d:'#00a8c8'},{c:['#9060ff','#6a30ff'],d:'#5020d0'},{c:['#ff50ff','#d830e0'],d:'#b020b8'},{c:['#a0b0c0','#708898'],d:'#506878'}];
const N=SEGS.length, ARC=Math.PI/N;
const COLS=['rgba(255,48,255,','rgba(255,222,89,','rgba(48,255,112,','rgba(32,240,255,','rgba(128,80,255,'];
function drawDealer(cv) {
  const x=cv.getContext('2d'),W=880,H=520,cx=W/2,cy=50,Rx=390,Ry=340;
  function cg(){const g=x.createConicGradient(0,cx,cy);g.addColorStop(0,'#ff30ff');g.addColorStop(0.1,'#ffde59');g.addColorStop(0.25,'#30ff70');g.addColorStop(0.4,'#20f0ff');g.addColorStop(0.55,'#8050ff');g.addColorStop(0.7,'#ff30ff');g.addColorStop(0.85,'#ffde59');g.addColorStop(1,'#30ff70');return g;}
  function ell(rx,ry,sa,ea){x.save();x.translate(cx,cy);x.scale(1,ry/rx);x.arc(0,0,rx,sa,ea,false);x.restore();}
  for(let t=0;t<6;t++){x.beginPath();ell(Rx+28+t*5,Ry+22+t*4,0,Math.PI);x.lineWidth=3;x.globalAlpha=0.18-t*0.025;x.strokeStyle=cg();x.stroke();}
  x.globalAlpha=1;
  x.beginPath();ell(Rx+16,Ry+12,0,Math.PI);x.lineWidth=7;x.strokeStyle=cg();x.stroke();
  for(let i=0;i<44;i++){const a=i/44*Math.PI;x.beginPath();x.arc(cx+Math.cos(a)*(Rx+16),cy+Math.sin(a)*(Ry+12),2,0,2*Math.PI);x.fillStyle=i%2===0?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.12)';x.fill();}
  x.beginPath();ell(Rx+7,Ry+4,0,Math.PI);x.lineWidth=5;x.strokeStyle='#0a1628';x.stroke();
  x.beginPath();ell(Rx+1,Ry,0,Math.PI);x.lineWidth=5;x.strokeStyle=cg();x.stroke();
  for(let i=0;i<36;i++){const a=i/36*Math.PI;x.beginPath();x.arc(cx+Math.cos(a)*(Rx+1),cy+Math.sin(a)*Ry,2,0,2*Math.PI);x.fillStyle=i%2===0?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.15)';x.fill();}
  for(let i=0;i<N;i++){const sa=i*ARC,ea=sa+ARC;x.beginPath();x.moveTo(cx,cy);for(let s=0;s<=30;s++){const a=sa+s/30*ARC;x.lineTo(cx+Math.cos(a)*Rx,cy+Math.sin(a)*Ry);}x.closePath();const rg=x.createRadialGradient(cx,cy,Ry*0.05,cx,cy,Rx);rg.addColorStop(0,SEGS[i].c[0]);rg.addColorStop(0.6,SEGS[i].c[1]);rg.addColorStop(1,SEGS[i].d);x.fillStyle=rg;x.fill();x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(sa)*Rx,cy+Math.sin(sa)*Ry);x.lineWidth=1.5;x.strokeStyle='rgba(0,0,0,0.25)';x.stroke();}
  x.save();x.beginPath();x.moveTo(cx,cy);ell(Rx,Ry,0,Math.PI);x.closePath();x.clip();
  for(let k=0;k<3;k++){const sr=[0.85,0.55,0.35],si=[0.6,0.35,0.2];x.beginPath();for(let i=0;i<N*2;i++){const a=i*Math.PI/N,r=i%2===0?sr[k]:si[k],px=cx+Math.cos(a)*Rx*r,py=cy+Math.sin(a)*Ry*r;i===0?x.moveTo(px,py):x.lineTo(px,py);}x.closePath();x.fillStyle=COLS[k%5]+(0.10+k*0.05)+')';x.fill();}
  const gl=x.createRadialGradient(cx,cy,0,cx,cy,Ry*1.05);gl.addColorStop(0,'rgba(0,0,0,0)');gl.addColorStop(0.5,'rgba(0,0,0,0.05)');gl.addColorStop(0.8,'rgba(0,0,0,0.18)');gl.addColorStop(1,'rgba(0,0,0,0.35)');x.fillStyle=gl;x.fillRect(0,0,W,H);x.restore();
  x.beginPath();x.moveTo(cx-Rx-16,cy);x.lineTo(cx+Rx+16,cy);x.lineWidth=7;x.strokeStyle=cg();x.stroke();
  for(let i=0;i<24;i++){const dx=cx-Rx-10+i*(Rx*2+20)/23;x.beginPath();x.arc(dx,cy,2,0,2*Math.PI);x.fillStyle=i%2===0?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.12)';x.fill();}
  x.save();x.translate(cx,cy+Ry*0.52);x.font='900 34px Poppins,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='rgba(255,255,255,0.04)';x.fillText('DEALER',0,0);x.restore();
}
function drawPlayer(cv) {
  const x=cv.getContext('2d'),W=880,H=440,cx=W/2,cy=H-10,Rx=390,Ry=340;
  function cg(){const g=x.createConicGradient(Math.PI,cx,cy);g.addColorStop(0,'#ff30ff');g.addColorStop(0.1,'#ffde59');g.addColorStop(0.25,'#30ff70');g.addColorStop(0.4,'#20f0ff');g.addColorStop(0.55,'#8050ff');g.addColorStop(0.7,'#ff30ff');g.addColorStop(0.85,'#ffde59');g.addColorStop(1,'#30ff70');return g;}
  function ell(rx,ry,sa,ea){x.save();x.translate(cx,cy);x.scale(1,ry/rx);x.arc(0,0,rx,sa,ea,true);x.restore();}
  for(let t=0;t<6;t++){x.beginPath();ell(Rx+28+t*5,Ry+22+t*4,0,-Math.PI);x.lineWidth=3;x.globalAlpha=0.18-t*0.025;x.strokeStyle=cg();x.stroke();}
  x.globalAlpha=1;
  x.beginPath();ell(Rx+16,Ry+12,0,-Math.PI);x.lineWidth=7;x.strokeStyle=cg();x.stroke();
  for(let i=0;i<44;i++){const a=-Math.PI+i/44*Math.PI;x.beginPath();x.arc(cx+Math.cos(a)*(Rx+16),cy+Math.sin(a)*(Ry+12),2,0,2*Math.PI);x.fillStyle=i%2===0?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.12)';x.fill();}
  x.beginPath();ell(Rx+7,Ry+4,0,-Math.PI);x.lineWidth=5;x.strokeStyle='#0a1628';x.stroke();
  x.beginPath();ell(Rx+1,Ry,0,-Math.PI);x.lineWidth=5;x.strokeStyle=cg();x.stroke();
  for(let i=0;i<36;i++){const a=-Math.PI+i/36*Math.PI;x.beginPath();x.arc(cx+Math.cos(a)*(Rx+1),cy+Math.sin(a)*Ry,2,0,2*Math.PI);x.fillStyle=i%2===0?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.15)';x.fill();}
  for(let i=0;i<N;i++){const sa=-Math.PI+i*ARC,ea=sa+ARC;x.beginPath();x.moveTo(cx,cy);for(let s=0;s<=30;s++){const a=sa+s/30*ARC;x.lineTo(cx+Math.cos(a)*Rx,cy+Math.sin(a)*Ry);}x.closePath();const rg=x.createRadialGradient(cx,cy,Ry*0.05,cx,cy,Rx);rg.addColorStop(0,SEGS[i].c[0]);rg.addColorStop(0.6,SEGS[i].c[1]);rg.addColorStop(1,SEGS[i].d);x.fillStyle=rg;x.fill();x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(sa)*Rx,cy+Math.sin(sa)*Ry);x.lineWidth=1.5;x.strokeStyle='rgba(0,0,0,0.25)';x.stroke();}
  x.save();x.beginPath();x.moveTo(cx,cy);ell(Rx,Ry,0,-Math.PI);x.closePath();x.clip();
  for(let k=0;k<3;k++){const sr=[0.85,0.55,0.35],si=[0.6,0.35,0.2];x.beginPath();for(let i=0;i<N*2;i++){const a=-Math.PI+i*Math.PI/N,r=i%2===0?sr[k]:si[k],px=cx+Math.cos(a)*Rx*r,py=cy+Math.sin(a)*Ry*r;i===0?x.moveTo(px,py):x.lineTo(px,py);}x.closePath();x.fillStyle=COLS[k%5]+(0.10+k*0.05)+')';x.fill();}
  const gl=x.createRadialGradient(cx,cy,0,cx,cy,Ry*1.05);gl.addColorStop(0,'rgba(0,0,0,0)');gl.addColorStop(0.5,'rgba(0,0,0,0.05)');gl.addColorStop(0.8,'rgba(0,0,0,0.18)');gl.addColorStop(1,'rgba(0,0,0,0.35)');x.fillStyle=gl;x.fillRect(0,0,W,H);x.restore();
  x.beginPath();x.moveTo(cx-Rx-16,cy);x.lineTo(cx+Rx+16,cy);x.lineWidth=7;x.strokeStyle=cg();x.stroke();
  for(let i=0;i<24;i++){const dx=cx-Rx-10+i*(Rx*2+20)/23;x.beginPath();x.arc(dx,cy,2,0,2*Math.PI);x.fillStyle=i%2===0?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.12)';x.fill();}
  x.save();x.translate(cx,cy-Ry*0.52);x.font='900 34px Poppins,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='rgba(255,255,255,0.04)';x.fillText('BLACKJACK',0,0);x.font='600 12px Poppins,sans-serif';x.fillStyle='rgba(255,255,255,0.06)';x.fillText('PAYS 3 TO 2',0,24);x.restore();
}
onMounted(async () => {
  await ensureProfile();
  drawDealer(canvasD.value);
  drawPlayer(canvasP.value);
});
/* ── GAME LOGIC ── */
async function deal() {
  if (on.value||loading.value) return;
  if (!selToken.value||!selChain.value) { error.value='Select a token first'; return; }
  if (betAmt.value<=0||betAmt.value>curBal()) { error.value='Insufficient balance'; return; }
  error.value=null; loading.value=true; msg.value=''; msgCls.value='';
  try {
    const data = await api.blackjackStart({ amount: betAmt.value, token: selToken.value, chain: selChain.value });
    sessionId.value=data.sessionId;
    playerCards.value=data.player;
    dealerCards.value=data.dealer;
    playerScore.value=data.playerVal;
    dealerScore.value=data.dealer[0].r!=='?'?data.dealer[0].r:'';
    fetchProfile();
    if (data.result) handleResult(data);
    else { on.value=true; done.value=false; }
  } catch(err) { error.value=err.message; }
  finally { loading.value=false; }
}
async function doAction(act) {
  if (!on.value||done.value||loading.value) return;
  error.value=null; loading.value=true;
  try {
    const data = await api.blackjackAction(sessionId.value, act);
    playerCards.value=data.player;
    playerScore.value=data.playerVal||bjVal(data.player);
    if (data.done===false) { loading.value=false; return; }
    handleResult(data);
  } catch(err) { error.value=err.message; }
  finally { loading.value=false; }
}
function handleResult(data) {
  on.value=false; done.value=true;
  if (data.dealer) dealerCards.value=data.dealer;
  if (data.dealerVal!=null) dealerScore.value=data.dealerVal;
  if (data.playerVal!=null) playerScore.value=data.playerVal;
  const r=data.result;
  if (r==='bust')        { msg.value='BUST!';                           msgCls.value='msg-l'; }
  else if (r==='lose')   { msg.value='DEALER WINS';                     msgCls.value='msg-l'; }
  else if (r==='dealer_bust') { msg.value='DEALER BUSTS! +'+data.payout.toFixed(6); msgCls.value='msg-w'; }
  else if (r==='blackjack')   { msg.value='BLACKJACK! +'+data.payout.toFixed(6);    msgCls.value='msg-w'; }
  else if (r==='win')    { msg.value='YOU WIN! +'+data.payout.toFixed(6); msgCls.value='msg-w'; }
  else if (r==='push')   { msg.value='PUSH';                            msgCls.value='msg-d'; }
  fetchProfile();
}
</script>
<style scoped>
.bj-game{display:flex;flex-direction:column;align-items:center;padding:10px 0 20px;max-width:440px;margin:0 auto;font-family:'Poppins',sans-serif}
.topbar{display:flex;justify-content:center;width:100%;padding:10px 16px 0}
.bal-box{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:5px 14px;display:flex;align-items:center;gap:6px}
.bal-lbl{color:#6b82a0;font-size:10px;font-weight:600}.bal-v{color:#3df06a;font-size:15px;font-weight:800}
.title{font-size:20px;font-weight:900;margin:6px 0;background:linear-gradient(90deg,#3df06a,#20f0ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
.tw{position:relative;width:440px;flex-shrink:0}
.tw-d{height:260px;margin-top:6px}.tw-p{height:220px}
.tw canvas{width:440px;height:100%}
.overlay{position:absolute;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:3px;z-index:5}
.ov-dealer{top:50px}.ov-player{bottom:36px}
.hand-label{font-size:12px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:1px}
.hand-score{font-size:16px;font-weight:900;color:#fff}
.cards{display:flex;justify-content:center;min-height:78px;align-items:center}
.card{width:54px;height:76px;border-radius:8px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.4);margin-left:-8px;animation:dealIn .4s ease-out}
.card:first-child{margin-left:0}
.card-back{background:linear-gradient(135deg,#1a3a5c,#0e2240);border:3px solid #2a4a6a;color:rgba(255,255,255,0.15);font-size:24px;font-weight:900}
.card .suit{font-size:22px;line-height:1}.card .rank{font-size:13px;font-weight:900;line-height:1}
.card.red{color:#cc1111}.card.black{color:#111}
@keyframes dealIn{0%{transform:translateY(-30px) rotateY(90deg);opacity:0}100%{transform:translateY(0) rotateY(0);opacity:1}}
.msg{font-size:17px;font-weight:800;text-align:center;min-height:24px;margin:2px 0;color:#fff}
.msg-w{color:#3df06a}.msg-l{color:#ff4040}.msg-d{color:#ffa830}
.ctrl{width:100%;padding:0 16px;margin-top:6px;display:flex;flex-direction:column;gap:6px}
.row{display:flex;gap:8px;align-items:flex-end;width:100%}.field{flex:1}
.lbl{color:#6b82a0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px}
.inp{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:7px 12px;color:#fff;font-size:14px;font-weight:700;font-family:'Poppins',sans-serif;width:100%;outline:none}
.quick-bets{display:flex;gap:4px;padding-bottom:0}
.qb{padding:7px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#6b82a0;font-size:11px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .15s}
.qb:hover{color:#fff;border-color:rgba(255,255,255,.2)}.qb:disabled{opacity:.3;cursor:not-allowed}
.btn{padding:12px;border-radius:24px;border:none;font-size:14px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;transition:transform .15s;flex:1}
.btn:hover{transform:scale(1.03)}.btn:active{transform:scale(.97)}.btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
.btn-g{background:linear-gradient(180deg,#3df06a,#22b845);color:#fff;box-shadow:0 4px 20px rgba(52,220,89,0.4)}
.btn-o{background:linear-gradient(180deg,#ffa830,#e08800);color:#fff;box-shadow:0 4px 20px rgba(255,160,40,0.3)}
.btn-p{background:linear-gradient(180deg,#c050ff,#9030cc);color:#fff;box-shadow:0 4px 20px rgba(180,60,255,0.3)}
.token-row{display:flex;gap:4px;flex-wrap:wrap;justify-content:center}
.tok{padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#6b82a0;font-size:10px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif}
.tok.on{border-color:#3df06a44;background:rgba(61,240,106,.06);color:#3df06a}
.tok:disabled{opacity:.4;cursor:not-allowed}
.tok-c{font-size:7px;opacity:.6;margin-left:2px}
.no-funds{text-align:center;padding:20px;width:100%}
.no-funds p{color:#6b82a0;font-size:13px;font-weight:600;margin-bottom:10px}
.no-funds .btn{display:inline-block;text-decoration:none;padding:12px 40px}
.err{color:#ff6b6b;font-size:11px;font-weight:600;text-align:center;background:rgba(255,64,64,.08);padding:8px;border-radius:8px;width:100%}
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