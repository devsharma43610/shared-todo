/**
 * Task permission rules (single source of truth):
 *
 * | Action          | Owner | Shared user |
 * |-----------------|:-----:|:-----------:|
 * | View            |  yes  |     yes     |
 * | Edit            |  yes  |     yes     |
 * | Delete          |  yes  |     no      |
 * | Share / unshare |  yes  |     no      |
 *
 * A shared user may remove *themselves* from a task ("leave" it).
 */

export type TaskPermission = 'owner' | 'editor';

export interface TaskAccessInfo {
  ownerId: string;
  shares: ReadonlyArray<{ userId: string }>;
}

export function getPermission(task: TaskAccessInfo, userId: string): TaskPermission | null {
  if (task.ownerId === userId) return 'owner';
  if (task.shares.some((share) => share.userId === userId)) return 'editor';
  return null;
}

export const canView = (p: TaskPermission | null) => p !== null;
export const canEdit = (p: TaskPermission | null) => p === 'owner' || p === 'editor';
export const canDelete = (p: TaskPermission | null) => p === 'owner';
export const canShare = (p: TaskPermission | null) => p === 'owner';

export function canRemoveShare(
  p: TaskPermission | null,
  currentUserId: string,
  targetUserId: string,
): boolean {
  return p === 'owner' || (p === 'editor' && currentUserId === targetUserId);
}
