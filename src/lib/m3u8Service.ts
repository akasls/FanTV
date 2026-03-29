import NodeCache from 'node-cache';
import axios from 'axios';

const m3u8Cache = new NodeCache({
  stdTTL: 48 * 3600, // 48 hours
  checkperiod: 3600,
});

export async function cleanM3u8(m3u8Url: string, proxyBaseUrl?: string): Promise<string> {
  const cacheKey = `proxy_${m3u8Url}`;
  const cached = m3u8Cache.get<string>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // 1. Fetch original M3U8 payload with anti-scraping headers
    const urlObj = new URL(m3u8Url);
    const headers = {
       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
       'Referer': urlObj.origin,
       'Origin': urlObj.origin
    };
    
    const response = await axios.get(m3u8Url, { 
       headers,
       timeout: 10000 
    });
    const text = response.data;
    if (typeof text !== 'string') throw new Error("Invalid M3U8 string");

    const lines = text.split('\n');
    const resultLines: string[] = [];
    
    // Check if it's a master playlist pointing to other level playlists
    if (text.includes('#EXT-X-STREAM-INF')) {
       for (let i = 0; i < lines.length; i++) {
         const line = lines[i].trim();
         resultLines.push(line);
         if (line.startsWith('#EXT-X-STREAM-INF') && i + 1 < lines.length) {
            const nextLine = lines[i+1].trim();
            if (!nextLine.startsWith('#') && nextLine !== '') {
               let absoluteUrl = nextLine.startsWith('http') ? nextLine : new URL(nextLine, m3u8Url).href;
               if (proxyBaseUrl) {
                  absoluteUrl = `${proxyBaseUrl}${encodeURIComponent(absoluteUrl)}`;
               }
               resultLines.push(absoluteUrl);
               i++;
            }
         }
       }
       const masterRes = resultLines.join('\n');
       m3u8Cache.set(cacheKey, masterRes);
       return masterRes;
    }

    // 2. Parse and convert segments to absolute logic directly
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith('#')) {
        resultLines.push(line);
      } else {
        // Absolute URL mapping
        let absoluteUrl = line.startsWith('http') ? line : new URL(line, m3u8Url).href;
        if (proxyBaseUrl && absoluteUrl.includes('.m3u8')) {
           absoluteUrl = `${proxyBaseUrl}${encodeURIComponent(absoluteUrl)}`;
        }
        resultLines.push(absoluteUrl);
      }
    }

    const output = resultLines.join('\n');
    m3u8Cache.set(cacheKey, output);
    return output;
  } catch (error) {
    console.error("cleanM3u8 proxy error:", error);
    throw error;
  }
}
