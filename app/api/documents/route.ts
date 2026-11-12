import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { encrypt, decrypt } from "@/lib/crypto"
import { cache, CACHE_KEYS } from "@/lib/cache"

export async function GET(request: Request) {
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

    // Check cache first
    const cacheKey = CACHE_KEYS.USER_DOCUMENTS(user.id)
    const cachedDocuments = cache.get(cacheKey)

    if (cachedDocuments) {
      return NextResponse.json({ documents: cachedDocuments })
    }

    const { data: documents, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("order_index", { ascending: true })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Decrypt documents
    const decryptedDocuments =
      documents?.map((doc) => ({
        ...doc,
        title: decrypt(doc.title),
        content: decrypt(doc.content),
      })) || []

    // Cache the result for 2 minutes
    cache.set(cacheKey, decryptedDocuments, 2 * 60 * 1000)

    return NextResponse.json({ documents: decryptedDocuments })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    const body = await request.json()
    const { title, document_id, content, is_public } = body

    if (!title || !document_id) {
      return NextResponse.json({ error: "Title and document_id are required" }, { status: 400 })
    }

    // Check if document_id already exists for this user
    const { data: existingDoc } = await supabase
      .from("documents")
      .select("id")
      .eq("user_id", user.id)
      .eq("document_id", document_id)
      .single()

    if (existingDoc) {
      return NextResponse.json({ error: "شناسه سند قبلاً استفاده شده است" }, { status: 400 })
    }

    // Encrypt sensitive data
    const encryptedTitle = encrypt(title)
    const encryptedContent = encrypt(content || "")

    const { data: document, error } = await supabase
      .from("documents")
      .insert({
        title: encryptedTitle,
        document_id,
        content: encryptedContent,
        is_public: is_public || false,
        user_id: user.id,
        order_index: 0,
      })
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
    }

    // Invalidate user documents cache
    cache.delete(CACHE_KEYS.USER_DOCUMENTS(user.id))

    return NextResponse.json({ document: decryptedDocument })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
