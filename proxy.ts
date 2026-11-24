import { NextResponse, type NextRequest } from 'next/server';
import { self } from '@neup/logica/account/self';

const AUTH_START_URL = 'https://neupgroup.com/account/auth/start';

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('auth')?.value ?? null;
  if (!token) {
    return NextResponse.redirect(AUTH_START_URL);
  }

  const authentication = await self.isAuthenticated('local', token);

  const payload = 'payload' in authentication ? authentication.payload : undefined;
  const isGuest = Boolean(payload?.guest === true || payload?.guest === 1);

  if (!authentication.authenticated || isGuest) {
    return NextResponse.redirect(AUTH_START_URL);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Public API, bridge, Next.js and static asset routes
    // must not require an application session.
    '/((?!api|bridge|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|otf|eot|pdf|txt|xml)$).*)',
  ],
};
