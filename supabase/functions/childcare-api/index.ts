// @ts-ignore - Deno 환경에서 실행됨
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // CORS preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, arcode } = await req.json()

    if (action === 'fetch') {
      if (!arcode) {
        throw new Error('시군구코드(arcode)가 필요합니다.')
      }

      // 전국어린이집 포털 API 호출
      const apiUrl = `http://api.childcare.go.kr/mediate/rest/cpmsapi021/cpmsapi021/request?key=0e5ed5cfc4c24c2fa8e2cd14558a1688&arcode=${arcode}`
      
      console.log('어린이집 API 호출:', apiUrl)
      console.log('시군구코드:', arcode)
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml, */*'
        }
      })

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`)
      }

      const xmlText = await response.text()
      console.log('API 응답 (XML):', xmlText)
      console.log('XML 길이:', xmlText.length)
      console.log('응답 상태:', response.status)

      // XML을 JSON으로 변환
      const data = parseXmlToJson(xmlText)
      console.log('파싱된 데이터:', JSON.stringify(data, null, 2))

      // API 응답 구조 확인
      if (data && data.response) {
        // 에러 응답 확인
        if (data.response.errcode && data.response.errcode !== '0') {
          throw new Error(`API 오류: ${data.response.errmsg || '알 수 없는 오류'}`)
        }
        
        // 성공 응답 처리 - item 배열 확인
        if (data.response.item) {
          const items = Array.isArray(data.response.item) ? data.response.item : [data.response.item]
          console.log('파싱된 어린이집 데이터 개수:', items.length)
          
          // 데이터 변환 (API 응답 형식에 맞게)
          const transformedItems = items.map(item => ({
            stcode: item.stcode || '',
            crname: item.crname || '',
            crtelno: item.crtel || '',
            crfaxno: item.crfax || '',
            craddr: item.craddr || '',
            crhome: item.crhome || '',
            crcapat: parseInt(item.crcapat) || 0,
            arcode: item.arcode || arcode,
            frstcnfmdt: item.frstcnfmdt || ''
          }))
          
          return new Response(
            JSON.stringify({
              success: true,
              data: transformedItems,
              count: transformedItems.length
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          )
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: [],
          count: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    throw new Error('지원하지 않는 액션입니다.')

  } catch (error) {
    console.error('어린이집 API 오류:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// XML을 JSON으로 변환하는 함수 (Deno 환경용)
function parseXmlToJson(xmlText: string): any {
  try {
    console.log('XML 파싱 시작:', xmlText.substring(0, 200) + '...')
    
    // 정규식을 사용한 간단한 XML 파싱
    const result: any = {}
    
    // response 태그 찾기
    const responseMatch = xmlText.match(/<response>(.*?)<\/response>/s)
    if (!responseMatch) {
      console.log('response 태그를 찾을 수 없습니다')
      return {}
    }
    
    const responseContent = responseMatch[1]
    console.log('response 내용:', responseContent.substring(0, 200) + '...')
    
    // item 태그들 찾기
    const itemMatches = responseContent.match(/<item>(.*?)<\/item>/gs)
    if (!itemMatches || itemMatches.length === 0) {
      console.log('item 태그를 찾을 수 없습니다')
      return { response: { item: [] } }
    }
    
    console.log('찾은 item 개수:', itemMatches.length)
    
    const items = itemMatches.map(itemXml => {
      const item: any = {}
      
      // 각 필드 추출
      const fields = ['stcode', 'crname', 'crtel', 'crfax', 'craddr', 'crhome', 'crcapat', 'arcode', 'frstcnfmdt']
      
      fields.forEach(field => {
        const regex = new RegExp(`<${field}>(.*?)<\/${field}>`, 's')
        const match = itemXml.match(regex)
        if (match) {
          item[field] = match[1].trim()
        }
      })
      
      console.log('파싱된 item:', item)
      return item
    })
    
    result.response = { item: items }
    console.log('최종 파싱 결과:', JSON.stringify(result, null, 2))
    
    return result
  } catch (error) {
    console.error('XML 파싱 오류:', error)
    return {}
  }
}
