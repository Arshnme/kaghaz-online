"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  FileText,
  Lock,
  User,
  Calendar,
  Eye,
  Share2,
  Copy,
  CheckCircle,
  AlertCircle,
  Globe,
} from "lucide-react"

interface Document {
  id: string
  title: string
  document_id: string
  content: string
  is_public: boolean
  password?: string | null
  user_id: string
  created_at: string
  updated_at: string
}

interface Profile {
  id: string
  username: string
  full_name: string
  email: string
  avatar_url?: string
}

interface PublicDocumentViewProps {
  document: Document
  profile: Profile
}

export default function PublicDocumentView({ document, profile }: PublicDocumentViewProps) {
  const [isPasswordRequired, setIsPasswordRequired] = useState(!!document.password)
  const [password, setPassword] = useState("")
  const [isPasswordCorrect, setIsPasswordCorrect] = useState(!document.password)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [documentContent, setDocumentContent] = useState(document.content)
  const [contentKey, setContentKey] = useState(0) // برای force re-render
  const contentRef = useRef<HTMLDivElement>(null)

  // Effect برای reload کردن تصاویر وقتی رمز عبور درست وارد شد
  useEffect(() => {
    if (isPasswordCorrect && contentRef.current && document.password) {
      // کمی صبر کن تا DOM آپدیت بشه
      const timer = setTimeout(() => {
        const images = contentRef.current?.querySelectorAll('img')
        images?.forEach((img) => {
          const originalSrc = img.src
          // اگر تصویر از API files می‌آید، password رو اضافه کن
          if (originalSrc && originalSrc.includes('/api/files/')) {
            const url = new URL(originalSrc, window.location.origin)
            url.searchParams.set('password', password)
            url.searchParams.set('t', Date.now().toString())
            img.src = url.toString()
          }
          // برای تصاویر خارجی فقط timestamp اضافه کن
          else if (originalSrc && !originalSrc.includes('?')) {
            img.src = originalSrc + '?t=' + Date.now()
          }
        })
      }, 200)

      return () => clearTimeout(timer)
    }
  }, [isPasswordCorrect, contentKey, password, document.password])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/documents/verify-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_id: document.id,
          password: password,
        }),
      })

      const result = await response.json()

      if (response.ok && result.valid) {
        setIsPasswordCorrect(true)
        setIsPasswordRequired(false)
        // Force re-render of images by updating content and key
        setDocumentContent(document.content)
        setContentKey(prev => prev + 1)
      } else {
        setError("رمز عبور اشتباه است")
      }
    } catch (error) {
      setError("خطا در بررسی رمز عبور")
    } finally {
      setIsLoading(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setSuccess("لینک کپی شد!")
    setTimeout(() => setSuccess(""), 3000)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isPasswordRequired && !isPasswordCorrect) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-[#001D51] rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="text-white text-2xl" />
            </div>
            <CardTitle className="text-2xl text-[#001D51]">سند محافظت شده</CardTitle>
            <p className="text-gray-600">این سند با رمز عبور محافظت شده است</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  رمز عبور
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="رمز عبور را وارد کنید"
                  className="text-right"
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-[#001D51] hover:bg-[#001D51]/90 text-white"
                disabled={isLoading}
              >
                {isLoading ? "در حال بررسی..." : "مشاهده سند"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4 space-x-reverse w-full md:w-auto">
              <div className="flex items-center space-x-3 space-x-reverse w-full md:w-auto">
                <FileText className="w-8 h-8 text-[#001D51] flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl md:text-2xl font-bold text-[#001D51] truncate">{document.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mt-1">
                    <div className="flex items-center gap-1">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback>
                          <User className="w-3 h-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[100px]">{profile.full_name}</span>
                    </div>
                    <span className="hidden sm:inline">•</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(document.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end space-x-3 space-x-reverse w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
              <Badge variant="secondary" className="bg-green-100 text-green-800 whitespace-nowrap">
                <Globe className="w-3 h-3 ml-1" />
                عمومی
              </Badge>

              <Button variant="outline" size="sm" onClick={copyLink} className="whitespace-nowrap">
                <Copy className="w-4 h-4 ml-2" />
                کپی لینک
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Success Message */}
      {success && (
        <div className="container mx-auto max-w-4xl px-6 pt-4">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto max-w-4xl px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-8">
            {/* Document Content */}
            <div className="w-full overflow-x-auto pb-2">
              <div
                ref={contentRef}
                key={`content-${contentKey}`}
                className="document-content prose prose-lg max-w-none text-gray-800 leading-relaxed min-w-full w-fit [&_img]:mx-auto [&_img]:my-6 [&_img]:block [&_img]:rounded-xl [&_img]:shadow-lg [&_img]:border [&_img]:border-gray-200 [&_img]:max-w-full [&_img]:h-auto [&_img]:transition-all [&_img]:duration-300 [&_img]:hover:shadow-xl [&_img]:hover:scale-[1.02] [&_img]:cursor-pointer"
                dangerouslySetInnerHTML={{ __html: documentContent }}
                dir="auto"
                style={{
                  '--image-max-height': '600px'
                } as React.CSSProperties}
              />
            </div>

            {/* Empty State */}
            {!documentContent.trim() && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">این سند هنوز محتوایی ندارد</p>
              </div>
            )}
          </div>
        </div>

        {/* Author Info */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Avatar className="w-12 h-12">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="bg-[#001D51] text-white">
                {profile.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg text-[#001D51]">{profile.full_name}</h3>
              <p className="text-gray-600">@{profile.username}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500">
          <p className="flex items-center justify-center gap-2">
            ساخته شده با
            <FileText className="w-4 h-4 text-[#001D51]" />
            <span className="font-semibold text-[#001D51]">کاغذ آنلاین</span>
          </p>
        </div>
      </main>
    </div>
  )
}