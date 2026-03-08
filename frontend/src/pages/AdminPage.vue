<template>
    <AdminPanel :balances="balances" :wallet="wallet" :user="user" @balanceUpdate="fetchProfile" />
    </template>
    <script setup>
    import AdminPanel from '../components/AdminPanel.vue';
    import { useWallet } from '../composables/useWallet.js';
    const { balances, wallet, user, fetchProfile } = useWallet();
    </script>