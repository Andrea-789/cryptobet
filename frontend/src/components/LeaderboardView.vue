<template>
  <div class="lb-page">
  <div class="topbar"><span class="top-title">🏆 Leaderboard</span></div>
  <div class="section">
  <div class="gframe"><div class="gf-in"><div class="gf-body prize-card">
  <div class="prize-label">🏅 Weekly Prize Pool</div>
  <div class="prize-amt">$50,000</div>
  <div class="prize-sub">Top 50 players share the rewards</div>
  <div class="prize-timer">
  <div class="pt-box"><div class="pt-val">{{ tmD }}</div><div class="pt-lbl">Days</div></div>
  <div class="pt-box"><div class="pt-val">{{ tmH }}</div><div class="pt-lbl">Hours</div></div>
  <div class="pt-box"><div class="pt-val">{{ tmM }}</div><div class="pt-lbl">Min</div></div>
  <div class="pt-box"><div class="pt-val">{{ tmS }}</div><div class="pt-lbl">Sec</div></div>
  </div>
  <div class="prizes-row">
  <div class="pr-item"><div class="pr-rank" style="color:#ffde59">🥇 1st</div><div class="pr-amt" style="color:#ffde59">$15,000</div></div>
  <div class="pr-item"><div class="pr-rank" style="color:#c0c0c0">🥈 2nd</div><div class="pr-amt" style="color:#c0c0c0">$8,000</div></div>
  <div class="pr-item"><div class="pr-rank" style="color:#cd7f32">🥉 3rd</div><div class="pr-amt" style="color:#cd7f32">$5,000</div></div>
  <div class="pr-item"><div class="pr-rank" style="color:#6b82a0">4-10</div><div class="pr-amt" style="color:#6b82a0">$2,000</div></div>
  </div>
  </div></div></div>
  </div>
  <div class="tabs"><button v-for="t in tabs" :key="t.k" class="tab" :class="{on:curTab===t.k}" @click="curTab=t.k;fetchData()">{{ t.l }}</button></div>
  <div class="period"><div v-for="p in periods" :key="p.k" class="per" :class="{on:curPer===p.k}" @click="curPer=p.k;fetchData()">{{ p.l }}</div></div>
  <div class="gfilter"><div v-for="g in gameFilters" :key="g.k" class="gf" :class="{on:curGame===g.k}" @click="curGame=g.k;fetchData()">{{ g.l }}</div></div>
  <div class="stats-grid">
  <div class="sg-card"><div class="sg-v" style="color:#3df06a">{{ lbData.totalPlayers?.toLocaleString()||'—' }}</div><div class="sg-l">Players</div></div>
  <div class="sg-card"><div class="sg-v" style="color:#ffa830">{{ lbData.totalBets?.toLocaleString()||'—' }}</div><div class="sg-l">Total Bets</div></div>
  <div class="sg-card"><div class="sg-v" style="color:#20f0ff">{{ fmt(lbData.totalWagered||0) }}</div><div class="sg-l">Wagered</div></div>
  </div>
  <!-- MY RANK -->
  <div v-if="myRank" class="section" style="margin-top:10px">
  <div class="myrank">
  <div class="mr-rank">#{{ myRank.rank }}</div><div class="mr-av">🎮</div>
  <div class="mr-info"><div class="mr-name">{{ shortW }} (You)</div><div class="mr-meta">{{ myRank.bets||0 }} bets</div></div>
  <div class="mr-val"><div class="mr-amt">{{ fmt(myRank.wagered||0) }}</div><div class="mr-sub2">wagered</div></div>
  </div>
  </div>
  <!-- LOADING -->
  <div v-if="loading" style="text-align:center;padding:30px"><div class="spinner"></div></div>
  <!-- PODIUM -->
  <div v-else-if="players.length>=3" class="podium-wrap">
  <div class="podium">
  <div class="pod p2"><div class="pod-card"><div class="pod-av-ring r2"><div class="pod-av">🥈</div></div><div class="pod-name">{{ shortAddr(players[1]?.wallet) }}</div><div class="pod-amt s2">{{ fmt(players[1]?.wagered||0) }}</div><div class="pod-wins">{{ players[1]?.bets||0 }} bets</div></div><div class="pod-bar b2">🥈</div></div>
  <div class="pod p1"><div class="pod-card"><div class="pod-crown">👑</div><div class="pod-av-ring r1"><div class="pod-av">🥇</div></div><div class="pod-name">{{ shortAddr(players[0]?.wallet) }}</div><div class="pod-amt s1">{{ fmt(players[0]?.wagered||0) }}</div><div class="pod-wins">{{ players[0]?.bets||0 }} bets</div></div><div class="pod-bar b1">🥇</div></div>
  <div class="pod p3"><div class="pod-card"><div class="pod-av-ring r3"><div class="pod-av">🥉</div></div><div class="pod-name">{{ shortAddr(players[2]?.wallet) }}</div><div class="pod-amt s3">{{ fmt(players[2]?.wagered||0) }}</div><div class="pod-wins">{{ players[2]?.bets||0 }} bets</div></div><div class="pod-bar b3">🥉</div></div>
  </div>
  </div>
  <!-- LIST -->
  <div class="section">
  <div v-if="players.length>3" class="list-header"><span class="lh-r">#</span><span class="lh-u">Player</span><span class="lh-s">Bets</span><span class="lh-v">Wagered</span></div>
  <div v-for="(p,i) in players.slice(3)" :key="i" class="lb-row" :class="{me:p.wallet===walletAddr}">
  <div class="lr-rank" :class="{t10:i+4<=10}">{{ i+4 }}</div>
  <div class="lr-av">{{ avatarFor(i+3) }}</div>
  <div class="lr-info"><div class="lr-name">{{ shortAddr(p.wallet) }}{{ p.wallet===walletAddr?' (You)':'' }}</div><div class="lr-meta">{{ p.bets||0 }} bets</div></div>
  <div class="lr-val2"><div class="lr-vv" style="color:#ffa830">{{ fmt(p.wagered||0) }}</div><div class="lr-vl">wagered</div></div>
  </div>
  <div v-if="!loading&&players.length===0" class="empty"><div class="empty-ico">🏆</div><div class="empty-txt">No leaderboard data yet</div></div>
  </div>
  </div>
  </template>
  <script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import api from '../services/api.js';
  const props = defineProps({ wallet: [Object,String], user: Object });
  const curTab=ref('wagered'),curPer=ref('weekly'),curGame=ref('all');
  const loading=ref(false);
  const players=ref([]);
  const myRank=ref(null);
  const lbData=ref({totalPlayers:0,totalBets:0,totalWagered:0});
  const tabs=[{k:'wagered',l:'💰 Wagered'},{k:'profit',l:'📈 Profit'},{k:'wins',l:'🏆 Most Wins'},{k:'streak',l:'🔥 Streak'},{k:'multiplier',l:'🚀 Best Multi'}];
  const periods=[{k:'today',l:'Today'},{k:'weekly',l:'Weekly'},{k:'monthly',l:'Monthly'},{k:'all',l:'All Time'}];
  const gameFilters=[{k:'all',l:'All Games'},{k:'crash',l:'🚀 Crash'},{k:'slots',l:'🎰 Slots'},{k:'mines',l:'💣 Mines'},{k:'roulette',l:'🎡 Roulette'},{k:'blackjack',l:'🃏 Blackjack'}];
  const avatars=['🐋','🐺','🦊','💎','🚀','🎮','👑','⭐','🔥','🎯','🐱','🦁','🐉','🦅','🎭','🌟','💀','🤖','🧠','🦄'];
  const walletAddr=computed(()=>{
  if(typeof props.wallet==='string')return props.wallet;
  return props.wallet?.address||props.user?.wallet||'';
  });
  const shortW=computed(()=>{const w=walletAddr.value;return w?`${w.slice(0,6)}...${w.slice(-4)}`:'—';});
  function shortAddr(a){return a?`${a.slice(0,6)}...${a.slice(-4)}`:'—';}
  function avatarFor(i){return avatars[i%avatars.length];}
  function fmt(n){if(n>=1e6)return '$'+(n/1e6).toFixed(1)+'M';if(n>=1e3)return '$'+(n/1e3).toFixed(n>=1e5?0:1)+'K';return '$'+n.toLocaleString();}
  async function fetchData(){
  loading.value=true;
  try{
  const data=await api.getLeaderboard(curTab.value,curPer.value,curGame.value);
  players.value=data.leaderboard||data.players||[];
  myRank.value=data.myRank||null;
  lbData.value={totalPlayers:data.totalPlayers||players.value.length,totalBets:data.totalBets||0,totalWagered:data.totalWagered||0};
  }catch(e){console.error('Leaderboard error:',e);players.value=[];}
  loading.value=false;
  }
  // Timer countdown (weekly reset, client-side)
  const now=new Date();
  const nextSunday=new Date(now);nextSunday.setDate(now.getDate()+(7-now.getDay())%7||7);nextSunday.setHours(0,0,0,0);
  const totalSec=ref(Math.max(0,Math.floor((nextSunday-now)/1000)));
  const tmD=computed(()=>String(Math.floor(totalSec.value/86400)).padStart(2,'0'));
  const tmH=computed(()=>String(Math.floor((totalSec.value%86400)/3600)).padStart(2,'0'));
  const tmM=computed(()=>String(Math.floor((totalSec.value%3600)/60)).padStart(2,'0'));
  const tmS=computed(()=>String(totalSec.value%60).padStart(2,'0'));
  let timerIv=null;
  onMounted(()=>{fetchData();timerIv=setInterval(()=>{if(totalSec.value>0)totalSec.value--;},1000);});
  onUnmounted(()=>{clearInterval(timerIv);});
  </script>
  <style scoped>
  .lb-page{max-width:420px;margin:0 auto;padding-bottom:40px}
  .topbar{display:flex;align-items:center;padding:14px 16px 0}
  .top-title{font-size:16px;font-weight:800;color:#fff}
  .section{padding:0 16px;margin-top:14px}
  .gframe{padding:2px;border-radius:16px;background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff)}
  .gf-in{background:#0c1a30;border-radius:15px;padding:4px}
  .gf-body{background:linear-gradient(180deg,#0e1f38,#0a1628);border-radius:12px;padding:14px}
  .prize-card{text-align:center}
  .prize-label{font-size:10px;font-weight:800;color:#ffde59;text-transform:uppercase;letter-spacing:2px}
  .prize-amt{font-size:36px;font-weight:900;margin-top:4px;background:linear-gradient(90deg,#ffde59,#ffa830,#ff6a00);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
  .prize-sub{font-size:11px;color:#6b82a0;font-weight:600;margin-top:2px}
  .prize-timer{display:flex;gap:8px;justify-content:center;margin-top:12px}
  .pt-box{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:8px 12px;text-align:center;min-width:54px}
  .pt-val{font-size:20px;font-weight:900;color:#fff}
  .pt-lbl{font-size:8px;color:#6b82a0;font-weight:700;text-transform:uppercase}
  .prizes-row{display:flex;gap:4px;margin-top:8px;justify-content:center}
  .pr-item{padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);text-align:center;font-size:9px;flex:1}
  .pr-rank{font-weight:800;margin-bottom:2px}.pr-amt{font-weight:800}
  .tabs{display:flex;gap:4px;padding:14px 16px 0;overflow-x:auto}
  .tab{padding:8px 16px;border-radius:12px;border:none;background:rgba(255,255,255,.04);color:#6b82a0;font-size:11px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;white-space:nowrap;flex-shrink:0}
  .tab.on{background:linear-gradient(180deg,#ffa830,#e08800);color:#fff;box-shadow:0 3px 14px rgba(255,168,48,.3)}
  .period{display:flex;gap:4px;padding:10px 16px 0}
  .per{flex:1;padding:7px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);text-align:center;font-size:10px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;color:#6b82a0}
  .per.on{border-color:#ffde5955;background:rgba(255,222,89,.06);color:#ffde59}
  .gfilter{display:flex;gap:4px;padding:8px 16px 0;overflow-x:auto}
  .gf{padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);font-size:10px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;color:#6b82a0;white-space:nowrap;flex-shrink:0}
  .gf.on{border-color:#3df06a44;background:rgba(61,240,106,.06);color:#3df06a}
  .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:0 16px;margin-top:14px}
  .sg-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:10px;text-align:center}
  .sg-v{font-size:16px;font-weight:900}.sg-l{font-size:8px;color:#6b82a0;font-weight:700;text-transform:uppercase;margin-top:2px}
  .spinner{width:28px;height:28px;border:3px solid rgba(255,255,255,.1);border-top-color:#ffa830;border-radius:50%;animation:spin .6s linear infinite;margin:0 auto}
  @keyframes spin{to{transform:rotate(360deg)}}
  .myrank{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:linear-gradient(135deg,rgba(61,240,106,.06),rgba(32,240,255,.04));border:1px solid rgba(61,240,106,.15)}
  .mr-rank{width:36px;height:36px;border-radius:10px;background:linear-gradient(180deg,#3df06a22,#22b84522);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#3df06a;flex-shrink:0}
  .mr-av{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;border:2px solid #3df06a44;background:rgba(255,255,255,.05)}
  .mr-info{flex:1}.mr-name{font-size:12px;font-weight:800;color:#3df06a}.mr-meta{font-size:9px;color:#6b82a0}
  .mr-val{text-align:right;flex-shrink:0}.mr-amt{font-size:14px;font-weight:900;color:#3df06a}.mr-sub2{font-size:9px;color:#6b82a0}
  .podium-wrap{padding:14px 16px 0}
  .podium{display:flex;align-items:flex-end;justify-content:center;gap:8px;height:240px}
  .pod{display:flex;flex-direction:column;align-items:center;width:110px}
  .pod-card{width:100%;display:flex;flex-direction:column;align-items:center;padding:12px 6px 0}
  .pod-crown{font-size:24px;margin-bottom:-4px;filter:drop-shadow(0 2px 6px rgba(255,222,89,.4))}
  .pod-av-ring{padding:3px;border-radius:50%;margin-bottom:6px}
  .r1{width:72px;height:72px;background:linear-gradient(180deg,#ffde59,#ffa830)}
  .r2{width:60px;height:60px;background:linear-gradient(180deg,#c0c0c0,#888)}
  .r3{width:60px;height:60px;background:linear-gradient(180deg,#cd7f32,#a0601a)}
  .pod-av{width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;background:rgba(255,255,255,.05)}
  .pod-name{font-size:11px;font-weight:800;color:#fff;margin-top:2px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pod-amt{font-size:13px;font-weight:900;margin-top:2px}.s1{color:#ffde59}.s2{color:#c0c0c0}.s3{color:#cd7f32}
  .pod-wins{font-size:9px;color:#6b82a0;font-weight:600}
  .pod-bar{width:100%;border-radius:12px 12px 0 0;display:flex;align-items:flex-start;justify-content:center;padding-top:10px;font-size:28px;font-weight:900;margin-top:8px}
  .b1{height:100px;background:linear-gradient(180deg,#ffde5920,#ffde5905)}
  .b2{height:72px;background:linear-gradient(180deg,#c0c0c020,#c0c0c005)}
  .b3{height:55px;background:linear-gradient(180deg,#cd7f3220,#cd7f3205)}
  .list-header{display:flex;padding:6px 10px;font-size:9px;color:#4a6080;font-weight:700;text-transform:uppercase}
  .lh-r{width:36px}.lh-u{flex:1}.lh-s{width:70px;text-align:right}.lh-v{width:80px;text-align:right}
  .lb-row{display:flex;align-items:center;padding:10px;border-radius:12px;margin-bottom:4px;cursor:pointer;transition:background .15s}
  .lb-row:hover{background:rgba(255,255,255,.03)}
  .lb-row.me{background:rgba(61,240,106,.04);border:1px solid rgba(61,240,106,.1)}
  .lr-rank{width:36px;font-size:13px;font-weight:900;color:#6b82a0;flex-shrink:0}
  .lr-rank.t10{color:#ffde59}
  .lr-av{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;background:rgba(255,255,255,.05);flex-shrink:0;margin-right:8px}
  .lr-info{flex:1;min-width:0}
  .lr-name{font-size:12px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lr-meta{font-size:9px;color:#6b82a0}
  .lr-val2{width:80px;text-align:right;flex-shrink:0}
  .lr-vv{font-size:13px;font-weight:900}.lr-vl{font-size:8px;color:#6b82a0}
  .empty{text-align:center;padding:40px 20px;color:#6b82a0}
  .empty-ico{font-size:48px;opacity:.4;margin-bottom:8px}
  .empty-txt{font-size:13px;font-weight:600}
  </style>