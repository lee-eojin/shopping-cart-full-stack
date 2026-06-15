# Step 3 테크 스펙 - 쿠폰과 배송비 (페어 합의 명세 반영 개정)

> 페어 합의 API 명세(2026-06-12, [`api.md`](./api.md))에 맞춰 개정한 문서. 이전 개정의
> 핵심(계산 SSOT의 BE 이동 - "클라이언트가 임의로 계산하지 않도록")은 유지하고,
> API 구조가 등록(`POST /order`)과 부분 수정(`PATCH /order/coupons`,
> `PATCH /order/destination`)으로 나뉘고, 변경 API는 재계산된 주문서를 응답에 실어 반환한다.
>
> 문서 역할 분담 - 미션 산출물이 원본이다:
>
> - 요구사항 해석: [`STEP3_REQUIREMENTS.md`](./STEP3_REQUIREMENTS.md)
> - SSOT 상태 책임: [`system-design.md`](./system-design.md) (시퀀스 다이어그램은 step-4에서 재작성)
> - API 명세: [`api.md`](./api.md)

---

## 1. 개요

- 금액이 결정되는 값(쿠폰 판정, 할인액, 금액 4종)은 전부 BE가 계산하고 FE는 표시한다. FE에는 쿠폰 계산 모듈이 없다.
- 쿠폰 적용: 금액 계산의 진입점은 `PATCH /order/coupons`. 검증하고, 계산하고, 결과를 주문서에 저장한 뒤 재계산된 주문서를 응답에 실어 반환한다. 새로고침 시 화면을 복원하는 원천은 `GET /order`.

## 2. 타입 설계 - 베이스 + discriminated union

모델링 방식은 초안에서 유지(base = 교집합, 종류별 extends, discriminated union).
필드명은 페어 합의 명세 표기를 따른다. 명세에 정의가 빈 부분은 주석으로 표시한다.

```ts
// 4종 전부가 가지는 공통 분모만 - 파생의 원본 (base = 교집합)
interface CouponBase {
  id: number;
  code: string;
  description: string;
  expirationDate: string; // "2026-11-30"
}

export interface FixedCoupon extends CouponBase {
  discountType: "fixed";
  discountAmount: number; // 정액 할인 (원) - 명세 표기
  minimumAccount: number; // minimumAmount 오타로 보이나 명세 표기를 따름
}

export interface BogoCoupon extends CouponBase {
  discountType: "bogo";
  buyQuantity: number;
  getQuantity: number;
  applicableProductIds: number[]; // 적용 대상 상품 - 모든 상품에 보편 적용되는 2+1은 비현실적이라 대상을 한정한다
  // 할인액 필드 없음 - 대상 상품과 주문 내용에 따라 결정된다
}

export interface FreeShippingCoupon extends CouponBase {
  discountType: "freeShipping";
  minimumAccount: number;
  // 할인액 필드 없음 - 그 주문의 배송비다
}

export interface PercentageCoupon extends CouponBase {
  discountType: "percentage";
  discountRate: number; // 명세에 예시 없음
  maximumDiscountAmount: number; // 정률 할인액 상한 - 상한 없는 정률은 비현실적이라 필수
  availableTime: { start: string; end: string }; // 명세에 예시 없음
}

export type Coupon = FixedCoupon | BogoCoupon | FreeShippingCoupon | PercentageCoupon;

// GET /coupons의 쿠폰 요소 - 원본 + 현재 주문서 기준 판정
export type AssessedCoupon = Coupon & { applicable: boolean };
// 적용 불가 사유(reason)는 명세에 없음
```

조합과 금액 계약 - `GET /coupons`는 판정 목록에 최적 조합(`primaryPrice`)만 동봉한다. 2장 이하 전 조합 할인표(`secondPrice`)는 서버 내부 계산 전략을 계약에 노출한 형태라 제거했다 (근거는 5절).

```ts
export interface PricedCombination {
  couponIds: Coupon["id"][];
  couponDiscountAmount: number; // 정액 먼저, 정률은 할인된 금액에 적용하고 상한까지 적용한 결과
}

export interface CouponsResponse {
  coupons: AssessedCoupon[];
  primaryPrice: PricedCombination; // 가장 할인 효과가 큰 조합 (동률 선택 규칙까지 서버가 소유)
}

// GET /order - 주문 확인과 결제 확인 화면의 유일한 데이터원
export interface OrderItem {
  productId: number;
  productPrice: number;
  productQuantity: number;
  // 상품명, 이미지 없음
}

export interface Order {
  items: OrderItem[];
  couponIds: Coupon["id"][]; // 적용 중인 쿠폰 - apply가 저장한 값
  isRemoteArea: boolean;
  orderAmount: number;
  couponDiscountAmount: number;
  shippingFee: number;
  totalPaymentAmount: number;
}

// PATCH /order/coupons - 적용 쿠폰만 받아 재계산, 주문서 전체 반환
export interface UpdateCouponsRequest {
  couponIds: Coupon["id"][];
  // 주문 항목과 도서산간은 서버가 주문서로 보유 - 다시 받지 않는다
}

// PATCH /order/destination - 도서산간만 받아 재계산, 주문서 전체 반환
export interface UpdateDestinationRequest {
  isRemoteArea: boolean;
}

// 두 PATCH의 응답은 모두 Order(전체) - 별도 결과 타입 없음
```

## 3. BE 구조 ( 예상 )

```
server/src/
├── database.ts            # + Coupons: Coupon[] (하드코딩 시드 4종), Order(현재 주문서 1개)
├── couponRules.ts         # 도메인 규칙 전부 - React와 express를 모르는 순수 함수
│     assessCoupon(coupon, ctx): boolean              // 단독 적용 기준 판정 (bogo는 대상 상품이 buyQuantity 이상 담겼는지 포함)
│     assessAll(coupons, ctx): AssessedCoupon[]
│     calcComboDiscount(coupons, ctx): number         // 정액 먼저 → 정률은 할인된 금액에 (정률은 maximumDiscountAmount로 상한, 원 미만 절사)
│     pickBestCombination(assessed, ctx): PricedCombination  // → primaryPrice (전수 평가 최대값, 서버 내부 연산)
│     calcAmounts(ctx, couponIds): 금액 4종            // 총액 최저 0원
├── validation.ts          # + 주문서 요청 검증 (items 배열과 수량 / apply의 couponIds 개수와 중복)
└── routes/
    ├── order.ts           # POST /order(등록 → 자동 적용과 재계산 후 주문서 반환), GET /order(조회),
    │                      # PATCH /order/coupons(쿠폰 갱신 → 재계산),
    │                      # GET /order/coupons/preview(선택 조합 예상 할인 → 비저장 계산),
    │                      # PATCH /order/destination(도서산간 갱신 → 재계산)
    ├── coupon.ts          # GET /coupons (판정 + primaryPrice)
    └── (기존 product.ts, cart.ts 변경 없음)
```

## 4. FE 구조 ( 거의 맞을 듯 )

```
client/src/
├── order/                      # 새 도메인 - 주문서 (주문 확인 화면의 데이터원)
│   ├── types.ts                # Order / OrderItem / UpdateCouponsRequest / UpdateDestinationRequest
│   ├── orderApi.ts             # submitOrder(POST /order), getOrder(GET /order),
│   │                           # updateCoupons(PATCH /order/coupons), previewCoupons(GET /order/coupons/preview),
│   │                           # updateDestination(PATCH /order/destination)
│   └── hooks/
│       └── useOrder.ts         # useQuery(['order']) + 쿠폰과 도서산간 mutation (아래 비고)
├── coupon/                     # 새 도메인 - 계산 모듈 없음
│   ├── types.ts                # Coupon union + AssessedCoupon + CouponsResponse
│   ├── couponApi.ts            # getCoupons() - 판정 + primaryPrice
│   └── components/
│       ├── CouponModal.tsx     # 임시 선택(로컬 상태) + 토글 시 preview로 총 할인액 표시 + "사용하기" 확정(onApply)
│       └── CouponItem.tsx      # 쿠폰 카드 - applicable 표시 전용
├── cart/                       # 변경 없음
└── page/
    ├── OrderConfirmPage.tsx    # 기존 - Container가 주문서, 쿠폰 훅, 모달 조립
    └── PaymentConfirmPage.tsx  # 신규 - 결제 확인: GET /order의 totalPaymentAmount 표시 + 장바구니 복귀
```

## 5. 현실성 반영 설계 결정 (step-4)

미션의 쿠폰 모델이 모든 혜택을 장바구니 전체에 보편 적용한다는 전제를 두는데, 이는 현실의 쿠폰 운영과 맞지 않는다. 아래는 그 전제를 현실에 맞게 좁히되 BE 책임은 작게 유지하기 위한 결정이다. 각 결정은 테스트 대상 선정의 근거이기도 하다.

### 5.1 secondPrice 제거 (계약은 능력만 노출)

계약은 서버의 능력을 노출해야지 구현 전략을 노출하면 안 된다. primaryPrice는 최적 조합과 그 금액을 달라는 능력이고 항상 존재하는 안정 코어이자 동률 선택 규칙의 소유자다. 반면 secondPrice(2장 이하 전 조합 할인표)는 전 조합 전수계산이라는 서버 내부 전략을 그대로 응답에 실은 형태였다. 최대 적용 장수(M)가 기획적으로 늘면 조합 수가 가파르게 커지면서 응답 형태 자체가 깨지므로, 변경에 닫힌 구조다. 따라서 계약에서 제거한다. 토글 중 예상 할인은 미리 받은 표를 룩업하는 대신 선택 조합을 명시적으로 묻는 `GET /order/coupons/preview?couponIds=...`로 얻는다(저장 없이 계산만 반환). 이러면 M이 바뀌어도 계약 모양은 그대로이고, 디바운스와 자체 쿼리 캐시(`shared/api/query`)로 토글당 왕복 비용을 줄인다.

### 5.2 BOGO 대상 상품 한정

2+1이 맥북을 포함한 모든 상품에 적용되는 것은 비현실적이다. 그래서 BogoCoupon에 applicableProductIds를 두어 적용 대상을 한정한다. 적용 판정은 대상 상품이 장바구니에 buyQuantity 이상 담겼는지를 본다(대상 상품이 없으면 applicable=false). 공짜로 주는 수량은 임의 최저가 상품이 아니라 대상 상품에서 나온다. 스코프가 실제로 필요한 것은 BOGO뿐이라, 변경을 이 변형 하나에 가둔다.

### 5.3 정률 할인 상한

상한 없는 정률은 100만 원 구매에 30만 원을 깎아주는 식이 되어 비현실적이다. PercentageCoupon에 maximumDiscountAmount를 필수로 두고, 정률 할인액은 min(discountRate 적용액, maximumDiscountAmount)로 계산한다. 상한은 총 결제액이 아니라 정률 할인 부분에만 건다. 계산 순서는 정액 먼저 적용한 뒤 그 결과에 정률을 적용하고, 그 정률 할인액에 상한을 씌운다.

### 5.4 스코프 범위 한정

fixed와 freeShipping은 장바구니 전체 적용을 유지한다. 플랫폼이 주는 정액 할인과 무료배송은 전체 적용이 현실적이고, 스코프를 모든 쿠폰으로 넓히면 소계 분리와 스코프가 겹치는 조합 계산까지 커져 BE 책임이 불어난다. 현실성에 꼭 필요한 BOGO만 스코프를 갖는다.

### 5.5 발행 주체(issuer)는 표시 전용으로 유보

쿠폰의 현실성을 만드는 것은 발행 주체가 아니라 적용 범위다(맥북 2+1을 막는 것은 누가 발행했는지가 아니라 대상 상품 한정이다). 따라서 issuer는 이번 구현에 넣지 않고, 화면 표시가 필요해지면 선언적 메타로만 추가한다. 계산 분기의 트리거로는 쓰지 않으며, 적용 범위는 issuer가 아니라 applicableProductIds 같은 명시 필드로 드러낸다.