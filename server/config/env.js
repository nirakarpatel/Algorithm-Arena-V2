require('dotenv').config();
const { z } = require('zod');

const cookieSecureSchema = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  }
  return value;
}, z.boolean().optional());

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGO_URI: z.string().default('mongodb://localhost:27017/algorithm_arena'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters').optional(),
    JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters').optional(),
    JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters').optional(),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(90).default(14),
    REFRESH_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_SECURE: cookieSecureSchema,
    CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:4173'),
  })
  .superRefine((data, ctx) => {
    if (!data.JWT_ACCESS_SECRET && !data.JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_SECRET'],
        message: 'JWT_ACCESS_SECRET is required when JWT_SECRET is not set',
      });
    }

    if (!data.JWT_REFRESH_SECRET && !data.JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET is required when JWT_SECRET is not set',
      });
    }

    if (data.REFRESH_COOKIE_SAMESITE === 'none' && data.COOKIE_SECURE === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE must be true when REFRESH_COOKIE_SAMESITE is "none"',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${issues}`);
}

const env = Object.freeze({
  ...parsed.data,
  JWT_ACCESS_SECRET: parsed.data.JWT_ACCESS_SECRET || parsed.data.JWT_SECRET,
  JWT_REFRESH_SECRET: parsed.data.JWT_REFRESH_SECRET || parsed.data.JWT_SECRET,
  COOKIE_SECURE: parsed.data.COOKIE_SECURE ?? parsed.data.NODE_ENV === 'production',
  CORS_ORIGINS: parsed.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
});

module.exports = { env };
