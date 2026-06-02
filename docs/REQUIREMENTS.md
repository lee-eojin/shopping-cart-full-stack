## Step 1

### 기능 구현 목록

- 상품 (Products Controller)
  - [x] 상품 목록을 조회할 수 있다. (GET /products)
    - [x] DB에 PRODUCTS 테이블이 존재하지 않으면 500 에러
    - [x] 성공시 200 OK
  - [x] 상품을 추가할 수 있다. (POST /products/)
    - [x] 성공시 201 Created
    - [x] DB에 PRODUCTS 테이블이 존재하지 않으면 500 에러
  - [x] 상품을 삭제할 수 있다. (DELETE /products/:id)
    - [x] DB에 PRODUCTS 테이블이 존재하지 않으면 500 에러
    - [x] 해당 상품이 장바구니에 있으면 함께 제거한다. (삭제될 상품 id에 해당하는 id를 포함하는 객체를 CART 테이블에서 삭제)
    - [x] 성공시 204 OK
    - [x] 해당 id가 디비에 존재하지 않는다면 404 에러

- 장바구니 (Cart Controller)
  - [x] 장바구니에 담긴 상품 목록을 조회할 수 있다. (GET /cart)
    - [x] 성공시 200 OK
    - [x] DB에 CART 테이블이 존재하지 않으면 500 에러
  - [x] 장바구니에 상품을 추가할 수 있다. (POST /cart/:id)
    - [x] 성공시 201 Created
    - [x] DB에 CART 테이블이 존재하지 않으면 500 에러
  - [x] 장바구니 상품의 수량을 변경할 수 있다. (PUT /cart)
    - [x] 성공시 204 OK
    - [x] 해당 id가 디비에 존재하지 않는다면 404 에러
    - [x] DB에 CART 테이블이 존재하지 않으면 500 에러
  - [x] 장바구니에 담긴 상품을 제거할 수 있다. (DELETE /cart/:id)
    - [x] 성공시 204 OK
    - [x] 해당 id가 디비에 존재하지 않는다면 404 에러
    - [x] DB에 CART 테이블이 존재하지 않으면 500 에러

- [x] 프론트엔드와의 연동을 위한 CORS 설정

### 검증

- [x] 필수 필드 누락 시 에러를 응답한다 (400 Bad Request)
- [x] quantity는 1 이상 99 이하의 정수여야 한다 (400 Bad Request)
- [x] price는 0보다 큰 숫자여야 한다 (400 Bad Request)
- [x] 상품명은 최대 100자이다 (400 Bad Request)
