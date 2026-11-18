export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskFilter = 'all' | 'mine' | 'shared';
export type TaskPermission = 'owner' | 'editor';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
}

export interface SharedUser extends User {
  sharedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  owner: User;
  permission: TaskPermission;
  sharedWith: SharedUser[];
}

export interface TaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  dueDate?: string | null;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

export const FILTER_LABELS: Record<TaskFilter, string> = {
  all: 'All Tasks',
  mine: 'My Tasks',
  shared: 'Shared Tasks',
};
