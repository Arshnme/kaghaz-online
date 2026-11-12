import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function PUT(request: Request) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { new_username, current_password } = body

    // Validate required fields
    if (!new_username || new_username.trim().length < 3) {
      return NextResponse.json({ error: "نام کاربری باید حداقل ۳ کاراکتر باشد" }, { status: 400 })
    }

    if (!current_password || current_password.trim().length < 1) {
      return NextResponse.json({ error: "رمز عبور فعلی الزامی است" }, { status: 400 })
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_]+$/
    if (!usernameRegex.test(new_username.trim())) {
      return NextResponse.json({ error: "نام کاربری فقط می‌تواند شامل حروف انگلیسی کوچک، اعداد و _ باشد" }, { status: 400 })
    }

    if (new_username.trim().length > 30) {
      return NextResponse.json({ error: "نام کاربری نباید بیشتر از ۳۰ کاراکتر باشد" }, { status: 400 })
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: current_password,
    })

    if (signInError) {
      return NextResponse.json({ error: "رمز عبور فعلی اشتباه است" }, { status: 400 })
    }

    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", new_username.trim())
      .neq("id", user.id)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: "این نام کاربری قبلاً استفاده شده است" }, { status: 400 })
    }

    // Update username
    const { data: profile, error } = await supabase
      .from("profiles")
      .update({
        username: new_username.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      profile,
      username: profile.username,
      message: "نام کاربری با موفقیت تغییر کرد"
    })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}