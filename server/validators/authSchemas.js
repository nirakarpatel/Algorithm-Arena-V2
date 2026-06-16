const { z } = require('zod');

const googleAuthSchema = {
  body: z.object({
    idToken: z.string().min(1, 'Firebase ID token is required'),
  }),
};

const claimUsernameSchema = {
  body: z.object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(60, 'Name must be at most 60 characters')
      .regex(/^[a-zA-Z\s'\-\.]+$/, 'Name contains invalid characters'),
    regNo: z
      .string()
      .trim()
      .min(6, 'Registration number must be at least 6 characters')
      .max(20, 'Registration number must be at most 20 characters')
      .regex(/^[a-zA-Z0-9]+$/, 'Registration number must be alphanumeric'),
    branch: z.enum(['B.Tech CSE', 'B.Tech ECE', 'B.Tech EEE', 'MCA']),
    year: z.enum(['First Year', 'Second Year', 'Third Year', 'Fourth Year']),
    section: z
      .string()
      .trim()
      .min(1, 'Section is required')
      .max(20, 'Section must be at most 20 characters')
      .regex(/^[a-zA-Z0-9]+$/, 'Section must be alphanumeric'),
  }).strict(),
};

const refreshSchema = {
  body: z.object({}).optional(),
};

const url = z.string().trim().url().max(512).optional().or(z.literal(''));

const updateMeSchema = {
  body: z.object({
    bio:            z.string().trim().max(500).optional(),
    branch:         z.enum(['B.Tech CSE', 'B.Tech ECE', 'B.Tech EEE', 'MCA']).optional(),
    year:           z.enum(['First Year', 'Second Year', 'Third Year', 'Fourth Year']).optional().or(z.literal('')),
    section:        z
      .string()
      .trim()
      .max(20, 'Section must be at most 20 characters')
      .regex(/^[a-zA-Z0-9]+$/, 'Section must be alphanumeric')
      .optional()
      .or(z.literal('')),
    location:       z.string().trim().max(100).optional(),
    github:         z.string().trim().max(100).optional().or(z.literal('')),
    twitter:        z.string().trim().max(100).optional().or(z.literal('')),
    linkedin:       z.string().trim().max(100).optional().or(z.literal('')),
    website:        url,
    profilePicture: z.string().trim().max(4 * 1024 * 1024).optional().or(z.literal('')),
  }).strict(),
};

const confirmSessionSchema = {
  body: z.object({
    idToken: z.string().min(1, 'Firebase ID token is required'),
  }).strict(),
};

module.exports = {
  googleAuthSchema,
  claimUsernameSchema,
  refreshSchema,
  updateMeSchema,
  confirmSessionSchema,
};
