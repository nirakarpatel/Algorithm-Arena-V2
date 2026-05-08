const { z } = require("zod");

const challengeIdParamsSchema = {
  params: z.object({
    id: z.string().length(24),
  }),
};

const codeSnippetSchema = z.object({
  lang: z.string(),
  langSlug: z.string(),
  code: z.string(),
});

const challengeCreateSchema = {
  body: z.object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(10),
    link: z.string().trim().url().optional().or(z.literal("")),
    difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Easy"),
    points: z.coerce.number().int().positive().max(10000),
    category: z.string().trim().min(2).max(80).default("Logic"),
    tags: z.array(z.string().trim()).optional().default([]),
    codeSnippets: z.array(codeSnippetSchema).optional().default([]),
  }),
};

const leetcodeQuerySchema = z.object({
  query: z.object({
    slug: z.string().min(1, "LeetCode slug is required"),
  }),
});

const challengeUpdateSchema = {
  body: z
    .object({
      title: z.string().trim().min(3).max(200).optional(),
      description: z.string().trim().min(10).optional(),
      link: z.string().trim().url().optional().or(z.literal("")),
      difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
      points: z.coerce.number().int().positive().max(10000).optional(),
      category: z.string().trim().min(2).max(80).optional(),
      tags: z.array(z.string().trim()).optional(),
      codeSnippets: z.array(codeSnippetSchema).optional(),
    })
    .refine(
      (obj) => Object.keys(obj).length > 0,
      "At least one field is required",
    ),
};

const challengeQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().trim().optional(),
    difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
    category: z.string().trim().optional(),
    tag: z.string().trim().optional(),
    sortBy: z
      .enum(["createdAt", "title", "difficulty", "points"])
      .default("createdAt"),
    sortDir: z.enum(["asc", "desc"]).default("desc"),
  }),
};

module.exports = {
  challengeIdParamsSchema,
  challengeCreateSchema,
  challengeUpdateSchema,
  challengeQuerySchema,
  leetcodeQuerySchema,
};
