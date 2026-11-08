import { z } from "zod";

export const googleAuthInputSchema = z.object({
  credential: z
    .string()
    .trim()
    .min(1, "Google ID token credential is required"),
});

export type GoogleAuthInput = z.infer<typeof googleAuthInputSchema>;

export interface AdminUser {
  email: string;
  name?: string;
  picture?: string;
  isAdmin: boolean;
}

export interface AdminAuthSession {
  user: AdminUser;
  token?: string;
}
