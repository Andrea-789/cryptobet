<template>
    <div class="home">
    <div class="search-wrap">
    <div class="search"><span class="search-ico">🔍</span><input placeholder="Search games, crypto, providers..."></div>
    </div>
    <!-- HERO BANNER -->
    <div class="hero-wrap">
    <div class="hero">
    <div class="hero-bg" :style="{background:slides[curSlide].bg}"></div>
    <div class="hero-glow hg1"></div><div class="hero-glow hg2"></div><div class="hero-glow hg3"></div>
    <div class="hero-content">
    <div class="hero-tag">{{ slides[curSlide].tag }}</div>
    <div class="hero-title">{{ slides[curSlide].title }}<br><span>{{ slides[curSlide].highlight }}</span></div>
    <div class="hero-sub">{{ slides[curSlide].sub }}</div>
    <button class="hero-btn" @click="slides[curSlide].action?.()">{{ slides[curSlide].btn }}</button>
    </div>
    </div>
    <div class="hero-dots"><div v-for="(s,i) in slides" :key="i" :class="['hero-dot',i===curSlide?'on':'']" @click="curSlide=i"></div></div>
    </div>
    <!-- WINNERS TICKER -->
    <div class="ticker-wrap">
    <div class="ticker">
    <div v-for="(w,i) in tickerItems" :key="i" class="ticker-item">
    <span class="ti-avatar">{{ w.icon }}</span>
    <span class="ti-info">{{ w.name }} won <span class="ti-amt">${{ w.amt }}</span></span>
    </div>
    </div>
    </div>
    <!-- PROMO STRIP -->
    <div class="promo-strip">
    <div class="promo-card" v-for="p in promos" :key="p.name" @click="p.action?.()">
    <div class="promo-ico">{{ p.icon }}</div>
    <div class="promo-name">{{ p.name }}</div>
    <div class="promo-desc">{{ p.desc }}</div>
    <div :class="['promo-badge',p.bc]">{{ p.badge }}</div>
    </div>
    </div>
    <!-- JACKPOT -->
    <div class="jackpot"><div class="jp-in"><div class="jp-in2"><div class="jp-body">
    <div class="jp-glow jp-g1"></div><div class="jp-glow jp-g2"></div>
    <div class="jp-label">🏅 Progressive Jackpot</div>
    <div class="jp-amount">${{ jpDisplay }}</div>
    <div class="jp-sub">Growing every second • 3 winners this week</div>
    </div></div></div></div>
    <!-- CATEGORIES -->
    <div class="cats">
    <div v-for="c in categories" :key="c.name" :class="['cat',c.active?'on':'']" @click="selectCat(c)">{{ c.icon }} {{ c.name }}</div>
    </div>
    <!-- FEATURED GAMES -->
    <div class="section">
    <div class="sec-header"><span class="sec-title">🔥 Featured Games</span><button class="sec-more" @click="$router.push('/casino')">See All ›</button></div>
    <div v-if="featured.length===0" class="empty-cat">No games in this category</div>
    <div class="games-scroll" v-else>
    <div v-for="g in featured" :key="g.name" class="game-card" @click="goGame(g.route)">
    <div class="gc-img" :style="{background:g.bg}">
    <div v-if="g.badge" :class="['gc-badge',g.bc]">{{ g.badge }}</div>
    <div class="gc-overlay"></div>
    <div class="gc-icon">{{ g.icon }}</div>
    <div class="gc-info"><div class="gc-name">{{ g.name }}</div><div class="gc-tag">{{ g.tag }}</div></div>
    </div>
    </div>
    </div>
    </div>
    <!-- POPULAR GRID -->
    <div class="section">
    <div class="sec-header"><span class="sec-title">⭐ Popular Now</span><button class="sec-more" @click="$router.push('/casino')">See All ›</button></div>
    <div v-if="popular.length===0" class="empty-cat">No games in this category</div>
    <div class="game-grid" v-else>
    <div v-for="g in popular" :key="g.name" class="gg-card" :style="{background:g.bg}" @click="goGame(g.route)">
    <div class="gg-ico">{{ g.icon }}</div>
    <div class="gg-name">{{ g.name }}</div>
    </div>
    </div>
    </div>
    <!-- LIVE BETS -->
    <div class="section">
    <div class="sec-header">
    <span class="sec-title">🔴 Live Bets</span>
    <span class="live-indicator"><span class="live-pulse"></span>LIVE</span>
    </div>
    <div class="live-list">
    <div v-for="b in liveBets" :key="b.id" class="live-row">
    <div class="lr-avatar">{{ b.icon }}</div>
    <div class="lr-info"><div class="lr-user">{{ b.user }}</div><div class="lr-game">{{ b.game }}</div></div>
    <div v-if="b.win" class="lr-mult">{{ b.mult }}×</div>
    <div :class="['lr-amt',b.win?'green':'red']">{{ b.win?'+':'-' }}${{ b.amt }}</div>
    </div>
    </div>
    </div>
    <!-- LEADERBOARD -->
    <div class="section">
    <div class="sec-header"><span class="sec-title">🏆 Leaderboard</span><button class="sec-more" @click="$router.push('/leaderboard')">Full Board ›</button></div>
    <div v-if="lbLoading" style="text-align:center;padding:20px"><div class="spinner"></div></div>
    <template v-else-if="lbPodium.length>=3">
    <div class="lb-podium">
    <div class="lb-pod lb-2">
    <div class="lb-pod-av" style="background:rgba(192,192,192,0.1)">🥈</div>
    <div class="lb-pod-name">{{ shortAddr(lbPodium[1]?.wallet) }}</div><div class="lb-pod-amt">{{ fmtUsd(lbPodium[1]?.wagered) }}</div>
    <div class="lb-bar">🥈</div>
    </div>
    <div class="lb-pod lb-1">
    <div class="lb-pod-av" style="background:rgba(255,222,89,0.1)">🥇</div>
    <div class="lb-pod-name">{{ shortAddr(lbPodium[0]?.wallet) }}</div><div class="lb-pod-amt">{{ fmtUsd(lbPodium[0]?.wagered) }}</div>
    <div class="lb-bar">🥇</div>
    </div>
    <div class="lb-pod lb-3">
    <div class="lb-pod-av" style="background:rgba(205,127,50,0.1)">🥉</div>
    <div class="lb-pod-name">{{ shortAddr(lbPodium[2]?.wallet) }}</div><div class="lb-pod-amt">{{ fmtUsd(lbPodium[2]?.wagered) }}</div>
    <div class="lb-bar">🥉</div>
    </div>
    </div>
    <div class="lb-list">
    <div v-for="(l,i) in lbRest" :key="i" class="lb-row">
    <div class="lb-rank">{{ i+4 }}</div>
    <div class="lb-av">{{ avatars[i%avatars.length] }}</div>
    <div class="lb-name">{{ shortAddr(l.wallet) }}</div>
    <div class="lb-val">{{ fmtUsd(l.wagered) }}</div>
    </div>
    </div>
    </template>
    <div v-else style="text-align:center;color:#6b82a0;font-size:12px;padding:20px">No leaderboard data yet</div>
    </div>
    <!-- FOOTER -->
    <div class="footer">
    <div class="footer-logo">Crypto<span>Bet</span></div>
    <div class="footer-links">
    <a @click="$router.push('/fair')">Provably Fair</a><a @click="$router.push('/vip')">VIP Club</a><a href="#">Terms</a><a href="#">Privacy</a><a href="#">Support</a>
    </div>
    <div class="footer-badges">
    <div class="fb">🔒 SSL</div><div class="fb">✔ Licensed</div><div class="fb">18+</div><div class="fb">🛡️ Provably Fair</div>
    </div>
    <div class="footer-copy">© 2025 CryptoBet. All rights reserved.</div>
    </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useRouter } from 'vue-router';
  import api from '../services/api.js';
  const router = useRouter();
  const props = defineProps({ balances: Array, wallet: [Object,String], user: Object });
  
  // ── Slides ──
  const slides = [
    {tag:'🔥 LIMITED TIME',title:'Welcome Bonus',highlight:'200% up to $10,000',sub:'+ 50 Free Spins on your first deposit',btn:'Claim Now →',bg:'linear-gradient(135deg,#1a0a3a,#0a2848,#0a3828)',action:()=>router.push('/deposit')},
    {tag:'🏆 TOURNAMENT',title:'Weekly Battle',highlight:'$50,000 Prize Pool',sub:'Top 100 players share the rewards',btn:'Join Now →',bg:'linear-gradient(135deg,#2a1a00,#0a1838,#280a18)',action:()=>router.push('/leaderboard')},
    {tag:'⚡ NEW GAME',title:'Crypto Crash',highlight:'Moon or Bust!',sub:'Ride the multiplier, cash out in time',btn:'Play Now →',bg:'linear-gradient(135deg,#0a2838,#1a0a40,#0a2818)',action:()=>router.push('/crash')}
  ];
  const curSlide = ref(0);
  
  const promos = [
    {icon:'🎡',name:'Daily Wheel',desc:'Free spin every day',badge:'FREE',bc:'pb-green',action:()=>router.push('/spin')},
    {icon:'🏆',name:'Tournament',desc:'$50K prize pool',badge:'LIVE',bc:'pb-orange',action:()=>router.push('/leaderboard')},
    {icon:'🎁',name:'Rakeback',desc:'Up to 15% back',badge:'VIP',bc:'pb-purple',action:()=>router.push('/vip')},
    {icon:'💸',name:'Deposit',desc:'Fund your account',badge:'NEW',bc:'pb-pink',action:()=>router.push('/deposit')}
  ];
  
  // ── Categories ──
  const categories = ref([
    {name:'All',     icon:'🔥', active:true },
    {name:'Slots',   icon:'🎰', active:false},
    {name:'Cards',   icon:'🃏', active:false},
    {name:'Dice',    icon:'🎲', active:false},
    {name:'Crash',   icon:'🚀', active:false},
    {name:'Trading', icon:'📈', active:false},
    {name:'Instant', icon:'⚡', active:false},
    {name:'Originals',icon:'🎯',active:false}
  ]);
  const selectCat = (c) => { categories.value.forEach(x => x.active = false); c.active = true; };
  const activeCat = computed(() => categories.value.find(c => c.active)?.name || 'All');
  
  // ── Games ──
  const allFeatured = [
    {name:'Crash',    icon:'🚀', tag:'Originals',   bg:'linear-gradient(135deg,#1a0840,#0a2850)', badge:'HOT',  bc:'gc-hot', route:'/crash',    cats:['All','Crash','Originals','Instant']},
    {name:'Mines',    icon:'💣', tag:'Originals',   bg:'linear-gradient(135deg,#0a2818,#0a1838)', badge:'NEW',  bc:'gc-new', route:'/mines',    cats:['All','Originals','Instant']},
    {name:'Plinko',   icon:'⚡', tag:'Originals',   bg:'linear-gradient(135deg,#2a1a00,#1a0a28)', badge:'',     bc:'',       route:'/plinko',   cats:['All','Originals','Instant']},
    {name:'Roulette', icon:'🎡', tag:'Table Games', bg:'linear-gradient(135deg,#280a0a,#1a0828)', badge:'POP',  bc:'gc-pop', route:'/roulette', cats:['All','Originals']},
    {name:'Blackjack',icon:'🃏', tag:'Cards',       bg:'linear-gradient(135deg,#0a1830,#0a2828)', badge:'',     bc:'',       route:'/blackjack',cats:['All','Cards']},
    {name:'Dice',     icon:'🎲', tag:'Originals',   bg:'linear-gradient(135deg,#1a1a00,#0a1838)', badge:'',     bc:'',       route:'/dice',     cats:['All','Dice','Originals']},
    {name:'HiLo',     icon:'⬆️', tag:'Cards',       bg:'linear-gradient(135deg,#0a2838,#1a0a30)', badge:'LIVE', bc:'gc-new', route:'/hilo',     cats:['All','Cards']},
    {name:'Slots',    icon:'🎰', tag:'Slots',        bg:'linear-gradient(135deg,#2a0a1a,#0a1838)', badge:'HOT',  bc:'gc-hot', route:'/slots',    cats:['All','Slots']},
    {name:'Wheel',    icon:'🎡', tag:'Originals',    bg:'linear-gradient(135deg,#0a2828,#1a0a28)', badge:'',     bc:'',       route:'/spin',     cats:['All','Originals','Instant']},
  ];
  const allPopular = [
    {name:'Crash',    icon:'🚀', bg:'linear-gradient(135deg,#1a0840,#0a2850)', route:'/crash',    cats:['All','Crash','Originals','Instant']},
    {name:'Mines',    icon:'💣', bg:'linear-gradient(135deg,#0a2818,#0a1838)', route:'/mines',    cats:['All','Originals','Instant']},
    {name:'Slots',    icon:'🎰', bg:'linear-gradient(135deg,#2a0a1a,#0a1838)', route:'/slots',    cats:['All','Slots']},
    {name:'Roulette', icon:'🎡', bg:'linear-gradient(135deg,#280a0a,#1a0828)', route:'/roulette', cats:['All','Originals']},
    {name:'Blackjack',icon:'🃏', bg:'linear-gradient(135deg,#0a1830,#0a2828)', route:'/blackjack',cats:['All','Cards']},
    {name:'Plinko',   icon:'⚡', bg:'linear-gradient(135deg,#2a1a00,#1a0a28)', route:'/plinko',   cats:['All','Originals','Instant']},
    {name:'Dice',     icon:'🎲', bg:'linear-gradient(135deg,#1a1a00,#0a1838)', route:'/dice',     cats:['All','Dice','Originals']},
    {name:'HiLo',     icon:'⬆️', bg:'linear-gradient(135deg,#0a2838,#1a0a30)', route:'/hilo',     cats:['All','Cards']},
    {name:'Wheel',    icon:'🎡', bg:'linear-gradient(135deg,#0a2828,#1a0a28)', route:'/spin',     cats:['All','Originals','Instant']},
  ];
  
  const featured = computed(() => allFeatured.filter(g => g.cats.includes(activeCat.value)));
  const popular  = computed(() => allPopular.filter(g => g.cats.includes(activeCat.value)));
  
  const goGame = (route) => { if(route) router.push(route); };
  
  // ── Leaderboard ──
  const lbLoading = ref(false);
  const lbPlayers = ref([]);
  const lbPodium = computed(() => lbPlayers.value.slice(0,3));
  const lbRest   = computed(() => lbPlayers.value.slice(3,6));
  const avatars = ['🎮','💎','🚀','🐋','🐺','🦊'];
  async function fetchLeaderboard() {
    lbLoading.value = true;
    try {
      const data = await api.getLeaderboard('wagered','weekly','all');
      lbPlayers.value = data.leaderboard || data.players || [];
    } catch(e) { console.error('Home LB error:', e); }
    lbLoading.value = false;
  }
  function shortAddr(a) { return a ? `${a.slice(0,6)}...${a.slice(-4)}` : '—'; }
  function fmtUsd(n) { if(!n) return '$0'; if(n>=1e6) return '$'+(n/1e6).toFixed(1)+'M'; if(n>=1e3) return '$'+(n/1e3).toFixed(1)+'K'; return '$'+n.toLocaleString(); }
  
  // ── Live bets ──
  const userPool = [
    {icon:'🐋',name:'Whale42'},{icon:'🎮',name:'GamerX'},{icon:'🦊',name:'FoxLuck'},
    {icon:'💎',name:'DiamondH'},{icon:'🐺',name:'WolfBet'},{icon:'🚀',name:'MoonShot'},
    {icon:'🎯',name:'Sniper99'},{icon:'👑',name:'King_BTC'},{icon:'🔥',name:'HotHand'},{icon:'⭐',name:'StarPlay'}
  ];
  const gameNames = ['Crash','Mines','Slots','Roulette','Blackjack','Plinko','Dice','HiLo'];
  const rnd = (a) => a[Math.floor(Math.random()*a.length)];
  let betId = 0;
  const makeBet = () => {
    const u=rnd(userPool), win=Math.random()>0.4;
    return {id:betId++,icon:u.icon,user:u.name,game:rnd(gameNames),win,
      amt:(win?(Math.random()*2000+10):(Math.random()*500+10)).toFixed(2),
      mult:win?(Math.random()*20+1.1).toFixed(2):''}
  };
  const liveBets = ref(Array.from({length:6},makeBet));
  
  // ── Ticker ──
  const tickerData = () => {
    const items=[];
    for(let i=0;i<20;i++){const u=rnd(userPool);items.push({icon:u.icon,name:u.name,amt:Math.floor(Math.random()*5000+100).toLocaleString()});}
    return [...items,...items];
  };
  const tickerItems = ref(tickerData());
  
  // ── Jackpot ──
  const jpVal = ref(1247832);
  const jpDisplay = computed(()=>Math.floor(jpVal.value).toLocaleString());
  
  // ── Intervals ──
  let intervals = [];
  onMounted(()=>{
    fetchLeaderboard();
    intervals.push(setInterval(()=>{curSlide.value=(curSlide.value+1)%slides.length},5000));
    intervals.push(setInterval(()=>{liveBets.value.unshift(makeBet());if(liveBets.value.length>8)liveBets.value.pop()},3000));
    intervals.push(setInterval(()=>{jpVal.value+=Math.random()*15+1},100));
  });
  onUnmounted(()=>{intervals.forEach(clearInterval)});
  </script>
  
  <style scoped>
  .home{padding-bottom:12px}
  .search-wrap{padding:12px 16px 0}
  .search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:10px 14px}
  .search input{background:none;border:none;color:#fff;font-size:13px;font-weight:500;font-family:'Poppins',sans-serif;flex:1;outline:none}
  .search input::placeholder{color:#4a6080}
  .search-ico{color:#4a6080;font-size:16px}
  .hero-wrap{padding:12px 16px 0}
  .hero{position:relative;border-radius:20px;overflow:hidden;height:160px}
  .hero-bg{position:absolute;inset:0;z-index:0;transition:background .5s}
  .hero-glow{position:absolute;width:200px;height:200px;border-radius:50%;filter:blur(60px);opacity:0.4;z-index:1}
  .hg1{background:#8050ff;top:-60px;right:-40px}.hg2{background:#3df06a;bottom:-80px;left:-40px}.hg3{background:#ff30ff;top:20px;left:40%}
  .hero-content{position:relative;z-index:2;padding:20px;height:100%;display:flex;flex-direction:column;justify-content:center}
  .hero-tag{font-size:10px;font-weight:700;color:#ffde59;background:rgba(255,222,89,0.15);padding:3px 10px;border-radius:6px;display:inline-block;margin-bottom:6px;width:fit-content}
  .hero-title{font-size:22px;font-weight:900;line-height:1.15;letter-spacing:-0.5px}
  .hero-title span{background:linear-gradient(90deg,#ffde59,#ff8c00);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
  .hero-sub{font-size:11px;color:rgba(255,255,255,0.6);font-weight:500;margin-top:4px}
  .hero-btn{margin-top:10px;padding:8px 22px;border-radius:20px;border:none;background:linear-gradient(180deg,#3df06a,#22b845);color:#fff;font-size:12px;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;box-shadow:0 3px 16px rgba(52,220,89,0.4);width:fit-content;transition:transform .15s}
  .hero-btn:active{transform:scale(0.96)}
  .hero-dots{display:flex;gap:6px;justify-content:center;margin-top:10px}
  .hero-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.15);cursor:pointer;transition:all .2s}
  .hero-dot.on{background:#3df06a;width:20px;border-radius:4px}
  .ticker-wrap{overflow:hidden;margin-top:12px;padding:0 16px}
  .ticker{display:flex;gap:10px;animation:tickerScroll 20s linear infinite;width:max-content}
  @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
  .ticker-item{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);flex-shrink:0}
  .ti-avatar{font-size:14px}.ti-info{font-size:10px;font-weight:600;white-space:nowrap}.ti-amt{color:#3df06a;font-weight:800}
  .promo-strip{display:flex;gap:8px;padding:12px 16px 0;overflow-x:auto;-webkit-overflow-scrolling:touch}
  .promo-strip::-webkit-scrollbar{display:none}
  .promo-card{flex-shrink:0;width:130px;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.03);display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;cursor:pointer;transition:all .2s}
  .promo-card:active{transform:scale(0.96)}
  .promo-ico{font-size:28px}.promo-name{font-size:11px;font-weight:700}.promo-desc{font-size:9px;color:#6b82a0;font-weight:500}
  .promo-badge{padding:2px 8px;border-radius:6px;font-size:8px;font-weight:800}
  .pb-green{background:rgba(61,240,106,0.12);color:#3df06a}.pb-orange{background:rgba(255,168,48,0.12);color:#ffa830}
  .pb-purple{background:rgba(128,80,255,0.12);color:#a080ff}.pb-pink{background:rgba(255,48,255,0.12);color:#ff70ff}
  .jackpot{margin:16px 16px 0;padding:3px;border-radius:18px;background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff);position:relative;overflow:hidden}
  .jp-in{background:#0c1a30;border-radius:16px;padding:2px}
  .jp-in2{padding:2px;border-radius:14px;background:conic-gradient(#ff30ff33,#ffde5933,#30ff7033,#20f0ff33,#8050ff33,#ff30ff33)}
  .jp-body{background:linear-gradient(135deg,#0e1f38,#1a0a3a);border-radius:12px;padding:20px;text-align:center;position:relative;overflow:hidden}
  .jp-glow{position:absolute;width:150px;height:150px;border-radius:50%;filter:blur(50px);opacity:0.3}
  .jp-g1{background:#ffde59;top:-40px;right:-20px}.jp-g2{background:#ff30ff;bottom:-40px;left:-20px}
  .jp-label{font-size:10px;font-weight:700;color:#ffde59;text-transform:uppercase;letter-spacing:2px;position:relative;z-index:1}
  .jp-amount{font-size:36px;font-weight:900;position:relative;z-index:1;margin-top:4px;background:linear-gradient(90deg,#ffde59,#ffa830,#ff6a00);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
  .jp-sub{font-size:10px;color:#6b82a0;font-weight:600;position:relative;z-index:1;margin-top:4px}
  .cats{display:flex;gap:6px;overflow-x:auto;padding:0 16px;margin-top:14px;-webkit-overflow-scrolling:touch}
  .cats::-webkit-scrollbar{display:none}
  .cat{padding:8px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);font-size:11px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .2s;white-space:nowrap;color:#6b82a0;display:flex;align-items:center;gap:4px;flex-shrink:0}
  .cat.on{background:linear-gradient(180deg,#3df06a22,#22b84522);border-color:#3df06a44;color:#3df06a}
  .section{padding:0 16px;margin-top:16px}
  .sec-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
  .sec-title{font-size:14px;font-weight:800}
  .sec-more{font-size:11px;color:#3df06a;font-weight:700;cursor:pointer;border:none;background:none;font-family:'Poppins',sans-serif}
  .empty-cat{text-align:center;color:#6b82a0;font-size:12px;padding:20px 0}
  .games-scroll{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch}
  .games-scroll::-webkit-scrollbar{display:none}
  .game-card{flex-shrink:0;width:140px;border-radius:16px;overflow:hidden;cursor:pointer;transition:transform .2s;position:relative}
  .game-card:active{transform:scale(0.96)}
  .gc-img{width:140px;height:140px;display:flex;align-items:center;justify-content:center;position:relative}
  .gc-overlay{position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.8))}
  .gc-icon{font-size:50px;position:relative;z-index:1}
  .gc-info{position:absolute;bottom:0;left:0;right:0;padding:10px;z-index:2}
  .gc-name{font-size:12px;font-weight:800}.gc-tag{font-size:9px;color:#6b82a0;font-weight:600}
  .gc-badge{position:absolute;top:8px;left:8px;padding:2px 8px;border-radius:6px;font-size:8px;font-weight:800;z-index:2}
  .gc-hot{background:rgba(255,64,64,0.9);color:#fff}.gc-new{background:rgba(61,240,106,0.9);color:#fff}.gc-pop{background:rgba(255,168,48,0.9);color:#fff}
  .game-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .gg-card{border-radius:14px;overflow:hidden;cursor:pointer;transition:transform .2s;position:relative;aspect-ratio:1;display:flex;align-items:center;justify-content:center;}
  .gg-card:active{transform:scale(0.94)}
  .gg-ico{font-size:36px;position:absolute;}
  .gg-name{position:absolute;bottom:0;left:0;right:0;padding:6px;text-align:center;font-size:10px;font-weight:700;background:linear-gradient(transparent,rgba(0,0,0,0.8));z-index:2;}
  .live-indicator{font-size:9px;color:#ff4040;font-weight:700;display:flex;align-items:center;gap:4px}
  .live-pulse{width:6px;height:6px;border-radius:50%;background:#ff4040;animation:pulse 1.5s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
  .live-list{display:flex;flex-direction:column;gap:4px}
  .live-row{display:flex;align-items:center;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:10px;gap:8px;animation:fadeSlide .5s ease-out}
  @keyframes fadeSlide{0%{opacity:0;transform:translateY(-10px)}100%{opacity:1;transform:translateY(0)}}
  .lr-avatar{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;background:rgba(255,255,255,0.06)}
  .lr-info{flex:1}.lr-user{font-size:11px;font-weight:700}.lr-game{font-size:9px;color:#6b82a0;font-weight:500}
  .lr-amt{font-size:12px;font-weight:800}.lr-amt.green{color:#3df06a}.lr-amt.red{color:#ff4040}
  .lr-mult{font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(61,240,106,0.1);color:#3df06a}
  .spinner{width:24px;height:24px;border:3px solid rgba(255,255,255,.1);border-top-color:#ffa830;border-radius:50%;animation:spin .6s linear infinite;margin:0 auto}
  @keyframes spin{to{transform:rotate(360deg)}}
  .lb-podium{display:flex;align-items:flex-end;justify-content:center;gap:8px;margin-bottom:12px}
  .lb-pod{display:flex;flex-direction:column;align-items:center;gap:4px}
  .lb-pod-av{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px}
  .lb-pod-name{font-size:10px;font-weight:700;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .lb-pod-amt{font-size:11px;font-weight:800;color:#3df06a}
  .lb-bar{width:60px;border-radius:8px 8px 0 0;display:flex;align-items:flex-start;justify-content:center;padding-top:6px;font-size:18px;font-weight:900}
  .lb-1{height:80px;background:linear-gradient(180deg,#ffde5933,#ffde5908)}.lb-1 .lb-pod-av{border:2px solid #ffde59}
  .lb-2{height:60px;background:linear-gradient(180deg,#c0c0c033,#c0c0c008)}.lb-2 .lb-pod-av{border:2px solid #c0c0c0}
  .lb-3{height:45px;background:linear-gradient(180deg,#cd7f3233,#cd7f3208)}.lb-3 .lb-pod-av{border:2px solid #cd7f32}
  .lb-list{display:flex;flex-direction:column;gap:4px}
  .lb-row{display:flex;align-items:center;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:10px;gap:8px}
  .lb-rank{width:22px;font-size:12px;font-weight:800;text-align:center;color:#6b82a0}
  .lb-av{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;background:rgba(255,255,255,0.06)}
  .lb-name{flex:1;font-size:11px;font-weight:700}
  .lb-val{font-size:12px;font-weight:800;color:#3df06a}
  .footer{padding:20px 16px;margin-top:20px;text-align:center;border-top:1px solid rgba(255,255,255,0.05)}
  .footer-logo{font-size:14px;font-weight:800;margin-bottom:6px}
  .footer-logo span{background:linear-gradient(90deg,#3df06a,#20f0ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
  .footer-links{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:8px}
  .footer-links a{color:#6b82a0;font-size:10px;font-weight:600;text-decoration:none;cursor:pointer}
  .footer-badges{display:flex;gap:8px;justify-content:center;margin-top:8px;flex-wrap:wrap}
  .fb{padding:4px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);font-size:9px;font-weight:700;color:#6b82a0}
  .footer-copy{font-size:9px;color:#4a6080;font-weight:500;margin-top:8px}
  </style>