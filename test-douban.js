const https = require('https');

function fetchDouban(tags, start) {
    return new Promise((resolve) => {
        const url = `https://movie.douban.com/j/new_search_subjects?sort=T&range=0,10&tags=${encodeURIComponent(tags)}&start=${start}`;
        console.log("Fetching: " + url);
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://movie.douban.com/',
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    console.log(`[${tags}] Start ${start} -> Items: ${parsed.data ? parsed.data.length : 0}`);
                } catch(e) {
                    console.log(`[${tags}] Error parsing. Code: ${res.statusCode}. Body: ${data.substring(0, 100)}`);
                }
                resolve();
            });
        });
    });
}

(async () => {
    await fetchDouban('动漫', 0);
    await fetchDouban('动画', 0);
    await fetchDouban('电影', 0);
    await fetchDouban('电影', 20);
    await fetchDouban('电影', 40);
})();
