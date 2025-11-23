// Deno 환경에서 실행되는 Edge Function
// @ts-ignore - Deno 환경에서 실행됨
declare const Deno: any

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  // CORS preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Edge Function 시작 - 요청 메소드:', req.method)
    
    // 요청 본문 파싱
    const requestBody = await req.json()
    console.log('🔍 Edge Function 파싱된 요청 본문:', JSON.stringify(requestBody, null, 2))
    
    const { stcode, arcode } = requestBody
    
    console.log('🔍 Edge Function 추출된 파라미터:', { stcode, arcode })

    // stcode 검증
    if (!stcode || stcode === 'unknown' || stcode === 'undefined' || stcode === 'error-occurred') {
      console.error('❌ stcode 검증 실패:', { stcode })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '어린이집코드(stcode)가 필요합니다.',
          received: { stcode, arcode }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // API 키 설정 - 반드시 환경변수에서만 사용 (하드코딩 금지)
    const API_KEY = Deno.env.get('CHILDCARE_DETAIL_API_KEY')
    if (!API_KEY) {
      console.error('❌ CHILDCARE_DETAIL_API_KEY 환경변수가 설정되지 않음')
      return new Response(
        JSON.stringify({ success: false, error: '서버 환경에 CHILDCARE_DETAIL_API_KEY가 설정되지 않았습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('🔍 API 키 확인: ✅ 존재함')
    
    // API URL 구성 - 명세 예제에 따라 stcode= 빈 값으로 포함
    const finalArcode = arcode && arcode.trim() !== '' ? arcode : '11260'
    const apiUrl = `http://api.childcare.go.kr/mediate/rest/cpmsapi030/cpmsapi030/request?key=${API_KEY}&arcode=${finalArcode}&stcode=${encodeURIComponent(stcode)}`
    
    console.log('🔍 최종 arcode 값:', finalArcode, '(타입:', typeof finalArcode, ')')
    console.log('🔍 찾을 crcode (stcode):', stcode, '(타입:', typeof stcode, ')')
    console.log('🔍 API 호출 URL:', apiUrl)
    console.log('🔍 사용설명서 확인: arcode=11260 (서울 중랑구)가 맞는지 확인')
    
    // 외부 API 호출
    const response = await fetch(apiUrl)
    console.log('🔍 API 응답 상태:', response.status, response.statusText)
    
    if (!response.ok) {
      console.error('❌ API 호출 실패:', response.status, response.statusText)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `외부 API 호출 실패: ${response.status} ${response.statusText}`,
          stcode: stcode,
          arcode: finalArcode
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    const xmlData = await response.text()
    console.log('🔍 API 응답 XML 길이:', xmlData.length)
    console.log('🔍 API 응답 XML 전체 길이:', xmlData.length)
    console.log('🔍 API 응답 XML 전체 내용:')
    console.log(xmlData)
    
    // 개선된 XML 파싱
    const parseXmlToJson = (xml: string) => {
      try {
        console.log('🔍 XML 파싱 시작, XML 길이:', xml.length)
        
        const items: any[] = []
        
        // API 명세에 따른 정확한 패턴 - <response><item>...</item></response>
        const itemPatterns = [
          /<item>([\s\S]*?)<\/item>/g,
          /<row>([\s\S]*?)<\/row>/g
        ]
        
        let foundItems = false
        
        for (const pattern of itemPatterns) {
          let match
          while ((match = pattern.exec(xml)) !== null) {
            foundItems = true
            const itemXml = match[1]
            const item: any = {}
            
            // 더 포괄적인 필드 추출
            const fieldRegex = /<([^>]+)>([\s\S]*?)<\/\1>/g
            let fieldMatch
            
            while ((fieldMatch = fieldRegex.exec(itemXml)) !== null) {
              const [, fieldName, fieldValue] = fieldMatch
              item[fieldName] = fieldValue.trim()
            }
            
            if (Object.keys(item).length > 0) {
              items.push(item)
            }
          }
          
          if (foundItems) break
        }
        
        // item 패턴이 없으면 전체 XML을 단일 객체로 파싱 시도
        if (!foundItems) {
          console.log('🔍 item 패턴을 찾지 못함, 전체 XML 파싱 시도')
          const item: any = {}
          const fieldRegex = /<([^>]+)>([\s\S]*?)<\/\1>/g
          let fieldMatch
          
          while ((fieldMatch = fieldRegex.exec(xml)) !== null) {
            const [, fieldName, fieldValue] = fieldMatch
            item[fieldName] = fieldValue.trim()
          }
          
          if (Object.keys(item).length > 0) {
            items.push(item)
          }
        }
        
        console.log('🔍 XML 파싱 완료, 추출된 아이템 수:', items.length)
        return items
      } catch (error) {
        console.error('❌ XML 파싱 오류:', error)
        return []
      }
    }
    
    const jsonData = parseXmlToJson(xmlData)
    console.log('🔍 파싱된 JSON 데이터 개수:', jsonData.length)
    if (jsonData.length > 0) {
      console.log('🔍 첫 번째 데이터 구조:', JSON.stringify(jsonData[0], null, 2))
      console.log('🔍 모든 데이터의 crcode/stcode 필드:', jsonData.map((item: any) => ({
        crcode: item.crcode,
        stcode: item.stcode,
        crname: item.crname,
        allFields: Object.keys(item)
      })))
      
      // 찾고자 하는 stcode가 있는지 확인
      const hasTargetStcode = jsonData.some((item: any) => {
        const itemCrcode = item.crcode || item.stcode
        return itemCrcode === stcode
      })
      console.log('🔍 찾고자 하는 stcode 존재 여부:', hasTargetStcode)
      
      if (!hasTargetStcode) {
        console.log('🔍 전체 XML 응답 샘플 (처음 1000자):', xmlData.substring(0, 1000))
      }
    }
    
    if (jsonData.length === 0) {
      console.error('❌ 파싱된 데이터가 없습니다')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '어린이집 정보를 찾을 수 없습니다.',
          stcode: stcode,
          arcode: finalArcode
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // API 명세에 따른 stcode 필드로 매칭
    const matchedChildcare = jsonData.find((item: any) => {
      const itemStcode = item.stcode
      console.log('🔍 비교 중:', itemStcode, 'vs', stcode, '어린이집명:', item.crname)
      
      if (itemStcode === stcode) {
        console.log('✅ 매칭 성공:', itemStcode, '어린이집명:', item.crname)
        return true
      }
      return false
    })
    
    if (!matchedChildcare) {
      console.error('❌ 매칭되는 어린이집을 찾을 수 없습니다:', stcode)
      
      // API 명세에 따른 stcode 필드 수집
      const availableStcodes = jsonData.map((item: any) => item.stcode).filter(Boolean)
      
      console.log('🔍 사용 가능한 stcode 목록:', availableStcodes)
      console.log('🔍 전체 데이터 샘플 (처음 5개):', jsonData.slice(0, 5).map(item => ({
        stcode: item.stcode,
        crname: item.crname,
        crtypename: item.crtypename,
        crstatusname: item.crstatusname
      })))
      
      // 실제로 받아온 1개 데이터의 전체 내용 출력
      if (jsonData.length > 0) {
        console.log('🔍 실제로 받아온 첫 번째 데이터 전체 내용:')
        console.log(JSON.stringify(jsonData[0], null, 2))
      }
      
      // 개발키 사용 중이므로 더미 데이터임을 알림
      console.log('⚠️ 개발키 사용 중: API에서 더미 데이터(01, 02, 03...)를 반환합니다.')
      console.log('💡 운영키를 사용해야 실제 어린이집 데이터를 받을 수 있습니다.')
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '해당 어린이집 정보를 찾을 수 없습니다.',
          stcode: stcode,
          arcode: finalArcode,
          availableStcodes: availableStcodes,
          totalCount: jsonData.length,
          xmlResponse: xmlData, // 전체 XML 응답을 클라이언트로 전달
          jsonData: jsonData, // 파싱된 JSON 데이터도 전달
          debugInfo: {
            apiUrl,
            xmlLength: xmlData.length,
            isDevelopmentKey: true,
            message: '개발키 사용 중 - 더미 데이터 반환됨'
          }
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log('✅ 매칭된 어린이집 찾음:', matchedChildcare.crname, matchedChildcare.crcode || matchedChildcare.stcode)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: matchedChildcare,
        stcode: stcode,
        arcode: finalArcode
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
    
  } catch (error) {
    console.error('❌ Edge Function 오류:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: '서버 내부 오류가 발생했습니다.',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
