import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { Database } from "../../../supabase/types";
import { getSupabaseConfig } from "./config";

const AUTH_ROUTES = ["/auth/login", "/auth/callback"];

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

function toSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/";
  }

  return nextPath;
}

export async function updateSession(request: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const authRoute = isAuthRoute(pathname);

  if (!user && !authRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.searchParams.set("next", toSafeNextPath(`${pathname}${search}`));
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/auth/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
