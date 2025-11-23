// @ts-ignore - Deno 환경에서 실행됨
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const contentType = req.headers.get('content-type') || ''
    let body: any = {}
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const form = await req.formData()
      body = Object.fromEntries(form.entries())
    }

    const { action, arname } = body

    if (action !== 'list') {
      throw new Error('지원하지 않는 액션입니다. action=list 사용')
    }
    if (!arname || typeof arname !== 'string') {
      throw new Error('시도명(arname)이 필요합니다.')
    }

    // 전국어린이집 포털 시군구 조회 API (cpmsapi020)
    // 개발키는 운영과 응답 포맷은 같으나 값이 더미(01, 02, ...)일 수 있음
    const key = Deno.env.get('CHILDCARE_SHIGUNGU_API_KEY')
    if (!key) {
      throw new Error('환경변수 CHILDCARE_SHIGUNGU_API_KEY 가 설정되지 않았습니다. Supabase secrets에 키를 등록해주세요.')
    }
    const apiUrl = `http://api.childcare.go.kr/mediate/rest/cpmsapi020/cpmsapi020/request?key=${encodeURIComponent(key)}&arname=${encodeURIComponent(arname)}`

    console.log('[cpmsapi020] 요청:', { arname, apiUrl })

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/xml, text/xml, */*' }
    })

    const xmlText = await response.text()
    if (!response.ok) {
      console.error('[cpmsapi020] 실패 상태:', response.status, response.statusText)
      return new Response(
        JSON.stringify({ success: false, error: `API 호출 실패: ${response.status}`, xmlResponse: xmlText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // XML -> JSON 파싱 (간단 파서)
    const data = parseSigunguXml(xmlText)
    const items = data.items || []

    return new Response(
      JSON.stringify({ success: true, data: items, count: items.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[childcare-sigungu] 오류:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// cpmsapi020 응답(XML)을 간단히 파싱해서 배열로 반환
function parseSigunguXml(xmlText: string): { items: Array<{ sidoname: string; sigunname: string; arcode: string }> } {
  try {
    const items: Array<{ sidoname: string; sigunname: string; arcode: string }> = []

    const responseMatch = xmlText.match(/<response>([\s\S]*?)<\/response>/)
    if (!responseMatch) {
      return { items }
    }
    const responseContent = responseMatch[1]

    const itemMatches = responseContent.match(/<item>([\s\S]*?)<\/item>/g) || []
    for (const itemXml of itemMatches) {
      const sidoname = matchTag(itemXml, 'sidoname') || ''
      const sigunname = matchTag(itemXml, 'sigunname') || ''
      const arcode = matchTag(itemXml, 'arcode') || ''
      items.push({ sidoname: sidoname.trim(), sigunname: sigunname.trim(), arcode: arcode.trim() })
    }

    return { items }
  } catch (e) {
    console.error('[cpmsapi020] XML 파싱 오류:', e)
    return { items: [] }
  }
}

function matchTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\/${tag}>`))
  return m ? m[1] : null
}


