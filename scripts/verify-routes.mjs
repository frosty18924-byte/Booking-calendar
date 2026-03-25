#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const appRoot = path.join(repoRoot, 'src', 'app');
const pagesApiRoot = path.join(repoRoot, 'src', 'pages', 'api');

function listFiles(dir, exts) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(full, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function normalizeRoute(raw) {
  const withoutHash = raw.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  if (!withoutQuery.startsWith('/')) return null;
  const cleaned = withoutQuery.replace(/\/+$/g, '') || '/';
  return cleaned;
}

function extractStaticRoutesFromText(text) {
  const results = new Set();

  const pushRe = /router\.push\(\s*(['"`])([^'"`]*?)\1\s*\)/g;
  const hrefRe = /href\s*=\s*(['"])(\/[^'"]*?)\1/g;

  for (const match of text.matchAll(pushRe)) {
    const value = match[2];
    if (!value || value.includes('${')) continue;
    const normalized = normalizeRoute(value);
    if (normalized) results.add(normalized);
  }

  for (const match of text.matchAll(hrefRe)) {
    const value = match[2];
    if (!value || value.includes('${')) continue;
    const normalized = normalizeRoute(value);
    if (normalized) results.add(normalized);
  }

  return results;
}

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function appRouteExists(routePath) {
  if (routePath === '/') return exists(path.join(appRoot, 'page.tsx'));

  const parts = routePath.replace(/^\//, '').split('/');
  const base = path.join(appRoot, ...parts);

  return (
    exists(path.join(base, 'page.tsx')) ||
    exists(path.join(base, 'route.ts')) ||
    exists(path.join(base, 'layout.tsx'))
  );
}

function apiRouteExists(routePath) {
  const parts = routePath.replace(/^\//, '').split('/'); // starts with api
  const apiParts = parts.slice(1); // drop "api"
  const appApiRoute = path.join(appRoot, 'api', ...apiParts, 'route.ts');
  if (exists(appApiRoute)) return true;

  const pagesApiRoute = path.join(pagesApiRoot, ...apiParts) + '.ts';
  if (exists(pagesApiRoute)) return true;

  return false;
}

const sourceFiles = listFiles(appRoot, ['.ts', '.tsx']);

const routes = new Set(['/']);
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const route of extractStaticRoutesFromText(text)) routes.add(route);
}

const missing = [];
for (const route of Array.from(routes).sort()) {
  if (route === '/_not-found') continue;
  if (route.startsWith('/api/')) {
    if (!apiRouteExists(route)) missing.push(route);
    continue;
  }
  if (!appRouteExists(route)) missing.push(route);
}

if (missing.length > 0) {
  console.error('Route verification failed. Missing route handlers/pages:');
  for (const r of missing) console.error(`- ${r}`);
  process.exit(1);
}

console.log(`OK: verified ${routes.size} referenced routes (no missing pages/routes).`);

