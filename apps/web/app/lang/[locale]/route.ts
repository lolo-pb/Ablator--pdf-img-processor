import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isLocale, localeCookieName } from "../../../lib/i18n";

export async function GET(
  request: Request,
  context: { params: Promise<{ locale: string }> },
) {
  const { locale } = await context.params;
  const redirectTo = new URL(request.url).searchParams.get("redirectTo") ?? "/";
  const response = NextResponse.redirect(new URL(redirectTo, request.url));

  if (isLocale(locale)) {
    const store = await cookies();
    store.set(localeCookieName, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

