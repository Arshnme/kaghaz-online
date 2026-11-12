/**
 * Analytics collection endpoint.
 *
 * This is a stub. It currently logs the event to stdout and returns success;
 * nothing is persisted and no client in this application calls it. Wiring it up
 * means adding an events table and deciding how to treat the `user_id` in the
 * request body, which is caller-supplied and therefore only trustworthy when a
 * session is present.
 */
import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })
    const { event, properties, user_id } = await request.json()

    // Get user info if not provided
    let userId = user_id
    if (!userId) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      userId = session?.user?.id
    }

    // Get client info
    const userAgent = request.headers.get("user-agent") || ""
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    // Log analytics
    // Placeholder for logging analytics logic
    console.log({ event, properties, userId, userAgent, ip })

    return NextResponse.json({ status: "success" })
  } catch (error) {
    console.error("Error logging analytics:", error)
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
