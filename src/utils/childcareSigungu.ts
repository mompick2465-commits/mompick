// 시군구 조회 (cpmsapi020) FE 유틸

export interface SigunguItem {
  sidoname: string
  sigunname: string
  arcode: string
}

/**
 * 시군구 목록 조회 (시도명으로 필터)
 * @param arname 시도명 (예: '서울특별시')
 */
export async function fetchSigunguList(arname: string): Promise<SigunguItem[]> {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
  if (!supabaseUrl) throw new Error('Supabase URL이 설정되지 않았습니다.')

  const functionUrl = `${supabaseUrl}/functions/v1/childcare-sigungu`

  const resp = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ action: 'list', arname })
  })

  if (!resp.ok) throw new Error(`시군구 조회 실패: ${resp.status}`)
  const data = await resp.json()
  if (data.error) throw new Error(data.error)
  return (data.data || []) as SigunguItem[]
}


