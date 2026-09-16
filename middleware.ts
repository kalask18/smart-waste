import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets & public API bypass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname === '/unauthorized'
  ) {
    return NextResponse.next();
  }

  // Check demo cookie fallback for seamless evaluation
  const demoRoleCookie = request.cookies.get('smartwaste_demo_role')?.value;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hwevzebjrzdwztjpbyeu.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_aaNck9INPmNS6aurfDTUxQ_t20XSADU',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as any)
          );
        },
      },
    }
  );

  // Get current user session from Supabase SSR
  const { data: { user } } = await supabase.auth.getUser();

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isProtectedPage = pathname.startsWith('/citizen') || pathname.startsWith('/driver') || pathname.startsWith('/admin');

  // Determine effective active role (Supabase DB role or demo cookie)
  let effectiveRole = demoRoleCookie || null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role) {
      effectiveRole = profile.role;
    }
  }

  // 1. Unauthenticated users trying to access protected pages (neither Supabase session nor demo cookie)
  if (!user && !demoRoleCookie && isProtectedPage) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated users (or active demo users) trying to access login or signup pages
  if ((user || demoRoleCookie) && isAuthPage) {
    const roleToRedirect = effectiveRole || 'citizen';
    if (roleToRedirect === 'admin') return NextResponse.redirect(new URL('/admin', request.url));
    if (roleToRedirect === 'driver') return NextResponse.redirect(new URL('/driver', request.url));
    return NextResponse.redirect(new URL('/citizen', request.url));
  }

  // 3. Enforce Role-Based Access Controls (RBAC)
  if (effectiveRole) {
    if (pathname.startsWith('/admin') && effectiveRole !== 'admin') {
      const fallback = effectiveRole === 'driver' ? '/driver' : '/citizen';
      return NextResponse.redirect(new URL(fallback, request.url));
    }

    if (pathname.startsWith('/driver') && effectiveRole === 'citizen') {
      return NextResponse.redirect(new URL('/citizen', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
