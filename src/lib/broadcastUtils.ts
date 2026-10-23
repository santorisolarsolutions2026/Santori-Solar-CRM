/**
 * Helper to parse broadcast notification body for embedded images and clean text.
 */
export interface ParsedBroadcast {
  text: string;
  imageUrl: string | null;
}

export function parseBroadcastBody(body: string | null | undefined): ParsedBroadcast {
  if (!body) {
    return { text: '', imageUrl: null };
  }

  const imgRegex = /\[img:(.*?)\]/;
  const match = body.match(imgRegex);

  if (match) {
    const imageUrl = match[1].trim();
    const text = body.replace(/\[img:.*?\]/g, '').trim();
    return { text, imageUrl };
  }

  return { text: body, imageUrl: null };
}
