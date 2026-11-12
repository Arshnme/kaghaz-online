"use client"

import React, { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  User,
  Edit3,
  MapPin,
  Globe,
  Calendar,
  FileText,
  Eye,
  Heart,
  Settings,
  Camera,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Trash2,
  Key,
  UserCheck,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import Cropper from "react-easy-crop"
import { getCroppedImg } from "@/lib/image-utils"
import { Slider } from "@/components/ui/slider"

interface Document {
  id: string
  title: string
  document_id: string
  content: string
  is_public: boolean
  publish_to_profile: boolean
  user_id: string
  created_at: string
  updated_at: string
  view_count: number
  like_count: number
}

interface Profile {
  id: string
  username: string
  full_name: string
  email: string
  avatar_url?: string
  bio?: string
  website?: string
  location?: string
  is_verified: boolean
  is_premium: boolean
  created_at: string
}

interface UserProfileProps {
  profile: Profile
  documents: Document[]
  isOwner: boolean
  currentUser: any
}

export default function UserProfile({ profile, documents: initialDocuments, isOwner, currentUser }: UserProfileProps) {
  const [activeTab, setActiveTab] = useState("profile")
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editedProfile, setEditedProfile] = useState({
    full_name: profile.full_name,
    bio: profile.bio || "",
    website: profile.website || "",
    location: profile.location || "",
  })
  const [usernameData, setUsernameData] = useState({
    new_username: profile.username,
    current_password: "",
  })
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false)
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")

  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const handleUpdateProfile = async () => {
    if (!editedProfile.full_name.trim()) {
      setError("نام کامل الزامی است")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedProfile),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "خطا در به‌روزرسانی پروفایل")
      }

      setSuccess("پروفایل با موفقیت به‌روزرسانی شد!")
      setTimeout(() => {
        setIsEditDialogOpen(false)
        router.refresh()
      }, 1500)
    } catch (error: any) {
      console.error("Update profile error:", error)
      setError(error.message || "خطا در به‌روزرسانی پروفایل")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم فایل نباید بیشتر از ۵ مگابایت باشد")
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError("فقط فایل‌های تصویری مجاز هستند")
      return
    }

    // Create preview for cropping
    const reader = new FileReader()
    reader.onload = (e) => {
      setTempImageSrc(e.target?.result as string)
      setIsCropDialogOpen(true)
    }
    reader.readAsDataURL(file)
    setError("")

    // Reset input value so same file can be selected again
    e.target.value = ""
  }

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const handleCropConfirm = async () => {
    if (!tempImageSrc || !croppedAreaPixels) return

    try {
      const croppedImageBlob = await getCroppedImg(
        tempImageSrc,
        croppedAreaPixels
      )

      if (croppedImageBlob) {
        // Create a File from the Blob
        const fileName = `${crypto.randomUUID().replace(/-/g, '')}.webp`
        const file = new File([croppedImageBlob], fileName, { type: "image/webp" })

        setAvatarFile(file)
        setAvatarPreview(URL.createObjectURL(croppedImageBlob))
        setIsCropDialogOpen(false)
        setTempImageSrc(null)
      }
    } catch (e) {
      console.error(e)
      setError("خطا در برش تصویر")
    }
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile) return

    setIsLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append('avatar', avatarFile)

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
        credentials: 'include',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "خطا در آپلود عکس پروفایل")
      }

      setSuccess("عکس پروفایل با موفقیت آپلود شد!")
      setAvatarFile(null)
      setAvatarPreview(null)
      setTimeout(() => {
        setIsEditDialogOpen(false)
        router.refresh()
      }, 1500)
    } catch (error: any) {
      console.error("Avatar upload error:", error)
      setError(error.message || "خطا در آپلود عکس پروفایل")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAvatar = async () => {
    if (!confirm("آیا مطمئن هستید که می‌خواهید عکس پروفایل خود را حذف کنید؟")) {
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
        credentials: 'include',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "خطا در حذف عکس پروفایل")
      }

      setSuccess("عکس پروفایل با موفقیت حذف شد!")
      setAvatarPreview(null)
      setTimeout(() => {
        setIsEditDialogOpen(false)
        router.refresh()
      }, 1500)
    } catch (error: any) {
      console.error("Avatar delete error:", error)
      setError(error.message || "خطا در حذف عکس پروفایل")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUsernameUpdate = async () => {
    if (!usernameData.new_username.trim()) {
      setError("نام کاربری الزامی است")
      return
    }

    if (!usernameData.current_password.trim()) {
      setError("رمز عبور فعلی الزامی است")
      return
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_]+$/
    if (!usernameRegex.test(usernameData.new_username)) {
      setError("نام کاربری فقط می‌تواند شامل حروف انگلیسی کوچک، اعداد و _ باشد")
      return
    }

    if (usernameData.new_username.length < 3 || usernameData.new_username.length > 30) {
      setError("نام کاربری باید بین ۳ تا ۳۰ کاراکتر باشد")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/profile/username", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          new_username: usernameData.new_username,
          current_password: usernameData.current_password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "خطا در تغییر نام کاربری")
      }

      setSuccess("نام کاربری با موفقیت تغییر کرد!")
      setUsernameData({ new_username: "", current_password: "" })
      setTimeout(() => {
        setIsEditDialogOpen(false)
        router.push(`/${result.username}/profile`)
      }, 1500)
    } catch (error: any) {
      console.error("Username update error:", error)
      setError(error.message || "خطا در تغییر نام کاربری")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordUpdate = async () => {
    if (!passwordData.current_password.trim()) {
      setError("رمز عبور فعلی الزامی است")
      return
    }

    if (!passwordData.new_password.trim()) {
      setError("رمز عبور جدید الزامی است")
      return
    }

    if (passwordData.new_password.length < 8) {
      setError("رمز عبور جدید باید حداقل ۸ کاراکتر باشد")
      return
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError("رمز عبور جدید و تکرار آن یکسان نیستند")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "خطا در تغییر رمز عبور")
      }

      setSuccess("رمز عبور با موفقیت تغییر کرد!")
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" })
      setTimeout(() => {
        setIsEditDialogOpen(false)
      }, 1500)
    } catch (error: any) {
      console.error("Password update error:", error)
      setError(error.message || "خطا در تغییر رمز عبور")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("آیا مطمئن هستید که می‌خواهید این مقاله را از پروفایل حذف کنید؟")) {
      return
    }

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publish_to_profile: false }),
      })

      if (response.ok) {
        setDocuments(documents.filter(doc => doc.id !== docId))
        toast({
          title: "مقاله حذف شد",
          description: "مقاله از پروفایل شما حذف شد",
        })
      } else {
        throw new Error("خطا در حذف مقاله")
      }
    } catch (error) {
      console.error("Delete document error:", error)
      toast({
        title: "خطا",
        description: "خطا در حذف مقاله از پروفایل",
        variant: "destructive",
      })
    }
  }

  const handleDeleteProfile = async () => {
    if (!deletePassword) {
      setError("لطفاً رمز عبور خود را وارد کنید")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/profile/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: deletePassword }),
      })

      if (response.ok) {
        toast({
          title: "حساب کاربری حذف شد",
          description: "حساب کاربری شما با موفقیت حذف شد",
        })
        router.push("/")
      } else {
        const result = await response.json()
        throw new Error(result.error || "خطا در حذف حساب کاربری")
      }
    } catch (error: any) {
      console.error("Delete profile error:", error)
      setError(error.message || "خطا در حذف حساب کاربری")
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '').substring(0, 150) + "..."
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4 sticky top-0 z-50">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="px-2 md:px-4">
              <ArrowLeft className="w-4 h-4 md:ml-2" />
              <span className="hidden md:inline">بازگشت</span>
              <span className="md:hidden">برگشت</span>
            </Button>
            <div className="flex items-center space-x-3 space-x-reverse">
              <FileText className="w-6 h-6 text-[#001D51]" />
              <h1 className="text-lg md:text-xl font-bold text-[#001D51]">پروفایل کاربر</h1>
            </div>
          </div>
          {isOwner && (
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
              setIsEditDialogOpen(open)
              if (!open) setActiveTab("profile") // Reset tab on close
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit3 className="w-4 h-4 md:ml-2" />
                  <span className="hidden md:inline">ویرایش پروفایل</span>
                  <span className="md:hidden">ویرایش</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    تنظیمات حساب کاربری
                  </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="profile" className="text-xs md:text-sm px-1">
                      <User className="w-4 h-4 md:ml-1" />
                      <span className="hidden md:inline">پروفایل</span>
                    </TabsTrigger>
                    <TabsTrigger value="avatar" className="text-xs md:text-sm px-1">
                      <Camera className="w-4 h-4 md:ml-1" />
                      <span className="hidden md:inline">عکس</span>
                    </TabsTrigger>
                    <TabsTrigger value="username" className="text-xs md:text-sm px-1">
                      <UserCheck className="w-4 h-4 md:ml-1" />
                      <span className="hidden md:inline">نام کاربری</span>
                    </TabsTrigger>
                    <TabsTrigger value="password" className="text-xs md:text-sm px-1">
                      <Key className="w-4 h-4 md:ml-1" />
                      <span className="hidden md:inline">رمز عبور</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Profile Tab */}
                  <TabsContent value="profile" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">نام کامل</Label>
                      <Input
                        id="full_name"
                        value={editedProfile.full_name}
                        onChange={(e) => setEditedProfile({ ...editedProfile, full_name: e.target.value })}
                        placeholder="نام کامل خود را وارد کنید"
                        className="text-right"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">بیوگرافی</Label>
                      <Textarea
                        id="bio"
                        value={editedProfile.bio}
                        onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                        placeholder="درباره خود بنویسید..."
                        className="text-right"
                        rows={3}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">وب‌سایت</Label>
                      <Input
                        id="website"
                        value={editedProfile.website}
                        onChange={(e) => setEditedProfile({ ...editedProfile, website: e.target.value })}
                        placeholder="https://example.com"
                        className="text-left"
                        dir="ltr"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">موقعیت</Label>
                      <Input
                        id="location"
                        value={editedProfile.location}
                        onChange={(e) => setEditedProfile({ ...editedProfile, location: e.target.value })}
                        placeholder="شهر، کشور"
                        className="text-right"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="flex justify-end space-x-2 space-x-reverse pt-4">
                      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
                        انصراف
                      </Button>
                      <Button className="text-white" onClick={handleUpdateProfile} disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            در حال ذخیره...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4 text-white" />
                            ذخیره پروفایل
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Avatar Tab */}
                  <TabsContent value="avatar" className="space-y-4">
                    <div className="text-center space-y-4">
                      <div className="flex justify-center relative mx-auto w-fit">
                        <Avatar className="w-32 h-32">
                          <AvatarImage src={avatarPreview || profile.avatar_url} alt={profile.full_name} />
                          <AvatarFallback className="text-4xl bg-[#001D51] text-white">
                            {getInitials(profile.full_name)}
                          </AvatarFallback>
                        </Avatar>

                        {!avatarFile && profile.avatar_url && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white shadow-md border-gray-200 hover:bg-gray-50 h-9 w-9 transition-transform hover:scale-105"
                            onClick={handleDeleteAvatar}
                            disabled={isLoading}
                            title="حذف عکس پروفایل"
                          >
                            <Trash2 className="w-4 h-4 text-gray-600" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="avatar">انتخاب عکس پروفایل</Label>
                        <Input
                          id="avatar"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="text-right"
                          disabled={isLoading}
                        />
                        <p className="text-sm text-gray-500">
                          فرمت‌های مجاز: JPG، PNG، GIF - حداکثر ۵ مگابایت
                        </p>
                      </div>

                      {avatarFile && (
                        <div className="flex justify-center space-x-2 space-x-reverse">
                          <Button variant="outline" onClick={() => {
                            setAvatarFile(null)
                            setAvatarPreview(null)
                          }}>
                            لغو
                          </Button>
                          <Button className="text-white" onClick={handleAvatarUpload} disabled={isLoading}>
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                در حال آپلود...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                ذخیره عکس
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Username Tab */}
                  <TabsContent value="username" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new_username">نام کاربری جدید</Label>
                      <Input
                        id="new_username"
                        value={usernameData.new_username}
                        onChange={(e) => setUsernameData({ ...usernameData, new_username: e.target.value.toLowerCase() })}
                        placeholder="نام کاربری جدید"
                        className="text-left"
                        dir="ltr"
                        disabled={isLoading}
                      />
                      <p className="text-sm text-gray-500">
                        نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد و _ باشد
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="current_password_username">رمز عبور فعلی</Label>
                      <Input
                        id="current_password_username"
                        type="password"
                        value={usernameData.current_password}
                        onChange={(e) => setUsernameData({ ...usernameData, current_password: e.target.value })}
                        placeholder="رمز عبور فعلی خود را وارد کنید"
                        className="text-left"
                        dir="ltr"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="flex justify-between items-center pt-4 w-full" dir="rtl">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Button className="text-white" onClick={handleUsernameUpdate} disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              در حال تغییر...
                            </>
                          ) : (
                            <>

                              تغییر نام کاربری
                              <UserCheck className="mr-2 h-4 w-4 text-white" />
                            </>
                          )}
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
                          انصراف
                        </Button>
                      </div>

                      <button
                        onClick={() => setIsDeleteConfirmOpen(true)}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        type="button"
                      >
                        حذف حساب کاربری
                      </button>
                    </div>
                  </TabsContent>

                  {/* Password Tab */}
                  <TabsContent value="password" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current_password">رمز عبور فعلی</Label>
                      <Input
                        id="current_password"
                        type="password"
                        value={passwordData.current_password}
                        onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                        placeholder="رمز عبور فعلی"
                        className="text-left"
                        dir="ltr"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new_password">رمز عبور جدید</Label>
                      <Input
                        id="new_password"
                        type="password"
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        placeholder="رمز عبور جدید"
                        className="text-left"
                        dir="ltr"
                        disabled={isLoading}
                      />
                      <p className="text-sm text-gray-500">
                        رمز عبور باید حداقل ۸ کاراکتر باشد
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">تکرار رمز عبور جدید</Label>
                      <Input
                        id="confirm_password"
                        type="password"
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                        placeholder="تکرار رمز عبور جدید"
                        className="text-left"
                        dir="ltr"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="flex justify-end space-x-2 space-x-reverse pt-4">
                      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
                        انصراف
                      </Button>
                      <Button className="text-white" onClick={handlePasswordUpdate} disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            در حال تغییر...
                          </>
                        ) : (
                          <>
                            <Key className="mr-2 h-4 w-4 text-white" />
                            تغییر رمز عبور
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Global Error/Success Messages */}
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
              </DialogContent>
            </Dialog>
          )}

          {/* Crop Dialog */}
          <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle>برش تصویر</DialogTitle>
              </DialogHeader>

              <div className="relative w-full h-64 bg-black rounded-md overflow-hidden mt-4">
                {tempImageSrc && (
                  <Cropper
                    image={tempImageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    showGrid={false}
                    cropShape="round"
                  />
                )}
              </div>

              <div className="py-4">
                <Label className="mb-2 block text-sm">بزرگنمایی</Label>
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.1}
                  onValueChange={(value) => setZoom(value[0])}
                  className="w-full"
                />
              </div>

              <div className="flex justify-end space-x-2 space-x-reverse">
                <Button variant="outline" onClick={() => setIsCropDialogOpen(false)}>
                  انصراف
                </Button>
                <Button className="text-white" onClick={handleCropConfirm} >
                  تایید و برش
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header >

      {/* Main Content */}
      < main className="container mx-auto px-4 py-6 md:px-6 md:py-8 max-w-4xl" >
        {/* Profile Header */}
        < Card className="mb-8" >
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 md:w-32 md:h-32">
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                  <AvatarFallback className="text-2xl md:text-4xl bg-[#001D51] text-white">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                {isOwner && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                    onClick={() => {
                      setActiveTab("avatar")
                      setIsEditDialogOpen(true)
                    }}
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="flex-1 space-y-3 text-center md:text-right w-full">
                <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 justify-center md:justify-start">
                  <h1 className="text-2xl font-bold text-[#001D51]">{profile.full_name}</h1>
                  <div className="flex items-center gap-2">
                    {profile.is_verified && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <CheckCircle className="w-3 h-3 ml-1" />
                        تایید شده
                      </Badge>
                    )}
                    {profile.is_premium && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        ⭐ پریمیوم
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-gray-600" dir="ltr">@{profile.username}</p>

                {profile.bio && (
                  <p className="text-gray-700 leading-relaxed max-w-2xl mx-auto md:mx-0">{profile.bio}</p>
                )}

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-500">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {profile.location}
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        وب‌سایت
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    عضو از {formatDate(profile.created_at)}
                  </div>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-6 text-sm pt-2">
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{documents.length}</span>
                    <span className="text-gray-500">مقاله</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">
                      {documents.reduce((sum, doc) => sum + doc.view_count, 0)}
                    </span>
                    <span className="text-gray-500">بازدید</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">
                      {documents.reduce((sum, doc) => sum + doc.like_count, 0)}
                    </span>
                    <span className="text-gray-500">پسند</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card >

        {/* Published Documents */}
        < div className="space-y-6" >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#001D51]">
              مقالات منتشر شده ({documents.length})
            </h2>
          </div>

          {
            documents.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    {isOwner ? "شما هنوز مقاله‌ای منتشر نکرده‌اید" : "این کاربر هنوز مقاله‌ای منتشر نکرده"}
                  </h3>
                  <p className="text-gray-500">
                    {isOwner ? "مقالات خود را در ویرایشگر عمومی کرده و در پروفایل منتشر کنید" : ""}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {documents.map((doc) => (
                  <Card
                    key={doc.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push(`/${profile.username}/${doc.document_id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg text-[#001D51] line-clamp-2">
                          {doc.title}
                        </CardTitle>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteDocument(doc.id)
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                        {stripHtml(doc.content)}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {doc.view_count}
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {doc.like_count}
                          </div>
                        </div>
                        <span>{formatDate(doc.updated_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          }
        </div >
      </main >
    </div >
  )
}