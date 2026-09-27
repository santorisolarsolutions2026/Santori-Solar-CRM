import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getPrivateBlobToken } from '@/lib/blob';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token: getPrivateBlobToken(),
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const userPayload = getAuthenticatedUser(request);
        if (!userPayload) {
          throw new Error('Unauthorized: Please login to upload meeting recording.');
        }

        return {
          allowedContentTypes: [
            'audio/webm',
            'audio/webm;codecs=opus',
            'audio/mp4',
            'audio/ogg',
            'audio/ogg;codecs=opus',
            'audio/wav',
            'audio/mpeg',
            'audio/x-m4a'
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500 MB
          tokenPayload: JSON.stringify({
            userId: userPayload.id,
            clientPayload,
          }),
        };
      },
      onUploadCompleted: async () => {
        // Upload completed hook
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error('Direct blob upload token error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate upload token' },
      { status: 400 }
    );
  }
}
