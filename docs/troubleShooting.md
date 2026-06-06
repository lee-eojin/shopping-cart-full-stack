TypeScript 멀티 프로젝트 환경에서 jest-dom 매처 미인식과 React UMD 전역 오류의 원인 분석 및 해결 보고서


0. 요약

이 문서는 React 19, Vite, Jest, swc, @testing-library 기반 클라이언트에서 발생한 두 가지 에디터 타입 오류를 추적하고 해결한 전 과정을 기록한다. 첫째는 컴포넌트 테스트에서 @testing-library/jest-dom의 toBeInTheDocument 매처가 타입상 존재하지 않는다는 오류였고, 둘째는 컴포넌트 소스에서 'React'가 UMD 전역을 참조하지만 현재 파일은 모듈이라는 오류였다. 두 오류는 표면적으로 무관해 보였고 jest 실행과 일부 타입체크는 통과했기 때문에 원인 파악이 오래 걸렸다. 결론부터 말하면 두 오류는 하나의 뿌리에서 나왔다. 에디터의 TypeScript 언어 서버가 해당 파일들을 올바른 tsconfig 프로젝트에 배정하지 못하고 설정이 비어 있는 추론 프로젝트로 처리한 것이다. 추가로 jest-dom 매처 오류에는 별도의 직접 원인이 하나 더 있었는데, expect를 @jest/globals에서 가져오는 스타일에서는 jest-dom의 메인 진입점이 아니라 jest-globals 전용 진입점을 import해야 한다는 점이었다. 최종 해결은 두 가지였다. jest-dom은 @testing-library/jest-dom/jest-globals 진입점으로 바꾸고, 에디터 라우팅 문제는 루트 tsconfig.json을 솔루션 스타일에서 src를 직접 포함하는 실제 프로젝트로 전환해 해결했다. 이 과정에서 셸 파이프가 종료코드를 가리는 함정 때문에 한동안 잘못된 결론에 머물렀던 경위도 함께 기록한다.


1. 환경과 배경

클라이언트는 Vite 8, React 19, TypeScript 6, emotion, React Compiler를 사용한다. 테스트는 Jest 30에 swc 트랜스폼(@swc/jest)을 쓰고, React Testing Library와 @testing-library/jest-dom 6.9.1, MSW로 구성된다. 중요한 전제가 두 가지 있다. 첫째, 테스트 코드는 describe, test, expect, jest를 전역으로 쓰지 않고 @jest/globals에서 명시적으로 import하는 스타일을 따른다. 둘째, TypeScript 설정은 멀티 프로젝트 구조다. 루트 tsconfig.json은 files를 빈 배열로 두고 references로 tsconfig.app.json, tsconfig.node.json, tsconfig.test.json 세 프로젝트를 가리키는 이른바 솔루션 스타일이었다. tsconfig.app.json은 src를 include하되 테스트 파일을 exclude했고 jsx를 react-jsx로, jsxImportSource를 emotion으로 설정했다. tsconfig.test.json은 app을 extends하고 테스트 파일과 jest.setup.ts, jest.env.ts를 include하며 types에 jest와 jest-dom을 넣었다. 이 구조는 vite가 만들어 주는 기본 형태에 테스트 프로젝트를 추가한 것이다.

핵심적으로 기억해야 할 점은, jest는 타입체크를 하지 않는다는 사실이다. swc는 타입을 지우고 트랜스폼만 하므로, 타입이 틀려도 테스트는 통과할 수 있다. 따라서 이 사건 내내 jest가 통과한다는 사실은 타입이 옳다는 증거가 전혀 아니었는데, 초반에 이를 충분히 경계하지 못했다.


2. 증상 A의 발견

L7 단계에서 처음으로 컴포넌트 테스트인 ErrorMessage.test.tsx와 Spinner.test.tsx를 작성했고, 여기서 처음으로 jest-dom 매처 toBeInTheDocument를 사용했다. 터미널에서 jest를 돌리면 모든 테스트가 통과했지만, 에디터에서는 expect(...).toBeInTheDocument() 부분에 빨간 줄이 떴다. 에러는 TS2339로, toBeInTheDocument 속성이 Matchers<void, HTMLElement> 및 SnapshotMatchers 등의 교차 타입에 존재하지 않는다는 내용이었다. 즉 런타임은 멀쩡한데 타입 표시만 깨지는, 원인을 헷갈리게 만드는 전형적 상황이었다.


3. 증상 A에 대한 가설들과 검증

가설 1은 단순한 TypeScript 언어 서버 캐시 문제였다. 근거는, 직전에 cartModel.ts 같은 새 파일을 만들었을 때 에디터가 잠시 모듈을 못 찾는다고 표시했다가 서버를 재시작하면 사라졌던 전례였다. 새로 만든 .tsx 파일을 서버가 아직 인덱싱하지 못했으리라 보고 TypeScript Restart TS Server를 권했다. 그러나 재시작 후에도 빨간 줄이 그대로였다. 따라서 단순 캐시 가설은 기각되었고, 설정 차원의 원인이 있다고 방향을 바꿨다.

가설 2는 테스트용 tsconfig에 jest-dom 타입이 등록되지 않았을 가능성이었다. 이를 확인하려고 tsconfig.test.json을 직접 열었더니 types 배열에 이미 @testing-library/jest-dom이 들어 있었다. 그리고 그 설정을 명시해 타입체크를 돌렸을 때, 즉 npx tsc -p tsconfig.test.json --noEmit을 실행했을 때 종료코드가 0으로 보였다. 이 관찰이 이후 추적을 크게 오도했다. 당시에는 명시적으로 올바른 설정을 지정하면 타입이 통과한다고 해석했고, 그렇다면 타입 정의 자체는 멀쩡하고 문제는 에디터가 그 설정을 실제로 적용하느냐에 있다고 결론지었다. 그러나 후술하듯 이 종료코드 0은 신뢰할 수 없는 관측이었다.

가설 3은 솔루션 스타일 구조에서 에디터가 테스트 파일에 잘못된 프로젝트를 적용한다는 것이었다. 추론은 이러했다. 루트 tsconfig.json이 files를 빈 배열로 두므로 에디터는 파일마다 그 파일을 포함하는 프로젝트를 찾는데, 테스트 파일은 tsconfig.app.json에서 exclude되어 있다. 만약 에디터가 tsconfig.test.json을 제대로 잡지 못하면 가장 가까운 tsconfig.app.json을 적용하게 되고, app의 types에는 jest-dom이 없으니 매처를 모른다고 표시할 것이다. 이 가설에 따라 tsconfig.app.json의 types에 @testing-library/jest-dom을 추가했다. app 소스는 jest-dom을 실제로 쓰지 않으니 타입만 로드되고 skipLibCheck가 켜져 있어 빌드에는 무해하리라 보았고, 추가 후 tsc -b가 통과하는 것으로 보였다. 이 시점에 troubleShooting 문서의 1차 결론을 이 조치로 적었으나, 이 결론은 나중에 틀린 것으로 판명된다.

가설 4는 가설 3의 보강이었다. 에디터가 어느 프로젝트로 파일을 잡든 확실히 매처 타입을 보게 하려고, 테스트 파일 상단에 import "@testing-library/jest-dom"을 직접 한 줄씩 넣었다. 부수효과 import라 그 파일 자체가 매처 확장을 로드하게 만드는 의도였다. 이때도 tsc와 jest가 통과하는 것으로 보였다.

여기서 사용자가 독자적으로 빨간 줄을 없애는 우회를 발견했다. import React from "react"를 추가하고 toBeInTheDocument()를 toBeTruthy()로 바꾸니 빨간 줄이 사라진 것이다. 이 사실은 두 가지를 시사했다. 매처를 toBeTruthy로 바꾸자 해결됐다는 것은 빨간 줄의 원인이 바로 jest-dom 매처 타입임을 강하게 가리켰다. toBeTruthy는 jest 기본 매처라 어떤 확장도 필요 없기 때문이다. 그러나 이 우회에는 결함이 있었다. import React는 automatic JSX 변환 환경에서 불필요하며 noUnusedLocals 규칙에 걸릴 수 있고, screen.getByText는 요소를 못 찾으면 그 자리에서 예외를 던지므로 이미 찾아낸 값에 toBeTruthy를 거는 것은 사실상 의미 없는 단언이다. 즉 동작은 하지만 매처를 회피한 것이지 고친 것이 아니었다. 그래서 이를 진단 정보로만 받아들이고 정식 해결을 계속 찾았다.

가설 5는 expect의 출처에 주목했다. 이 프로젝트는 expect를 전역이 아니라 @jest/globals에서 import한다. import "@testing-library/jest-dom"은 전역 expect를 확장하지만 @jest/globals의 expect는 별도 모듈 타입이라 그 확장을 받지 못한다고 보았다. 그래서 jest-dom 6.x가 안내하는 방식대로 setup에서 매처를 직접 등록하기로 하고, jest.setup.ts에서 import * as matchers from "@testing-library/jest-dom/matchers"로 매처를 가져와 expect.extend(matchers)를 호출하도록 바꿨다. 타입체크는 통과하는 듯 보였으나 jest를 돌리니 15개 스위트가 전부 실패하고 테스트가 0개 실행됐다. 단일 스위트로 좁혀 확인하니 TypeError가 났는데, expect.extend가 default는 유효한 매처가 아니라며 함수여야 하는데 object라고 거부한 것이다. 원인은 swc의 esModule interop이 import * as로 가져온 네임스페이스 객체에 default 키를 끼워 넣었고, expect.extend가 그 default 객체까지 매처로 등록하려다 깨진 것이다. 이로써 이 버전과 swc 조합에서 expect.extend(import * as matchers) 방식은 쓸 수 없음이 확인되어 기각했고, setup을 부수효과 import로 되돌렸다.


4. 결정적 전환: 셸 파이프 함정의 발견

이쯤에서 한 발 물러나 모든 관측을 다시 점검했다. 그동안 tsc가 통과한다고 믿은 근거 다수가 npx tsc ... 2>&1 | head 형태로 출력을 head에 파이프한 뒤 echo "$?"로 종료코드를 읽은 것이었다. 그러나 파이프라인에서 $?는 마지막 명령인 head의 종료코드이므로, 앞단의 tsc가 실패해도 항상 0으로 보인다. 이 함정을 의식하고 파이프 없이 npx tsc -p tsconfig.test.json --noEmit을 그대로 실행한 뒤 종료코드를 읽으니 2가 나왔고, toBeInTheDocument 오류가 분명히 남아 있었다. 즉 이것은 처음부터 에디터만의 표시 문제가 아니라 진짜 타입 오류였으며, jest는 swc로 트랜스폼만 하므로 통과했던 것뿐이다. 가설 2에서 본 종료코드 0은 신뢰할 수 없는 관측이었고, 이 잘못된 관측이 가설 3의 잘못된 결론으로 이어졌던 것이다.


5. 증상 A의 진짜 원인과 해결

원인을 추측 대신 패키지에서 직접 확인하기로 했다. @testing-library/jest-dom의 package.json exports를 보니 메인 진입점 외에 jest-globals, matchers, vitest, bun 같은 여러 서브 진입점이 있었고, 각 진입점의 타입 파일이 augment하는 모듈이 달랐다. node_modules의 types 디렉토리를 grep하니 jest-globals.d.ts는 declare module '@jest/expect'를, vitest.d.ts는 declare module 'vitest'를, bun.d.ts는 declare module 'bun:test'를 확장하고 있었다. 메인 진입점은 전역 expect를 확장하지만, @jest/globals가 내부적으로 쓰는 expect의 타입인 @jest/expect는 jest-globals 진입점만 확장한다. 우리 테스트는 expect를 @jest/globals에서 import하므로 그 expect의 타입은 @jest/expect의 Matchers였고, 에러 메시지에 찍힌 Matchers<void, HTMLElement> 형태가 바로 그것이었다. 그런데 우리는 메인 진입점만 로드하고 있었으니 @jest/expect는 끝까지 확장되지 않아 toBeInTheDocument가 붙지 못했던 것이다.

해결은 jest-globals 전용 진입점을 쓰는 것이었다. jest.setup.ts의 import를 import "@testing-library/jest-dom/jest-globals"로 바꾸고, 매처를 쓰는 컴포넌트 테스트 파일 상단에도 같은 import를 직접 넣었다. setup만으로도 tsconfig.test.json 컨텍스트에서는 augment가 전파되어 통과했지만, 에디터가 테스트 설정을 못 잡고 다른 프로젝트로 fallback하는 경우까지 확실히 덮기 위해 테스트 파일이 직접 import하도록 했다. 파이프 없이 확인하니 tsconfig.test.json 단독 종료코드가 0으로 바뀌었고, 이번에는 신뢰할 수 있는 0이었다. 중간에 시도했던 우회들, 즉 tsconfig.app.json의 types에 jest나 jest-dom을 넣는 것, exclude를 풀어 app이 테스트를 컴파일하게 하는 것은 모두 되돌렸다. 특히 types 배열에 jest 즉 @types/jest를 넣으면 @jest/expect 확장과 더 충돌해 오히려 방해가 됨도 이 과정에서 확인했다.


6. 증상 B의 발견과 분석

증상 A를 정리하자 곧이어 두 번째 증상이 드러났다. 컴포넌트 .tsx 파일에서 'React'는 UMD 전역을 참조하지만 현재 파일은 모듈입니다라는 에러가 에디터에 떴다. 이 에러는 React 17 이상의 automatic JSX 변환을 쓰면 import React 없이 JSX를 쓸 수 있는데, 컴파일러가 그 변환 설정을 모를 때 JSX를 옛 방식으로 해석하면서 React를 전역에서 찾기 때문에 발생한다. 우리 tsconfig.app.json에는 jsx가 react-jsx로 설정되어 있어 automatic 변환이 적용되고, 실제로 파이프 없이 확인한 tsc 빌드는 이 에러 없이 통과했다. 따라서 이것도 코드 문제가 아니라 에디터가 그 파일에 jsx 설정이 없는 프로젝트를 적용한 결과라고 판단했다.

여기서 두 증상이 사실 하나의 뿌리임이 분명해졌다. 원인은 루트 tsconfig.json이 files를 빈 배열로 두고 references만 가진 솔루션 스타일이었다. tsc -b는 references를 따라 빌드하지만, 에디터의 TypeScript 서버는 referenced 프로젝트들이 composite로 표시되어 있어야만 파일을 그 프로젝트로 라우팅한다. composite가 없으니 서버는 어떤 파일도 app이나 test 프로젝트에 배정하지 못하고, 설정이 비어 있는 추론 프로젝트로 처리했다. 그 추론 프로젝트에는 jsx 설정도 없고 jest-dom 타입도 없으니, 같은 파일에서 React UMD 에러와 toBeInTheDocument 에러가 함께 났던 것이다. 증상 A에서 파일 직접 import로 jest-dom을 부분적으로 가렸던 것과 달리, 증상 B는 jsx 설정 자체가 빠진 문제라 import로 가릴 수 없었다.


7. 증상 B 해결을 위한 시도와 최종 해결

가설은 composite를 켜서 references를 정상화하면 에디터가 라우팅을 제대로 하리라는 것이었다. 그래서 tsconfig.app.json, tsconfig.node.json, tsconfig.test.json에 composite를 true로 추가하고 빌드를 돌렸다. 결과는 실패였다. 파이프 없이 확인한 tsc -b 종료코드는 2였고 여러 에러가 났다. TS4058은 useCart와 useCartMutations의 반환 타입이 외부 모듈의 UseQueryResult, UseMutationResult를 사용하는데 이름 지을 수 없다는 것이었다. composite가 declaration 산출을 전제하기 때문에 반환 타입을 명명할 수 있어야 하는데 그 인터페이스들이 export되지 않아 생긴 문제였다. TS6307은 jest.setup.ts가 src/mocks/server.ts를 import하는데 그 파일이 test 프로젝트의 파일 목록에 없다는 것으로, composite의 엄격한 파일 멤버십 규칙과 멀티 프로젝트 간 참조가 충돌한 것이다. 게다가 composite는 emit을 전제하는데 이 프로젝트는 vite 기반이라 noEmit이어서 may not disable emit 류의 충돌도 잠재해 있었다. vite 템플릿이 composite 없이 references만 쓰는 이유가 바로 이것이다. composite는 이 구조에 맞지 않는다고 판단해 전부 되돌렸고, 되돌린 뒤 빌드는 다시 0으로 통과했다.

방향을 바꿔, 루트 tsconfig.json 자체를 솔루션이 아니라 src를 직접 포함하는 실제 프로젝트로 만들기로 했다. 처음에는 tsconfig.app.json을 extends하고 include를 src로, exclude를 빈 배열로 두며 references로 node를 가리키는 형태로 작성했다. 그러나 이제 tsconfig.json이 실제 파일을 가진 프로젝트가 되자 references 규칙이 엄격히 적용되어, node를 참조하려면 node가 composite여야 하고 emit을 해야 한다는 TS6306, TS6310 에러가 났다. vite.config 전용인 node 참조는 빌드 파이프라인에서 빼도 무방하다고 보고 references를 제거했다. 그러자 또 다른 에러가 드러났는데, vite 데모 잔재인 App.test.tsx가 전역 test와 expect를 쓰고 있어 통합 프로젝트에서 이름을 찾을 수 없다는 TS2593, TS2304가 난 것이다. 다른 테스트들과 마찬가지로 @jest/globals에서 test와 expect를 import하고 @testing-library/jest-dom/jest-globals를 추가하는 우리 컨벤션으로 그 파일을 맞췄다.

이로써 최종 형태가 완성됐다. 루트 tsconfig.json은 tsconfig.app.json을 extends하고 include를 src로, exclude를 빈 배열로 둔 단일 실제 프로젝트가 되었다. 이렇게 하니 에디터의 TypeScript 서버가 tsconfig.json을 그대로 적용해 모든 .tsx 파일, 즉 컴포넌트와 테스트 모두에 jsx react-jsx와 타입을 부여했고, 추론 프로젝트로 떨어지는 일이 사라졌다. 결과적으로 React UMD 에러와 jest-dom 매처 에러가 동시에 해소되었다.


8. 검증 결과

모든 검증은 셸 파이프 없이 종료코드를 직접 읽어 수행했다. tsconfig.json을 대상으로 한 npx tsc -p tsconfig.json --noEmit은 종료코드 0이었다. npm run build는 내부적으로 tsc -b와 vite build를 실행하는데 종료코드 0으로, 타입체크와 번들링이 모두 성공했다. npm run lint도 0이었고, jest는 15개 스위트의 53개 테스트가 전부 통과했다. 즉 빌드, 타입, 린트, 테스트가 모두 정상이며 에디터의 두 빨간 줄도 근본적으로 제거되었다. 다만 이 구조에서는 루트가 더 이상 tsconfig.node.json을 참조하지 않으므로 vite.config.ts의 타입체크가 빌드 파이프라인에서 빠지는데, 이는 vite가 실행 시점에 검증하고 eslint도 일부 커버하므로 수용 가능한 트레이드오프로 판단했다.


9. 교훈과 일반화

첫째이자 가장 뼈아픈 교훈은, 종료코드를 볼 때 tsc 출력을 head 같은 명령으로 파이프한 뒤 $?를 읽지 말라는 것이다. 파이프라인의 $?는 마지막 명령의 것이라 앞단의 실패가 가려진다. 종료코드가 중요하면 파이프 없이 명령을 그대로 실행하고 바로 $?를 읽거나, 출력을 파일로 리다이렉트한 뒤 따로 확인해야 한다. 이 함정 하나가 한참 동안 잘못된 결론에 머물게 했다.

둘째, 라이브러리가 매처를 확장할 때는 어떤 expect를 확장하는지가 결정적이다. 전역 expect를 쓰는지 @jest/globals에서 import한 expect를 쓰는지에 따라 필요한 진입점이 다르며, 후자라면 반드시 @testing-library/jest-dom/jest-globals를 써야 한다. 에러에 찍힌 타입 이름, 여기서는 @jest/expect 계열의 Matchers를 보고 어느 expect 계열인지 역추적했어야 했다.

셋째, 라이브러리 통합 문제는 추측보다 패키지를 직접 여는 것이 빠르다. package.json의 exports로 진입점 구조를 파악하고 types 디렉토리의 declare module 선언으로 무엇을 확장하는지 확인하면 답이 그 안에 있다. 우리도 결국 node_modules에서 declare module '@jest/expect'를 발견하고서야 길을 찾았다.

넷째, 에디터에서만 나는 타입 오류와 터미널 빌드 통과가 공존하면, 그것은 코드가 아니라 에디터가 어떤 tsconfig를 적용하는지의 문제일 가능성이 높다. 특히 솔루션 스타일 references 구조는 composite가 없으면 언어 서버가 파일을 추론 프로젝트로 떨어뜨려 jsx와 types가 모두 빠지므로, React UMD 전역 오류와 매처 오류가 동시에 날 수 있다. 이때 composite를 켜는 정공법은 vite의 noEmit 구조와 충돌하기 쉬우므로, 루트 tsconfig.json이 src를 직접 include하는 실제 프로젝트가 되도록 만드는 편이 현실적이다.

다섯째, 증상을 가리는 변경과 원인을 고치는 변경을 구분해야 한다. 매처를 다른 매처로 바꿔 빨간 줄이 사라지는 것은 진단 정보일 뿐 해결이 아니며, 특히 getByText처럼 실패 시 예외를 던지는 쿼리 뒤의 존재 단언은 매처를 회피하는 순간 의미를 잃는다. import React를 넣어 UMD 오류를 가리는 것도 automatic JSX에서는 불필요하고 noUnusedLocals와 충돌할 수 있는 회피책이다.

여섯째, swc 트랜스폼 환경에서 expect.extend(import * as matchers)는 interop이 끼워 넣는 default 키 때문에 깨지므로 쓰지 않는다. 이 환경에서는 부수효과 import 또는 전용 진입점 import 방식을 택해야 한다.

마지막으로, 디버깅 도중 작업 디렉토리가 의도치 않게 상위로 바뀐 채 명령을 돌려 엉뚱한 패키지가 설치되거나 전체 node_modules가 스캔되는 혼선이 한 번 있었다. 이는 본 문제와 무관한 별개의 디렉토리 착오였으니, 여러 증상이 겹칠 때는 각 증상의 출처를 분리해서 보아야 한다.


10. 부록: 최종 변경 파일 목록

jest.setup.ts에서 import 대상을 메인 진입점에서 @testing-library/jest-dom/jest-globals로 변경했다. 컴포넌트 테스트인 ErrorMessage.test.tsx, Spinner.test.tsx와 App.test.tsx 상단에 @testing-library/jest-dom/jest-globals import를 추가했으며, App.test.tsx는 전역 test, expect 사용을 @jest/globals import로 통일했다. 루트 tsconfig.json은 files와 references로 구성된 솔루션 스타일에서 tsconfig.app.json을 extends하고 src를 include하며 exclude를 빈 배열로 둔 실제 프로젝트로 전환했다. tsconfig.app.json은 추적 과정에서 임시로 넣었던 jest-dom, jest 타입과 exclude 변경, composite 추가를 모두 되돌려 원래 형태로 복원했다. tsconfig.node.json과 tsconfig.test.json도 임시로 추가했던 composite를 제거했다.
