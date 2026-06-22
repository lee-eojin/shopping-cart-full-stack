import type { CreateOrderRequest, UpdateDestinationRequest, UpdateCouponsRequest } from "./database";
import { HttpError } from "./httpError";

export interface ProductRequestBody {
  id?: number;
  imageUrl: string;
  name: string;
  price: number;
  quantity: number;
}

const isPositiveInt = (value: unknown): value is number => 
  typeof value === "number" && Number.isInteger(value) && value > 0;

export const Validator = {
  validateRequiredFields(requestBody: ProductRequestBody): boolean {
    const requiredFields = ["imageUrl", "name", "price", "quantity"];
    requiredFields.forEach((field) => {
      if (!requestBody.hasOwnProperty(field)) throw new HttpError(400, "필수 필드가 누락되었습니다.");
    });
    return true;
  },
  
  validateQuantity(requestBody: Pick<ProductRequestBody, "quantity">): boolean {
    if (!Number.isInteger(requestBody.quantity) || requestBody.quantity <= 0 || requestBody.quantity >= 100) {
      throw new HttpError(400, "quantity는 1 이상 99 이하의 정수여야 합니다.");
    }
    return true;
  },
  
  validatePrice(requestBody: ProductRequestBody): boolean {
    if (requestBody.price <= 0) throw new HttpError(400, "price는 0보다 큰 숫자여야 합니다.");
    return true;
  },
  
  validateName(requestBody: ProductRequestBody): boolean {
    if (requestBody.name.length > 100) throw new HttpError(400, "상품명은 100자 이하여야합니다.");
    return true;
  },
}  

export function validateOrderItems(raw: unknown): asserts raw is CreateOrderRequest {
  if (!Array.isArray(raw) || raw.length === 0) throw new HttpError(400, "주문 항목이 비어 있습니다.")
  for (const item of raw) {
    if (!item || typeof item !== "object") throw new HttpError(400, "주문 항목 형식이 올바르지 않습니다.");
    const { productId, productQuantity } = item as Record<string, unknown>;
    if (!isPositiveInt(productId)) throw new HttpError(400, "productId는 양의 정수여야 합니다.");
    if (!isPositiveInt(productQuantity)) throw new HttpError(400, "수량은 양의 정수여야 합니다.");
  }
}

export function validateCouponIds(couponIds: unknown): asserts couponIds is UpdateCouponsRequest["couponIds"] {
  if (!Array.isArray(couponIds)) throw new HttpError(400, "couponIds는 배열이어야 합니다.");
  if (!couponIds.every(isPositiveInt)) throw new HttpError(400, "couponIds는 양의 정수 배열이어야 합니다.");
  if (couponIds.length > 2) throw new HttpError(400, "쿠폰은 최대 2개까지 사용할 수 있습니다.");
  if (new Set(couponIds).size !== couponIds.length) throw new HttpError(400, "중복된 쿠폰이 있습니다.");
}

export function validateIsRemoteArea(body: unknown): asserts body is UpdateDestinationRequest {
  if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).isRemoteArea !== "boolean")
     throw new HttpError(400, "isRemoteArea는 boolean이어야 합니다.");
}