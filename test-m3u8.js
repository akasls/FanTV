const https = require('https');

function fetchM3u8(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function run() {
    try {
        console.log('--- URL 1 ---');
        let text1 = await fetchM3u8('https://cdn1.ryplay1.com/20240910/7685_e9acc957/index.m3u8');
        console.log(text1.substring(0, 500));
        if (text1.includes('EXT-X-STREAM-INF')) {
            const lines = text1.split('\n');
            const sub = lines.find(l => !l.startsWith('#') && l.trim());
            const abs = sub.startsWith('http') ? sub : new URL(sub, 'https://cdn1.ryplay1.com/20240910/7685_e9acc957/index.m3u8').href;
            console.log('Fetching sub-playlist:', abs);
            const subtext = await fetchM3u8(abs);
            console.log(subtext.substring(0, 1000));
        }

        console.log('\n--- URL 2 ---');
        let text2 = await fetchM3u8('https://play.xluuss.com/play/mepYgmNa/index.m3u8');
        console.log(text2.substring(0, 500));
        if (text2.includes('EXT-X-STREAM-INF')) {
            const lines = text2.split('\n');
            const sub = lines.find(l => !l.startsWith('#') && l.trim());
            const abs = sub.startsWith('http') ? sub : new URL(sub, 'https://play.xluuss.com/play/mepYgmNa/index.m3u8').href;
            console.log('Fetching sub-playlist:', abs);
            const subtext = await fetchM3u8(abs);
            console.log(subtext.substring(0, 1000));
        }
    } catch (e) {
        console.error(e);
    }
}
run();
