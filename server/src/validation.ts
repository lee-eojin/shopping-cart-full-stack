export interface RequestBody {
  id?: number;
  imageUrl: string;
  name: string;
  price: number;
  quantity: number;
}

export const Validator = {
  validateRequiredFields(requestBody: RequestBody): boolean {
    const requiredFields = ['imageUrl', 'name', 'price', 'quantity'];
    requiredFields.forEach((field) => {
      if (!requestBody.hasOwnProperty(field)) {
        throw new Error('필수 필드가 누락되었습니다.');
      }
    });
    return true;
  },

  validateQuantity(requestBody: Pick<RequestBody, 'quantity'>): boolean {
    if (!Number.isInteger(requestBody.quantity) || requestBody.quantity <= 0 || requestBody.quantity >= 100) {
      throw new Error('quantity는 1 이상 99 이하의 정수여야 합니다.');
    }
    return true;
  },

  validatePrice(requestBody: RequestBody): boolean {
    if (requestBody.price <= 0) {
      throw new Error('price는 0보다 큰 숫자여야 합니다.');
    }
    return true;
  },

  validateName(requestBody: RequestBody): boolean {
    if (requestBody.name.length > 100) {
      throw new Error('상품명은 100자 이하여야합니다.');
    }
    return true;
  },

  validateRequestBody(requestBody: RequestBody): void {
    this.validateRequiredFields(requestBody)
    && this.validateQuantity(requestBody)
    && this.validatePrice(requestBody)
    && this.validateName(requestBody);
  },
};
