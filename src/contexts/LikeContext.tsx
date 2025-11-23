import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface LikeContextType {
  likedPosts: Set<string>
  toggleLike: (postId: string, userId: string, username?: string) => Promise<void>
  isLiked: (postId: string) => boolean
  refreshLikes: (userId: string) => Promise<void>
}

const LikeContext = createContext<LikeContextType | undefined>(undefined)

export const useLikeContext = () => {
  const context = useContext(LikeContext)
  if (context === undefined) {
    throw new Error('useLikeContext must be used within a LikeProvider')
  }
  return context
}

interface LikeProviderProps {
  children: ReactNode
}

export const LikeProvider: React.FC<LikeProviderProps> = ({ children }) => {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())

  // 좋아요 토글 함수
  const toggleLike = async (postId: string, userId: string, username?: string) => {
    try {
      const isLiked = likedPosts.has(postId)
      
      if (isLiked) {
        // 좋아요 취소
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)

        if (error) {
          console.error('좋아요 취소 오류:', error)
          return
        }

        setLikedPosts(prev => {
          const newSet = new Set(prev)
          newSet.delete(postId)
          return newSet
        })
      } else {
        // 좋아요 추가
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: userId,
            username: username || '사용자',
            created_at: new Date().toISOString()
          })

        if (error) {
          console.error('좋아요 추가 오류:', error)
          return
        }

        setLikedPosts(prev => new Set(prev).add(postId))
      }
    } catch (error) {
      console.error('좋아요 처리 오류:', error)
    }
  }

  // 특정 게시글의 좋아요 상태 확인
  const isLiked = (postId: string) => {
    return likedPosts.has(postId)
  }

  // 사용자의 좋아요 목록 새로고침
  const refreshLikes = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId)

      if (error) {
        console.error('사용자 좋아요 조회 오류:', error)
        return
      }

      const likedPostIds = new Set(data?.map(like => like.post_id) || [])
      setLikedPosts(likedPostIds)
    } catch (error) {
      console.error('사용자 좋아요 조회 오류:', error)
    }
  }

  return (
    <LikeContext.Provider value={{ likedPosts, toggleLike, isLiked, refreshLikes }}>
      {children}
    </LikeContext.Provider>
  )
}
