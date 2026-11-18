import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@/types';

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
  json: (body: unknown) => JSON.stringify(body),
}));

const { api } = await import('@/lib/api');
const { useTasksStore } = await import('./tasks');
const apiMock = vi.mocked(api);

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Task',
  description: null,
  status: 'todo',
  dueDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  owner: { id: 'u1', email: 'a@example.com', displayName: 'A' },
  permission: 'owner',
  sharedWith: [],
  ...overrides,
});

describe('tasks store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
  });

  it('passes the selected filter to the API', async () => {
    apiMock.mockResolvedValue([]);
    const store = useTasksStore();
    await store.setFilter('shared');
    expect(apiMock).toHaveBeenCalledWith('/tasks?filter=shared');
    expect(store.filter).toBe('shared');
  });

  it('adds a created task to the top of the list', async () => {
    const store = useTasksStore();
    store.tasks = [task({ id: 'old' })];
    apiMock.mockResolvedValue(task({ id: 'new' }));
    await store.createTask({ title: 'New' });
    expect(store.tasks.map((t) => t.id)).toEqual(['new', 'old']);
  });

  it('does not show my new task while viewing "Shared Tasks"', async () => {
    const store = useTasksStore();
    store.filter = 'shared';
    apiMock.mockResolvedValue(task({ id: 'new', permission: 'owner' }));
    await store.createTask({ title: 'New' });
    expect(store.tasks).toHaveLength(0);
  });

  it('removes a task locally after delete', async () => {
    const store = useTasksStore();
    store.tasks = [task({ id: 'a' }), task({ id: 'b' })];
    apiMock.mockResolvedValue(undefined);
    await store.deleteTask('a');
    expect(apiMock).toHaveBeenCalledWith('/tasks/a', { method: 'DELETE' });
    expect(store.tasks.map((t) => t.id)).toEqual(['b']);
  });

  it('drops a task from the list when a shared user leaves it', async () => {
    const store = useTasksStore();
    const shared = task({ id: 's', permission: 'editor' });
    store.tasks = [shared];
    apiMock.mockResolvedValue(undefined);
    await store.unshareTask(shared, 'me');
    expect(store.tasks).toHaveLength(0);
  });

  it('surfaces API errors when loading', async () => {
    apiMock.mockRejectedValue(new Error('Cannot reach the server'));
    const store = useTasksStore();
    await store.fetchTasks();
    expect(store.error).toBe('Cannot reach the server');
    expect(store.loading).toBe(false);
  });
});
