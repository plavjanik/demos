/** Left-edge activity bar with codicons — explorer, search, SCM, run, extensions, Panelwright, and an optional demo-provided extra icon. */
import { useContent } from "../engine/content";
import "./ActivityBar.css";

const BASE_ICONS: Array<{ icon: string; label: string }> = [
  { icon: "codicon-files", label: "Explorer" },
  { icon: "codicon-search", label: "Search" },
  { icon: "codicon-source-control", label: "Source Control" },
  { icon: "codicon-debug-alt", label: "Run and Debug" },
  { icon: "codicon-extensions", label: "Extensions" },
  { icon: "codicon-terminal-tmux", label: "Panelwright" },
];

export function ActivityBar(): React.JSX.Element {
  // `activityBarExtra`/`activityBarExtraIconUrl` (PresentationContent) add,
  // and select, an extension-provided icon (e.g. Explorer For Endevor)
  // instead of the built-in Explorer, matching which side bar VSCodeScene
  // actually shows. Omit both and the bar looks exactly like it always did.
  // `activityBarExtraIconUrl` wins when set — the extension's own SVG,
  // rendered as a mask exactly as VS Code draws a view container's icon —
  // falling back to the `activityBarExtra` codicon name otherwise.
  const { activityBarExtra, activityBarExtraIconUrl } = useContent();
  const hasExtra = Boolean(activityBarExtra || activityBarExtraIconUrl);
  return (
    <div className="vsc-activitybar">
      {BASE_ICONS.map((it) => (
        <div
          key={it.label}
          className={`vsc-activity-item ${!hasExtra && it.label === "Explorer" ? "active" : ""}`}
          title={it.label}
        >
          <span className={`codicon ${it.icon}`} />
        </div>
      ))}
      {hasExtra ? (
        <div className="vsc-activity-item active" title="Explorer For Endevor">
          {activityBarExtraIconUrl ? (
            <span
              className="vsc-activity-icon-mask"
              // The double quotes are load-bearing: an unquoted CSS url()
              // token is invalid the moment its content contains a literal
              // `'` — which every attribute in the source SVG has (Vite's
              // dev-server data: URI keeps them unescaped) — and an invalid
              // url() drops the whole mask-image declaration, rendering as
              // a solid square instead of the glyph (measured 2026-09-30).
              style={
                {
                  maskImage: `url("${activityBarExtraIconUrl}")`,
                  WebkitMaskImage: `url("${activityBarExtraIconUrl}")`,
                } as React.CSSProperties
              }
            />
          ) : (
            <span className={`codicon codicon-${activityBarExtra}`} />
          )}
        </div>
      ) : null}
    </div>
  );
}
