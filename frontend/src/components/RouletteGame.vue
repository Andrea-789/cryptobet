<template>
  <div class="roulette-game">
    <div class="topbar"><div class="bal-box"><span class="bal-lbl">Balance</span><span class="bal-v">{{ fmtBal() }}</span></div></div>
    <h2 class="title">🎰 Roulette</h2>
    <div class="gframe"><div class="gf-in"><div class="gf-body">
      <div class="wheel-box">
        <div class="ptr"><div class="pg"></div><div class="pt"></div></div>
        <canvas ref="whl" width="540" height="540" class="whl-cv"></canvas>
        <div class="wc"><div class="wc-in" :style="{color:wcColor}">{{ wcNum }}</div></div>
      </div>
      <div class="last-nums">
        <div v-for="(n2,i) in lastResults" :key="i" class="ln" :class="'ln-'+numClr(n2)">{{ n2 }}</div>
      </div>
    </div></div></div>
    <div class="board">
      <div class="board-title">Place Your Bet</div>
      <div class="zero-row"><div class="zero-cell" :class="{sel:curBetKey==='0'}" @click="selectBet('0')">0</div></div>
      <div class="num-grid">
        <template v-for="row in boardNums"><div v-for="num in row" :key="num" class="nc" :class="['nc-'+numClr(num),{sel:curBetKey===String(num)}]" @click="selectBet(String(num))">{{ num }}</div></template>
      </div>
      <div class="outside">
        <div v-for="b in outsideBets" :key="b.k" class="oc" :class="[b.cls||'',{sel:curBetKey===b.k}]" @click="selectBet(b.k)">{{ b.l }}</div>
      </div>
    </div>
    <div class="ctrl">
      <div class="token-row" v-if="tokenList.length>1">
        <button v-for="t in tokenList" :key="t.token+t.chain" :class="['tok',selToken===t.token&&selChain===t.chain?'on':'']" @click="selToken=t.token;selChain=t.chain" :disabled="spinning">{{ t.token }}<span class="tok-c">{{ t.chain }}</span></button>
      </div>
      <div v-if="!tokenList.length" class="no-funds"><p>No funds available</p><router-link to="/deposit" class="btn btn-g">DEPOSIT</router-link></div>
      <template v-if="tokenList.length">
        <div class="bet-row">
          <div class="bet-label">Bet Amount</div>
          <div class="bet-wrap">
            <input class="inp" type="number" v-model.number="chipVal" min="0.0001" max="0.001" step="0.0001" :disabled="spinning">
            <button class="qb" @click="chipVal=+((Math.max(0.0001,chipVal/2)).toFixed(6))" :disabled="spinning">½</button>
            <button class="qb" @click="chipVal=Math.min(0.001,+((chipVal*2).toFixed(6)))" :disabled="spinning">2×</button>
            <button class="qb" @click="chipVal=Math.min(0.001,curBal())" :disabled="spinning">MAX</button>
          </div>
        </div>
        <div class="chips">
          <button v-for="c in chips" :key="c" class="chip" :class="{on:chipVal===c}" @click="chipVal=c" :disabled="spinning">{{ c }}</button>
        </div>
        <div class="sel-info" v-if="curBetKey">Selected: <b>{{ curBetKey }}</b> — {{ chipVal }} {{ selToken }}</div>
        <div class="row2">
          <button class="btn-clr" @click="curBetKey=null" :disabled="spinning">CLEAR</button>
          <button class="btn btn-g" @click="spinWheel" :disabled="spinning||loading||!curBetKey" style="flex:2">{{ loading?'...':'SPIN' }}</button>
        </div>
        <p v-if="error" class="err">{{ error }}</p>
      </template>
    </div>
    <div class="result-overlay" :class="{show:showResult,win:resultWin}" @click="showResult=false">
      <div class="ro-border"><div class="ro-inner">
        <div class="ro-icon">{{ resultWin?'🏆':'😔' }}</div>
        <h3 class="ro-title">{{ resultWin?'YOU WIN!':loseTitle }}</h3>
        <p class="ro-amt">{{ resultAmt }}</p>
        <div class="ro-num">{{ winNum }}</div>
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
const NUMS=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const N=NUMS.length,ARC=2*Math.PI/N;
const spinning=ref(false),loading=ref(false),error=ref(null),lastResults=ref([]);
const wcNum=ref('-'),wcColor=ref('#fff');
const showResult=ref(false),resultWin=ref(false),resultAmt=ref(''),loseTitle=ref('BETTER LUCK!'),winNum=ref('');
const whl=ref(null);
let wheelAngle=0;
const selToken=ref(''),selChain=ref('');
const chipVal=ref(0.001),curBetKey=ref(null);
const chips=[0.0001,0.0002,0.0005,0.001];
const tokenList=computed(()=>balances.value||[]);
function showOverlay(win,amt,title,num){
  resultWin.value=win;resultAmt.value=amt;if(title)loseTitle.value=title;
  winNum.value=num!=null?'Number: '+num:'';
  showResult.value=true;setTimeout(()=>{showResult.value=false;},3500);
}
watch(tokenList,list=>{ if(list.length&&!selToken.value){selToken.value=list[0].token;selChain.value=list[0].chain;} },{immediate:true});
function curBal(){const b=(balances.value||[]).find(b=>b.token===selToken.value&&b.chain===selChain.value);return b?parseFloat(b.amount):0;}
function fmtBal(){return curBal().toFixed(6)+' '+selToken.value;}
function isRed(n){return RED.includes(n);}
function numClr(n){if(n===0)return'g';return isRed(n)?'r':'b';}
const boardNums=[[3,6,9,12,15,18,21,24,27,30,33,36],[2,5,8,11,14,17,20,23,26,29,32,35],[1,4,7,10,13,16,19,22,25,28,31,34]];
const outsideBets=[{l:'1-12',k:'1-12'},{l:'13-24',k:'13-24'},{l:'25-36',k:'25-36'},{l:'Even',k:'even'},{l:'Red',k:'red',cls:'oc-r'},{l:'Black',k:'black',cls:'oc-bk'},{l:'Odd',k:'odd'},{l:'1-18',k:'1-18'},{l:'19-36',k:'19-36'}];
function selectBet(k){if(!spinning.value)curBetKey.value=k;}
function mapBet(k){
  const n=parseInt(k);
  if(!isNaN(n)&&n>=0&&n<=36)return{betType:'number',betValue:n};
  if(k==='red')return{betType:'color',betValue:'red'};
  if(k==='black')return{betType:'color',betValue:'black'};
  if(k==='even')return{betType:'even_odd',betValue:'even'};
  if(k==='odd')return{betType:'even_odd',betValue:'odd'};
  if(k==='1-18')return{betType:'half',betValue:1};
  if(k==='19-36')return{betType:'half',betValue:2};
  if(k==='1-12')return{betType:'dozen',betValue:1};
  if(k==='13-24')return{betType:'dozen',betValue:2};
  if(k==='25-36')return{betType:'dozen',betValue:3};
  return null;
}
async function spinWheel(){
  if(spinning.value||loading.value||!curBetKey.value)return;
  if(!selToken.value||!selChain.value){error.value='Select a token first';return;}
  if(chipVal.value>0.001){error.value='Max bet: 0.001';return;}
  if(chipVal.value<=0||chipVal.value>curBal()){error.value='Insufficient balance';return;}
  error.value=null;loading.value=true;showResult.value=false;
  const mapped=mapBet(curBetKey.value);
  if(!mapped){error.value='Invalid bet';loading.value=false;return;}
  try{
    const data=await api.playGame('roulette',{amount:chipVal.value,token:selToken.value,chain:selChain.value,...mapped});
    loading.value=false;spinning.value=true;
    const rn=data.result.number,ri=NUMS.indexOf(rn);
    const sa=360/N,ta=360-ri*sa-sa/2,sp=5+Math.floor(Math.random()*4),td=sp*360+ta;
    const el=whl.value;
    if(el){
      el.style.transition='none';el.style.transform='rotate('+wheelAngle+'deg)';
      requestAnimationFrame(()=>{requestAnimationFrame(()=>{el.style.transition='transform 5s cubic-bezier(0.12,0.58,0.08,1)';el.style.transform='rotate('+td+'deg)';});});
    }
    setTimeout(()=>{
      wheelAngle=td%360;
      if(el){el.style.transition='none';el.style.transform='rotate('+wheelAngle+'deg)';}
      wcNum.value=rn;
      wcColor.value=rn===0?'#3df06a':isRed(rn)?'#ff4040':'#fff';
      lastResults.value=[rn,...lastResults.value].slice(0,10);
      const amt=data.win?'+'+data.payout.toFixed(6)+' '+selToken.value:'-'+chipVal.value.toFixed(6)+' '+selToken.value;
      showOverlay(data.win,amt,data.win?'YOU WIN!':'BETTER LUCK!',rn);
      curBetKey.value=null;spinning.value=false;fetchProfile();
    },5200);
  }catch(err){error.value=err.message;loading.value=false;}
}
function drawStar(ctx,cx,cy,r1,r2,pts){
  ctx.beginPath();
  for(let i=0;i<pts*2;i++){const a=i*Math.PI/pts-Math.PI/2,r=i%2===0?r2:r1;i===0?ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}
  ctx.closePath();
}
function drawWheel(){
  if(!whl.value)return;
  const cv=whl.value,ctx=cv.getContext('2d'),CX=270,CY=270,OR=252,NR=185;
  ctx.clearRect(0,0,540,540);
  for(let i=0;i<N;i++){
    const sa=i*ARC-Math.PI/2,ea=sa+ARC,num=NUMS[i];
    ctx.beginPath();ctx.arc(CX,CY,OR-2,sa,ea);ctx.arc(CX,CY,NR,ea,sa,true);ctx.closePath();
    const rg=ctx.createRadialGradient(CX,CY,NR,CX,CY,OR);
    if(num===0){rg.addColorStop(0,'#40ff80');rg.addColorStop(1,'#005818');}
    else if(isRed(num)){rg.addColorStop(0,'#ff5050');rg.addColorStop(1,'#880808');}
    else{rg.addColorStop(0,'#2a2a44');rg.addColorStop(1,'#0a0a14');}
    ctx.fillStyle=rg;ctx.fill();
    ctx.beginPath();ctx.moveTo(CX+Math.cos(sa)*NR,CY+Math.sin(sa)*NR);ctx.lineTo(CX+Math.cos(sa)*(OR-2),CY+Math.sin(sa)*(OR-2));ctx.lineWidth=1.5;ctx.strokeStyle='rgba(0,0,0,0.35)';ctx.stroke();
    ctx.save();ctx.translate(CX,CY);ctx.rotate(sa+ARC/2);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 14px Poppins';ctx.fillStyle='#fff';ctx.fillText(num,(OR+NR)/2,0);ctx.restore();
  }
  ctx.beginPath();ctx.arc(CX,CY,NR,0,2*Math.PI);ctx.lineWidth=4;
  const cg=ctx.createConicGradient(0,CX,CY);
  cg.addColorStop(0,'#ff30ff');cg.addColorStop(0.25,'#ffde59');cg.addColorStop(0.5,'#30ff70');cg.addColorStop(0.75,'#20f0ff');cg.addColorStop(1,'#ff30ff');
  ctx.strokeStyle=cg;ctx.stroke();
  const INNER6=[
    {h:'#ff6060',l:'#660000',star:'#ff9090'},{h:'#ffb840',l:'#884000',star:'#ffd080'},
    {h:'#ffee50',l:'#887000',star:'#fff080'},{h:'#40ff80',l:'#004818',star:'#90ffb0'},
    {h:'#40e8ff',l:'#003848',star:'#90f0ff'},{h:'#a060ff',l:'#300870',star:'#c090ff'}
  ];
  const SEG=2*Math.PI/6,IR=60;
  for(let s=0;s<6;s++){
    const sa2=s*SEG-Math.PI/2,ea2=sa2+SEG;
    ctx.beginPath();ctx.arc(CX,CY,NR-4,sa2,ea2);ctx.arc(CX,CY,IR,ea2,sa2,true);ctx.closePath();
    const rg=ctx.createRadialGradient(CX,CY,IR,CX,CY,NR);rg.addColorStop(0,INNER6[s].h);rg.addColorStop(1,INNER6[s].l);ctx.fillStyle=rg;ctx.fill();
    const midA=sa2+SEG/2;
    ctx.fillStyle=INNER6[s].star;
    for(let d=0;d<3;d++){
      const dist=IR+20+d*28,sx=CX+Math.cos(midA)*dist,sy=CY+Math.sin(midA)*dist,sz=3+d*1.5;
      ctx.save();ctx.translate(sx,sy);ctx.globalAlpha=0.55-d*0.1;drawStar(ctx,0,0,sz,sz*2.2,5);ctx.fill();ctx.globalAlpha=1;ctx.restore();
    }
  }
  ctx.beginPath();ctx.arc(CX,CY,IR,0,2*Math.PI);ctx.lineWidth=4;ctx.strokeStyle=cg;ctx.stroke();
  ctx.beginPath();ctx.arc(CX,CY,IR-3,0,2*Math.PI);ctx.fillStyle='#0a1628';ctx.fill();
  ctx.beginPath();ctx.arc(CX,CY,OR+2,0,2*Math.PI);ctx.lineWidth=6;ctx.strokeStyle=cg;ctx.stroke();
}
onMounted(async()=>{ await ensureProfile(); drawWheel(); });
</script>
<style scoped>
.roulette-game{display:flex;flex-direction:column;align-items:center;padding:10px 12px 20px;max-width:400px;margin:0 auto;font-family:'Poppins',sans-serif}
.topbar{display:flex;justify-content:center;width:100%;padding:10px 0}
.bal-box{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:5px 14px;display:flex;align-items:center;gap:6px}
.bal-lbl{color:#6b82a0;font-size:10px;font-weight:600}.bal-v{color:#3df06a;font-size:15px;font-weight:800}
.title{font-size:22px;font-weight:800;color:#fff;margin:8px 0}
.gframe{width:100%;padding:3px;border-radius:18px;background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff)}
.gf-in{background:#0c1a30;border-radius:16px;padding:6px}
.gf-body{background:linear-gradient(180deg,#0e1f38,#0a1628);border-radius:12px;padding:10px;display:flex;flex-direction:column;align-items:center}
.wheel-box{position:relative;width:270px;height:270px;margin:4px 0}
.whl-cv{width:270px;height:270px}
.ptr{position:absolute;top:-2px;left:50%;transform:translateX(-50%);z-index:10;display:flex;flex-direction:column;align-items:center}
.pg{width:14px;height:8px;border-radius:3px 3px 0 0;background:linear-gradient(90deg,#ff50ff,#ffde59)}
.pt{width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-top:20px solid #ffde59}
.wc{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:56px;height:56px;border-radius:50%;padding:3px;background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff);z-index:5}
.wc-in{width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 38% 32%,#1e3050,#080e1a);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900}
.last-nums{display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;justify-content:center}
.ln{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
.ln-r{background:rgba(255,40,40,.2);color:#ff4040;border:1px solid rgba(255,40,40,.4)}
.ln-b{background:rgba(255,255,255,.06);color:#fff;border:1px solid rgba(255,255,255,.12)}
.ln-g{background:rgba(61,240,106,.2);color:#3df06a;border:1px solid rgba(61,240,106,.4)}
.board{width:100%;margin-top:12px}
.board-title{font-size:11px;color:#6b82a0;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px}
.zero-row{margin-bottom:3px}
.zero-cell{height:30px;border-radius:6px;background:linear-gradient(135deg,#00cc50,#008830);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;cursor:pointer;border:2px solid transparent;color:#fff}
.zero-cell.sel{border-color:#ffde59;box-shadow:0 0 12px rgba(255,222,89,.5)}
.num-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:3px}
.nc{aspect-ratio:1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;cursor:pointer;transition:all .15s;border:2px solid transparent;color:#fff}
.nc:hover{transform:scale(1.15);z-index:2}.nc.sel{border-color:#ffde59;box-shadow:0 0 12px rgba(255,222,89,.5)}
.nc-r{background:linear-gradient(135deg,#dd1818,#881010)}
.nc-b{background:linear-gradient(135deg,#1a1a2e,#0e0e1a)}
.nc-g{background:linear-gradient(135deg,#00cc50,#006620)}
.outside{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:6px}
.oc{padding:8px 4px;border-radius:8px;background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.08);text-align:center;font-size:10px;font-weight:700;cursor:pointer;transition:all .15s;color:#ccc}
.oc:hover{background:rgba(255,255,255,.1)}.oc.sel{border-color:#ffde59;box-shadow:0 0 12px rgba(255,222,89,.5);color:#fff}
.oc-r{color:#ff5050}.oc-bk{color:#aaa}
.ctrl{width:100%;margin-top:12px;display:flex;flex-direction:column;gap:8px}
.bet-row{display:flex;flex-direction:column;gap:4px}
.bet-label{color:#6b82a0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px}
.bet-wrap{display:flex;align-items:center;gap:6px}
.inp{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 12px;color:#fff;font-size:14px;font-weight:700;font-family:'Poppins',sans-serif;outline:none;min-width:0}
.inp:disabled{opacity:.5;cursor:not-allowed}
.qb{padding:9px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#6b82a0;font-size:11px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .15s;white-space:nowrap}
.qb:hover{color:#fff;border-color:rgba(255,255,255,.2)}.qb:disabled{opacity:.3;cursor:not-allowed}
.chips{display:flex;gap:5px;justify-content:center}
.chip{padding:5px 12px;border-radius:20px;border:2px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .15s}
.chip:disabled{opacity:.4;cursor:not-allowed}
.chip.on{background:linear-gradient(180deg,#3df06a33,#22b84533);border-color:#3df06a;color:#3df06a}
.sel-info{text-align:center;font-size:11px;color:#fff;font-weight:600}
.row2{display:flex;gap:8px}
.btn-clr{padding:10px;border-radius:20px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#6b82a0;font-size:12px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;flex:1}
.btn{padding:13px;border-radius:24px;border:none;font-size:16px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;transition:transform .15s}
.btn:hover{transform:scale(1.03)}.btn:active{transform:scale(.97)}.btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-g{background:linear-gradient(180deg,#3df06a,#22b845);color:#fff;box-shadow:0 4px 24px rgba(52,220,89,.4)}
.token-row{display:flex;gap:4px;flex-wrap:wrap;justify-content:center}
.tok{padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#6b82a0;font-size:10px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif}
.tok.on{border-color:#3df06a44;background:rgba(61,240,106,.06);color:#3df06a}
.tok:disabled{opacity:.4;cursor:not-allowed}
.tok-c{font-size:7px;opacity:.6;margin-left:2px}
.err{color:#ff6b6b;font-size:11px;font-weight:600;text-align:center;background:rgba(255,64,64,.08);padding:8px;border-radius:8px;width:100%}
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
.ro-num{color:#fff;font-size:13px;margin-top:2px}
.ro-close{color:#6b82a0;font-size:10px;margin-top:10px}
</style>