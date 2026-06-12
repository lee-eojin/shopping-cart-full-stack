# Step 3 테크 스펙 — 쿠폰·배송비 (팀 합의 명세 반영 개정)

> 팀 합의 API 명세(2026-06-12, [`api.md`](./api.md))에 맞춰 개정한 문서. 이전 개정의
> 핵심(**계산 SSOT의 BE 이동** — "클라이언트가 임의로 계산하지 않도록")은 유지하고,
> API 구조가 단일 주문서 자원 + PATCH 방식에서 **등록(`POST /order`) / 적용·계산
> (`POST /order/apply`) 분리** 방식으로 바뀌었다.
>
> 문서 역할 분담 — 미션 산출물이 원본이다:
> - 요구사항 해석: [`STEP3_REQUIREMENTS.md`](./STEP3_REQUIREMENTS.md)
> - 시퀀스 다이어그램·SSOT 상태 책임표·명세 확인 목록: [`system-design.md`](./system-design.md)
> - API 명세: [`api.md`](./api.md)
>
> 이 문서가 담는 것: 타입 설계, FE/BE 코드 구조, 테스트 전략, 그리고 **결정 로그**
> (초안 대비 유지/개정/폐기 이력 포함 — 무엇이 왜 바뀌었는지가 설계 학습의 기록이다).

---

## 1. 개요

- 돈이 결정되는 값(쿠폰 판정·할인액·금액 4종)은 전부 BE가 계산하고 FE는 표시한다.
  FE에는 쿠폰 계산 모듈이 **존재하지 않는다.**
- 쿠폰 적용·금액 계산의 진입점은 `POST /order/apply` — 검증하고, 계산하고, **결과를
  주문서에 저장**한다. 화면을 그리는 원천은 항상 `GET /order`.
- 쿠폰 규칙은 서버의 순수 함수 모듈(`couponRules.ts`)에 격리하고, 시계를 주입해
  경계값을 테스트로 명세한다.
- step 2 자산(QueryCache, Page/Container 분리, 의도 콜백, 주문 페이지의 서버 상태
  재조회)은 그대로 유지·확장한다.

## 2. 타입 설계 — 베이스 + discriminated union

모델링 방식은 초안에서 유지(base = 교집합, 종류별 extends, discriminated union).
필드명은 **팀 합의 명세 표기를 따른다** — 명세에 정의가 빈 부분은 ⚠️로 표시하고
[`system-design.md`](./system-design.md) §5에서 추적한다.

```ts
// 4종 전부가 가지는 공통 분모만 — 파생의 원본 (base = 교집합)
interface CouponBase {
  id: number;
  code: string;
  description: string;
  expirationDate: string; // "2026-11-30"
}

export interface FixedCoupon extends CouponBase {
  discountType: "fixed";
  discountAmount: number;  // 정액 할인 (원) — 명세 표기
  minimumAccount: number;  // ⚠️ minimumAmount 오타 의심 — 명세 표기를 따름 (§5-7)
}

export interface BogoCoupon extends CouponBase {
  discountType: "bogo";
  buyQuantity: number;
  getQuantity: number;
  // 할인액 필드 없음 — 주문 내용에 따라 결정된다
}

export interface FreeShippingCoupon extends CouponBase {
  discountType: "freeShipping";
  minimumAccount: number;
  // 할인액 필드 없음 — 그 주문의 배송비다
}

export interface PercentageCoupon extends CouponBase {
  discountType: "percentage";
  discountRate: number;                          // ⚠️ 명세에 예시 없음 — 가정 (§5-6)
  availableTime: { start: string; end: string }; // ⚠️ 〃
}

export type Coupon = FixedCoupon | BogoCoupon | FreeShippingCoupon | PercentageCoupon;

// GET /coupons의 쿠폰 요소 — 원본 + 현재 주문서 기준 판정
export type AssessedCoupon = Coupon & { applicable: boolean };
// ⚠️ 적용 불가 사유(reason)가 명세에 없다 — 모달 안내 문구에 필요 (§5-5)
```

조합·금액 계약 — `GET /coupons`는 판정 목록에 **최적 조합(`primaryPrice`)**과
**2장 이하 조합 전부의 할인표(`secondPrice`)**를 동봉한다. 모달 토글 중 예상 할인은
이 표의 룩업이다.

```ts
export interface PricedCombination {
  couponIds: Coupon["id"][];
  couponDiscountAmount: number; // 정액 먼저, 정률은 할인된 금액에 적용한 결과
}

export interface CouponsResponse {
  coupons: AssessedCoupon[];
  primaryPrice: PricedCombination;   // 가장 할인 효과가 큰 조합
  secondPrice: PricedCombination[];  // 적용 가능 조합(≤2장) 전부
}

// GET /order — 주문 확인·결제 확인 화면의 유일한 데이터원
export interface OrderItem {
  productId: number;
  productPrice: number;
  productQuantity: number;
  // ⚠️ 상품명·이미지 없음 — 화면 표시에 필드 추가 또는 상품 목록 조인 필요 (§5-3)
}

export interface Order {
  items: OrderItem[];
  couponIds: Coupon["id"][]; // 적용 중인 쿠폰 — apply가 저장한 값
  isRemoteArea: boolean;
  orderAmount: number;
  couponDiscountAmount: number;
  shippingFee: number;
  totalPaymentAmount: number;
}

// POST /order/apply — 검증 → 계산 → 주문서 저장
export interface ApplyCouponsRequest {
  cartItemIds: number[]; // ⚠️ 주문서 항목과의 관계는 가정으로 봉합 (§5-1)
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

설계 근거(초안에서 확정, 변동 없음): base는 교집합만 — 기준은 "중요한가"가 아니라
"전 변형이 갖는가". optional 범벅은 불가능 상태를 허용해 `?? 0`이 규칙을 가리고,
base 과적 + `Omit` 도려내기는 깜빡하면 조용히 부패하는 뺄셈 부채를 만든다.
`minimumAccount`는 2/4 변형의 같은 개념이지만 중복 선언을 수용한다.

## 3. BE 구조

```
server/src/
├── database.ts            # + Coupons: Coupon[] (하드코딩 시드 4종), Order(현재 주문서 1개)
├── couponRules.ts         # 도메인 규칙 전부 — React·express를 모르는 순수 함수
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

- `ctx`(계산 컨텍스트)는 `{ items, orderAmount, isRemoteArea, now }`. **`now`는 주입** —
  라우터 생성 시 `createOrderRouter(db, clock = () => new Date())` /
  `createCouponRouter(db, clock)`로 받아 supertest가 시간을 고정할 수 있게 한다.
  만료 당일·04:00:00·07:00:01 같은 경계는 클럭 고정 없이는 테스트로 명세할 수 없다.
- **같은 판정 모듈(`couponRules`)을 두 라우트가 재사용한다** — `GET /coupons`(표시·조합표),
  `POST /order/apply`(확정 검증·계산). 모달이 보여준 판정은 과거이므로 apply가 **그 시점에
  다시** 판정한다. 규칙은 한 곳, 호출은 여러 곳.
- `PATCH /order`(도서산간)도 같은 모듈로 재계산한다 — 적용 중 쿠폰을 포함한 금액 4종을
  다시 산출해 주문서에 저장하고, FE는 `GET /order`로 다시 그린다.
- 할인 계산은 **정액 쿠폰 먼저, 정률 쿠폰은 할인된 금액에** 적용한다(요구사항 §3.1).
  정률의 할인액이 동반 쿠폰에 따라 달라지므로 최적 조합은 "개별 할인액 상위 2개"가
  아니라 **2장 이하 조합(최대 10개) 전수 평가**다. 적용 순서는 규칙이 고정하므로
  순서쌍 탐색까지는 불필요. FREESHIPPING(배송비 할인)은 정률의 기준 금액(상품 금액)을
  줄이지 않는다.
- `assessCoupon` 내부는 `switch (coupon.discountType)` — union 망라성 검사로 쿠폰 종류
  추가 시 빠진 분기가 컴파일 에러.
- 퍼센트 할인은 원 단위 절사(`Math.floor`) — 요구사항 §3.7의 명문화를 코드로.

## 4. FE 구조

```
client/src/
├── order/                      # 새 도메인 — 주문서 (주문 확인 화면의 데이터원)
│   ├── types.ts                # Order / OrderItem / ApplyCouponsResult (§2)
│   ├── orderApi.ts             # submitOrder(POST /order), getOrder(GET /order),
│   │                           # applyCoupons(POST /order/apply), updateRemoteArea(PATCH /order)
│   └── hooks/
│       └── useOrder.ts         # useQuery(['order']) + apply·도서산간 mutation (아래 비고)
├── coupon/                     # 새 도메인 — 계산 모듈 없음에 주의
│   ├── types.ts                # Coupon union + AssessedCoupon + CouponsResponse (§2)
│   ├── couponApi.ts            # getCoupons() — 판정 + primaryPrice + secondPrice
│   └── components/
│       ├── CouponModal.tsx     # 임시 선택(로컬 상태) + "사용하기" 확정 — onApply(couponIds) 의도만 올림
│       └── CouponItem.tsx      # 쿠폰 카드 — applicable 표시 전용
├── cart/                       # 변경 없음 (장바구니 화면 합계는 클라 계산 유지 — 요구사항 §3.11)
└── page/
    ├── OrderConfirmPage.tsx    # 기존 — Container가 주문서·쿠폰 훅·모달 조립
    └── PaymentConfirmPage.tsx  # 신규 — 결제 확인: GET /order의 totalPaymentAmount 표시 + 장바구니 복귀
```

- **FE에 couponModel이 없다.** 모달의 비활성화, 예상 할인, 화면의 금액 4종 — 전부 서버
  응답 필드의 표시다. 토글 중 예상 할인은 `secondPrice` 표에서 선택한 couponIds로
  **찾아 읽기만** 한다(룩업 — 클라 계산 0회). 정률 쿠폰의 할인액이 동반 쿠폰에 따라
  달라지므로 쿠폰별 할인액 합산은 애초에 답이 아니다.
- `useOrder`: 주문서가 화면의 유일한 데이터원. `useQuery(['order'])`로 구독하고,
  쿠폰 확정은 `useMutation(applyCoupons)`, 도서산간 토글은 `useMutation(updateRemoteArea)` —
  **둘 다 성공 시 `invalidate(['order'])`**로 `GET /order` 재조회를 일으킨다. 팀
  다이어그램의 "PATCH 후 GET으로 다시 그린다" 흐름이 step 2 뮤테이션 패턴과 정확히
  일치해 새 인프라가 필요 없다.
- 모달 초기 상태: `GET /coupons`의 `primaryPrice.couponIds`를 추천(최적 조합)으로
  표시한다. 적용 확정은 사용자의 "사용하기" → apply 호출 — 서버는 자동 적용하지 않는다.
- 장바구니의 "주문 확인" 버튼: 선택 상품을 `POST /order`로 제출(`useMutation`) → 성공 시
  `navigate("/order")`. 라우팅은 Page가 주입(기존 결정).
- 선택된 쿠폰: FE가 따로 들지 않는다 — 주문서(`order.couponIds`)가 SSOT. 모달의 임시
  선택만 컴포넌트 로컬 (요구사항 §3.13).
- 에러 처리: 기존 `apiRequest`의 errorMessage 정규화 흐름 그대로. apply 거부(400)는
  인라인 에러 + `GET /coupons` 재조회로 모달 갱신 (system-design.md 흐름 ⑤).
  `GET /order` 404는 장바구니로 리다이렉트 (⚠️ 404 자체가 가정 — §5-4).

## 5. 테스트 전략 (step 4 입력)

요구사항 문서 §5의 케이스를 레이어에 배정한다. **규칙 경계값은 전부 BE 단위 테스트로
이동했다** — 클라에 규칙이 없으므로.

| 레이어 | 도구 | 대상 |
| --- | --- | --- |
| `couponRules` 단위 | Jest (서버) | 쿠폰별 판정·할인 경계값 전부: 만료 당일/익일, 03:59:59~07:00:01, 최소 금액 ±1, BOGO 2/3/6개, 절사, 배송비 0원의 FREESHIPPING, 총액 최저 0 + **정액→정률 적용식 검산(FIXED+MIRACLE = 5,000+(주문−5,000)×30%), 조합 전수 평가(primaryPrice 최적성), FREESHIPPING이 정률 기준을 안 줄임** |
| API | supertest + 클럭 주입 | `POST /order` 등록·덮어쓰기, `GET /order` 조회, **`POST /order/apply` — 에러 표 전체(3장/중복/무효 쿠폰 400, 없는 id 404) + 저장 검증(apply 후 `GET /order`가 같은 금액·couponIds)**, `PATCH /order` 후 재계산 반영, `GET /coupons`의 primaryPrice·secondPrice 정확성 |
| FE 모달 | RTL + MSW | 비활성 표시, primaryPrice 초기 추천, 임시 선택/확정/폐기, 3장째 차단, secondPrice 룩업 합계 표시 |
| FE Container | RTL + MSW | 진입 시 GET /order 렌더(404 → 장바구니 리다이렉트), "사용하기" → apply → invalidate 재조회 반영, 도서산간 토글 → PATCH 후 재조회 반영, 400 거부 → 에러 표시·모달 갱신 |
| SSOT 검증 | RTL + MSW | 화면 금액 4종이 항상 MSW 응답 값과 일치 (FE 자체 계산 부재의 증명) |

원칙: 시간이 들어가는 모든 테스트는 주입된 클럭으로 고정한다.

## 6. 결정 로그 — 유지/개정/폐기 이력

초안(작년 스펙 가정) 대비. "왜 바뀌었나"가 이 표의 존재 이유다.

| # | 결정 | 상태 | 근거 / 개정 사유 |
| --- | --- | --- | --- |
| 1 | 쿠폰 타입 = 교집합 base + extends + discriminated union | **유지 (필드명만 명세 표기로)** | 모델링 결정은 실스펙·팀 명세와 무관하게 유효. `discount`→`discountAmount`/`discountRate`, `buyXgetY`→`bogo` 등 표기를 계약에 맞춤. |
| 2 | 판정+계산 단일 진입점 `assessCoupon` → union 반환 | **유지 (위치 이동)** | 규칙 누수 차단 논리는 그대로. FE 모듈 → BE `couponRules.ts`. 단 명세에 reason 필드가 없어 반환 shape의 사유 부분은 보류 (§5-5). |
| 3 | 최적 조합 = 순서쌍 전수 평가 | **재개정 → 조합 전수 평가 (순서는 규칙 고정)** | 스펙 보강으로 "정액 먼저, 정률은 할인된 금액에"가 확정(요구사항 §3.1) — 할인 상호작용이 부활해 2차안(개별 상위 2개 합산)은 무효. 2장 이하 부분집합 10개 전수 평가. 산출물의 이름이 `primaryPrice`(최적)·`secondPrice`(전체 표)로 계약화됐다. |
| 4 | 시간(`now`/클럭) 주입 | **유지** | BE로 옮겨도 동일 — `createCouponRouter(db, clock)`. 경계값 테스트의 전제. |
| 5 | FE = 미리보기 계산 + BE = 주문 시점 권위 | **폐기 → BE 단독 계산** | 스펙 명시 제약 "클라이언트가 임의로 계산하지 않도록". 부수 효과: 절사 정합(#10)·시계 이원화 문제가 원천 소멸 — 제약이 설계를 단순하게 만든 사례. |
| 6 | 에러 코드 400/404/500 + 구체적 errorMessage | **유지** | 기존 API 컨벤션·FE 에러 경로 일관. 에러 body 형식은 명세 미정 — `errorMessage`로 가정 (§5-8). |
| 7 | 자동 선택은 진입 시 1회, 이후 사용자 소유 | **개정 → 서버는 산출만, 적용 트리거는 FE** | 팀 합의 — 서버는 `primaryPrice`로 최적 조합을 *알려주고*, 적용은 FE가 apply로 확정한다. "가장 할인 효과가 큰 조합이 먼저 계산"은 primaryPrice 산출이 충족. 사용자 소유 원칙(재최적화 없음)은 그대로. |
| 8 | 선택된 쿠폰 localStorage 미지속 | **유지 — SSOT는 서버 주문서** | apply가 적용 쿠폰을 주문서에 저장하고(#15), 새로고침 복원은 `GET /order`의 `couponIds`가 담당 (요구사항 §3.13). |
| 9 | `POST /orders` — 주문 생성 + 금액 응답 | **폐기 → 부활(재개정): 등록/적용 분리** | 1차 폐기(결제 API 비구현) → 무상태 assessment → 주문서 단일 자원 → **팀 합의로 `POST /order`(등록) + `POST /order/apply`(계산·확정) 분리**. "서버가 확정 금액을 응답한다"는 핵심은 처음부터 끝까지 유지. |
| 10 | 퍼센트 절사 규칙 명문화 | **유지 (이유 변경)** | 원래 근거(FE/BE 정합)는 #5 폐기로 소멸. 그러나 금액 규칙의 미정의는 주체가 하나여도 버그의 씨앗 — 명세로 유지. |
| 11 | 모달 토글은 로컬, 합계는 조합표 룩업 | **유지 (계약명 변경: combinations → secondPrice)** | 토글 왕복은 로딩·경쟁 상태, 쿠폰별 합산은 정률 상호작용 때문에 부정확 + 식 실행은 금지된 계산. 조합표(≤10개) 룩업은 계산 0회. |
| 12 | 요청에 가격·금액 미포함 (id·수량·플래그만) | **유지** | 서버가 받는 순간 검증 대상이 됨. DB 원본 재조회가 가장 싼 검증이자 "가격·쿠폰의 SSOT는 DB" 선언. |
| 13 | 주문 맥락 = 서버 주문서 자원 (`/order` 싱글턴, POST 덮어쓰기) | **유지 (수정 경로만 개정)** | 싱글턴·덮어쓰기·스냅샷 선언은 그대로. 수정 경로가 "PATCH 하나"에서 "쿠폰·금액은 apply, 도서산간은 PATCH"로 분리(팀 합의). |
| 14 | `POST /order`가 최적 조합을 자동 적용, `GET /order`는 응답 전 재판정 | **폐기 → #7 개정으로 흡수** | 자동 적용 주체가 서버에서 FE 트리거로 바뀌어 생성 시점 자동 적용이 사라짐. GET의 만료 쿠폰 재판정은 명세에 없다 — 시간제 쿠폰의 낡은 할인 노출 가능성은 구현에서 확인 (§7). |
| 15 | `POST /order/apply`는 계산 결과를 주문서에 저장 | **신설** | 미저장이면 새로고침 시 적용 상태 증발 + 도서산간 PATCH 후 재계산 불가(서버가 적용 쿠폰을 모름). `GET /order`가 쿠폰 할인을 응답하는 것 자체가 저장 전제. 팀 다이어그램과 합치. |
| 16 | 도서산간 변경은 PATCH 후 `GET /order` 재조회 | **신설 (팀 다이어그램)** | 쓰기(PATCH)와 읽기(GET)의 분리 — 응답 계약이 단순해지고 "화면의 원천은 GET /order"가 모든 흐름에서 동일. FE는 invalidate(['order'])로 자연 구현. |

## 7. 미해결 / 리뷰에서 확인

- **명세 구멍 8건** — [`system-design.md`](./system-design.md) §5가 원본 목록.
  이 문서의 ⚠️ 표시는 전부 그 목록을 가리킨다 (cartItemIds 관계, 상품명 부재,
  reason 부재, percentage/freeShipping 필드, `minimumAccount` 표기 등).
- **시간제 쿠폰의 낡은 할인** — 옛 설계의 "GET /order 응답 전 재판정"이 빠지면서,
  적용해둔 미라클모닝 쿠폰이 07:00을 넘겨도 화면에 할인이 남을 수 있다. 서버 GET에서
  재판정할지, 무시 가능한 엣지로 수용할지 구현에서 결정 (#14).
- `GET /coupons` 판정 결과의 신선도 — 모달을 오래 열어두면 낡는다. 모달 열 때마다
  재조회로 충분한지, 확정 거부(400) 시 재조회로 보완되는지 구현에서 확인.
- 쿠폰 종류가 크게 늘면 secondPrice가 O(n²)로 커진다 — 현 규모(≤10개)에선 무시.
- Figma 확인 후 모달 UI 상세 (사유 문구 노출 방식 — reason 필드 확정과 연동, 접근성 범위).
