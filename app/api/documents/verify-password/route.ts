import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { decrypt } from "@/lib/crypto"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })

  try {
    const body = await request.json()
    const { document_id, password } = body

    if (!document_id || !password) {
      return NextResponse.json({ error: "Document ID and password are required" }, { status: 400 })
    }

    // Get document
    const { data: document, error } = await supabase
      .from("documents")
      .select("password, is_public")
      .eq("id", document_id)
      .single()

    if (error || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (!document.is_public) {
      return NextResponse.json({ error: "Document is not public" }, { status: 403 })
    }

    if (!document.password) {
      return NextResponse.json({ valid: true })
    }

    // Decrypt and compare password
    const decryptedPassword = decrypt(document.password)
    const isValid = password === decryptedPassword

    return NextResponse.json({ valid: isValid })
  } catch (error) {
    console.error("Password verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}