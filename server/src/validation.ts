export interface ProductRequestBody {
  id?: number;
  imageUrl: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CouponRequestBody {
  couponIds: unknown;
}

export interface DestinationRequestBody {
  isRemoteArea: unknown;
}

export const Validator = {
  validateRequiredFields(requestBody: ProductRequestBody): boolean {
    const requiredFields = ["imageUrl", "name", "price", "quantity"];
    requiredFields.forEach((field) => {
      if (!requestBody.hasOwnProperty(field)) throw new Error("필수 필드가 누락되었습니다.");
    });
    return true;
  },

  validateQuantity(requestBody: Pick<ProductRequestBody, "quantity">): boolean {
    if (!Number.isInteger(requestBody.quantity) || requestBody.quantity <= 0 || requestBody.quantity >= 100) {
      throw new Error("quantity는 1 이상 99 이하의 정수여야 합니다.");
    }
    return true;
  },

  validatePrice(requestBody: ProductRequestBody): boolean {
    if (requestBody.price <= 0) throw new Error("price는 0보다 큰 숫자여야 합니다.");
    return true;
  },

  validateName(requestBody: ProductRequestBody): boolean {
    if (requestBody.name.length > 100) throw new Error("상품명은 100자 이하여야합니다.");
    return true;
  },

  validateRequestBody(requestBody: ProductRequestBody): void {
    this.validateRequiredFields(requestBody) &&
    this.validateQuantity(requestBody) &&
    this.validatePrice(requestBody) &&
    this.validateName(requestBody);
  },

  validateCouponIds(requestBody: CouponRequestBody): boolean {
    const { couponIds } = requestBody;
    if (!Array.isArray(couponIds)) throw new Error("couponIds는 배열이어야 합니다.");
    if (couponIds.length > 2) throw new Error("쿠폰은 최대 2개까지 사용할 수 있습니다.");
    if (new Set(couponIds).size !== couponIds.length) throw new Error("중복된 쿠폰이 있습니다.");
    return true;
  },

  validateIsRemoteArea(requestBody: DestinationRequestBody): boolean {
    if (typeof requestBody.isRemoteArea !== "boolean") throw new Error("isRemoteArea는 boolean이어야 합니다.");
    return true;
  },
};
