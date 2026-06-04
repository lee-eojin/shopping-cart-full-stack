import type { ErrorResponse } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ErrorResponse | null;
    throw new Error(body?.errorMessage ?? "요청 처리 중 오류가 발생했습니다.");
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}
