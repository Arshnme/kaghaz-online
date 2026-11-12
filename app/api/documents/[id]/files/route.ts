import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { encrypt, decrypt } from "@/lib/crypto"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    // Verify document ownership
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "فایلی انتخاب نشده است" }, { status: 400 })
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: "حجم فایل بیش از حد مجاز است (حداکثر 50 مگابایت)" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip', 'application/x-rar-compressed',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "نوع فایل پشتیبانی نمی‌شود" }, { status: 400 })
    }

    // Generate unique filename
    const fileId = uuidv4()
    const fileExtension = file.name.split(".").pop() || 'bin'
    const fileName = `${user.id}/${id}/${fileId}.${fileExtension}`

    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("document-files")
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error("Storage upload error:", uploadError)
        return NextResponse.json({ error: "خطا در آپلود فایل" }, { status: 500 })
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("document-files")
        .getPublicUrl(fileName)

      // Save encrypted file info to database
      const { data: fileRecord, error: fileError } = await supabase
        .from("document_files")
        .insert({
          id: fileId,
          document_id: id,
          original_filename: encrypt(file.name),
          file_url: fileName, // Store the storage path, not the public URL
          file_size: file.size,
          mime_type: file.type,
          user_id: user.id,
        })
        .select()
        .single()

      if (fileError) {
        console.error("Database error:", fileError)
        // Clean up uploaded file
        await supabase.storage.from("document-files").remove([fileName])
        return NextResponse.json({ error: "خطا در ذخیره اطلاعات فایل" }, { status: 500 })
      }

      return NextResponse.json({
        file: {
          id: fileRecord.id,
          filename: file.name,
          url: `/api/files/${fileRecord.id}`, // Use our secure API endpoint
          publicUrl: publicUrl, // For direct access if needed
          size: fileRecord.file_size,
          type: fileRecord.mime_type,
        },
      })
    } catch (storageError) {
      console.error("Storage operation error:", storageError)
      return NextResponse.json({ error: "خطا در آپلود فایل" }, { status: 500 })
    }
  } catch (error) {
    console.error("File upload error:", error)
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    // Verify document ownership
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Get all files for this document
    const { data: files, error: filesError } = await supabase
      .from("document_files")
      .select("*")
      .eq("document_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (filesError) {
      console.error("Database error:", filesError)
      return NextResponse.json({ error: "خطا در دریافت فایل‌ها" }, { status: 500 })
    }

    // Decrypt filenames and return file list
    const decryptedFiles = files?.map(file => ({
      id: file.id,
      filename: decrypt(file.original_filename),
      url: `/api/files/${file.id}`,
      size: file.file_size,
      type: file.mime_type,
      created_at: file.created_at
    })) || []

    return NextResponse.json({ files: decryptedFiles })
  } catch (error) {
    console.error("Get files error:", error)
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 })
  }
}
