import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") ?? "/dashboard"

  if (code) {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Auth callback error:", error)
        return NextResponse.redirect(`${requestUrl.origin}/?error=auth_callback_error`)
      }

      if (data.user) {
        // Check if profile exists, create if not
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .single()

        if (!existingProfile) {
          // Create profile for OAuth user
          // Use the username from user_metadata if available (from signup form)
          let username = data.user.user_metadata?.username ||
            data.user.user_metadata?.preferred_username ||
            data.user.user_metadata?.user_name;

          // If no username from metadata, generate one from email
          if (!username) {
            username = data.user.email?.split("@")[0] || `user_${data.user.id.substring(0, 8)}`;
          }

          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || "کاربر",
              username: username,
              avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
            })

          if (profileError) {
            console.error("Profile creation error:", profileError)
          }
        }
      }

      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    } catch (error) {
      console.error("Auth exchange error:", error)
      return NextResponse.redirect(`${requestUrl.origin}/?error=auth_callback_error`)
    }
  }

  // No code present, redirect to error
  return NextResponse.redirect(`${requestUrl.origin}/?error=no_code`)
}