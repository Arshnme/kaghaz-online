import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"

export default async function UserMainPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore as any })
  const { username } = await params

  // Get user by username
  const { data: profile } = await supabase.from("profiles").select("*").eq("username", username).single()

  if (!profile) {
    notFound()
  }

  // Get main document
  const { data: mainDocument } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", profile.id)
    .eq("is_main", true)
    .single()

  if (!mainDocument) {
    notFound()
  }

  // Redirect to the main document
  redirect(`/${username}/${mainDocument.document_id}`)
}
