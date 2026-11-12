"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  User,
  Chrome,
  Github,
  AlertCircle,
  CheckCircle,
  FileText,
  Sparkles,
  Shield,
  Zap,
  Globe,
  Users,
} from "lucide-react"
import { validateUsername } from "@/lib/username-validation"

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [username, setUsername] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeTab, setActiveTab] = useState("signin")
  const [mounted, setMounted] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [waitingForVerification, setWaitingForVerification] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState("")
  const [isNewUser, setIsNewUser] = useState(false)

  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    setMounted(true)
    checkExistingSession()
  }, [])

  const checkExistingSession = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        router.push("/dashboard")
        return
      }
    } catch (error) {
      console.error("Session check error:", error)
    } finally {
      setIsCheckingSession(false)
    }
  }

  const validateEmail = useCallback((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }, [])

  const validatePassword = useCallback((password: string) => {
    return password.length >= 8 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
  }, [])

  const validateUsernameFormat = useCallback((username: string) => {
    const usernameRegex = /^[a-zA-Z0-9_]{2,30}$/
    return usernameRegex.test(username)
  }, [])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    if (!validateEmail(email)) {
      setError("لطفاً یک ایمیل معتبر وارد کنید")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("رمز عبور باید حداقل ۶ کاراکتر باشد")
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })

      if (error) {
        switch (error.message) {
          case "Invalid login credentials":
            setError("ایمیل یا رمز عبور اشتباه است")
            break
          case "Email not confirmed":
            setWaitingForVerification(true)
            setVerificationEmail(email.toLowerCase().trim())
            setIsNewUser(false)
            setError("")
            break
          case "Too many requests":
            setError("تعداد تلاش‌های زیاد. لطفاً کمی صبر کنید")
            break
          default:
            setError("خطا در ورود. لطفاً دوباره تلاش کنید")
        }
      } else if (data.user) {
        setSuccess("ورود موفقیت‌آمیز! در حال انتقال...")
        setTimeout(() => {
          router.push("/dashboard")
          router.refresh()
        }, 1000)
      }
    } catch (error: any) {
      setError("خطای اتصال. لطفاً اتصال اینترنت خود را بررسی کنید")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    if (!fullName.trim() || fullName.length < 2) {
      setError("نام کامل باید حداقل ۲ کاراکتر باشد")
      setIsLoading(false)
      return
    }

    // اعتبارسنجی نام کاربری
    const usernameValidation = validateUsername(username)
    if (!usernameValidation.isValid) {
      setError(usernameValidation.error || "نام کاربری نامعتبر است")
      setIsLoading(false)
      return
    }

    if (!validateEmail(email)) {
      setError("لطفاً یک ایمیل معتبر وارد کنید")
      setIsLoading(false)
      return
    }

    if (!validatePassword(password)) {
      setError("رمز عبور باید حداقل ۸ کاراکتر باشد و شامل حروف بزرگ، کوچک و عدد باشد")
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("رمز عبور و تکرار آن یکسان نیستند")
      setIsLoading(false)
      return
    }

    try {
      // Check username availability
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username.toLowerCase())
        .single()

      if (existingUser) {
        setError("این نام کاربری قبلاً استفاده شده است")
        setIsLoading(false)
        return
      }

      // Check if email already exists
      const emailCheckResponse = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      })

      const emailCheckResult = await emailCheckResponse.json()

      if (emailCheckResult.exists) {
        if (!emailCheckResult.emailConfirmed) {
          setWaitingForVerification(true)
          setVerificationEmail(email.toLowerCase().trim())
          setIsNewUser(false) // This is an existing user waiting for verification
          setError("")
          setIsLoading(false)
          return
        } else {
          setError("این ایمیل قبلاً ثبت شده است")
          setIsLoading(false)
          return
        }
      }

      // Use API endpoint for registration to ensure proper profile creation
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          username: username.toLowerCase().trim(),
          fullName: fullName.trim(),
        }),
      })

      const result = await response.json()

      if (response.ok) {
        if (result.user?.email_confirmed_at) {
          setSuccess("ثبت نام موفقیت‌آمیز! در حال انتقال...")
          setTimeout(() => {
            router.push("/dashboard")
            router.refresh()
          }, 1000)
        } else {
          // User registered successfully but email not confirmed - show verification screen
          setWaitingForVerification(true)
          setVerificationEmail(email.toLowerCase().trim())
          setIsNewUser(true) // This is a new user who just registered
          setError("") // Clear any previous errors
          setSuccess("ثبت نام موفقیت‌آمیز! لطفاً ایمیل خود را بررسی کرده و لینک تأیید را کلیک کنید.")
        }
      } else {
        // Handle API errors
        switch (result.error) {
          case "Username already taken":
            setError("این نام کاربری قبلاً استفاده شده است")
            break
          case "All fields are required":
            setError("تمام فیلدها الزامی هستند")
            break
          default:
            setError(result.error || "خطا در ثبت نام. لطفاً دوباره تلاش کنید")
        }
      }
    } catch (error: any) {
      setError("خطای اتصال")
      setIsLoading(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: verificationEmail }),
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess("ایمیل تأیید مجدداً ارسال شد. لطفاً صندوق ورودی خود را بررسی کنید.")
      } else {
        setError(result.error || "خطا در ارسال مجدد ایمیل")
      }
    } catch (error) {
      setError("خطای اتصال. لطفاً دوباره تلاش کنید.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSignup = async () => {
    if (!confirm("آیا مطمئن هستید که می‌خواهید ثبت نام را لغو کنید؟")) {
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/auth/cancel-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: verificationEmail }),
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess("ثبت نام لغو شد. می‌توانید دوباره ثبت نام کنید.")
        setWaitingForVerification(false)
        setVerificationEmail("")
        setEmail("")
        setPassword("")
        setConfirmPassword("")
        setUsername("")
        setFullName("")
      } else {
        setError(result.error || "خطا در لغو ثبت نام")
      }
    } catch (error) {
      setError("خطای اتصال. لطفاً دوباره تلاش کنید.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    if (!mounted) return

    setIsLoading(true)
    setError("")

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams:
            provider === "google"
              ? {
                access_type: "offline",
                prompt: "consent",
              }
              : undefined,
        },
      })

      if (error) {
        setError(`خطا در ورود با ${provider === "google" ? "گوگل" : "گیت‌هاب"}: ${error.message}`)
        setIsLoading(false)
      }
      // Don't set loading to false on success as user will be redirected
    } catch (error: any) {
      console.error("OAuth error:", error)
      setError("خطای اتصال. لطفاً دوباره تلاش کنید.")
      setIsLoading(false)
    }
  }

  if (!mounted || isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#001D51] mx-auto mb-4" />
          <p className="text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#001D51] to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <FileText className="text-white text-3xl" />
          </div>
          <h1 className="text-4xl font-bold text-[#001D51] mb-3 flex items-center justify-center gap-2">
            کاغذ آنلاین
            <Sparkles className="w-6 h-6 text-yellow-500" />
          </h1>
          <p className="text-gray-600 text-lg">پلتفرم حرفه‌ای نوشتن و اشتراک‌گذاری اسناد</p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>میلیون‌ها کاربر</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span>امن</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              <span>سریع</span>
            </div>
          </div>
        </div>

        {/* Waiting for Verification Card */}
        {waitingForVerification ? (
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl text-[#001D51] flex items-center justify-center gap-2">
                <Mail className="w-6 h-6 text-yellow-500" />
                در انتظار تأیید ایمیل
              </CardTitle>
              <CardDescription className="text-base">
                ایمیل شما هنوز تأیید نشده است
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Warning Alert - Only show for existing users waiting for verification */}
              {!isNewUser && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    ایمیلی حاوی لینک تأیید قبلاً برای آدرس <strong>{verificationEmail}</strong> ارسال شده است.
                    لطفاً صندوق ورودی و پوشه اسپم خود را بررسی کنید.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error/Success Messages */}
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleResendConfirmation}
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-[#001D51] to-blue-600 hover:from-[#001D51]/90 hover:to-blue-600/90 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      در حال ارسال...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      ارسال مجدد ایمیل تأیید
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleCancelSignup}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full h-12 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                >
                  لغو ثبت نام
                </Button>
              </div>

              {/* Back to Login */}
              <div className="text-center pt-4">
                <button
                  onClick={() => {
                    setWaitingForVerification(false)
                    setVerificationEmail("")
                    setActiveTab("signin")
                  }}
                  className="text-sm text-[#001D51] hover:underline"
                >
                  بازگشت به صفحه ورود
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Auth Card */
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl text-[#001D51]">خوش آمدید</CardTitle>
              <CardDescription className="text-base">برای ادامه وارد حساب کاربری خود شوید</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* OAuth Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={() => handleOAuthSignIn("google")}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full h-12 text-gray-700 border-gray-300 hover:bg-gray-50 bg-white transition-all duration-200 hover:shadow-md"
                >
                  <Chrome className="w-5 h-5 ml-2 text-blue-500" />
                  ورود سریع با گوگل
                </Button>
                <Button
                  onClick={() => handleOAuthSignIn("github")}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full h-12 text-gray-700 border-gray-300 hover:bg-gray-50 bg-white transition-all duration-200 hover:shadow-md"
                >
                  <Github className="w-5 h-5 ml-2" />
                  ورود با گیت‌هاب
                </Button>
              </div>

              <div className="relative">
                <Separator />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-white px-4 text-sm text-gray-500">یا با ایمیل</span>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-gray-100">
                  <TabsTrigger value="signin" className="text-sm font-medium data-[state=active]:bg-white">
                    ورود
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="text-sm font-medium data-[state=active]:bg-white">
                    ثبت نام
                  </TabsTrigger>
                </TabsList>

                {/* Alerts */}
                {error && (
                  <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mb-4 border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                  </Alert>
                )}

                {/* Sign In Tab */}
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-right font-medium">
                        ایمیل
                      </Label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          id="signin-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="pr-12 h-12 text-right border-gray-300 focus:border-[#001D51] focus:ring-[#001D51]"
                          placeholder="example@email.com"
                          dir="ltr"
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-right font-medium">
                        رمز عبور
                      </Label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pr-12 pl-12 h-12 text-right border-gray-300 focus:border-[#001D51] focus:ring-[#001D51]"
                          placeholder="رمز عبور خود را وارد کنید"
                          dir="ltr"
                          autoComplete="current-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute left-0 top-0 h-12 px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-[#001D51] to-blue-600 hover:from-[#001D51]/90 hover:to-blue-600/90 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          در حال ورود...
                        </>
                      ) : (
                        "ورود به حساب کاربری"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* Sign Up Tab */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-right font-medium">
                        نام کامل
                      </Label>
                      <div className="relative">
                        <User className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          id="fullName"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          className="pr-12 h-12 text-right border-gray-300 focus:border-[#001D51] focus:ring-[#001D51]"
                          placeholder="نام و نام خانوادگی"
                          maxLength={50}
                          autoComplete="name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-right font-medium">
                        نام کاربری
                      </Label>
                      <div className="relative">
                        <span className="absolute right-3 top-3 text-gray-400 text-sm">@</span>
                        <Input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                          required
                          className="pr-8 h-12 text-right border-gray-300 focus:border-[#001D51] focus:ring-[#001D51]"
                          placeholder="username"
                          dir="ltr"
                          maxLength={30}
                          minLength={2}
                          autoComplete="username"
                        />
                      </div>
                      <p className="text-xs text-gray-500 text-right">فقط حروف انگلیسی، اعداد و _ مجاز است</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-right font-medium">
                        ایمیل
                      </Label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          id="signup-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="pr-12 h-12 text-right border-gray-300 focus:border-[#001D51] focus:ring-[#001D51]"
                          placeholder="example@email.com"
                          dir="ltr"
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-right font-medium">
                        رمز عبور
                      </Label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pr-12 pl-12 h-12 text-right border-gray-300 focus:border-[#001D51] focus:ring-[#001D51]"
                          placeholder="حداقل ۸ کاراکتر"
                          dir="ltr"
                          minLength={8}
                          autoComplete="new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute left-0 top-0 h-12 px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 text-right">باید شامل حروف بزرگ، کوچک و عدد باشد</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-right font-medium">
                        تکرار رمز عبور
                      </Label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          id="confirm-password"
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="pr-12 h-12 text-right border-gray-300 focus:border-[#001D51] focus:ring-[#001D51]"
                          placeholder="رمز عبور را دوباره وارد کنید"
                          dir="ltr"
                          minLength={8}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-[#001D51] to-blue-600 hover:from-[#001D51]/90 hover:to-blue-600/90 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          در حال ثبت نام...
                        </>
                      ) : (
                        "ایجاد حساب کاربری"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-sm text-gray-500">
            با ثبت نام، شما با{" "}
            <Link href="/terms" className="text-[#001D51] hover:underline">
              قوانین و مقررات
            </Link>{" "}
            ما موافقت می‌کنید
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              امن
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              سریع
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              جهانی
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
