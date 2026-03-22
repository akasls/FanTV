const https = require('https');

async function testFetch(url, name) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://movie.douban.com/'
      }
    });
    const text = await res.text();
    console.log(`[${name}] Status: ${res.status}, Body start: ${text.substring(0, 50).replace(/\n/g, ' ')}`);
  } catch (e) {
    console.error(`[${name}] Failed:`, e.message);
  }
}

async function run() {
  const doubanParams = 'sort=U&range=0,10&tags=%E7%94%B5%E5%BD%B1&start=0';
  await testFetch(`https://movie.douban.cmliussss.net/j/new_search_subjects?${doubanParams}`, 'CMLiussss Data (Net)');
  await testFetch(`https://img.doubanio.cmliussss.net/view/photo/s_ratio_poster/public/p480747492.webp`, 'CMLiussss Image (Net)');
}

run();
