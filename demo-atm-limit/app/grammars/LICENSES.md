# Grammar sources

TextMate grammars used at build time by `scripts/prerender.mts` to highlight
COBOL, JCL and BMS source in the generated slides. All MIT-licensed.

- `COBOL.spgennard.tmLanguage.json` — scope `source.cobol`, from
  [spgennard/vscode_cobol](https://github.com/spgennard/vscode_cobol) (MIT).
- `jcl.dkelosky.tmLanguage.json` — scope `source.jcl`, from
  [dkelosky/zos-jcl-language](https://github.com/dkelosky/zos-jcl-language) (MIT).
- `bms.tmLanguage.json` — CICS/BMS macro highlighting (MIT).

TypeScript, diff and bash highlighting use shiki's bundled grammars instead
of a copied file.

The Dark Modern theme (`scripts/themes-src/dark_modern.json`,
`dark_plus.json`, `dark_vs.json`) is Microsoft's own VS Code built-in theme,
MIT-licensed, merged into one shiki theme object by `scripts/prerender.mts`.
