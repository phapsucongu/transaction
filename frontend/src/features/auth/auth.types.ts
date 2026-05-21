export type UserRole = 'ADMIN' | 'USER';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export interface RegisterRequest {
  email: string;
  full_name: string;
  password: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

