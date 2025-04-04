const express = require('express');
const { scrapeInstagramPost } = require('./src/scraper');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
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
    res.render('result', { result, url });
  } catch (err) {
    res.render('index', { error: 'Failed to scrape the post. Please try another URL.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
