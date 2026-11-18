import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api, json } from '@/lib/api';
import type { Task, TaskFilter, TaskInput, User } from '@/types';

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([]);
  const filter = ref<TaskFilter>('all');
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchTasks() {
    loading.value = true;
    error.value = null;
    try {
      tasks.value = await api<Task[]>(`/tasks?filter=${filter.value}`);
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function setFilter(value: TaskFilter) {
    filter.value = value;
    await fetchTasks();
  }

  /** Replace a task in the list, or drop it if it no longer matches the current filter. */
  function upsertLocal(task: Task) {
    const matches =
      filter.value === 'all' ||
      (filter.value === 'mine' && task.permission === 'owner') ||
      (filter.value === 'shared' && task.permission === 'editor');
    const index = tasks.value.findIndex((t) => t.id === task.id);
    if (!matches) {
      if (index !== -1) tasks.value.splice(index, 1);
    } else if (index === -1) {
      tasks.value.unshift(task);
    } else {
      tasks.value[index] = task;
    }
  }

  function removeLocal(id: string) {
    tasks.value = tasks.value.filter((t) => t.id !== id);
  }

  async function createTask(input: TaskInput & { title: string }) {
    const task = await api<Task>('/tasks', { method: 'POST', body: json(input) });
    upsertLocal(task);
    return task;
  }

  async function updateTask(id: string, input: TaskInput) {
    const task = await api<Task>(`/tasks/${id}`, { method: 'PATCH', body: json(input) });
    upsertLocal(task);
    return task;
  }

  async function deleteTask(id: string) {
    await api<void>(`/tasks/${id}`, { method: 'DELETE' });
    removeLocal(id);
  }

  async function shareTask(id: string, userIds: string[]) {
    const task = await api<Task>(`/tasks/${id}/shares`, {
      method: 'POST',
      body: json({ userIds }),
    });
    upsertLocal(task);
    return task;
  }

  /** Owner removes someone — or a shared user removes themselves (leaves the task). */
  async function unshareTask(task: Task, userId: string) {
    await api<void>(`/tasks/${task.id}/shares/${userId}`, { method: 'DELETE' });
    if (task.permission === 'editor') {
      removeLocal(task.id);
      return null;
    }
    const updated = { ...task, sharedWith: task.sharedWith.filter((u) => u.id !== userId) };
    upsertLocal(updated);
    return updated;
  }

  async function searchUsers(search: string) {
    return api<User[]>(`/users?search=${encodeURIComponent(search)}`);
  }

  function reset() {
    tasks.value = [];
    filter.value = 'all';
    error.value = null;
  }

  return {
    tasks,
    filter,
    loading,
    error,
    fetchTasks,
    setFilter,
    createTask,
    updateTask,
    deleteTask,
    shareTask,
    unshareTask,
    searchUsers,
    reset,
  };
});
