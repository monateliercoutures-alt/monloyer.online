import { NextResponse, type NextRequest } from 'next/server';

/**
 * Journal de diagnostic (activable par `PREVIEW_DIAGNOSTICS=1`).
 *
 * Il ne sert qu'à comprendre pourquoi une session « saute » dans un aperçu
 * intégré : on y voit le contexte de navigation (`sec-fetch-site`), le protocole
 * transmis par le proxy et la présence réelle des cookies sur chaque requête.
 */
export function middleware(request: NextRequest) {
  if (process.env.PREVIEW_DIAGNOSTICS !== '1') return NextResponse.next();

  const headers = request.headers;
  const cookies = request.cookies.getAll().map((cookie) => cookie.name).join(',') || '-';
  console.log(
    `[diag] ${request.method} ${request.nextUrl.pathname}` +
      ` | host=${headers.get('host') ?? '-'}` +
      ` | proto=${headers.get('x-forwarded-proto') ?? '-'}` +
      ` | site=${headers.get('sec-fetch-site') ?? '-'}` +
      ` | mode=${headers.get('sec-fetch-mode') ?? '-'}` +
      ` | cookies=${cookies}`,
  );

  return NextResponse.next();
}

export const config = {
  // On ignore les fichiers statiques et les ressources internes de Next.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
