import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(3, "Minimum 3 characters"),
  password: z.string().min(6, "Minimum 6 characters"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Minimum 3 characters"),
  password: z.string().min(6, "Minimum 6 characters"),
  email: z.string().email("Invalid email address"),
});

export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, "Must be 6 digits")
    .regex(/^\d+$/, "Digits only"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
