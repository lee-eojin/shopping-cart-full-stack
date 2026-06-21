export const SERVER_ERROR = "서버에 일시적인 오류가 발생했습니다.";
export type ApiErrorCode = "COUPON_NOT_APPLICABLE";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: ApiErrorCode,

  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function ensureExists<T>(value: T): asserts value is NonNullable<T> {
  if (value == null) throw new HttpError(500, SERVER_ERROR);
}
