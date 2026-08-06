import { NextResponse } from "next/server";
import { ingestAllFeeds } from "@/lib/ingest";

export const maxDuration = 60;

/** Feed ingestion endpoint — hit by Vercel Cron (hourly) or manually. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  const results = await ingestAllFeeds();
  return NextResponse.json({ results });
}
