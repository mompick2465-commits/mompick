import { supabase } from '../lib/supabase'

export type FavoriteTargetType = 'kindergarten' | 'childcare' | 'hospital' | 'playground'

export interface FavoriteMetadata {
  // 어린이집용
  arcode?: string
  // 유치원용
  sidoCode?: number | string
  sggCode?: number | string
}

export async function addFavorite(
  userId: string, 
  targetType: FavoriteTargetType, 
  targetId: string, 
  targetName?: string,
  metadata?: FavoriteMetadata
) {
  const insertData: any = {
    user_id: userId,
    target_type: targetType,
    target_id: targetId,
    target_name: targetName
  }

  // 메타데이터 추가
  if (metadata) {
    if (targetType === 'childcare' && metadata.arcode) {
      insertData.arcode = metadata.arcode
    } else if (targetType === 'kindergarten' || targetType === 'playground') {
      if (metadata.sidoCode !== undefined && metadata.sidoCode !== null) {
        insertData.sido_code = String(metadata.sidoCode)
      }
      if (metadata.sggCode !== undefined && metadata.sggCode !== null) {
        insertData.sgg_code = String(metadata.sggCode)
      }
    }
  }

  const { error } = await supabase
    .from('favorites')
    .insert(insertData)
  if (error) {
    console.error('찜하기 추가 오류:', error)
    console.error('전송된 데이터:', insertData)
    throw error
  }
}

export async function removeFavorite(userId: string, targetType: FavoriteTargetType, targetId: string) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
  if (error) throw error
}

export async function isFavorited(userId: string, targetType: FavoriteTargetType, targetId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle()
  if (error) return false
  return !!data
}

export async function listFavorites(userId: string, targetType?: FavoriteTargetType) {
  let query = supabase.from('favorites').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (targetType) {
    query = query.eq('target_type', targetType) as any
  }
  const { data, error } = await query
  if (error) throw error
  return data
}


