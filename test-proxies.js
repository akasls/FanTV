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
    console.log(`[${name}] Status: ${res.status}, Body start: ${text.substring(0, 100).replace(/\n/g, ' ')}`);
  } catch (e) {
    console.error(`[${name}] Failed:`, e.message);
  }
}

async function run() {
  const doubanParams = 'sort=U&range=0,10&tags=%E7%94%B5%E5%BD%B1&start=0';
  console.log('--- Testing Data Proxies ---');
  await testFetch(`https://movie.douban.com/j/new_search_subjects?${doubanParams}`, 'Direct');
  await testFetch(`https://cors.zwei.ren/https://movie.douban.com/j/new_search_subjects?${doubanParams}`, 'Cors Zwei');
  await testFetch(`https://douban-api.uieee.com/j/new_search_subjects?${doubanParams}`, 'CMLiussss (uieee)');
  await testFetch(`https://douban-api.uieee.com/v2/movie/search?q=${encodeURIComponent('电影')}`, 'CMLiussss (v2 API)');

  console.log('\n--- Testing Image Proxies ---');
  const imgUrl = 'https://img9.doubanio.com/view/photo/s_ratio_poster/public/p480747492.webp';
  await testFetch(imgUrl, 'Direct Image');
  await testFetch(`https://images.weserv.nl/?url=${encodeURIComponent(imgUrl)}`, 'Weserv');
  await testFetch(`https://douban.img.lithub.cc/view/photo/s_ratio_poster/public/p480747492.webp`, 'CMLiussss Image');
  await testFetch(`http://localhost:3000/api/image-proxy?url=${encodeURIComponent(imgUrl)}`, 'Server Proxy');
}

run();
