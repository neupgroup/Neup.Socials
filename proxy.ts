import { NextResponse, type NextRequest } from 'next/server';
import { self } from '#/logica/account/self';

const AUTH_START_URL = 'https://neupgroup.com/account/auth/start';

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_account')?.value ?? null;
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
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
