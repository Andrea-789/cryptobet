<template>
    <div class="adm">
    <div class="header">
    <div class="logo">
    <div class="logo-icon"><div class="logo-icon-in">⚙️</div></div>
    <div class="logo-text">Crypto<span>Bet</span></div>
    <div class="admin-badge">ADMIN</div>
    </div>
    </div>
    <div class="tabs">
    <button v-for="(t,i) in tabs" :key="i" :class="['tab',activeTab===i?'on':'']" @click="activeTab=i;loadTab(i)">{{ t }}</button>
    </div>
    <!-- DASHBOARD -->
    <div v-if="activeTab===0" class="view">
    <div v-if="statsLoading" class="loading">Loading...</div>
    <template v-else>
    <div class="stats">
    <div class="stat"><div class="stat-glow" style="background:#3df06a"></div><div class="stat-ico">💰</div><div class="stat-v" style="color:#3df06a">${{ fmt(st.revenueToday) }}</div><div class="stat-l">Revenue Today</div></div>
    <div class="stat"><div class="stat-glow" style="background:#20f0ff"></div><div class="stat-ico">👥</div><div class="stat-v" style="color:#20f0ff">{{ st.totalUsers }}</div><div class="stat-l">Total Users</div></div>
    <div class="stat"><div class="stat-glow" style="background:#ffa830"></div><div class="stat-ico">🎲</div><div class="stat-v" style="color:#ffa830">{{ st.betsToday }}</div><div class="stat-l">Bets Today</div></div>
    <div class="stat"><div class="stat-glow" style="background:#a080ff"></div><div class="stat-ico">🆕</div><div class="stat-v" style="color:#a080ff">{{ st.newUsersToday }}</div><div class="stat-l">New Today</div></div>
    </div>
    <div class="sec">
    <div class="sec-hdr"><span class="sec-title">Revenue (7 Days)</span></div>
    <div class="gframe"><div class="gf-in"><div class="gf-in2"><div class="gf-body">
    <canvas ref="revChart" width="740" height="200" style="width:100%;height:100px"></canvas>
    </div></div></div></div>
    </div>
    <div class="sec" v-if="st.gamePerformance?.length">
    <div class="sec-hdr"><span class="sec-title">Game Performance</span></div>
    <div class="pg-wrap">
    <div v-for="g in st.gamePerformance" :key="g.name" class="pg-row">
    <div class="pg-lbl">{{ g.name }}</div>
    <div class="pg-bar"><div class="pg-fill" :style="{width:g.pct+'%',background:gameCols[g.name]||'#6b82a0'}"></div></div>
    <div class="pg-val" :style="{color:gameCols[g.name]||'#6b82a0'}">{{ g.pct }}%</div>
    </div>
    </div>
    </div>
    <div class="sec">
    <div class="sec-hdr"><span class="sec-title">Finance Overview</span></div>
    <div class="stats" style="grid-template-columns:repeat(2,1fr)">
    <div class="stat"><div class="stat-ico">📥</div><div class="stat-v" style="color:#3df06a;font-size:16px">${{ fmt(st.totalDeposits) }}</div><div class="stat-l">Total Deposits</div></div>
    <div class="stat"><div class="stat-ico">📤</div><div class="stat-v" style="color:#ff5050;font-size:16px">${{ fmt(st.totalWithdrawals) }}</div><div class="stat-l">Total Withdrawals</div></div>
    <div class="stat"><div class="stat-ico">💎</div><div class="stat-v" style="color:#ffa830;font-size:16px">${{ fmt(st.totalDeposits-st.totalWithdrawals) }}</div><div class="stat-l">Net Profit</div></div>
    <div class="stat"><div class="stat-ico">⏳</div><div class="stat-v" style="color:#20f0ff;font-size:16px">{{ st.pendingWithdrawals }}</div><div class="stat-l">Pending Withdrawals</div></div>
    </div>
    </div>
    <div class="sec" v-if="bigWins.length">
    <div class="sec-hdr"><span class="sec-title">Top Wins</span></div>
    <div v-for="b in bigWins" :key="b.id" class="u-row">
    <div class="u-av">🏆</div>
    <div class="u-info"><div class="u-name">{{ shortAddr(b.wallet_address) }}</div><div class="u-meta">{{ b.game }} • {{ timeAgo(b.created_at) }}</div></div>
    <div class="u-right"><div class="u-val" style="color:#3df06a">+{{ parseFloat(b.payout).toFixed(4) }}</div></div>
    </div>
    </div>
    </template>
    </div>
    <!-- USERS -->
    <div v-if="activeTab===1" class="view">
    <div style="margin-top:12px">
    <div class="srch"><span>🔍</span><input v-model="userSearch" @input="searchUsers" placeholder="Search by wallet address..."></div>
    <div class="filters">
    <button v-for="f in userFilters" :key="f.k" :class="['flt',userFilter===f.k?'on':'']" @click="userFilter=f.k;loadUsers()">{{ f.l }}</button>
    </div>
    <div style="font-size:11px;color:#6b82a0;font-weight:600;margin-bottom:8px">{{ usersTotal }} total users</div>
    <div v-for="u in usersList" :key="u.id" class="u-row">
    <div class="u-av">👤</div>
    <div class="u-info"><div class="u-name">{{ shortAddr(u.wallet_address) }}</div><div class="u-meta">Bets: {{ u.total_bets }} • Wagered: {{ parseFloat(u.total_wagered).toFixed(2) }}</div></div>
    <div class="u-right">
    <div class="u-val">{{ parseFloat(u.total_balance).toFixed(4) }}</div>
    <div style="display:flex;gap:3px;justify-content:flex-end;margin-top:2px">
    <span :class="['badge',u.role==='admin'?'b-blue':u.role==='banned'?'b-red':'b-green']">{{ u.role }}</span>
    </div>
    <div style="display:flex;gap:3px;margin-top:4px">
    <button v-if="u.role!=='banned'" class="act-btn ab-red" @click="banUser(u.id,'ban')">Ban</button>
    <button v-else class="act-btn ab-green" @click="banUser(u.id,'unban')">Unban</button>
    </div>
    </div>
    </div>
    </div>
    </div>
    <!-- TRANSACTIONS -->
    <div v-if="activeTab===2" class="view">
    <div class="filters" style="margin-top:12px">
    <button v-for="f in txFilters" :key="f.k" :class="['flt',txFilter===f.k?'on':'']" @click="txFilter=f.k;loadTxs()">{{ f.l }}</button>
    </div>
    <div v-for="t in txList" :key="t.id" class="u-row">
    <div class="u-av" :style="{background:t.type==='deposit'?'rgba(61,240,106,.1)':'rgba(255,64,64,.1)',color:t.type==='deposit'?'#3df06a':'#ff5050'}">{{ t.type==='deposit'?'📥':'📤' }}</div>
    <div class="u-info"><div class="u-name">{{ t.type }} • {{ shortAddr(t.wallet_address) }}</div><div class="u-meta">{{ t.token }} ({{ t.chain }}) • {{ timeAgo(t.created_at) }}</div></div>
    <div class="u-right">
    <div class="u-val" :style="{color:t.type==='deposit'?'#3df06a':'#ff5050'}">{{ parseFloat(t.amount).toFixed(4) }}</div>
    <span :class="['badge',t.status==='confirmed'?'b-green':t.status==='pending'?'b-orange':'b-red']">{{ t.status }}</span>
    <div v-if="t.status==='pending'&&t.type==='withdrawal'" style="display:flex;gap:3px;margin-top:3px">
    <button class="act-btn ab-green" @click="approveWth(t.id,'approve')">✔</button>
    <button class="act-btn ab-red" @click="approveWth(t.id,'reject')">✕</button>
    </div>
    </div>
    </div>
    </div>
    <p v-if="error" class="err">{{ error }}</p>
    </div>
    </template>
    <script setup>
    import { ref, reactive, onMounted, nextTick } from 'vue';
    import api from '../services/api.js';
    const tabs = ['📊 Dashboard','👥 Users','💸 Transactions'];
    const activeTab = ref(0);
    const statsLoading = ref(true), error = ref(null);
    const st = reactive({revenueToday:0,totalUsers:0,newUsersToday:0,betsToday:0,betsVolume:0,totalDeposits:0,totalWithdrawals:0,pendingWithdrawals:0,weekRevenue:[],gamePerformance:[]});
    const bigWins = ref([]);
    const gameCols = {crash:'#ff5050',slots:'#ffa830',mines:'#3df06a',roulette:'#20f0ff',blackjack:'#a080ff',dice:'#ffde59',plinko:'#ff50ff',hilo:'#ff8040',wheel:'#6b82a0',};
    const revChart = ref(null);
    const usersList = ref([]), usersTotal = ref(0), userSearch = ref(''), userFilter = ref('');
    const userFilters = [{l:'All',k:''},{l:'Banned',k:'banned'},{l:'Admin',k:'admin'},{l:'New Today',k:'today'}];
    const txList = ref([]), txFilter = ref('');
    const txFilters = [{l:'All',k:''},{l:'Deposits',k:'deposits'},{l:'Withdrawals',k:'withdrawals'},{l:'Pending',k:'pending'}];
    function fmt(n){return (n||0).toFixed(2)}
    function shortAddr(a){return a?a.slice(0,6)+'...'+a.slice(-4):'-'}
    function timeAgo(d){const s=Math.floor((Date.now()-new Date(d))/1000);if(s<60)return s+'s ago';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';}
    async function loadStats(){
      statsLoading.value=true;error.value=null;
      try{
        const data=await api.getAdminStats();
        Object.assign(st,data);
        const wins=await api.getAdminBigWins();
        bigWins.value=wins.wins||[];
        nextTick(drawRevChart);
      }catch(e){error.value=e.message;}
      finally{statsLoading.value=false;}
    }
    async function loadUsers(){
      try{const data=await api.getAdminUsers(userFilter.value,userSearch.value);usersList.value=data.users;usersTotal.value=data.total;}catch(e){error.value=e.message;}
    }
    let searchTimer=null;
    function searchUsers(){clearTimeout(searchTimer);searchTimer=setTimeout(loadUsers,400);}
    async function banUser(id,action){
      try{await api.banUser(id,action);loadUsers();}catch(e){error.value=e.message;}
    }
    async function loadTxs(){
      try{const data=await api.getAdminTransactions(txFilter.value);txList.value=data.transactions;}catch(e){error.value=e.message;}
    }
    async function approveWth(id,action){
      try{await api.approveWithdrawal(id,action);loadTxs();}catch(e){error.value=e.message;}
    }
    function loadTab(i){if(i===0)loadStats();else if(i===1)loadUsers();else if(i===2)loadTxs();}
    function drawRevChart(){
      if(!revChart.value||!st.weekRevenue?.length)return;
      const cv=revChart.value,ctx=cv.getContext('2d');
      const data=st.weekRevenue.map(r=>r.revenue);
      if(!data.length)return;
      const mx=Math.max(...data,1),mn=Math.min(...data)*0.8;
      const w=740,h=200,pad=10,n=data.length;
      ctx.clearRect(0,0,w,h);
      ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;
      for(let i=0;i<4;i++){const y=pad+i*(h-pad*2)/3;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
      const px=i=>pad+i/Math.max(n-1,1)*(w-pad*2);
      const py=v=>pad+(1-(v-mn)/(mx-mn||1))*(h-pad*2);
      ctx.beginPath();ctx.moveTo(px(0),py(data[0]));
      for(let i=1;i<n;i++)ctx.lineTo(px(i),py(data[i]));
      ctx.lineTo(px(n-1),h);ctx.lineTo(px(0),h);ctx.closePath();
      const fg=ctx.createLinearGradient(0,0,0,h);fg.addColorStop(0,'rgba(61,240,106,0.2)');fg.addColorStop(1,'rgba(61,240,106,0.01)');
      ctx.fillStyle=fg;ctx.fill();
      ctx.beginPath();ctx.moveTo(px(0),py(data[0]));
      for(let i=1;i<n;i++)ctx.lineTo(px(i),py(data[i]));
      const lg=ctx.createLinearGradient(0,0,w,0);lg.addColorStop(0,'#22b845');lg.addColorStop(1,'#3df06a');
      ctx.strokeStyle=lg;ctx.lineWidth=3;ctx.stroke();
      for(let i=0;i<n;i++){ctx.beginPath();ctx.arc(px(i),py(data[i]),4,0,2*Math.PI);ctx.fillStyle='#3df06a';ctx.fill();}
    }
    onMounted(loadStats);
    </script>
    <style scoped>
    .adm{display:flex;flex-direction:column;padding-bottom:24px}
    .header{display:flex;justify-content:space-between;align-items:center;padding:14px 16px 0}
    .logo{display:flex;align-items:center;gap:8px}
    .logo-icon{width:34px;height:34px;border-radius:10px;background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff);display:flex;align-items:center;justify-content:center;padding:2px}
    .logo-icon-in{width:100%;height:100%;border-radius:8px;background:#0c1a30;display:flex;align-items:center;justify-content:center;font-size:16px}
    .logo-text{font-size:14px;font-weight:900;letter-spacing:-.5px}
    .logo-text span{background:linear-gradient(90deg,#ff5050,#ffa830);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
    .admin-badge{font-size:8px;font-weight:800;padding:2px 8px;border-radius:6px;background:linear-gradient(90deg,#ff505033,#ffa83033);color:#ffa830;border:1px solid #ffa83044}
    .tabs{display:flex;gap:3px;padding:10px 10px 0;overflow-x:auto}
    .tab{padding:7px 12px;border-radius:10px;border:none;background:rgba(255,255,255,.04);color:#6b82a0;font-size:10px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;white-space:nowrap;flex-shrink:0}
    .tab.on{background:linear-gradient(180deg,#ffa830,#e08800);color:#fff;box-shadow:0 3px 14px rgba(255,168,48,.3)}
    .view{padding:0 14px}
    .loading{text-align:center;padding:40px;color:#6b82a0;font-weight:600}
    .gframe{width:100%;padding:2px;border-radius:14px;background:conic-gradient(#ff30ff,#ffde59,#30ff70,#20f0ff,#8050ff,#ff30ff)}
    .gf-in{background:#0c1a30;border-radius:13px;padding:2px}
    .gf-in2{padding:2px;border-radius:11px;background:conic-gradient(#ff30ff33,#ffde5933,#30ff7033,#20f0ff33,#8050ff33,#ff30ff33)}
    .gf-body{background:linear-gradient(180deg,#0e1f38,#0a1628);border-radius:10px;padding:14px}
    .stats{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px}
    .stat{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:14px;position:relative;overflow:hidden}
    .stat-glow{position:absolute;width:60px;height:60px;border-radius:50%;filter:blur(30px);opacity:.15;top:-10px;right:-10px}
    .stat-ico{font-size:22px;margin-bottom:6px}.stat-v{font-size:22px;font-weight:900}
    .stat-l{font-size:9px;color:#6b82a0;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
    .sec{margin-top:14px}.sec-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .sec-title{font-size:13px;font-weight:800}
    .pg-wrap{margin-top:6px}.pg-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
    .pg-lbl{font-size:10px;font-weight:600;color:#6b82a0;width:60px;flex-shrink:0}
    .pg-bar{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden}
    .pg-fill{height:100%;border-radius:3px}.pg-val{font-size:10px;font-weight:800;width:38px;text-align:right;flex-shrink:0}
    .u-row{display:flex;align-items:center;padding:8px;background:rgba(255,255,255,.02);border-radius:10px;gap:8px;margin-bottom:4px}
    .u-av{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;background:rgba(255,255,255,.05);flex-shrink:0}
    .u-info{flex:1;min-width:0}.u-name{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .u-meta{font-size:9px;color:#6b82a0;font-weight:500}.u-right{text-align:right;flex-shrink:0}
    .u-val{font-size:12px;font-weight:800}
    .badge{padding:2px 8px;border-radius:6px;font-size:9px;font-weight:700;display:inline-block}
    .b-green{background:rgba(61,240,106,.12);color:#3df06a}.b-red{background:rgba(255,64,64,.12);color:#ff4040}
    .b-orange{background:rgba(255,168,48,.12);color:#ffa830}.b-blue{background:rgba(32,240,255,.12);color:#20f0ff}
    .srch{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:8px 12px;margin-bottom:10px}
    .srch input{background:none;border:none;color:#fff;font-size:12px;font-weight:500;font-family:'Poppins',sans-serif;flex:1;outline:none}
    .srch input::placeholder{color:#4a6080}
    .filters{display:flex;gap:4px;margin-bottom:10px;overflow-x:auto}
    .flt{padding:5px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#6b82a0;font-size:10px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;white-space:nowrap;flex-shrink:0}
    .flt.on{background:rgba(255,168,48,.1);border-color:#ffa83044;color:#ffa830}
    .act-btn{padding:5px 12px;border-radius:8px;border:none;font-size:10px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif}
    .ab-green{background:rgba(61,240,106,.12);color:#3df06a;border:1px solid #3df06a33}
    .ab-red{background:rgba(255,64,64,.12);color:#ff4040;border:1px solid #ff404033}
    .err{color:#ff6b6b;font-size:11px;font-weight:600;text-align:center;background:rgba(255,64,64,.08);padding:8px;border-radius:8px;margin:8px 14px}
    </style>