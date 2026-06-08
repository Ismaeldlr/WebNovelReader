import apiClient from './client';

export interface AuthUser {
  id: string;
  username: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

interface AuthResponse {
  user: AuthUser;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await apiClient.get<unknown, ApiEnvelope<AuthResponse>>('/auth/me');
    return res.data.user;
  } catch {
    return null;
  }
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await apiClient.post<unknown, ApiEnvelope<AuthResponse>>('/auth/login', {
    username,
    password,
  });
  return res.data.user;
}

export async function register(username: string, password: string): Promise<AuthUser> {
  const res = await apiClient.post<unknown, ApiEnvelope<AuthResponse>>('/auth/register', {
    username,
    password,
  });
  return res.data.user;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
