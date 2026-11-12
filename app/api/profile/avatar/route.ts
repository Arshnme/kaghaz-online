import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      return NextResponse.json({ error: "فایل انتخاب نشده است" }, { status: 400 })
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "حجم فایل نباید بیشتر از ۵ مگابایت باشد" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "فقط فایل‌های تصویری مجاز هستند" }, { status: 400 })
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    // Upload to Supabase Storage using Admin client to bypass RLS
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json({ error: "خطا در آپلود فایل" }, { status: 400 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    // Get current profile to find old avatar
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single()

    // Update profile with new avatar URL
    const { data: profile, error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("Database update error:", updateError)
      // Try to delete the uploaded file if database update fails
      await supabaseAdmin.storage.from('avatars').remove([fileName])
      return NextResponse.json({ error: "خطا در به‌روزرسانی پروفایل" }, { status: 400 })
    }

    // Delete old avatar if exists and different
    if (currentProfile?.avatar_url) {
      const oldUrl = currentProfile.avatar_url
      // Extract path from URL (assuming standard Supabase storage URL format)
      // Format: .../storage/v1/object/public/avatars/folder/file.ext
      const pathParts = oldUrl.split('/avatars/')
      if (pathParts.length > 1) {
        const oldPath = pathParts[1]
        if (oldPath && oldPath !== fileName) {
          await supabaseAdmin.storage.from('avatars').remove([oldPath])
        }
      }
    }



    return NextResponse.json({
      profile,
      avatar_url: publicUrl,
      message: "عکس پروفایل با موفقیت آپلود شد"
    })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
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

    // Get current profile to find avatar
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single()

    if (currentProfile?.avatar_url) {
      const oldUrl = currentProfile.avatar_url
      const pathParts = oldUrl.split('/avatars/')
      if (pathParts.length > 1) {
        const oldPath = pathParts[1]
        if (oldPath) {
          await supabaseAdmin.storage.from('avatars').remove([oldPath])
        }
      }
    }

    // Update profile to remove avatar_url
    const { data: profile, error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("Database update error:", updateError)
      return NextResponse.json({ error: "خطا در حذف عکس پروفایل" }, { status: 400 })
    }

    return NextResponse.json({
      profile,
      message: "عکس پروفایل با موفقیت حذف شد"
    })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}