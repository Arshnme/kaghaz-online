"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Save,
  Share2,
  Eye,
  Lock,
  Globe,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  FileText,
} from "lucide-react"
import TiptapEditor from "./tiptap-editor"
import { debounce } from "lodash"
import { useToast } from "@/hooks/use-toast"

interface Document {
  id: string
  title: string
  document_id: string
  content: string
  is_public: boolean
  publish_to_profile?: boolean
  password?: string
  user_id: string
  created_at: string
  updated_at: string
}

interface Profile {
  username: string
  full_name: string
}

interface EditorProps {
  document: Document
  profile: Profile
}

export default function Editor({ document: initialDocument, profile }: EditorProps) {
  const [document, setDocument] = useState<Document>(initialDocument)
  const [title, setTitle] = useState(document.title)
  const [content, setContent] = useState(document.content)
  const [isPublic, setIsPublic] = useState(document.is_public)
  const [publishToProfile, setPublishToProfile] = useState(document.publish_to_profile || false)
  const [password, setPassword] = useState(document.password || "")
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  // Auto-save function with debouncing
  const debouncedSave = useCallback(
    debounce(async (updatedData: Partial<Document>) => {
      try {
        setIsSaving(true)
        const response = await fetch(`/api/documents/${document.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedData),
        })

        if (response.ok) {
          const { document: updatedDoc } = await response.json()
          setDocument(updatedDoc)
          setLastSaved(new Date())
        }
      } catch (error) {
        console.error("Auto-save error:", error)
      } finally {
        setIsSaving(false)
      }
    }, 1000),
    [document.id],
  )

  // Auto-save when content changes
  useEffect(() => {
    if (content !== document.content) {
      debouncedSave({ content })
    }
  }, [content, document.content, debouncedSave])

  // Auto-save when title changes
  useEffect(() => {
    if (title !== document.title && title.trim()) {
      debouncedSave({ title: title.trim() })
    }
  }, [title, document.title, debouncedSave])

  const handleManualSave = async () => {
    try {
      setIsSaving(true)
      setError("")

      const response = await fetch(`/api/documents/${document.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          content,
        }),
      })

      if (response.ok) {
        const { document: updatedDoc } = await response.json()
        setDocument(updatedDoc)
        setLastSaved(new Date())
        setSuccess("سند با موفقیت ذخیره شد!")
        setTimeout(() => setSuccess(""), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "خطا در ذخیره سند")
        setTimeout(() => setError(""), 5000)
      }
    } catch (error) {
      console.error("Save error:", error)
      setError("خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.")
      setTimeout(() => setError(""), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleShareSettings = async () => {
    try {
      setIsSaving(true)
      setError("")

      const response = await fetch(`/api/documents/${document.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_public: isPublic,
          publish_to_profile: isPublic ? publishToProfile : false,
          password: password.trim() || null,
        }),
      })

      if (response.ok) {
        const { document: updatedDoc } = await response.json()
        setDocument(updatedDoc)
        setSuccess("تنظیمات اشتراک‌گذاری ذخیره شد!")
        setIsShareDialogOpen(false)
        setTimeout(() => setSuccess(""), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "خطا در ذخیره تنظیمات")
      }
    } catch (error) {
      console.error("Share settings error:", error)
      setError("خطا در ذخیره تنظیمات")
    } finally {
      setIsSaving(false)
    }
  }

  const copyShareLink = () => {
    const link = `${window.location.origin}/${profile.username}/${document.document_id}`
    navigator.clipboard.writeText(link)
    toast({
      title: "لینک کپی شد!",
      description: "لینک سند در کلیپ‌بورد کپی شد",
    })
  }

  const previewDocument = () => {
    const link = `${window.location.origin}/${profile.username}/${document.document_id}`
    window.open(link, "_blank")
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="w-4 h-4 md:ml-2" />
              <span className="hidden md:inline">بازگشت</span>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center space-x-3 space-x-reverse">
              <FileText className="w-6 h-6 text-[#001D51]" />
              <div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-semibold border-none p-0 h-auto bg-transparent focus-visible:ring-0 text-[#001D51] w-[140px] md:w-auto"
                  placeholder="عنوان سند"
                />
                <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-500 hidden md:flex">
                  <span>
                    /{profile.username}/{document.document_id}
                  </span>
                  {document.is_public ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Globe className="w-3 h-3 ml-1" />
                      عمومی
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                      <Lock className="w-3 h-3 ml-1" />
                      خصوصی
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 space-x-reverse">
            {/* Save Status */}
            <div className="hidden md:flex items-center space-x-2 space-x-reverse text-sm">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-blue-600">در حال ذخیره...</span>
                </>
              ) : lastSaved ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">
                    ذخیره شده {lastSaved.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </>
              ) : null}
            </div>

            {/* Manual Save */}
            <Button
              onClick={handleManualSave}
              disabled={isSaving}
              className="bg-[#001D51] hover:bg-[#001D51]/90 text-white"
              size="sm"
            >
              <Save className="w-4 h-4 md:ml-2 text-white" />
              <span className="hidden md:inline">ذخیره</span>
            </Button>

            {/* Preview */}
            <Button variant="outline" size="sm" onClick={previewDocument}>
              <Eye className="w-4 h-4 md:ml-2" />
              <span className="hidden md:inline">پیش‌نمایش</span>
            </Button>

            {/* Share Dialog */}
            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 md:ml-2" />
                  <span className="hidden md:inline">اشتراک‌گذاری</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    تنظیمات اشتراک‌گذاری
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Public/Private Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">دسترسی عمومی</Label>
                      <p className="text-sm text-gray-500">
                        {isPublic ? "همه می‌توانند این سند را ببینند" : "فقط شما می‌توانید این سند را ببینید"}
                      </p>
                    </div>
                    <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                  </div>

                  {/* Publish to Profile Toggle */}
                  {isPublic && (
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-base font-medium">انتشار در پروفایل</Label>
                        <p className="text-sm text-gray-500">
                          {publishToProfile ? "این سند در پروفایل شما نمایش داده می‌شود" : "این سند در پروفایل شما نمایش داده نمی‌شود"}
                        </p>
                      </div>
                      <Switch checked={publishToProfile} onCheckedChange={setPublishToProfile} />
                    </div>
                  )}

                  {/* Password Protection */}
                  {isPublic && (
                    <div className="space-y-3">
                      <Label htmlFor="password">رمز عبور (اختیاری)</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="رمز عبور برای محافظت از سند"
                        className="text-right"
                      />
                      <p className="text-sm text-gray-500">
                        اگر رمز عبور تنظیم کنید، کاربران باید آن را وارد کنند تا بتوانند سند را ببینند.
                      </p>
                    </div>
                  )}

                  {/* Share Link */}
                  <div className="space-y-3">
                    <Label>لینک اشتراک‌گذاری</Label>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Input
                        value={`${typeof window !== 'undefined' ? window.location.origin : 'https://yoursite.com'}/${profile.username}/${document.document_id}`}
                        readOnly
                        className="text-left"
                        dir="ltr"
                      />
                      <Button variant="outline" size="sm" onClick={copyShareLink}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Error/Success Messages */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">{success}</AlertDescription>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-2 space-x-reverse pt-4 ">
                    <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
                      انصراف
                    </Button>
                    <Button onClick={handleShareSettings} disabled={isSaving} className="text-white">
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          در حال ذخیره...
                        </>
                      ) : (
                        "اعمال تنظیمات"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-5xl">
        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 mb-6">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Tiptap Editor */}
        <div className="bg-white rounded-lg shadow-sm">
          <TiptapEditor content={content} onChange={setContent} documentId={document.id} />
        </div>
      </main>
    </div>
  )
}
