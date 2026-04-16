import { chromium } from "playwright";
import fs from "node:fs/promises";

const OUT = "/tmp/theme-shots";
await fs.mkdir(OUT, { recursive: true });

const themes = [
  "light","dark","midnight","forest","forest-light","ocean","rose","sunset","soft",
  "neobrutalism","brutal","cyberpunk","synthwave","terminal","candy","monochrome",
  "bioluminescent","sand","cosmos","claude","pop","acid","retro","lavender","citrus",
  "holo","ink","pixel","riso","y2k","neon","neon-orange","lime","blueprint","paper"
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 720, height: 540 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

await page.goto("https://protoapp.xyz/test-login", { waitUntil: "networkidle", timeout: 30000 });
await page.getByTestId("test-login-email").fill("demo@example.com");
await page.getByTestId("test-login-password").fill("xxxxxxxxxxxx");
await page.waitForTimeout(400);

for (const t of themes) {
  await page.evaluate((name) => {
    document.documentElement.setAttribute("data-theme", name);
  }, t);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${t}.png`, fullPage: false });
  console.log("✓", t);
}
await browser.close();
