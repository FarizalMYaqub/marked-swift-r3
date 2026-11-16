// parse.js — a fast CommonMark 0.31.2 + GFM 0.29 renderer written from scratch.
// It mirrors what marked 18.1.3 renders with default options (GFM on, breaks off),
// verified against the kit's 720 practice cases. Dependency-free, single module.
//
// Design: two passes. Block pass: line-based recursive descent over containers
// (block quotes, lists); it collects link reference definitions into one map so a
// definition anywhere in the document applies everywhere. Inline pass: one scan
// building a doubly linked node list plus a delimiter stack, then the classic
// delimiter-stack emphasis algorithm, then rendering.

const ENTITIES = {
  AElig: '\u00C6', AMP: '&', amp: '&', apos: "'", Aacute: '\u00C1', aacute: '\u00E1',
  Acirc: '\u00C2', acirc: '\u00E2', Atilde: '\u00C3', atilde: '\u00E3', Auml: '\u00C4',
  auml: '\u00E4', Aring: '\u00C5', aring: '\u00E5', AElig2: '\u00C6', Ccedil: '\u00C7',
  ccedil: '\u00E7', Egrave: '\u00C8', egrave: '\u00E8', Eacute: '\u00C9', eacute: '\u00E9',
  Ecirc: '\u00CA', ecirc: '\u00EA', Euml: '\u00CB', euml: '\u00EB', Igrave: '\u00CC',
  igrave: '\u00EC', Iacute: '\u00CD', iacute: '\u00ED', Icirc: '\u00CE', icirc: '\u00EE',
  Iuml: '\u00CF', iuml: '\u00EF', Ntilde: '\u00D1', ntilde: '\u00F1', Ograve: '\u00D2',
  ograve: '\u00F2', Oacute: '\u00D3', oacute: '\u00F3', Ocirc: '\u00D4', ocirc: '\u00F4',
  Otilde: '\u00D5', otilde: '\u00F5', Ouml: '\u00D6', ouml: '\u00F6', Oslash: '\u00D8',
  oslash: '\u00F8', Ugrave: '\u00D9', ugrave: '\u00F9', Uacute: '\u00DA', uacute: '\u00FA',
  Ucirc: '\u00DB', ucirc: '\u00FB', Uuml: '\u00DC', uuml: '\u00FC', Yacute: '\u00DD',
  yacute: '\u00FD', yuml: '\u00FF', THORN: '\u00DE', thorn: '\u00FE', szlig: '\u00DF',
  eth: '\u00F0', ETH: '\u00D0', yacute2: '\u00FD', copy: '\u00A9', reg: '\u00AE',
  nbsp: '\u00A0', iexcl: '\u00A1', cent: '\u00A2', pound: '\u00A3', curren: '\u00A4',
  yen: '\u00A5', brvbar: '\u00A6', sect: '\u00A7', uml: '\u00A8', ordf: '\u00AA',
  ordm: '\u00BA', laquo: '\u00AB', raquo: '\u00BB', not: '\u00AC', shy: '\u00AD',
  macr: '\u00AF', deg: '\u00B0', plusmn: '\u00B1', sup2: '\u00B2', sup3: '\u00B3',
  acute: '\u00B4', micro: '\u00B5', para: '\u00B6', middot: '\u00B7', cedil: '\u00B8',
  sup1: '\u00B9', frac14: '\u00BC', frac12: '\u00BD', frac34: '\u00BE', iquest: '\u00BF',
  times: '\u00D7', divide: '\u00F7', minus: '\u2212', lowast: '\u2217',
  lt: '<', LT: '<', gt: '>', GT: '>', quot: '"', QUOT: '"', apos2: "'",
  hellip: '\u2026', mdash: '\u2014', ndash: '\u2013', lsquo: '\u2018', rsquo: '\u2019',
  ldquo: '\u201C', rdquo: '\u201D', sbquo: '\u201A', bdquo: '\u201E', dagger: '\u2020',
  Dagger: '\u2021', permil: '\u2030', lsaquo: '\u2039', rsaquo: '\u203A', euro: '\u20AC',
  trade: '\u2122', TRADE: '\u2122', hearts: '\u2665', diams: '\u2666', clubs: '\u2663',
  spades: '\u2660', bull: '\u2022', larr: '\u2190', uarr: '\u2191', rarr: '\u2192',
  darr: '\u2193', harr: '\u2194', crarr: '\u21B5', lArr: '\u21D0', uArr: '\u21D1',
  rArr: '\u21D2', dArr: '\u21D3', hArr: '\u21D4', forall: '\u2200', part: '\u2202',
  exist: '\u2203', empty: '\u2205', nabla: '\u2207', isin: '\u2208', notin: '\u2209',
  ni: '\u220B', prod: '\u220F', sum: '\u2211', infin: '\u221E', ang: '\u2220',
  and: '\u2227', or: '\u2228', cap: '\u2229', cup: '\u222A', int: '\u222B',
  there4: '\u2234', sim: '\u223C', cong: '\u2245', asymp: '\u2248', ne: '\u2260',
  equiv: '\u2261', le: '\u2264', ge: '\u2265', sub: '\u2282', sup: '\u2283',
  nsub: '\u2284', sube: '\u2286', supe: '\u2287', oplus: '\u2295', otimes: '\u2297',
  perp: '\u22A5', sdot: '\u22C5', Alpha: '\u0391', Beta: '\u0392', Gamma: '\u0393',
  Delta: '\u0394', Epsilon: '\u0395', Zeta: '\u0396', Eta: '\u0397', Theta: '\u0398',
  Iota: '\u0399', Kappa: '\u039A', Lambda: '\u039B', Mu: '\u039C', Nu: '\u039D',
  Xi: '\u039E', Omicron: '\u039F', Pi: '\u03A0', Rho: '\u03A1', Sigma: '\u03A3',
  Tau: '\u03A4', Upsilon: '\u03A5', Phi: '\u03A6', Chi: '\u03A7', Psi: '\u03A8',
  Omega: '\u03A9', alpha: '\u03B1', beta: '\u03B2', gamma: '\u03B3', delta: '\u03B4',
  epsilon: '\u03B5', zeta: '\u03B6', eta: '\u03B7', theta: '\u03B8', iota: '\u03B9',
  kappa: '\u03BA', lambda: '\u03BB', mu: '\u03BC', nu: '\u03BD', xi: '\u03BE',
  omicron: '\u03BF', pi: '\u03C0', rho: '\u03C1', sigmaf: '\u03C2', sigma: '\u03C3',
  tau: '\u03C4', upsilon: '\u03C5', phi: '\u03C6', chi: '\u03C7', psi: '\u03C8',
  omega: '\u03C9', thetasym: '\u03D1', upsih: '\u03D2', piv: '\u03D6',
  ensp: '\u2002', emsp: '\u2003', thinsp: '\u2009', zwnj: '\u200C', zwj: '\u200D',
  lrm: '\u200E', rlm: '\u200F', ndash2: '\u2013', lsquo2: '\u2018',
  Dcaron: '\u010E', dcaron: '\u010F', DifferentialD: '\u2146', HilbertSpace: '\u210B',
  ClockwiseContourIntegral: '\u2232', ngE: '\u2267\u0338', nge: '\u2271',
  ngeq: '\u2271', ngt: '\u226F', nlt: '\u226E', lne: '\u2268', gne: '\u2269',
  fnof: '\u0192', circ: '\u02C6', tilde: '\u02DC', Scaron: '\u0160', scaron: '\u0161',
  Yuml: '\u0178', OElig: '\u0152', oelig: '\u0153', Zcaron: '\u017D', zcaron: '\u017E',
  sbquo2: '\u201A', prime: '\u2032', Prime: '\u2033', oline: '\u203E', frasl: '\u2044',
  weierp: '\u2118', image: '\u2111', real: '\u211C', alefsym: '\u2135',
  larr2: '\u2190', uarr2: '\u2191', rarr2: '\u2192', darr2: '\u2193',
  harr2: '\u2194', crarr2: '\u21B5', lArr2: '\u21D0', uArr2: '\u21D1',
  rArr2: '\u21D2', dArr2: '\u21D3', hArr2: '\u21D4', loz: '\u25CA',
};

// ASCII punctuation (CommonMark's set) as a lookup string.
const ASCII_PUNCT = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';

function isWs(c) {
  if (!c) return false;
  if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v') return true;
  // Unicode whitespace includes the Zs space separators (NBSP U+00A0, etc.);
  // a '*' beside one cannot flank (cm-353: '*\u00A0a\u00A0*' is literal).
  const code = c.charCodeAt(0);
  if (code < 128) return false;
  return /\p{Zs}/u.test(c);
}
function isPunct(c) {
  if (!c) return false;
  const code = c.charCodeAt(0);
  if (code < 128) return ASCII_PUNCT.indexOf(c) >= 0;
  // CommonMark punctuation is Unicode P (punctuation) or S (symbol): the
  // currency signs in cm-354 ('£', '€', category Sc) count as punctuation.
  return /[\p{P}\p{S}]/u.test(c);
}
function isAlphaNum(c) {
  if (!c) return false;
  const code = c.charCodeAt(0);
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}
function isDigit(c) {
  return c >= '0' && c <= '9';
}
function isBlankLine(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c !== ' ' && c !== '\t') return false;
  }
  return true;
}

// Column width of the leading whitespace of a line; a tab advances to the next
// multiple of 4. Returns [columns, index of first non-whitespace char].
function indentOf(line) {
  let col = 0, i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === ' ') { col++; i++; }
    else if (c === '\t') { col += 4 - (col % 4); i++; }
    else break;
  }
  return [col, i];
}

// Remove up to `n` columns of leading indentation from a line. A tab that
// straddles the boundary leaves the remaining spaces behind. When n is not a
// multiple of 4, a tab's width depends on its column, which shifts once the
// indent is gone, so the whole leading run is first expanded to spaces (by
// absolute column) and then n columns are dropped; that keeps later strips
// column-correct (e.g. `- foo` followed by `\t\tbar` must keep two spaces).
function stripIndent(line, n) {
  let col = 0, i = 0;
  if (n % 4 === 0) {
    while (i < line.length && col < n) {
      const c = line[i];
      if (c === ' ') { col++; i++; }
      else if (c === '\t') {
        const next = col + (4 - (col % 4));
        if (next <= n) { col = next; i++; }
        else return ' '.repeat(next - n) + line.slice(i + 1);
      } else break;
    }
    return line.slice(i);
  }
  let spaces = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === ' ') { col++; i++; spaces++; }
    else if (c === '\t') { const next = col + (4 - (col % 4)); spaces += next - col; col = next; i++; }
    else break;
  }
  const keep = Math.max(0, spaces - n);
  return ' '.repeat(keep) + line.slice(i);
}

// Remove n columns starting at line[i0], which sits at absolute column c0.
// The leading whitespace is expanded to spaces by absolute column, so a tab
// that survives the strip keeps its original width for later strips.
function stripFrom(line, i0, c0, n) {
  let col = c0, i = i0, spaces = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === ' ') { col++; i++; spaces++; }
    else if (c === '\t') { const next = col + (4 - (col % 4)); spaces += next - col; col = next; i++; }
    else break;
  }
  const keep = Math.max(0, spaces - n);
  return ' '.repeat(keep) + line.slice(i);
}

// Escape text for HTML: & < > " ' — the full set.
function esc(s) {
  let out = '';
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    let rep = null;
    if (c === '&') rep = '&amp;';
    else if (c === '<') rep = '&lt;';
    else if (c === '>') rep = '&gt;';
    else if (c === '"') rep = '&quot;';
    else if (c === "'") rep = '&#39;';
    if (rep) {
      if (i > start) out += s.slice(start, i);
      out += rep;
      start = i + 1;
    }
  }
  if (start === 0) return s;
  if (start < s.length) out += s.slice(start);
  return out;
}

// Escape text for HTML, with marked's entity rule: a named reference &name;
// is left verbatim (even if the name is not defined), a valid numeric
// reference is decoded to its character (0 and surrogates become U+FFFD, an
// out-of-range value is left escaped), and any other & becomes &amp;.
function escText(s) {
  let out = '';
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '&') {
      let j = i + 1;
      if (s[j] === '#') {
        let k = j + 1;
        let hex = false;
        if (s[k] === 'x' || s[k] === 'X') { hex = true; k++; }
        const d0 = k;
        while (k < s.length && (hex ? (s[k] >= '0' && s[k] <= '9') || (s[k] >= 'a' && s[k] <= 'f') || (s[k] >= 'A' && s[k] <= 'F') : (s[k] >= '0' && s[k] <= '9'))) k++;
        if (k > d0 && s[k] === ';') {
          const cp = parseInt(s.slice(d0, k), hex ? 16 : 10);
          if (cp <= 0x10FFFF) {
            const ch = (cp === 0 || (cp >= 0xD800 && cp <= 0xDFFF)) ? '\uFFFD' : String.fromCodePoint(cp);
            let rep = null;
            if (ch === '&') rep = '&amp;';
            else if (ch === '<') rep = '&lt;';
            else if (ch === '>') rep = '&gt;';
            else if (ch === '"') rep = '&quot;';
            else if (ch === "'") rep = '&#39;';
            if (i > start) out += s.slice(start, i);
            out += rep === null ? ch : rep;
            start = k + 1;
            i = k;
            continue;
          }
        }
        // Not a valid numeric reference: escape the &.
        if (i > start) out += s.slice(start, i);
        out += '&amp;';
        start = i + 1;
        continue;
      }
      // Named reference pattern &name; — leave the whole thing verbatim.
      let k = j;
      while (k < s.length && ((s[k] >= 'a' && s[k] <= 'z') || (s[k] >= 'A' && s[k] <= 'Z') || (s[k] >= '0' && s[k] <= '9'))) k++;
      if (k > j && s[k] === ';') { i = k; continue; }
      if (i > start) out += s.slice(start, i);
      out += '&amp;';
      start = i + 1;
      continue;
    }
    let rep = null;
    if (c === '<') rep = '&lt;';
    else if (c === '>') rep = '&gt;';
    else if (c === '"') rep = '&quot;';
    else if (c === "'") rep = '&#39;';
    if (rep) {
      if (i > start) out += s.slice(start, i);
      out += rep;
      start = i + 1;
    }
  }
  if (start === 0) return s;
  if (start < s.length) out += s.slice(start);
  return out;
}

// Escape for href/title attributes: like esc, but a `&` that starts something
// looking like an entity reference (&word; or &#...;) is left alone.
function escAttr(s) {
  let out = '';
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    let rep = null;
    if (c === '&') {
      // look ahead: &#digits; / &#xhex; / &word;
      let j = i + 1;
      if (s[j] === '#') j++;
      let k = j;
      while (k < s.length && /[0-9A-Za-z]/.test(s[k])) k++;
      if (k > j && s[k] === ';') { continue; } // entity-like: leave alone
      rep = '&amp;';
    }
    else if (c === '<') rep = '&lt;';
    else if (c === '>') rep = '&gt;';
    else if (c === '"') rep = '&quot;';
    else if (c === "'") rep = '&#39;';
    if (rep) {
      if (i > start) out += s.slice(start, i);
      out += rep;
      start = i + 1;
    }
  }
  if (start === 0) return s;
  if (start < s.length) out += s.slice(start);
  return out;
}

// Percent-encode a URL the way encodeURI does, but keep existing %XX escapes.
function cleanUrl(href) {
  try {
    return encodeURI(href).replace(/%25/g, '%');
  } catch (e) {
    return href;
  }
}

// Decode one entity starting at s[i] === '&'. Returns [decoded, lengthConsumed]
// or null when it is not a valid entity reference.
function decodeEntity(s, i) {
  const n = s.length;
  if (s[i + 1] === '#') {
    let j = i + 2;
    let hex = false;
    if (s[j] === 'x' || s[j] === 'X') { hex = true; j++; }
    const start = j;
    while (j < n) {
      const c = s[j];
      if (hex ? /[0-9A-Fa-f]/.test(c) : isDigit(c)) j++;
      else break;
    }
    if (j === start || j >= n || s[j] !== ';') return null;
    let cp = parseInt(s.slice(start, j), hex ? 16 : 10);
    if (!cp || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF)) cp = 0xFFFD;
    return [String.fromCodePoint(cp), j - i + 1];
  }
  // named: &name;
  let j = i + 1;
  while (j < n && j < i + 33) {
    const c = s[j];
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')) j++;
    else break;
  }
  if (j < n && s[j] === ';' && j > i + 1) {
    const name = s.slice(i + 1, j);
    const v = ENTITIES[name];
    if (v !== undefined) return [v, j - i + 1];
  }
  return null;
}

// Normalize a link label: collapse all whitespace runs to one space, trim,
// lowercase (Unicode-aware via toLowerCase).
function normalizeLabel(label) {
  // Unicode case folding: 'ß' and 'ẞ' both fold to 'ss' (cm-540: '[ẞ]'
  // matches the definition '[SS]: /url').
  return label.replace(/\s+/g, ' ').trim().toLowerCase().replace(/ß/g, 'ss');
}

// ---------- inline parsing ----------

const LOCAL_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!#$%&'*+/=?^_`{|}~-";
const TRAIL_PUNCT = '?!.,:;*_~';
const SCHEME_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+.-';

// Parse one link label starting at text[pos] (just past '['). Returns
// {label, next} with next past the closing ']', or null.
function parseLabel(text, pos) {
  let q = pos;
  const n = text.length;
  while (q < n) {
    const c = text[q];
    // A backslash escapes the next ASCII punctuation character, including
    // another backslash: in '[bar\\]' the '\\' is an escaped backslash, so
    // the following ']' is the label's close, not an escaped ']' (cm-550).
    if (c === '\\' && q + 1 < n && ASCII_PUNCT.indexOf(text[q + 1]) >= 0) { q += 2; continue; }
    // A link label cannot contain an unescaped '[' (cm-547, cm-548: a label
    // with a nested bracket is not a valid reference).
    if (c === '[') return null;
    if (c === ']') {
      const label = text.slice(pos, q);
      if (label.length > 999) return null;
      return { label, next: q + 1 };
    }
    if (c === '\n' && q > pos && text[q - 1] === '\n') return null;
    q++;
  }
  return null;
}

// Parse a link destination starting at pos (spaces/newlines skipped first).
// Returns {dest, next} or null. An empty destination is allowed only when the
// next char is ')' (handled by the caller checking dest === '' is fine).
function parseDest(text, pos) {
  const n = text.length;
  let p = pos;
  while (p < n && (text[p] === ' ' || text[p] === '\t' || text[p] === '\n')) p++;
  if (p >= n) return null;
  if (text[p] === '<') {
    let q = p + 1;
    let dest = '';
    while (q < n) {
      const c = text[q];
      if (c === '\\' && q + 1 < n && ASCII_PUNCT.indexOf(text[q + 1]) >= 0) { dest += text[q + 1]; q += 2; continue; }
      if (c === '>') return { dest, next: q + 1 };
      if (c === '\n' || c === '<' || c.charCodeAt(0) < 32) return null;
      dest += c; q++;
    }
    return null;
  }
  let q = p;
  let depth = 0;
  let dest = '';
  while (q < n) {
    const c = text[q];
    if (c === ' ' || c === '\t' || c === '\n' || c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) break;
    if (c === '\\' && q + 1 < n && ASCII_PUNCT.indexOf(text[q + 1]) >= 0) { dest += text[q + 1]; q += 2; continue; }
    if (c === '(') { depth++; dest += c; q++; continue; }
    if (c === ')') {
      if (depth === 0) break;
      depth--; dest += c; q++; continue;
    }
    dest += c; q++;
  }
  return { dest, next: q };
}

// Parse a link title starting at pos (spaces/newlines skipped first).
// Returns {title, next} or null.
function parseTitle(text, pos) {
  const n = text.length;
  let p = pos;
  while (p < n && (text[p] === ' ' || text[p] === '\t' || text[p] === '\n')) p++;
  if (p >= n) return null;
  const c = text[p];
  let close;
  if (c === '"') close = '"';
  else if (c === "'") close = "'";
  else if (c === '(') close = ')';
  else return null;
  let q = p + 1;
  let title = '';
  while (q < n) {
    const ch = text[q];
    if (ch === close) return { title, next: q + 1 };
    if (close === ')' && ch === '(') return null;
    if (ch === '\\' && q + 1 < n && ASCII_PUNCT.indexOf(text[q + 1]) >= 0) { title += text[q + 1]; q += 2; continue; }
    title += ch; q++;
  }
  return null;
}

// Parse one domain label starting at j. Returns the index just past the label
// (label ends at the last alphanumeric), or -1.
function parseDomainLabel(text, j) {
  const n = text.length;
  if (j >= n || !isAlphaNum(text[j])) return -1;
  let k = j + 1;
  let lastAlnum = j;
  while (k < n && (isAlphaNum(text[k]) || text[k] === '-')) {
    if (isAlphaNum(text[k])) lastAlnum = k;
    k++;
  }
  const end = lastAlnum + 1;
  if (end - j > 63) return -1;
  return end;
}

// Trim the end of an extended autolink URL: unbalanced ')', an &...; entity
// tail, then trailing punctuation. Repeats until stable.
function trimExtUrl(url) {
  for (;;) {
    let changed = false;
    let open = 0, close = 0;
    for (let k = 0; k < url.length; k++) {
      if (url[k] === '(') open++;
      else if (url[k] === ')') close++;
    }
    while (url.endsWith(')') && close > open) { url = url.slice(0, -1); close--; changed = true; }
    if (url.endsWith(';')) {
      const amp = url.lastIndexOf('&');
      if (amp >= 0) {
        const between = url.slice(amp + 1, -1);
        if (between.length > 0 && /^[\w]+$/.test(between)) { url = url.slice(0, amp); changed = true; }
      }
    }
    while (url.length > 0 && TRAIL_PUNCT.indexOf(url[url.length - 1]) >= 0) {
      url = url.slice(0, -1); changed = true;
    }
    if (!changed) return url;
  }
}

// Try to match a www./http(s):// extended autolink at text[i].
// Returns {url, end} or null. Caller checks the preceding-char boundary.
function matchExtUrl(text, i) {
  const n = text.length;
  let j = i;
  if (text.startsWith('www.', i)) j = i + 4;
  else {
    // The scheme is case-insensitive (doc-02: 'Https://...' is an autolink).
    const head = text.slice(i, i + 8).toLowerCase();
    if (head.startsWith('https://')) j = i + 8;
    else if (head.startsWith('http://')) j = i + 7;
    else return null;
  }
  let labels = 0;
  let lastStart = j, lastEnd = j;
  for (;;) {
    const end = parseDomainLabel(text, j);
    if (end < 0) return null;
    labels++;
    lastStart = j; lastEnd = end;
    j = end;
    // A '.' only continues the domain when a label follows it; a trailing
    // '.' is punctuation, not part of the domain (gfm-624:
    // 'www.commonmark.org.' links 'www.commonmark.org').
    if (text[j] === '.' && parseDomainLabel(text, j + 1) >= 0) { j++; continue; }
    break;
  }
  if (labels < 2) return null;
  const lastLabel = text.slice(lastStart, lastEnd);
  if (lastLabel.length < 2 || !/^[A-Za-z]+$/.test(lastLabel)) return null;
  if (text[j] === ':') {
    let k = j + 1;
    while (k < n && isDigit(text[k])) k++;
    if (k > j + 1) j = k;
  }
  if (text[j] === '/' || text[j] === '?' || text[j] === '#') {
    while (j < n) {
      const c = text[j];
      if (isWs(c) || c === '<' || c === '>') break;
      j++;
    }
  }
  const url = trimExtUrl(text.slice(i, j));
  if (url.length === 0) return null;
  return { url, end: i + url.length };
}

// Match an email address ending at text[i] === '@' (bare or scheme-prefixed).
// Returns {text, start, end, href} or null. `start` is where the autolink
// begins in the source (scheme start, or local-part start).
function matchEmail(text, i) {
  const n = text.length;
  let s = i - 1;
  while (s >= 0 && LOCAL_CHARS.indexOf(text[s]) >= 0) s--;
  s++;
  if (s >= i) return null;
  // The local part must contain an alphanumeric character: a bare '+' (as
  // in '<foo\+@bar.example.com>', where the backslash stops the scan) is
  // not an email address (cm-606).
  let hasAlnum = false;
  for (let p = s; p < i; p++) if (isAlphaNum(text[p])) { hasAlnum = true; break; }
  if (!hasAlnum) return null;
  let j = i + 1;
  let labels = 0;
  for (;;) {
    const end = parseDomainLabel(text, j);
    if (end < 0) return null;
    labels++;
    j = end;
    // A '.' only continues the domain when a label follows it; a trailing
    // '.' is punctuation (gfm-632: 'a.b-c_d@a.b.' links 'a.b-c_d@a.b').
    if (text[j] === '.' && parseDomainLabel(text, j + 1) >= 0) { j++; continue; }
    break;
  }
  if (labels < 2) return null;
  if (text[j] === '-' || text[j] === '_') return null;
  // Optional single path segment after the domain (xmpp: style).
  let end = j;
  if (text[j] === '/') {
    let k = j + 1;
    while (k < n) {
      const c = text[k];
      if (isWs(c) || c === '<' || c === '>' || c === '/') break;
      k++;
    }
    if (k > j + 1) end = k;
  }
  let start = s;
  let href = null;
  let hasScheme = false;
  // Scheme prefix: scheme ':' immediately before the local part.
  if (s >= 2 && text[s - 1] === ':') {
    let k = s - 2;
    while (k >= 0 && SCHEME_CHARS.indexOf(text[k]) >= 0) k--;
    k++;
    const scheme = text.slice(k, s - 1);
    if (scheme.length >= 2 && scheme.length <= 32 && scheme[0] >= 'A' && scheme[0] <= 'z' && isAlphaNum(scheme[0])) {
      start = k;
      href = text.slice(k, end);
      hasScheme = true;
    }
  }
  if (href === null) {
    href = 'mailto:' + text.slice(s, end);
  }
  let display = text.slice(start, end);
  display = trimExtUrl(display);
  if (display.length === 0) return null;
  // If trimming shortened it, the href follows the trimmed text. A scheme
  // href is already complete ('mailto:foo@bar.baz'); only a bare email gets
  // the 'mailto:' prefix (gfm-633: no 'mailto:mailto:').
  if (hasScheme) href = display;
  else href = 'mailto:' + display;
  return { text: display, start, end: start + display.length, href };
}

// Try to match an HTML tag / comment / PI / declaration / CDATA at text[i].
// Returns {text, end} or null.
function tryHtmlTag(text, i) {
  const n = text.length;
  if (text.startsWith('<!--', i)) {
    // '<!-->' and '<!--->' are complete (abruptly closed) comments; they do
    // not run on to a later '-->' (cm-626).
    if (text.startsWith('<!-->', i)) return { text: '<!-->', end: i + 5 };
    if (text.startsWith('<!--->', i)) return { text: '<!--->', end: i + 6 };
    const e = text.indexOf('-->', i + 4);
    if (e < 0) return null;
    return { text: text.slice(i, e + 3), end: e + 3 };
  }
  if (text.startsWith('<?', i)) {
    const e = text.indexOf('?>', i + 2);
    if (e < 0) return null;
    return { text: text.slice(i, e + 2), end: e + 2 };
  }
  if (text.startsWith('<![CDATA[', i)) {
    const e = text.indexOf(']]>', i + 9);
    if (e < 0) return null;
    return { text: text.slice(i, e + 3), end: e + 3 };
  }
  if (text.startsWith('<!', i) && i + 2 < n && /[A-Za-z]/.test(text[i + 2])) {
    const e = text.indexOf('>', i + 2);
    if (e < 0) return null;
    return { text: text.slice(i, e + 1), end: e + 1 };
  }
  // Open or close tag.
  let j = i + 1;
  let closing = false;
  if (text[j] === '/') { closing = true; j++; }
  if (j >= n || !/[A-Za-z]/.test(text[j])) return null;
  j++;
  while (j < n && /[A-Za-z0-9-]/.test(text[j])) j++;
  for (;;) {
    let sawWs = false;
    while (j < n && (text[j] === ' ' || text[j] === '\t' || text[j] === '\n')) { j++; sawWs = true; }
    if (j >= n) return null;
    if (text[j] === '>') return { text: text.slice(i, j + 1), end: j + 1 };
    if (text[j] === '/' && text[j + 1] === '>') return { text: text.slice(i, j + 2), end: j + 2 };
    if (closing) return null;
    // Attributes must be separated from the tag name and each other by
    // whitespace (cm-609 '<m:abc>' has none after 'm'; cm-622
    // "<a href='bar'title=title>" has none after the quoted value).
    if (!sawWs) return null;
    // attribute name
    if (!/[A-Za-z_:]/.test(text[j])) return null;
    j++;
    while (j < n && /[A-Za-z0-9_.:-]/.test(text[j])) j++;
    // Optional whitespace, then '=' and a value. If there is no '=', this is
    // a boolean attribute: do NOT consume the following whitespace, so the
    // next loop iteration still sees it (cm-616: '_boolean zoop:...' — the
    // space after '_boolean' separates it from the next attribute).
    let k = j;
    while (k < n && (text[k] === ' ' || text[k] === '\t' || text[k] === '\n')) k++;
    if (text[k] === '=') {
      j = k + 1;
      while (j < n && (text[j] === ' ' || text[j] === '\t' || text[j] === '\n')) j++;
      if (j >= n) return null;
      const q = text[j];
      if (q === '"' || q === "'") {
        j++;
        while (j < n && text[j] !== q) j++;
        if (j >= n) return null;
        j++;
      } else {
        if (text[j] === ' ' || text[j] === '\t' || text[j] === '\n' || text[j] === '"' || text[j] === "'" || text[j] === '=' || text[j] === '<' || text[j] === '>' || text[j] === '`') return null;
        while (j < n && text[j] !== ' ' && text[j] !== '\t' && text[j] !== '\n' && text[j] !== '"' && text[j] !== "'" && text[j] !== '=' && text[j] !== '<' && text[j] !== '>' && text[j] !== '`') j++;
      }
    }
  }
}

// Try an angle autolink <scheme:...> or <email> at text[i] === '<'.
// Returns {href, text, end} or null.
function tryAngleAutolink(text, i) {
  const n = text.length;
  let j = i + 1;
  if (j < n && /[A-Za-z]/.test(text[j])) {
    let k = j + 1;
    while (k < n && /[A-Za-z0-9+.-]/.test(text[k])) k++;
    const schemeLen = k - j;
    if (schemeLen >= 2 && schemeLen <= 32 && text[k] === ':') {
      let q = k + 1;
      let dest = '';
      while (q < n) {
        const ch = text[q];
        // No backslash-escape processing here: the destination is taken
        // literally (a backslash stays a backslash, e.g. ?find=\*).
        if (ch === '>') { const full = text.slice(j, k) + ':' + dest; return { href: full, text: full, end: q + 1 }; }
        if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '<' || ch.charCodeAt(0) < 32) return null;
        dest += ch; q++;
      }
      return null;
    }
  }
  // Email form <local@domain>.
  let k = j;
  while (k < n && LOCAL_CHARS.indexOf(text[k]) >= 0) k++;
  if (k === j || text[k] !== '@') return null;
  let m = k + 1;
  let labels = 0;
  for (;;) {
    const end = parseDomainLabel(text, m);
    if (end < 0) return null;
    labels++;
    m = end;
    if (text[m] === '.') { m++; continue; }
    break;
  }
  if (labels < 2) return null;
  if (text[m] !== '>') return null;
  const email = text.slice(j, m);
  return { href: 'mailto:' + email, text: email, end: m + 1 };
}

// Plain-text rendering of a node range (for image alt text).
function plainTextOf(first) {
  let out = '';
  let node = first;
  while (node) {
    const t = node.t;
    if (t === 'text') out += node.s;
    else if (t === 'code') out += node.s;
    else if (t === 'link' || t === 'em' || t === 'strong' || t === 'del') out += plainTextOf(node.first);
    else if (t === 'image') out += node.alt;
    else if (t === 'delim') out += node.ch.repeat(node.len);
    node = node.next;
  }
  return out;
}

function renderNodes(first, out) {
  let node = first;
  while (node) {
    const t = node.t;
    if (t === 'text') out.push(escText(node.s));
    else if (t === 'delim') out.push(node.ch.repeat(node.len));
    else if (t === 'code') { out.push('<code>'); out.push(esc(node.s)); out.push('</code>'); }
    else if (t === 'br') out.push('<br>');
    else if (t === 'html') out.push(node.s);
    else if (t === 'link') {
      out.push('<a href="');
      out.push(escAttr(cleanUrl(node.href)));
      out.push('"');
      if (node.title !== null && node.title !== undefined) {
        out.push(' title="');
        out.push(escAttr(node.title));
        out.push('"');
      }
      out.push('>');
      renderNodes(node.first, out);
      out.push('</a>');
    } else if (t === 'image') {
      out.push('<img src="');
      out.push(escAttr(cleanUrl(node.src)));
      out.push('" alt="');
      out.push(esc(node.alt));
      out.push('"');
      if (node.title !== null && node.title !== undefined) {
        out.push(' title="');
        out.push(escAttr(node.title));
        out.push('"');
      }
      out.push('>');
    } else if (t === 'em') { out.push('<em>'); renderNodes(node.first, out); out.push('</em>'); }
    else if (t === 'strong') { out.push('<strong>'); renderNodes(node.first, out); out.push('</strong>'); }
    else if (t === 'del') { out.push('<del>'); renderNodes(node.first, out); out.push('</del>'); }
    node = node.next;
  }
}

// Inline-parse one block of text (a paragraph, heading, table cell, ...) into HTML.
function inlineParse(text, links) {
  const n = text.length;
  let head = null, tail = null;
  let dHead = null, dTail = null;

  function appendNode(node) {
    node.next = null; node.prev = tail;
    if (tail) tail.next = node; else head = node;
    tail = node;
    return node;
  }
  function appendText(s) {
    if (!s) return;
    if (tail && tail.t === 'text') { tail.s += s; return; }
    appendNode({ t: 'text', s, parent: null });
  }
  function pushDelim(node) {
    node.dnext = null; node.dprev = dTail;
    if (dTail) dTail.dnext = node; else dHead = node;
    dTail = node;
    appendNode(node);
    return node;
  }
  function removeFromDelim(d) {
    if (d.dprev) d.dprev.dnext = d.dnext; else dHead = d.dnext;
    if (d.dnext) d.dnext.dprev = d.dprev; else dTail = d.dprev;
    d.dnext = d.dprev = null;
  }
  function removeNode(node) {
    const par = node.parent;
    if (node.prev) node.prev.next = node.next; else setFirst(par, node.next);
    if (node.next) node.next.prev = node.prev; else setLast(par, node.prev);
    node.next = node.prev = null;
  }
  // Remove `cut` source characters from the end of the top-level node list,
  // walking back across text nodes and emphasis delimiters. An email local
  // part such as 'a.b-c_d' is split across nodes by the '_' delimiter, so a
  // single tail-text truncation is not enough (gfm-632). Returns false when
  // the range cannot be removed cleanly (a partial delimiter, or a
  // non-text/non-delimiter node in the way).
  function truncateTail(cut) {
    let node = tail;
    while (cut > 0 && node) {
      if (node.t === 'text') {
        const take = Math.min(cut, node.s.length);
        node.s = node.s.slice(0, node.s.length - take);
        cut -= take;
        if (node.s.length === 0) { const prev = node.prev; removeNode(node); node = prev; }
        else break;
      } else if (node.t === 'delim') {
        if (cut < node.len) return false;
        cut -= node.len;
        const prev = node.prev;
        removeFromDelim(node);
        removeNode(node);
        node = prev;
      } else return false;
    }
    return cut === 0;
  }
  // List endpoints for a container (null = top level).
  function listFirst(par) { return par ? par.first : head; }
  function listLast(par) { return par ? par.last : tail; }
  function setFirst(par, node) { if (par) par.first = node; else head = node; }
  function setLast(par, node) { if (par) par.last = node; else tail = node; }

  // Wrap the nodes between opener and closer (same sibling list) in an
  // em/strong/del node, consuming `use` delimiters from each side.
  function wrapEmphasis(opener, closer, use) {
    // Verify both are in the same sibling list.
    let walk = opener.next;
    let ok = false;
    while (walk) {
      if (walk === closer) { ok = true; break; }
      walk = walk.next;
    }
    if (!ok) return false;
    const par = opener.parent;
    const tag = closer.ch === '~' ? 'del' : (use === 2 ? 'strong' : 'em');
    const node = { t: tag, first: opener.next, last: closer.prev, parent: par, next: null, prev: null };
    if (node.first) node.first.prev = null;
    if (node.last) node.last.next = null;
    // Children inherit the new parent.
    let c = node.first;
    while (c) { c.parent = node; c = c.next; }
    const before = opener.prev;
    const after = closer.next;
    opener.next = node; node.prev = opener;
    node.next = closer; closer.prev = node;
    opener.len -= use;
    closer.len -= use;
    if (opener.len === 0) {
      if (before) before.next = node; else setFirst(par, node);
      node.prev = before;
      removeFromDelim(opener);
    }
    if (closer.len === 0) {
      if (after) after.prev = node; else setLast(par, node);
      node.next = after;
      removeFromDelim(closer);
    }
    return true;
  }

  function processEmphasis(bottom) {
    let current = dHead;
    while (current) {
      // Save the next delimiter now: a successful wrap may remove `current`
      // from the delimiter list and null its links, but the following
      // delimiter must still be processed (cm-369: an outer closer after an
      // inner pair is wrapped).
      const next = current.dnext;
      if (current.t === 'delim' && current.canClose && current.ch !== '[') {
        let opener = current.dprev;
        let found = null;
        while (opener && opener !== bottom) {
          // Rule of 3: only when the opener or the closer can BOTH open and
          // close does a length sum that is a multiple of 3 (without both
          // lengths being multiples of 3) forbid the match (cm-408, cm-412).
          // No openersBottom shortcut: whether an opener is usable depends
          // on the closer's length, so a later closer must re-examine
          // openers an earlier closer skipped (cm-412: '*' matches the
          // opener that '**' could not).
          const odd = ((opener.canOpen && opener.canClose) ||
            (current.canOpen && current.canClose)) &&
            ((opener.len + current.len) % 3 === 0) &&
            (opener.len % 3 !== 0 || current.len % 3 !== 0);
          if (opener.ch === current.ch && opener.canOpen && !odd) {
            const use = (opener.len >= 2 && current.len >= 2 ? 2 : 1);
            if (wrapEmphasis(opener, current, use)) { found = opener; break; }
            // wrapEmphasis failed (the opener sits in a different sibling
            // list, cm-470): keep looking for an opener further back.
          }
          opener = opener.dprev;
        }
        if (found) {
          if (current.len > 0 && current.canClose) continue;
          current = next;
          continue;
        }
      }
      current = next;
    }
  }

  // Try to form a link/image from `opener` (a '[' delim) at the ']' at index i.
  // Returns the index to resume scanning at, or -1 when no link was formed.
  function tryLink(opener, i) {
    let dest = null, title = null, after = -1;
    // Inline link: ](...
    if (text[i + 1] === '(') {
      const d = parseDest(text, i + 2);
      if (d) {
        let p = d.next;
        while (p < n && (text[p] === ' ' || text[p] === '\t' || text[p] === '\n')) p++;
        if (text[p] === ')') {
          dest = d.dest; title = null; after = p + 1;
        } else {
          const t = parseTitle(text, d.next);
          if (t) {
            let r = t.next;
            while (r < n && (text[r] === ' ' || text[r] === '\t' || text[r] === '\n')) r++;
            if (text[r] === ')') { dest = d.dest; title = t.title; after = r + 1; }
          }
        }
      }
    }
    // Reference link: ][...]
    // If ']' is followed by '[', this is a full-reference attempt: when the
    // label does not resolve, no link forms and there is no fallback to a
    // shortcut reference (cm-571: '[foo][bar][baz]' leaves '[foo]' literal
    // because 'bar' is undefined, even though 'foo' is defined).
    if (dest === null && text[i + 1] === '[') {
      const lab = parseLabel(text, i + 2);
      if (lab) {
        let key;
        if (lab.label === '') key = normalizeLabel(text.slice(opener.src + 1, i));
        else key = normalizeLabel(lab.label);
        const ref = links.get(key);
        if (ref) { dest = ref.href; title = ref.title; after = lab.next; }
      }
      if (dest === null) return -1;
    }
    // Shortcut reference: ] alone (only when not followed by '[').
    if (dest === null) {
      const key = normalizeLabel(text.slice(opener.src + 1, i));
      if (key !== '') {
        const ref = links.get(key);
        if (ref) { dest = ref.href; title = ref.title; after = i + 1; }
      }
    }
    if (dest === null) return -1;

    // Image? A '!' immediately before the '[' (end of the previous text node).
    // The '!' must not be backslash-escaped (cm-593: '\![foo]' is a link,
    // the '!' is literal text, not an image marker).
    let isImage = false;
    const prev = opener.prev;
    if (prev && prev.t === 'text' && prev.s.length > 0 && prev.s[prev.s.length - 1] === '!' &&
        opener.src > 0 && text[opener.src - 1] === '!') {
      let bs = 0;
      let p = opener.src - 2;
      while (p >= 0 && text[p] === '\\') { bs++; p--; }
      if (bs % 2 === 0) {
        isImage = true;
        prev.s = prev.s.slice(0, -1);
        if (prev.s.length === 0) removeNode(prev);
      }
    }

    const bottom = opener.dprev;
    const par = opener.parent;
    const first = opener.next;
    const last = first ? listLast(par) : null;
    if (isImage) {
      // Resolve emphasis inside the image content first, so the alt text is
      // the plain text with emphasis stripped (cm-573: '![foo *bar*]' has
      // alt 'foo bar', not 'foo *bar*'). Recompute `last`: wrapping may have
      // replaced the tail delimiter with an emphasis node.
      processEmphasis(bottom);
      const last2 = listLast(par);
      // The link text's plain text becomes the alt text; the nodes
      // themselves are discarded, not left as siblings (cm-517: the alt
      // 'moon' must not also render as text before the image).
      const alt = plainTextOf(first);
      let node = first;
      while (node) {
        const nx = node.next;
        if (node.t === 'delim') removeFromDelim(node);
        removeNode(node);
        if (node === last2) break;
        node = nx;
      }
      removeFromDelim(opener);
      removeNode(opener);
      appendNode({ t: 'image', src: dest, title, alt, parent: null });
      return after;
    }

    // Link: move the nodes between '[' and ']' into the link node.
    const link = { t: 'link', href: dest, title, first, last, parent: null, next: null, prev: null };
    if (first) first.prev = null;
    if (last) last.next = null;
    let c = first;
    while (c) { c.parent = link; c = c.next; }
    // A link cannot contain a link: a bare (GFM extended) autolink that
    // formed inside the link text is flattened back to plain text (doc-01:
    // the 'https://...' inside '[private https://... method](...)' is not
    // a link). An angle autolink '<...>' inside link text is kept nested
    // (doc-04, doc-05, doc-08).
    c = first;
    while (c) {
      const nx = c.next;
      if (c.t === 'link' && c.ext) {
        const tn = { t: 'text', s: plainTextOf(c.first), parent: link, next: c.next, prev: c.prev };
        if (c.prev) c.prev.next = tn; else link.first = tn;
        if (c.next) c.next.prev = tn; else link.last = tn;
      }
      c = nx;
    }
    // Replace the opener in its list with the link node.
    link.prev = opener.prev;
    if (opener.prev) opener.prev.next = link; else setFirst(par, link);
    link.next = null;
    setLast(par, link);
    // A link cannot contain a link: deactivate every '[' before the opener.
    // An image opener ('![') is not deactivated: an image's alt text is
    // plain text, so an outer image may still wrap an inner link (cm-520).
    // A deactivated '[' blocks the next ']' (see the ']' handler).
    let d = bottom;
    while (d) {
      if (d.ch === '[' && text[d.src - 1] !== '!') { d.active = false; d.blocked = true; }
      d = d.dprev;
    }
    removeFromDelim(opener);
    processEmphasis(bottom);
    return after;
  }

  let i = 0;
  while (i < n) {
    const c = text[i];
    if (c === '\\') {
      const d = text[i + 1];
      if (d === '\n') {
        appendNode({ t: 'br', parent: null });
        i += 2;
        // The next line's leading whitespace is stripped after a hard break
        // (cm-637).
        while (i < n && (text[i] === ' ' || text[i] === '\t')) i++;
        continue;
      }
      if (d && ASCII_PUNCT.indexOf(d) >= 0) { appendText(d === '&' ? '&amp;' : d); i += 2; continue; }
      appendText('\\'); i++;
      continue;
    }
    if (c === '`') {
      let j = i;
      while (j < n && text[j] === '`') j++;
      const run = j - i;
      // Find a matching run of exactly `run` backticks.
      let k = j;
      let found = -1;
      while (k < n) {
        if (text[k] === '`') {
          let m = k;
          while (m < n && text[m] === '`') m++;
          if (m - k === run) { found = k; break; }
          k = m;
        } else k++;
      }
      if (found >= 0) {
        let content = text.slice(j, found).replace(/\n/g, ' ');
        if (content.length >= 2 && content[0] === ' ' && content[content.length - 1] === ' ' && /[^ ]/.test(content)) {
          content = content.slice(1, -1);
        }
        appendNode({ t: 'code', s: content, parent: null });
        i = found + run;
      } else {
        appendText(text.slice(i, j));
        i = j;
      }
      continue;
    }
    if (c === '[') {
      pushDelim({ t: 'delim', ch: '[', len: 1, canOpen: false, canClose: false, active: true, blocked: false, src: i, parent: null });
      i++;
      continue;
    }
    if (c === ']') {
      // Find the nearest '[' delimiter.
      let opener = dTail;
      while (opener && opener.ch !== '[') opener = opener.dprev;
      if (!opener) { appendText(']'); i++; continue; }
      if (opener.blocked) {
        // This '[' was deactivated because a link formed inside it: it
        // blocks this ']' (which is literal) and is spent, so a later ']'
        // can reach an earlier opener (cm-520: the second ']' must not
        // form the image; the third ']' does).
        removeFromDelim(opener);
        appendText(']');
        i++;
        continue;
      }
      if (!opener.active) {
        // This '[' failed to form a link earlier; skip it and look for an
        // earlier active '['.
        let o2 = opener.dprev;
        while (o2 && !(o2.ch === '[' && o2.active && !o2.blocked)) o2 = o2.dprev;
        if (!o2) { appendText(']'); i++; continue; }
        opener = o2;
      }
      const after = tryLink(opener, i);
      if (after < 0) {
        opener.active = false;
        appendText(']');
        i++;
        continue;
      }
      i = after;
      continue;
    }
    if (c === '<') {
      const al = tryAngleAutolink(text, i);
      if (al) {
        appendNode({ t: 'link', href: al.href, title: null, first: { t: 'text', s: al.text, parent: null, next: null, prev: null }, last: null, parent: null });
        const ln = tail;
        ln.first.parent = ln;
        ln.last = ln.first;
        i = al.end;
        continue;
      }
      const tag = tryHtmlTag(text, i);
      if (tag) { appendNode({ t: 'html', s: tag.text, parent: null }); i = tag.end; continue; }
      appendText('<');
      i++;
      continue;
    }
    if (c === '*' || c === '_') {
      let j = i;
      while (j < n && text[j] === c) j++;
      const len = j - i;
      const prev = i > 0 ? text[i - 1] : '';
      const next = j < n ? text[j] : '';
      const prevWs = prev === '' || isWs(prev);
      const nextWs = next === '' || isWs(next);
      const prevPunct = isPunct(prev);
      const nextPunct = isPunct(next);
      const leftFlanking = !nextWs && (!nextPunct || prevWs || prevPunct);
      const rightFlanking = !prevWs && (!prevPunct || nextWs || nextPunct);
      let canOpen, canClose;
      if (c === '*') { canOpen = leftFlanking; canClose = rightFlanking; }
      else {
        canOpen = leftFlanking && (!rightFlanking || prevPunct);
        canClose = rightFlanking && (!leftFlanking || nextPunct);
      }
      pushDelim({ t: 'delim', ch: c, len, canOpen, canClose, active: true, src: i, parent: null });
      i = j;
      continue;
    }
    if (c === '~') {
      let j = i;
      while (j < n && text[j] === '~') j++;
      const len = j - i;
      // Strikethrough uses 1 or 2 tildes; a run of 3+ is literal text
      // (gfm-491: single '~there~' strikes; gfm-493: '~~~not~~~' does not).
      if (len >= 3) { appendText(text.slice(i, j)); i = j; continue; }
      const prev = i > 0 ? text[i - 1] : '';
      const next = j < n ? text[j] : '';
      const prevWs = prev === '' || isWs(prev);
      const nextWs = next === '' || isWs(next);
      const prevPunct = isPunct(prev);
      const nextPunct = isPunct(next);
      const leftFlanking = !nextWs && (!nextPunct || prevWs || prevPunct);
      const rightFlanking = !prevWs && (!prevPunct || nextWs || nextPunct);
      pushDelim({ t: 'delim', ch: '~', len, canOpen: leftFlanking, canClose: rightFlanking, active: true, src: i, parent: null });
      i = j;
      continue;
    }
    if (c === '\n') {
      // Hard break when the line ends with two or more spaces.
      if (tail && tail.t === 'text') {
        let k = tail.s.length;
        while (k > 0 && tail.s[k - 1] === ' ') k--;
        if (tail.s.length - k >= 2) {
          tail.s = tail.s.slice(0, k);
          if (tail.s.length === 0) removeNode(tail);
          appendNode({ t: 'br', parent: null });
          i++;
          // The next line's leading whitespace is stripped after a hard
          // break (cm-636, cm-637).
          while (i < n && (text[i] === ' ' || text[i] === '\t')) i++;
          continue;
        }
      }
      appendText('\n');
      i++;
      continue;
    }
    if (c === '@') {
      const em = matchEmail(text, i);
      if (em) {
        // Truncate the tail back to the autolink start (the local part may
        // span text and delimiter nodes, see truncateTail).
        if (truncateTail(i - em.start)) {
          appendNode({ t: 'link', ext: true, href: em.href, title: null, first: { t: 'text', s: em.text, parent: null, next: null, prev: null }, last: null, parent: null });
          const ln = tail;
          ln.first.parent = ln;
          ln.last = ln.first;
          i = em.end;
          continue;
        }
      }
      appendText('@');
      i++;
      continue;
    }
    if (c === 'w' && text.startsWith('www.', i) && (i === 0 || !isWordChar(text[i - 1]))) {
      const u = matchExtUrl(text, i);
      if (u) {
        appendNode({ t: 'link', ext: true, href: 'http://' + u.url, title: null, first: { t: 'text', s: u.url, parent: null, next: null, prev: null }, last: null, parent: null });
        const ln = tail;
        ln.first.parent = ln;
        ln.last = ln.first;
        i = u.end;
        continue;
      }
    }
    // The scheme is case-insensitive: 'Https://', 'HTTP://' etc. are links
    // (doc-01, doc-02).
    if ((c === 'h' || c === 'H') && (i === 0 || !isWordChar(text[i - 1]))) {
      const head = text.slice(i, i + 8).toLowerCase();
      if (head.startsWith('https://') || head.startsWith('http://')) {
        const u = matchExtUrl(text, i);
        if (u) {
          appendNode({ t: 'link', ext: true, href: u.url, title: null, first: { t: 'text', s: u.url, parent: null, next: null, prev: null }, last: null, parent: null });
          const ln = tail;
          ln.first.parent = ln;
          ln.last = ln.first;
          i = u.end;
          continue;
        }
      }
    }
    // Plain text run up to the next special character.
    let j = i + 1;
    while (j < n) {
      const d = text[j];
      if (d === '\\' || d === '`' || d === '[' || d === ']' || d === '<' || d === '&' || d === '*' || d === '_' || d === '~' || d === '\n' || d === '@') break;
      if (d === 'w' && text[j + 1] === 'w' && text[j + 2] === 'w' && text[j + 3] === '.') break;
      if (d === 'h' || d === 'H') {
        const hd = text.slice(j, j + 8).toLowerCase();
        if (hd.startsWith('https://') || hd.startsWith('http://')) break;
      }
      j++;
    }
    appendText(text.slice(i, j));
    i = j;
  }

  processEmphasis(null);
  const out = [];
  renderNodes(head, out);
  return out.join('');
}

function isWordChar(c) {
  if (!c) return false;
  const code = c.charCodeAt(0);
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || c === '_';
}

// ---------- block parsing ----------

const BLOCK_TAGS = new Set(('address article aside base basefont blockquote body caption center col colgroup dd details dialog dir div dl dt fieldset figcaption figure footer form frame frameset h1 h2 h3 h4 h5 h6 head header hr html iframe legend li link main menu menuitem nav noframes ol optgroup option p param search section summary table tbody td tfoot th thead title tr track ul').split(' '));

function isSetextLine(line) {
  const [ind, start] = indentOf(line);
  if (ind > 3) return 0;
  let j = start;
  const c = line[j];
  if (c !== '=' && c !== '-') return 0;
  while (j < line.length && line[j] === c) j++;
  while (j < line.length && (line[j] === ' ' || line[j] === '\t')) j++;
  if (j !== line.length) return 0;
  return c === '=' ? 1 : 2;
}

function isHrLine(line) {
  const [ind, start] = indentOf(line);
  if (ind > 3) return false;
  let j = start;
  const c = line[j];
  if (c !== '-' && c !== '*' && c !== '_') return false;
  let count = 0;
  while (j < line.length) {
    const ch = line[j];
    if (ch === c) { count++; j++; }
    else if (ch === ' ' || ch === '\t') j++;
    else return false;
  }
  return count >= 3;
}

function parseAtx(line) {
  const [ind, start] = indentOf(line);
  if (ind > 3) return null;
  let j = start;
  let level = 0;
  while (j < line.length && line[j] === '#') { level++; j++; }
  if (level === 0 || level > 6) return null;
  if (j < line.length && line[j] !== ' ' && line[j] !== '\t') return null;
  let s = j;
  while (s < line.length && (line[s] === ' ' || line[s] === '\t')) s++;
  let e = line.length;
  while (e > s && (line[e - 1] === ' ' || line[e - 1] === '\t')) e--;
  if (e > s) {
    let k = e;
    while (k > s && line[k - 1] === '#') k--;
    if (k < e && k > 0 && (line[k - 1] === ' ' || line[k - 1] === '\t')) {
      e = k;
      while (e > s && (line[e - 1] === ' ' || line[e - 1] === '\t')) e--;
    }
  }
  return { level, text: line.slice(s, e) };
}

function parseFence(line) {
  const [ind, start] = indentOf(line);
  if (ind > 3) return null;
  let j = start;
  const c = line[j];
  if (c !== '`' && c !== '~') return null;
  let k = j;
  while (k < line.length && line[k] === c) k++;
  const len = k - j;
  if (len < 3) return null;
  const info = line.slice(k);
  if (c === '`' && info.indexOf('`') >= 0) return null;
  return { ch: c, len, indent: ind, info };
}

function isClosingFence(line, ch, len) {
  const [ind, start] = indentOf(line);
  if (ind > 3) return false;
  let j = start;
  let k = j;
  while (k < line.length && line[k] === ch) k++;
  if (k - j < len) return false;
  while (k < line.length && (line[k] === ' ' || line[k] === '\t')) k++;
  return k === line.length;
}

// HTML block start: {type, endTag|end} or null. Types 1-5 end at a marker,
// 6-7 at a blank line. Type 7 cannot interrupt a paragraph.
function htmlBlockStart(line) {
  const [ind, start] = indentOf(line);
  if (ind > 3) return null;
  if (line[start] !== '<') return null;
  const rest = line.slice(start);
  const lower = rest.toLowerCase();
  const m1 = lower.match(/^<(script|pre|style|textarea)([\s>]|$)/);
  if (m1) return { type: 1, endTag: '</' + m1[1] };
  if (lower.startsWith('<!--')) return { type: 2, end: '-->' };
  if (lower.startsWith('<?')) return { type: 3, end: '?>' };
  if (/^<![a-z]/i.test(rest)) return { type: 4, end: '>' };
  if (lower.startsWith('<![cdata[')) return { type: 5, end: ']]>' };
  // Type 6: <tagname or </tagname where tagname is a block tag, followed by
  // whitespace, '>', '/', or end of line. The tag need not close on this
  // line (cm-153: <div id="foo" split across lines is still a block).
  const nameMatch = rest.match(/^<\/?([A-Za-z][A-Za-z0-9-]*)/);
  if (!nameMatch) return null;
  const name = nameMatch[1].toLowerCase();
  const afterName = rest[nameMatch[0].length];
  if (BLOCK_TAGS.has(name) && (afterName === undefined || afterName === ' ' || afterName === '\t' || afterName === '>' || afterName === '/')) return { type: 6 };
  // Type 7: a complete tag alone on the line (any tag name).
  const tag = tryHtmlTag(line, start);
  if (!tag) return null;
  const after = line.slice(start + (tag.end - start));
  if (/^[ \t]*$/.test(after)) return { type: 7 };
  return null;
}

function stripQuoteMarker(line) {
  const [ind, start] = indentOf(line);
  if (ind > 3) return null;
  if (line[start] !== '>') return null;
  // Remove '>' and one following column (the optional space). The rest starts
  // at column ind+1; tabs in it expand by absolute column.
  return stripFrom(line, start + 1, ind + 1, 1);
}

function isParaLine(s) {
  if (isBlankLine(s)) return false;
  if (isSetextLine(s)) return false;
  if (canInterruptParagraph(s)) return false;
  return true;
}

// Strip a list item's marker, returning its content, or null if the line is
// not a list item. Mirrors the content computation in parseList.
function stripListMarker(line) {
  const m = parseListMarker(line);
  if (!m) return null;
  const [ind, start] = indentOf(line);
  let col = ind + m.markerLen;
  let p = start + m.markerLen;
  while (p < line.length && (line[p] === ' ' || line[p] === '\t')) {
    if (line[p] === ' ') { col++; p++; }
    else { col += 4 - (col % 4); p++; }
  }
  if (p >= line.length) return '';
  if (col - (ind + m.markerLen) <= 4) return line.slice(p);
  return stripFrom(line, start + m.markerLen, ind + m.markerLen, 1);
}

// Strip every leading block-quote marker and list-item marker, returning the
// innermost content. A lazy continuation must reach the innermost open
// paragraph, which may sit inside a list inside a quote (cm-292, cm-293).
function innermostContent(line) {
  let s = line;
  for (;;) {
    const q = stripQuoteMarker(s);
    if (q !== null) { s = q; continue; }
    const l = stripListMarker(s);
    if (l !== null) { s = l; continue; }
    return s;
  }
}

// Whether a line's innermost content is an open paragraph (so a following
// line may be a lazy continuation of it). An indented code block is not a
// paragraph (cm-236).
function hasOpenPara(s) {
  const inner = innermostContent(s);
  return isParaLine(inner) && indentOf(inner)[0] < 4;
}

function collectQuote(lines, i, b) {
  const qlines = [];
  let j = i;
  let paraOpen = false;
  // A fenced code block open inside the quote: a lazy continuation line
  // cannot continue it, so it ends the quote (doc-01: a '```python' block
  // ends when a line without '>' appears).
  let fence = null;
  while (j < b) {
    const line = lines[j];
    const stripped = stripQuoteMarker(line);
    if (stripped !== null) {
      // A quote line that strips to only whitespace, while a paragraph is
      // open, is a paragraph continuation line, not a blank line (cm-241:
      // '>  ' adds a single space to the paragraph).
      if (paraOpen && stripped !== '' && isBlankLine(stripped)) {
        qlines[qlines.length - 1] += '\n' + stripped;
        j++;
        continue;
      }
      qlines.push(stripped);
      // Track fenced code blocks: while one is open, no paragraph is open.
      if (fence) {
        if (isClosingFence(stripped, fence.ch, fence.len)) fence = null;
        paraOpen = false;
      } else {
        const f = parseFence(stripped);
        if (f) { fence = f; paraOpen = false; }
        // A lazy continuation must reach the innermost open paragraph, so
        // look through nested quote markers and list items (cm-250/251,
        // cm-292/293); an indented code block is not a paragraph (cm-236).
        else paraOpen = hasOpenPara(stripped);
      }
      j++;
      continue;
    }
    if (isBlankLine(line)) break;
    if (paraOpen) {
      // A thematic break ends the quote (it is not a lazy continuation).
      if (isHrLine(line)) break;
      // A setext underline cannot be a lazy continuation: keep it as literal
      // text, indented so it is not read as an underline when re-parsed.
      if (isSetextLine(line)) {
        qlines.push('    ' + line);
        paraOpen = isParaLine('    ' + line);
        j++;
        continue;
      }
      if (!canInterruptParagraph(line)) {
        // A lazy continuation line indented 4+ columns loses the 4-column
        // code indent (cm-238); a smaller indent is kept. It is merged into
        // the previous line so the inner parse reads it as a paragraph
        // continuation, never as a new block (a lazy '- bar' is not a list).
        const lazy = indentOf(line)[0] >= 4 ? stripIndent(line, 4) : line;
        qlines[qlines.length - 1] += '\n' + lazy;
        paraOpen = true;
        j++;
        continue;
      }
    }
    break;
  }
  return { lines: qlines, next: j };
}

function parseListMarker(line) {
  const [ind, start] = indentOf(line);
  if (ind > 3) return null;
  const c = line[start];
  if (c === '-' || c === '+' || c === '*') {
    const after = line[start + 1];
    if (after === undefined || after === ' ' || after === '\t') {
      return { bullet: c, ordered: false, delim: null, num: 0, markerLen: 1, indent: ind };
    }
    return null;
  }
  if (isDigit(c)) {
    let j = start;
    while (j < line.length && isDigit(line[j])) j++;
    const numLen = j - start;
    if (numLen === 0 || numLen > 9) return null;
    const delim = line[j];
    if (delim !== '.' && delim !== ')') return null;
    const after = line[j + 1];
    if (after === undefined || after === ' ' || after === '\t') {
      return { bullet: null, ordered: true, delim, num: parseInt(line.slice(start, j), 10), markerLen: numLen + 1, indent: ind };
    }
    return null;
  }
  return null;
}

function sameListType(a, b) {
  if (a.ordered !== b.ordered) return false;
  if (!a.ordered) return a.bullet === b.bullet;
  return a.delim === b.delim;
}

function parseList(lines, i, b, ctx, firstMarker) {
  const isOrdered = firstMarker.ordered;
  const items = [];
  let loose = false;
  let j = i;
  let cur = firstMarker;
  const baseIndent = firstMarker.indent;
  while (j < b) {
    const line = lines[j];
    const [ind, start] = indentOf(line);
    const markerLen = cur.markerLen;
    const markerIndent = ind;
    let col = ind + markerLen;
    let p = start + markerLen;
    while (p < line.length && (line[p] === ' ' || line[p] === '\t')) {
      if (line[p] === ' ') { col++; p++; }
      else { col += 4 - (col % 4); p++; }
    }
    let contentIndent, firstContent;
    if (p >= line.length) {
      contentIndent = ind + markerLen + 1;
      firstContent = '';
    } else if (col - (ind + markerLen) <= 4) {
      contentIndent = col;
      firstContent = line.slice(p);
    } else {
      contentIndent = ind + markerLen + 1;
      // The content starts one column past the marker; advance exactly that
      // far, expanding any tab by absolute column (stripIndent would return
      // the whole line here, since it starts with the marker, not whitespace).
      firstContent = stripFrom(line, start + markerLen, ind + markerLen, 1);
    }
    const itemLines = [firstContent];
    let k = j + 1;
    let trailingBlanks = 0;
    // An item whose first line is empty and which is followed by a blank
    // line is empty; later lines are not its content (cm-280).
    let itemEmpty = firstContent === '';
    // Whether the item's content currently ends with an open paragraph, so
    // a following line may be a lazy continuation of it. Look through any
    // nested quote or list markers (cm-293: a paragraph inside a quote
    // inside a list item).
    let paraOpen = hasOpenPara(firstContent);
    while (k < b) {
      const l = lines[k];
      if (isBlankLine(l)) { itemLines.push(''); trailingBlanks++; k++; continue; }
      if (itemEmpty && trailingBlanks > 0) break;
      const [ind2] = indentOf(l);
      if (ind2 >= contentIndent) {
        const stripped = stripIndent(l, contentIndent);
        itemLines.push(stripped);
        trailingBlanks = 0;
        itemEmpty = false;
        paraOpen = hasOpenPara(stripped);
        k++;
        continue;
      }
      const lm = parseListMarker(l);
      if (lm) {
        // Beyond 3 columns from the list's base indent it is not a list
        // item at this level; with no blank line before it and an open
        // paragraph it is a lazy continuation (cm-312), otherwise it ends
        // the item (cm-313: indent 4 after a blank line is a code block).
        if (lm.indent > baseIndent + 3) {
          if (paraOpen && trailingBlanks === 0) {
            // Merge into the previous line so the inner parse reads it as
            // paragraph text, never as a new block (cm-312: '- e' is text).
            itemLines[itemLines.length - 1] += '\n' + stripIndent(l, contentIndent);
            trailingBlanks = 0;
            k++;
            continue;
          }
          break;
        }
        // A marker indented to the content indent, jumping more than one
        // column past this item's marker, with no blank line before it, is
        // a nested list (cm-325); otherwise it starts a new item and ends
        // this one (cm-295, cm-310: a one-column step stays in the list).
        if (lm.indent >= contentIndent && lm.indent > markerIndent + 1 && trailingBlanks === 0) {
          itemLines.push(l);
          trailingBlanks = 0;
          itemEmpty = false;
          paraOpen = false;
          k++;
          continue;
        }
        break;
      }
      // A non-marker line below the content indent is a lazy continuation
      // of the item's paragraph (cm-290, cm-291), if the paragraph is open,
      // no blank line intervenes, and the line starts no interrupting block.
      // Merge it into the previous line so the inner parse reads it as
      // paragraph text, never as a new block.
      if (paraOpen && trailingBlanks === 0 && isSetextLine(l) === 0 && !canInterruptParagraph(l)) {
        itemLines[itemLines.length - 1] += '\n' + stripIndent(l, contentIndent);
        trailingBlanks = 0;
        k++;
        continue;
      }
      break;
    }
    while (itemLines.length > 1 && itemLines[itemLines.length - 1] === '') itemLines.pop();
    // Parse the item's content with the list depth raised, so a nested
    // ordered list may interrupt a paragraph (doc-02: '49.').
    ctx.listDepth = (ctx.listDepth || 0) + 1;
    const inner = parseBlocks(itemLines, 0, itemLines.length, ctx);
    ctx.listDepth--;
    if (inner.blankBetween) loose = true;
    items.push(inner.nodes);
    if (trailingBlanks > 0 && k < b) {
      const nm = parseListMarker(lines[k]);
      if (nm && nm.indent <= baseIndent + 3 && sameListType(nm, firstMarker)) loose = true;
    }
    // Trailing blank lines of this item are not part of the list; hand them
    // back so the enclosing parser sees the blank line (cm-325: a blank
    // line between a nested list and a following paragraph makes the outer
    // list loose).
    const giveBack = trailingBlanks > 0 ? k - trailingBlanks : k;
    if (k >= b) { j = giveBack; break; }
    if (isHrLine(lines[k])) { j = giveBack; break; }
    const nm = parseListMarker(lines[k]);
    // A following item may be indented up to 3 columns past the list's base
    // indent and still belong to this list (cm-295, cm-310, cm-311). It may
    // also be dedented (doc-03: a TOC list whose first item is indented 2
    // and the rest are at 0 is a single list).
    if (!nm || nm.indent > baseIndent + 3 || !sameListType(nm, firstMarker)) { j = giveBack; break; }
    cur = nm;
    j = k;
  }
  return {
    node: { t: 'list', ordered: isOrdered, start: isOrdered ? firstMarker.num : 0, tight: !loose, items },
    next: j,
  };
}

// Split a table row on unescaped '|' outside code spans.
function splitTableRow(line) {
  const n = line.length;
  const cells = [];
  let cur = '';
  let k = 0;
  while (k < n) {
    const c = line[k];
    // An escaped pipe is a literal '|' in the cell, not a separator. Resolve
    // it here so a code span also renders '|' (gfm-200: '`\|`' is '<code>|</code>').
    if (c === '\\' && k + 1 < n && line[k + 1] === '|') { cur += '|'; k += 2; continue; }
    if (c === '\\' && k + 1 < n) { cur += line[k] + line[k + 1]; k += 2; continue; }
    if (c === '`') {
      let m = k;
      while (m < n && line[m] === '`') m++;
      const run = m - k;
      let found = -1;
      let p = m;
      while (p < n) {
        if (line[p] === '`') {
          let q = p;
          while (q < n && line[q] === '`') q++;
          if (q - p === run) { found = p; break; }
          p = q;
        } else p++;
      }
      if (found >= 0) {
        // Resolve an escaped pipe inside the code span too (gfm-200).
        cur += line.slice(k, found + run).replace(/\\\|/g, '|');
        k = found + run;
        continue;
      }
      cur += line.slice(k, m);
      k = m;
      continue;
    }
    if (c === '|') { cells.push(cur); cur = ''; k++; continue; }
    cur += c; k++;
  }
  cells.push(cur);
  let startIdx = 0, endIdx = cells.length;
  let f = 0;
  while (f < n && (line[f] === ' ' || line[f] === '\t')) f++;
  // The text before a leading '|' is only whitespace (doc-02: a row
  // starting with ' |' has no empty first cell).
  if (line[f] === '|' && cells[0].trim() === '') startIdx = 1;
  let l = n - 1;
  while (l >= 0 && (line[l] === ' ' || line[l] === '\t')) l--;
  if (line[l] === '|' && cells[cells.length - 1].trim() === '') {
    // Make sure that trailing '|' is not escaped.
    let bs = 0;
    let q = l - 1;
    while (q >= 0 && line[q] === '\\') { bs++; q--; }
    if (bs % 2 === 0) endIdx = cells.length - 1;
  }
  const out = [];
  for (let x = startIdx; x < endIdx; x++) out.push(cells[x].trim());
  return out;
}

function tryTable(lines, i, b) {
  if (i + 1 >= b) return null;
  // The delimiter row must be indented less than 4 columns, like any block.
  const [delimInd] = indentOf(lines[i + 1]);
  if (delimInd >= 4) return null;
  const headerCells = splitTableRow(lines[i]);
  const delimCells = splitTableRow(lines[i + 1]);
  if (headerCells.length !== delimCells.length) return null;
  const align = [];
  for (const cell of delimCells) {
    const c = cell.trim();
    if (!/^:?-+:?$/.test(c)) return null;
    if (c.startsWith(':') && c.endsWith(':')) align.push('center');
    else if (c.startsWith(':')) align.push('left');
    else if (c.endsWith(':')) align.push('right');
    else align.push(null);
  }
  const rows = [];
  let j = i + 2;
  while (j < b && !isBlankLine(lines[j])) {
    // A line that starts a new block (blockquote, heading, list, ...) ends
    // the table (gfm-201: '> bar' is a blockquote, not a row).
    if (canInterruptParagraph(lines[j])) break;
    rows.push(splitTableRow(lines[j]));
    j++;
  }
  return { node: { t: 'table', align, header: headerCells, rows }, next: j };
}

function canInterruptParagraph(line, inList) {
  const [ind, start] = indentOf(line);
  if (ind > 3) return false;
  if (parseAtx(line)) return true;
  if (parseFence(line)) return true;
  if (isHrLine(line)) return true;
  if (line[start] === '>') return true;
  const m = parseListMarker(line);
  if (m) {
    const rest = line.slice(start + m.markerLen);
    if (isBlankLine(rest)) return false;
    // An ordered list can interrupt a paragraph only when it starts with 1,
    // except inside a list item, where a nested list may start with any
    // number (doc-02: '49.' starts a nested list after a paragraph).
    if (m.ordered && m.num !== 1 && !inList) return false;
    return true;
  }
  const hb = htmlBlockStart(line);
  if (hb && hb.type !== 7) return true;
  return false;
}

function parseParagraph(lines, i, b, ctx) {
  let text = lines[i];
  let j = i + 1;
  while (j < b) {
    const line = lines[j];
    if (isBlankLine(line)) break;
    const se = isSetextLine(line);
    // A setext heading's text is the paragraph text trimmed of leading and
    // trailing whitespace (cm-082, cm-084, cm-089); a plain paragraph keeps
    // its whitespace (cm-056, cm-222, cm-226, cm-645).
    if (se) return { node: { t: 'h', level: se, text: text.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '') }, next: j + 1 };
    if (j === i + 1) {
      const t = tryTable(lines, i, b);
      if (t) return { node: t.node, next: t.next };
    }
    if (canInterruptParagraph(line, ctx.listDepth > 0)) break;
    text += '\n' + line;
    j++;
  }
  return { node: { t: 'para', text }, next: j };
}

// Parse a link reference definition starting at lines[i]. Returns the number
// of lines consumed, or 0 when it is not a definition.
function parseLinkRefDef(lines, i, ctx) {
  const line = lines[i];
  const [ind, start] = indentOf(line);
  if (ind > 3 || line[start] !== '[') return 0;
  const avail = [];
  for (let k = 0; k < 10 && i + k < lines.length; k++) {
    // A definition cannot span a blank line (cm-197).
    if (k > 0 && isBlankLine(lines[i + k])) break;
    avail.push(lines[i + k]);
  }
  const s = avail.join('\n');
  const lineStart = [0];
  for (let k = 1; k < avail.length; k++) lineStart.push(lineStart[k - 1] + avail[k - 1].length + 1);
  function lineOf(pos) {
    let l = 0;
    for (let k = 0; k < lineStart.length; k++) if (lineStart[k] <= pos) l = k;
    return l;
  }
  const lab = parseLabel(s, start + 1);
  if (!lab) return 0;
  // A label that is empty or only whitespace is not a definition at all
  // (cm-551 '[]: /uri', cm-552 '[\n ]: /uri' stay as paragraphs).
  if (normalizeLabel(lab.label) === '') return 0;
  let p = lab.next;
  if (s[p] !== ':') return 0;
  p++;
  // Skip whitespace; the destination may be on the next line.
  while (p < s.length && (s[p] === ' ' || s[p] === '\t')) p++;
  if (p < s.length && s[p] === '\n') {
    let p2 = p + 1;
    while (p2 < s.length && (s[p2] === ' ' || s[p2] === '\t')) p2++;
    if (p2 < s.length && s[p2] !== '\n') p = p2;
    else return 0;
  }
  if (p >= s.length) return 0;
  const destIsAngle = s[p] === '<';
  const d = parseDest(s, p);
  if (!d) return 0;
  if (d.dest === '' && !destIsAngle) return 0;
  let q = d.next;
  let title = null;
  let r = q;
  let titleOnNewLine = false;
  // A title must be separated from the destination by whitespace (a space,
  // tab, or newline); <bar>(baz) is not a definition (cm-201).
  let hadWs = false;
  while (r < s.length && (s[r] === ' ' || s[r] === '\t')) { r++; hadWs = true; }
  if (r < s.length && (s[r] === '"' || s[r] === "'" || s[r] === '(') && hadWs) {
    const t = parseTitle(s, r);
    if (t) { title = t.title; r = t.next; }
  } else if (r < s.length && s[r] === '\n') {
    // The title may be on the next line.
    let r2 = r + 1;
    while (r2 < s.length && (s[r2] === ' ' || s[r2] === '\t')) r2++;
    if (r2 < s.length && (s[r2] === '"' || s[r2] === "'" || s[r2] === '(')) {
      const t = parseTitle(s, r2);
      if (t) { title = t.title; r = t.next; titleOnNewLine = true; }
    }
  }
  while (r < s.length && (s[r] === ' ' || s[r] === '\t')) r++;
  if (r < s.length && s[r] !== '\n') {
    // Junk after the title (or after the destination). If the title was on a
    // new line, the definition is still good with just the destination and
    // the title line is left as its own paragraph (cm-210).
    if (titleOnNewLine) {
      const key0 = normalizeLabel(lab.label);
      if (key0 !== '' && !ctx.links.has(key0)) ctx.links.set(key0, { href: d.dest, title: null });
      return lineOf(d.next) + 1;
    }
    return 0;
  }
  const consumed = r >= s.length ? lineOf(s.length - 1) + 1 : lineOf(r) + 1;
  const key = normalizeLabel(lab.label);
  if (key !== '' && !ctx.links.has(key)) {
    ctx.links.set(key, { href: d.dest, title });
  }
  return consumed;
}

// Expand tabs to spaces by absolute column (a tab advances to the next
// multiple of 4). Used for fenced code content (doc-04: a '\t' at the start
// of a code line renders as 4 spaces).
function expandTabs(s) {
  if (s.indexOf('\t') < 0) return s;
  let out = '';
  let col = 0;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (c === '\t') {
      const n = 4 - (col % 4);
      out += ' '.repeat(n);
      col += n;
    } else {
      out += c;
      col++;
    }
  }
  return out;
}

function parseBlocks(lines, a, b, ctx) {
  const nodes = [];
  let blankBetween = false;
  let i = a;
  let hadBlank = false;
  while (i < b) {
    const line = lines[i];
    if (isBlankLine(line)) { hadBlank = true; i++; continue; }
    if (hadBlank && nodes.length > 0) blankBetween = true;
    hadBlank = false;
    const [ind, start] = indentOf(line);
    if (ind <= 3 && line[start] === '[') {
      const consumed = parseLinkRefDef(lines, i, ctx);
      if (consumed > 0) { i += consumed; continue; }
    }
    if (ind >= 4) {
      const codeLines = [];
      let j = i;
      while (j < b) {
        const l = lines[j];
        if (isBlankLine(l)) { codeLines.push(stripIndent(l, 4)); j++; continue; }
        const [ind2] = indentOf(l);
        if (ind2 >= 4) { codeLines.push(stripIndent(l, 4)); j++; continue; }
        break;
      }
      while (codeLines.length > 0 && isBlankLine(codeLines[codeLines.length - 1])) codeLines.pop();
      nodes.push({ t: 'code', lang: null, text: codeLines.join('\n') + '\n', fenced: false });
      i = j;
      continue;
    }
    const atx = parseAtx(line);
    if (atx) { nodes.push({ t: 'h', level: atx.level, text: atx.text }); i++; continue; }
    const fence = parseFence(line);
    if (fence) {
      const content = [];
      let j = i + 1;
      while (j < b) {
        if (isClosingFence(lines[j], fence.ch, fence.len)) break;
        content.push(stripIndent(lines[j], fence.indent));
        j++;
      }
      // A fenced code block drops at most one trailing empty line (cm-318:
      // content 'b', '', '' renders as 'b\n\n'), but keeps whitespace-only
      // lines (cm-129: content '', '  ' renders as '\n  \n').
      if (content.length > 0 && content[content.length - 1] === '') content.pop();
      const info = fence.info.replace(/^[ \t]+/, '');
      let k = 0;
      while (k < info.length && info[k] !== ' ' && info[k] !== '\t') k++;
      // Backslash escapes in the info string are processed: \+ becomes +.
      let lang = '';
      const rawLang = info.slice(0, k);
      for (let m = 0; m < rawLang.length; m++) {
        if (rawLang[m] === '\\' && m + 1 < rawLang.length && ASCII_PUNCT.indexOf(rawLang[m + 1]) >= 0) { lang += rawLang[m + 1]; m++; }
        else lang += rawLang[m];
      }
      nodes.push({ t: 'code', lang, text: content.length ? content.join('\n') + '\n' : '', fenced: true });
      i = j < b ? j + 1 : j;
      continue;
    }
    if (isHrLine(line)) { nodes.push({ t: 'hr' }); i++; continue; }
    const hb = htmlBlockStart(line);
    if (hb) {
      const blockLines = [line];
      let j = i + 1;
      if (hb.type === 1) {
        if (!line.toLowerCase().includes(hb.endTag)) {
          while (j < b) {
            blockLines.push(lines[j]);
            if (lines[j].toLowerCase().includes(hb.endTag)) { j++; break; }
            j++;
          }
        }
      } else if (hb.type >= 2 && hb.type <= 5) {
        const endMark = hb.end;
        let startHasEnd;
        if (hb.type === 2) startHasEnd = line.includes('-->');
        else if (hb.type === 3) startHasEnd = line.includes('?>');
        else if (hb.type === 4) startHasEnd = line.indexOf('>', start + 2) >= 0;
        else startHasEnd = line.includes(']]>');
        if (!startHasEnd) {
          while (j < b) {
            blockLines.push(lines[j]);
            if (lines[j].includes(endMark)) { j++; break; }
            j++;
          }
        }
      } else {
        while (j < b && !isBlankLine(lines[j])) { blockLines.push(lines[j]); j++; }
      }
      // The block carries a trailing newline only when the next line in this
      // container is a real line, not a blank line or the end (cm-169/177 vs
      // cm-152/183/190).
      nodes.push({ t: 'html', text: blockLines.join('\n') + (j < b && !isBlankLine(lines[j]) ? '\n' : '') });
      i = j;
      continue;
    }
    if (ind <= 3 && line[start] === '>') {
      const q = collectQuote(lines, i, b);
      const inner = parseBlocks(q.lines, 0, q.lines.length, ctx);
      nodes.push({ t: 'quote', children: inner.nodes });
      i = q.next;
      continue;
    }
    const listStart = parseListMarker(line);
    if (listStart) {
      const res = parseList(lines, i, b, ctx, listStart);
      nodes.push(res.node);
      i = res.next;
      continue;
    }
    const para = parseParagraph(lines, i, b, ctx);
    nodes.push(para.node);
    i = para.next;
  }
  return { nodes, blankBetween };
}

// ---------- rendering ----------

function renderListItem(blocks, tight, ctx) {
  let out = '';
  let checkbox = null;
  if (blocks.length > 0 && blocks[0].t === 'para') {
    const m = blocks[0].text.match(/^\[( |x|X)\]\s/);
    if (m) {
      checkbox = m[1] === ' ' ? '<input disabled="" type="checkbox">' : '<input checked="" disabled="" type="checkbox">';
      blocks[0] = { t: 'para', text: blocks[0].text.slice(m[0].length) };
    }
  }
  for (let k = 0; k < blocks.length; k++) {
    const b = blocks[k];
    if (k === 0 && checkbox !== null && b.t === 'para') {
      const inner = inlineParse(b.text, ctx.links);
      if (tight) out += checkbox + ' ' + inner;
      else out += '<p>' + checkbox + ' ' + inner + '</p>\n';
      continue;
    }
    out += renderBlock(b, ctx, tight);
  }
  return out;
}

function renderBlock(node, ctx, tight) {
  switch (node.t) {
    case 'para': {
      const inner = inlineParse(node.text, ctx.links);
      return tight ? inner : '<p>' + inner + '</p>\n';
    }
    case 'h':
      return '<h' + node.level + '>' + inlineParse(node.text, ctx.links) + '</h' + node.level + '>\n';
    case 'code': {
      let out = '<pre><code';
      if (node.lang) out += ' class="language-' + escAttr(node.lang) + '"';
      out += '>' + esc(node.text) + '</code></pre>\n';
      return out;
    }
    case 'hr':
      return '<hr>\n';
    case 'html':
      return node.text;
    case 'quote':
      return '<blockquote>\n' + renderBlocks(node.children, ctx, false) + '</blockquote>\n';
    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul';
      let out = '<' + tag;
      if (node.ordered && node.start !== 1) out += ' start="' + node.start + '"';
      out += '>\n';
      for (const item of node.items) {
        out += '<li>' + renderListItem(item, node.tight, ctx) + '</li>\n';
      }
      out += '</' + tag + '>\n';
      return out;
    }
    case 'table': {
      let out = '<table>\n<thead>\n<tr>\n';
      for (let c = 0; c < node.header.length; c++) {
        const a = node.align[c];
        out += '<th' + (a ? ' align="' + a + '"' : '') + '>' + inlineParse(node.header[c], ctx.links) + '</th>\n';
      }
      out += '</tr>\n</thead>\n';
      // A table with no body rows has no <tbody> at all (gfm-205).
      if (node.rows.length === 0) return out + '</table>\n';
      out += '<tbody>';
      for (const row of node.rows) {
        out += '<tr>\n';
        for (let c = 0; c < node.header.length; c++) {
          const a = node.align[c];
          const cell = c < row.length ? row[c] : '';
          out += '<td' + (a ? ' align="' + a + '"' : '') + '>' + inlineParse(cell, ctx.links) + '</td>\n';
        }
        out += '</tr>\n';
      }
      out += '</tbody></table>\n';
      return out;
    }
    default:
      return '';
  }
}

function renderBlocks(nodes, ctx, tight) {
  let out = '';
  for (const node of nodes) out += renderBlock(node, ctx, tight);
  return out;
}

export function parse(markdown) {
  const src = markdown.replace(/\r\n?/g, '\n');
  // Whether the source's last line is newline-terminated.
  const endsWithNewline = src.endsWith('\n');
  const lines = src.split('\n');
  // A trailing newline terminates the last line; it is not a line of its own.
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  const ctx = { links: new Map() };
  const { nodes } = parseBlocks(lines, 0, lines.length, ctx);
  let out = renderBlocks(nodes, ctx, false);
  // An HTML block carries no trailing newline of its own, so a document
  // ending in one ends with a newline only when the source did (cm-148:
  // the source ends with '\n'; gfm-657: it does not).
  if (out.length > 0 && !out.endsWith('\n') && endsWithNewline) out += '\n';
  return out;
}
