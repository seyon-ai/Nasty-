// ==========================================
// NASTY — /api/huggingface serverless function
// ==========================================

export const config = { runtime: 'edge' };

const MODELS = {
  'image-classification': 'https://api-inference.huggingface.co/models/google/vit-base-patch16-224',
  'zero-shot-classification': 'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
  'text-generation': 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1'
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { task, payload } = await req.json();
    const modelUrl = MODELS[task] || MODELS['image-classification'];

    let body;
    if (task === 'image-classification') {
      // payload.image can be base64 or URL
      if (payload.image?.startsWith('http')) {
        // Fetch image and convert to blob
        const imgRes = await fetch(payload.image);
        const imgBlob = await imgRes.blob();
        body = imgBlob;
      } else {
        // base64 string — decode to bytes
        const binaryStr = atob(payload.image);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        body = bytes;
      }
    } else {
      body = JSON.stringify(payload);
    }

    const hfRes = await fetch(modelUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_API_KEY}`,
        ...(task !== 'image-classification' && { 'Content-Type': 'application/json' })
      },
      body
    });

    if (!hfRes.ok) {
      const err = await hfRes.text();
      // Model loading (503) — return graceful fallback
      if (hfRes.status === 503) {
        return new Response(JSON.stringify([{ label: 'Loading', score: 0 }]), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      return new Response(JSON.stringify({ error: 'HF API error', detail: err }), { status: 502 });
    }

    const data = await hfRes.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    console.error('HF handler error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
