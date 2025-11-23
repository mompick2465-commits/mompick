const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 원본 아이콘 파일 경로 (build 폴더 우선, 없으면 public 폴더 확인)
const buildIcon = path.join(__dirname, '../build/androidicon.png');
const publicIcon = path.join(__dirname, '../public/androidicon.png');
const sourceIcon = fs.existsSync(buildIcon) ? buildIcon : publicIcon;

// 각 해상도별 설정 (밀도별 크기)
const mipmapConfigs = [
  { folder: 'android/app/src/main/res/mipmap-mdpi', size: 48 },
  { folder: 'android/app/src/main/res/mipmap-hdpi', size: 72 },
  { folder: 'android/app/src/main/res/mipmap-xhdpi', size: 96 },
  { folder: 'android/app/src/main/res/mipmap-xxhdpi', size: 144 },
  { folder: 'android/app/src/main/res/mipmap-xxxhdpi', size: 192 }
];

// 원본 파일이 존재하는지 확인
if (!fs.existsSync(sourceIcon)) {
  console.error(`❌ 원본 아이콘 파일을 찾을 수 없습니다: ${sourceIcon}`);
  process.exit(1);
}

console.log('📱 Android 앱 아이콘 업데이트 시작...\n');
console.log(`📁 원본 파일: ${sourceIcon}\n`);

// 각 mipmap 폴더에 아이콘 리사이즈하여 복사
async function updateIcons() {
  for (const config of mipmapConfigs) {
    const folderPath = path.join(__dirname, '..', config.folder);
    
    if (!fs.existsSync(folderPath)) {
      console.warn(`⚠️  폴더가 존재하지 않습니다: ${config.folder}`);
      continue;
    }

    try {
      // ic_launcher.png 리사이즈하여 저장
      const destIcon = path.join(folderPath, 'ic_launcher.png');
      await sharp(sourceIcon)
        .resize(config.size, config.size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .toFile(destIcon);
      console.log(`✅ ${config.folder}/ic_launcher.png 업데이트 완료 (${config.size}x${config.size}px)`);

      // ic_launcher_round.png도 리사이즈하여 저장
      const destIconRound = path.join(folderPath, 'ic_launcher_round.png');
      await sharp(sourceIcon)
        .resize(config.size, config.size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .toFile(destIconRound);
      console.log(`✅ ${config.folder}/ic_launcher_round.png 업데이트 완료 (${config.size}x${config.size}px)`);

      // ic_launcher_foreground.png도 리사이즈하여 저장 (Adaptive Icon용)
      // Adaptive Icon foreground는 전체 108dp 중 중앙 72dp만 표시되므로
      // 아이콘을 적절한 크기로 만들어서 중앙에 배치 (전체의 약 65% 크기로 조정)
      const canvasSize = Math.round(config.size * 2.25); // 48 * 2.25 = 108, 72 * 2.25 = 162 등
      const iconSize = Math.round(canvasSize * 0.65); // 중앙에 배치하기 위해 적절한 크기 (55% -> 65%)
      const destForeground = path.join(folderPath, 'ic_launcher_foreground.png');
      
      // 투명 배경에 아이콘을 중앙에 배치
      const iconBuffer = await sharp(sourceIcon)
        .resize(iconSize, iconSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer();
      
      await sharp({
        create: {
          width: canvasSize,
          height: canvasSize,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 } // 투명 배경
        }
      })
      .composite([{
        input: iconBuffer,
        left: Math.round((canvasSize - iconSize) / 2),
        top: Math.round((canvasSize - iconSize) / 2)
      }])
      .png()
      .toFile(destForeground);
      console.log(`✅ ${config.folder}/ic_launcher_foreground.png 업데이트 완료 (캔버스: ${canvasSize}x${canvasSize}px, 아이콘: ${iconSize}x${iconSize}px)`);
    } catch (error) {
      console.error(`❌ ${config.folder} 처리 중 오류:`, error.message);
    }
  }
}

updateIcons().then(() => {
  console.log('\n✨ Android 앱 아이콘 업데이트 완료!');
  console.log('\n💡 Android Studio에서 다시 빌드하면 새로운 아이콘이 적용됩니다.');
  console.log('   - Build > Clean Project');
  console.log('   - Build > Rebuild Project');
  console.log('   - 앱 완전 삭제 후 재설치');
  console.log('\n📝 참고: Adaptive Icon의 foreground는 중앙 72dp만 표시되므로');
  console.log('   아이콘을 65% 크기로 조정하여 적절한 크기로 보이도록 했습니다.');
}).catch(error => {
  console.error('❌ 오류 발생:', error);
  process.exit(1);
});





