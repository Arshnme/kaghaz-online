import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create admin client for deleting user
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

export async function DELETE(request: Request) {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })

    try {
        const { password } = await request.json()

        if (!password) {
            return NextResponse.json({ error: "رمز عبور الزامی است" }, { status: 400 })
        }

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Verify password by attempting to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email!,
            password: password,
        })

        if (signInError) {
            return NextResponse.json({ error: "رمز عبور اشتباه است" }, { status: 400 })
        }

        // Delete user from Supabase Auth
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

        if (deleteError) {
            console.error("Delete user error:", deleteError)
            return NextResponse.json({ error: "خطا در حذف حساب کاربری" }, { status: 400 })
        }

        // Sign out the user
        await supabase.auth.signOut()

        return NextResponse.json({ message: "حساب کاربری با موفقیت حذف شد" })
    } catch (error) {
        console.error("Server error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
