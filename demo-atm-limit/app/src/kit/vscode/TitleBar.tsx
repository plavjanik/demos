/** macOS-style traffic-light title bar. */
import "./TitleBar.css";

export function TitleBar({ workspaceName }: { workspaceName: string }): React.JSX.Element {
  return (
    <div className="vsc-titlebar">
      <div className="vsc-traffic-lights">
        <span className="tl tl-red" />
        <span className="tl tl-yellow" />
        <span className="tl tl-green" />
      </div>
      <div className="vsc-titlebar-title">{workspaceName} — Visual Studio Code</div>
      <div className="vsc-titlebar-spacer" />
    </div>
  );
}
