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

    // Find the user first
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

    // For unconfirmed users, we need to use a different approach
    // Since we can't directly resend confirmation with admin client,
    // we'll delete and recreate the user with the same data
    const userData = user.user_metadata

    // Delete the existing unconfirmed user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    
    if (deleteError) {
      console.error("Error deleting user for resend:", deleteError)
      return NextResponse.json(
        { error: "خطا در ارسال مجدد ایمیل تأیید" },
        { status: 500 }
      )
    }

    // Create the user again to trigger confirmation email
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      email_confirm: false, // This will send confirmation email
      user_metadata: userData
    })

    if (createError) {
      console.error("Resend confirmation error:", createError)
      return NextResponse.json(
        { error: "خطا در ارسال مجدد ایمیل تأیید" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "ایمیل تأیید مجدداً ارسال شد"
    })

  } catch (error) {
    console.error("Resend confirmation error:", error)
    return NextResponse.json(
      { error: "خطا در ارسال مجدد ایمیل تأیید" },
      { status: 500 }
    )
  }
}