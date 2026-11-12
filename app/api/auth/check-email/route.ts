import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          // Increase timeout to 30 seconds
          signal: AbortSignal.timeout(30000)
        })
      }
    }
  }
)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "ایمیل الزامی است" },
        { status: 400 }
      )
    }

    // Check if Supabase URL is accessible
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase environment variables")
      return NextResponse.json(
        { error: "تنظیمات سرور ناقص است" },
        { status: 500 }
      )
    }

    // Use service role to check auth.users table
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      console.error("Error checking users:", error)
      
      // Check if it's a connection error
      if (error.message?.includes('fetch failed') || error.message?.includes('timeout')) {
        return NextResponse.json(
          { error: "مشکل در اتصال به سرور. لطفا دوباره تلاش کنید." },
          { status: 503 }
        )
      }
      
      return NextResponse.json(
        { error: "خطا در بررسی ایمیل" },
        { status: 500 }
      )
    }

    const existingUser = users.users?.find(
      user => user.email?.toLowerCase() === email.toLowerCase().trim()
    )

    if (existingUser) {
      return NextResponse.json({
        exists: true,
        emailConfirmed: !!existingUser.email_confirmed_at,
        userId: existingUser.id
      })
    }

    return NextResponse.json({
      exists: false
    })

  } catch (error) {
    console.error("Check email error:", error)
    return NextResponse.json(
      { error: "خطا در بررسی ایمیل" },
      { status: 500 }
    )
  }
}