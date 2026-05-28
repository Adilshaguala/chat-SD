import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = "/auth/login"
  redirectUrl.search = ""

  return NextResponse.redirect(redirectUrl)
}
