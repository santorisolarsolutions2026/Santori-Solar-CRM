import { NextResponse, NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const tokenCookie = request.cookies.get('token');
  const token = tokenCookie?.value;

  const url = request.nextUrl.clone();
  const { pathname } = url;

  // Paths requiring authentication
  const protectedPaths = ['/dashboard', '/leads', '/team', '/reports', '/orders'];
  const isPathProtected = protectedPaths.some((path) => pathname.startsWith(path));

  // Paths for guests only
  const isGuestPath = pathname.startsWith('/login');

  if (isPathProtected && !token) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isGuestPath && token) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
