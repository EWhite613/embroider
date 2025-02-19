import { PreparedApp } from 'scenario-tester';
import { join } from 'path';
import { readFileSync } from 'fs';
import globby from 'globby';
import { set } from 'lodash';
import type { JSDOM } from 'jsdom';

export interface FastbootTestHelpers {
  visit(url: string): Promise<JSDOM>;
  fetchAsset(url: string): Promise<string>;
}

export async function setupFastboot(
  app: PreparedApp,
  environment = 'development',
  envVars?: Record<string, string>
): Promise<FastbootTestHelpers> {
  let result = await app.execute(`node node_modules/ember-cli/bin/ember build --environment=${environment}`, {
    env: envVars,
  });

  if (result.exitCode !== 0) {
    throw new Error(`failed to build app for fastboot: ${result.output}`);
  }

  const FastBoot = require('fastboot');

  let fastboot = new FastBoot({
    distPath: join(app.dir, 'dist'),
    resilient: false,
  });

  async function visit(url: string) {
    const jsdom = require('jsdom');
    const { JSDOM } = jsdom;
    let visitOpts = {
      request: { headers: { host: 'localhost:4200' } },
    };
    let page = await fastboot.visit(url, visitOpts);
    let html = await page.html();
    return new JSDOM(html);
  }

  async function fetchAsset(url: string): Promise<string> {
    const origin = 'http://example.com';
    let u = new URL(url, origin);
    if (u.origin !== origin) {
      throw new Error(`fetchAsset only supports local assets, you asked for ${url}`);
    }
    return readFileSync(join(app.dir, 'dist', u.pathname), 'utf-8');
  }

  return { visit, fetchAsset };
}

export function loadFromFixtureData(fixtureNamespace: string) {
  const root = join(__dirname, '..', 'fixtures', fixtureNamespace);
  const paths = globby.sync('**', { cwd: root, dot: true });
  const fixtureStructure: any = {};

  paths.forEach(path => {
    set(fixtureStructure, path.split('/'), readFileSync(join(root, path), 'utf8'));
  });

  return fixtureStructure;
}
