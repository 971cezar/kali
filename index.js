const express = require('express');
const ytsr = require('ytsr');
const app = express();

// Arama Endpoint'i
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ error: "Sorgu girilmedi" });

  try {
    const results = await ytsr(query, { limit: 1 });
    if (results.items.length > 0) {
      res.json({
        title: results.items[0].title,
        url: results.items[0].url
      });
    } else {
      res.json({ error: "Sonuç bulunamadı" });
    }
  } catch (err) {
    res.json({ error: "API hatası" });
  }
});

app.listen(3000, () => {
  console.log('Kali.api hazır ve çalışıyor!');
});
