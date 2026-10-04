import { NextResponse } from "next/server";
import { communesForPostalCode } from "@/lib/geo";

export function GET(request: Request) {
  const cp = new URL(request.url).searchParams.get("cp") ?? "";
  if (!/^\d{5}$/.test(cp)) return NextResponse.json({ communes: [] }, { status: 400 });
  return NextResponse.json(
    { communes: communesForPostalCode(cp) },
    { headers: { "Cache-Control": "public, max-age=86400, immutable" } },
  );
}
