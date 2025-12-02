/**
 * Apple Sign in with Apple JWT 생성 스크립트
 * 
 * 사용 방법:
 * 1. Key 파일(.p8)을 scripts 폴더에 저장 (예: AuthKey_C3ZVH98F9B.p8)
 * 2. npm install jsonwebtoken (또는 yarn add jsonwebtoken)
 * 3. node scripts/generate-apple-jwt.js
 */

import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 설정 값 (사용자의 정보로 변경)
const TEAM_ID = '2ZUHMYMMV4';
const KEY_ID = 'C3ZVH98F9B';
const SERVICE_ID = 'com.mompick.app.signin'; // Service ID
const KEY_FILE_NAME = 'AuthKey_C3ZVH98F9B.p8'; // Key 파일 이름

// Key 파일 경로
const keyFilePath = path.join(__dirname, KEY_FILE_NAME);

// Key 파일 존재 확인
if (!fs.existsSync(keyFilePath)) {
  console.error('❌ Key 파일을 찾을 수 없습니다!');
  console.error(`경로: ${keyFilePath}`);
  console.error('\n📝 Key 파일 다운로드 방법:');
  console.error('1. Apple Developer Portal > Keys 섹션 이동');
  console.error(`2. Key ID: ${KEY_ID} 클릭`);
  console.error('3. Key 파일(.p8) 다운로드');
  console.error(`4. 다운로드한 파일을 ${keyFilePath} 경로에 저장`);
  process.exit(1);
}

try {
  // Key 파일 읽기
  const privateKey = fs.readFileSync(keyFilePath, 'utf8');

  // JWT 생성
  const token = jwt.sign(
    {
      iss: TEAM_ID,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 180, // 6개월 유효
      aud: 'https://appleid.apple.com',
      sub: SERVICE_ID
    },
    privateKey,
    {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: KEY_ID
      }
    }
  );

  console.log('\n✅ JWT 생성 성공!\n');
  console.log('='.repeat(80));
  console.log('📋 Supabase Secret Key에 아래 값을 복사하여 붙여넣으세요:\n');
  console.log(token);
  console.log('\n' + '='.repeat(80));
  console.log('\n⚠️  이 JWT는 6개월간 유효합니다.');
  console.log('⚠️  만료되면 이 스크립트를 다시 실행하여 새 JWT를 생성하세요.\n');

} catch (error) {
  console.error('❌ JWT 생성 실패:', error.message);
  console.error('\n확인 사항:');
  console.error('1. Key 파일이 올바른 경로에 있는지 확인');
  console.error('2. Key 파일이 손상되지 않았는지 확인');
  console.error('3. TEAM_ID, KEY_ID, SERVICE_ID가 올바른지 확인');
  process.exit(1);
}

