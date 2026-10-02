/**
 * The Explorer side bar: the real workspace tree (read-only replay — no
 * file operations), the selected file highlighted per the current step.
 * The tree and the workspace name both come from the demo's own content
 * (useContent()) — nothing here names a specific project.
 */
import { useState } from "react";
import { Hotspot } from "../stage/Hotspot";
import { useContent, type TreeNode, type ExplorerSection } from "../engine/content";
import "./Explorer.css";

function Node({ node, selected, depth }: { node: TreeNode; selected?: string; depth: number }): React.JSX.Element {
  const [open, setOpen] = useState(!node.collapsed);
  const isSelected = node.path === selected;

  if (node.kind === "dir") {
    return (
      <div className={open ? "exp-dir-open" : ""}>
        <div className="exp-row exp-dir" style={{ paddingLeft: 8 + depth * 14 }} onClick={() => setOpen((v) => !v)}>
          <span className={`codicon ${open ? "codicon-chevron-down" : "codicon-chevron-right"}`} />
          {node.icon ? (
            <span className={`codicon codicon-${node.icon}`} />
          ) : (
            <span className="codicon codicon-folder" />
          )}
          <span className="exp-name">{node.name}</span>
        </div>
        {open && node.children?.map((c) => <Node key={c.path} node={c} selected={selected} depth={depth + 1} />)}
      </div>
    );
  }

  const row = (
    <div className={`exp-row exp-file ${isSelected ? "selected" : ""}`} style={{ paddingLeft: 8 + depth * 14 + 16 }}>
      <span className={`codicon codicon-${node.icon ?? "file"}`} />
      <span className="exp-name">{node.name}</span>
    </div>
  );

  return node.codeKey ? (
    <Hotspot id={`explorer-${node.codeKey}`} labelPlacement="right" compact>
      {row}
    </Hotspot>
  ) : (
    row
  );
}

/** One collapsible top-level section (bold header row, own chevron) — the real "Explorer For Endevor" view has three; the plain single-section layout (SectionlessTree below) is DOGECICS's own shape, unchanged. */
function Section({ section, selected }: { section: ExplorerSection; selected?: string }): React.JSX.Element {
  const [open, setOpen] = useState(!section.collapsed);
  return (
    <div className="exp-toplevel-section">
      <div className="exp-section exp-section-collapsible" onClick={() => setOpen((v) => !v)}>
        <span className={`codicon ${open ? "codicon-chevron-down" : "codicon-chevron-right"}`} />
        <span>{section.title}</span>
      </div>
      {open && section.tree && (
        <div className="exp-tree-nested">
          {section.tree.map((n) => (
            <Node key={n.path} node={n} selected={selected} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Explorer({ selected }: { selected?: string }): React.JSX.Element {
  const { explorerTree, explorerSections, workspaceName, explorerTitle } = useContent();
  return (
    <div className="vsc-explorer">
      <div className="exp-header">
        <span>{explorerTitle ?? "Explorer"}</span>
        {explorerSections && <span className="codicon codicon-ellipsis exp-header-menu" aria-hidden="true" />}
      </div>
      {explorerSections ? (
        <div className="exp-tree exp-tree-sections">
          {explorerSections.map((s) => (
            <Section key={s.title} section={s} selected={selected} />
          ))}
        </div>
      ) : (
        <>
          <div className="exp-section">{workspaceName}</div>
          <div className="exp-tree">
            {explorerTree.map((n) => (
              <Node key={n.path} node={n} selected={selected} depth={0} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
