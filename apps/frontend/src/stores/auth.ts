import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api, json } from '@/lib/api';
import { auth } from '@/lib/firebase';
import type { User } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  /** The user record from our backend (not the Firebase user). */
  const user = ref<User | null>(null);
  const isAuthenticated = computed(() => user.value !== null);

  let initPromise: Promise<void> | null = null;

  /** Restores the session on page load (Firebase keeps the user signed in). */
  function init(): Promise<void> {
    initPromise ??= new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        unsubscribe();
        if (firebaseUser) {
          try {
            user.value = await api<User>('/auth/login', { method: 'POST' });
          } catch {
            await signOut(auth);
            user.value = null;
          }
        }
        resolve();
      });
    });
    return initPromise;
  }

  async function signup(email: string, password: string, displayName: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }
    try {
      user.value = await api<User>('/auth/signup', {
        method: 'POST',
        body: json(displayName ? { displayName } : {}),
      });
    } catch (err) {
      await signOut(auth);
      throw err;
    }
  }

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
    try {
      user.value = await api<User>('/auth/login', { method: 'POST' });
    } catch (err) {
      await signOut(auth);
      throw err;
    }
  }

  async function logout() {
    await signOut(auth);
    user.value = null;
  }

  return { user, isAuthenticated, init, signup, login, logout };
});
