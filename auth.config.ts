import type { NextAuthConfig } from "next-auth";

export default {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const protectedArea =
        nextUrl.pathname.startsWith("/admin") ||
        nextUrl.pathname.startsWith("/portal") ||
        nextUrl.pathname.startsWith("/dashboard");

      if (protectedArea) {
        return Boolean(auth?.user);
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
