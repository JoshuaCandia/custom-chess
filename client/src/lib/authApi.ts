import type { AuthUser } from "../types/user";

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error((data as { error: string }).error ?? "Unknown error");
  return data as T;
}

export async function apiFetchMe(): Promise<AuthUser | null> {
  const r = await fetch("/auth/me", { credentials: "include" });
  if (!r.ok) return null;
  return r.json();
}

export function apiLogin(body: { username: string; password: string }): Promise<AuthUser> {
  return apiPost("/auth/login", body);
}

export function apiInitiateRegister(body: {
  username: string;
  password: string;
  email: string;
}): Promise<void> {
  return apiPost("/auth/register", body);
}

export function apiVerifyOtp(body: { email: string; otp: string }): Promise<AuthUser> {
  return apiPost("/auth/register/verify", body);
}

export async function apiLogout(): Promise<void> {
  await fetch("/auth/logout", { method: "POST", credentials: "include" });
}
