import type { Locale } from "../../lib/i18n";

export function LanguageSwitcher({
  currentPath,
  locale,
  label,
}: {
  currentPath: string;
  locale: Locale;
  label: string;
}) {
  return (
    <div className="language-switcher">
      <span>{label}</span>
      <div className="language-switcher__links">
        {(["en", "es"] as const).map((item) => (
          <a
            key={item}
            className={item === locale ? "is-active" : ""}
            href={`/lang/${item}?redirectTo=${encodeURIComponent(currentPath)}`}
          >
            {item.toUpperCase()}
          </a>
        ))}
      </div>
    </div>
  );
}

