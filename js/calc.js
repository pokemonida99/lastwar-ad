// 門上的算式：開頭 + − × ÷ 決定門的顏色（+ × 藍、− ÷ 紅），後面的算式才決定實際效果，
// 所以藍門也可能倒扣（+ 3×4−20），紅門也可能反加（− (−10)）。
// 支援：+ − × ÷、括號、負號、√、次方（² ³ 或 ^）、階乘 !、log₂ log₃ log₁₀（沒寫底數是 10）、C(n,k)、P(n,k)
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹', SUB = '₀₁₂₃₄₅₆₇₈₉';
const OPS = { '+': '+', '-': '−', x: '×', '/': '÷' };

export const normalize = (s) => s.replace(/\s+/g, '').replace(/[xX*]/g, '×').replace(/\//g, '÷').replace(/-/g, '−');
const snap = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v) : v);

export function calc(src) {
  const t = normalize(src);
  let i = 0;
  const fail = () => { throw new Error(`算式看不懂：${src}（第 ${i + 1} 個字）`); };
  const eat = (c) => { if (t[i] !== c) fail(); i++; };
  const fact = (n) => { n = snap(n); if (n < 0 || n !== Math.floor(n) || n > 20) fail(); let r = 1; for (let k = 2; k <= n; k++) r *= k; return r; };
  const num = () => { const m = /^\d+(\.\d+)?/.exec(t.slice(i)); if (!m) fail(); i += m[0].length; return +m[0]; };
  function primary() {
    const c = t[i];
    if (c === '(') { i++; const v = expr(); eat(')'); return v; }
    if (c === '√') { i++; return snap(Math.sqrt(postfix())); }
    if (t.startsWith('log', i)) {
      i += 3;
      let b = '';
      while (SUB.includes(t[i])) b += SUB.indexOf(t[i++]);
      return snap(Math.log(postfix()) / Math.log(b ? +b : 10));
    }
    if ((c === 'C' || c === 'P') && t[i + 1] === '(') {
      i += 2;
      const n = expr(); eat(','); const k = expr(); eat(')');
      const p = fact(n) / fact(n - k);
      return c === 'P' ? p : p / fact(k);
    }
    return num();
  }
  function postfix() {
    let v = primary();
    for (;;) {
      if (t[i] === '!') { i++; v = fact(v); } else if (SUP.includes(t[i])) {
        let e = '';
        while (SUP.includes(t[i])) e += SUP.indexOf(t[i++]);
        v = v ** +e;
      } else return v;
    }
  }
  function power() { const b = postfix(); if (t[i] === '^') { i++; return snap(b ** unary()); } return b; }
  function unary() { if (t[i] === '−') { i++; return -unary(); } return power(); }
  function term() { let v = unary(); while (t[i] === '×' || t[i] === '÷') { const o = t[i++]; const r = unary(); v = o === '×' ? v * r : v / r; } return v; }
  function expr() { let v = term(); while (t[i] === '+' || t[i] === '−') { const o = t[i++]; const r = term(); v = o === '+' ? v + r : v - r; } return v; }
  const v = expr();
  if (i < t.length) fail();
  return snap(v);
}

// spec 可以是 ['+', 10] 或算式字串 '+ 6×7'
export function parseGate(spec) {
  let op, body;
  if (Array.isArray(spec)) { op = spec[0]; body = String(spec[1]); } else {
    const s = spec.trim();
    op = { '+': '+', '-': '-', '−': '-', '×': 'x', x: 'x', '÷': '/', '/': '/' }[s[0]];
    if (!op) throw new Error(`門要用 + − × ÷ 開頭：${spec}`);
    body = s.slice(1);
  }
  const v = calc(body);
  const apply = (c) => {
    const r = op === '+' ? c + v : op === '-' ? c - v : op === 'x' ? c * v : v ? c / v : c;
    return Math.max(0, Math.floor(r + 1e-9));
  };
  // 顯示時把 ^數字 換成上標（2^10 → 2¹⁰），算法不變
  const label = normalize(body).replace(/\^(\d+)/g, (m, d) => [...d].map((c) => SUP[c]).join(''));
  return { op, v, blue: op === '+' || op === 'x', label: `${OPS[op]} ${label}`, apply };
}
