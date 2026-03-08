<template>
    <UserPanel :balances="balances" :wallet="wallet" :user="user" @balanceUpdate="$emit('balanceUpdate')" @logout="$emit('logout')" />
    </template>
    <script setup>
    import UserPanel from '../components/UserPanel.vue';
    defineProps({ balances: Array, wallet: [Object, String], user: Object, connected: Boolean });
    defineEmits(['balanceUpdate', 'logout']);
    </script>