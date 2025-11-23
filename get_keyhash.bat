@echo off
echo 키 해시 생성 중...
echo.

REM debug keystore 경로 (일반적인 위치)
set DEBUG_KEYSTORE=%USERPROFILE%\.android\debug.keystore
set KEYSTORE_PASSWORD=android
set KEY_ALIAS=androiddebugkey

echo Debug keystore 경로: %DEBUG_KEYSTORE%
echo.

REM 키 해시 생성
keytool -exportcert -alias %KEY_ALIAS% -keystore %DEBUG_KEYSTORE% -storepass %KEYSTORE_PASSWORD% | openssl sha1 -binary | openssl base64

echo.
echo 위의 키 해시를 카카오 개발자 콘솔에 등록하세요.
pause
