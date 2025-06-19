"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CreditCard,
  Calendar,
  Download,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Settings,
  ChevronRight,
  Loader2,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PRICING_PLANS, createCustomerPortalSession } from '@/lib/stripe'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

interface Subscription {
  id: string
  status: 'active' | 'past_due' | 'canceled' | 'trialing'
  current_period_start: string
  current_period_end: string
  plan: {
    id: string
    name: string
    price: number
    interval: string
  }
  cancel_at_period_end: boolean
}

interface PaymentMethod {
  id: string
  type: 'card'
  card: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
  is_default: boolean
}

interface Invoice {
  id: string
  number: string
  status: 'paid' | 'open' | 'void' | 'uncollectible'
  amount_paid: number
  currency: string
  created: string
  invoice_pdf?: string
  period_start: string
  period_end: string
}

interface BillingDashboardProps {
  subscription?: Subscription
  paymentMethods?: PaymentMethod[]
  invoices?: Invoice[]
  isLoading?: boolean
}

export const BillingDashboard: React.FC<BillingDashboardProps> = ({
  subscription,
  paymentMethods = [],
  invoices = [],
  isLoading = false
}) => {
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
  const { user } = useAuth()

  const handleManageBilling = async () => {
    if (!user) {
      toast.error('Please sign in to manage billing')
      return
    }

    setIsLoadingPortal(true)
    try {
      const session = await createCustomerPortalSession(user.id)
      window.location.href = session.url
    } catch (error) {
      console.error('Failed to create portal session:', error)
      toast.error('Failed to open billing portal')
    } finally {
      setIsLoadingPortal(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800">Past Due</Badge>
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800">Canceled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Current Subscription */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <span>Current Subscription</span>
                </CardTitle>
                <CardDescription>
                  Manage your subscription and billing preferences
                </CardDescription>
              </div>
              <Button
                onClick={handleManageBilling}
                disabled={isLoadingPortal}
                variant="outline"
              >
                {isLoadingPortal ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Manage Billing
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {subscription.plan.name} Plan
                    </h3>
                    <p className="text-slate-600">
                      {formatCurrency(subscription.plan.price)} per {subscription.plan.interval}
                    </p>
                  </div>
                  {getStatusBadge(subscription.status)}
                </div>

                {subscription.status === 'past_due' && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Your payment is past due. Please update your payment method to avoid service interruption.
                    </AlertDescription>
                  </Alert>
                )}

                {subscription.cancel_at_period_end && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Your subscription will be canceled at the end of the current period on{' '}
                      {formatDate(subscription.current_period_end)}.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Billing Period</label>
                    <div className="text-slate-900">
                      {formatDate(subscription.current_period_start)} -{' '}
                      {formatDate(subscription.current_period_end)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Next Payment</label>
                    <div className="text-slate-900">
                      {subscription.cancel_at_period_end
                        ? 'No upcoming payment'
                        : formatDate(subscription.current_period_end)
                      }
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Zap className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No Active Subscription
                </h3>
                <p className="text-slate-600 mb-4">
                  You're currently on the free plan. Upgrade to unlock more features.
                </p>
                <Button>
                  View Plans
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Tabs defaultValue="payment-methods" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="billing-history">Billing History</TabsTrigger>
        </TabsList>

        <TabsContent value="payment-methods">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="w-5 h-5 text-slate-600" />
                      <span>Payment Methods</span>
                    </CardTitle>
                    <CardDescription>
                      Manage your payment methods and billing information
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Method
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {paymentMethods.length > 0 ? (
                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-8 bg-slate-100 rounded flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">
                              {method.card.brand.toUpperCase()} •••• {method.card.last4}
                            </div>
                            <div className="text-sm text-slate-600">
                              Expires {method.card.exp_month}/{method.card.exp_year}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {method.is_default && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      No Payment Methods
                    </h3>
                    <p className="text-slate-600 mb-4">
                      Add a payment method to start your subscription.
                    </p>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="billing-history">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-slate-600" />
                  <span>Billing History</span>
                </CardTitle>
                <CardDescription>
                  View and download your invoices and payment history
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length > 0 ? (
                  <div className="space-y-4">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                            {invoice.status === 'paid' ? (
                              <CheckCircle className="w-6 h-6 text-green-600" />
                            ) : (
                              <Clock className="w-6 h-6 text-yellow-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">
                              Invoice #{invoice.number}
                            </div>
                            <div className="text-sm text-slate-600">
                              {formatDate(invoice.created)} • {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="font-medium text-slate-900">
                              {formatCurrency(invoice.amount_paid, invoice.currency)}
                            </div>
                            {getStatusBadge(invoice.status)}
                          </div>
                          {invoice.invoice_pdf && (
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      No Billing History
                    </h3>
                    <p className="text-slate-600">
                      Your invoices and payment history will appear here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default BillingDashboard 