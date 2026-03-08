<template>
  <div class="spin-game">
    <div class="topbar"><div class="bal-box"><span class="bal-lbl">Balance</span><span class="bal-v">{{ fmtBal() }}</span></div></div>
    <h2 class="spin-title">Spin the Wheel</h2>
    <div class="spin-sub">Try your luck!</div>
    <div class="wheel-area">
      <canvas ref="arrowCanvas" class="arrow-canvas" width="88" height="100"></canvas>
      <canvas ref="wheelCanvas" class="wheel-canvas" width="880" height="880" :style="{transform:`rotate(${currentAngle}deg)`,transition:wheelTransition}"></canvas>
      <div class="center-cap"><div class="center-cap-inner"></div></div>
    </div>
    <div class="ctrl">
      <div class="token-row" v-if="tokenList.length>1">
        <button v-for="t in tokenList" :key="t.token+t.chain" :class="['tok',selToken===t.token&&selChain===t.chain?'on':'']" @click="selToken=t.token;selChain=t.chain" :disabled="spinning">{{ t.token }}<span class="tok-c">{{ t.chain }}</span></button>
      </div>
      <div v-if="!tokenList.length" class="no-funds"><p>No funds available</p><router-link to="/deposit" class="btn btn-g">DEPOSIT</router-link></div>
      <template v-if="tokenList.length">
        <div class="bet-row">
          <div class="bet-label">Bet</div>
          <div class="bet-wrap">
            <input class="inp" type="number" v-model.number="betAmt" min="0.001" max="0.001" step="0.001" :disabled="spinning">
            <button class="qb" @click="betAmt=+((Math.max(0.001,betAmt/2)).toFixed(6))" :disabled="spinning">½</button>
            <button class="qb" @click="betAmt=Math.min(0.001,+((betAmt*2).toFixed(6)))" :disabled="spinning">2×</button>
            <button class="qb" @click="betAmt=Math.min(0.001,curBal())" :disabled="spinning">MAX</button>
          </div>
        </div>
        <button class="spin-btn" @click="spin" :disabled="spinning||betAmt<=0">{{ spinning?'Spinning...':'SPIN' }}</button>
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
const segments=[
  {l:'100',c:['#ffb830','#ff7a00'],d:'#e06000'},{l:'200',c:['#ffe040','#ffc000'],d:'#d9a000'},
  {l:'300',c:['#30ff70','#00e050'],d:'#00b840'},{l:'400',c:['#20f0ff','#00d0f0'],d:'#00a8c8'},
  {l:'500',c:['#9060ff','#6a30ff'],d:'#5020d0'},{l:'600',c:['#ff50ff','#d830e0'],d:'#b020b8'},
  {l:'700',c:['#a0b0c0','#708898'],d:'#506878'},{l:'800',c:['#ff4040','#ff1515'],d:'#d00808'}
];
const n=segments.length,arc=2*Math.PI/n,W=880,cx=W/2,cy=W/2,R=385;
const wheelCanvas=ref(null),arrowCanvas=ref(null);
const spinning=ref(false),error=ref(null);
const currentAngle=ref(0),wheelTransition=ref('none');
const betAmt=ref(0.001),selToken=ref(''),selChain=ref('');
const showResult=ref(false),resultWin=ref(false),resultAmt=ref(''),loseTitle=ref('BETTER LUCK!');
const tokenList=computed(()=>balances.value||[]);
function showOverlay(win,amt,title){
  resultWin.value=win;resultAmt.value=amt;if(title)loseTitle.value=title;
  showResult.value=true;setTimeout(()=>{showResult.value=false;},3500);
}
watch(tokenList,list=>{ if(list.length&&!selToken.value){selToken.value=list[0].token;selChain.value=list[0].chain;} },{immediate:true});
function curBal(){const b=(balances.value||[]).find(b=>b.token===selToken.value&&b.chain===selChain.value);return b?parseFloat(b.amount):0;}
function fmtBal(){return curBal().toFixed(6)+' '+selToken.value;}
const conicGrad=(ctx)=>{const g=ctx.createConicGradient(0,cx,cy);g.addColorStop(0,'#ff30ff');g.addColorStop(0.07,'#ff70ff');g.addColorStop(0.15,'#ffde59');g.addColorStop(0.22,'#ffa000');g.addColorStop(0.32,'#30ff70');g.addColorStop(0.42,'#20f0ff');g.addColorStop(0.52,'#00c8e0');g.addColorStop(0.62,'#8050ff');g.addColorStop(0.72,'#e040f0');g.addColorStop(0.82,'#ff5070');g.addColorStop(0.92,'#ff3030');g.addColorStop(1,'#ff30ff');return g;};
const drawStar=(ctx,pts,oR,iR,rot)=>{ctx.beginPath();for(let i=0;i<pts*2;i++){const a=rot+i*Math.PI/pts-Math.PI/2,r=i%2===0?oR:iR;if(i===0)ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);else ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}ctx.closePath();};
const drawWheel=()=>{
  const cv=wheelCanvas.value;if(!cv)return;
  const x=cv.getContext('2d');x.clearRect(0,0,W,W);
  const gc=conicGrad(x);
  for(let t=0;t<7;t++){x.beginPath();x.arc(cx,cy,R+34+t*5,0,2*Math.PI);x.lineWidth=4;x.globalAlpha=0.22-t*0.028;x.strokeStyle=gc;x.stroke();}
  x.globalAlpha=1;
  x.beginPath();x.arc(cx,cy,R+24,0,2*Math.PI);x.lineWidth=9;x.strokeStyle=gc;x.stroke();
  for(let i=0;i<64;i++){const a=(i/64)*Math.PI*2;x.beginPath();x.arc(cx+Math.cos(a)*(R+24),cy+Math.sin(a)*(R+24),2,0,2*Math.PI);x.fillStyle=i%2===0?'rgba(255,255,255,0.65)':'rgba(255,255,255,0.12)';x.fill();}
  x.beginPath();x.arc(cx,cy,R+15,0,2*Math.PI);x.lineWidth=7;x.strokeStyle='#0a1628';x.stroke();
  x.beginPath();x.arc(cx,cy,R+7,0,2*Math.PI);x.lineWidth=10;x.strokeStyle=gc;x.stroke();
  for(let i=0;i<52;i++){const a=(i/52)*Math.PI*2;x.beginPath();x.arc(cx+Math.cos(a)*(R+7),cy+Math.sin(a)*(R+7),2.5,0,2*Math.PI);x.fillStyle=i%2===0?'rgba(255,255,255,0.8)':'rgba(255,255,255,0.18)';x.fill();}
  for(let i=0;i<n;i++){
    const sa=i*arc-Math.PI/2,ea=sa+arc,ma=sa+arc/2,seg=segments[i];
    const rg=x.createRadialGradient(cx,cy,R*0.08,cx,cy,R);
    rg.addColorStop(0,seg.c[0]);rg.addColorStop(0.35,seg.c[0]);rg.addColorStop(0.7,seg.c[1]);rg.addColorStop(1,seg.d);
    x.beginPath();x.moveTo(cx,cy);x.arc(cx,cy,R,sa,ea);x.closePath();x.fillStyle=rg;x.fill();
    x.save();x.beginPath();x.moveTo(cx,cy);x.arc(cx,cy,R,sa,ea);x.closePath();x.clip();
    drawStar(x,n,R*0.94,R*0.56,Math.PI/n);x.fillStyle=seg.d+'40';x.fill();
    drawStar(x,n,R*0.60,R*0.38,0);x.fillStyle=seg.d+'35';x.fill();
    drawStar(x,n,R*0.38,R*0.22,Math.PI/n*0.5);x.fillStyle=seg.d+'28';x.fill();
    x.beginPath();x.moveTo(cx,cy);x.arc(cx,cy,R*0.6,sa+arc*0.12,ea-arc*0.12);x.closePath();x.fillStyle='rgba(255,255,255,0.04)';x.fill();
    x.restore();
    x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(sa)*R,cy+Math.sin(sa)*R);x.lineWidth=2.5;x.strokeStyle='rgba(0,0,0,0.2)';x.stroke();
    x.save();x.translate(cx,cy);x.rotate(ma);x.textBaseline='middle';
    const tx=R*0.58;
    x.fillStyle='rgba(0,0,0,0.35)';x.textAlign='right';x.font='900 54px Poppins,sans-serif';x.fillText('$',tx-2,4);x.textAlign='left';x.font='800 42px Poppins,sans-serif';x.fillText(seg.l,tx+2,4);
    x.fillStyle='#fff';x.textAlign='right';x.font='900 54px Poppins,sans-serif';x.fillText('$',tx-2,0);x.textAlign='left';x.font='800 42px Poppins,sans-serif';x.fillText(seg.l,tx+2,0);
    x.restore();
  }
  x.beginPath();x.arc(cx,cy,56,0,2*Math.PI);x.lineWidth=3;x.strokeStyle='rgba(255,255,255,0.06)';x.stroke();
};
const drawArrow=()=>{
  const ac=arrowCanvas.value;if(!ac)return;
  const ax=ac.getContext('2d');ax.clearRect(0,0,88,100);
  const ag=ax.createLinearGradient(0,0,88,0);
  ag.addColorStop(0,'#ff50ff');ag.addColorStop(0.3,'#ffde59');ag.addColorStop(0.6,'#30ff70');ag.addColorStop(1,'#20f0ff');
  ax.beginPath();ax.roundRect(24,0,40,16,5);ax.fillStyle=ag;ax.fill();
  const tg=ax.createLinearGradient(14,16,74,68);
  tg.addColorStop(0,'#ff50ff');tg.addColorStop(0.25,'#ffde59');tg.addColorStop(0.5,'#30ff70');tg.addColorStop(0.75,'#20f0ff');tg.addColorStop(1,'#8050ff');
  ax.beginPath();ax.moveTo(14,16);ax.lineTo(74,16);ax.lineTo(44,68);ax.closePath();ax.fillStyle=tg;ax.fill();
};
async function spin(){
  if(spinning.value||betAmt.value<=0)return;
  if(!selToken.value||!selChain.value){error.value='Select a token first';return;}
  if(betAmt.value>0.001){error.value='Max bet: 0.001';return;}
  if(betAmt.value>curBal()){error.value='Insufficient balance';return;}
  error.value=null;spinning.value=true;showResult.value=false;
  try{
    const data=await api.playGame('wheel',{amount:betAmt.value,token:selToken.value,chain:selChain.value});
    const segAngle=360/n;
    const targetAngle=360-(data.result.segment*segAngle+segAngle/2)+90;
    const totalRot=currentAngle.value+(5+Math.random()*3)*360+(targetAngle%360);
    wheelTransition.value='none';
    requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ wheelTransition.value='transform 4.5s cubic-bezier(0.13,0.55,0.08,1)'; currentAngle.value=totalRot; }); });
    setTimeout(()=>{
      spinning.value=false;fetchProfile();
      const amt=data.win?'+'+data.payout.toFixed(6)+' '+selToken.value:'-'+betAmt.value.toFixed(6)+' '+selToken.value;
      showOverlay(data.win,amt);
    },4800);
  }catch(err){error.value=err.message;spinning.value=false;}
}
onMounted(async()=>{ await ensureProfile(); drawWheel(); drawArrow(); });
</script>
<style scoped>
.spin-game{display:flex;flex-direction:column;align-items:center;padding:0 16px 20px;max-width:420px;margin:0 auto;font-family:'Poppins',sans-serif}
.topbar{display:flex;justify-content:center;width:100%;padding:10px 0}
.bal-box{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:5px 14px;display:flex;align-items:center;gap:6px}
.bal-lbl{color:#6b82a0;font-size:10px;font-weight:600}.bal-v{color:#3df06a;font-size:15px;font-weight:800}
.spin-title{color:#fff;font-size:28px;font-weight:800;letter-spacing:-0.5px;margin-top:8px}
.spin-sub{color:#6b82a0;font-size:13px;font-weight:600;margin-top:4px}
.wheel-area{position:relative;margin-top:16px;width:100%;max-width:340px;aspect-ratio:1;flex-shrink:0}
.arrow-canvas{position:absolute;top:-4px;left:50%;transform:translateX(-50%);z-index:10;width:34px;height:40px}
.wheel-canvas{width:100%;height:100%}
.center-cap{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:42px;height:42px;border-radius:50%;z-index:5;padding:4px;background:conic-gradient(#ff2dff,#ffde59,#00ff6a,#00e5ff,#7c4dff,#ff2dff);box-shadow:0 3px 20px rgba(0,0,0,.6)}
.center-cap-inner{width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 38% 32%,#1e3050,#080e1a)}
.ctrl{width:100%;margin-top:16px;display:flex;flex-direction:column;gap:8px;padding-bottom:10px}
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
.spin-btn{background:linear-gradient(180deg,#3df06a,#22b845);color:#fff;border:none;padding:14px;border-radius:30px;font-size:18px;font-weight:700;cursor:pointer;box-shadow:0 4px 28px rgba(52,220,89,.5);transition:transform .15s;font-family:'Poppins',sans-serif;width:100%}
.spin-btn:active:not(:disabled){transform:scale(.97)}.spin-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
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