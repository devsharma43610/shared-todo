/**
 * JSON Schemas used by Fastify for request validation (Ajv) and
 * response serialization (fast-json-stringify).
 */

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export const TASK_FILTERS = ['all', 'mine', 'shared'] as const;

// ---------- shared pieces ----------

export const errorSchema = {
  $id: 'Error',
  type: 'object',
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
} as const;

export const userSchema = {
  $id: 'User',
  type: 'object',
  required: ['id', 'email', 'displayName'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string' },
    displayName: { type: ['string', 'null'] },
  },
} as const;

export const taskSchema = {
  $id: 'Task',
  type: 'object',
  required: [
    'id',
    'title',
    'description',
    'status',
    'dueDate',
    'createdAt',
    'updatedAt',
    'owner',
    'permission',
    'sharedWith',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    description: { type: ['string', 'null'] },
    status: { type: 'string', enum: TASK_STATUSES },
    dueDate: { type: ['string', 'null'], format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    owner: { $ref: 'User#' },
    permission: { type: 'string', enum: ['owner', 'editor'] },
    sharedWith: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          displayName: { type: ['string', 'null'] },
          sharedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
} as const;

/** Registered once on the Fastify instance so routes can use `$ref`. */
export const sharedSchemas = [errorSchema, userSchema, taskSchema];

const errorResponses = {
  400: { $ref: 'Error#' },
  401: { $ref: 'Error#' },
  403: { $ref: 'Error#' },
  404: { $ref: 'Error#' },
} as const;

const idParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } },
} as const;

// ---------- auth ----------

export const signupSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      displayName: { type: 'string', minLength: 1, maxLength: 100 },
    },
  },
  response: { 200: { $ref: 'User#' }, 201: { $ref: 'User#' }, ...errorResponses },
} as const;

export const loginSchema = {
  response: { 200: { $ref: 'User#' }, ...errorResponses },
} as const;

export const meSchema = loginSchema;

// ---------- users ----------

export const searchUsersSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    required: ['search'],
    properties: {
      search: { type: 'string', minLength: 1, maxLength: 100 },
      limit: { type: 'integer', minimum: 1, maximum: 25, default: 10 },
    },
  },
  response: { 200: { type: 'array', items: { $ref: 'User#' } }, ...errorResponses },
} as const;

// ---------- tasks ----------

export const listTasksSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      filter: { type: 'string', enum: TASK_FILTERS, default: 'all' },
      status: { type: 'string', enum: TASK_STATUSES },
    },
  },
  response: { 200: { type: 'array', items: { $ref: 'Task#' } }, ...errorResponses },
} as const;

export const getTaskSchema = {
  params: idParams,
  response: { 200: { $ref: 'Task#' }, ...errorResponses },
} as const;

const taskFields = {
  title: { type: 'string', minLength: 1, maxLength: 200 },
  description: { type: ['string', 'null'], maxLength: 5000 },
  status: { type: 'string', enum: TASK_STATUSES },
  dueDate: { type: ['string', 'null'], format: 'date-time' },
} as const;

export const createTaskSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['title'],
    properties: taskFields,
  },
  response: { 201: { $ref: 'Task#' }, ...errorResponses },
} as const;

export const updateTaskSchema = {
  params: idParams,
  body: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: taskFields,
  },
  response: { 200: { $ref: 'Task#' }, ...errorResponses },
} as const;

export const deleteTaskSchema = {
  params: idParams,
  response: { 204: { type: 'null' }, ...errorResponses },
} as const;

// ---------- sharing ----------

export const shareTaskSchema = {
  params: idParams,
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['userIds'],
    properties: {
      userIds: {
        type: 'array',
        minItems: 1,
        maxItems: 50,
        uniqueItems: true,
        items: { type: 'string', format: 'uuid' },
      },
    },
  },
  response: { 200: { $ref: 'Task#' }, ...errorResponses },
} as const;

export const unshareTaskSchema = {
  params: {
    type: 'object',
    required: ['id', 'userId'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
    },
  },
  response: { 204: { type: 'null' }, ...errorResponses },
} as const;

// ---------- health ----------

export const healthSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        database: { type: 'string' },
        uptimeSeconds: { type: 'number' },
      },
    },
    503: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        database: { type: 'string' },
        uptimeSeconds: { type: 'number' },
      },
    },
  },
} as const;
