<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
</script>

<template>
  <div class="container narrow">
    <div class="card profile-card">
      <h2>Profile</h2>
      <dl class="details">
        <dt>Name</dt>
        <dd>{{ authStore.user?.displayName || '—' }}</dd>
        <dt>Email</dt>
        <dd>{{ authStore.user?.email }}</dd>
        <dt>User ID</dt>
        <dd><code>{{ authStore.user?.id }}</code></dd>
      </dl>
      <p class="muted small">
        Other people can find you by name or email when they share a task with you.
      </p>
    </div>
  </div>
</template>
