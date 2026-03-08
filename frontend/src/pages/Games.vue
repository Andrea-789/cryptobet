
<template>
<div class="games-page">
  <h2 class="games-title">🎮 Games</h2>
  <div class="games-grid">
    <div v-for="g in games" :key="g.name" class="game-card" @click="router.push(g.route)">
      <div class="game-icon" :style="{background:g.color+'22',boxShadow:'0 0 20px '+g.color+'33'}">
        <span>{{ g.icon }}</span>
      </div>
      <div class="game-name">{{ g.name }}</div>
      <div class="game-arrow" :style="{color:g.color}">→</div>
    </div>
  </div>
</div>
</template>
<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();
const games = [
  { name: 'Spin Wheel', icon: '🎡', route: '/spin', color: '#8050ff' },
  { name: 'Blackjack', icon: '🃏', route: '/blackjack', color: '#3df06a' },
  { name: 'Crash', icon: '🚀', route: '/crash', color: '#ff5050' },
  { name: 'Dice', icon: '🎲', route: '/dice', color: '#ffde59' },
  { name: 'HiLo', icon: '⬆️', route: '/hilo', color: '#ffa830' },
  { name: 'Mines', icon: '💣', route: '/mines', color: '#ff50ff' },
  { name: 'Plinko', icon: '⚡', route: '/plinko', color: '#20f0ff' },
  { name: 'Roulette', icon: '🎰', route: '/roulette', color: '#ffde59' },
  { name: 'Leaderboard', icon: '🏆', route: '/leaderboard', color: '#ffde59' },
  { name: 'VIP Club', icon: '👑', route: '/vip', color: '#ffa830' },
  { name: 'Provably Fair', icon: '🛡️', route: '/fair', color: '#20f0ff' },
  { name: 'Notifications', icon: '🔔', route: '/notifications', color: '#ff5050' }, 
  { name: 'Slots', icon: '🍒', route: '/slots', color: '#ff30ff' },
  { name: 'Coin Flip', icon: '🪙', route: '/casino', color: '#ffc830' },
];
</script>
<style scoped>
.games-page{padding:16px;max-width:440px;margin:0 auto}
.games-title{color:#fff;font-size:22px;font-weight:800;text-align:center;margin-bottom:16px}
.games-grid{display:flex;flex-direction:column;gap:8px}
.game-card{display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;cursor:pointer;transition:all .2s}
.game-card:hover{background:rgba(255,255,255,0.08);transform:translateX(4px)}
.game-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.game-name{flex:1;color:#fff;font-size:14px;font-weight:700}
.game-arrow{font-size:18px;font-weight:800}
</style>