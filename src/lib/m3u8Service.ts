import ffmpeg from 'fluent-ffmpeg';
import ffprobeStatic from '@ffprobe-installer/ffprobe';
import NodeCache from 'node-cache';
import axios from 'axios';

// Set ffprobe path globally
ffmpeg.setFfprobePath(ffprobeStatic.path);

const m3u8Cache = new NodeCache({
  stdTTL: 48 * 3600, // 48 hours
  checkperiod: 3600,
});

interface Block {
  lines: string[];
  duration: number;
  firstTsUrl: string | null;
  resolution: string | null;
}

function probeVideo(url: string, referer?: string, maxTimeMs: number = 3000): Promise<string | null> {
  return new Promise((resolve) => {
    let timer = setTimeout(() => {
       console.log(`[FFprobe] TIMEOUT reached for ${url}`);
       resolve(null);
    }, maxTimeMs);

    const startTime = Date.now();
    const args = [
       '-v', 'error',
       '-analyzeduration', '1000000', // 1s
       '-probesize', '500000', // 500KB
       '-timeout', '2000000', // 2s max HTTP socket timeout
       '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    if (referer) {
       args.push('-headers', `Referer: ${referer}`);
    }

    ffmpeg.ffprobe(url, args, (err: any, metadata: any) => {
      clearTimeout(timer);
      const elapsed = Date.now() - startTime;
      console.log(`[FFprobe] ${url.substring(0, 60)}... took ${elapsed}ms`);
      if (err || !metadata || !metadata.streams) {
        resolve(null);
        return;
      }
      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      if (videoStream && videoStream.width && videoStream.height) {
        resolve(`${videoStream.width}x${videoStream.height}`);
      } else {
        resolve(null);
      }
    });
  });
}

export async function cleanM3u8(m3u8Url: string, proxyBaseUrl?: string): Promise<string> {
  const cached = m3u8Cache.get<string>(m3u8Url);
  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get(m3u8Url, { 
       timeout: 10000,
       headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': new URL(m3u8Url).origin
       }
    });
    const content = response.data as string;
    
    if (!content.includes('#EXTM3U')) {
      throw new Error('Invalid M3U8 file');
    }

    const m3u8Lines = content.split('\n').filter((l) => l.trim() !== '');

    const globalHeaders: string[] = [];
    const blocks: Block[] = [];
    let currentBlock: Block = { lines: [], duration: 0, firstTsUrl: null, resolution: null };
    
    let isHeader = true;

    for (let i = 0; i < m3u8Lines.length; i++) {
      const line = m3u8Lines[i].trim();
      
      if (isHeader) {
        // Headers stop at the first segment definition or discontinuity
        if (line.startsWith('#EXTINF:') || line.startsWith('#EXT-X-DISCONTINUITY')) {
          isHeader = false;
        } else {
          if (!line.startsWith('#') && line.trim() !== '') {
            let absoluteUrl = line.startsWith('http') ? line : new URL(line, m3u8Url).href;
            if (proxyBaseUrl && absoluteUrl.includes('.m3u8')) {
              absoluteUrl = `${proxyBaseUrl}${encodeURIComponent(absoluteUrl)}`;
            }
            globalHeaders.push(absoluteUrl);
          } else {
            globalHeaders.push(line);
          }
          continue;
        }
      }

      if (line.startsWith('#EXT-X-DISCONTINUITY')) {
        if (currentBlock.lines.length > 0) {
          blocks.push(currentBlock);
        }
        currentBlock = { lines: [], duration: 0, firstTsUrl: null, resolution: null };
      }

      // If we are currently holding a block, add lines
      currentBlock.lines.push(line);

      // Extract duration
      if (line.startsWith('#EXTINF:')) {
        const match = line.match(/#EXTINF:([\d.]+)/);
        if (match) {
          currentBlock.duration += parseFloat(match[1]);
        }
      } 
      // Extract TS URL
      else if (!line.startsWith('#')) {
        // Absolute URL resolution
        let absoluteUrl = line.startsWith('http') ? line : new URL(line, m3u8Url).href;
        if (proxyBaseUrl && absoluteUrl.includes('.m3u8')) {
           absoluteUrl = `${proxyBaseUrl}${encodeURIComponent(absoluteUrl)}`;
        }
        
        // Replace the relative line with absolute in our parsed block
        currentBlock.lines[currentBlock.lines.length - 1] = absoluteUrl;

        if (!currentBlock.firstTsUrl) {
          currentBlock.firstTsUrl = absoluteUrl;
        }
      }
    }

    if (currentBlock.lines.length > 0) {
      blocks.push(currentBlock);
    }

    // Step 2: Form groups and extract target resolution
    // Find the longest block to act as the reference
    let longestBlock: Block | null = null;
    let maxBlockDuration = 0;
    for (const block of blocks) {
      if (block.duration > maxBlockDuration) {
        maxBlockDuration = block.duration;
        longestBlock = block;
      }
    }

    if (longestBlock && longestBlock.firstTsUrl) {
      longestBlock.resolution = await probeVideo(longestBlock.firstTsUrl, new URL(m3u8Url).origin, 5000);
    }

    const mainRes = longestBlock?.resolution || null;
    let referenceDomain = '';
    let referencePath = '';
    if (longestBlock && longestBlock.firstTsUrl) {
      try { 
         const u = new URL(longestBlock.firstTsUrl);
         referenceDomain = u.host; 
         referencePath = u.pathname.substring(0, u.pathname.lastIndexOf('/'));
      } catch (e) {}
    }

    const probePromises = blocks.map(async (block) => {
      if (block === longestBlock) return;
      if (block.firstTsUrl) {
        let blockHost = '';
        let blockPath = '';
        try { 
           const u = new URL(block.firstTsUrl);
           blockHost = u.host; 
           blockPath = u.pathname.substring(0, u.pathname.lastIndexOf('/'));
        } catch(e) {}

        // Heuristic: If it has the same host and is reasonably long (>35s), it's likely main content chunk.
        // This avoids spawning 100+ ffprobe processes for highly fragmented M3U8s where movie chunks are ~60s.
        if (blockHost === referenceDomain && block.duration > 35) {
           block.resolution = mainRes || 'ASSUMED_MAIN';
           return;
        }

        // Heuristic: If it has a different host or completely different directory path, it is ALMOST GUARANTEED to be an ad cross-injection!
        // Spawning ffprobe child processes for these ads destroys CPU and network performance, causing the player to time out.
        // Let's instantly reject them!
        if (blockPath !== referencePath || blockHost !== referenceDomain) {
           block.resolution = 'AD_BLOCKED_BY_HEURISTIC';
           return;
        }

        console.log(`Probing block: duration=${block.duration}, host=${blockHost}, path=${blockPath}`);
        block.resolution = await probeVideo(block.firstTsUrl, new URL(m3u8Url).origin, 1500);
      }
    });

    await Promise.all(probePromises);

    // Identify blocks where we probe failed or resolution doesn't match
    let finalBlocks = blocks.filter(b => b.resolution !== 'AD_BLOCKED_BY_HEURISTIC');
    
    if (mainRes) {
      finalBlocks = finalBlocks.filter((block) => {
        if (block.resolution) {
           if (block.resolution === 'ASSUMED_MAIN') return true;
           return block.resolution === mainRes;
        }
        // If we failed to probe, we heuristicly judge by duration. Ads are usually less than 120s per block.
        if (block.duration > 300) {
          return true; // Keep long unidentified blocks
        }
        return false; // Drop short unidentified blocks
      });
    }

    // Step 3: Reconstruct M3U8 text
    // Remove discontinuity for the first block if it happens to be there to avoid player issue.
    const resultLines = [...globalHeaders];

    for (let i = 0; i < finalBlocks.length; i++) {
        // Add discontinuity separator between retained blocks if they were originally disjoint
        if (i > 0 && finalBlocks[i].lines[0] !== '#EXT-X-DISCONTINUITY') {
           resultLines.push('#EXT-X-DISCONTINUITY');
        }
        resultLines.push(...finalBlocks[i].lines);
    }

    // Ensure it ends with #EXT-X-ENDLIST if original did
    if (resultLines.length > 0 && content.includes('#EXT-X-ENDLIST') && !resultLines[resultLines.length - 1].includes('#EXT-X-ENDLIST')) {
        resultLines.push('#EXT-X-ENDLIST');
    }

    const cleanContent = resultLines.join('\n');
    m3u8Cache.set(m3u8Url, cleanContent);

    return cleanContent;
  } catch (error) {
    console.error('Error cleaning m3u8:', error);
    // On failure, we should fallback to redirecting or returning the original URL
    throw error;
  }
}
