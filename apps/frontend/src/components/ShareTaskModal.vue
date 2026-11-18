<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import AppModal from './AppModal.vue';
import { useTasksStore } from '@/stores/tasks';
import type { Task, User } from '@/types';

const props = defineProps<{ task: Task }>();
const emit = defineEmits<{ close: [] }>();

const tasksStore = useTasksStore();

// Keep a local copy so the "shared with" list updates while the popup is open.
const current = ref<Task>(props.task);
const search = ref('');
const results = ref<User[]>([]);
const selected = ref<User[]>([]);
const searching = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);

const alreadySharedIds = computed(() => new Set(current.value.sharedWith.map((u) => u.id)));
const selectedIds = computed(() => new Set(selected.value.map((u) => u.id)));

let timer: ReturnType<typeof setTimeout> | undefined;
let requestId = 0;

watch(search, (term) => {
  clearTimeout(timer);
  const query = term.trim();
  if (!query) {
    results.value = [];
    return;
  }
  timer = setTimeout(async () => {
    const id = ++requestId;
    searching.value = true;
    try {
      const users = await tasksStore.searchUsers(query);
      if (id === requestId) results.value = users;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      if (id === requestId) searching.value = false;
    }
  }, 250);
});

onBeforeUnmount(() => clearTimeout(timer));

function toggle(user: User) {
  if (alreadySharedIds.value.has(user.id)) return;
  selected.value = selectedIds.value.has(user.id)
    ? selected.value.filter((u) => u.id !== user.id)
    : [...selected.value, user];
}

async function share() {
  if (selected.value.length === 0) return;
  saving.value = true;
  error.value = null;
  try {
    current.value = await tasksStore.shareTask(
      current.value.id,
      selected.value.map((u) => u.id),
    );
    selected.value = [];
    search.value = '';
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    saving.value = false;
  }
}

async function remove(user: User) {
  error.value = null;
  try {
    current.value = (await tasksStore.unshareTask(current.value, user.id)) ?? current.value;
  } catch (err) {
    error.value = (err as Error).message;
  }
}

const label = (u: User) => u.displayName || u.email;
</script>

<template>
  <AppModal :title="`Share “${current.title}”`" @close="emit('close')">
    <label class="field">
      <span>Find people by name or email</span>
      <input
        v-model="search"
        name="share-search"
        type="search"
        placeholder="Start typing…"
        autocomplete="off"
        autofocus
      />
    </label>

    <ul v-if="results.length" class="user-list" data-test="search-results">
      <li v-for="user in results" :key="user.id">
        <button
          type="button"
          class="user-option"
          :class="{ selected: selectedIds.has(user.id) }"
          :disabled="alreadySharedIds.has(user.id)"
          @click="toggle(user)"
        >
          <span class="avatar">{{ label(user).charAt(0).toUpperCase() }}</span>
          <span class="user-text">
            <strong>{{ label(user) }}</strong>
            <small class="muted">{{ user.email }}</small>
          </span>
          <span class="user-state">
            {{ alreadySharedIds.has(user.id) ? 'Has access' : selectedIds.has(user.id) ? '✓' : '' }}
          </span>
        </button>
      </li>
    </ul>
    <p v-else-if="search.trim() && !searching" class="muted small">No matching users.</p>

    <div v-if="selected.length" class="chips">
      <span v-for="user in selected" :key="user.id" class="chip">
        {{ label(user) }}
        <button type="button" aria-label="Remove" @click="toggle(user)">✕</button>
      </span>
    </div>

    <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>

    <section class="shared-section">
      <h3>People with access</h3>
      <ul class="access-list">
        <li>
          <span class="avatar">{{ label(current.owner).charAt(0).toUpperCase() }}</span>
          <span class="user-text">
            <strong>{{ label(current.owner) }}</strong>
            <small class="muted">{{ current.owner.email }}</small>
          </span>
          <span class="badge">Owner</span>
        </li>
        <li v-for="user in current.sharedWith" :key="user.id">
          <span class="avatar">{{ label(user).charAt(0).toUpperCase() }}</span>
          <span class="user-text">
            <strong>{{ label(user) }}</strong>
            <small class="muted">{{ user.email }}</small>
          </span>
          <span class="badge badge-soft">Can edit</span>
          <button class="btn btn-link danger" type="button" @click="remove(user)">Remove</button>
        </li>
      </ul>
    </section>

    <template #footer>
      <button class="btn btn-ghost" type="button" @click="emit('close')">Done</button>
      <button
        class="btn btn-primary"
        type="button"
        data-test="share-submit"
        :disabled="saving || selected.length === 0"
        @click="share"
      >
        {{ saving ? 'Sharing…' : `Share${selected.length ? ` with ${selected.length}` : ''}` }}
      </button>
    </template>
  </AppModal>
</template>
