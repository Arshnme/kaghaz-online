'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="fa" dir="rtl">
      <body>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-xl text-red-600">خطای سیستمی</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                متأسفانه خطای جدی در سیستم رخ داده است. لطفاً صفحه را تازه‌سازی کنید یا به صفحه اصلی بروید.
              </p>
              
              {process.env.NODE_ENV === 'development' && error.digest && (
                <div className="text-left bg-gray-100 p-3 rounded text-sm">
                  <strong>Error ID:</strong> {error.digest}
                </div>
              )}

              <div className="flex gap-2 justify-center">
                <Button onClick={reset} variant="outline">
                  <RefreshCw className="w-4 h-4 ml-2" />
                  تلاش مجدد
                </Button>
                <Button onClick={() => window.location.href = '/'}>
                  <Home className="w-4 h-4 ml-2" />
                  صفحه اصلی
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}