import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Dashboard from "@/components/dashboard/dashboard"
import { decrypt } from "@/lib/crypto"

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore as any })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth")
  }

  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()

    if (profileError) {
      console.error("Profile error:", profileError)
      redirect("/auth")
    }

    // Get user documents
    const { data: documents, error: documentsError } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", session.user.id)
      .order("order_index", { ascending: true })

    if (documentsError) {
      console.error("Documents error:", documentsError)
    }

    // Decrypt documents for dashboard display
    const decryptedDocuments = documents?.map((doc) => ({
      ...doc,
      title: decrypt(doc.title),
      content: decrypt(doc.content),
      password: doc.password ? decrypt(doc.password) : undefined,
    })) || []

    return <Dashboard user={session.user} profile={profile} documents={decryptedDocuments} />
  } catch (error) {
    console.error("Dashboard error:", error)
    redirect("/auth")
  }
}
