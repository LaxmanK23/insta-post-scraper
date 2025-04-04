const { scrapeInstagramPost } = require('../src/scraper');

(async () => {
//   const url = 'https://www.instagram.com/p/POST_ID/'; // Replace with a real post
  const url = 'https://www.instagram.com/p/CmUv48DLvxd/?img_index=1/'; // Replace with a real post
  const data = await scrapeInstagramPost(url);
  console.log(JSON.stringify(data, null, 2));
})();
