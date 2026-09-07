# Cheat Arena — Firebase Ready

Firebase web config is embedded in index.html.
ONLINE 메뉴에서 닉네임만 입력하고 방 만들기/참가를 누르면 됩니다.

필수 Firebase 설정
- Authentication → Anonymous 활성화
- Realtime Database 생성
- firebase-rtdb-rules.json 내용을 Realtime Database Rules에 적용

서비스 계정/private key는 포함하지 않았습니다.
