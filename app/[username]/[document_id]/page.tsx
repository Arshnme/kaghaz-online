import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import PublicDocumentView from "@/components/public/public-document-view"
import { decrypt } from "@/lib/crypto"

interface PageProps {
  params: Promise<{
    username: string
    document_id: string
  }>
}

export default async function PublicDocumentPage({ params }: PageProps) {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore as any })
  const { username, document_id } = await params

  try {
    // Get user profile by username
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single()

    if (profileError || !profile) {
      notFound()
    }

    // Get document by document_id and user_id
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("document_id", document_id)
      .eq("user_id", profile.id)
      .single()

    if (documentError || !document) {
      notFound()
    }

    // Get current session to check for ownership
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Check if document is public or user is owner
    if (!document.is_public && session?.user?.id !== document.user_id) {
      notFound()
    }

    // Decrypt document data
    const decryptedDocument = {
      ...document,
      title: decrypt(document.title),
      content: decrypt(document.content),
      password: document.password ? decrypt(document.password) : null,
    }

    return (
      <PublicDocumentView
        document={decryptedDocument}
        profile={profile}
      />
    )
  } catch (error) {
    console.error("Error loading public document:", error)
    notFound()
  }
}

export async function generateMetadata({ params }: PageProps) {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore as any })
  const { username, document_id } = await params

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single()

    if (!profile) {
      return {
        title: "سند یافت نشد",
        description: "سند مورد نظر یافت نشد"
      }
    }

    const { data: document } = await supabase
      .from("documents")
      .select("*")
      .eq("document_id", document_id)
      .eq("user_id", profile.id)
      .single()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!document || (!document.is_public && session?.user?.id !== document.user_id)) {
      return {
        title: "سند یافت نشد",
        description: "سند مورد نظر یافت نشد"
      }
    }

    const title = decrypt(document.title)
    const content = decrypt(document.content)
    const description = content.replace(/<[^>]*>/g, '').substring(0, 160) + '...'

    return {
      title: `${title} - ${profile.full_name}`,
      description: description,
      openGraph: {
        title: `${title} - ${profile.full_name}`,
        description: description,
        type: 'article',
        authors: [profile.full_name],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} - ${profile.full_name}`,
        description: description,
      }
    }
  } catch (error) {
    return {
      title: "سند یافت نشد",
      description: "سند مورد نظر یافت نشد"
    }
  }
}