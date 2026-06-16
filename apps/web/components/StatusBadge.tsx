export default function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "warn" | "bad" }) {
  return <span className={`badge ${tone}`}>{label.replaceAll("_", " ")}</span>;
}
