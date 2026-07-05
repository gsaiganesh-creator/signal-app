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
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/`);
}
