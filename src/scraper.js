const { chromium } = require('playwright-core');
const UserAgent = require("user-agents");
// Conditionally require sparticuz/chromium only if needed
const sparticuzChromium = process.env.NODE_ENV === 'production' ? require("@sparticuz/chromium") : null;

let browserInstance = null;

function getRandomDelay(min = 1000, max = 3000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function initScraper() {
  if (!browserInstance) {
    if (process.env.NODE_ENV === 'production' && sparticuzChromium) {
      console.log("Attempting to initialize browser using @sparticuz/chromium (NODE_ENV=production)");
      const executablePath = await sparticuzChromium.executablePath();
      console.log(`[@sparticuz/chromium] Executable Path: ${executablePath}`);

      if (!executablePath) {
          throw new Error("Could not find Chromium executable via @sparticuz/chromium. Ensure it's installed correctly in the Docker image.");
      }

      browserInstance = await chromium.launch({
        args: sparticuzChromium.args,
        executablePath: executablePath,
        headless: sparticuzChromium.headless === 'true' || sparticuzChromium.headless === true,
      });
      console.log("Browser initialized using @sparticuz/chromium");

    } else {
      // Development (local) environment: Use standard playwright-core launch
      console.log("Attempting to initialize browser using standard playwright-core (NODE_ENV is not 'production')");
      browserInstance = await chromium.launch({
        headless: true // Or false if you want to see the browser
      });
      console.log("Browser initialized using playwright-core");
    }
  }
  return browserInstance;
}

async function scrapeInstagramPost(url) {
  let browser;
  let page;
  try {
    browser = await initScraper();
    const userAgent = new UserAgent(
      { deviceCategory: 'desktop' } // Use desktop user agent for scraping
    ).random(); // Randomize user agent for each request
    
    const context = await browser.newContext({
      userAgent: userAgent.toString(),
    });
    page = await context.newPage();

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    await page.waitForTimeout(getRandomDelay());

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
    while (loadMore && comments.length < 20) {
      console.log(`Loading more comments... (${comments.length} loaded)`);
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
      // loadMore = false; // Keep this commented if needed for debugging
    }

    return { metadata, comments };

  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    throw error; // Re-throw the error to be handled by the caller
  } finally {
    if (page) {
      await page.close();
      console.log("Page closed.");
    }
    // We don't close the browser here because it's managed globally by initScraper
    // If you need to close the browser after each scrape (less efficient),
    // you would call `await browser.close();` here and adjust initScraper.
  }
} // This is the correct closing brace for scrapeInstagramPost

module.exports = { scrapeInstagramPost, initScraper }; // Export initScraper if needed elsewhere, or just scrapeInstagramPost
