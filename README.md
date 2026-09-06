# Cheat Arena — Integrated Combat Polish

포함된 기능
- AI 5v5 + 개선된 pathfinding AI
- Firebase Realtime Database 온라인 최대 10명 / 5v5
- 익명 로그인, 방 코드, 호스트 승계, 라운드 동기화
- 점프 / 웅크리기 / 수직 자유시점 / 사망 후 같은 팀 관전
- 생존 인원 HUD
- AI + 온라인 킬로그
- 무기별 발사감: 반동, 화면 충격, 총구화염, 탄피, 이동 bob
- 무기별 실제 재장전 시간 + 진행 표시 + 재장전 자세 변화
- 피격감: 방향 표시, 화면 충격, 저체력 vignette/heartbeat, hit/kill marker
- 원격 플레이어 총성 동기화
- 사운드: 외부 저작권 파일 없이 WebAudio로 자체 합성

Firebase 최초 설정
1. Authentication → Sign-in method → Anonymous 활성화
2. Realtime Database 생성
3. firebase-rtdb-rules.json 내용을 Database → Rules에 붙여넣고 게시
4. 게임 ONLINE 메뉴에서 Firebase 웹 앱 firebaseConfig를 붙여넣고 저장
5. 한 기기에서 방 만들기, 다른 기기에서 6자리 코드 참가

현재 Rules는 동아리/테스트용입니다.
