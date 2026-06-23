import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const next  = searchParams.get('next') ?? '/dashboard';
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(error)}`);
  }

  if (code) {
    // Create redirect response FIRST — cookies are set directly on it,
    // not on a separate response that gets discarded. This is the fix
    // for the double sign-in: the previous approach used createClient()
    // from next/headers whose setAll() cookies don't survive on a
    // redirect response created separately.
    const redirectTo = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(items: { name: string; value: string; options: CookieOptions }[]) {
            items.forEach(({ name, value, options }) => {
              redirectTo.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) return redirectTo;
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`);
}
