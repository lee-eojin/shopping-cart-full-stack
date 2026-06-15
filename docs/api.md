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
> 계산하지 않도록 설계한다." 돈이 되는 값은 전부 BE가 계산하고, FE는 식별자와 플래그만
> 보내고 받은 값을 표시한다.

| 계산 | FE 역할 | BE 역할 |
| --- | --- | --- |
| 주문 금액 (orderAmount) | 표시만 | 주문서 항목 수량 × DB 가격으로 계산, 요청의 가격은 받지 않는다 |
| 쿠폰 적용 가능 판정 (만료, 시간대, 최소 금액, BOGO 대상 상품과 수량) | `applicable`로 비활성화 표시만 | 서버 시계 기준 판정 (`GET /coupons`) |
| 쿠폰 할인액 | 계산 안 함 | 정액 먼저 → 정률은 할인된 금액에 적용 후 상한 적용, 원 미만 절사 |
| 최적 쿠폰 조합 (`primaryPrice`) | 표시 + 적용 트리거 (`PATCH /order/coupons` 호출) | 적용 가능 2장 이하 조합 전수 평가로 산출 |
| 모달 토글 중 예상 할인 | `GET /order/coupons/preview` 호출로 표시 (디바운스) | 저장 없이 선택 조합만 계산해 반환 |
| 배송비 (shippingFee) | 표시만 | 기본 + 도서산간 추가. 주문 금액 10만 원 이상이면 추가비 포함 전액 무료 |
| 총 결제 금액 (totalPaymentAmount) | 표시만 | 주문 금액 − 쿠폰 할인 + 배송비 (최저 0원) |
| 장바구니 화면 합계 (Step 2) | **FE 계산 유지** | 관여 없음. 쿠폰이 개입하지 않는 순수 파생값이라 금지 범위 밖 |
| 결제 확인 화면의 종류 수와 총 수량 | **FE 집계 허용** | 관여 없음. 돈이 아닌 표시용 집계 |

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
          "productQuantity": 4,
        },
    ]
    ```

  - Response Syntax

    ```
    {
      "items": [
          {
            "productId": 1,
            "productPrice": 30000,
            "productQuantity": 4,
          },
      ],
      "couponIds": [1, 4],
      "isRemoteArea": false,
      "orderAmount": 120000,
      "couponDiscountAmount": 39500,
      "shippingFee": 0,
      "totalPaymentAmount": 80500,
    }
    ```

  - 동작
    - 등록 시 서버가 최적 쿠폰 조합을 자동 적용해 재계산한 주문서를 응답에 그대로
      실어 반환한다. 클라이언트는 별도 `GET /order` 없이 이 응답으로 화면을 그린다.
  - Status Code
    - 201 OK: 주문서가 생성되고 재계산된 주문서를 반환했을 때
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
            "productPrice": 30000,
            "productQuantity": 4,
          },
      ],
      "couponIds": [1, 4],
      "isRemoteArea": false,
      "orderAmount": 120000,
      "couponDiscountAmount": 39500,
      "shippingFee": 0,
      "totalPaymentAmount": 80500,
    }
    ```

    > 예시: 주문 금액 120,000원(30,000 × 4)에 FIXED5000 + MIRACLESALE 적용.
    > 정률 할인은 ⌊(120,000 − 5,000) × 30%⌋ = 34,500이고, MIRACLESALE 상한(100,000)에는
    > 못 미쳐 그대로 적용된다. 할인 = 5,000 + 34,500 = 39,500.
    > 120,000 ≥ 100,000이라 배송비 0원. 총액 = 120,000 − 39,500 + 0 = 80,500.

  - Status Code
    - 200 OK: 성공적으로 주문서를 불러왔을 때
    - 500 Error: 실패했을 때 (DB에 주문서 테이블이 없을 때)

- 주문서의 적용 쿠폰 갱신 (재계산)

  | 메서드 | 요청 URL        |
  | ------ | --------------- |
  | PATCH  | /order/coupons  |
  - Request Syntax

    ```
    {
      "couponIds": [1, 4]
    }
    ```

  - Response Syntax

    ```
    {
      "items": [
          {
            "productId": 1,
            "productPrice": 30000,
            "productQuantity": 4,
          },
      ],
      "couponIds": [1, 4],
      "isRemoteArea": false,
      "orderAmount": 120000,
      "couponDiscountAmount": 39500,
      "shippingFee": 0,
      "totalPaymentAmount": 80500,
    }
    ```

  - 동작
    - 적용 쿠폰만 받는다. 주문 항목과 도서산간은 서버가 주문서로 이미 보유하므로
      다시 받지 않는다.
    - 검증 통과 시 적용 쿠폰을 주문서에 저장하고 재계산한 주문서 전체를 반환한다.
      별도 `GET /order` 없이 이 응답으로 화면을 갱신한다.
  - Status Code
    - 200 OK: 쿠폰을 적용하고 재계산된 주문서를 반환했을 때
    - 400 Bad Request: 쿠폰이 3장 이상이거나 중복이거나, 적용 불가 쿠폰이 포함됐을 때
      (만료 / 사용 가능 시간 아님 / 최소 주문 금액 미달)
    - 404 Error: 존재하지 않는 couponId일 때
    - 500 Error: 실패했을 때 (DB에 해당하는 정보가 없을 때)

- 적용 쿠폰 조합의 예상 할인 미리보기 (비저장)

  | 메서드 | 요청 URL                             |
  | ------ | ------------------------------------ |
  | GET    | /order/coupons/preview?couponIds=2,4 |
  - Query Parameter

    | 파라미터 | 설명 |
    | ------ | -------- |
    | couponIds | 미리보기할 선택 쿠폰 id 목록 (쉼표 구분, 최대 2개) |
  - Response Syntax

    ```
    {
      "couponDiscountAmount": 27850,
      "totalPaymentAmount": 55150,
    }
    ```

    > 예시: 주문 80,000원, 비도서산간, 선택 [2, 4] 기준. BOGO 5,500으로 과세 기준이
    > 74,500이 되고 30%는 22,350(상한 100,000 미만이라 그대로). 할인 = 5,500 + 22,350 =
    > 27,850. 배송비는 80,000 < 100,000이라 3,000. 총액 = 80,000 − 27,850 + 3,000 = 55,150.

  - 동작
    - 저장된 주문서(항목, 수량, 도서산간, 서버 시계)에 선택 쿠폰만 얹어 계산하고, 주문서에
      저장하지 않은 채 예상 금액만 반환한다. 모달에서 쿠폰을 토글하는 동안 "사용하기"
      버튼의 총 할인액을 갱신하는 데 쓴다. 확정과 저장은 PATCH /order/coupons가 맡는다.
    - 클라이언트는 토글마다 디바운스를 걸어 호출하고, 선택 조합을 캐시 키로 두면 이전
      조합으로 되돌아갈 때 재요청 없이 캐시를 재사용한다.
  - Status Code
    - 200 OK: 선택 조합의 예상 할인을 계산해 반환했을 때
    - 400 Bad Request: couponIds가 3개 이상이거나 중복이거나 적용 불가 쿠폰이 포함됐을 때
    - 404 Error: 존재하지 않는 couponId일 때
    - 500 Error: 실패했을 때 (DB에 해당하는 정보가 없을 때)

  > GET을 선택한 이유: 이 요청은 주문서를 바꾸지 않고 선택 조합의 금액만 계산해 돌려주는
  > 부수효과 없는 읽기 연산이다. 그래서 "읽기만 한다"를 계약으로 알리는 GET이 실제 동작과
  > 메서드 의미를 일치시킨다. 같은 입력이면 항상 같은 결과를 주는 idempotent 연산이라,
  > 토글을 빠르게 반복하거나 디바운스로 동일 요청이 여러 번 나가도 안전하다. 선택 쿠폰은
  > 최대 2장이라 id 목록이 짧아 쿼리 파라미터로 충분히 표현되고, GET이 보디를 갖지 않는
  > 제약에도 걸리지 않는다. 또한 프런트엔드가 자체 쿼리 캐시 레이어(`shared/api/query`)로 이 요청을 선택 조합을 키로 한
  > 쿼리로 다루면 이전 조합으로 되돌아갈 때 캐시가 재사용되어 토글마다 드는 왕복 비용이
  > 줄어든다. 저장은 형제 엔드포인트인 PATCH /order/coupons가 전담하므로, 계산만 하는 이
  > 요청을 GET으로 분리하면 미리보기와 확정의 책임이 메서드 수준에서 분명히 갈린다. 선택
  > 장수 제한이 크게 늘어 id 목록이 길어지면 POST 보디가 더 나을 수 있으나, 현재 최대 2장
  > 제약에서는 GET이 가장 정직하고 단순한 선택이다.

- 주문서의 배송지(도서산간) 갱신 (재계산)

  | 메서드 | 요청 URL           |
  | ------ | ------------------ |
  | PATCH  | /order/destination |
  - Request Syntax

    ```
    {
      "isRemoteArea": true
    }
    ```

  - Response Syntax

    ```
    {
      "items": [
          {
            "productId": 2,
            "productPrice": 35000,
            "productQuantity": 2,
          },
      ],
      "couponIds": [],
      "isRemoteArea": true,
      "orderAmount": 70000,
      "couponDiscountAmount": 0,
      "shippingFee": 6000,
      "totalPaymentAmount": 76000,
    }
    ```

  - 동작
    - 도서산간 여부를 갱신하고 배송비를 재계산한 주문서 전체를 반환한다.
      `PATCH /order/coupons`와 동일하게 재계산 결과를 응답에 실어 1왕복으로 끝낸다.
    - 예시: 주문 70,000원(< 100,000)에 도서산간 → 배송비 3,000 + 3,000 = 6,000.
  - Status Code
    - 200 OK: 배송지 상태를 갱신하고 재계산된 주문서를 반환했을 때
    - 400 Bad Request: isRemoteArea가 boolean이 아닐 때
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
            "minimumAmount": 100000,
            "discountAmount": 5000,
            "applicable": false
          },
          {
            "id": 2,
            "code": "BOGO",
            "description": "2개 구매 시 1개 무료 쿠폰",
            "expirationDate": "2026-06-30",
            "discountType": "bogo",
            "buyQuantity": 2,
            "getQuantity": 1,
            "applicableProductIds": [2],
            "applicable": true
          },
          {
            "id": 3,
            "code": "FREESHIPPING",
            "description": "배송비 무료 쿠폰",
            "expirationDate": "2026-08-31",
            "discountType": "freeShipping",
            "minimumAmount": 50000,
            "applicable": true
          },
          {
            "id": 4,
            "code": "MIRACLESALE",
            "description": "30% 할인 쿠폰",
            "expirationDate": "2026-07-31",
            "discountType": "percentage",
            "discountRate": 30,
            "maximumDiscountAmount": 100000,
            "availableTime": { "start": "04:00:00", "end": "07:00:00" },
            "applicable": true
          }
      ],
      "primaryPrice": {
        "couponIds": [2, 4],
        "couponDiscountAmount": 27850
      }
    }
    ```

    > 예시: 현재 주문 80,000원, 비도서산간 기준. FIXED5000은 최소 주문 금액(100,000원)
    > 미달이라 `applicable: false`이라 조합 평가에서 제외된다. BOGO(id 2)는 대상 상품
    > (`applicableProductIds`)이 장바구니에 있어 `applicable: true`다.
    > 서버는 적용 가능 쿠폰({2, 3, 4})으로 만들 수 있는 2장 이하 조합을 내부에서 전수
    > 평가하고, 그중 최대값만 `primaryPrice`로 응답에 싣는다(전 조합 표는 동봉하지 않는다).
    > [2, 4] 조합은 BOGO 할인 5,500원으로 과세 기준이 74,500원이 되고 거기에 30%는
    > 22,350원이다. MIRACLESALE 상한(100,000)에는 못 미쳐 그대로 적용되어,
    > [2, 4] = 5,500 + 22,350 = 27,850이 전수 평가의 최대값이다.

    > 상한 동작 예시(별도 케이스): 주문 500,000원에 MIRACLESALE 단독 적용 시 정률은
    > ⌊500,000 × 30%⌋ = 150,000이지만 상한 100,000에 걸려 100,000으로 잘린다. 정상
    > 예시 주문(80,000~120,000원)에서는 상한에 닿지 않으므로, 상한 검증은 이런 고액
    > 주문 케이스로 테스트한다.

  - Status Code
    - 200 OK: 성공적으로 쿠폰 목록을 불러왔을 때
    - 500 Error: 실패했을 때 (DB에 Coupon 테이블이 존재하지 않을 때)
