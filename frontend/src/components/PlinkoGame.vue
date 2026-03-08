<template>
  <div class="plinko-game">
    <div class="topbar"><div class="bal-box"><span class="bal-lbl">Balance</span><span class="bal-v">{{ fmtBal() }}</span></div></div>
    <div class="title">⚡ Plinko</div>
    <div class="gframe"><div class="gf-in"><div class="gf-body">
      <canvas ref="cv" :width="W" :height="H" class="cv"></canvas>
    </div></div></div>
    <div class="ctrl">
      <div class="token-row" v-if="tokenList.length>1">
        <button v-for="t in tokenList" :key="t.token+t.chain" :class="['tok',selToken===t.token&&selChain===t.chain?'on':'']" @click="selToken=t.token;selChain=t.chain" :disabled="dropping">{{ t.token }}<span class="tok-c">{{ t.chain }}</span></button>
      </div>
      <div v-if="!tokenList.length" class="no-funds"><p>No funds available</p><router-link to="/deposit" class="btn btn-g">DEPOSIT</router-link></div>
      <template v-if="tokenList.length">
        <div class="bet-row">
          <div class="bet-label">Bet</div>
          <div class="bet-wrap">
            <input class="inp" type="number" v-model.number="betAmt" min="0.001" max="0.001" step="0.001" :disabled="dropping">
            <button class="qb" @click="betAmt=+((Math.max(0.001,betAmt/2)).toFixed(6))" :disabled="dropping">½</button>
            <button class="qb" @click="betAmt=Math.min(0.001,+((betAmt*2).toFixed(6)))" :disabled="dropping">2×</button>
            <button class="qb" @click="betAmt=Math.min(0.001,curBal())" :disabled="dropping">MAX</button>
          </div>
        </div>
        <button class="btn btn-g" @click="drop" :disabled="dropping||betAmt<=0">{{ dropping?'DROPPING...':'DROP BALL' }}</button>
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
const betAmt=ref(0.001),dropping=ref(false),error=ref(null);
const cv=ref(null);
const selToken=ref(''),selChain=ref('');
const showResult=ref(false),resultWin=ref(false),resultAmt=ref(''),loseTitle=ref('BETTER LUCK!');
const W=780,H=700,ROWS=12,gY=44,gX=52,sY=50;
const MULTS=[10,5,2,1,0.8,0.5,0.3,0.5,0.8,1,2,5,10];
const MCOL=['#ff4040','#ff6030','#ff8020','#ffa020','#ffc830','#3df06a','#20f0ff','#3df06a','#ffc830','#ffa020','#ff8020','#ff6030','#ff4040'];
let balls=[],litSlot=-1;
const tokenList=computed(()=>balances.value||[]);
function showOverlay(win,amt,title){
  resultWin.value=win;resultAmt.value=amt;if(title)loseTitle.value=title;
  showResult.value=true;setTimeout(()=>{showResult.value=false;},3500);
}
watch(tokenList,list=>{ if(list.length&&!selToken.value){selToken.value=list[0].token;selChain.value=list[0].chain;} },{immediate:true});
function curBal(){const b=(balances.value||[]).find(b=>b.token===selToken.value&&b.chain===selChain.value);return b?parseFloat(b.amount):0;}
function fmtBal(){return curBal().toFixed(6)+' '+selToken.value;}
function drawBg(){
  if(!cv.value)return;
  const x=cv.value.getContext('2d');
  x.clearRect(0,0,W,H);
  for(let r=0;r<ROWS;r++){
    const dots=r+3,rw=(dots-1)*gX,sx=(W-rw)/2;
    for(let c=0;c<dots;c++){
      const px=sx+c*gX,py=sY+r*gY;
      x.beginPath();x.arc(px,py,4.5,0,2*Math.PI);
      const pg=x.createRadialGradient(px-1,py-1,1,px,py,4.5);
      pg.addColorStop(0,'rgba(255,255,255,0.7)');pg.addColorStop(1,'rgba(255,255,255,0.2)');
      x.fillStyle=pg;x.fill();
    }
  }
  const slW=W/MULTS.length;
  for(let i=0;i<MULTS.length;i++){
    const sx2=i*slW,lit=i===litSlot;
    x.fillStyle=lit?MCOL[i]:MCOL[i]+'30';
    x.beginPath();x.roundRect(sx2+2,630,slW-4,55,6);x.fill();
    if(lit){x.shadowColor=MCOL[i];x.shadowBlur=20;x.fill();x.shadowBlur=0;}
    x.fillStyle=lit?'#fff':MCOL[i];
    x.font='700 14px Poppins';x.textAlign='center';x.textBaseline='middle';
    x.fillText(MULTS[i]+'×',sx2+slW/2,657);
  }
  for(const b of balls)drawBall(cv.value.getContext('2d'),b.x,b.y);
}
function drawBall(x2,bx,by){
  x2.beginPath();x2.arc(bx,by,12,0,2*Math.PI);
  const bg=x2.createRadialGradient(bx-2,by-2,1,bx,by,12);
  bg.addColorStop(0,'#fff');bg.addColorStop(0.6,'#e0e8ff');bg.addColorStop(1,'#a0c0ff');
  x2.fillStyle=bg;x2.shadowColor='#fff';x2.shadowBlur=20;x2.fill();x2.shadowBlur=0;
}
function animatePath(path,slot,win,amt){
  const steps=[];
  let posX=W/2;
  for(let r=0;r<ROWS;r++){
    const dots=r+3,rw=(dots-1)*gX,sx=(W-rw)/2;
    posX+=path[r]*gX/2;
    posX=Math.max(sx,Math.min(sx+rw,posX));
    steps.push({x:posX,y:sY+r*gY});
  }
  const slW=W/MULTS.length;
  steps.push({x:slot*slW+slW/2,y:650});
  let bx=W/2,by=15,st=0;
  function anim(){
    drawBg();
    if(st<steps.length){
      const tgt=steps[st];
      bx+=(tgt.x-bx)*0.25;by+=(tgt.y-by)*0.25;
      if(Math.abs(bx-tgt.x)<2&&Math.abs(by-tgt.y)<2)st++;
      if(cv.value)drawBall(cv.value.getContext('2d'),bx,by);
      requestAnimationFrame(anim);
    }else{
      litSlot=slot;balls.push({x:bx,y:by});drawBg();
      setTimeout(()=>{ balls=[];litSlot=-1;drawBg();dropping.value=false;showOverlay(win,amt); },1000);
    }
  }
  requestAnimationFrame(anim);
}
async function drop(){
  if(dropping.value||betAmt.value<=0)return;
  if(!selToken.value||!selChain.value){error.value='Select a token first';return;}
  if(betAmt.value>0.001){error.value='Max bet: 0.001';return;}
  if(betAmt.value>curBal()){error.value='Insufficient balance';return;}
  error.value=null;dropping.value=true;showResult.value=false;
  try{
    const data=await api.playGame('plinko',{amount:betAmt.value,token:selToken.value,chain:selChain.value});
    const amt=data.win?'+'+data.payout.toFixed(6)+' '+selToken.value:'-'+betAmt.value.toFixed(6)+' '+selToken.value;
    animatePath(data.result.path,data.result.slot,data.win,amt);
    fetchProfile();
  }catch(err){error.value=err.message;dropping.value=false;}
}
onMounted(async()=>{ await ensureProfile(); drawBg(); });
</script>
<style scoped>
.plinko-game{display:flex;flex-direction:column;align-items:center;padding:10px 16px 20px;max-width:420px;margin:0 auto;font-family:'Poppins',sans-serif}
.topbar{display:flex;justify-content:center;width:100%;padding:10px 0}
.bal-box{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:5px 14px;display:flex;align-items:center;gap:6px}
.bal-lbl{color:#6b82a0;font-size:10px;font-weight:600}.bal-v{color:#3df06a;font-size:15px;font-weight:800}
.title{font-size:20px;font-weight:900;margin:8px 0;background:linear-gradient(90deg,#20f0ff,#8050ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
.gframe{width:100%;padding:3px;border-radius:18px;background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff);margin-top:12px}
.gf-in{background:#0c1a30;border-radius:16px;padding:6px}
.gf-body{background:linear-gradient(180deg,#0e1f38,#0a1628);border-radius:12px;overflow:hidden}
.cv{width:100%;height:380px;display:block}
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