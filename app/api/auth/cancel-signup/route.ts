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

    // Find user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error("Error listing users:", listError)
      return NextResponse.json(
        { error: "خطا در یافتن کاربر" },
        { status: 500 }
      )
    }

    const user = users.users?.find(
      u => u.email?.toLowerCase() === email.toLowerCase().trim()
    )

    if (!user) {
      return NextResponse.json(
        { error: "کاربر یافت نشد" },
        { status: 404 }
      )
    }

    // Delete user from auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error("Error deleting user:", deleteError)
      return NextResponse.json(
        { error: "خطا در حذف کاربر" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "ثبت نام لغو شد"
    })

  } catch (error) {
    console.error("Cancel signup error:", error)
    return NextResponse.json(
      { error: "خطا در لغو ثبت نام" },
      { status: 500 }
    )
  }
}