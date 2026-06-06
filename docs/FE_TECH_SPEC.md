# 장바구니 FE 기술 명세 (Step 2)

> 클라이언트 구현 전 설계 기준 문서. 폴더 구조, 타입 설계, 상태 관리 전략,
> API 연동, 컴포넌트 계층, 도메인 규칙, 비동기 처리, 테스트 전략을 정의한다.
> 구현 중 결정이 바뀌면 이 문서를 먼저 갱신한다.

---

## 1. 개요

### 1.1 목표

- 서버 상태(장바구니 목록)와 클라이언트 상태(상품 선택 여부)를 명확히 분리해 관리한다.
- 비동기 요청 상태(로딩/에러/성공)에 따라 적절한 UI를 보여준다.
- 선택 여부를 새로고침 후에도 유지한다.
- 주요 기능을 Jest + React Testing Library로 테스트하고, 비동기는 MSW로 모킹한다.

### 1.2 범위

- 장바구니 화면: 상품 목록 조회, 선택/해제, 수량 변경, 삭제, 결제 금액, 배송비 계산.
- 주문 확인 화면: 장바구니에서 "주문 확인" 시 별도 페이지(`/order`)로 이동해 총 결제 금액을 다시 계산해 보여준다.
- 상품 추가/삭제 API는 타입, API 레이어로 준비만 하고, 화면 노출 여부는 추후 결정.

### 1.3 비범위 (이번 단계 제외)

- 인증/로그인, 결제의 실제 처리(주문 확인 페이지의 "결제하기"는 자리만), 다크모드.
- 라우팅은 초기엔 비범위(단일 화면)였으나, 주문 확인 페이지가 생기며 react-router로 도입했다(결정 로그 #13).

### 1.4 화면 시나리오 플로우

이 프로젝트가 실제로 어떻게 흐르는지를 한눈에 보기 위한 시나리오다. 각 단계 옆에 "그렇게
설계한 의도"를 함께 적는다. 상세 책임 분배는 §5, §7에서 다룬다.

```
[진입] GET /cart 로딩 → Spinner
   │   의도: 서버 상태는 자체 QueryCache가 들고, 첫 로딩만 Spinner(§9).
   ▼
[목록] 상품 카드 + 전체 선택 체크 + 주문금액/배송비/총액
   │   의도: 진입 시 전체 선택(SelectionState 미저장=true). 서버 데이터에 선택을
   │         붙이지 않고 렌더 직전에만 합성(§5.1).
   ▼
[선택 토글] 개별/전체 체크박스
   │   의도: 클라 상태(useSelection)만 바뀌고 서버 호출 없음 → 즉시 금액 재계산.
   │         선택은 localStorage에 저장.
   ▼
[수량 ± / 삭제] CartItem 버튼
   │   의도: 자식은 "수량 N이 되고 싶다 / 빼고 싶다"는 의도만 올림(§7.3).
   │         CartContainer가 clamp(1~99) 후 mutate → 낙관적 즉시 반영(§5.3, L10),
   │         서버 PATCH/DELETE → onSettled invalidate로 서버와 수렴.
   ▼
[주문 확인] "주문 확인" 버튼 → navigate("/order")
   │   의도: 라우팅(navigate)은 Page 레이어(CartPage)가 주입. CartContainer는
   │         onCheckout 의도만 받고 라우터를 모름(결정 로그 #12, #13).
   ▼
[주문 확인 페이지] 총 결제 금액 표시 + (자리만) 결제하기 / ← 뒤로가기
       의도: OrderConfirmPage가 useCart+useSelection+calcSummary로 총액을 다시
             계산 → 새로고침, 직접 URL 접근에도 안전(서버 상태 기반).

[새로고침] 어느 시점이든 → 선택 상태 localStorage 복원(§5.2)
[에러] GET /cart 실패 → ErrorMessage + 재시도(refetch). 뮤테이션 실패는 §12 참고.
```

---

## 2. 기술 스택


| 영역     | 선택                                                 | 근거                                                          |
| ------ | -------------------------------------------------- | ----------------------------------------------------------- |
| 번들러    | Vite                                           | CRA는 사실상 deprecated. 빠른 dev 서버, 간단한 설정.                     |
| 언어     | TypeScript                                     | 타입 기반 설계가 이 명세의 핵심.                                         |
| UI     | React 19                                      | 미션 요구.                                                      |
| 서버 상태  | 자체 `QueryCache` + `useSyncExternalStore`       | 미션 요구로 fetching 라이브러리 금지. 키 기반 캐시 + pub-sub 구독을 `useQuery`/`useMutation`으로 직접 구현. |
| 클라 상태  | useState + localStorage                        | 선택 여부는 작은 클라 상태. 전역 상태 라이브러리 불필요.                           |
| 스타일    | emotion (`@emotion/react` + `@emotion/styled`) | props 기반 동적 스타일 + co-location. `styled`와 `css` prop 둘 다 사용. |
| 테스트    | Jest + React Testing Library                   | 미션 요구.                                                      |
| API 모킹 | MSW (Mock Service Worker)                      | 비동기 테스트 표준. 네트워크 레이어에서 가로채 실제에 가깝게 테스트.                     |
| HTTP   | fetch (얇은 래퍼)                                  | 의존성 최소화. 공통 에러 처리만 래핑.                                      |
| 라우팅    | react-router v7                                | 주문 확인 페이지 도입으로 추가. 라우팅(navigate)은 Page 레이어가 주입(결정 로그 #12, #13). |
| 배포     | client: GitHub Pages / server: Railway         | client는 정적 SPA(Actions 빌드+Pages), server는 Node 앱(§13).      |


### 2.1 dev 서버 포트 제약 (중요)

서버(`server/src/app.ts`)의 CORS가 `http://localhost:3000`만 허용한다.
Vite dev 서버를 반드시 3000번으로 띄운다.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react({ jsxImportSource: "@emotion/react" })],
  server: { port: 3000 },
});
```

### 2.2 환경 변수

```
# .env
VITE_API_BASE_URL=http://localhost:8080
```

---

## 3. 디렉토리 구조

두 축으로 나눈다. ① 도메인(`cart`/`product`)은 자기 타입/API/훅/컴포넌트를 한곳에 모으고,
② 레이어 성격이 분명한 것은 별도로 둔다 — `page/`는 라우팅, 화면 골격, `shared/api/query/`는
자체 서버상태 시스템. 페이지(라우터 진입)와 화면 로직(Container)을 따로 뒀다(결정 로그 #12).

```
client/
├── .env / .env.production      # VITE_API_BASE_URL (로컬/배포)
├── railway.json                # (server용 잔재) — client 배포는 GitHub Actions
├── vite.config.ts              # base 경로(VITE_BASE_PATH) + emotion + React Compiler
├── tsconfig.json               # src 직접 include (에디터 라우팅 — troubleShooting.md)
├── jest.config.ts / jest.setup.ts / jest.env.ts
└── src/
    ├── main.tsx                # 진입점: QueryCacheProvider + react-router(createBrowserRouter)
    │
    ├── page/                   # 라우팅, 화면 골격 레이어 (라우터가 마운트)
    │   ├── CartPage.tsx        # 헤더 + CartContainer 마운트, navigate("/order") 주입
    │   └── OrderConfirmPage.tsx# 총 결제 금액 재계산(useCart+useSelection+calcSummary)
    │
    ├── product/                # 상품 도메인
    │   ├── types.ts            # Product(원본) + 파생 타입
    │   └── productApi.ts       # GET/POST/DELETE /products
    │
    ├── cart/                   # 장바구니 도메인
    │   ├── types.ts            # CartItem / 요청, 뷰 타입 / SelectionState
    │   ├── cartApi.ts          # GET/POST/PATCH/DELETE /cart
    │   ├── cartModel.ts        # 순수 계산: 금액, 배송비, clamp, calcSummary, applyCartAction
    │   ├── hooks/
    │   │   ├── useCart.ts         # useQuery(['cart'])
    │   │   ├── useCartMutations.ts# add/update/remove + onSettled invalidate
    │   │   └── useSelection.ts    # 선택 상태 + localStorage 지속
    │   └── components/
    │       ├── CartContainer.tsx  # 오케스트레이터: 훅 조립, 계산, 의도→처리(낙관적 포함)
    │       ├── CartList.tsx       # 아이템 리스트 (얇은 전달)
    │       ├── CartItem.tsx       # 개별 상품 카드 (의도 콜백 + Omit)
    │       ├── SelectAll.tsx      # 전체선택 체크박스
    │       ├── OrderSummary.tsx   # 주문금액/배송비/총결제 (Row×3)
    │       ├── OrderButton.tsx    # "주문 확인" 버튼 (onCheckout)
    │       └── FreeShippingNotice.tsx
    │
    ├── shared/                 # 도메인 무관 공용
    │   ├── types.ts            # MessageResponse / ErrorResponse
    │   ├── api/
    │   │   ├── client.ts       # fetch 래퍼, baseURL, 에러 정규화
    │   │   └── query/          # 자체 서버상태 시스템 (React Query 대체)
    │   │       ├── queryCache.ts        # 키 기반 캐시 + pub-sub + invalidate 재조회
    │   │       ├── queryCacheContext.ts # context + useQueryCache (Fast Refresh 분리)
    │   │       ├── QueryCacheProvider.tsx # 캐시 인스턴스 주입 (테스트 격리)
    │   │       ├── useQuery.ts          # useSyncExternalStore 구독
    │   │       └── useMutation.ts       # 요청상태 + onSettled invalidate(await)
    │   ├── lib/
    │   │   ├── storage.ts      # localStorage 직렬화 래퍼
    │   │   └── format.ts       # formatPrice 등
    │   └── components/
    │       ├── layout/         # Row(슬롯) / Stack / Media
    │       └── feedback/       # Spinner / ErrorMessage(onRetry)
    │
    └── mocks/                  # MSW (handlers / server / fixtures)
```

> 변경 이력: `App.tsx`는 라우터 도입으로 제거(진입은 `main.tsx`의 RouterProvider). `shared/api`는
> `client.ts`(HTTP)와 `query/`(서버상태 시스템)로 분리. `CartPage`는 `cart/components`에서 `page/`로
> 옮기고 로직을 `CartContainer`로 떼냈다(Page/Container 분리, 결정 로그 #12).

---

## 4. 타입 설계

원칙: 베이스 인터페이스 하나를 최상단에 두고, `Omit`/`Pick`/`Partial`/`Record`로 파생시킨다.
직접 타입을 다시 적지 않으므로 원본이 바뀌면 파생 타입이 자동으로 따라온다.
도메인별 `types.ts` 하나만 봐도 "이 도메인이 다루는 모든 shape"가 드러난다.

### 4.1 product/types.ts

```ts
// 서버가 주는 단일 원본 shape (server/src/database.ts의 Product와 일치)
export interface Product {
  id: number;
  imageUrl: string;
  name: string;
  price: number;
  quantity: number;
}

// POST /products body — id는 서버가 채운다
export type CreateProductRequest = Omit<Product, "id">;
```

> 서버 `Product.id`는 `id?: number`(생성 시 미정)지만, 클라이언트가 GET으로 받는
> 데이터는 항상 id를 가진다. 클라 타입에서는 `id: number`로 좁혀 다룬다.

### 4.2 cart/types.ts

```ts
import type { Product } from "../product/types";

// 장바구니 아이템은 서버의 Product 그 자체 (Cart: Product[])
export type CartItem = Product;

// PATCH /cart/:id body — 수량만 보낸다
export type UpdateQuantityRequest = Pick<Product, "quantity">;

// 낙관적 업데이트/부분 갱신용
export type CartItemPatch = Partial<Product>;

// 클라 전용 선택 상태: id -> 선택 여부 (localStorage 저장 형태)
export type SelectionState = Record<Product["id"], boolean>;

// 렌더링 직전에만 합치는 뷰 타입 (저장용 아님)
export interface SelectableCartItem extends CartItem {
  selected: boolean;
}
```

### 4.3 shared/types.ts

```ts
// 서버 공통 응답
export interface MessageResponse { message: string; }   // 201 등
export interface ErrorResponse { errorMessage: string; } // 4xx/5xx
```

### 4.4 유틸리티 타입 ↔ 요구사항 매핑


| 파생 타입                   | 유틸        | 대응                           |
| ----------------------- | --------- | ---------------------------- |
| `CreateProductRequest`  | `Omit`    | 상품 추가 (POST body, id 제외)     |
| `UpdateQuantityRequest` | `Pick`    | 수량 변경 PATCH (quantity만)      |
| `CartItemPatch`         | `Partial` | 낙관적 업데이트/부분 갱신               |
| `SelectionState`        | `Record`  | 선택 여부 새로고침 유지 (localStorage) |


---

## 5. 상태 관리 전략

### 5.1 서버 상태 vs 클라이언트 상태 분리


|         | 출처           | 관리                            | 새로고침            |
| ------- | ------------ | ----------------------------- | --------------- |
| 장바구니 목록 | 서버 GET /cart | 자체 `QueryCache`                | 서버에서 재요청        |
| 선택 여부   | 클라이언트        | `useSelection` + localStorage | localStorage 복원 |


선택 상태를 아이템에 붙이지 않고 별도 맵(`SelectionState`)으로 분리한다.
이유: 캐시를 리페치하면 서버 데이터에는 `selected`가 없어 선택 정보가 날아간다.
분리하면 서버 캐시는 순수하게 유지되고 선택 정보는 독립적으로 지속된다.

렌더링 직전에만 합친다:

```ts
const view: SelectableCartItem[] = items.map((item) => ({
  ...item,
  selected: selection[item.id] ?? true, // 기본 선택 = "진입 시 전체 선택"
}));
```

### 5.2 useSelection 훅 (선택 상태 + 지속성)

```ts
const SELECTION_KEY = "cart-selection";

export function useSelection() {
  const [selection, setSelection] = useState<SelectionState>(
    () => loadFromStorage<SelectionState>(SELECTION_KEY) ?? {},
  );

  useEffect(() => {
    saveToStorage(SELECTION_KEY, selection);
  }, [selection]);

  const isSelected = (id: number) => selection[id] ?? true; // 미저장 = 선택됨
  const select = (id: number, value: boolean) =>
    setSelection((prev) => ({ ...prev, [id]: value }));
  const setAll = (ids: number[], value: boolean) =>
    setSelection(Object.fromEntries(ids.map((id) => [id, value])));

  return { isSelected, select, setAll };
}
```

- 키가 없으면 `true`로 간주 → "진입 시 전체 선택"이 자동 충족.
- 새로 담긴 상품도 기본 선택 상태.
- 개별 선택/전체선택 변경은 localStorage에 반영되어 새로고침 후 유지.
- `select`는 체크박스가 넘기는 boolean을 그대로 받는다 → `CartItem`의 `onSelect(id, selected)`와 계약이 맞물린다.

### 5.3 낙관적 업데이트 (서버 상태 위에 한 겹, L10)

수량 변경, 삭제는 서버 왕복을 기다리지 않고 즉시 화면에 반영한다. 단 서버 동기화 방식
(`invalidate` 재조회)은 그대로 두고, "미리 보여주기"만 컴포넌트 레벨로 분리한다(결정 로그 #10).

```ts
// CartContainer 안 — useOptimistic의 base는 서버 상태(items)
const [optimisticItems, applyOptimistic] = useOptimistic(items ?? [], applyCartAction);

const handleRemove = (id: number) => {
  startTransition(async () => {
    applyOptimistic({ type: "remove", id });   // ① 즉시 UI에서 제거
    await removeFromCart.mutate(id);            // ② 서버 DELETE → onSettled invalidate
  });                                           //   재조회 끝나면 base(items)가 갱신되며 수렴
};
```

- 변환 규칙은 순수 함수 `applyCartAction`(§8)에 두고, 컴포넌트는 "언제 적용할지"만 안다.
- `useMutation`의 `onSettled`를 await해서 재조회 완료까지 transition이 유지 → optimistic이
  실제 데이터로 매끄럽게 바뀐다(깜빡임 없음, 결정 로그 #16).
- 자식(`CartItem`/`CartList`)은 이 변화를 전혀 모른다 — 의도 콜백 계약 덕분(§7.3).

---

## 6. API 연동

### 6.1 엔드포인트 매핑 (실제 서버 코드 기준)


| 동작      | 메서드, 경로               | 요청 body                 | 성공                    | 에러              |
| ------- | ---------------------- | ----------------------- | --------------------- | --------------- |
| 상품 목록   | `GET /products`        | —                       | 200 `Product[]`       | 500             |
| 상품 추가   | `POST /products`       | `CreateProductRequest`  | 201 `MessageResponse` | 400 / 500       |
| 상품 삭제   | `DELETE /products/:id` | —                       | 204                   | 404 / 500       |
| 장바구니 조회 | `GET /cart`            | —                       | 200 `CartItem[]`      | 500             |
| 장바구니 담기 | `POST /cart/:id`       | —                       | 201 `MessageResponse` | 404 / 500       |
| 수량 변경   | `PATCH /cart/:id`      | `UpdateQuantityRequest` | 204                   | 400 / 404 / 500 |
| 장바구니 제거 | `DELETE /cart/:id`     | —                       | 204                   | 404 / 500       |


> 주의: STEP1 문서에는 수량 변경이 `PUT /cart`로 적혀 있으나, 실제 서버 구현은
> `PATCH /cart/:id` (body `{ quantity }`) 다. 클라이언트는 실제 구현을 따른다.
> 에러 응답 shape는 항상 `{ errorMessage: string }`, 성공 메시지는 `{ message: string }`.

### 6.2 fetch 래퍼 (shared/api/client.ts)

- baseURL 주입, JSON 직렬화, 응답 상태 코드 검사.
- 비정상 응답이면 `errorMessage`를 꺼내 `Error`로 정규화해 throw → `useQuery`/`useMutation`의 `error`로 흐름.
- 204(No Content)는 body 파싱 생략.

```ts
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ErrorResponse | null;
    throw new Error(body?.errorMessage ?? "요청 처리 중 오류가 발생했습니다.");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
```

### 6.3 서버상태 키 & 훅 (자체 구현)


| 키              | 훅               | 설명         |
| -------------- | --------------- | ---------- |
| `['cart']`     | `useCart()`     | 장바구니 목록 조회 |
| `['products']` | `useProducts()` | 상품 목록 조회   |


뮤테이션 (`useCartMutations`): `addToCart`, `updateQuantity`, `removeFromCart`.
각 뮤테이션은 `onSettled`에서 `cache.invalidate(['cart'])`로 해당 키를 무효화(재조회)한다.

```ts
const updateQuantity = useMutation({
  mutationFn: ({ id, quantity }: { id: number } & UpdateQuantityRequest) =>
    apiRequest<void>(`/cart/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }),
  onSettled: () => cache.invalidate(["cart"]),
});
```

---

## 7. 컴포넌트 계층

### 7.1 레이아웃 프리미티브 (emotion, 슬롯 기반)

스타일만 책임지고 도메인은 모른다. 화면 전체가 이 3개의 조합으로 떨어진다.

prop 인터페이스 규칙 (idiom): 프리미티브는 네이티브 엘리먼트 props를
`React.ComponentPropsWithRef<"태그">`로 상속해 `className`/`style`/`ref`/표준 이벤트를
그대로 받는다(네이티브처럼 합성 가능). 내가 재정의하는 prop이 베이스와 이름 충돌하면
`Omit`으로 빼낸다. React 19라 `forwardRef`는 쓰지 않는다(`ref`는 일반 prop).
`styled.div`(Stack/Media)는 emotion이 네이티브 props를 자동 전달하므로 이미 충족.

```tsx
// Row — 양끝정렬 슬롯 + 네이티브 div props 상속
interface RowProps extends React.ComponentPropsWithRef<"div"> {
  left?: React.ReactNode;
  right?: React.ReactNode;
}
export function Row({ left, right, ...rest }: RowProps) {
  return (
    <RowBox {...rest}>
      <div>{left}</div>
      <div>{right}</div>
    </RowBox>
  );
}
const RowBox = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

// Stack — 세로 스택
export const Stack = styled.div<{ gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${({ gap = 0 }) => gap}px;
`;

// Media — 이미지 + 내용 가로배치
export const Media = styled.div<{ gap?: number }>`
  display: flex;
  align-items: center;
  gap: ${({ gap = 12 }) => gap}px;
`;
```

### 7.2 도메인 컴포넌트 = 프리미티브 조합

Page/Container 분리(결정 로그 #12): `CartPage`(page 레이어)는 헤더, 레이아웃과 라우팅만,
실제 데이터, 계산, 의도처리는 `CartContainer`가 맡는다. 라우터(`useNavigate`)는 Page에만 있어
`CartContainer`는 라우팅을 모른다.

```
page/CartPage             # 골격 + navigate("/order") 주입
├── Header (SHOP)
└── cart/CartContainer    # 오케스트레이터(훅 조립, 계산, 의도→처리, 낙관적)
    ├── SelectAll           → Row(left = 전체선택 체크박스)
    ├── CartList
    │   └── CartItem[]      → Stack( Row(체크박스↔삭제) + Media(이미지 + 이름/가격/수량) )
    ├── FreeShippingNotice
    ├── OrderSummary        → Row × 3 (주문금액/배송비/총결제)
    └── OrderButton         → "주문 확인" (onCheckout → 부모가 navigate)

page/OrderConfirmPage     # 총 결제 금액 재계산 + (자리만)결제하기 + ← 뒤로가기
```

화면을 행 단위로 분해한 매핑:


| 영역           | 프리미티브   | left    | right    |
| ------------ | ------- | ------- | -------- |
| 주문금액/배송비/총결제 | `Row`   | 라벨      | 금액       |
| 상품카드 상단      | `Row`   | 체크박스    | 삭제       |
| 상품카드 본문      | `Media` | 이미지     | 이름/가격/수량 |
| 전체선택         | `Row`   | 체크박스+라벨 | —        |


### 7.3 컴포넌트 Props 계약 — 의도(이벤트)만 위로 흘린다

자식 컴포넌트는 무슨 일이 일어나길 원하는지(도메인 이벤트)만 부모에게 알린다.
그것을 어떻게 처리할지(서버 호출, invalidate/refetch, 낙관적 업데이트)는 `CartPage`가 소유한다.

- 콜백 prop은 `on<Event>` 네이밍, 반환은 `void`. 자식은 비동기 여부, 성공/실패를 모른다.
- prop 이름에 `delete`/`update`/`fetch`/`refetch`/`mutate` 같은 메커니즘 동사를 쓰지 않는다.
- 효과: `CartItem`은 장바구니 외 다른 맥락(위시리스트 등)에서도 재사용 가능하고,
  처리 방식을 invalidate → optimistic으로 바꿔도 자식 코드는 그대로다.
- 이 원칙은 컴포넌트 경계에만 적용된다. `useCartMutations`의
  `addToCart`/`updateQuantity`/`removeFromCart`는 구현 레이어(부모가 소유)이므로
  도메인 동작 이름을 그대로 쓴다.

베이스 props 상속 (idiom) — 프리미티브 전면 / 도메인 선택적

- 프리미티브(Row/Stack/Media/Spinner/ErrorMessage): `React.ComponentPropsWithRef<"태그">`를
  상속해 합성 가능하게 한다(§7.1).
- 도메인 컴포넌트(CartItem/CartList/OrderSummary/CartPage): 기본은 의도 콜백 위주의 최소 props.
  네이티브 props 통과가 정말 필요한 곳만 상속하고, 위험, 충돌 prop은 `Omit`으로 닫는다.
  무분별한 상속은 호출부가 의도 콜백 계약을 우회(임의 `onClick` 등)하게 해 캡슐화를 깬다.
- `Omit`은 충돌 회피 장치: 도메인 prop 이름이 네이티브와 겹칠 때 베이스에서 빼낸다.
  예) `CartItem`의 `onSelect`(도메인)는 네이티브 `onSelect`(폼 이벤트)와 충돌 → `Omit`.

```tsx
interface CartItemProps
  extends Omit<React.ComponentPropsWithRef<"li">, "onSelect"> {
  item: SelectableCartItem;
  onSelect: (id: number, selected: boolean) => void;
  onQuantityChange: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}
```

함수를 안에서 호출할까 vs props로 주입할까 (DIP 판별 기준)

view가 도메인 함수(`clampQuantity` 등)를 직접 import해 호출하면, 저수준 모듈(view)이
고수준 정책에 컴파일 타임으로 의존한다 — 1단계 서버 미션에서 `Controller`가
`new JdbcRepository()` 하는 것과 같은 DIP 위반이다. 대신 콜백 prop이라는 추상에
의존하고 구체 동작은 `CartPage`가 주입한다.

> use case마다 달라지거나 부수효과, 정책인가? → props로 주입
> 맥락 무관하게 항상 같은 순수 변환인가? → 안에서 호출 OK

- `clampQuantity`(1~99)는 "장바구니엔 있고 위시리스트엔 없는" 맥락 가변 정책 → 주입.
  `CartItem`은 raw 수량 의도만 올리고, clamp는 `CartPage`/`cartModel`이 수행한다
  (`CartItem`은 `clampQuantity`를 import하지 않는다).
- `formatPrice`는 맥락 무관 순수 변환 → 컴포넌트 안에서 호출해도 무방.
- "+ 버튼 99에서 무동작"은 raw `100` → clamp `99` → 재렌더로 충족된다. 시각적
  `disabled`가 필요하면 규칙 판단이 아니라 `disabled` prop을 부모가 내려준다.


| 컴포넌트              | 데이터 props                  | 콜백 props (의도)                                                          |
| ----------------- | -------------------------- | ---------------------------------------------------------------------- |
| `CartPage` (page) | —                          | — (라우팅, 골격: `CartContainer`에 `onCheckout = navigate("/order")` 주입) |
| `CartContainer`   | — (훅에서 직접 조회)              | `onCheckout`(부모 주입) + 오케스트레이터: 의도 → 처리 방식 결정                       |
| `CartList`        | `items: SelectableCartItem[]` | `onSelect` / `onQuantityChange` / `onRemove` (아래로 전달)                |
| `CartItem`        | `item: SelectableCartItem` | `onSelect(id, selected)` / `onQuantityChange(id, quantity)` / `onRemove(id)` |
| `SelectAll`       | `checked: boolean`         | `onSelectAll(checked)`                                                  |
| `OrderSummary`    | `orderAmount` / `shippingFee` / `total` | — (표시 전용)                                              |
| `FreeShippingNotice` | `remaining: number`     | — (표시 전용)                                                              |
| `OrderButton`     | `disabled?`                | `onCheckout()` (버튼 텍스트 "주문 확인"; 금액은 `OrderSummary`가 표시)        |
| `ErrorMessage`    | `message?: string`         | `onRetry()`                                                            |
| `OrderConfirmPage`(page) | — (훅에서 재계산)         | — (← 뒤로가기 `navigate(-1)`, 결제하기는 자리만)                              |


`CartPage`(라우팅)와 `CartContainer`(처리)가 나뉘는 지점:

```tsx
// page/CartPage.tsx — 라우팅만 주입
function CartPage() {
  const navigate = useNavigate();
  return <CartContainer onCheckout={() => navigate("/order")} />;
}

// cart/components/CartContainer.tsx — 의도 → 처리 결정 (clamp, mutate, 낙관적)
function CartContainer({ onCheckout }: { onCheckout: () => void }) {
  const { data: items } = useCart();
  const { updateQuantity, removeFromCart } = useCartMutations();
  const { isSelected, select } = useSelection();
  const view = items.map((item) => ({ ...item, selected: isSelected(item.id) }));

  return (
    <CartList
      items={view}
      onSelect={(id, selected) => select(id, selected)}                       // 클라 상태
      onQuantityChange={(id, q) => updateQuantity.mutate({ id, quantity: clampQuantity(q) })} // clamp 주입
      onRemove={(id) => removeFromCart.mutate(id)}                             // 처리 방식은 여기서만
    />
    /* ...OrderButton onCheckout={onCheckout} */
  );
}
```

두 겹의 효과: ① 같은 `onRemove`를 invalidate→낙관적으로 바꿔도 `CartList`/`CartItem`은 한 줄도
안 바뀌고(자식은 "빼고 싶다"만 던진다), ② 라우팅이 생겨도 `CartContainer`는 `onCheckout` 의도만
받아 그대로다 — 처리(navigate)는 Page가 소유한다(결정 로그 #8, #12, #13).

---

## 8. 도메인 규칙 (cart/cartModel.ts)

순수 함수로 분리한다. 컴포넌트 밖에 있으므로 RTL 없이 단위 테스트한다.

```ts
export const FREE_SHIPPING_THRESHOLD = 100_000;
export const SHIPPING_FEE = 3_000;
export const MAX_QUANTITY = 99;
export const MIN_QUANTITY = 1;
export const MAX_NAME_LENGTH = 100;

// 선택된 상품의 가격 합 (price * quantity)
export function calcOrderAmount(items: SelectableCartItem[]): number {
  return items
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// 배송비: 선택 없음(0원)이거나 임계값 이상이면 무료
export function calcShippingFee(orderAmount: number): number {
  if (orderAmount === 0) return 0;
  return orderAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export function calcTotal(orderAmount: number, shippingFee: number): number {
  return orderAmount + shippingFee;
}

export function clampQuantity(quantity: number): number {
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, quantity));
}
```

위 기본 계산 위에 두 개의 묶음 함수를 더 둔다. 둘 다 순수 함수라 RTL 없이 단위 테스트한다.

- `calcSummary(view)` — `orderAmount`/`shippingFee`/`total`/`remaining`을 한 번에 계산해
  객체로 반환한다. `CartContainer`와 `OrderConfirmPage`가 같은 계산을 중복하지 않도록 공유한다
  (의도: 총액 계산이 두 화면에 흩어지면 규칙이 갈라진다 — §8 한 곳에 모은다).
- `applyCartAction(items, action)` — 낙관적 업데이트용 순수 상태 변환. `{type:'quantity'}` /
  `{type:'remove'}`를 받아 새 배열을 만든다(원본 불변). `useOptimistic`의 reducer로 쓴다(§5.3, L10).
  서버 호출이나 React를 모르는 순수 함수라, "UI를 어떻게 미리 바꿀지"만 여기서 다룬다.

### 규칙 요약

- 진입 시 전체 선택.
- 주문 금액 = 선택된 상품의 `price × quantity` 합.
- 주문 금액 10만원 이상 → 배송비 0, 미만 → 3,000원. 선택 0개면 배송비 0.
- 총 결제 금액 = 주문 금액 + 배송비.
- 수량 1~99 (서버 검증과 일치). UI에서 99 초과/1 미만 입력 차단.
- 상품명 100자 이하.

---

## 9. 비동기 상태 처리

자체 `useQuery`의 `isLoading` / `error` / `data`로 분기한다.


| 상태               | UI                                  |
| ---------------- | ----------------------------------- |
| 로딩 (`isLoading`) | `Spinner` 또는 스켈레톤                   |
| 에러 (`error`)     | `ErrorMessage` + 재시도 버튼 (`refetch`) |
| 성공, 빈 목록         | "장바구니가 비어 있습니다" 안내                  |
| 성공, 데이터 있음       | 정상 렌더                               |


뮤테이션 진행 중에는 해당 버튼을 `isLoading`으로 비활성/스피너 처리.
실패 시 에러 메시지 노출(스낵바 또는 인라인).

```tsx
function CartPage() {
  const { data: items, isLoading, error, refetch } = useCart();
  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage onRetry={refetch} />;
  if (items.length === 0) return <EmptyCart />;
  return /* ...정상 렌더... */;
}
```

---

## 10. 테스트 전략

### 10.1 도구

- Jest: 러너/어서션.
- React Testing Library: 컴포넌트 렌더 + 사용자 관점 쿼리(`getByRole`/`getByText`).
- MSW: API 모킹. `mocks/server.ts`의 `setupServer`를 `beforeAll/afterEach/afterAll`에 연결.

### 10.2 레이어별 테스트


| 대상                   | 방식               | 예                                  |
| -------------------- | ---------------- | ---------------------------------- |
| `cartModel.ts` 순수 함수 | Jest 단위 테스트      | 배송비 경계값(99,999 / 100,000), 빈 선택 0원 |
| `useSelection`       | RTL `renderHook` | 토글, 전체선택, localStorage 지속          |
| API/뮤테이션             | RTL + MSW        | 수량 변경 PATCH 성공 → 목록 갱신             |
| 컴포넌트 통합              | RTL + MSW        | 선택 해제 시 결제금액 동적 변경                 |
| 에러 UI                | MSW로 500 응답      | 에러 메시지 노출 확인                       |


### 10.3 주요 테스트 케이스

- 진입 시 전체 선택 상태로 렌더된다.
- 상품 선택 해제 시 주문 금액이 줄어든다.
- 주문 금액 10만원 미만이면 배송비 3,000원, 이상이면 0원.
- 수량 99에서 + 버튼이 동작하지 않는다(또는 99로 고정).
- 삭제 시 목록에서 사라지고 금액이 재계산된다.
- 새로고침(재마운트) 후 선택 상태가 복원된다.
- GET /cart 500 응답 시 에러 메시지가 보인다.
- 로딩 중 스피너가 보인다.

---

## 11. 결정 로그


| #   | 결정                                        | 대안                     | 근거                                        |
| --- | ----------------------------------------- | ---------------------- | ----------------------------------------- |
| 1   | 도메인 중심 폴더 구조                              | 역할(layer) 중심           | 도메인 규칙을 한곳에 모음.                           |
| 2   | 스타일 = emotion (`styled` + `css`)          | CSS Modules            | props 동적 스타일 + co-location.               |
| 3   | `Row`는 슬롯 래퍼(left/right)                  | children 직접 조합         | 양끝정렬 의도를 호출부에 명시. center 슬롯은 미사용으로 제거.    |
| 4   | 베이스 인터페이스 + `Omit/Pick/Partial/Record` 파생 | 타입 개별 정의               | 원본을 따라가게 해 유지보수 포인트 축소. 인터페이스만으로 목적이 드러남. |
| 5   | 선택 상태 = 별도 `Record<id, boolean>` 맵        | 아이템에 `selected` 부착     | 서버 캐시 오염 방지, 서버/클라 상태 분리.        |
| 6   | 선택 지속 = localStorage                      | sessionStorage / 서버 저장 | 새로고침 유지 요구, 서버에 선택 개념 없음.                 |
| 7   | 수량 변경 = `PATCH /cart/:id`                 | 문서의 `PUT /cart`        | 실제 서버 구현을 따름.                             |
| 8   | 컴포넌트 콜백 = 의도(`onRemove` 등, `=> void`)    | `deleteCartItem`/`refetchCart` 식 메커니즘 prop | 자식이 처리 방식(refetch/optimistic)을 모르게 해 재사용성, 교체 자유 확보 (DIP). |
| 9   | 맥락 가변 정책(`clampQuantity` 등)은 props로 주입   | view가 도메인 함수 직접 import, 호출 | view→도메인 직접 의존은 DIP 위반(`new JdbcRepository()`와 동형). 순수 상수변환(`formatPrice`)만 내부 호출 허용. |
| 10  | 서버상태 = 자체 `QueryCache`+`useQuery`/`useMutation`, 낙관적=`useOptimistic` | TanStack Query (React Query) | 미션 요구로 fetching 라이브러리 금지. 캐시는 invalidate만, 낙관적 업데이트는 컴포넌트 레벨 `useOptimistic`로 분리. |
| 11  | prop 인터페이스 = 베이스(`ComponentPropsWithRef`) 상속 + 충돌 `Omit` (프리미티브 전면 / 도메인 선택적) | 매번 최소 인라인 타입 | 프리미티브 합성성↑, React 19라 forwardRef 불필요. 도메인 컴포넌트는 의도 콜백 우선이라 선택 적용. |
| 12  | Page/Container 분리 + `page/` 레이어 | 한 컴포넌트가 라우팅+조립+로직 다 담당 | 페이지는 라우팅, 골격만, 데이터, 계산, 의도처리는 `CartContainer`로. 라우팅이 생겨도 화면 로직은 안 흔들림. |
| 13  | react-router v7 도입, `navigate`는 Page가 주입 | 단일 화면 유지 / Container가 직접 navigate | 주문 확인 페이지 추가. `CartContainer`는 `onCheckout` 의도만 올리고 라우터를 몰라 → 테스트도 라우터 불필요(#8, #12와 일관). |
| 14  | effect, 구독 콜백은 named function (순수 변환은 익명) | 전부 익명 화살표 | 스택트레이스, 디버거, 검색에서 잡히게. `useEffect(function persistSelection(){...})` 식. |
| 15  | `shared/api`를 `client.ts`(HTTP) + `query/`(서버상태 시스템)로 분리 | 평면 나열 | 성격이 다른 둘을 갈라 응집도↑. 11개 평면 파일 → HTTP 1 + 자체 QueryCache 묶음. |
| 16  | `useMutation`의 `onSettled`를 await | fire-and-forget | 낙관적 업데이트가 재조회 완료까지 유지되어 실제 데이터로 매끄럽게 수렴(깜빡임 방지, L10). |
| 17  | 함수 시그니처의 `id`도 `Pick`/`CartItem["id"]`로 파생 | `id: number` 인라인 | "원본 바뀌면 자동 추종"(#4)을 *쓰는 곳*까지 일관 적용. `number` 리터럴이 도메인 코드에 안 남게. |


---

## 12. 미해결 / 확인 필요

- 뮤테이션 실패 UX (가장 큰 구멍) — 수량 변경, 삭제가 서버에서 실패하면 낙관적 업데이트는
  롤백되지만 사용자에게 알림이 없다. `useCartMutations`의 `error`를 `CartContainer`가 구독해
  인라인 에러를 띄워야 한다(§9의 "뮤테이션 실패 시 에러 메시지" 미구현).
- 에러 메시지 전달 — `apiRequest`가 정규화한 `errorMessage`를 `ErrorMessage`에 안 넘겨
  항상 기본 문구만 뜬다. `message={error.message}` 한 줄로 개선 가능.
- 상품 추가/삭제(catalog) UI를 이번 화면에 노출할지(현재 API, 타입만 준비).
- `QueryCache` 동시성: 같은 키 fetch가 겹칠 때 오래된 응답이 덮어쓸 수 있다(단일 화면이라 실발생 낮음, YAGNI로 보류).
- 에러 표시 방식: 인라인 vs 스낵바(토스트).

> 해결됨: 낙관적 업데이트는 L10에서 `useOptimistic`로 적용(결정 로그 #10, #16).

---

## 13. 배포

| 대상 | 플랫폼 | 방식 |
| --- | --- | --- |
| client | GitHub Pages | `step-2` push → GitHub Actions가 빌드 → Pages 게시 |
| server | Railway | Node 앱(Express). `server/`를 Railway 서비스로 |

### 13.1 client (GitHub Pages)

- base 경로: Pages는 `/<레포명>/` 하위라, `vite.config`의 `base`를 `VITE_BASE_PATH` env로 제어.
  Actions에서 `VITE_BASE_PATH=/shopping-cart-full-stack/` 주입(로컬, 기타 빌드는 `/`).
- router basename: `createBrowserRouter(..., { basename: import.meta.env.BASE_URL })`로 base와 일치.
- SPA fallback: Pages는 서버 라우팅이 없어 `/order` 직접 접근 시 404 → 빌드 후 `index.html`을
  `404.html`로 복사해 모든 경로를 SPA로 되돌린다(Actions 스텝).
- API URL: `VITE_API_BASE_URL`은 빌드 타임에 박히므로 Actions env로 주입(`.env.production`은 gitignore).

### 13.2 server CORS

`server/src/app.ts`의 CORS 허용 origin을 하드코딩 대신 env로:

```ts
const allowedOrigins = ['http://localhost:3000', process.env.CLIENT_ORIGIN].filter(Boolean);
// 요청 origin이 허용 목록에 있으면 그대로 반영, OPTIONS(preflight)는 204
```

- 배포 client의 origin(경로 제외, 예 `https://lee-eojin.github.io`)을 server env `CLIENT_ORIGIN`에 설정.
- `PATCH`/`DELETE`는 preflight(`OPTIONS`)가 필요해 서버가 204로 응답해야 한다.

> 트러블슈팅 전말(jest-dom 진입점, tsconfig 에디터 라우팅, Railway 빌드 등)은 `docs/troubleShooting.md` 참고.

