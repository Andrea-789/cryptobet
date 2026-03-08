import { createRouter, createWebHistory } from 'vue-router';
import Home from '../pages/Home.vue';
const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/connect', name: 'connect', component: () => import('../pages/ConnectPage.vue'), meta: { public: true } },
  { path: '/casino', name: 'casino', component: () => import('../pages/Casino.vue') },
  { path: '/games', name: 'games', component: () => import('../pages/Games.vue') },
  { path: '/spin', name: 'spin', component: () => import('../components/SpinWheel.vue') },
  { path: '/exchange', name: 'exchange', component: () => import('../pages/ExchangePage.vue') },
  { path: '/wallet', name: 'wallet', component: () => import('../pages/WalletPage.vue') },
  { path: '/profile', name: 'profile', component: () => import('../pages/ProfilePage.vue') },
  { path: '/blackjack', name: 'blackjack', component: () => import('../components/Blackjack.vue') },
  { path: '/crash', name: 'crash', component: () => import('../components/CrashGame.vue') },
  { path: '/dice', name: 'dice', component: () => import('../components/DiceGame.vue') },
  { path: '/hilo', name: 'hilo', component: () => import('../components/HiLoGame.vue') },
  { path: '/mines', name: 'mines', component: () => import('../components/MinesGame.vue') },
  { path: '/plinko', name: 'plinko', component: () => import('../components/PlinkoGame.vue') },
  { path: '/roulette', name: 'roulette', component: () => import('../components/RouletteGame.vue') },
  { path: '/slots', name: 'slots', component: () => import('../components/SlotMachine.vue') },
  { path: '/vip', name: 'vip', component: () => import('../pages/VipPage.vue') },
  { path: '/trading', name: 'Trading', component: () => import('../components/TradingView.vue') },
  { path: '/deposit', name: 'deposit', component: () => import('../pages/DepositWithdrawPage.vue') },
  { path: '/fair', name: 'fair', component: () => import('../pages/FairPage.vue') },
  { path: '/admin', name: 'admin', component: () => import('../pages/AdminPage.vue'), meta: { requiresAdmin: true } },
  { path: '/account', name: 'account', component: () => import('../pages/UserPanelPage.vue') },
  { path: '/notifications', name: 'notifications', component: () => import('../pages/NotificationsPage.vue') },
  { path: '/leaderboard', name: 'leaderboard', component: () => import('../pages/LeaderboardPage.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() { return { top: 0 }; }
});
router.beforeEach((to) => {
  const token = localStorage.getItem('token');

  if (to.meta.public) {
    if (token) return '/';
    return;
  }
  if (!token) return '/connect';
  if (to.meta.requiresAdmin) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'admin') return '/';
    } catch { return '/'; }
  }
});
export default router;