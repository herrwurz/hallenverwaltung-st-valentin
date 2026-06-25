import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.email().transform((email) => email.trim().toLowerCase()),
  password: z.string().min(1),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) {
          console.info("Authorize: credentials parsing failed", { hasEmail: typeof credentials?.email === "string" });
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: {
            roles: {
              include: { role: true },
            },
          },
        });

        console.info("Authorize: user lookup", {
          found: Boolean(user),
          isActive: Boolean(user?.isActive),
          hasPasswordHash: Boolean(user?.passwordHash),
        });

        if (!user?.isActive || !user.passwordHash) {
          return null;
        }

        const passwordMatches = await compare(parsed.data.password, user.passwordHash);

        console.info("Authorize: passwordMatches", { email: parsed.data.email, matches: passwordMatches });

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          roles: user.roles.map(({ role }) => role.code),
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.roles = user.roles;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.userId === "string" ? token.userId : "";
        session.user.roles = Array.isArray(token.roles)
          ? token.roles.filter((role): role is string => typeof role === "string")
          : [];
      }

      return session;
    },
  },
});
