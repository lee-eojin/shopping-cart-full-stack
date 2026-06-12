## API 명세서

base url : https://shopping-cart-full-stack-production-1515.up.railway.app
PORT: 8080
CORS 설정:

- Access-Control-Allow-Origin
  - http://localhost:3000
- Access-Control-Allow-Methods
  - GET, POST, PATCH, DELETE (옵션 없이)
- Access-Control-Allow-Headers
  - Origin, X-Requested-With, Content-Type, Accept

---

### 상품

- 상품 조회

  | 메서드 | 요청 URL |
  | ------ | -------- |
  | GET    | /products |
  - Response Syntax

    ```
    [
        {
          "id": 1,
          "imageUrl": "https://example.com/product-image.jpg",
          "name": "상품명",
          "price": 10000,
          "quantity": 1,
        },
        {
          "id": 2,
          "imageUrl": "https://example.com/product2-image.jpg",
          "name": "상품명2",
          "price": 20000,
          "quantity": 2,
        }
    ]
    ```

  - Status Code
    - 200 OK: 성공적으로 상품들을 불러왔을 때
    - 500 Error: 실패했을 때 (DB에 Product 테이블이 존재하지 않을 때)

- 상품 등록

  | 메서드 | 요청 URL |
  | ------ | -------- |
  | POST   | /products |
  - Request Syntax

    ```
    {
      "imageUrl": "https://example.com/product3-image.jpg",
      "name": "상품명3",
      "price": 10000,
      "quantity": 5,
    }
    ```

  - Status Code
    - 201 OK: 성공적으로 상품이 생성되었을 때
    - 400 Bad Request: 실패했을 때 (잘못된 서버 요청)
    - 500 Error: 실패했을 때 (DB에 Product 테이블이 존재하지 않을 때)

- 상품 삭제
  | 메서드 | 요청 URL |
  | --- | --- |
  | DELETE | /products/:id |
  - Request Parameter
    | 파라미터 | 설명 |
    | ------ | -------- |
    | id | 상품 id |

  - Status Code
    - 204 OK: 성공적으로 상품이 삭제되었을 때
    - 404 Error: 실패했을 때 (해당 id의 상품이 Product 테이블에 존재하지 않을 때)
    - 500 Error: 실패했을 때 (DB에 Product 테이블이 존재하지 않을 때)

---

### 장바구니

- 장바구니 상품 조회

  | 메서드 | 요청 URL |
  | ------ | -------- |
  | GET    | /cart    |
  - Response Syntax

    ```
    [
        {
          "id": 1,
          "imageUrl": "https://example.com/product-image.jpg",
          "name": "상품명",
          "price": 10000,
          "quantity": 1,
        },
        {
          "id": 2,
          "imageUrl": "https://example.com/product2-image.jpg",
          "name": "상품명2",
          "price": 20000,
          "quantity": 2,
        }
    ]
    ```

  - Status Code
    - 200 OK: 성공적으로 장바구니에 담긴 상품들을 불러왔을 때
    - 500 Error: 실패했을 때 (DB에 Cart 테이블이 존재하지 않을 때)

- 상품 등록

  | 메서드 | 요청 URL  |
  | ------ | --------- |
  | POST   | /cart/:id |
  - Request Parameter
    | 파라미터 | 설명 |
    | ------ | -------- |
    | id | 상품 id |
  - Status Code
    - 201 OK: 성공적으로 상품이 Cart 테이블에 생성되었을 때
    - 500 Error: 실패했을 때 (DB에 Cart 테이블이 존재하지 않을 때)

- 상품 수량 변경

  | 메서드 | 요청 URL  |
  | ------ | --------- |
  | PATCH  | /cart/:id |
  - Request Parameter
    | 파라미터 | 설명 |
    | ------ | -------- |
    | id | 장바구니 상품 id |
  - Request Syntax

    ```
    {
      "quantity": 6,
    }
    ```

  - Status Code
    - 204 OK: 성공적으로 장바구니에 담긴 상품의 수량이 변겨되었을 때
    - 400 Bad Request: 실패했을 때 (잘못된 서버 요청)
    - 404 Error: 실패했을 때 (해당 id의 상품이 Cart 테이블에 존재하지 않을 때)
    - 500 Error: 실패했을 때 (DB에 Cart 테이블이 존재하지 않을 때)

- 상품 삭제
  | 메서드 | 요청 URL |
  | --- | --- |
  | DELETE | /cart/:id |
  - Request Parameter
    | 파라미터 | 설명 |
    | ------ | -------- |
    | id | 상품 id |

  - Status Code
    - 204 OK: 성공적으로 상품이 삭제되었을 때
    - 404 Error: 실패했을 때 (해당 id의 상품이 Cart 테이블에 존재하지 않을 때)
    - 500 Error: 실패했을 때 (DB에 Cart 테이블이 존재하지 않을 때)

---

### 주문서

- 주문서 등록

  | 메서드 | 요청 URL |
  | ------ | -------- |
  | POST   | /order   |
  - Request Syntax

    ```
    [
        {
          "productId": 1,
          "productQuantity": 2,
        },
    ]
    ```

  - Status Code
    - 201 OK: 성공적으로 장바구니 상품들이 주문서 테이블에 등록이 되었을 때
    - 500 Error: 실패했을 때 (DB에 주문서 테이블이 없을 때)

- 주문서 불러오기

  | 메서드 | 요청 URL |
  | ------ | -------- |
  | GET    | /order   |
  - Response Syntax

    ```
    {
      "items": [
          {
            "productId": 1,
            "productPrice": 35000,
            "productQuantity": 2,
          },
          ...
      ],
      "isRemoteArea": false,
      "orderAmount": 70000,
      "couponDiscountAmount": 6000,
      "shippingFee": 6000,
      "totalPaymentAmount": 70000,
    }
    ```

  - Status Code
    - 200 OK: 성공적으로 주문서를 불러왔을 때
    - 500 Error: 실패했을 때 (DB에 주문서 테이블이 없을 때)

- 주문서에서 쿠폰 적용된 결제 금액 계산

  | 메서드 | 요청 URL     |
  | ------ | ------------ |
  | POST   | /order/apply |
  - Request Syntax

    ```
    {
      "cartItemIds": [1, 2],
      "couponIds": [1, 4],
      "isRemoteArea": false
    }
    ```

  - Response Syntax

    ```
    {
      "orderAmount": 70000,
      "couponDiscountAmount": 6000,
      "shippingFee": 6000,
      "totalPaymentAmount": 70000,
    }
    ```

  - Status Code
    - 200 OK: 성공적으로 결제 금액을 계산했을 때
    - 400 Bad Request: 실패했을 때 (잘못된 서버 요청)
    - 404 Error: 실패했을 때 (해당하는 장바구니 상품 또는 쿠폰 정보가 없을 때)
    - 500 Error: 실패했을 때 (DB에 해당하는 테이블이 없을 때)

- 제주도 및 도서 산간 지역 체크사항 업데이트

  | 메서드 | 요청 URL |
  | ------ | -------- |
  | PATCH  | /order   |
  - Request Syntax

    ```
    {
      "isRemoteArea": true
    }
    ```

  - Status Code
    - 200 OK: 성공적으로 도서 산간 지역 상태를 업데이트 했을 때
    - 400 Bad Request: 잘못된 요청 값으로 PATCH 하려 했을 때
    - 404 Error: 해당하는 엔드포인트가 존재하지 않을 때
    - 500 Error: 요청이 실패했을 때 (DB에 해당하는 테이블이 없을 때)

---

### 쿠폰

- 쿠폰 목록 조회

  | 메서드 | 요청 URL |
  | ------ | -------- |
  | GET    | /coupons |
  - Response Syntax

    ```
    {
      "coupons": [
          {
            "id": 1,
            "code": "FIXED5000",
            "description": "5,000원 할인 쿠폰",
            "expirationDate": "2026-11-30",
            "discountType": "fixed",
            "minimumAccount": 100000,
            "discountAmount": 5000,
            "applicable": true
          },
          {
            "id": 2,
            "code": "BOGO",
            "description": "2개 구매시 1개 무료 쿠폰",
            "expirationDate": "2026-06-30",
            "discountType": "bogo",
            "buyQuantity": 2,
            "getQuantity": 1,
            "applicable": false
          },
          ...
      ],
      "primaryPrice": {
        "couponIds": [1, 4],
        "couponDiscountAmount": 6000
      },
      "secondPrice": [
        { "couponIds": [1], "couponDiscountAmount": 5000 },
        { "couponIds": [2], "couponDiscountAmount": 5500 },
        ...
        { "couponIds": [3, 4], "couponDiscountAmount": 6000 }
      ]
    }
    ```

  - Status Code
    - 200 OK: 성공적으로 쿠폰 목록을 불러왔을 때
    - 500 Error: 실패했을 때 (DB에 Coupon 테이블이 존재하지 않을 때)
