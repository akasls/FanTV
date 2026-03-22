(async () => {
    try {
        const res = await fetch('https://movie.douban.com/j/new_search_subjects?tags=动画', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://movie.douban.com/',
                'Accept': 'application/json'
            }
        });
        const data = await res.json();
        console.log("动画 Items:", data?.data?.length);
        
        const res2 = await fetch('https://movie.douban.com/j/new_search_subjects?tags=动漫', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://movie.douban.com/',
                'Accept': 'application/json'
            }
        });
        const data2 = await res2.json();
        console.log("动漫 Items:", data2?.data?.length);
    } catch (e) {
        console.error(e);
    }
})();
