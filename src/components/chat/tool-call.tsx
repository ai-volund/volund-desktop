"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  WrenchIcon,
  XCircleIcon,
  Loader2,
} from "lucide-react";
import type { ReactNode } from "react";
import { renderToolOutput, toolMeta } from "./tool-renderers";

// ── State helpers ───────────────────────────────────────────────────────────

/**
 * AI SDK v4+ tool part states (UIToolInvocation):
 *   input-streaming  — tool arguments still streaming in
 *   input-available  — arguments complete, tool executing
 *   output-available — tool finished successfully
 *   error            — tool finished with an error
 *
 * Legacy / custom states we also accept:
 *   partial-call, call, result
 */
function classifyState(state?: string, errorText?: string) {
  const isRunning =
    state === "input-streaming" ||
    state === "input-available" ||
    state === "approval-requested" ||
    state === "approval-responded" ||
    // legacy
    state === "call" ||
    state === "partial-call";
  const isDone =
    state === "output-available" ||
    // legacy
    state === "result";
  const isFailed = state === "error" || !!errorText;
  return { isRunning, isDone, isFailed };
}

const statusIcon = (
  isRunning: boolean,
  isDone: boolean,
  isFailed: boolean,
): ReactNode => {
  if (isRunning)
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />;
  if (isFailed)
    return <XCircleIcon className="h-3.5 w-3.5 text-red-500" />;
  if (isDone)
    return <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />;
  return <CircleIcon className="h-3.5 w-3.5 text-muted-foreground" />;
};

const statusLabel = (
  isRunning: boolean,
  isDone: boolean,
  isFailed: boolean,
): { text: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
  if (isRunning) return { text: "Running", variant: "secondary" };
  if (isFailed) return { text: "Error", variant: "destructive" };
  if (isDone) return { text: "Completed", variant: "secondary" };
  return { text: "Pending", variant: "outline" };
};

// ── Main component ──────────────────────────────────────────────────────────

interface ToolCallBlockProps {
  part: Record<string, unknown>;
}

export function ToolCallBlock({ part }: ToolCallBlockProps) {
  // AI SDK v4 flattens UIToolInvocation onto the part:
  //   { type: "tool-{toolName}", toolCallId, state, input, output, errorText }
  // The tool name is encoded in part.type as "tool-{name}".
  // Also handle legacy structures where toolInvocation is nested.
  const inv = (part.toolInvocation ?? part) as Record<string, unknown>;

  // Extract tool name: prefer the type prefix ("tool-email_search" → "email_search"),
  // then toolName, then toolCallId as fallback display name.
  const partType = (part.type ?? "") as string;
  const typeToolName = partType.startsWith("tool-")
    ? partType.slice(5) // strip "tool-" prefix
    : undefined;
  const toolName =
    typeToolName ||
    (inv.toolName as string | undefined) ||
    (inv.toolCallId as string | undefined) ||
    "tool";

  const state = (inv.state as string | undefined) ?? (part.state as string | undefined);
  const output = inv.output ?? inv.result ?? part.output;
  const input = inv.input ?? inv.args ?? part.args;
  const args =
    input != null
      ? typeof input === "string"
        ? input
        : JSON.stringify(input)
      : undefined;
  const errorText =
    (inv.errorText as string | undefined) ?? (part.errorText as string | undefined);

  const { isRunning, isDone, isFailed } = classifyState(state, errorText);
  const { icon: toolIcon, label: toolLabel } = toolMeta(toolName);
  const status = statusLabel(isRunning, isDone, isFailed);
  const hasContent = output != null || errorText;

  // Rich rendering for completed tool outputs.
  const richOutput =
    isDone && output != null ? renderToolOutput(toolName, output, args) : null;

  return (
    <Collapsible className="group not-prose w-full rounded-md border mb-2">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground shrink-0">
            {toolIcon ?? <WrenchIcon className="h-4 w-4" />}
          </span>
          <span className="font-medium text-sm">{toolLabel}</span>
          <Badge
            variant={status.variant}
            className="gap-1 rounded-full text-xs px-2 py-0"
          >
            {statusIcon(isRunning, isDone, isFailed)}
            {status.text}
          </Badge>
        </div>
        {hasContent && (
          <ChevronDownIcon className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        )}
      </CollapsibleTrigger>

      {hasContent && (
        <CollapsibleContent className="border-t">
          <div className="p-3 space-y-3">
            {/* Error text */}
            {errorText && (
              <div className="space-y-1">
                <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Error
                </h4>
                <pre className="text-xs text-destructive whitespace-pre-wrap font-mono rounded-md bg-destructive/10 px-3 py-2">
                  {errorText}
                </pre>
              </div>
            )}

            {/* Rich or raw output */}
            {output != null && (
              <div className="space-y-1">
                <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Result
                </h4>
                <div className="rounded-md bg-muted/50 overflow-hidden">
                  {richOutput ?? (
                    <pre className="text-xs text-foreground whitespace-pre-wrap font-mono px-3 py-2 max-h-64 overflow-auto">
                      {typeof output === "string"
                        ? output
                        : JSON.stringify(output, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
