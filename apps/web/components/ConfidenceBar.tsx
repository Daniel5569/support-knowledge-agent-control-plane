export default function ConfidenceBar({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  const tone = percent >= 82 ? "good" : percent >= 65 ? "warn" : "bad";

  return (
    <div className="confidence" aria-label={`Confidence ${percent}%`}>
      <div className="confidenceTrack">
        <div className={`confidenceFill ${tone}`} style={{ width: `${percent}%` }} />
      </div>
      <span>{percent}%</span>
    </div>
  );
}
