import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { signToken } from "@/lib/jwt"
import { createClient } from "@supabase/supabase-js"

// Create admin client for bypassing RLS during registration
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })

  try {
    const { email, password, username, fullName } = await request.json()

    // Validate input
    if (!email || !password || !username || !fullName) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Check username availability
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 })
    }

    // Sign up with Supabase
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          username: username.toLowerCase().trim(),
        },
      },
    })

    // Create profile record using admin client to bypass RLS
    if (data.user && !error) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: data.user.id,
          username: username.toLowerCase().trim(),
          full_name: fullName.trim(),
          email: email.toLowerCase().trim(),
          updated_at: new Date().toISOString(),
        })

      if (profileError) {
        console.error("Profile creation error:", profileError)
        // If profile creation fails, we should clean up the auth user
        // Use admin client for deletion as well
        await supabaseAdmin.auth.admin.deleteUser(data.user.id)
        return NextResponse.json({ error: "خطا در ایجاد پروفایل کاربری" }, { status: 400 })
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Generate JWT token
    const token = signToken({
      userId: data.user?.id,
      email: data.user?.email,
    })

    const response = NextResponse.json({
      user: data.user,
      session: data.session,
      token,
    })

    // Set secure HTTP-only cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
