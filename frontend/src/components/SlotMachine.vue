<template>
  <div class="slot-game">
    <div class="topbar"><div class="bal-box"><span class="bal-lbl">Balance</span><span class="bal-v">{{ fmtBal() }}</span></div></div>
    <h2 class="title">🍒 Lucky Slots</h2>
    <div class="sub">Hit 3 in a row to win big!</div>
    <div class="slot-frame"><div class="sf-in"><div class="sf-body">
      <div v-for="r in 3" :key="r-1" class="reel-wrap" :class="'rw-'+(r-1)">
        <div class="reel-hl"></div>
        <div class="reel" :style="{transform:'translateY('+reelOffsets[r-1]+'px)',transition:reelTransitions[r-1]}">
          <div v-for="(s,i) in reels[r-1]" :key="i" class="sym">{{ s }}</div>
        </div>
      </div>
    </div></div></div>
    <div class="ctrl">
      <div class="token-row" v-if="tokenList.length>1">
        <button v-for="t in tokenList" :key="t.token+t.chain" :class="['tok',selToken===t.token&&selChain===t.chain?'on':'']" @click="selToken=t.token;selChain=t.chain" :disabled="spinning">{{ t.token }}<span class="tok-c">{{ t.chain }}</span></button>
      </div>
      <div v-if="!tokenList.length" class="no-funds"><p>No funds available</p><router-link to="/deposit" class="btn btn-g">DEPOSIT</router-link></div>
      <template v-if="tokenList.length">
        <div class="bet-row">
          <div class="bet-label">Bet</div>
          <div class="bet-wrap">
            <input class="inp" type="number" v-model.number="bet" min="0.001" max="0.001" step="0.001" :disabled="spinning">
            <button class="qb" @click="bet=+((Math.max(0.001,bet/2)).toFixed(6))" :disabled="spinning">½</button>
            <button class="qb" @click="bet=Math.min(0.001,+((bet*2).toFixed(6)))" :disabled="spinning">2×</button>
            <button class="qb" @click="bet=Math.min(0.001,curBal())" :disabled="spinning">MAX</button>
          </div>
        </div>
        <button class="spin-btn" @click="spin" :disabled="spinning||loading">{{ loading?'...':'SPIN' }}</button>
        <p v-if="error" class="err">{{ error }}</p>
      </template>
    </div>
    <div class="payouts">
      <div class="pay-item"><span class="pi">🍒</span>×3 <span class="pv">5×</span></div>
      <div class="pay-item"><span class="pi">🍋</span>×3 <span class="pv">8×</span></div>
      <div class="pay-item"><span class="pi">💎</span>×3 <span class="pv">15×</span></div>
      <div class="pay-item"><span class="pi">7️⃣</span>×3 <span class="pv">25×</span></div>
      <div class="pay-item"><span class="pi">₿</span>×3 <span class="pv">50×</span></div>
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
const SYM=['🍒','🍋','🍊','💎','7️⃣','₿','⭐','🍀'];
const TOTAL=40,SYM_H=64;
const bet=ref(0.001),spinning=ref(false),loading=ref(false),error=ref(null);
const reels=ref([[],[],[]]),reelOffsets=ref([0,0,0]),reelTransitions=ref(['none','none','none']);
const selToken=ref(''),selChain=ref('');
const tokenList=computed(()=>balances.value||[]);
const showResult=ref(false),resultWin=ref(false),resultAmt=ref(''),loseTitle=ref('BETTER LUCK!');
function showOverlay(win,amt,title){
  resultWin.value=win;resultAmt.value=amt;if(title)loseTitle.value=title;
  showResult.value=true;setTimeout(()=>{showResult.value=false;},3500);
}
watch(tokenList,list=>{ if(list.length&&!selToken.value){selToken.value=list[0].token;selChain.value=list[0].chain;} },{immediate:true});
function curBal(){const b=(balances.value||[]).find(b=>b.token===selToken.value&&b.chain===selChain.value);return b?parseFloat(b.amount):0;}
function fmtBal(){return curBal().toFixed(6)+' '+selToken.value;}
function randSym(){return SYM[Math.floor(Math.random()*SYM.length)];}
function buildReel(target){const arr=[];for(let i=0;i<TOTAL;i++)arr.push(randSym());arr[TOTAL-2]=target;return arr;}
function initReels(){for(let r=0;r<3;r++){const arr=[];for(let i=0;i<TOTAL;i++)arr.push(randSym());reels.value[r]=arr;}}
async function spin(){
  if(spinning.value||loading.value)return;
  if(!selToken.value||!selChain.value){error.value='Select a token first';return;}
  if(bet.value>0.001){error.value='Max bet: 0.001';return;}
  if(bet.value<=0||bet.value>curBal()){error.value='Insufficient balance';return;}
  error.value=null;loading.value=true;
  try{
    const data=await api.playGame('slots',{amount:bet.value,token:selToken.value,chain:selChain.value});
    loading.value=false;spinning.value=true;
    const serverReels=data.result.reels;
    for(let r=0;r<3;r++){
      reels.value[r]=buildReel(serverReels[r]);
      const ty=-(TOTAL-3)*SYM_H;
      reelOffsets.value[r]=0;reelTransitions.value[r]='none';
      setTimeout(()=>{
        reelTransitions.value=[...reelTransitions.value];
        reelTransitions.value[r]='transform '+(1.8+r*0.35)+'s cubic-bezier(0.12,0.6,0.08,1)';
        reelOffsets.value=[...reelOffsets.value];
        reelOffsets.value[r]=ty;
      },50+r*220);
    }
    const totalDelay=1800+2*220+600+400;
    setTimeout(()=>{
      spinning.value=false;fetchProfile();
      const amt=data.win?'+'+data.payout.toFixed(6)+' '+selToken.value:'-'+bet.value.toFixed(6)+' '+selToken.value;
      showOverlay(data.win,amt);
    },totalDelay);
  }catch(err){error.value=err.message;loading.value=false;}
}
onMounted(async()=>{ await ensureProfile(); initReels(); });
</script>
<style scoped>
.slot-game{display:flex;flex-direction:column;align-items:center;padding:10px 16px 20px;max-width:390px;margin:0 auto;font-family:'Poppins',sans-serif}
.topbar{display:flex;justify-content:center;width:100%;padding:10px 0}
.bal-box{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:5px 14px;display:flex;align-items:center;gap:6px}
.bal-lbl{color:#6b82a0;font-size:10px;font-weight:600}.bal-v{color:#3df06a;font-size:15px;font-weight:800}
.title{color:#fff;font-size:22px;font-weight:800;margin:8px 0}
.sub{color:#6b82a0;font-size:13px;font-weight:600}
.slot-frame{margin-top:14px;padding:5px;border-radius:24px;background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff)}
.sf-in{padding:4px;border-radius:20px;background:#0a1628}
.sf-body{background:linear-gradient(180deg,#0e1f38,#0a1628);border-radius:14px;padding:12px 8px;display:flex;gap:6px;position:relative}
.reel-wrap{width:100px;height:190px;overflow:hidden;border-radius:14px;position:relative;border:2px solid rgba(255,255,255,.12)}
.rw-0{background:linear-gradient(180deg,#004870,#20e0ff,#003050);border-color:rgba(32,224,255,.6);box-shadow:inset 0 0 40px rgba(32,224,255,.25)}
.rw-1{background:linear-gradient(180deg,#cc6000,#ffb830,#804000);border-color:rgba(255,184,48,.6);box-shadow:inset 0 0 40px rgba(255,184,48,.25)}
.rw-2{background:linear-gradient(180deg,#008838,#30ff70,#005820);border-color:rgba(48,255,112,.6);box-shadow:inset 0 0 40px rgba(48,255,112,.25)}
.reel-wrap::before{content:'';position:absolute;top:0;left:0;right:0;height:55px;background:linear-gradient(180deg,#0e1f38f0,transparent);z-index:2;pointer-events:none}
.reel-wrap::after{content:'';position:absolute;bottom:0;left:0;right:0;height:55px;background:linear-gradient(0deg,#0e1f38f0,transparent);z-index:2;pointer-events:none}
.reel{display:flex;flex-direction:column;align-items:center;will-change:transform}
.reel-hl{position:absolute;top:50%;left:0;right:0;height:68px;transform:translateY(-50%);border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);z-index:1;pointer-events:none}
.sym{width:100px;height:64px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:40px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.4))}
.ctrl{margin-top:16px;display:flex;flex-direction:column;align-items:center;gap:8px;width:100%}
.bet-row{display:flex;flex-direction:column;gap:4px;width:100%}
.bet-label{color:#6b82a0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px}
.bet-wrap{display:flex;align-items:center;gap:6px;width:100%}
.inp{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 12px;color:#fff;font-size:14px;font-weight:700;font-family:'Poppins',sans-serif;outline:none;min-width:0}
.inp:disabled{opacity:.5;cursor:not-allowed}
.qb{padding:9px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#6b82a0;font-size:11px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .15s;white-space:nowrap}
.qb:hover{color:#fff;border-color:rgba(255,255,255,.2)}.qb:disabled{opacity:.3;cursor:not-allowed}
.spin-btn{width:85%;padding:16px;border-radius:30px;border:none;background:linear-gradient(180deg,#3df06a,#22b845);color:#fff;font-size:20px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;box-shadow:0 4px 28px rgba(52,220,89,.5);transition:transform .15s}
.spin-btn:hover{transform:scale(1.03)}.spin-btn:active{transform:scale(.97)}.spin-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.token-row{display:flex;gap:4px;flex-wrap:wrap;justify-content:center}
.tok{padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#6b82a0;font-size:10px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif}
.tok.on{border-color:#3df06a44;background:rgba(61,240,106,.06);color:#3df06a}
.tok:disabled{opacity:.4;cursor:not-allowed}
.tok-c{font-size:7px;opacity:.6;margin-left:2px}
.payouts{margin-top:14px;display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.pay-item{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:5px 10px;display:flex;align-items:center;gap:5px;font-size:11px;color:#6b82a0;font-weight:600}
.pi{font-size:15px}.pv{color:#3df06a;font-weight:800}
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
.ro-close{color:#6b82a0;font-size:10px;margin-top:10px}
</style>