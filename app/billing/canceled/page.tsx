"use client"

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { XCircle, ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function BillingCanceledPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="text-center border-red-200 shadow-xl">
          <CardHeader className="pb-6">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 mb-2">
              Subscription Canceled
            </CardTitle>
            <p className="text-slate-600">
              Your subscription process was canceled. Don't worry, you can try again anytime.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-slate-900">Need Help?</span>
              </div>
              <p className="text-sm text-slate-700">
                If you experienced any issues during checkout, our support team is here to help.
              </p>
            </div>
            
            <div className="space-y-3">
              <Link href="/pricing" className="block">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </Link>
              
              <Link href="/" className="block">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            
            <div className="text-sm text-slate-600">
              <p>
                Still have questions?{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 underline">
                  Contact our support team
                </a>{' '}
                for assistance.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
} 