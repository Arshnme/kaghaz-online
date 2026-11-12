import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { validateUsername } from "@/lib/username-validation"

export async function POST(request: Request) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json(
        { error: "نام کاربری الزامی است" },
        { status: 400 }
      )
    }

    // اعتبارسنجی فرمت و رزرو بودن
    const validation = validateUsername(username)
    if (!validation.isValid) {
      return NextResponse.json(
        { available: false, error: validation.error },
        { status: 200 }
      )
    }

    // چک کردن در دیتابیس
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })

    const { data: existingUser } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        {
          available: false,
          error: "این نام کاربری قبلاً استفاده شده است"
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { available: true },
      { status: 200 }
    )

  } catch (error) {
    console.error("Username check error:", error)
    return NextResponse.json(
      { error: "خطا در بررسی نام کاربری" },
      { status: 500 }
    )
  }
}