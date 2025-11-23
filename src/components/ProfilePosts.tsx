import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart, MessageCircle, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface UserPost {
  id: string
  content: string
  images: string[]
  category: string
  created_at: string
  likes_count: number
  comments_count: number
}

const ProfilePosts = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<UserPost[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        // 전화번호 로그인 사용자 우선 확인
        const isLoggedIn = localStorage.getItem('isLoggedIn')
        const userProfile = localStorage.getItem('userProfile')
        let authorName: string | null = null

        if (isLoggedIn === 'true' && userProfile) {
          const p = JSON.parse(userProfile)
          authorName = p.nickname || p.full_name || null
        } else {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            navigate('/login')
            return
          }
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, nickname')
            .eq('auth_user_id', user.id)
            .single()
          authorName = profileData?.nickname || profileData?.full_name || null
        }

        if (!authorName) {
          setError('작성자 정보를 찾을 수 없습니다.')
          setLoading(false)
          return
        }

        const { data: postsData, error: postsError } = await supabase
          .from('community_posts')
          .select('*')
          .eq('author_name', authorName)
          .order('created_at', { ascending: false })

        if (postsError) {
          setError('게시글을 불러오지 못했습니다.')
          setPosts([])
        } else {
          const postIds = (postsData || []).map(p => p.id)
          if (postIds.length > 0) {
            const { data: likesData } = await supabase
              .from('post_likes')
              .select('post_id')
              .in('post_id', postIds)
            const { data: commentsData } = await supabase
              .from('comments')
              .select('post_id')
              .in('post_id', postIds)

            const likesCountMap = new Map<string, number>()
            const commentsCountMap = new Map<string, number>()
            likesData?.forEach(l => likesCountMap.set(l.post_id as string, (likesCountMap.get(l.post_id as string) || 0) + 1))
            commentsData?.forEach(c => commentsCountMap.set(c.post_id as string, (commentsCountMap.get(c.post_id as string) || 0) + 1))

            const withCounts = (postsData || []).map(p => ({
              ...p,
              likes_count: likesCountMap.get(p.id) || 0,
              comments_count: commentsCountMap.get(p.id) || 0
            })) as UserPost[]
            setPosts(withCounts)
          } else {
            setPosts([])
          }
        }
      } catch (e) {
        setError('데이터 로딩 중 오류가 발생했습니다.')
        setPosts([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [navigate])

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">내가 작성한 글</h1>
            <div className="w-10"></div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl mb-3 shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="bg-gray-50 px-2 py-1 text-center">
            <div className="text-xs text-gray-500 font-semibold">전체 글</div>
          </div>
          <div className="p-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb8678] mx-auto mb-4"></div>
                <p className="text-gray-600">글을 불러오는 중...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-sm text-red-600">{error}</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-gray-600">작성한 글이 없습니다.</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {posts.map(post => (
                  <div
                    key={post.id}
                    className="aspect-square bg-gray-100 rounded-2xl overflow-hidden relative group cursor-pointer"
                    onClick={() => navigate(`/community/post/${post.id}?category=${encodeURIComponent(post.category)}`, { state: { from: '/profile/posts' } })}
                  >
                    {post.images && post.images.length > 0 ? (
                      <img
                        src={post.images[0]}
                        alt="게시글 이미지"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
                        <BookOpen className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="flex items-center justify-between bg-black/60 backdrop-blur-sm rounded-xl px-2 py-1">
                        <div className="flex items-center space-x-1">
                          <Heart className="w-3 h-3 text-red-400 fill-current" />
                          <span className="text-white text-xs font-medium">{post.likes_count}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-3 h-3 text-blue-400" />
                          <span className="text-white text-xs font-medium">{post.comments_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default ProfilePosts
