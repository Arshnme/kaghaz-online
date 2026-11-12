import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import UserProfile from "@/components/public/user-profile"
import { decrypt } from "@/lib/crypto"

interface PageProps {
  params: Promise<{
    username: string
  }>
}

export default async function UserProfilePage({ params }: PageProps) {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore as any })
  const { username } = await params

  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single()

    if (profileError || !profile) {
      notFound()
    }

    // Get current session to check if this is the profile owner
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const isOwner = session?.user?.id === profile.id

    // Get published documents for this user
    const { data: documents, error: documentsError } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", profile.id)
      .eq("is_public", true)
      .eq("publish_to_profile", true)
      .order("updated_at", { ascending: false })

    if (documentsError) {
      console.error("Documents error:", documentsError)
    }

    // Decrypt documents
    const decryptedDocuments = documents?.map((doc) => ({
      ...doc,
      title: decrypt(doc.title),
      content: decrypt(doc.content),
    })) || []

    return (
      <UserProfile
        profile={profile}
        documents={decryptedDocuments}
        isOwner={isOwner}
        currentUser={session?.user || null}
      />
    )
  } catch (error) {
    console.error("Profile page error:", error)
    notFound()
  }
}