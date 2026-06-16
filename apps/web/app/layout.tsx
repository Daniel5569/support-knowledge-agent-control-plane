import "./globals.css";

export const metadata = {
  title: "Support Knowledge Agent Control Plane",
  description: "Governed AI support automation dashboard with citations, approvals, and audit controls."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
