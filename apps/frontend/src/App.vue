<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';

const authStore = useAuthStore();
const tasksStore = useTasksStore();
const router = useRouter();

async function logout() {
  await authStore.logout();
  tasksStore.reset();
  await router.push({ name: 'login' });
}
</script>

<template>
  <div class="app">
    <header v-if="authStore.isAuthenticated" class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <img src="/favicon.svg" alt="" width="26" height="26" />
          <span>Shared To-Do</span>
        </div>
        <nav class="tabs" aria-label="Main">
          <RouterLink to="/tasks" class="tab">Tasks</RouterLink>
          <RouterLink to="/profile" class="tab">Profile</RouterLink>
        </nav>
        <div class="topbar-user">
          <span class="muted">{{ authStore.user?.displayName || authStore.user?.email }}</span>
          <button class="btn btn-ghost" data-test="logout" @click="logout">Log out</button>
        </div>
      </div>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>
