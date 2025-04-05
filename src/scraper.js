const { chromium } = require('playwright');
const UserAgent = require("user-agents");

function getRandomDelay(min = 1000, max = 3000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function scrapeInstagramPost(url) {
  // const browser = await chromium.launch({ headless: true });
  // const page = await browser.newPage({
  //   userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/117.0.0.0 Safari/537.36',
  // });
  // const proxyServer = process.env.PROXY_SERVER;
  // const browser = await chromium.launch({
  //   proxy: proxyServer ? { server: process.env.PROXY_URL } : undefined,
  // });
  // // const page = await browser.newPage();

  // const userAgent = new UserAgent();
  // // await page.setUserAgent(userAgent.toString());
  // const context = await browser.newContext({
  //   userAgent,
  //   viewport: { width: 1280, height: 720 },
  //   locale: "en-US",
  // });
  // const page = await context.newPage();
  // // Set headers to mimic real browser
  // await page.setExtraHTTPHeaders({
  //   "Accept-Language": "en-US,en;q=0.9",
  // });

  // // 💤 Randomized delay
  // await page.waitForTimeout(getRandomDelay());

  // const userAgents = [
  //   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  //   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
  //   'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
  //   'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/110.0',
  //   'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15'
  // ];
  // const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];


  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    // userAgent,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/117.0.0.0 Safari/537.36',
  });


  // const userAgent = new UserAgent().toString();

  // const browser = await chromium.launch({ headless: true });
  // const context = await browser.newContext({
  //   userAgent,
  //   viewport: { width: 1280, height: 720 },
  //   locale: "en-US",
  // });
  // const page = await context.newPage();


  await page.waitForTimeout(getRandomDelay());
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });


    const acceptBtn = await page.$('text=Only allow essential cookies');
    if (acceptBtn) await acceptBtn.click();

    await page.waitForSelector('article');

    const metadata = await page.evaluate(() => {
      const article = document.querySelector('article');
      return {
        username: article.querySelector('header a')?.innerText || '',
        caption: article.querySelector('h1, span')?.innerText || '',
        cover: article.querySelector('img')?.src || '',
        likes: parseInt(document.querySelector('section span[title]')?.getAttribute('title')?.replace(',', '') || 0),
        created_at: article.querySelector('time')?.getAttribute('datetime') || '',
      };
    });

    let comments = [];
    let loadMore = true;
    while (loadMore && comments.length < 300) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(1500);

      comments = await page.$$eval('ul ul', nodes =>
        nodes.map(el => ({
          username: el.querySelector('h3')?.innerText || '',
          text: el.querySelector('span')?.innerText || '',
          likes: 0,
          created_at: el.querySelector('time')?.getAttribute('datetime') || '',
        }))
      );
      
      loadMore = await page.$('text=Load more comments') !== null;
      // loadMore =false;
    }

    await browser.close();

    return {
      post: {
        ...metadata,
        comments_count: comments.length,
        comments
      }
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

module.exports = { scrapeInstagramPost };
