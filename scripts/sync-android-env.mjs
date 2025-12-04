#!/usr/bin/env node
/**
 * .env 파일에서 환경변수를 읽어와서 android/gradle.properties에 동기화하는 스크립트
 * Android 빌드 전에 이 스크립트를 실행하여 카카오맵 네이티브 키를 동기화합니다.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// .env 파일 경로
const envPath = path.join(__dirname, '..', '.env')
const gradlePropertiesPath = path.join(__dirname, '..', 'android', 'gradle.properties')

// .env 파일 읽기
function readEnvFile() {
  if (!fs.existsSync(envPath)) {
    console.warn('⚠️  .env 파일을 찾을 수 없습니다:', envPath)
    return {}
  }

  const envContent = fs.readFileSync(envPath, 'utf-8')
  const envVars = {}

  envContent.split('\n').forEach(line => {
    line = line.trim()
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim()
        // 따옴표 제거
        envVars[key.trim()] = value.replace(/^["']|["']$/g, '')
      }
    }
  })

  return envVars
}

// gradle.properties 파일 읽기 및 업데이트
function updateGradleProperties(envVars) {
  if (!fs.existsSync(gradlePropertiesPath)) {
    console.error('❌ gradle.properties 파일을 찾을 수 없습니다:', gradlePropertiesPath)
    process.exit(1)
  }

  let gradleContent = fs.readFileSync(gradlePropertiesPath, 'utf-8')
  const lines = gradleContent.split('\n')
  let updated = false

  // KAKAO_MAP_NATIVE_KEY 찾아서 업데이트
  const keyToSync = 'KAKAO_MAP_NATIVE_KEY'
  const envValue = envVars[keyToSync]

  if (envValue) {
    // 기존 라인 찾기
    const keyIndex = lines.findIndex(line => 
      line.trim().startsWith(keyToSync) && !line.trim().startsWith('#')
    )

    if (keyIndex !== -1) {
      // 기존 값과 다르면 업데이트
      const oldLine = lines[keyIndex]
      const newLine = `${keyToSync}=${envValue}`
      
      if (oldLine !== newLine) {
        lines[keyIndex] = newLine
        updated = true
        console.log(`✅ ${keyToSync} 업데이트됨: ${envValue.substring(0, 8)}...`)
      } else {
        console.log(`✓ ${keyToSync} 이미 최신 상태입니다`)
      }
    } else {
      // 키가 없으면 추가
      lines.push(`# 카카오맵 네이티브 앱 키 (자동 동기화됨)`)
      lines.push(`${keyToSync}=${envValue}`)
      updated = true
      console.log(`✅ ${keyToSync} 추가됨: ${envValue.substring(0, 8)}...`)
    }
  } else {
    console.warn(`⚠️  .env 파일에 ${keyToSync}가 없습니다`)
  }

  if (updated) {
    fs.writeFileSync(gradlePropertiesPath, lines.join('\n'), 'utf-8')
    console.log('📝 gradle.properties 파일이 업데이트되었습니다')
  }

  return updated
}

// 메인 실행
function main() {
  console.log('🔄 Android 환경변수 동기화 시작...')
  
  const envVars = readEnvFile()
  updateGradleProperties(envVars)
  
  console.log('✅ 동기화 완료!')
}

// 직접 실행 시
main()

export { readEnvFile, updateGradleProperties }

