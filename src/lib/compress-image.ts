const MAX_UPLOAD_MB = 3;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

function getBlobName(input: File | Blob, fallbackFilename: string): string {
  if (input instanceof File && input.name) return input.name;
  return fallbackFilename;
}

/**
 * Compress image in the browser to at most 3 MB (resize + JPEG quality).
 * Used by admin frame upload, main page photo upload, and post–background-removal upload.
 */
export async function compressToMax3MB(
  input: File | Blob,
  fallbackFilename: string = "photo.png"
): Promise<{ blob: Blob; filename: string }> {
  const name = getBlobName(input, fallbackFilename);
  if (input.size <= MAX_UPLOAD_BYTES) {
    return { blob: input, filename: name };
  }
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(input);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      const maxDim = 2400;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ blob: input, filename: name });
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const tryQuality = (q: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({ blob: input, filename: name });
              return;
            }
            if (blob.size <= MAX_UPLOAD_BYTES || q <= 0.2) {
              const base = name.replace(/\.[^.]+$/, "");
              resolve({ blob, filename: `${base}.jpg` });
              return;
            }
            tryQuality(Math.max(0.2, q - 0.15));
          },
          "image/jpeg",
          q
        );
      };
      tryQuality(0.9);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ blob: input, filename: name });
    };
    img.src = url;
  });
}
