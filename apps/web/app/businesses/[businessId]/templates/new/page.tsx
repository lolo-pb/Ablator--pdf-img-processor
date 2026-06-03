import Link from "next/link";
import { createPresetAction } from "../../../../actions";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { getBusinessWorkspace } from "../../../../../lib/services";
import { getLocale, getMessages } from "../../../../../lib/i18n";

export default async function NewTemplatePage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const workspace = await getBusinessWorkspace(businessId);

  return (
    <DashboardShell
      locale={locale}
      messages={messages}
      currentPath={`/businesses/${businessId}/templates/new`}
      section={workspace.business.name}
      title={messages.templateForm.title}
      subtitle={messages.templateForm.subtitle}
      navItems={[
        { label: messages.nav.businesses, href: "/", active: false },
        { label: messages.nav.templates, href: `/businesses/${businessId}`, active: false },
        { label: messages.nav.createTemplate, href: `/businesses/${businessId}/templates/new`, active: true },
      ]}
    >
      <section className="focus-panel form-panel">
        <form action={createPresetAction} className="stack">
          <input type="hidden" name="businessId" value={workspace.business.id} />
          <label>
            {messages.templateForm.name}
            <input name="name" defaultValue="Bank Summary Classifier" required />
          </label>
          <label>
            {messages.templateForm.documentFamily}
            <select name="documentFamily" defaultValue="bank_summary">
              <option value="bank_summary">Bank summary</option>
              <option value="reconciliation">Reconciliation</option>
              <option value="statement">Statement</option>
            </select>
          </label>
          <label>
            {messages.templateForm.instructions}
            <textarea
              name="instructionText"
              rows={5}
              defaultValue="Extract bank transactions, normalize dates and amounts, and classify spendings using the preset categories."
            />
          </label>
          <label>
            {messages.templateForm.categories}
            <textarea name="categories" rows={3} defaultValue="Operations, Payroll, Taxes, Subscriptions, Income, Uncategorized" />
          </label>
          <label>
            {messages.templateForm.ignoreRules}
            <textarea
              name="ignoreRules"
              rows={3}
              defaultValue="Ignore headers, balances, page footers, and summary sections that are not transaction rows."
            />
          </label>
          <label>
            {messages.templateForm.exampleNotes}
            <textarea name="exampleNotes" rows={3} defaultValue="Use for monthly account summaries with debit and credit transactions." />
          </label>
          <div className="row">
            <Link className="button secondary" href={`/businesses/${businessId}`}>
              {messages.actions.cancel}
            </Link>
            <button type="submit">{messages.templateForm.submit}</button>
          </div>
        </form>
      </section>
    </DashboardShell>
  );
}
