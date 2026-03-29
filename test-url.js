const axios = require('axios');

async function testUrl() {
    try {
        const res = await axios.get('https://play.xluuss.com/play/mepYgmNa/index.m3u8', {
           headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        const text = res.data;
        console.log("XLUUSS INITIAL:");
        console.log(text.substring(0, 500));
        
        if (text.includes('EXT-X-STREAM-INF')) {
            const lines = text.split('\n');
            const sub = lines.find(l => !l.startsWith('#') && l.trim());
            const abs = sub.startsWith('http') ? sub : new URL(sub, 'https://play.xluuss.com/play/mepYgmNa/index.m3u8').href;
            console.log("\nXLUUSS SUBPLAYLIST: ", abs);
            const res2 = await axios.get(abs, { headers: { 'User-Agent': 'Mozilla/5.0' }});
            console.log(res2.data.substring(0, 800));
        }
    } catch (e) {
        console.error("XLUUSS ERROR:", e.message);
    }
}
testUrl();
