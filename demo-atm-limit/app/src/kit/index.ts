/**
 * Panelwright's reusable presentation kit — the public surface a demo
 * wires up in its own App.tsx: the step engine, the content seam, the
 * stage chrome, and the five bundled scene kinds (title/atm/vscode/
 * process/compare). A demo builds its own `steps` (Step[]) and `content`
 * (PresentationContent) and passes them to StepEngineProvider/
 * ContentProvider — nothing in this directory imports a demo's own
 * modules or the generated build artefacts (src/generated/**); see
 * kit-boundary.test.ts, which pins that rule.
 */

// engine
export { StepEngineProvider, useStepEngine, type StepEngineValue } from "./engine/StepEngine";
export { ContentProvider, useContent } from "./engine/content";
export type {
  PresentationContent,
  CodeEntry,
  TreeNode,
  ExplorerSection,
  ComponentBox,
  AtmBrand,
  CompareData,
  CompareGroup,
  CompareManualRow,
} from "./engine/content";
export type {
  Scene,
  Hotspot as HotspotData,
  AtmStep,
  DiagramStep,
  ProcessNode,
  ProcessLoopback,
  ProcessLane,
  ProcessDiagram,
  ProcessStepData,
  ChatItem,
  Diagnostic,
  VSCodeStep,
  TitleStep,
  Step,
} from "./engine/types";
export {
  readReviewData,
  writeReviewData,
  effectiveText,
  reviewFieldValue,
  isNarrationOverrideStale,
  buildReviewMarkdown,
  type ReviewData,
  type ReviewEntry,
  type TextEdit,
} from "./engine/reviewData";
export { splitClockMs } from "./engine/duration";
export { REPLAY_MS_PER_LINE } from "./engine/pacing";
export { roundedRatio } from "./engine/compareMath";
export { reduceNarrationToSpeech, speechTextForStep } from "./engine/speechText";
export {
  NarrationAudioProvider,
  useNarrationAudio,
  type NarrationAudioApi,
  type NarrationField,
  type NarrationPlaybackStatus,
} from "./engine/narrationAudio";
export { DEFAULT_NARRATION_SETTINGS, type NarrationMode, type NarrationSettings } from "./engine/narrationSettings";
export type { TtsShape } from "./engine/ttsRequest";

// stage
export { Stage, useStageScale } from "./stage/Stage";
export { Hotspot } from "./stage/Hotspot";
export { NarrationCallout } from "./stage/NarrationCallout";
export { PresenterBar } from "./stage/PresenterBar";
export { StepRail } from "./stage/StepRail";
export { TimerHud } from "./stage/TimerHud";
export { ReviewPanel } from "./stage/ReviewPanel";
export { TextEditOverlay, TextEditOverlayGate } from "./stage/TextEditOverlay";

// vscode
export { VSCodeScene } from "./vscode/VSCodeScene";
export { TitleBar } from "./vscode/TitleBar";
export { ActivityBar } from "./vscode/ActivityBar";
export { Explorer } from "./vscode/Explorer";
export { Editor } from "./vscode/Editor";
export { TerminalPane } from "./vscode/Terminal";
export { ChatPanel } from "./vscode/ChatPanel";
export { StatusBar } from "./vscode/StatusBar";
export { MarkdownLite } from "./vscode/markdownLite";
export { SPINNER_GLYPHS, SPINNER_VERBS, CLAUDE_CODE_VERBS, MAINFRAME_VERBS } from "./vscode/spinnerVerbs";

// atm
export { AtmScene } from "./atm/AtmScene";
export { AtmMachine, balanceAfter, type AtmMachineProps } from "./atm/AtmMachine";
export {
  ATM_SKINS,
  DEFAULT_ATM_SKIN,
  resolveAtmSkin,
  readAtmSkinPreference,
  writeAtmSkinPreference,
  type AtmSkin,
  type AtmSkinLabels,
} from "./atm/skins";
export { toResponsiveSvg } from "./atm/svg";

// diagrams
export { ComponentsStrip } from "./diagrams/ComponentsStrip";
export { ProcessScene } from "./diagrams/ProcessScene";
export { CompareScene } from "./diagrams/CompareScene";

// title
export { TitleScene } from "./title/TitleScene";
