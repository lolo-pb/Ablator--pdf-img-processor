import type { Preset } from "@bank/domain";
import type { createPresetAction, updatePresetAction } from "../actions";
import { DashboardShell } from "./dashboard-shell";
import { TemplateForm } from "./template-form";
import type { Locale, Messages } from "../../lib/i18n";

type TemplateEditorPageProps = {
  locale: Locale;
  messages: Messages;
  currentPath: string;
  section: string;
  businessId: string;
  cancelHref: string;
  title: string;
  subtitle: string;
  activeLabel: string;
  initialPreset?: Preset;
  templateHref?: string;
  submitLabel?: string;
  submitAction?: typeof createPresetAction | typeof updatePresetAction;
};

export function TemplateEditorPage(props: TemplateEditorPageProps) {
  return (
    <DashboardShell
      locale={props.locale}
      messages={props.messages}
      currentPath={props.currentPath}
      section={props.section}
      title={props.title}
      subtitle={props.subtitle}
      navItems={[
        { label: props.messages.nav.businesses, href: "/", active: false },
        { label: props.messages.nav.templates, href: `/businesses/${props.businessId}`, active: false },
        ...(props.templateHref && props.initialPreset
          ? [{ label: props.initialPreset.name, href: props.templateHref, active: false as const }]
          : []),
        { label: props.activeLabel, href: props.currentPath, active: true },
      ]}
    >
      <section className="focus-panel form-panel">
        <TemplateForm
          businessId={props.businessId}
          cancelHref={props.cancelHref}
          initialPreset={props.initialPreset}
          submitAction={props.submitAction}
          messages={{
            ...props.messages.templateForm,
            title: props.title,
            submit: props.submitLabel ?? props.messages.templateForm.submit,
            cancel: props.messages.actions.cancel,
          }}
        />
      </section>
    </DashboardShell>
  );
}
