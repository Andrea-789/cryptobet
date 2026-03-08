<script setup>
import Exchange from '../components/Exchange.vue';

const props = defineProps({ balances: Array });
const emit = defineEmits(['balanceUpdate']);
</script>

<template>
  <Exchange :balances="balances" @balanceUpdate="emit('balanceUpdate')" />
</template>