# Android Studio 디바이스 연결 문제 해결

## 문제: Invalidate Caches 후 디바이스가 인식되지 않음

### 해결 방법

#### 1. USB 디버깅 확인
- 휴대폰에서 **USB 디버깅**이 활성화되어 있는지 확인
- 설정 > 개발자 옵션 > USB 디버깅 ON

#### 2. USB 연결 모드 확인
- USB 연결 모드가 **파일 전송** 또는 **MTP** 모드인지 확인
- 알림에서 USB 연결 옵션 확인

#### 3. USB 케이블 확인
- 다른 USB 케이블로 시도
- USB 2.0 포트 사용 (USB 3.0 포트는 때때로 문제 발생)

#### 4. ADB 재시작 (Android Studio 터미널에서)
```bash
adb kill-server
adb start-server
adb devices
```

#### 5. Android Studio에서 디바이스 새로고침
- `Tools` > `Device Manager` 열기
- 새로고침 버튼 클릭
- 또는 `Run` > `Select Device`에서 새로고침

#### 6. 휴대폰 재연결
- USB 케이블 분리
- 휴대폰 재부팅 (선택사항)
- USB 케이블 다시 연결
- "USB 디버깅 허용" 팝업이 나타나면 **허용** 클릭

#### 7. Android Studio 재시작
- Android Studio 완전 종료
- 다시 실행

#### 8. ADB 드라이버 재설치 (Windows)
- 장치 관리자에서 Android 디바이스 확인
- 드라이버 업데이트 또는 재설치

### 빠른 해결책

1. **USB 케이블 분리 후 다시 연결**
2. 휴대폰에서 **USB 디버깅 허용** 확인
3. Android Studio에서 `Tools` > `Device Manager` > 새로고침
4. `Run` 버튼 옆의 디바이스 선택 드롭다운에서 새로고침

### 무선 디버깅 사용 (Android 11+)

USB 연결이 계속 문제가 되면 무선 디버깅 사용:

1. 휴대폰: 설정 > 개발자 옵션 > 무선 디버깅 ON
2. 무선 디버깅 > 페어링 코드 사용
3. Android Studio: `Tools` > `Device Manager` > `Pair Device Using Wi-Fi`
4. IP 주소와 포트 입력

