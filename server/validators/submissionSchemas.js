const { z } = require('zod');

const submissionIdParamsSchema = {
  params: z.object({
    id: z.string().length(24),
  }),
};

const submissionCreateSchema = {
  body: z
    .object({
      challengeId: z.string().length(24),
      repositoryUrl: z.string().trim().url().optional(),
      code: z.string().trim().min(1).max(50000).optional(),
      language: z.enum(['javascript', 'python', 'java', 'cpp']).default('javascript'),
    })
    .refine((payload) => payload.repositoryUrl || payload.code, {
      message: 'Please provide code or a repository URL',
      path: ['code'],
    }),
};

const submissionUpdateSchema = {
  body: z.object({
    status: z.enum(['Pending', 'Accepted', 'Rejected']),
  }),
};

const submissionQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    status: z.enum(['Pending', 'Accepted', 'Rejected']).optional(),
    challengeId: z.string().length(24).optional(),
    userId: z.string().length(24).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    sortBy: z.enum(['submittedAt', 'status']).default('submittedAt'),
    sortDir: z.enum(['asc', 'desc']).default('desc'),
  }),
};

const leaderboardQuerySchema = {
  query: z.object({
    window: z.enum(['all', '30d', '7d']).default('all'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
};

const mySubmissionQuerySchema = {
  query: z.object({
    challengeId: z.string().length(24).optional(),
    status: z.enum(['Pending', 'Accepted', 'Rejected']).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
};

module.exports = {
  submissionIdParamsSchema,
  submissionCreateSchema,
  submissionUpdateSchema,
  submissionQuerySchema,
  leaderboardQuerySchema,
  mySubmissionQuerySchema,
};
