// ==========================================
// NASTY — HuggingFace AI Module
// Image classification & tagging via serverless
// ==========================================

const HF_ENDPOINT = '/api/huggingface';

// ---- Base caller ----
async function callHF(task, payload) {
  try {
    const res = await fetch(HF_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, payload })
    });

    if (!res.ok) throw new Error(`HF API error: ${res.status}`);
    return { success: true, data: await res.json() };
  } catch (err) {
    console.error('HuggingFace error:', err);
    return { success: false, data: null, error: err.message };
  }
}

// ---- Auto-tag product image ----
// Returns category + attribute tags from image URL or base64
export async function tagProductImage(imageUrl) {
  const result = await callHF('image-classification', { image: imageUrl });

  if (!result.success || !result.data) return { category: 'Other', tags: [] };

  // Map HF labels to NASTY categories
  const categoryMap = {
    'shirt': 'Fashion', 'dress': 'Fashion', 'shoe': 'Fashion', 'jacket': 'Fashion',
    'laptop': 'Electronics', 'phone': 'Electronics', 'camera': 'Electronics', 'headphone': 'Electronics',
    'lipstick': 'Beauty', 'perfume': 'Beauty', 'cream': 'Beauty',
    'chair': 'Home', 'lamp': 'Home', 'sofa': 'Home', 'plant': 'Home',
    'book': 'Books', 'notebook': 'Books',
    'ball': 'Sports', 'bicycle': 'Sports', 'dumbbell': 'Sports',
    'toy': 'Toys', 'car': 'Automotive', 'food': 'Food'
  };

  const labels = (result.data || []).map(r => r.label?.toLowerCase() || '');
  let category = 'Other';

  for (const label of labels) {
    for (const [key, cat] of Object.entries(categoryMap)) {
      if (label.includes(key)) { category = cat; break; }
    }
    if (category !== 'Other') break;
  }

  const tags = labels.slice(0, 6).map(l =>
    l.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  );

  return { category, tags };
}

// ---- Analyze product image for quality ----
export async function analyzeImageQuality(imageBase64) {
  const result = await callHF('image-classification', {
    image: imageBase64,
    model: 'google/vit-base-patch16-224'
  });

  if (!result.success) return { score: 0.5, feedback: [] };

  const topLabels = (result.data || []).slice(0, 3).map(r => r.label);
  return {
    score: result.data?.[0]?.score || 0.5,
    topLabels,
    feedback: topLabels.length > 0 ? ['Good quality image detected'] : ['Low confidence — try a clearer photo']
  };
}
