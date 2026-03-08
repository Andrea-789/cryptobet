<template>
    <div class="wallet-page">
    <Wallet v-if="wallet" :wallet="wallet" :balances="balances" @balanceUpdate="fetchProfile" />
    <div v-else class="no-wallet">
    <p>Connect your wallet to view balances</p>
    <button class="btn-connect" @click="connect">🔗 Connect Wallet</button>
    </div>
    </div>
    </template>
    <script setup>
    import Wallet from './Wallet.vue';
    import { useWallet } from '../composables/useWallet.js';
    const { wallet, balances, connect, fetchProfile } = useWallet();
    </script>
    <style scoped>
    .wallet-page{padding:20px;max-width:600px;margin:0 auto}
    .no-wallet{text-align:center;padding:40px 20px;color:#6b82a0}
    .btn-connect{margin-top:16px;padding:12px 24px;border-radius:20px;border:none;background:linear-gradient(180deg,#3df06a,#22b845);color:#fff;font-size:14px;font-weight:700;cursor:pointer}
    </style>