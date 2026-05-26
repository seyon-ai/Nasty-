// ==========================================
// NASTY — ImgBB Upload Module
// All image uploads via /api/imgbb serverless
// ==========================================

const IMGBB_ENDPOINT = '/api/imgbb';

// ---- Upload image (File or base64) ----
export async function uploadImage(file, name = '') {
  try {
    let base64;

    if (typeof file === 'string' && file.startsWith('data:')) {
      // Already base64 data URL — strip header
      base64 = file.split(',')[1];
    } else {
      // Convert File object to base64
      base64 = await fileToBase64(file);
    }

    const res = await fetch(IMGBB_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, name: name || `nasty_${Date.now()}` })
    });

    if (!res.ok) throw new Error(`ImgBB error: ${res.status}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.error?.message || 'Upload failed');

    return {
      success: true,
      url: data.data.url,
      displayUrl: data.data.display_url,
      deleteUrl: data.data.delete_url,
      thumb: data.data.thumb?.url || data.data.url,
      size: data.data.size
    };
  } catch (err) {
    console.error('ImgBB upload error:', err);
    return { success: false, error: err.message };
  }
}

// ---- Upload multiple images ----
export async function uploadImages(files, onProgress) {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i, files.length);
    const result = await uploadImage(files[i], `product_${Date.now()}_${i}`);
    results.push(result);
  }
  return results;
}

// ---- File → base64 ----
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---- Validate image before upload ----
export function validateImage(file) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, WebP, and GIF are allowed.' };
  }
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be under 10MB.' };
  }
  return { valid: true };
}
