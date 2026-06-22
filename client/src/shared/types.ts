export type ApiErrorCode = "COUPON_NOT_APPLICABLE";

export interface ErrorResponse {
  errorMessage: string;
  code?: ApiErrorCode
}

export interface MessageResponse {
  message: string;
}
