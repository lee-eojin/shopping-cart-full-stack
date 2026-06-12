# Step 3 테크 스펙 - 쿠폰과 배송비 (페어 합의 명세 반영 개정)

> 페어 합의 API 명세(2026-06-12, [`api.md`](./api.md))에 맞춰 개정한 문서. 이전 개정의
> 핵심(계산 SSOT의 BE 이동 - "클라이언트가 임의로 계산하지 않도록")은 유지하고,
> API 구조가 단일 주문서 자원 + PATCH 방식에서 등록(`POST /order`) / 적용·계산
> (`POST /order/apply`) 분리 방식으로 바뀌었다.
>
> 문서 역할 분담 - 미션 산출물이 원본이다:
>
> - 요구사항 해석: [`STEP3_REQUIREMENTS.md`](./STEP3_REQUIREMENTS.md)
> - 시퀀스 다이어그램: SSOT 상태 책임, 명세 확인 목록: [`system-design.md`](./system-design.md)
> - API 명세: [`api.md`](./api.md)

---

## 1. 개요

- 금액이 결정되는 값(쿠폰 판정, 할인액, 금액 4종)은 전부 BE가 계산하고 FE는 표시한다. FE에는 쿠폰 계산 모듈이 없다.
- 쿠폰 적용: 금액 계산의 진입점은 `POST /order/apply`: 검증하고, 계산하고, 결과를 주문서에 저장한다. 화면을 그리는 원천은 항상 `GET /order`.

## 2. 타입 설계 - 베이스 + discriminated union

모델링 방식은 초안에서 유지(base = 교집합, 종류별 extends, discriminated union).
필드명은 페어 합의 명세 표기를 따른다. 명세에 정의가 빈 부분은 주석으로 표시하고
[`system-design.md`](./system-design.md) §5에서 추적한다.

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
  minimumAccount: number; // minimumAmount 오타로 보이나 명세 표기를 따름 (system-design §5-7)
}

export interface BogoCoupon extends CouponBase {
  discountType: "bogo";
  buyQuantity: number;
  getQuantity: number;
  // 할인액 필드 없음 - 주문 내용에 따라 결정된다
}

export interface FreeShippingCoupon extends CouponBase {
  discountType: "freeShipping";
  minimumAccount: number;
  // 할인액 필드 없음 - 그 주문의 배송비다
}

export interface PercentageCoupon extends CouponBase {
  discountType: "percentage";
  discountRate: number; // 명세에 예시 없음
  availableTime: { start: string; end: string }; // 명세에 예시 없음
}

export type Coupon = FixedCoupon | BogoCoupon | FreeShippingCoupon | PercentageCoupon;

// GET /coupons의 쿠폰 요소 - 원본 + 현재 주문서 기준 판정
export type AssessedCoupon = Coupon & { applicable: boolean };
// 적용 불가 사유(reason)는 명세에 없음
```

조합과 금액 계약 - `GET /coupons`는 판정 목록에 최적 조합(`primaryPrice`)과 2장 이하 조합 전부의 할인표(`secondPrice`)를 동봉한다.

```ts
export interface PricedCombination {
  couponIds: Coupon["id"][];
  couponDiscountAmount: number; // 정액 먼저, 정률은 할인된 금액에 적용한 결과
}

export interface CouponsResponse {
  coupons: AssessedCoupon[];
  primaryPrice: PricedCombination; // 가장 할인 효과가 큰 조합
  secondPrice: PricedCombination[]; // 적용 가능 조합(≤2장) 전부
}

// GET /order - 주문 확인·결제 확인 화면의 유일한 데이터원
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

// POST /order/apply - 검증 → 계산 → 주문서 저장
export interface ApplyCouponsRequest {
  cartItemIds: number[]; // 주문서 항목과의 관계는 가정으로 처리
  couponIds: Coupon["id"][];
  isRemoteArea: boolean;
}

export interface ApplyCouponsResult {
  totalOrderAmount: number;
  couponDiscountAmount: number;
  shippingFee: number;
  totalPaymentAmount: number;
}
```

## 3. BE 구조 ( 예상 )

```
server/src/
├── database.ts            # + Coupons: Coupon[] (하드코딩 시드 4종), Order(현재 주문서 1개)
├── couponRules.ts         # 도메인 규칙 전부 - React·express를 모르는 순수 함수
│     assessCoupon(coupon, ctx): boolean              // 단독 적용 기준 판정
│     assessAll(coupons, ctx): AssessedCoupon[]
│     calcComboDiscount(coupons, ctx): number         // 정액 먼저 → 정률은 할인된 금액에 (원 미만 절사)
│     listCombinations(assessed, ctx): PricedCombination[]  // → secondPrice
│     pickBestCombination(combinations): PricedCombination  // → primaryPrice (전수 평가 최대값)
│     calcAmounts(ctx, couponIds): 금액 4종            // 총액 최저 0원
├── validation.ts          # + 주문서 요청 검증 (items 배열·수량 / apply의 couponIds 개수·중복)
└── routes/
    ├── order.ts           # POST /order(등록·덮어쓰기), GET /order(조회),
    │                      # POST /order/apply(검증 → 계산 → 주문서 저장),
    │                      # PATCH /order(도서산간 변경 → 재계산 후 저장)
    ├── coupon.ts          # GET /coupons (판정 + primaryPrice + secondPrice)
    └── (기존 product.ts, cart.ts 변경 없음)
```

## 4. FE 구조 ( 거의 맞을 듯 )

```
client/src/
├── order/                      # 새 도메인 - 주문서 (주문 확인 화면의 데이터원)
│   ├── types.ts                # Order / OrderItem / ApplyCouponsResult
│   ├── orderApi.ts             # submitOrder(POST /order), getOrder(GET /order),
│   │                           # applyCoupons(POST /order/apply), updateRemoteArea(PATCH /order)
│   └── hooks/
│       └── useOrder.ts         # useQuery(['order']) + apply, 도서산간 mutation (아래 비고)
├── coupon/                     # 새 도메인 - 계산 모듈 없음
│   ├── types.ts                # Coupon union + AssessedCoupon + CouponsResponse
│   ├── couponApi.ts            # getCoupons() - 판정 + primaryPrice + secondPrice
│   └── components/
│       ├── CouponModal.tsx     # 임시 선택(로컬 상태) + "사용하기" 확정 - onApply(couponIds) 의도만 올림
│       └── CouponItem.tsx      # 쿠폰 카드 - applicable 표시 전용
├── cart/                       # 변경 없음
└── page/
    ├── OrderConfirmPage.tsx    # 기존 - Container가 주문서, 쿠폰 훅, 모달 조립
    └── PaymentConfirmPage.tsx  # 신규 - 결제 확인: GET /order의 totalPaymentAmount 표시 + 장바구니 복귀
```