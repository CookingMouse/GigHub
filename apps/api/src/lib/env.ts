import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  WEB_URL: z.string().url(),
  API_URL: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: z
    .union([z.literal("true"), z.literal("false")])
    .default("false")
    .transform((value) => value === "true"),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  COOKIE_DOMAIN: z.string().optional().transform((value) => value?.trim() || undefined),
  ADMIN_EMAIL: z.string().email().default("admin@gighub.local"),
  ADMIN_PASSWORD: z.string().min(8).default("Admin123!"),
  FILE_STORAGE_ROOT: z.string().min(1).default(".gighub-storage"),
  FILE_ENCRYPTION_SECRET: z
    .string()
    .min(16)
    .default("local-file-encryption-secret-change-me"),
  FILE_RETENTION_HOURS: z.coerce.number().int().positive().default(72),
  REVIEW_WINDOW_HOURS: z.coerce.number().int().positive().default(72),
  GLM_MODE: z.enum(["mock", "live"]).default("mock"),
  PAYMENT_PROVIDER: z.string().trim().min(1).default("mock"),
  STORAGE_PROVIDER: z.string().trim().min(1).default("local")
});

export const env = envSchema.parse(process.env);
