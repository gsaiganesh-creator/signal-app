import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Next.js prefetches <Link> hrefs via GET with this header — bail out so a
  // stray prefetch can never sign the user out accidentally.
  if (request.headers.get('Next-Router-Prefetch')) {
    return new NextResponse(null, { status: 204 });
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  // NOT new URL(request.url).origin — behind this app's reverse proxy that
  // resolves to the container's internal Docker hostname, not the public
  // domain, producing an unreachable redirect for real users.
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/`);
}
