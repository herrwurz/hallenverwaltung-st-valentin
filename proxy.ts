import NextAuth, { type NextAuthRequest } from "next-auth";
import type { NextFetchEvent, NextRequest } from "next/server";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);
const authProxy = auth((request: NextAuthRequest, event: NextFetchEvent) => {
  void request;
  void event;
});

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return authProxy(request, event);
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*", "/dashboard/:path*"],
};
