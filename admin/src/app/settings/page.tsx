'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, RefreshCw } from 'lucide-react'

interface UpdateModalSetting {
  enabled: boolean
  version: string
  message: string
  appStoreUrl?: string
  playStoreUrl?: string
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updateModal, setUpdateModal] = useState<UpdateModalSetting>({
    enabled: false,
    version: '1.0.0',
    message: '새로운 버전이 출시되었습니다.',
    appStoreUrl: '',
    playStoreUrl: ''
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings?key=update_modal')
      const result = await response.json()

      if (response.ok && result.setting) {
        const value = result.setting.value as UpdateModalSetting
        setUpdateModal(value)
      }
    } catch (error) {
      console.error('설정 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleUpdateModal = async () => {
    try {
      setSaving(true)
      const newValue = {
        ...updateModal,
        enabled: !updateModal.enabled
      }

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'update_modal',
          value: newValue,
          description: '업데이트 모달 설정'
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setUpdateModal(newValue)
        alert('설정이 저장되었습니다.')
      } else {
        alert(result.error || '설정 저장 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('설정 저장 오류:', error)
      alert('설정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleVersionChange = async (newVersion: string) => {
    try {
      setSaving(true)
      const newValue = {
        ...updateModal,
        version: newVersion
      }

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'update_modal',
          value: newValue,
          description: '업데이트 모달 설정'
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setUpdateModal(newValue)
        alert('버전이 업데이트되었습니다.')
      } else {
        alert(result.error || '설정 저장 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('설정 저장 오류:', error)
      alert('설정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleMessageChange = async (newMessage: string) => {
    try {
      setSaving(true)
      const newValue = {
        ...updateModal,
        message: newMessage
      }

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'update_modal',
          value: newValue,
          description: '업데이트 모달 설정'
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setUpdateModal(newValue)
        alert('메시지가 업데이트되었습니다.')
      } else {
        alert(result.error || '설정 저장 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('설정 저장 오류:', error)
      alert('설정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-gray-700" />
        <h1 className="text-3xl font-bold text-gray-900">설정</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>업데이트 모달 설정</CardTitle>
          <CardDescription>
            앱에서 업데이트 알림 모달을 표시할지 여부를 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 온오프 토글 */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                업데이트 모달 표시
              </h3>
              <p className="text-sm text-gray-600">
                이 기능이 켜져 있으면 앱 사용자에게 업데이트 모달이 표시됩니다.
              </p>
            </div>
            <button
              onClick={handleToggleUpdateModal}
              disabled={saving}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${updateModal.enabled ? 'bg-blue-600' : 'bg-gray-200'}
                ${saving ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                  transition duration-200 ease-in-out
                  ${updateModal.enabled ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          {/* 버전 정보 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              버전 정보
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={updateModal.version}
                onChange={(e) => {
                  const newVersion = e.target.value
                  setUpdateModal({ ...updateModal, version: newVersion })
                }}
                onBlur={(e) => {
                  if (e.target.value !== updateModal.version) {
                    handleVersionChange(e.target.value)
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 1.0.0"
              />
            </div>
            <p className="text-xs text-gray-500">
              현재 설정된 버전: <span className="font-semibold">{updateModal.version}</span>
            </p>
          </div>

          {/* 메시지 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              업데이트 메시지
            </label>
            <textarea
              value={updateModal.message}
              onChange={(e) => {
                const newMessage = e.target.value
                setUpdateModal({ ...updateModal, message: newMessage })
              }}
              onBlur={(e) => {
                if (e.target.value !== updateModal.message) {
                  handleMessageChange(e.target.value)
                }
              }}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="업데이트 메시지를 입력하세요"
            />
            <p className="text-xs text-gray-500">
              모달에 표시될 메시지입니다.
            </p>
          </div>

          {/* 앱스토어 URL */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              iOS 앱스토어 URL
            </label>
            <input
              type="url"
              value={updateModal.appStoreUrl || ''}
              onChange={(e) => {
                const newUrl = e.target.value
                setUpdateModal({ ...updateModal, appStoreUrl: newUrl })
              }}
              onBlur={async (e) => {
                if (e.target.value !== (updateModal.appStoreUrl || '')) {
                  try {
                    setSaving(true)
                    const newValue = {
                      ...updateModal,
                      appStoreUrl: e.target.value
                    }
                    const response = await fetch('/api/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        key: 'update_modal',
                        value: newValue,
                        description: '업데이트 모달 설정'
                      }),
                    })
                    if (response.ok) {
                      setUpdateModal(newValue)
                    }
                  } catch (error) {
                    console.error('설정 저장 오류:', error)
                  } finally {
                    setSaving(false)
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://apps.apple.com/app/..."
            />
            <p className="text-xs text-gray-500">
              iOS 사용자가 업데이트 버튼을 클릭하면 이동할 앱스토어 URL입니다.
            </p>
          </div>

          {/* 플레이스토어 URL */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Android 플레이스토어 URL
            </label>
            <input
              type="url"
              value={updateModal.playStoreUrl || ''}
              onChange={(e) => {
                const newUrl = e.target.value
                setUpdateModal({ ...updateModal, playStoreUrl: newUrl })
              }}
              onBlur={async (e) => {
                if (e.target.value !== (updateModal.playStoreUrl || '')) {
                  try {
                    setSaving(true)
                    const newValue = {
                      ...updateModal,
                      playStoreUrl: e.target.value
                    }
                    const response = await fetch('/api/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        key: 'update_modal',
                        value: newValue,
                        description: '업데이트 모달 설정'
                      }),
                    })
                    if (response.ok) {
                      setUpdateModal(newValue)
                    }
                  } catch (error) {
                    console.error('설정 저장 오류:', error)
                  } finally {
                    setSaving(false)
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://play.google.com/store/apps/details?id=..."
            />
            <p className="text-xs text-gray-500">
              Android 사용자가 업데이트 버튼을 클릭하면 이동할 플레이스토어 URL입니다.
            </p>
          </div>

          {/* 미리보기 정보 */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">미리보기</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium">상태:</span>{' '}
                <span className={updateModal.enabled ? 'text-green-600' : 'text-gray-400'}>
                  {updateModal.enabled ? '활성화됨' : '비활성화됨'}
                </span>
              </p>
              <p>
                <span className="font-medium">버전:</span> {updateModal.version}
              </p>
              <p>
                <span className="font-medium">메시지:</span> {updateModal.message}
              </p>
              {updateModal.appStoreUrl && (
                <p>
                  <span className="font-medium">iOS URL:</span>{' '}
                  <span className="text-xs break-all">{updateModal.appStoreUrl}</span>
                </p>
              )}
              {updateModal.playStoreUrl && (
                <p>
                  <span className="font-medium">Android URL:</span>{' '}
                  <span className="text-xs break-all">{updateModal.playStoreUrl}</span>
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

