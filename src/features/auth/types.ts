import { UserRole } from "@/types/auth";

export interface RegisterUserInput {
  email?: string;
  phone: string;
  password?: string;
  fullName: string;
  role: UserRole;
}

export interface LoginUserInput {
  identifier: string; // phone or email
  password?: string;
  otp?: string;
}
