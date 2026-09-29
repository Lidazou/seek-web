#!/usr/bin/env node
/*
 * 本地静态服务器（零依赖，跨平台）
 * ---------------------------------------------------------------------------
 * 为什么需要它：本项目用 ES Module 拆分代码，浏览器禁止 file:// 页面
 * 用 import 加载本地模块，所以必须通过 HTTP 打开。
 *
 * 用法：
 *   node serve.mjs            # 默认 http://127.0.0.1:8899
 *   node serve.mjs 3000       # 指定端口
 *
 * 这是开发工具，不是网站的一部分。部署到 GitHub Pages 时不需要它。
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const PORT = Number(process.argv[2]) || 8899;
const ROOT = resolve(import.meta.dirname ?? '.');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = createServer(async (request, response) => {
  const urlPath = decodeURIComponent((request.url || '/').split('?')[0]);
  const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const filePath = join(ROOT, normalize(relative));

  /* 防目录穿越：只允许读取项目目录内的文件 */
  if (!filePath.startsWith(ROOT)) {
    response.writeHead(403).end('forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('404 not found: ' + relative);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  SEEK 前端 · 本地预览');
  console.log('  http://127.0.0.1:' + PORT + '/');
  console.log('');
  console.log('  停止服务：Ctrl-C');
  console.log('  提示：模块化版本必须通过 HTTP 打开，不能双击 index.html。');
  console.log('');
});
