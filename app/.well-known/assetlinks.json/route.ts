// app/.well-known/assetlinks.json/route.ts
import { NextResponse } from 'next/server';

export function GET() {
  const json = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.your.package', // replace later
        sha256_cert_fingerprints: ['00:00:00:...'] // replace later
      }
    }
  ];
  return NextResponse.json(json);
}
