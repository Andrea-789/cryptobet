<template>
    <DepositWithdraw :balances="balances" :wallet="wallet" :user="user" @balanceUpdate="$emit('balanceUpdate')" />
    </template>
    <script setup>
    import DepositWithdraw from '../components/DepositWithdraw.vue';
    defineProps({ balances: Array, wallet: Object, user: Object, connected: Boolean });
    defineEmits(['balanceUpdate']);
    </script>