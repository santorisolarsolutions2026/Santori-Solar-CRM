import { put, get, del, type PutBlobResult } from '@vercel/blob';

/**
 * Returns the active Vercel Blob Read/Write token.
 * Prefers PRIVATE_BLOB_READ_WRITE_TOKEN, then falls back to standard BLOB_READ_WRITE_TOKEN.
 */
export function getPrivateBlobToken(): string | undefined {
  return process.env.PRIVATE_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Upload a file/buffer to Private Vercel Blob storage.
 */
export async function uploadPrivateBlob(
  pathname: string,
  body: Blob | File | Buffer | ArrayBuffer | ReadableStream | string,
  options?: {
    contentType?: string;
    addRandomSuffix?: boolean;
    multipart?: boolean;
  }
): Promise<PutBlobResult> {
  const token = getPrivateBlobToken();
  return await put(pathname, body, {
    access: 'private',
    token,
    ...options,
  });
}

/**
 * Safely delete a file from Vercel Blob storage (supports both private and legacy public tokens).
 */
export async function deleteBlobFile(filePath: string): Promise<void> {
  const token = getPrivateBlobToken();
  try {
    await del(filePath, token ? { token } : undefined);
  } catch (err) {
    try {
      await del(filePath);
    } catch (err2) {
      console.warn('Failed to delete blob file:', filePath, err2);
    }
  }
}

export type BlobContentResult = {
  stream?: ReadableStream<Uint8Array>;
  buffer?: ArrayBuffer;
  contentType: string;
  contentLength?: string;
};

/**
 * Dual-support helper: Fetches blob content from Private Store or falls back to legacy Public Store.
 * Returns either a ReadableStream (for zero-RAM private streaming) or ArrayBuffer.
 */
export async function fetchBlobContent(filePath: string): Promise<BlobContentResult> {
  const token = getPrivateBlobToken();

  // Try private store retrieval first if it's a Vercel Blob URL or path
  if (filePath.includes('blob.vercel-storage.com') || (!filePath.startsWith('http://') && !filePath.startsWith('https://'))) {
    try {
      const result = await get(filePath, {
        access: 'private',
        token,
      });

      if (result && result.statusCode === 200 && result.stream) {
        return {
          stream: result.stream,
          contentType: result.blob.contentType || 'application/octet-stream',
          contentLength: result.blob.size ? result.blob.size.toString() : undefined,
        };
      }
    } catch {
      // Fall through to public HTTP fetch fallback
    }
  }

  // Fallback for public blob URLs or external HTTP links
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    const res = await fetch(filePath);
    if (!res.ok) {
      throw new Error(`Failed to fetch file from storage: ${res.status} ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return {
      buffer: arrayBuffer,
      contentType: res.headers.get('content-type') || 'application/octet-stream',
      contentLength: res.headers.get('content-length') || arrayBuffer.byteLength.toString(),
    };
  }

  throw new Error(`Invalid file path: ${filePath}`);
}
