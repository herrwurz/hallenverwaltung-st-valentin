"use server";

import { compare } from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getInactiveLoginMessage(emailInput: FormDataEntryValue | null, passwordInput: FormDataEntryValue | null) {
  const email = String(emailInput ?? "").trim().toLowerCase();
  const password = String(passwordInput ?? "");

  if (!email || !password) {
    return undefined;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      isActive: true,
      passwordHash: true,
      organizationMemberships: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          organization: {
            select: {
              name: true,
              status: true,
              blockedReason: true,
            },
          },
        },
      },
    },
  });

  if (!user || user.isActive || !user.passwordHash || !(await compare(password, user.passwordHash))) {
    return undefined;
  }

  const blockedOrganization = user.organizationMemberships
    .map((membership) => membership.organization)
    .find((organization) => organization.status === "BLOCKED" || organization.status === "INACTIVE");

  if (blockedOrganization) {
    const reason = blockedOrganization.blockedReason ? ` Grund: ${blockedOrganization.blockedReason}` : "";
    return `Der Login ist gesperrt, weil die Organisation "${blockedOrganization.name}" ${blockedOrganization.status === "BLOCKED" ? "gesperrt" : "inaktiv"} ist.${reason}`;
  }

  return "Dieser Benutzer ist inaktiv. Bitte wenden Sie sich an die Verwaltung.";
}

export async function authenticate(_: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const inactiveMessage = await getInactiveLoginMessage(formData.get("email"), formData.get("password"));
      if (inactiveMessage) {
        return inactiveMessage;
      }

      return "E-Mail-Adresse oder Passwort ist nicht korrekt.";
    }

    throw error;
  }
}
