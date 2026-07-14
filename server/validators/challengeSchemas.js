const { z } = require('zod');

const challengeIdParamsSchema = {
  params: z.object({
    id: z.string().length(24),
  }),
};

const codeSnippetSchema = z.object({
  lang: z.string().trim().min(1),
  langSlug: z.string().trim().min(1),
  code: z.string().min(1),
});

const solutionSchema = codeSnippetSchema;

const testCaseSchema = z.object({
  label: z.string().trim().min(1),
  args: z.any(),
  expected: z.string().min(1),
});

const paramSchema = z.object({
  name: z.string().trim().min(1),
  type: z.string().trim().min(1),
});

const challengeCreateSchema = {
  body: z.object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(10),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Easy'),
    points: z.coerce.number().int().positive().max(10000).default(100),
    category: z.string().trim().min(2).max(80).default('Logic'),
    tags: z.array(z.string().trim()).optional().default([]),
    codeSnippets: z.array(codeSnippetSchema).optional().default([]),
    solutions: z.array(solutionSchema).optional().default([]),
    functionName: z.string().trim().optional().default(''),
    params: z.array(paramSchema).optional().default([]),
    returnType: z.string().trim().optional().default(''),
    orderIndependent: z.coerce.boolean().optional().default(false),
    hints: z.array(z.string().trim()).optional().default([]),
    testCases: z.array(testCaseSchema).optional().default([]),
    link: z.string().url().optional().or(z.literal('')),
    questionSetId: z.string().length(24).optional(),
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
      tags: z.array(z.string().trim()).optional(),
      codeSnippets: z.array(codeSnippetSchema).optional(),
      solutions: z.array(solutionSchema).optional(),
      functionName: z.string().trim().optional(),
      params: z.array(paramSchema).optional(),
      returnType: z.string().trim().optional(),
      orderIndependent: z.coerce.boolean().optional(),
      hints: z.array(z.string().trim()).optional(),
      testCases: z.array(testCaseSchema).optional(),
      link: z.string().url().optional().or(z.literal('')),
      questionSetId: z.string().length(24).optional(),
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
    setId: z.string().trim().optional(),
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
