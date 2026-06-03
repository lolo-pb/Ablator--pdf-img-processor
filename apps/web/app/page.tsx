import Link from "next/link";
import { getDashboardData } from "../lib/services";

export default async function HomePage() {
  const data = await getDashboardData();

  return (
    <main className="grid">
      <section className="hero">
        <span className="pill">Web-first, desktop-portable</span>
        <h1>Bank reconciliation extraction for shared business workspaces.</h1>
        <p>
          Upload statements, apply preset rules, review low-confidence rows, and export Excel files after human approval.
        </p>
      </section>

      <section className="grid cols-2">
        {data.businesses.map(({ business, role, presets, jobs }) => (
          <article key={business.id} className="panel stack">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="stack" style={{ gap: 4 }}>
                <h2>{business.name}</h2>
                <div className="muted">{business.slug}</div>
              </div>
              <span className="pill">{role}</span>
            </div>
            <p className="muted">
              {presets.length} preset version{presets.length === 1 ? "" : "s"} and {jobs.length} processing job
              {jobs.length === 1 ? "" : "s"}.
            </p>
            <Link className="button" href={`/businesses/${business.id}`}>
              Open workspace
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}

