TypeScript 멀티 프로젝트 환경에서 jest-dom 매처 미인식과 React UMD 전역 오류의 원인 분석 및 해결 과정.

문제

1. 컴포넌트 테스트에서 toBeInTheDocument 매처가 타입상 없다는 오류
2. 컴포넌트 소스에서 'React'가 UMD 전역을 참조한다는 오류

---

0. 요약

React 19, Vite, Jest, swc, @testing-library 기반 클라이언트에서 에디터 타입 오류 두 가지를 추적하고 해결한 과정을 정리한다. 첫째는 컴포넌트 테스트에서 toBeInTheDocument 매처가 타입상 없다는 오류, 둘째는 컴포넌트 소스에서 'React'가 UMD 전역을 참조한다는 오류이다. 둘은 표면상 무관해 보였고 jest 실행과 일부 타입체크가 통과해서 원인 파악이 오래 걸렸다.

두 오류의 뿌리는 하나였다. 에디터의 TypeScript 언어 서버가 해당 파일을 올바른 tsconfig 프로젝트에 배정하지 못하고, 설정이 빈 추론 프로젝트로 처리했다. jest-dom 오류에는 직접 원인이 하나 더 있었다. expect를 @jest/globals에서 가져오는 스타일에서는 jest-dom의 메인 진입점이 아니라 jest-globals 전용 진입점을 import해야 한다.

해결은 두 가지다. jest-dom을 @testing-library/jest-dom/jest-globals 진입점으로 바꾸고, 에디터 문제는 루트 tsconfig.json을 솔루션 스타일에서 src를 직접 포함하는 실제 프로젝트로 전환했다. 추적 도중 셸 파이프가 종료코드를 가리는 함정에 빠져 한동안 잘못된 결론에 머문 경위에 대해서도 함께 적었다.

1. 환경과 배경

클라이언트는 Vite 8, React 19, TypeScript 6, emotion, React Compiler를 쓴다. 테스트는 Jest 30에 swc 트랜스폼(@swc/jest), React Testing Library, @testing-library/jest-dom 6.9.1, MSW로 구성한다.

전제가 둘 있다. 첫째, 테스트 코드는 describe, test, expect, jest를 전역으로 쓰지 않고 @jest/globals에서 명시적으로 import한다. 둘째, TypeScript 설정은 멀티 프로젝트 구조다. 루트 tsconfig.json은 files를 빈 배열로 두고 references로 tsconfig.app.json, tsconfig.node.json, tsconfig.test.json 세 프로젝트를 가리키는 솔루션 스타일이었다. app은 src를 include하되 테스트 파일을 exclude하고 jsx를 react-jsx, jsxImportSource를 emotion으로 설정했다. test는 app을 extends하고 테스트 파일과 jest.setup.ts, jest.env.ts를 include하며 types에 jest와 jest-dom을 넣었다. vite 기본 형태에 테스트 프로젝트만 추가한 구조다.

여기서 기억할 전제 하나. jest는 타입체크를 하지 않는다. swc는 타입을 지우고 트랜스폼만 하므로, 타입이 틀려도 테스트는 통과한다. 따라서 이 사건 내내 jest 통과는 타입이 옳다는 증거가 아니었는데, 초반에 이를 충분히 경계하지 못했다.

2. 증상 A의 발견

L7에서 처음으로 컴포넌트 테스트(ErrorMessage.test.tsx, Spinner.test.tsx)를 작성하며 jest-dom 매처 toBeInTheDocument를 처음 썼다. 터미널 jest는 모두 통과했지만, 에디터에서는 expect(...).toBeInTheDocument()에 빨간 줄이 떴다. 에러는 TS2339로, toBeInTheDocument가 Matchers<void, HTMLElement> 등의 교차 타입에 없다는 내용이었다. 런타임은 멀쩡한데 타입 표시만 깨지는, 원인을 헷갈리게 만드는 상황이었다.

3. 증상 A에 대한 가설과 검증

가설 1: TypeScript 언어 서버 캐시 문제. 직전에 새 파일(cartModel.ts)을 만들었을 때 에디터가 잠시 모듈을 못 찾다가 서버 재시작으로 사라진 전례가 있었다. 새 .tsx를 아직 인덱싱하지 못했으리라 보고 Restart TS Server를 권했지만, 재시작 후에도 빨간 줄이 그대로였다. 기각하고 설정 차원으로 방향을 바꿨다.

가설 2: 테스트용 tsconfig에 jest-dom 타입이 없을 가능성. tsconfig.test.json을 열어보니 types에 이미 @testing-library/jest-dom이 있었다. 그 설정을 명시해 npx tsc -p tsconfig.test.json --noEmit을 돌리니 종료코드가 0으로 보였다. 이 관찰이 이후 추적을 크게 오도했다. 당시에는 올바른 설정을 명시하면 타입이 통과하니, 정의 자체는 멀쩡하고 문제는 에디터가 그 설정을 적용하느냐라고 해석했다. 그러나 이 종료코드 0은 신뢰할 수 없는 관측이었다(4절).

가설 3: 솔루션 스타일에서 에디터가 테스트 파일에 잘못된 프로젝트를 적용한다. 루트 tsconfig.json이 files를 비워 두므로 에디터는 파일마다 그 파일을 포함하는 프로젝트를 찾는데, 테스트 파일은 app에서 exclude되어 있다. 에디터가 test를 못 잡으면 가장 가까운 app을 적용하고, app의 types에는 jest-dom이 없으니 매처를 모른다고 표시한다. 이 가설에 따라 app의 types에 jest-dom을 추가했다. app 소스는 jest-dom을 쓰지 않으니 타입만 로드되고 skipLibCheck가 켜져 빌드에 무해하리라 보았고, tsc -b도 통과하는 듯 보였다. 이때 적은 1차 결론은 나중에 틀린 것으로 드러난다.

가설 4: 가설 3의 보강. 에디터가 어느 프로젝트로 잡든 매처 타입을 보게 하려고, 테스트 파일 상단에 import "@testing-library/jest-dom"을 한 줄씩 직접 넣었다. 부수효과 import로 그 파일이 매처 확장을 로드하게 하려는 의도였다. 이때도 tsc와 jest가 통과하는 듯 보였다.

여기서 사용자가 독자적으로 우회를 찾았다. import React from "react"를 넣고 toBeInTheDocument()를 toBeTruthy()로 바꾸니 빨간 줄이 사라졌다. 이 사실이 두 가지를 알려줬다. 매처 교체로 해결됐다는 것은 빨간 줄의 원인이 jest-dom 매처 타입임을 가리킨다. toBeTruthy는 jest 기본 매처라 확장이 필요 없기 때문이다. 다만 우회에는 결함이 있었다. import React는 automatic JSX에서 불필요하고 noUnusedLocals에 걸릴 수 있다. 또 screen.getByText는 요소를 못 찾으면 예외를 던지므로, 이미 찾은 값에 toBeTruthy를 거는 단언은 사실상 의미가 없다. 동작은 하지만 매처를 회피한 것이지 고친 게 아니었다. 진단 정보로만 받아들이고 정식 해결을 계속 찾았다.

가설 5: expect의 출처. 이 프로젝트는 expect를 전역이 아니라 @jest/globals에서 import한다. import "@testing-library/jest-dom"은 전역 expect를 확장하지만 @jest/globals의 expect는 별도 모듈 타입이라 그 확장을 못 받는다고 보았다. 그래서 jest-dom 6.x 안내대로 jest.setup.ts에서 import _ as matchers from "@testing-library/jest-dom/matchers"로 매처를 가져와 expect.extend(matchers)를 호출하게 바꿨다. 타입체크는 통과하는 듯했으나 jest를 돌리니 15개 스위트가 전부 실패하고 테스트가 0개 실행됐다. 단일 스위트로 좁히니 TypeError가 났다. expect.extend가 default는 함수여야 하는데 object라며 거부했다. swc의 esModule interop이 import _ as 네임스페이스 객체에 default 키를 끼워 넣었고, expect.extend가 그 default까지 매처로 등록하려다 깨졌다. 이 버전과 swc 조합에서 expect.extend(import \* as matchers)는 쓸 수 없음을 확인하고 기각, setup을 부수효과 import로 되돌렸다.

4. 결정적 전환: 셸 파이프 함정

한 발 물러나 관측을 다시 점검했다. 그동안 tsc 통과를 믿은 근거 다수가 npx tsc ... 2>&1 | head로 출력을 head에 파이프한 뒤 echo "$?"로 종료코드를 읽은 것이었다. 파이프라인에서 $?는 마지막 명령(head)의 종료코드라, 앞단 tsc가 실패해도 항상 0으로 보인다. 파이프 없이 npx tsc -p tsconfig.test.json --noEmit을 그대로 실행하니 종료코드 2가 나왔고 toBeInTheDocument 오류가 분명히 남아 있었다.

즉 이것은 처음부터 에디터만의 표시 문제가 아니라 진짜 타입 오류였고, jest는 swc 트랜스폼만 하니 통과했을 뿐이다. 가설 2의 종료코드 0은 신뢰할 수 없는 관측이었고, 그 잘못된 관측이 가설 3의 잘못된 결론으로 이어졌다.

5. 증상 A의 진짜 원인과 해결

추측 대신 패키지를 직접 열었다. @testing-library/jest-dom의 package.json exports를 보니 메인 외에 jest-globals, matchers, vitest, bun 같은 서브 진입점이 있었고, 진입점마다 augment하는 모듈이 달랐다. node_modules의 types를 grep하니 jest-globals.d.ts는 declare module '@jest/expect'를, vitest.d.ts는 'vitest'를, bun.d.ts는 'bun:test'를 확장하고 있었다.

메인 진입점은 전역 expect를 확장하지만, @jest/globals가 내부적으로 쓰는 @jest/expect는 jest-globals 진입점만 확장한다. 우리 테스트는 expect를 @jest/globals에서 import하므로 그 타입은 @jest/expect의 Matchers였고, 에러에 찍힌 Matchers<void, HTMLElement>가 바로 그것이다. 메인 진입점만 로드하고 있었으니 @jest/expect는 확장되지 않아 toBeInTheDocument가 붙지 않았다.

해결은 jest-globals 전용 진입점이다. jest.setup.ts의 import를 @testing-library/jest-dom/jest-globals로 바꾸고, 매처를 쓰는 컴포넌트 테스트 상단에도 같은 import를 직접 넣었다. setup만으로도 tsconfig.test.json 컨텍스트에서는 augment가 전파되지만, 에디터가 테스트 설정을 못 잡고 다른 프로젝트로 fallback하는 경우까지 덮기 위해 파일이 직접 import하게 했다. 파이프 없이 확인하니 tsconfig.test.json 단독 종료코드가 0으로 바뀌었고, 이번엔 신뢰할 수 있는 0이었다. 중간에 시도한 우회(app types에 jest나 jest-dom 추가, exclude를 풀어 app이 테스트를 컴파일)는 모두 되돌렸다. 특히 types에 @types/jest를 넣으면 @jest/expect 확장과 충돌해 오히려 방해됐다.

6. 증상 B의 발견과 분석

증상 A를 정리하자 두 번째 증상이 드러났다. 컴포넌트 .tsx에서 'React'가 UMD 전역을 참조하지만 현재 파일은 모듈이라는 에러가 에디터에 떴다. React 17 이상의 automatic JSX 변환을 쓰면 import React 없이 JSX를 쓸 수 있는데, 컴파일러가 그 설정을 모르면 JSX를 옛 방식으로 해석해 React를 전역에서 찾으면서 나는 에러다. tsconfig.app.json에는 jsx가 react-jsx라 automatic이 적용되고, 파이프 없이 확인한 tsc 빌드도 이 에러 없이 통과했다. 이것도 코드 문제가 아니라 에디터가 jsx 설정이 없는 프로젝트를 적용한 결과였다.

두 증상의 뿌리가 같다는 게 분명해졌다. 원인은 루트 tsconfig.json이 files를 비우고 references만 가진 솔루션 스타일이다. tsc -b는 references를 따라 빌드하지만, 에디터의 TypeScript 서버는 referenced 프로젝트가 composite여야만 파일을 그 프로젝트로 라우팅한다. composite가 없으니 서버는 어떤 파일도 app이나 test에 배정하지 못하고 설정이 빈 추론 프로젝트로 처리했다. 그 추론 프로젝트에는 jsx 설정도 jest-dom 타입도 없으니, 같은 파일에서 React UMD 에러와 toBeInTheDocument 에러가 함께 났다. 증상 A를 파일 직접 import로 부분적으로 가렸던 것과 달리, 증상 B는 jsx 설정 자체가 빠진 문제라 import로 가릴 수 없었다.

7. 증상 B 해결 시도와 최종 해결

먼저 composite를 켜서 references를 정상화하면 에디터 라우팅이 풀리리라 보고, app, node, test에 composite: true를 넣고 빌드했다. 실패였다. 파이프 없이 확인한 tsc -b 종료코드는 2였다. TS4058은 useCart, useCartMutations의 반환 타입이 외부 모듈의 UseQueryResult, UseMutationResult를 쓰는데 이름 지을 수 없다는 것으로, composite가 declaration 산출을 전제해 반환 타입을 명명해야 하는데 그 인터페이스가 export되지 않아 났다. TS6307은 jest.setup.ts가 src/mocks/server.ts를 import하는데 그 파일이 test 프로젝트 목록에 없다는 것으로, composite의 엄격한 파일 멤버십과 멀티 프로젝트 참조가 충돌했다. 게다가 composite는 emit을 전제하는데 이 프로젝트는 vite 기반이라 noEmit이어서 may not disable emit 충돌도 잠재했다. vite 템플릿이 composite 없이 references만 쓰는 이유다. 이 구조에 안 맞는다고 판단해 전부 되돌렸고, 빌드는 다시 0으로 통과했다.

방향을 바꿔 루트 tsconfig.json 자체를 솔루션이 아니라 src를 직접 포함하는 실제 프로젝트로 만들었다. 처음에는 app을 extends하고 include를 src, exclude를 빈 배열로 두며 references로 node를 가리켰다. 그러나 실제 파일을 가진 프로젝트가 되자 references 규칙이 엄격해져, node를 참조하려면 node가 composite이고 emit해야 한다는 TS6306, TS6310이 났다. vite.config 전용인 node 참조는 빌드 파이프라인에서 빼도 무방하다고 보고 references를 제거했다. 그러자 또, vite 데모 잔재인 App.test.tsx가 전역 test와 expect를 써서 통합 프로젝트에서 이름을 못 찾는 TS2593, TS2304가 났다. 다른 테스트처럼 @jest/globals에서 test, expect를 import하고 @testing-library/jest-dom/jest-globals를 추가하는 컨벤션으로 맞췄다.

최종 형태는 이렇다. 루트 tsconfig.json은 app을 extends하고 include를 src, exclude를 빈 배열로 둔 단일 실제 프로젝트가 됐다. 에디터의 TypeScript 서버가 이 tsconfig.json을 그대로 적용해 모든 .tsx(컴포넌트, 테스트)에 jsx react-jsx와 타입을 부여했고, 추론 프로젝트로 떨어지는 일이 사라졌다. React UMD 에러와 jest-dom 매처 에러가 동시에 해소됐다.

8. 검증 결과

모든 검증은 셸 파이프 없이 종료코드를 직접 읽었다. npx tsc -p tsconfig.json --noEmit은 0. npm run build(내부적으로 tsc -b와 vite build)도 0으로 타입체크와 번들링이 모두 성공. npm run lint도 0, jest는 15개 스위트 53개 테스트가 전부 통과. 빌드, 타입, 린트, 테스트가 모두 정상이고 에디터의 두 빨간 줄도 근본적으로 사라졌다. 다만 이 구조에서는 루트가 tsconfig.node.json을 참조하지 않으므로 vite.config.ts 타입체크가 빌드 파이프라인에서 빠지는데, vite가 실행 시점에 검증하고 eslint도 일부 커버하므로 수용 가능한 트레이드오프로 봤다.

9. 교훈

하나, 종료코드를 볼 때 tsc 출력을 head 같은 명령으로 파이프한 뒤 $?를 읽지 않는다. 파이프라인의 $?는 마지막 명령의 것이라 앞단 실패가 가려진다. 종료코드가 중요하면 파이프 없이 명령을 그대로 실행해 바로 $?를 읽거나, 출력을 파일로 리다이렉트해 따로 확인한다. 이 함정 하나가 한참 동안 잘못된 결론에 머물게 했다.

둘, 라이브러리가 매처를 확장할 때는 어떤 expect를 확장하는지가 결정적이다. 전역 expect를 쓰는지 @jest/globals에서 import한 expect를 쓰는지에 따라 진입점이 다르고, 후자라면 @testing-library/jest-dom/jest-globals를 써야 한다. 에러에 찍힌 타입 이름(@jest/expect 계열의 Matchers)을 보고 어느 계열인지 역추적했어야 했다.

셋, 라이브러리 통합 문제는 추측보다 패키지를 직접 여는 게 빠르다. package.json의 exports로 진입점 구조를, types 디렉토리의 declare module로 무엇을 확장하는지 확인하면 답이 그 안에 있다. 결국 node_modules에서 declare module '@jest/expect'를 발견하고서야 길을 찾았다.

넷, 에디터에서만 나는 타입 오류와 터미널 빌드 통과가 공존하면, 코드가 아니라 에디터가 어떤 tsconfig를 적용하는지의 문제일 가능성이 높다. 솔루션 스타일 references는 composite가 없으면 언어 서버가 파일을 추론 프로젝트로 떨어뜨려 jsx와 types가 모두 빠지므로, React UMD 오류와 매처 오류가 동시에 날 수 있다. composite를 켜는 정공법은 vite의 noEmit과 충돌하기 쉬우니, 루트 tsconfig.json이 src를 직접 include하는 실제 프로젝트가 되게 하는 편이 현실적이다.

다섯, 증상을 가리는 변경과 원인을 고치는 변경을 구분한다. 매처를 다른 매처로 바꿔 빨간 줄이 사라지는 것은 진단 정보일 뿐 해결이 아니다. 특히 getByText처럼 실패 시 예외를 던지는 쿼리 뒤의 존재 단언은 매처를 회피하는 순간 의미를 잃는다. import React로 UMD 오류를 가리는 것도 automatic JSX에서는 불필요하고 noUnusedLocals와 충돌할 수 있는 회피책이다.

여섯, swc 환경에서 expect.extend(import \* as matchers)는 interop이 끼워 넣는 default 키 때문에 깨지므로 쓰지 않는다. 부수효과 import나 전용 진입점 import를 쓴다.

마지막으로, 디버깅 도중 작업 디렉토리가 상위로 바뀐 채 명령을 돌려 엉뚱한 패키지가 설치되거나 전체 node_modules가 스캔되는 혼선이 한 번 있었다. 본 문제와 무관한 디렉토리 착오였으니, 증상이 겹칠 때는 각 증상의 출처를 분리해서 본다.

10. 부록: 최종 변경 파일

jest.setup.ts의 import를 메인 진입점에서 @testing-library/jest-dom/jest-globals로 변경. 컴포넌트 테스트(ErrorMessage.test.tsx, Spinner.test.tsx)와 App.test.tsx 상단에 @testing-library/jest-dom/jest-globals import 추가, App.test.tsx는 전역 test, expect를 @jest/globals import로 통일. 루트 tsconfig.json을 솔루션 스타일에서 app을 extends하고 src를 include, exclude를 빈 배열로 둔 실제 프로젝트로 전환. tsconfig.app.json은 추적 중 임시로 넣은 jest-dom과 jest 타입, exclude 변경, composite를 모두 되돌려 복원. tsconfig.node.json과 tsconfig.test.json도 임시 composite를 제거.
