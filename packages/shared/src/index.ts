import { z } from "zod";

export const appRoles = ["freelancer", "company", "admin"] as const;
export const registrationRoles = ["freelancer", "company"] as const;

export type AppRole = (typeof appRoles)[number];
export type RegistrationRole = (typeof registrationRoles)[number];

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  role: z.enum(registrationRoles)
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export type PublicUser = {
  id: string;
  email: string;
  role: AppRole;
  name: string;
};

export type ApiSuccess<T> = {
  data: T;
};

export type ApiErrorResponse = {
  code: string;
  message: string;
  requestId: string;
};

export const isRegistrationRole = (value: string): value is RegistrationRole =>
  registrationRoles.includes(value as RegistrationRole);

