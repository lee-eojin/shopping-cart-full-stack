import { RequestBody, Validator } from '../src/validation';

describe('Validation Tests', () => {
  test('필수 필드 누락 시 에러를 반환한다', () => {
    expect(() => {
      const product = {
        imageUrl: 'http://example.com/image.jpg',
        price: 1000,
        quantity: 10,
      } as RequestBody;

      Validator.validateRequiredFields(product);
    }).toThrow('필수 필드가 누락되었습니다.');
  });
  test('quantity가 1보다 작을때 에러를 반환한다', () => {
    expect(() => {
      const product = {
        imageUrl: 'http://example.com/image.jpg',
        name: 'TEST_PRODUCT',
        price: 1000,
        quantity: 0,
      };

      Validator.validateQuantity(product);
    }).toThrow('quantity는 1 이상 99 이하의 정수여야 합니다.');
  });

  test('price가 0일때 에러를 반환한다', () => {
    expect(() => {
      const product = {
        imageUrl: 'http://example.com/image.jpg',
        name: 'TEST_PRODUCT',
        price: 0,
        quantity: 10,
      };

      Validator.validatePrice(product);
    }).toThrow('price는 0보다 큰 숫자여야 합니다.');
  });
  test('상품명이 100자 초과할 경우 에러를 반환한다', () => {
    expect(() => {
      const product = {
        imageUrl: 'http://example.com/image.jpg',
        name: 'less'.repeat(30),
        price: 1000,
        quantity: 10,
      };

      Validator.validateName(product);
    }).toThrow('상품명은 100자 이하여야합니다.');
  });
});
