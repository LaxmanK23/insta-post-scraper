// const { scrapeInstagramPost } = require('../src/scraper');

// (async () => {
//     console.log('Scraping Instagram post...');
// //   const url = 'https://www.instagram.com/p/POST_ID/'; // Replace with a real post
//   const url = 'https://www.instagram.com/p/CmUv48DLvxd/?img_index=1/'; 
//   const data = await scrapeInstagramPost(url);
//   console.log(JSON.stringify(data, null, 2));
// })();
const fs = require('fs');
const path = require('path');
const { initScraper, scrapeInstagramPost, closeScraper } = require('../src/scraper');

(async () => {
  const url = 'https://www.instagram.com/p/CmUv48DLvxd/?img_index=1/'; // Replace with actual post URL
  try {
    await initScraper(); // Initialize the browser
    console.log('Scraping Instagram post...');
    const data = await scrapeInstagramPost(url);
    const match = url.match(/instagram\.com\/p\/([^\/]+)\//);
    const postId = match ? match[1] : `post_${Date.now()}`;
    const outputPath = path.join(__dirname, `scrapped_${postId}.json`);
    fs.writeFileSync(`${outputPath}`, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ JSON saved to ${outputPath}`);
  } catch (err) {
    console.error('❌ Failed to scrape Instagram post:', err.message);
  } finally {
    await closeScraper(); // Ensure browser is closed
  }
})();
