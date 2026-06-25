import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const baseUrl = (process.env.DOPPIO_PAGES_URL || 'http://127.0.0.1:4173').replace(/\/+$/, '');
const executablePath = process.env.DOPPIO_CHROMIUM_EXECUTABLE || undefined;
const browser = await chromium.launch({
  executablePath,
  headless: true
});

try {
  const desktop = await browser.newContext({
    viewport: {width: 1440, height: 1000}
  });
  await desktop.addCookies([{
    name: 'dev_bypass_waf',
    value: 'seorii_bypass_token_is_this',
    domain: new URL(baseUrl).hostname,
    path: '/'
  }]);
  const page = await desktop.newPage();
  page.setDefaultTimeout(900_000);
  const browserErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => browserErrors.push(error.stack || error.message));
  page.on('requestfailed', (request) => {
    browserErrors.push(`${request.failure()?.errorText || 'request failed'} ${request.url()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      browserErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`${baseUrl}/`, {waitUntil: 'networkidle'});
  assert.equal(await page.locator('h1').textContent(), 'Doppio Modern JVM');
  assert.equal(await page.locator('a[href="./playground/"]').count() > 0, true);

  await page.goto(`${baseUrl}/docs.html?page=compatibility`, {waitUntil: 'networkidle'});
  await page.locator('#document-content h1').waitFor();
  assert.match(await page.locator('#document-content').innerText(), /Modern Java Compatibility/);
  assert.equal(await page.locator('#document-content table').count() > 0, true);

  await page.goto(`${baseUrl}/playground/`, {waitUntil: 'networkidle'});
  await page.locator('#source-editor').fill(`public class Main {
  public static void main(String[] args) {
    System.out.println("Edited Java source persisted");
  }
}
`);
  await page.locator('[data-language="kotlin"]').click();
  await page.locator('#source-editor').fill(`fun main() {
  println("Edited Kotlin source persisted")
}
`);
  await page.reload({waitUntil: 'networkidle'});
  assert.equal(await page.locator('[data-language="kotlin"]').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#source-filename').textContent(), 'Main.kt');
  assert.match(await page.locator('#source-editor').inputValue(), /Edited Kotlin source persisted/);
  await page.locator('[data-language="java"]').click();
  assert.match(await page.locator('#source-editor').inputValue(), /Edited Java source persisted/);
  await page.locator('#reset-button').click();
  await page.locator('[data-language="kotlin"]').click();
  await page.locator('#reset-button').click();
  assert.doesNotMatch(await page.locator('#source-editor').inputValue(), /Edited Kotlin source persisted/);
  assert.equal(await page.locator('#playground-state').getAttribute('data-state'), 'ready');
  await page.locator('[data-language="scala"]').click();
  await page.locator('#reset-button').click();

  const languageRuns = [
    ['java', 'Doppio says: Java + Kotlin + Scala'],
    ['kotlin', 'Kotlin@2011 -> Doppio@2014'],
    ['scala', 'Scala on Doppio: 6, 12, 24']
  ];
  for (const [language, expectedOutput] of languageRuns) {
    await page.locator(`[data-language="${language}"]`).click();
    await page.locator('#run-button').click();
    await page.waitForFunction(() => {
      const state = document.querySelector('#playground-state');
      const runButton = document.querySelector('#run-button');
      return state &&
        (state.dataset.state === 'ready' || state.dataset.state === 'error') &&
        !runButton.disabled;
    });
    const state = await page.locator('#playground-state').getAttribute('data-state');
    const consoleOutput = await page.locator('#console-output').innerText();
    assert.equal(state, 'ready', `${language} failed:\n${consoleOutput}`);
    assert.match(consoleOutput, new RegExp(expectedOutput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.deepEqual(browserErrors, []);
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: {width: 390, height: 844}
  });
  await mobile.addCookies([{
    name: 'dev_bypass_waf',
    value: 'seorii_bypass_token_is_this',
    domain: new URL(baseUrl).hostname,
    path: '/'
  }]);
  const mobilePage = await mobile.newPage();
  for (const path of ['/', '/docs.html?page=kotlin', '/playground/']) {
    await mobilePage.goto(`${baseUrl}${path}`, {waitUntil: 'networkidle'});
    if (path.includes('docs.html')) {
      await mobilePage.locator('#document-content h1').waitFor();
    }
    const widths = await mobilePage.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth
    }));
    assert.equal(widths.scroll, widths.client, `${path} overflows horizontally on mobile`);
  }
  await mobile.close();

  console.log('Pages Chromium smoke passed for docs, mobile layout, Java, Kotlin, and Scala.');
} finally {
  await browser.close();
}
