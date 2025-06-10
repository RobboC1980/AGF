"use client"

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AuthModal } from '@/components/auth-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Lock } from 'lucide-react'
import Link from 'next/link'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hasValidToken, setHasValidToken] = useState(false)

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    
    if (tokenParam) {
      setToken(tokenParam)
      setHasValidToken(true)
      setIsModalOpen(true)
    } else {
      setHasValidToken(false)
    }
  }, [searchParams])

  const handleModalClose = () => {
    setIsModalOpen(false)
    router.push('/')
  }

  if (!hasValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertCircle size={24} />
              <span>Invalid Reset Link</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              This password reset link is invalid or has expired. Please request a new password reset link.
            </p>
            <div className="flex flex-col space-y-2">
              <Link href="/">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Go to Home
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setIsModalOpen(true)}
              >
                Request New Reset Link
              </Button>
            </div>
          </CardContent>
        </Card>

        <AuthModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialMode="forgot-password"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-600">
            <Lock size={24} />
            <span>Reset Your Password</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 mb-4">
            You're about to reset your password. Please enter your new password when the form opens.
          </p>
          <Button 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            onClick={() => setIsModalOpen(true)}
          >
            Set New Password
          </Button>
        </CardContent>
      </Card>

      <AuthModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        initialMode="reset-password"
        resetToken={token || undefined}
      />
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
} 