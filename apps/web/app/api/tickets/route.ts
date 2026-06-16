import { NextResponse } from "next/server";
import seedData from "../../../data/seed-data.json";
import type { SeedData } from "../../../lib/types";

const data = seedData as SeedData;

export async function GET() {
  return NextResponse.json({
    tickets: data.tickets,
    auditEvents: data.auditEvents
  });
}
