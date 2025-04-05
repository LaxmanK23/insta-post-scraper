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

async function closeScraper() {
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
        console.log("Browser closed");
    }
}

async function scrapeInstagramPost(url) {
  const browser = await initScraper(); // Keep existing browser init
  let page;
  let context; // Define context here to close it in finally

  try {
    // Use the static user agent as requested previously
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/117.0.0.0 Safari/537.36',
    });
    page = await context.newPage();

    // --- Start of logic from user's snippet ---
    await page.setExtraHTTPHeaders({ // Keep header setting
      "Accept-Language": "en-US,en;q=0.9",
    });

    await page.waitForTimeout(getRandomDelay()); // Keep random delay

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const acceptBtn = await page.$('text=Only allow essential cookies');
    // Use try-catch like before for robustness
    if (acceptBtn) {
        try {
            await acceptBtn.click({ timeout: 5000 });
        } catch (e) {
            console.log("Could not click accept cookies button, might be gone already.");
        }
    }

    await page.waitForSelector('article', { timeout: 30000 }); // Keep increased timeout

    const metadata = await page.evaluate(() => {
      const article = document.querySelector('article');
      if (!article) return null; // Add null check for safety
      return {
        username: article.querySelector('header a')?.innerText || '',
        caption: article.querySelector('h1, span')?.innerText || '',
        cover: article.querySelector('img')?.src || '',
        likes: parseInt(document.querySelector('section span[title]')?.getAttribute('title')?.replace(',', '') || 0), // Keep existing like selector
        created_at: article.querySelector('time')?.getAttribute('datetime') || '',
      };
    });

    if (!metadata) { // Keep metadata check
        throw new Error("Could not find article element to extract metadata.");
    }

    let comments = [];
    let loadMore = true;
    const maxScrolls = 10; // Keep max scrolls limit
    let scrollCount = 0; // Keep scroll count

    // Use the comment loading logic from the user's snippet
    while (loadMore && comments.length < 300 && scrollCount < maxScrolls) { // Add scrollCount check
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(1500); // Use delay from snippet

      // Use comment extraction logic from snippet
      const newComments = await page.$$eval('ul ul', nodes =>
        nodes.map(el => ({
          username: el.querySelector('h3')?.innerText || '',
          text: el.querySelector('span')?.innerText || '',
          likes: 0, // Snippet had 0 likes
          created_at: el.querySelector('time')?.getAttribute('datetime') || '',
        }))
      );
      comments = newComments; // Overwrite comments as per snippet logic

      const loadMoreButton = await page.$('text=Load more comments'); // Use snippet's check
      loadMore = loadMoreButton !== null;

      // Add click logic for load more button (missing in snippet)
      if (loadMoreButton) {
          try {
              await loadMoreButton.click({ timeout: 3000 });
              await page.waitForTimeout(getRandomDelay(1000, 2000)); // Add delay after click
          } catch (e) {
              console.log("Could not click 'Load more comments', might be end of comments.");
              loadMore = false;
          }
      }
      scrollCount++; // Increment scroll count
    }
    // --- End of logic from user's snippet ---

    // Close page and context, but NOT the browser
    await page.close();
    page = null; // Nullify page after closing
    await context.close();
    context = null; // Nullify context after closing

    return {
      post: {
        ...metadata,
        comments_count: comments.length,
        comments
      }
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    // Ensure page and context are closed on error, but not browser
    if (page) {
      await page.close();
    }
    if (context) {
      await context.close();
    }
    // Don't close the browser here, let it be reused
    throw error; // Re-throw the error to be handled by the caller
  }
}

module.exports = { initScraper, scrapeInstagramPost, closeScraper };
