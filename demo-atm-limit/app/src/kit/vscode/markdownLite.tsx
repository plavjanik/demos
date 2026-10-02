/**
 * A tiny markdown-ish renderer for assistant chat bubbles: bold, inline
 * code, and `-`/numbered lists. Deliberately not a real markdown parser —
 * the brief asks for "a tiny renderer, no dependency".
 */
import type { ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={`${keyPrefix}-${i++}`}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(
        <code key={`${keyPrefix}-${i++}`} className="md-inline-code">
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function MarkdownLite({ text }: { text: string }): React.JSX.Element {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  // A paragraph or a list item can wrap onto an indented continuation line
  // with no marker of its own (this is how plan.md itself is written) — a
  // non-blank, non-marker line always continues whichever block is
  // currently open, it never starts a new paragraph on its own.
  let para: string[] = [];
  let list: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push(<p key={`p${key++}`}>{renderInline(para.join(" "), `p${key}`)}</p>);
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`l${key++}`}>
          {list.map((item, i) => (
            <li key={i}>{renderInline(item, `li${key}-${i}`)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    const listMatch = /^\s*(?:[-*]|\d+\.)\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushPara();
      flushList();
      // "#"/"##" both read as the plan's one top-level heading (md-h2,
      // h3-sized); "###" is every numbered sub-step (md-h3, h4-sized).
      const level = headingMatch[1]!.length;
      const cls = level >= 3 ? "md-h3" : "md-h2";
      const Tag = level >= 3 ? "h4" : "h3";
      blocks.push(
        <Tag key={`h${key++}`} className={`md-heading ${cls}`}>
          {renderInline(headingMatch[2]!, `h${key}`)}
        </Tag>,
      );
    } else if (listMatch) {
      flushPara();
      list.push(listMatch[1]!);
    } else if (line.trim() === "") {
      flushPara();
      flushList();
    } else if (list.length) {
      // Continuation of the list item currently being built.
      list[list.length - 1] += " " + line.trim();
    } else {
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();

  return <div className="md-lite">{blocks}</div>;
}
