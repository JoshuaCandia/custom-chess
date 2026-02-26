import type { UserProfile } from "../types/user";

export async function apiFetchProfile(username: string): Promise<UserProfile> {
  const r = await fetch(`/user/${encodeURIComponent(username)}`, { credentials: "include" });
  const data = await r.json();
  if (!r.ok) throw new Error((data as { error: string }).error ?? "Failed to load profile");
  return data as UserProfile;
}

export async function apiUpdateSettings(settings: { theme: string }): Promise<void> {
  await fetch("/user/me/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(settings),
  });
}
