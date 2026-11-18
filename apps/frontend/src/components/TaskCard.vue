<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { STATUS_LABELS, type Task, type TaskStatus } from '@/types';

const props = defineProps<{ task: Task }>();
const emit = defineEmits<{ edit: [Task]; share: [Task] }>();

const tasksStore = useTasksStore();
const authStore = useAuthStore();

const busy = ref(false);
const confirmingDelete = ref(false);
const error = ref<string | null>(null);

const isOwner = computed(() => props.task.permission === 'owner');
const isDone = computed(() => props.task.status === 'done');
const ownerLabel = computed(() => props.task.owner.displayName || props.task.owner.email);
const dueLabel = computed(() =>
  props.task.dueDate
    ? new Date(props.task.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : null,
);
const isOverdue = computed(
  () => !!props.task.dueDate && !isDone.value && new Date(props.task.dueDate) < startOfToday(),
);

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function run(action: () => Promise<unknown>) {
  busy.value = true;
  error.value = null;
  try {
    await action();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    busy.value = false;
  }
}

const setStatus = (status: TaskStatus) => run(() => tasksStore.updateTask(props.task.id, { status }));
const toggleDone = () => setStatus(isDone.value ? 'todo' : 'done');
const remove = () => run(() => tasksStore.deleteTask(props.task.id));
const leave = () => run(() => tasksStore.unshareTask(props.task, authStore.user!.id));
</script>

<template>
  <article class="task card" :class="{ done: isDone, busy }" data-test="task-card">
    <button
      class="check"
      :class="{ checked: isDone }"
      :aria-label="isDone ? 'Mark as not done' : 'Mark as done'"
      :disabled="busy"
      @click="toggleDone"
    >
      <svg v-if="isDone" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div class="task-main">
      <div class="task-title-row">
        <h3 class="task-title">{{ task.title }}</h3>
        <span v-if="!isOwner" class="badge badge-soft" title="Shared with you">Shared by {{ ownerLabel }}</span>
      </div>
      <p v-if="task.description" class="task-desc">{{ task.description }}</p>

      <div class="task-meta">
        <select
          class="status-select"
          :class="`status-${task.status}`"
          :value="task.status"
          :disabled="busy"
          aria-label="Status"
          @change="setStatus(($event.target as HTMLSelectElement).value as TaskStatus)"
        >
          <option v-for="(label, value) in STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
        </select>
        <span v-if="dueLabel" class="meta-item" :class="{ overdue: isOverdue }">Due {{ dueLabel }}</span>
        <span v-if="task.sharedWith.length" class="meta-item avatars" :title="task.sharedWith.map((u) => u.displayName || u.email).join(', ')">
          <span v-for="user in task.sharedWith.slice(0, 3)" :key="user.id" class="avatar avatar-sm">
            {{ (user.displayName || user.email).charAt(0).toUpperCase() }}
          </span>
          <span v-if="task.sharedWith.length > 3" class="muted small">+{{ task.sharedWith.length - 3 }}</span>
        </span>
      </div>
      <p v-if="error" class="alert alert-error small" role="alert">{{ error }}</p>
    </div>

    <div class="task-actions">
      <template v-if="confirmingDelete">
        <span class="small">Delete?</span>
        <button class="btn btn-sm btn-danger" data-test="confirm-delete" :disabled="busy" @click="remove">Yes</button>
        <button class="btn btn-sm btn-ghost" @click="confirmingDelete = false">No</button>
      </template>
      <template v-else>
        <button class="btn btn-sm btn-ghost" data-test="edit" @click="emit('edit', task)">Edit</button>
        <template v-if="isOwner">
          <button class="btn btn-sm btn-ghost" data-test="share" @click="emit('share', task)">Share</button>
          <button class="btn btn-sm btn-ghost danger" data-test="delete" @click="confirmingDelete = true">Delete</button>
        </template>
        <button v-else class="btn btn-sm btn-ghost danger" data-test="leave" :disabled="busy" @click="leave">Leave</button>
      </template>
    </div>
  </article>
</template>
