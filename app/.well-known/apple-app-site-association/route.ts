// app/.well-known/apple-app-site-association/route.ts
import { NextResponse } from 'next/server';

export function GET() {
  const json = {
    applinks: {
      apps: [],
      details: [
        {
          // Replace after you have a native app
          appID: 'TEAMID.com.your.bundleid',
          paths: ['/*']
        }
      ]
    }
  };
  return new NextResponse(JSON.stringify(json), {
    headers: { 'Content-Type': 'application/json' },
  });
}
