const { scrapeInstagramPost } = require('../src/scraper');

(async () => {
    console.log('Scraping Instagram post...');
//   const url = 'https://www.instagram.com/p/POST_ID/'; // Replace with a real post
  const url = 'https://www.instagram.com/p/CmUv48DLvxd/?img_index=1/'; 
  const data = await scrapeInstagramPost(url);
  console.log(JSON.stringify(data, null, 2));
})();
