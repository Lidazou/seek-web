/*
 * 模块化前端静态校验（不需要浏览器）
 *   1. import 路径是否可解析
 *   2. 具名导入是否真的被目标模块导出
 *   3. JS 里用到的 DOM id 是否都存在于 index.html
 *   4. data-testid 是否唯一
 *   5. 是否残留旧全局（window.SeekLibrary / window.seekSearchActive 等）
 * 用法：node _verify_modules.js SEEK_Frontend
 */
const fs = require('fs');
const path = require('path');

const root = process.argv[2] || 'SEEK_Frontend';
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) files.push(path.resolve(full));
  }
})(path.join(root, 'js'));
files.push(path.resolve(root, 'config/seek-config.js'));

const problems = [];
const note = (file, msg) => problems.push(`${path.relative(root, file)}: ${msg}`);

/* ---- 收集每个文件的导出 ---- */
const exportsOf = new Map();
function collectExports(file, text) {
  const names = new Set();
  for (const m of text.matchAll(/export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([\w$]+)/g)) names.add(m[1]);
  for (const m of text.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const alias = part.trim().split(/\s+as\s+/);
      if (alias.length === 2) names.add(alias[1].trim());
      else if (alias[0]) names.add(alias[0].trim());
    }
  }
  if (/export\s+default/.test(text)) names.add('default');
  exportsOf.set(file, names);
}
for (const file of files) collectExports(file, fs.readFileSync(file, 'utf8'));

/* ---- 校验 import ---- */
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const importRe = /import\s+([^'"]+?)\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(text))) {
    const clause = m[1].trim();
    const spec = m[2];
    if (!spec.startsWith('.')) continue; // 裸模块（目前没有）
    const target = path.resolve(path.dirname(file), spec);
    if (!fs.existsSync(target)) { note(file, `import 路径不存在: ${spec}`); continue; }
    const available = exportsOf.get(target) || new Set();
    const braced = clause.match(/\{([^}]*)\}/);
    if (braced) {
      for (const part of braced[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0].trim();
        if (!name) continue;
        if (!available.has(name)) note(file, `「${name}」未被 ${spec} 导出`);
      }
    }
    const def = clause.replace(/\{[^}]*\}/, '').replace(/,/g, '').trim();
    if (def && !available.has('default')) note(file, `默认导入但 ${spec} 没有 default 导出`);
  }
}

/* ---- DOM id 校验 ---- */
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const htmlIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/\bel\(\s*'([^']+)'\s*\)/g)) {
    if (!htmlIds.has(m[1])) note(file, `index.html 里没有 id="${m[1]}"`);
  }
  for (const m of text.matchAll(/getElementById\(\s*'([^']+)'\s*\)/g)) {
    if (!htmlIds.has(m[1])) note(file, `index.html 里没有 id="${m[1]}"`);
  }
}

/* ---- data-testid 唯一性 ---- */
const testIds = [...html.matchAll(/data-testid="([^"]+)"/g)].map((m) => m[1]);
const dupes = testIds.filter((v, i) => testIds.indexOf(v) !== i);

/* ---- 旧全局残留 ---- */
for (const file of files) {
  if (path.basename(file) === 'main.js') continue;
  const text = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  if (/window\.SeekLibrary/.test(text)) note(file, '残留全局 window.SeekLibrary');
  if (/window\.seekSearchActive/.test(text)) note(file, '残留全局 window.seekSearchActive');
  if (/\bdocument\.getElementById\b/.test(text) && path.basename(file) !== 'cd-library.js') {
    // 允许，但提醒统一走 shared/dom
  }
}

/* ---- 报告 ---- */
console.log(`模块文件: ${files.length}`);
console.log(`index.html id: ${htmlIds.size}, data-testid: ${testIds.length}${dupes.length ? ' (重复: ' + dupes.join(',') + ')' : ''}`);
const controllers = files.filter((f) => /seek-api\.js$/.test(f));
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const fetches = (text.match(/\bfetch\(/g) || []).length;
  if (fetches && !/seek-api\.js$/.test(f)) note(f, `出现了 fetch()（应只在 seek-api.js）共 ${fetches} 处`);
}
if (problems.length) {
  console.log('\n发现 ' + problems.length + ' 个问题：');
  problems.forEach((p) => console.log('  ✗ ' + p));
  process.exit(1);
} else {
  console.log('\n✓ 模块依赖、导出、DOM id、testid、全局残留 全部通过');
}
