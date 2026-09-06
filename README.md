# Cheat Arena Firebase Multiplayer

이 ZIP의 index.html은 Firebase Realtime Database 기반 온라인 멀티플레이가 실제로 동작하도록 연결되어 있습니다.

필수 Firebase 설정:
1. Firebase Console → Authentication → Sign-in method → Anonymous 활성화
2. Realtime Database 생성
3. `firebase-rtdb-rules.json` 내용을 Database → Rules에 붙여넣고 게시
4. 웹 앱의 `firebaseConfig`를 게임의 ONLINE → Firebase 설정 칸에 붙여넣고 저장
5. 방 만들기 → 다른 기기에서 6자리 방 코드로 참가

구조:
- 최대 10명, BLUE 5 / RED 5
- 2명부터 테스트 시작 가능
- 호스트가 라운드/맵/승패를 관리
- 각 클라이언트가 자신의 HP/이동 상태를 관리
- 공격자는 Firebase damage event를 보내고 피해자는 자기 HP에 적용
- 사망 후 살아있는 같은 팀 플레이어 관전
- 호스트가 나가면 가장 먼저 들어온 연결 플레이어가 호스트 승계

주의: 이 구조는 테스트용 클라이언트 권한 방식입니다. 공개 경쟁 서비스용 authoritative server는 아닙니다.
