
<template>
<div class="fair-page">
  <div class="topbar"><span class="top-title">🛡️ Provably Fair</span></div>
  <div class="pf-hero">
    <div class="pf-shield">🔐</div>
    <div class="pf-h">Provably <span>Fair</span> Gaming</div>
    <div class="pf-sub">Every bet is cryptographically verified.<br>Don't trust us — verify it yourself.</div>
  </div>
  <!-- HOW IT WORKS -->
  <div class="section">
    <div class="sec-title">How It Works</div>
    <div class="gframe"><div class="gf-in"><div class="gf-body">
      <div class="diagram">
        <div class="d-box d-h">Server Seed<br><span class="d-sm">(hashed)</span></div>
        <div class="d-arrow">+</div>
        <div class="d-box d-c">Client Seed<br><span class="d-sm">(your pick)</span></div>
        <div class="d-arrow">+</div>
        <div class="d-box d-n">Nonce<br><span class="d-sm">(bet #)</span></div>
        <div class="d-arrow">=</div>
        <div class="d-box d-r">Result<br><span class="d-sm">HMAC-SHA256</span></div>
      </div>
      <div class="steps">
        <div v-for="(s,i) in [
          {n:1,c:'sn1',t:'Server Seed Generated',d:'Before you bet, our server generates a random seed and shows you its SHA-256 hash.'},
          {n:2,c:'sn2',t:'You Set Your Client Seed',d:'You choose your own seed. This ensures the server can\\t predict the final outcome alone.'},
          {n:3,c:'sn3',t:'Result Is Calculated',d:'The game result is computed with HMAC-SHA256(serverSeed, clientSeed:nonce).'},
          {n:4,c:'sn4',t:'Verify Anytime',d:'When you rotate your server seed, the original is revealed for verification.'}
        ]" :key="i" class="step">
          <div class="step-num" :class="s.c">{{ s.n }}</div>
          <div class="step-body"><div class="step-t">{{ s.t }}</div><div class="step-d">{{ s.d }}</div></div>
        </div>
      </div>
    </div></div></div>
  </div>
  <!-- VERIFY -->
  <div class="section">
    <div class="sec-title">Verify a Bet</div>
    <div class="vc"><div class="v-label">Server Seed (revealed)</div><div class="v-row"><input class="v-input" v-model="ss" placeholder="Paste server seed..."></div></div>
    <div class="vc"><div class="v-label">Server Seed Hash</div><div class="v-row"><input class="v-input" v-model="sh2" placeholder="Paste hash to compare..."></div></div>
    <div class="vc"><div class="v-label">Client Seed</div><div class="v-row"><input class="v-input" v-model="cs" placeholder="Your client seed"><button class="v-btn v-rand" @click="randCS">🎲</button></div></div>
    <div class="vc"><div class="v-label">Nonce (Bet #)</div><div class="v-row"><input class="v-input" type="number" v-model.number="nc" placeholder="0"></div></div>
    <button class="v-verify" @click="verify">Verify Bet ✔</button>
    <div v-if="resShow" class="result-box" :class="resValid?'valid':'invalid'">
      <div class="r-ico">{{ resValid ? '✅' : '❌' }}</div>
      <div class="r-txt" :style="{color:resValid?'#3df06a':'#ff4040'}">{{ resTxt }}</div>
      <div class="r-hash">{{ resHash }}</div>
    </div>
  </div>
  <!-- ACTIVE SEEDS -->
  <div class="section">
    <div class="sec-title">Your Active Seeds</div>
    <div class="gframe"><div class="gf-in"><div class="gf-body">
      <div class="vc" style="margin:0"><div class="v-label">Current Server Seed Hash</div><div class="v-row"><input class="v-input" value="a3f8c1...e47b02" readonly style="color:#20f0ff"></div></div>
      <div class="vc" style="margin:8px 0 0"><div class="v-label">Your Client Seed</div><div class="v-row"><input class="v-input" v-model="activeCS"><button class="v-btn v-rand" @click="randSeed">🎲</button></div></div>
      <div class="vc" style="margin:8px 0 0"><div class="v-label">Total Bets with Current Pair</div><div class="seed-count">247</div></div>
      <button class="rotate-btn">🔄 Rotate Server Seed</button>
    </div></div></div>
  </div>
  <!-- RECENT BETS -->
  <div class="section">
    <div class="sec-title">Recent Bets — Verify Any</div>
    <div v-for="(b,i) in bets" :key="i" class="bet-row">
      <div class="br-ico">{{ b.g }}</div>
      <div class="br-info"><div class="br-name">{{ b.name }} — {{ b.mult }}</div><div class="br-time">{{ b.time }}</div></div>
      <div class="br-res"><div class="br-amt" :class="b.cls">{{ b.amt }}</div><div class="br-badge">Verify →</div></div>
    </div>
  </div>
  <!-- FAQ -->
  <div class="section">
    <div class="sec-title">FAQ</div>
    <div v-for="(f,i) in faqs" :key="i" class="faq-item" :class="{open:openFaq===i}" @click="toggleFaq(i)">
      <div class="faq-q">{{ f[0] }}<span class="faq-arrow">›</span></div>
      <div class="faq-a">{{ f[1] }}</div>
    </div>
  </div>
  <div class="trust-badges">
    <div class="tb">🔒 SHA-256</div><div class="tb">🛡️ HMAC</div><div class="tb">✔ Open Source</div><div class="tb">📜 Audited</div>
  </div>
</div>
</template>
<script setup>
import { ref } from 'vue';
const ss = ref(''), sh2 = ref(''), cs = ref(''), nc = ref(0);
const resShow = ref(false), resValid = ref(true), resTxt = ref(''), resHash = ref('');
const activeCS = ref('my_lucky_seed_42');
const openFaq = ref(-1);
const bets = [
  { g:'🚀',name:'Crash',time:'2 min ago',amt:'+$1,684',cls:'green',mult:'8.42×' },
  { g:'🎲',name:'Dice',time:'8 min ago',amt:'-$50',cls:'red',mult:'Under 30' },
  { g:'💣',name:'Mines',time:'15 min ago',amt:'+$210',cls:'green',mult:'3 gems' },
  { g:'🃏',name:'Blackjack',time:'22 min ago',amt:'+$250',cls:'green',mult:'21' },
  { g:'🎰',name:'Slots',time:'35 min ago',amt:'-$80',cls:'red',mult:'Cherry' },
  { g:'⚡',name:'Plinko',time:'1h ago',amt:'+$500',cls:'green',mult:'10×' }
];
const faqs = [
  ['Can the site manipulate outcomes?','No. The server seed is committed (hashed) before you bet. Changing it would produce a different hash.'],
  ['What is HMAC-SHA256?','A cryptographic function combining server seed, client seed, and nonce to produce a deterministic result.'],
  ['Can I change my client seed?','Yes, anytime. It resets your nonce to 0. Previous bets remain verifiable.'],
  ['When is the server seed revealed?','When you rotate it. The old seed is shown so you can verify past bets.'],
  ['Is the code open source?','Yes. The verification algorithm is published and independently audited.']
];
function randSeed() { activeCS.value = Math.random().toString(36).slice(2,14); }
function randCS() { cs.value = Math.random().toString(36).slice(2,14); }
async function verify() {
  if (!ss.value || !cs.value) { resShow.value = true; resValid.value = false; resTxt.value = 'Please fill server seed & client seed'; resHash.value = ''; return; }
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(ss.value), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(cs.value+':'+nc.value));
  const hmac = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('');
  const hashBuf = await crypto.subtle.digest('SHA-256', enc.encode(ss.value));
  const seedHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
  const valid = !sh2.value || seedHash === sh2.value.toLowerCase();
  resShow.value = true; resValid.value = valid;
  resTxt.value = valid ? 'Verified! Bet is fair.' : "Hash mismatch — seed doesn't match!";
  resHash.value = 'HMAC: ' + hmac + '\nSeed Hash: ' + seedHash;
}
function toggleFaq(i) { openFaq.value = openFaq.value === i ? -1 : i; }
</script>
<style scoped>
.fair-page{max-width:420px;margin:0 auto;padding-bottom:40px}
.topbar{display:flex;align-items:center;padding:14px 16px 0}
.top-title{font-size:16px;font-weight:800;color:#fff}
.pf-hero{text-align:center;padding:24px 16px 0}
.pf-shield{font-size:56px;filter:drop-shadow(0 4px 20px rgba(32,240,255,.4))}
.pf-h{font-size:22px;font-weight:900;margin-top:8px;color:#fff}
.pf-h span{background:linear-gradient(90deg,#20f0ff,#3df06a);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
.pf-sub{font-size:12px;color:#6b82a0;font-weight:500;margin-top:4px;line-height:1.5}
.section{padding:0 16px;margin-top:14px}
.sec-title{font-size:11px;color:#6b82a0;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
.gframe{padding:2px;border-radius:16px;background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff)}
.gf-in{background:#0c1a30;border-radius:15px;padding:4px}
.gf-body{background:linear-gradient(180deg,#0e1f38,#0a1628);border-radius:12px;padding:16px}
.diagram{display:flex;align-items:center;justify-content:center;gap:6px;padding:16px 0;flex-wrap:wrap}
.d-box{padding:8px 12px;border-radius:10px;font-size:10px;font-weight:700;text-align:center;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#fff}
.d-sm{font-size:8px;color:#6b82a0}
.d-arrow{color:#6b82a0;font-size:16px}
.d-h{border-color:#20f0ff44;background:rgba(32,240,255,.06);color:#20f0ff}
.d-c{border-color:#a080ff44;background:rgba(128,80,255,.06);color:#a080ff}
.d-n{border-color:#ffde5944;background:rgba(255,222,89,.06);color:#ffde59}
.d-r{border-color:#3df06a44;background:rgba(61,240,106,.06);color:#3df06a}
.steps{display:flex;flex-direction:column;gap:10px}
.step{display:flex;gap:12px;align-items:flex-start}
.step-num{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;flex-shrink:0}
.sn1{background:rgba(32,240,255,.12);color:#20f0ff}.sn2{background:rgba(128,80,255,.12);color:#a080ff}
.sn3{background:rgba(255,222,89,.12);color:#ffde59}.sn4{background:rgba(61,240,106,.12);color:#3df06a}
.step-body{flex:1}
.step-t{font-size:13px;font-weight:700;color:#fff}
.step-d{font-size:10px;color:#6b82a0;font-weight:500;line-height:1.5;margin-top:2px}
.vc{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:12px;margin-bottom:8px}
.v-label{font-size:9px;color:#6b82a0;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.v-row{display:flex;gap:6px;align-items:center}
.v-input{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 12px;color:#fff;font-size:11px;font-family:'Poppins',sans-serif;font-weight:600;outline:none}
.v-btn{padding:10px 14px;border-radius:10px;border:none;font-size:11px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;flex-shrink:0}
.v-rand{background:linear-gradient(180deg,#8050ff22,#6030dd22);color:#a080ff;border:1px solid #8050ff44}
.v-verify{background:linear-gradient(180deg,#3df06a,#22b845);color:#fff;width:100%;padding:13px;border-radius:14px;border:none;font-size:14px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;margin-top:8px;box-shadow:0 3px 16px rgba(52,220,89,.3)}
.seed-count{font-size:18px;font-weight:900;color:#ffa830;margin-top:2px}
.rotate-btn{width:100%;margin-top:10px;padding:11px;border-radius:12px;background:linear-gradient(180deg,#ffa83022,#e0880022);color:#ffa830;border:1px solid #ffa83044;font-size:12px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif}
.result-box{margin-top:10px;padding:14px;border-radius:14px;text-align:center}
.result-box.valid{background:rgba(61,240,106,.06);border:1px solid rgba(61,240,106,.2)}
.result-box.invalid{background:rgba(255,64,64,.06);border:1px solid rgba(255,64,64,.2)}
.r-ico{font-size:32px}.r-txt{font-size:12px;font-weight:700;margin-top:4px}
.r-hash{font-size:9px;color:#6b82a0;font-weight:500;margin-top:4px;word-break:break-all;font-family:monospace;white-space:pre-wrap}
.bet-row{display:flex;align-items:center;padding:10px 12px;background:rgba(255,255,255,.03);border-radius:12px;gap:10px;margin-bottom:4px;cursor:pointer;transition:background .15s}
.bet-row:hover{background:rgba(255,255,255,.06)}
.br-ico{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;background:rgba(255,255,255,.05)}
.br-info{flex:1}.br-name{font-size:12px;font-weight:700;color:#fff}.br-time{font-size:9px;color:#6b82a0}
.br-res{text-align:right}.br-amt{font-size:12px;font-weight:800}.br-amt.green{color:#3df06a}.br-amt.red{color:#ff4040}
.br-badge{font-size:8px;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(32,240,255,.1);color:#20f0ff;margin-top:2px;display:inline-block}
.faq-item{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;margin-bottom:6px;overflow:hidden}
.faq-q{padding:12px 14px;font-size:12px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;color:#fff}
.faq-a{padding:0 14px 12px;font-size:10px;color:#6b82a0;line-height:1.6;display:none}
.faq-item.open .faq-a{display:block}
.faq-arrow{color:#6b82a0;transition:transform .2s;font-size:14px}
.faq-item.open .faq-arrow{transform:rotate(90deg)}
.trust-badges{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:12px;padding:0 16px}
.tb{padding:6px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-size:10px;font-weight:700;color:#6b82a0}
</style>