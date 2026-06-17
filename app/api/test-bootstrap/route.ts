import { NextResponse } from "next/server";
import { bootstrapTestData } from "@/lib/services/test-bootstrap-service";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Test-Bootstrap konnte nicht ausgefuehrt werden.";
}

async function runBootstrap(request: Request) {
  const url = new URL(request.url);
  const token = request.headers.get("x-test-bootstrap-token") ?? url.searchParams.get("token");

  try {
    const status = await bootstrapTestData(token);
    return NextResponse.json({
      ok: true,
      message: "Testdaten-Bootstrap erfolgreich ausgefuehrt.",
      status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getErrorMessage(error),
      },
      { status: 403 },
    );
  }
}

export async function POST(request: Request) {
  return runBootstrap(request);
}

export async function GET(request: Request) {
  return runBootstrap(request);
}
