const express = require('express');
const fs = require('fs');
const path = require('path');
const { scrapeInstagramPost } = require('./src/scraper');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3000;
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    status: 429,
    error: "Too many requests. Please try again later.",
  },
});

app.use(limiter);
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/downloads', express.static('downloads'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.includes('instagram.com/p/')) {
    return res.render('index', { error: 'Please enter a valid Instagram post URL.' });
  }

  try {
    const result = await scrapeInstagramPost(url);
    
    const match = url.match(/instagram\.com\/p\/([^\/]+)\//);
    const postId = match ? match[1] : `post_${Date.now()}`;
    
    const filePath = path.join(__dirname, 'downloads', `${postId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');

    res.render('result', { result, url, fileName: `${postId}.json` });
  } catch (err) {
    console.error(err);
    res.render('index', { error: 'Failed to scrape the post. Please try another URL.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
