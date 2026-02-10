const MAX_UPLOAD_MB = 3;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/**
 * Compress image in the browser to at most 3 MB (resize + JPEG quality).
 * Used by admin frame upload and main page photo upload.
 */
export async function compressToMax3MB(
  file: File
): Promise<{ blob: Blob; filename: string }> {
  if (file.size <= MAX_UPLOAD_BYTES) {
    return { blob: file, filename: file.name };
  }
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
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
        resolve({ blob: file, filename: file.name });
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const tryQuality = (q: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({ blob: file, filename: file.name });
              return;
            }
            if (blob.size <= MAX_UPLOAD_BYTES || q <= 0.2) {
              const base = file.name.replace(/\.[^.]+$/, "");
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
      resolve({ blob: file, filename: file.name });
    };
    img.src = url;
  });
}
