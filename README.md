# marked-swift

A fast, dependency-free Markdown renderer for the
[make.fun](https://make.fun/bounty/markdown-render-speed-02)
`markdown-render-speed-02` bounty. `parse()` returns HTML byte-identical to
marked 18.1.3 with default options (GFM on, async off) on the competition's
practice cases: the CommonMark 0.31.2 spec examples, the GFM 0.29 extension
examples, and 40 long generated README documents.

## Layout

- `parse.js` — the renderer. A dependency-free ES module exporting
  `parse(markdown)`. Two passes: a line-based block pass (recursive descent
  over containers: blockquotes, lists, tables, fenced and indented code,
  HTML blocks, link reference definitions) followed by an inline pass
  (a single scan building a doubly-linked node list plus a delimiter stack
  for emphasis, links, images, autolinks and strikethrough).
- `main.ts` — the harness driver. Reads cases from
  `$MAKEFUN_INPUT_DIR/cases.json` (fallback `/input`), renders each case
  on its own with `parse()`, and writes `$MAKEFUN_OUTPUT_DIR/html.json`
  (fallback `/output`) as a JSON array of HTML strings in the cases' order.
- `package.json` — `{"type": "module"}`.

## Usage

```js
import { parse } from './parse.js';
console.log(parse('# Hello\n\nSome *emphasis* and a [link](https://example.com).'));
```

## License

MIT.
