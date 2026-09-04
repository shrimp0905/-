# SECRET TALK v6

비밀 메시지를 위한 1:1 P2P 메신저입니다.

## 이번 버전에서 수정한 핵심 버그

### 1. 음식 추천
이전 버전은 선택한 음식 종류를 무시하고 전체 음식 배열에서 랜덤으로 뽑았습니다.
이 버전은 다음 조건을 **실제로 필터링**합니다.

- 한식 / 중식 / 일식 / 양식 / 분식
- 안 매운 것 / 살짝 매운 것 / 매운 것
- 1만원 이하 / 2만원 이하 / 2만원 이상

예: `중식 + 안 매운 것`을 고르면 파스타 같은 양식이 나오지 않습니다.

### 2. 닫기 버튼
이전 버전에서 `close()`라는 함수 이름이 브라우저 전역 함수와 충돌할 가능성을 제거했습니다.
모달은 `closeModal()`로만 닫습니다.
모달 바깥을 눌러도 닫을 수 있습니다.

### 3. 연결 문제
- Render에서 사용할 수 있도록 `0.0.0.0`에 서버를 바인딩
- HTTPS면 자동으로 `wss://`, HTTP면 `ws://` 사용
- ICE candidate가 remote description보다 먼저 오는 경우 임시 보관 후 적용
- STUN 서버 2개 사용
- WebRTC 연결 실패 시 재연결 시도
- WebSocket 연결 상태 표시
- 친구 입장 전/후 상태 표시

### 4. 방 관리
- 새 방 생성
- 방 코드 자동 생성
- 방 비밀번호
- 방 나가기
- 같은 방 닉네임 중복 방지
- 2인 방
- 마지막 사용자가 나가면 서버 메모리의 방 제거

## 기록이 남지 않는 구조

- 채팅 DB 없음
- 서버에 채팅 메시지 저장 없음
- 서버에 파일 저장 없음
- localStorage/sessionStorage에 채팅 저장 없음
- 서버 로그에 채팅 내용을 출력하지 않음
- HTTP 페이지 응답은 no-store
- 새로고침/방 나가기 시 화면의 채팅이 사라짐

실제 메시지와 파일은 WebRTC DataChannel로 브라우저 간 전송됩니다.
WebSocket 서버는 방 입장과 WebRTC signaling만 전달합니다.

## 한계

상대방이 캡처, 복사, 다운로드하는 것을 웹앱이 막을 수는 없습니다.
또한 브라우저/OS/네트워크 자체의 로그까지 이 앱이 통제할 수는 없습니다.

## 실행

```bash
npm install
npm start
```

브라우저:
`http://localhost:3000`

## Render 배포

- Service: Web Service
- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`
- Root Directory: 비워둠
- Branch: main
