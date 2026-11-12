import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import AuthPage from "@/components/auth/auth-page"

export default async function HomePage() {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore as any })

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      redirect("/dashboard")
    }
  } catch (error) {
    console.error("Session check error:", error)
  }

  return <AuthPage />
}
