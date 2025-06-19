"use client"

import React, { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

export default function BillingSuccessPage() {
  const { user } = useAuth()

  useEffect(() => {
    // Show success notification
    toast.success('Subscription activated successfully!')
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="text-center border-green-200 shadow-xl">
          <CardHeader className="pb-6">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 mb-2">
              Welcome to AgileForge Pro! 🎉
            </CardTitle>
            <p className="text-slate-600">
              Your subscription has been activated successfully. You now have access to all Pro features.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-slate-900">What's New:</span>
              </div>
              <ul className="text-sm text-slate-700 space-y-1">
                <li>• Unlimited projects and team members</li>
                <li>• AI-powered story generation</li>
                <li>• Advanced analytics and reporting</li>
                <li>• Priority support</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <Link href="/" className="block">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Start Using AgileForge
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              
              <Link href="/billing" className="block">
                <Button variant="outline" className="w-full">
                  Manage Billing
                </Button>
              </Link>
            </div>
            
            <div className="text-sm text-slate-600">
              <p>
                Questions? Check out our{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 underline">
                  getting started guide
                </a>{' '}
                or contact support.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
} 