import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect, notFound } from "next/navigation"
import Editor from "@/components/editor/editor"
import { decrypt } from "@/lib/crypto"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditorPage({ params }: PageProps) {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore as any })
  const { id } = await params

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth")
  }

  try {
    // Get document
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (documentError || !document) {
      notFound()
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()

    if (profileError || !profile) {
      redirect("/auth")
    }

    // Decrypt document data for editor
    const decryptedDocument = {
      ...document,
      title: decrypt(document.title),
      content: decrypt(document.content),
      password: document.password ? decrypt(document.password) : undefined,
    }

    return <Editor document={decryptedDocument} profile={profile} />
  } catch (error) {
    console.error("Error loading editor:", error)
    notFound()
  }
}
