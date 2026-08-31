# Cheat Arena — GitHub Pages Client

GitHub Pages에 올릴 **클라이언트 전체 코드**입니다.

## 바로 되는 기능

- AI 3v3
- Windows / macOS / Linux 키보드+마우스 UI
- Android / iOS / iPadOS 터치 UI
- iPadOS의 데스크톱형 User-Agent 감지
- safe-area 대응
- 상단 무기 선택 HUD
- AR / Pistol / Knife 즉시 전환
- AIMBOT / ESP 게임 내 기능
- 기본 설정 메뉴
- Kill Feed / K-D / 점수 HUD
- Render WebSocket 서버 연결용 코드 사전 포함

## GitHub Pages 배포

압축을 푼 뒤 저장소 루트가 아래처럼 되게 올리면 됩니다.

```text
index.html
css/
  style.css
js/
  config.js
  platform.js
  net.js
  game.js
.nojekyll
README.md
```

GitHub Pages Source를 `main / root`로 설정하면 됩니다.

## Render 서버를 나중에 연결하는 방법

`js/config.js`의:

```js
SERVER_URL: ""
```

를 Render에서 발급받은 WebSocket 주소로 바꿉니다.

예:

```js
SERVER_URL: "wss://cheat-arena-server.onrender.com"
```

현재 `net.js`에는 이미 다음 메시지 구조가 준비되어 있습니다.

- `hello`
- `queue_join`
- `player_state`
- `welcome`
- `match_found`
- `snapshot`
- `disconnect`

서버 코드를 만들 때 이 프로토콜에 맞춰 이어 붙이면 됩니다.

## PC 조작

- WASD: 이동
- 마우스: 시점
- 좌클릭: 사격
- 1 / 2 / 3: AR / 권총 / 칼
- R: 재장전
- F1: AIMBOT
- F2: ESP

## 모바일 / 태블릿

- 왼쪽 스틱: 이동
- 오른쪽 스틱: 시점
- FIRE: 공격
- R: 재장전
- AIM / ESP
- 화면 상단 무기 HUD 터치로 즉시 교체

AIMBOT과 ESP는 이 게임 내부 엔티티에만 작동하는 정식 게임 메커니즘입니다.
