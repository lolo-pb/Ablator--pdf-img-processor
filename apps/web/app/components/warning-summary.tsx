"use client";

import { useState } from "react";

type WarningSummaryProps = {
  text: string;
  readMoreLabel: string;
  readLessLabel: string;
};

export function WarningSummary(props: WarningSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="warning-summary">
      <span className={`warning-summary__text${expanded ? " is-expanded" : ""}`}>{props.text}</span>
      <button
        type="button"
        className="warning-summary__toggle"
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? props.readLessLabel : props.readMoreLabel}
      </button>
    </div>
  );
}
