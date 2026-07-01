import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieItem = { name: string; value: string; options: CookieOptions };

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(items: CookieItem[]) {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          items.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    },
  );

  // getSession() decodes JWT locally — no network call, no hang.
  // getUser() makes a live Supabase API call and can fail/slow causing redirect loops.
  // RLS on Supabase enforces actual data security; middleware just guards the route.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const { pathname } = request.nextUrl;

  // Redirect old standalone routes → under /dashboard
  if (pathname === '/paper-trading' || pathname.startsWith('/paper-trading/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace('/paper-trading', '/dashboard/paper-trading');
    return NextResponse.redirect(url);
  }
  if (pathname === '/signals' || pathname.startsWith('/signals/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace('/signals', '/dashboard/signals');
    return NextResponse.redirect(url);
  }
  if (pathname === '/algo-builder' || pathname.startsWith('/algo-builder/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace('/algo-builder', '/dashboard/algo-builder');
    return NextResponse.redirect(url);
  }

  const PROTECTED = ['/dashboard'];
  const isProtected = PROTECTED.some(p => pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    // preserve intended destination so after login we redirect back
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === '/sign-in') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
