const { z } = require('zod');

const challengeIdParamsSchema = {
  params: z.object({
    id: z.string().length(24),
  }),
};

const challengeCreateSchema = {
  body: z.object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(10),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Easy'),
    points: z.coerce.number().int().positive().max(10000),
    category: z.string().trim().min(2).max(80).default('Logic'),
  }),
};

const challengeUpdateSchema = {
  body: z
    .object({
      title: z.string().trim().min(3).max(200).optional(),
      description: z.string().trim().min(10).optional(),
      difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
      points: z.coerce.number().int().positive().max(10000).optional(),
      category: z.string().trim().min(2).max(80).optional(),
    })
    .refine((obj) => Object.keys(obj).length > 0, 'At least one field is required'),
};

const challengeQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().trim().optional(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    category: z.string().trim().optional(),
    sortBy: z.enum(['createdAt', 'title', 'difficulty', 'points']).default('createdAt'),
    sortDir: z.enum(['asc', 'desc']).default('desc'),
  }),
};

module.exports = {
  challengeIdParamsSchema,
  challengeCreateSchema,
  challengeUpdateSchema,
  challengeQuerySchema,
};

