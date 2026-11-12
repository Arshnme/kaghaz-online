import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { encrypt, decrypt } from "@/lib/crypto"
import { cache, CACHE_KEYS } from "@/lib/cache"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })
  const { id } = await params

  try {
    const { data: document, error } = await supabase.from("documents").select("*").eq("id", id).single()

    if (error || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Decrypt document
    const decryptedDocument = {
      ...document,
      title: decrypt(document.title),
      content: decrypt(document.content),
    }

    return NextResponse.json({ document: decryptedDocument })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await request.json()
    const updates: any = { updated_at: new Date().toISOString() }

    // Encrypt sensitive fields
    if (body.title) {
      updates.title = encrypt(body.title)
    }
    if (body.content !== undefined) {
      updates.content = encrypt(body.content)
    }
    if (body.password !== undefined) {
      // If password is empty string or null, set to null (remove password)
      updates.password = body.password && body.password.trim() ? encrypt(body.password.trim()) : null
    }

    // Non-sensitive fields
    if (body.is_public !== undefined) updates.is_public = body.is_public
    if (body.publish_to_profile !== undefined) updates.publish_to_profile = body.publish_to_profile
    if (body.is_main !== undefined) updates.is_main = body.is_main
    if (body.order_index !== undefined) updates.order_index = body.order_index

    const { data: document, error } = await supabase
      .from("documents")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Return decrypted document
    const decryptedDocument = {
      ...document,
      title: decrypt(document.title),
      content: decrypt(document.content),
      password: document.password ? decrypt(document.password) : undefined,
    }

    // Invalidate caches
    cache.delete(CACHE_KEYS.USER_DOCUMENTS(user.id))
    cache.delete(CACHE_KEYS.DOCUMENT(id))

    return NextResponse.json({ document: decryptedDocument })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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

    const { error } = await supabase.from("documents").delete().eq("id", id).eq("user_id", user.id)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Invalidate caches
    cache.delete(CACHE_KEYS.USER_DOCUMENTS(user.id))
    cache.delete(CACHE_KEYS.DOCUMENT(id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
