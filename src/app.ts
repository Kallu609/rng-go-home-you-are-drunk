import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { promisify } from 'util';

interface ITargets {
  targetInfos: any;
}

interface IWindowForTarget {
  windowId: any;
}

const TEMP_FILE = path.join(__dirname, '../temp.png');
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

function getChecksum(str: string) {
  return crypto
    .createHash('md5')
    .update(str, 'utf8')
    .digest('hex');
}

function random(seed: string) {
  const seedNumber = Array.from(seed)
    .map((_, i) => seed.charCodeAt(i))
    .reduce((a, b) => a + b, 0);
  const x = Math.sin(seedNumber) * 10000;

  return x - Math.floor(x);
}

async function resizeWindow(
  browser: puppeteer.Browser,
  page: puppeteer.Page,
  width: number,
  height: number
) {
  const client = await browser.target().createCDPSession();
  await page.setViewport({ height, width });

  height += 85;

  const {
    targetInfos: [{ targetId }],
  } = (await client.send('Target.getTargets')) as ITargets;

  const { windowId } = (await client.send('Browser.getWindowForTarget', {
    targetId,
  })) as IWindowForTarget;

  await client.send('Browser.setWindowBounds', {
    bounds: { height, width },
    windowId,
  });
}

async function randInt(min: number, max: number) {
  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();

  resizeWindow(browser, page, 800, 700);

  await page.goto('https://www.google.fi/search?q=rng');
  await page.evaluate(
    (minValue, maxValue) => {
      const minEl = document.querySelector('#UMy8j') as HTMLInputElement;
      const maxEl = document.querySelector('#nU5Yvb') as HTMLInputElement;
      const btnEl = document.querySelector('#ZdzlKb') as HTMLElement;

      minEl.value = minValue.toString();
      maxEl.value = maxValue.toString();
      btnEl.click();
    },
    min,
    max
  );

  await page.waitFor(1100);

  await page.screenshot({
    clip: {
      x: 163,
      y: 385,
      width: 250,
      height: 50,
    },
    path: TEMP_FILE,
  });

  await browser.close();

  const content = await readFile(TEMP_FILE, 'utf-8');
  const checksum = getChecksum(content);

  unlink(TEMP_FILE);

  return Math.floor(random(checksum) * max) + min;
}

(async () => {
  console.log(await randInt(1, 1000));
})();
