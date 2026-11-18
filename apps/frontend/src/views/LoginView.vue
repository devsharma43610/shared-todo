<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { friendlyAuthError } from '@/lib/firebase';
import { useAuthStore } from '@/stores/auth';

type Mode = 'login' | 'signup';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const mode = ref<Mode>('login');
const email = ref('');
const password = ref('');
const displayName = ref('');
const submitting = ref(false);
const error = ref<string | null>(null);

const title = computed(() => (mode.value === 'login' ? 'Welcome back' : 'Create your account'));

function switchMode(next: Mode) {
  mode.value = next;
  error.value = null;
}

async function submit() {
  error.value = null;
  submitting.value = true;
  try {
    if (mode.value === 'signup') {
      await authStore.signup(email.value.trim(), password.value, displayName.value.trim());
    } else {
      await authStore.login(email.value.trim(), password.value);
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/tasks';
    await router.push(redirect);
  } catch (err) {
    error.value = friendlyAuthError(err);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card card">
      <div class="brand brand-lg">
        <img src="/favicon.svg" alt="" width="36" height="36" />
        <span>Shared To-Do</span>
      </div>

      <div class="segmented" role="tablist">
        <button
          role="tab"
          :aria-selected="mode === 'login'"
          :class="{ active: mode === 'login' }"
          data-test="mode-login"
          @click="switchMode('login')"
        >
          Log in
        </button>
        <button
          role="tab"
          :aria-selected="mode === 'signup'"
          :class="{ active: mode === 'signup' }"
          data-test="mode-signup"
          @click="switchMode('signup')"
        >
          Sign up
        </button>
      </div>

      <h1>{{ title }}</h1>

      <form class="form" @submit.prevent="submit">
        <label v-if="mode === 'signup'" class="field">
          <span>Name</span>
          <input v-model="displayName" name="displayName" autocomplete="name" placeholder="Your name" />
        </label>
        <label class="field">
          <span>Email (login ID)</span>
          <input
            v-model="email"
            name="email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            required
          />
        </label>
        <label class="field">
          <span>Password</span>
          <input
            v-model="password"
            name="password"
            type="password"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            placeholder="At least 6 characters"
            minlength="6"
            required
          />
        </label>

        <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>

        <button class="btn btn-primary btn-block" type="submit" :disabled="submitting">
          {{ submitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account' }}
        </button>
      </form>
    </div>
  </div>
</template>
