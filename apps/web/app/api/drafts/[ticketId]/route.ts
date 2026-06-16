import { NextResponse } from "next/server";
import seedData from "../../../../data/seed-data.json";
import { buildDraftForTicket } from "../../../../lib/agent-simulation";
import type { SeedData } from "../../../../lib/types";

const data = seedData as SeedData;

type Params = {
  params: Promise<{ ticketId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { ticketId } = await params;
  const ticket = data.tickets.find((item) => item.id === ticketId);

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json(buildDraftForTicket(ticket, data.knowledgeArticles, data.policy));
}
