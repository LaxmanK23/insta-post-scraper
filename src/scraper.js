const { chromium } = require('playwright');

async function scrapeInstagramPost(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/117.0.0.0 Safari/537.36',
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Accept cookies if present
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
          likes: 0, // Usually hidden publicly
          created_at: el.querySelector('time')?.getAttribute('datetime') || '',
        }))
      );

      loadMore = await page.$('text=Load more comments') !== null;
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
