"use client";

import { useMemo, useState } from "react";
import { buildDraftForTicket } from "../lib/agent-simulation";
import type { SeedData, Ticket } from "../lib/types";
import ConfidenceBar from "./ConfidenceBar";
import StatusBadge from "./StatusBadge";

type DecisionState = "pending" | "approved" | "rejected" | "escalated";

function relativeSla(ticket: Ticket) {
  const hours = Math.max(0, Math.round((new Date(ticket.slaDueAt).getTime() - new Date(ticket.createdAt).getTime()) / 36e5));
  return `${hours}h SLA`;
}

export default function Dashboard({ seedData }: { seedData: SeedData }) {
  const [selectedTicketId, setSelectedTicketId] = useState(seedData.tickets[0].id);
  const [filter, setFilter] = useState<"all" | "approval" | "kb">("all");
  const [decisionState, setDecisionState] = useState<Record<string, DecisionState>>({});

  const draftsByTicket = useMemo(() => {
    return new Map(seedData.tickets.map((ticket) => [ticket.id, buildDraftForTicket(ticket, seedData.knowledgeArticles, seedData.policy)]));
  }, [seedData]);

  const selectedTicket = seedData.tickets.find((ticket) => ticket.id === selectedTicketId) ?? seedData.tickets[0];
  const selectedDraft = draftsByTicket.get(selectedTicket.id)!;

  const filteredTickets = seedData.tickets.filter((ticket) => {
    const draft = draftsByTicket.get(ticket.id)!;
    if (filter === "approval") {
      return draft.decision.requiresApproval;
    }
    if (filter === "kb") {
      return draft.draft.riskFlags.includes("conflicting_docs") || draft.draft.riskFlags.includes("missing_coverage");
    }
    return true;
  });

  const freshnessCounts = seedData.knowledgeArticles.reduce(
    (acc, article) => {
      acc[article.freshnessStatus] += 1;
      return acc;
    },
    { fresh: 0, review_due: 0, stale: 0 }
  );

  const state = decisionState[selectedTicket.id] ?? "pending";

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brandMark">SK</span>
          <div>
            <strong>Support Knowledge</strong>
            <span>Agent Control Plane</span>
          </div>
        </div>
        <nav aria-label="Primary">
          <a className="active" href="#queue">Ticket queue</a>
          <a href="#workspace">Answer workspace</a>
          <a href="#knowledge">Knowledge base</a>
          <a href="#policy">Policy controls</a>
          <a href="#audit">Audit log</a>
        </nav>
      </aside>

      <section className="workbench">
        <header className="topbar">
          <div>
            <h1>Governed support agent queue</h1>
            <p>Review cited AI drafts, policy decisions, stale knowledge, and approval actions from one operational surface.</p>
          </div>
          <div className="summaryStrip" aria-label="Queue summary">
            <span><strong>{seedData.tickets.length}</strong> open tickets</span>
            <span><strong>{[...draftsByTicket.values()].filter((item) => item.decision.requiresApproval).length}</strong> approvals</span>
            <span><strong>{freshnessCounts.stale}</strong> stale docs</span>
          </div>
        </header>

        <div className="grid">
          <section className="panel queuePanel" id="queue">
            <div className="panelHeader">
              <h2>Ticket queue</h2>
              <div className="segmented" role="group" aria-label="Ticket filters">
                {(["all", "approval", "kb"] as const).map((item) => (
                  <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>
                    {item === "all" ? "All" : item === "approval" ? "Approval" : "KB risk"}
                  </button>
                ))}
              </div>
            </div>

            <div className="ticketList">
              {filteredTickets.map((ticket) => {
                const current = draftsByTicket.get(ticket.id)!;
                const active = selectedTicket.id === ticket.id;
                return (
                  <button key={ticket.id} className={`ticketRow ${active ? "active" : ""}`} onClick={() => setSelectedTicketId(ticket.id)}>
                    <span className="rowTop">
                      <strong>{ticket.customer}</strong>
                      <StatusBadge label={ticket.priority} tone={ticket.priority === "urgent" ? "bad" : ticket.priority === "high" ? "warn" : "neutral"} />
                    </span>
                    <span className="subject">{ticket.subject}</span>
                    <span className="rowMeta">
                      <span>{ticket.channel}</span>
                      <span>{relativeSla(ticket)}</span>
                      <span>{current.decision.requiresApproval ? "approval required" : "auto eligible"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel detailPanel" id="workspace">
            <div className="panelHeader">
              <div>
                <h2>{selectedTicket.subject}</h2>
                <p>{selectedTicket.customer} · {selectedTicket.plan} · {selectedTicket.channel}</p>
              </div>
              <StatusBadge label={state} tone={state === "approved" ? "good" : state === "escalated" ? "warn" : state === "rejected" ? "bad" : "neutral"} />
            </div>

            <div className="ticketBody">{selectedTicket.body}</div>

            <div className="draftBlock">
              <div className="draftHeader">
                <span>Agent draft</span>
                <ConfidenceBar value={selectedDraft.draft.confidence} />
              </div>
              <p>{selectedDraft.draft.responseText}</p>
            </div>

            <div className="citations">
              <h3>Citations</h3>
              {selectedDraft.draft.citations.map((citation) => (
                <a key={citation.articleId} href={citation.sourceUrl}>
                  <strong>{citation.articleId}</strong>
                  <span>{citation.title}</span>
                </a>
              ))}
            </div>

            <div className="actionBar">
              <button className="primary" onClick={() => setDecisionState({ ...decisionState, [selectedTicket.id]: "approved" })}>Approve</button>
              <button onClick={() => setDecisionState({ ...decisionState, [selectedTicket.id]: "rejected" })}>Reject</button>
              <button onClick={() => setDecisionState({ ...decisionState, [selectedTicket.id]: "escalated" })}>Escalate</button>
            </div>
          </section>

          <section className="panel decisionPanel" id="policy">
            <h2>Policy decision</h2>
            <div className="decisionGrid">
              <span>Auto-send</span>
              <strong>{selectedDraft.decision.allowAutoSend ? "Allowed" : "Blocked"}</strong>
              <span>Reviewer</span>
              <strong>{selectedDraft.decision.reviewerRole}</strong>
              <span>Action</span>
              <strong>{selectedDraft.draft.proposedAction.replaceAll("_", " ")}</strong>
            </div>
            <p className="reason">{selectedDraft.decision.escalationReason}</p>
            <div className="flagWrap">
              {selectedDraft.draft.riskFlags.length ? selectedDraft.draft.riskFlags.map((flag) => <StatusBadge key={flag} label={flag} tone="warn" />) : <StatusBadge label="no risk flags" tone="good" />}
            </div>
          </section>

          <section className="panel knowledgePanel" id="knowledge">
            <div className="panelHeader">
              <h2>Knowledge freshness</h2>
              <span>{seedData.knowledgeArticles.length} indexed docs</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Owner</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {seedData.knowledgeArticles.map((article) => (
                  <tr key={article.id}>
                    <td>
                      <strong>{article.title}</strong>
                      <span>{article.productArea} · v{article.version}</span>
                    </td>
                    <td>{article.owner}</td>
                    <td>
                      <StatusBadge label={article.freshnessStatus} tone={article.freshnessStatus === "fresh" ? "good" : article.freshnessStatus === "stale" ? "bad" : "warn"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel auditPanel" id="audit">
            <h2>Audit log</h2>
            <div className="timeline">
              {seedData.auditEvents.map((event) => (
                <article key={event.id}>
                  <span>{new Date(event.timestamp).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
                  <strong>{event.actor} · {event.action}</strong>
                  <p>{event.summary}</p>
                </article>
              ))}
              <article>
                <span>Current session</span>
                <strong>reviewer · {state}</strong>
                <p>Local UI state changed for {selectedTicket.id}; production builds should persist this as an immutable audit event.</p>
              </article>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
