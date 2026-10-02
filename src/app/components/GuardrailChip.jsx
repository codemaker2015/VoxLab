import React, { useState } from "react";
import { CheckCircledIcon, CrossCircledIcon, ClockIcon } from "@radix-ui/react-icons";

function formatCategory(category) {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function GuardrailChip({ guardrailResult }) {
  const [expanded, setExpanded] = useState(false);

  const state =
    guardrailResult.status === "IN_PROGRESS"
      ? "PENDING"
      : guardrailResult.category === "NONE"
      ? "PASS"
      : "FAIL";

  let IconComponent;
  let label;
  let textColorClass;
  switch (state) {
    case "PENDING":
      IconComponent = ClockIcon;
      label = "Pending";
      textColorClass = "text-gray-600";
      break;
    case "PASS":
      IconComponent = CheckCircledIcon;
      label = "Pass";
      textColorClass = "text-green-600";
      break;
    case "FAIL":
      IconComponent = CrossCircledIcon;
      label = "Fail";
      textColorClass = "text-red-500";
      break;
    default:
      IconComponent = ClockIcon;
      label = "Pending";
      textColorClass = "text-gray-600";
  }

  return (
    <div className="text-xs">
      <div
        onClick={() => { if (state !== "PENDING") setExpanded(!expanded); }}
        className={`inline-flex items-center gap-1 rounded ${state !== "PENDING" ? "cursor-pointer" : ""}`}
      >
        Guardrail:
        <div className={`flex items-center gap-1 ${textColorClass}`}>
          <IconComponent /> {label}
        </div>
      </div>
      {state !== "PENDING" && guardrailResult.category && guardrailResult.rationale && (
        <div className={`overflow-hidden transition-all duration-300 ${expanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="pt-2 text-xs">
            <strong>Moderation Category: {formatCategory(guardrailResult.category)}</strong>
            <div>{guardrailResult.rationale}</div>
            {guardrailResult.testText && (
              <blockquote className="mt-1 border-l-2 border-gray-300 pl-2 text-gray-400">
                {guardrailResult.testText}
              </blockquote>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
