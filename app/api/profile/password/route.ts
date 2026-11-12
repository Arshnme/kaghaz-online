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
    const { current_password, new_password } = body

    // Validate required fields
    if (!current_password || current_password.trim().length < 1) {
      return NextResponse.json({ error: "رمز عبور فعلی الزامی است" }, { status: 400 })
    }

    if (!new_password || new_password.trim().length < 8) {
      return NextResponse.json({ error: "رمز عبور جدید باید حداقل ۸ کاراکتر باشد" }, { status: 400 })
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: current_password,
    })

    if (signInError) {
      return NextResponse.json({ error: "رمز عبور فعلی اشتباه است" }, { status: 400 })
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password,
    })

    if (updateError) {
      console.error("Password update error:", updateError)
      return NextResponse.json({ error: "خطا در تغییر رمز عبور" }, { status: 400 })
    }

    return NextResponse.json({
      message: "رمز عبور با موفقیت تغییر کرد"
    })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}