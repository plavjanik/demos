/** Bottom status bar: branch, cursor position, language mode, and a connection indicator. */
import "./StatusBar.css";

export function StatusBar({ lang, statusText }: { lang: string; statusText: string }): React.JSX.Element {
  return (
    <div className="vsc-statusbar">
      <div className="vsc-statusbar-left">
        <span className="sb-item">
          <span className="codicon codicon-source-control" /> main
        </span>
        <span className="sb-item">
          <span className="codicon codicon-sync" />
        </span>
      </div>
      <div className="vsc-statusbar-right">
        <span className="sb-item">{statusText}</span>
        <span className="sb-item">Ln 1, Col 1</span>
        <span className="sb-item">{lang}</span>
        <span className="sb-item">UTF-8</span>
      </div>
    </div>
  );
}
