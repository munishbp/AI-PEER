// src/api.ts

// Base URL (from .env or fallback)
const BASE = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

// Reusable JSON fetch helper (single definition)
async function requestJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    // Surface the server message if available
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}


export const api = {
  health: () => requestJSON<{ status: string; version?: string }>("/health"),

  riskSummary: () =>
    requestJSON<{ score: number; level: string }>("/risk/summary"),

  login: (phone: string, password: string) =>
    requestJSON<{ customToken: string; user?: { id: string; name?: string } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ phone, password }) }
    ),

  createAccount: (phone: string, password: string) =>
    requestJSON<{ success: boolean; userId: string; message: string }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify({ phone, password }) }
    ),

  sendCode: (phone: string, password: string, mode: "login" | "create") =>
    requestJSON<{ success: boolean; message: string; expiresIn: number }>(
      "/auth/send-code",
      {
        method: "POST",
        body: JSON.stringify({ phone, password, mode }),
      }
    ),

  verify: (phone: string, code: string) =>
    requestJSON<{
      success: boolean;
      customToken: string;
      userId: string;
      isNewUser: boolean;
    }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }),
};

export { BASE };
