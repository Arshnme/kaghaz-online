import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { decrypt } from "@/lib/crypto"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })
  const { id } = await params

  try {
    // Get file record
    const { data: file, error } = await supabase.from("document_files").select("*").eq("id", id).single()

    if (error || !file) {
      return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 })
    }

    // Check if user has access to the document
    const { data: document } = await supabase
      .from("documents")
      .select("is_public, user_id, password")
      .eq("id", file.document_id)
      .single()

    if (!document) {
      return NextResponse.json({ error: "سند یافت نشد" }, { status: 404 })
    }

    // Check access permissions
    const {
      data: { session },
    } = await supabase.auth.getSession()

    let hasAccess = false

    // Owner always has access
    if (session && session.user.id === document.user_id) {
      hasAccess = true
    }
    // Public document access
    else if (document.is_public) {
      // If document has password, check it from query params
      if (document.password) {
        const url = new URL(request.url)
        const providedPassword = url.searchParams.get('password')
        const decryptedPassword = decrypt(document.password)

        if (providedPassword === decryptedPassword) {
          hasAccess = true
        }
      } else {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    }

    try {
      // Get file from storage
      const { data: fileData, error: storageError } = await supabase.storage
        .from("document-files")
        .download(file.file_url)

      if (storageError) {
        console.error("Storage download error:", storageError)
        return NextResponse.json({ error: "فایل در فضای ذخیره‌سازی یافت نشد" }, { status: 404 })
      }

      // Decrypt filename for display
      const originalFilename = decrypt(file.original_filename)

      // Return file with proper headers
      const arrayBuffer = await fileData.arrayBuffer()

      return new NextResponse(arrayBuffer, {
        headers: {
          "Content-Type": file.mime_type || "application/octet-stream",
          "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(originalFilename)}`,
          "Cache-Control": "private, max-age=3600",
          "Content-Length": file.file_size.toString(),
        },
      })
    } catch (storageError) {
      console.error("Storage operation error:", storageError)
      return NextResponse.json({ error: "خطا در دریافت فایل" }, { status: 500 })
    }
  } catch (error) {
    console.error("File serve error:", error)
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })
  const { id } = await params

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get file record and verify ownership
    const { data: file, error: fileError } = await supabase
      .from("document_files")
      .select("*, documents!inner(user_id)")
      .eq("id", id)
      .single()

    if (fileError || !file) {
      return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 })
    }

    // Check if user owns the document
    if (file.documents.user_id !== user.id) {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("document-files")
      .remove([file.file_url])

    if (storageError) {
      console.error("Storage delete error:", storageError)
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("document_files")
      .delete()
      .eq("id", id)

    if (dbError) {
      console.error("Database delete error:", dbError)
      return NextResponse.json({ error: "خطا در حذف فایل" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("File delete error:", error)
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 })
  }
}
