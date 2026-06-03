import Link from "next/link";
import { createJobAction, createPresetAction } from "../../actions";
import { getBusinessWorkspace } from "../../../lib/services";

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const workspace = await getBusinessWorkspace(businessId);

  return (
    <main className="grid">
      <section className="hero">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="stack" style={{ gap: 6 }}>
            <span className="pill">{workspace.role}</span>
            <h1>{workspace.business.name}</h1>
            <p>
              Shared preset management, temporary source document storage, and mandatory human review before any export.
            </p>
          </div>
          <Link className="button secondary" href="/">
            Back
          </Link>
        </div>
      </section>

      <section className="grid cols-2">
        <div className="panel stack">
          <h2>Create preset version</h2>
          <form action={createPresetAction} className="stack">
            <input type="hidden" name="businessId" value={workspace.business.id} />
            <label>
              Preset name
              <input name="name" defaultValue="New Bank Reconciliation Preset" required />
            </label>
            <label>
              Document family
              <select name="documentFamily" defaultValue="bank_summary">
                <option value="bank_summary">Bank summary</option>
                <option value="reconciliation">Reconciliation</option>
                <option value="statement">Statement</option>
              </select>
            </label>
            <label>
              Instructions
              <textarea
                name="instructionText"
                rows={5}
                defaultValue="Extract bank transactions, normalize dates and amounts, and classify spendings using the preset categories."
              />
            </label>
            <label>
              Categories
              <textarea name="categories" rows={3} defaultValue="Operations, Payroll, Taxes, Subscriptions, Income, Uncategorized" />
            </label>
            <label>
              Ignore rules
              <textarea name="ignoreRules" rows={3} defaultValue="Ignore headers, balances, page footers, and summary sections that are not transaction rows." />
            </label>
            <label>
              Example notes
              <textarea name="exampleNotes" rows={3} defaultValue="Use for monthly account summaries with debit and credit transactions." />
            </label>
            <button type="submit">Save new preset version</button>
          </form>
        </div>

        <div className="panel stack">
          <h2>Create processing job</h2>
          <form action={createJobAction} className="stack">
            <input type="hidden" name="businessId" value={workspace.business.id} />
            <label>
              Preset
              <select name="presetId" defaultValue={workspace.presets[0]?.id}>
                {workspace.presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} v{preset.version}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Documents
              <input name="documents" type="file" accept=".pdf,image/*" multiple required />
            </label>
            <button type="submit">Upload documents</button>
          </form>
          <p className="muted">
            Uploaded source files are kept only until review is completed and the export is generated.
          </p>
        </div>
      </section>

      <section className="panel stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>Preset versions</h2>
          <span className="status">{workspace.presets.length} total</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Family</th>
              <th>Version</th>
              <th>Categories</th>
            </tr>
          </thead>
          <tbody>
            {workspace.presets.map((preset) => (
              <tr key={preset.id}>
                <td>{preset.name}</td>
                <td>{preset.documentFamily}</td>
                <td>v{preset.version}</td>
                <td>{preset.definition.classificationCategories.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>Jobs</h2>
          <span className="status">{workspace.jobs.length} total</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Created</th>
              <th>Status</th>
              <th>Preset</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {workspace.jobs.map((job) => (
              <tr key={job.id}>
                <td>{new Date(job.createdAt).toLocaleString()}</td>
                <td>{job.status}</td>
                <td>{job.presetId}</td>
                <td>
                  <Link className="button secondary" href={`/businesses/${workspace.business.id}/jobs/${job.id}`}>
                    Open job
                  </Link>
                </td>
              </tr>
            ))}
            {workspace.jobs.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  No jobs yet. Upload a statement or reconciliation file to start.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}

