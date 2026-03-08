<template>
    <div class="casino">
    <div class="casino-header">
    <h2>🎰 Casino</h2>
    <p class="sub">Choose your game</p>
    </div>
    <div class="games-grid">
    <router-link v-for="g in games" :key="g.route" :to="g.route" class="game-card">
    <div class="game-ico">{{ g.icon }}</div>
    <div class="game-name">{{ g.name }}</div>
    <div class="game-edge">{{ g.edge }}</div>
    </router-link>
    </div>
    </div>
    </template>
    <script setup>
    const games = [
      { name:'Blackjack', icon:'🃏', route:'/blackjack', edge:'1.5% edge' },
      { name:'Crash', icon:'📈', route:'/crash', edge:'3% edge' },
      { name:'Dice', icon:'🎲', route:'/dice', edge:'1% edge' },
      { name:'Hi-Lo', icon:'⬆️', route:'/hilo', edge:'2% edge' },
      { name:'Mines', icon:'💣', route:'/mines', edge:'2% edge' },
      { name:'Plinko', icon:'⚪', route:'/plinko', edge:'1% edge' },
      { name:'Roulette', icon:'🎯', route:'/roulette', edge:'2.7% edge' },
      { name:'Slots', icon:'🎰', route:'/slots', edge:'4% edge' },
      { name:'Spin Wheel', icon:'🎡', route:'/spin', edge:'3% edge' },
    ];
    </script>
    <style scoped>
    .casino{padding:20px;max-width:800px;margin:0 auto}
    .casino-header{text-align:center;margin-bottom:24px}
    .casino-header h2{font-size:24px;font-weight:800;margin:0}
    .sub{color:#6b82a0;font-size:13px;margin-top:4px}
    .games-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .game-card{display:flex;flex-direction:column;align-items:center;padding:20px 12px;border-radius:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);text-decoration:none;color:#fff;transition:all .2s}
    .game-card:hover{background:rgba(255,255,255,0.07);border-color:rgba(61,240,106,0.3);transform:translateY(-2px)}
    .game-ico{font-size:36px;margin-bottom:8px}
    .game-name{font-size:13px;font-weight:700}
    .game-edge{font-size:10px;color:#6b82a0;margin-top:2px}
    @media(max-width:480px){.games-grid{grid-template-columns:repeat(2,1fr)}}
    </style>