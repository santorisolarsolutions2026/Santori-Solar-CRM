/**
 * Utility to compress images on the client-side before uploading.
 * Resizes heavy camera photos (max dimension 1920px) and converts to WebP with 0.82 quality.
 * Non-image files (PDFs, Videos, etc.) are safely returned untouched.
 */
export async function compressImageClient(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.82
): Promise<File> {
  // If not on client side or not an image, return untouched
  if (typeof window === 'undefined' || !file || !file.type || !file.type.startsWith('image/')) {
    return file;
  }

  // Skip SVGs or GIFs to preserve vector/animation data
  if (file.type.includes('svg') || file.type.includes('gif')) {
    return file;
  }

  // If already very small (< 150KB), no need to compress
  if (file.size < 150 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          try {
            let width = img.width;
            let height = img.height;

            // Calculate resized dimensions while preserving aspect ratio
            if (width > maxWidth || height > maxHeight) {
              if (width > height) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              return resolve(file);
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (!blob || blob.size >= file.size) {
                  // If compression didn't save bytes, return original file
                  return resolve(file);
                }

                const baseName = file.name.replace(/\.[^/.]+$/, '');
                const compressedFile = new File([blob], `${baseName}.webp`, {
                  type: 'image/webp',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              },
              'image/webp',
              quality
            );
          } catch (err) {
            console.warn('Canvas compression error, falling back to original:', err);
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
        img.src = event.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('FileReader error, falling back to original:', err);
      resolve(file);
    }
  });
}
