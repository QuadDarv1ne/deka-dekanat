/* Проверка ссылки TransferNow end-to-end: открыть /dl/, принять cookie-модалку,
 * убрать рекламные слои, нажать «Скачать файл», сохранить файл, сверить размер. */
const { chromium } = require("playwright-core");

const EXEC = process.env.HOME + "/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const LINK = "https://www.transfernow.net/dl/20261107YiPRRE1g";
const OUT = "/tmp/dl-verify.zip";

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC, headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1366, height: 850 } });
  const page = await context.newPage();

  await page.goto(LINK, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);

  // cookie/приветственная модалка
  for (const t of ["Мне подходит", "ACCEPTER", "Выбрать"]) {
    try { await page.getByText(t, { exact: true }).click({ timeout: 3000 }); break; } catch {}
  }
  await page.waitForTimeout(2000);

  // убрать рекламные iframe/блоки, перекрывающие кнопку
  await page.evaluate(() => {
    document.querySelectorAll('iframe[id^=aswift],ins.adsbygoogle,iframe[src*=googlesyndication],iframe[src*=doubleclick]')
      .forEach((el) => el.remove());
  });

  const btn = page.getByText(/Скачать файл|Download file/i).first();
  await btn.waitFor({ state: "visible", timeout: 30000 });

  const downloadPromise = page.waitForEvent("download", { timeout: 90000 });
  try {
    await btn.click({ timeout: 10000 });
  } catch {
    await btn.click({ force: true, timeout: 10000 });
  }
  // реклама (google_vignette) может перехватить первый клик — пробуем второй раз
  let download;
  try {
    download = await downloadPromise;
  } catch {
    await page.evaluate(() => {
      document.querySelectorAll('iframe[id^=aswift],ins.adsbygoogle,iframe[src*=googlesyndication],iframe[src*=doubleclick]')
        .forEach((el) => el.remove());
    });
    const [d] = await Promise.all([
      page.waitForEvent("download", { timeout: 90000 }),
      btn.click({ force: true, timeout: 10000 }),
    ]);
    download = d;
  }

  await download.saveAs(OUT);
  console.log("FILE:", OUT);
  console.log("NAME:", download.suggestedFilename());
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
