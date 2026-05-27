"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function authenticate(_: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "E-Mail-Adresse oder Passwort ist nicht korrekt.";
    }

    throw error;
  }
}
