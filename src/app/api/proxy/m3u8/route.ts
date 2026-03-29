import { NextResponse, NextRequest } from 'next/server';
import { cleanM3u8 } from '@/lib/m3u8Service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing m3u8 url parameter' }, { status: 400 });
  }

  try {
    const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
    const proxyBaseUrl = `${protocol}://${request.headers.get('host')}/api/proxy/m3u8?url=`;

    const cleanedContent = await cleanM3u8(targetUrl, proxyBaseUrl);
    
    return new NextResponse(cleanedContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    console.error('M3U8 Proxy Error:', error.message);
    // On failure to clean, we redirect back to the original URL but MUST provide CORS headers!
    return new NextResponse(null, {
      status: 302,
      headers: {
        'Location': targetUrl,
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
