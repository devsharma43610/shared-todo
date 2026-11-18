<script setup lang="ts">
import { computed, ref } from 'vue';
import AppModal from './AppModal.vue';
import { useTasksStore } from '@/stores/tasks';
import { STATUS_LABELS, type Task, type TaskStatus } from '@/types';

/** Create a new task (no `task` prop) or edit an existing one. */
const props = defineProps<{ task?: Task | null }>();
const emit = defineEmits<{ close: [] }>();

const tasksStore = useTasksStore();
const isEdit = computed(() => !!props.task);

const title = ref(props.task?.title ?? '');
const description = ref(props.task?.description ?? '');
const status = ref<TaskStatus>(props.task?.status ?? 'todo');
const dueDate = ref(props.task?.dueDate ? props.task.dueDate.slice(0, 10) : '');
const saving = ref(false);
const error = ref<string | null>(null);

async function save() {
  if (!title.value.trim()) {
    error.value = 'Title is required.';
    return;
  }
  saving.value = true;
  error.value = null;
  const input = {
    title: title.value.trim(),
    description: description.value.trim() || null,
    status: status.value,
    dueDate: dueDate.value ? new Date(`${dueDate.value}T00:00:00`).toISOString() : null,
  };
  try {
    if (props.task) {
      await tasksStore.updateTask(props.task.id, input);
    } else {
      await tasksStore.createTask(input);
    }
    emit('close');
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppModal :title="isEdit ? 'Edit task' : 'New task'" @close="emit('close')">
    <form id="task-form" class="form" @submit.prevent="save">
      <label class="field">
        <span>Title</span>
        <input v-model="title" name="title" maxlength="200" placeholder="What needs doing?" autofocus />
      </label>
      <label class="field">
        <span>Description <em class="muted">(optional)</em></span>
        <textarea v-model="description" name="description" rows="3" maxlength="5000" />
      </label>
      <div class="field-row">
        <label class="field">
          <span>Status</span>
          <select v-model="status" name="status">
            <option v-for="(label, value) in STATUS_LABELS" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>Due date <em class="muted">(optional)</em></span>
          <input v-model="dueDate" name="dueDate" type="date" />
        </label>
      </div>
      <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>
    </form>
    <template #footer>
      <button class="btn btn-ghost" type="button" @click="emit('close')">Cancel</button>
      <button class="btn btn-primary" type="submit" form="task-form" :disabled="saving">
        {{ saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create task' }}
      </button>
    </template>
  </AppModal>
</template>
