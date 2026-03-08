<script setup>
const props = defineProps({ user: Object, wallet: String });
</script>

<template>
  <div class="dashboard">
    <div class="card">
      <h3>Profile</h3>
      <p><strong>Wallet:</strong> {{ wallet }}</p>
      <p><strong>ID:</strong> {{ user?.id }}</p>
      <p><strong>Registered:</strong> {{ user ? new Date(user.createdAt).toLocaleDateString('en-US') : '' }}</p>
    </div>
  </div>
</template>