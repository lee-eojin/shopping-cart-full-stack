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

### 계산 로직 책임 — FE / BE

> 스펙 제약: "쿠폰을 적용하고 결제 금액을 확인하는 과정에서 클라이언트가 임의로
> 계산하지 않도록 설계한다." 돈이 되는 값은 전부 BE가 계산하고, FE는 식별자·플래그만
> 보내고 받은 값을 표시한다.

| 계산 | FE 역할 | BE 역할 |
| --- | --- | --- |
| 주문 금액 (orderAmount) | 표시만 | 주문서 항목 수량 × DB 가격으로 계산 — 요청의 가격은 받지 않는다 |
| 쿠폰 적용 가능 판정 (만료·시간대·최소 금액·BOGO 수량) | `applicable`로 비활성화 표시만 | 서버 시계 기준 판정 (`GET /coupons`) |
| 쿠폰 할인액 | 계산 안 함 | 정액 먼저 → 정률은 할인된 금액에 적용, 원 미만 절사 |
| 최적 쿠폰 조합 (`primaryPrice`) | 표시 + 적용 트리거 (`POST /order/apply` 호출) | 적용 가능 2장 이하 조합 전수 평가로 산출 |
| 모달 토글 중 예상 할인 | `secondPrice` 표 **룩업** (계산 0회) | 조합별 할인표를 미리 계산해 동봉 |
| 배송비 (shippingFee) | 표시만 | 기본 + 도서산간 추가. 주문 금액 10만 원 이상이면 추가비 포함 전액 무료 |
| 총 결제 금액 (totalPaymentAmount) | 표시만 | 주문 금액 − 쿠폰 할인 + 배송비 (최저 0원) |
| 장바구니 화면 합계 (Step 2) | **FE 계산 유지** | 관여 없음 — 쿠폰이 개입하지 않는 순수 파생값이라 금지 범위 밖 |
| 결제 확인 화면의 종류 수·총 수량 | **FE 집계 허용** | 관여 없음 — 돈이 아닌 표시용 집계 |

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
      "couponIds": [1, 4],
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
      "totalOrderAmount": 70000,
      "couponDiscountAmount": 6000,
      "shippingFee": 3000,
      "totalPaymentAmount": 70000,
    }
    ```

  - 동작
    - 검증 통과 시 적용 쿠폰·도서산간·금액을 주문서에 저장한다. 이후 `GET /order`는
      이 결과를 반영해 응답한다 (새로고침해도 적용 상태 유지).
  - Status Code
    - 200 OK: 성공적으로 주문, 쿠폰 할인, 배송비, 총 결제 금액 결과를 불러왔을 때
    - 400 Bad Request: 쿠폰이 3장 이상·중복이거나, 적용 불가 쿠폰이 포함됐을 때
      (만료 / 사용 가능 시간 아님 / 최소 주문 금액 미달)
    - 404 Error: 존재하지 않는 cartItemId 또는 couponId일 때
    - 500 Error: 실패했을 때 (DB에 해당하는 정보가 없을 때)

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
