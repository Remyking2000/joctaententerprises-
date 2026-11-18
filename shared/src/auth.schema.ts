import { z } from "zod";

export const googleAuthInputSchema = z.object({
  credential: z
    .string()
    .trim()
    .min(1, "Google ID token credential is required"),
});

export interface AdminUser {
  email: string;
  name?: string;
  picture?: string;
  isAdmin: boolean;
}
