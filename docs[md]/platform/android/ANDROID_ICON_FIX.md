# Android 아이콘 적용 가이드

## 문제 해결 방법

### 1. 앱 아이콘 적용 확인

아이콘이 제대로 적용되지 않으면 다음 단계를 따르세요:

#### 방법 1: Android Studio에서 Clean & Rebuild
1. Android Studio 열기
2. `Build` > `Clean Project` 실행
3. `Build` > `Rebuild Project` 실행
4. 앱 재설치 (기존 앱 삭제 후 설치)

#### 방법 2: Gradle 명령어 사용
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

#### 방법 3: 캐시 삭제
```bash
cd android
./gradlew clean
rm -rf app/build
rm -rf .gradle
```

### 2. FCM 알림 아이콘 설정

FCM 알림에 앱 아이콘이 표시되도록 설정했습니다:
- Edge Function에서 `icon: 'ic_launcher'` 설정 추가
- 알림 색상: `#fb8678` (맘픽 브랜드 컬러)

### 3. 알림 아이콘 커스터마이징 (선택사항)

더 나은 알림 아이콘을 원하면:

1. **흰색 알림 아이콘 생성** (투명 배경, 24x24dp)
   - `android/app/src/main/res/drawable/ic_notification.png` 생성
   - 흰색 아이콘, 투명 배경

2. **Edge Function 수정**
   ```typescript
   icon: 'ic_notification' // 커스텀 아이콘 사용
   ```

### 4. 확인 사항

- ✅ `android/app/src/main/res/mipmap-*/ic_launcher.png` 파일들이 업데이트되었는지 확인
- ✅ `android/app/src/main/res/mipmap-*/ic_launcher_round.png` 파일들이 업데이트되었는지 확인
- ✅ AndroidManifest.xml에서 `android:icon="@mipmap/ic_launcher"` 설정 확인

### 5. 테스트

1. 앱 완전 삭제
2. 새로 빌드 및 설치
3. 앱 아이콘 확인
4. FCM 알림 수신 시 알림 아이콘 확인

