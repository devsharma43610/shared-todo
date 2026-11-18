<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import ShareTaskModal from '@/components/ShareTaskModal.vue';
import TaskCard from '@/components/TaskCard.vue';
import TaskEditorModal from '@/components/TaskEditorModal.vue';
import { useTasksStore } from '@/stores/tasks';
import { FILTER_LABELS, type Task, type TaskFilter } from '@/types';

const tasksStore = useTasksStore();

const editorOpen = ref(false);
const editing = ref<Task | null>(null);
const sharing = ref<Task | null>(null);

const emptyMessage = computed(() => {
  switch (tasksStore.filter) {
    case 'mine':
      return "You haven't created any tasks yet.";
    case 'shared':
      return 'Nobody has shared a task with you yet.';
    default:
      return 'No tasks yet. Create your first one!';
  }
});

const counts = computed(() => {
  const done = tasksStore.tasks.filter((t) => t.status === 'done').length;
  return { total: tasksStore.tasks.length, done };
});

function openCreate() {
  editing.value = null;
  editorOpen.value = true;
}

function openEdit(task: Task) {
  editing.value = task;
  editorOpen.value = true;
}

function onFilterChange(event: Event) {
  void tasksStore.setFilter((event.target as HTMLSelectElement).value as TaskFilter);
}

onMounted(() => tasksStore.fetchTasks());
</script>

<template>
  <div class="container">
    <div class="toolbar">
      <div>
        <h1>Tasks</h1>
        <p class="muted small">
          {{ counts.total }} {{ counts.total === 1 ? 'task' : 'tasks' }} · {{ counts.done }} done
        </p>
      </div>
      <div class="toolbar-actions">
        <label class="filter">
          <span class="sr-only">Filter tasks</span>
          <select :value="tasksStore.filter" data-test="filter" @change="onFilterChange">
            <option v-for="(label, value) in FILTER_LABELS" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
        </label>
        <button class="btn btn-primary" data-test="new-task" @click="openCreate">+ New task</button>
      </div>
    </div>

    <p v-if="tasksStore.error" class="alert alert-error" role="alert">
      {{ tasksStore.error }}
      <button class="btn btn-link" @click="tasksStore.fetchTasks()">Retry</button>
    </p>

    <div v-if="tasksStore.loading && !tasksStore.tasks.length" class="empty muted">Loading tasks…</div>
    <div v-else-if="!tasksStore.tasks.length && !tasksStore.error" class="empty card">
      <p>{{ emptyMessage }}</p>
      <button v-if="tasksStore.filter !== 'shared'" class="btn btn-primary" @click="openCreate">
        Create a task
      </button>
    </div>

    <TransitionGroup v-else name="list" tag="div" class="task-list">
      <TaskCard
        v-for="task in tasksStore.tasks"
        :key="task.id"
        :task="task"
        @edit="openEdit"
        @share="sharing = $event"
      />
    </TransitionGroup>

    <TaskEditorModal v-if="editorOpen" :task="editing" @close="editorOpen = false" />
    <ShareTaskModal v-if="sharing" :task="sharing" @close="sharing = null" />
  </div>
</template>
