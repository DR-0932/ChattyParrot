import { z } from "zod";

export const usernameRule = z.string()
  .min(3, "At least 3 characters required for username")
  .max(50, "Username cannot exceed 50 characters");

export const passwordRule = z.string()
  .min(6, "At least 6 characters required for password")
  .max(50, "Password cannot exceed 50 characters");

export const emailRule = z.email("Invalid email address");


export const signup_schema = z.object({
  username: z.string()
    .min(3, "At least 3 characters required for name")
    .max(50),
  email: emailRule,
  password: passwordRule,
});

export const login_schema = z.object({
  loginIdentifier: z.string().min(1, "Username or email is required"),
  password: passwordRule,
});



export type SignupInput = z.infer<typeof signup_schema>;
export type LoginInput = z.infer<typeof login_schema>;
