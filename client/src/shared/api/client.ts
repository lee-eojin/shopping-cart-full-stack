import type { ApiErrorCode, ErrorResponse } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  readonly status: number;
  readonly code?: ApiErrorCode;

  constructor(status: number, message: string, code?: ApiErrorCode) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function parseErrorResponse(raw: unknown): ErrorResponse {
  if (!raw || typeof raw !== "object") return { errorMessage: "요청에 실패했습니다." };

  const errorMessage = Reflect.get(raw, "errorMessage");
  const code = Reflect.get(raw, "code");

  return {
    errorMessage: typeof errorMessage === "string" ? errorMessage : "요청에 실패했습니다.",
    ...(code === "COUPON_NOT_APPLICABLE" && { code }),
  };
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    const raw: unknown = await res.json().catch(() => null);
    const body = parseErrorResponse(raw);
    throw new ApiError(res.status, body.errorMessage, body.code);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
