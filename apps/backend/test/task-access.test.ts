import { describe, expect, it } from 'vitest';
import {
  canDelete,
  canEdit,
  canRemoveShare,
  canShare,
  canView,
  getPermission,
} from '../src/services/task-access.js';
import { buildTaskFilter } from '../src/services/tasks.js';

const task = { ownerId: 'owner', shares: [{ userId: 'friend' }] };

describe('getPermission', () => {
  it('identifies owner, shared user and stranger', () => {
    expect(getPermission(task, 'owner')).toBe('owner');
    expect(getPermission(task, 'friend')).toBe('editor');
    expect(getPermission(task, 'stranger')).toBeNull();
  });
});

describe('permission rules', () => {
  it('owner can do everything', () => {
    expect([canView, canEdit, canDelete, canShare].every((fn) => fn('owner'))).toBe(true);
  });

  it('shared user can view and edit, but not delete or share', () => {
    expect(canView('editor')).toBe(true);
    expect(canEdit('editor')).toBe(true);
    expect(canDelete('editor')).toBe(false);
    expect(canShare('editor')).toBe(false);
  });

  it('stranger can do nothing', () => {
    expect([canView, canEdit, canDelete, canShare].some((fn) => fn(null))).toBe(false);
  });

  it('shared user can only remove themselves from a task', () => {
    expect(canRemoveShare('editor', 'friend', 'friend')).toBe(true);
    expect(canRemoveShare('editor', 'friend', 'someone-else')).toBe(false);
    expect(canRemoveShare('owner', 'owner', 'friend')).toBe(true);
    expect(canRemoveShare(null, 'x', 'x')).toBe(false);
  });
});

describe('buildTaskFilter', () => {
  it('builds the right where-clause for each filter', () => {
    expect(buildTaskFilter('mine', 'u1')).toEqual({ ownerId: 'u1' });
    expect(buildTaskFilter('shared', 'u1')).toEqual({ shares: { some: { userId: 'u1' } } });
    expect(buildTaskFilter('all', 'u1')).toEqual({
      OR: [{ ownerId: 'u1' }, { shares: { some: { userId: 'u1' } } }],
    });
  });
});
