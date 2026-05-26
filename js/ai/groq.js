// ==========================================
// NASTY — Groq AI Module
// All calls go through /api/groq (serverless)
// ==========================================

const GROQ_ENDPOINT = '/api/groq';

// ---- Base caller ----
async function callGroq(messages, systemPrompt, options = {}) {
  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        system: systemPrompt,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 600,
        stream: false
      })
    });

    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
    const data = await res.json();
    return { success: true, content: data.content };
  } catch (err) {
    console.error('Groq error:', err);
    return { success: false, content: null, error: err.message };
  }
}

// ---- Dragon Chat ----
// The AI personality that lives in the dragon on the landing page
const DRAGON_SYSTEM = `You are NAST — the ancient mythic dragon spirit of NASTY marketplace.
You are wise, powerful, and slightly mysterious. You speak with commanding elegance — short sentences, impactful words.
You help users discover products, answer questions about NASTY, and guide them through the marketplace.
You occasionally reference fire, ancient wisdom, or mythic imagery but never overdo it.
Keep responses concise (2-4 sentences max unless asked for detail).
NASTY is a universal marketplace with sellers from all categories. AI-powered. Dark luxury aesthetic.`;

export async function dragonChat(messages) {
  return callGroq(messages, DRAGON_SYSTEM, { temperature: 0.75, max_tokens: 250 });
}

// ---- Search Intent Engine ----
// Converts natural language query → structured search params
export async function parseSearchIntent(query) {
  const system = `You are a search intent parser for an e-commerce marketplace.
Given a natural language search query, extract:
- keywords: array of search keywords
- category: best matching category (Electronics, Fashion, Beauty, Home, Sports, Books, Food, Toys, Automotive, Other)
- priceRange: { min: number|null, max: number|null }
- sortBy: "relevance" | "price_asc" | "price_desc" | "rating" | "newest"
- intent: one of "browse" | "buy" | "compare" | "gift"
Respond ONLY with valid JSON. No markdown, no explanation.`;

  const result = await callGroq(
    [{ role: 'user', content: `Parse this search query: "${query}"` }],
    system,
    { temperature: 0.1, max_tokens: 200 }
  );

  if (!result.success) return { keywords: [query], category: 'All', priceRange: {}, sortBy: 'relevance', intent: 'browse' };

  try {
    return JSON.parse(result.content);
  } catch {
    return { keywords: [query], category: 'All', priceRange: {}, sortBy: 'relevance', intent: 'browse' };
  }
}

// ---- Product Recommendations ----
export async function getProductRecommendations(product, allProducts = []) {
  const system = `You are a product recommendation engine for NASTY marketplace.
Given a product the user is viewing and a list of available products, select the 4 most relevant ones to recommend.
Consider: same category, complementary use, similar price range, user journey logic.
Return ONLY a JSON array of product IDs. Example: ["id1","id2","id3","id4"]
No markdown, no explanation.`;

  const productList = allProducts.slice(0, 40).map(p => ({
    id: p.id, title: p.title, category: p.category, price: p.price
  }));

  const result = await callGroq(
    [{
      role: 'user',
      content: `Viewing product: ${JSON.stringify({ title: product.title, category: product.category, price: product.price })}\nAvailable products: ${JSON.stringify(productList)}`
    }],
    system,
    { temperature: 0.3, max_tokens: 100 }
  );

  if (!result.success) return [];
  try { return JSON.parse(result.content); }
  catch { return []; }
}

// ---- AI Listing Writer (Seller tool) ----
export async function generateListing(keywords, category, price) {
  const system = `You are a premium product listing writer for NASTY marketplace — a dark luxury e-commerce platform.
Write compelling, SEO-rich product listings. Tone: sophisticated, confident, desire-inducing.
Never use generic filler phrases. Make every word count.
Return ONLY valid JSON with: { title, description, tags }
- title: 6-10 words, punchy and searchable
- description: 3 compelling sentences
- tags: array of 8 relevant search tags`;

  const result = await callGroq(
    [{
      role: 'user',
      content: `Create a listing for: "${keywords}" in category "${category}" priced at $${price}`
    }],
    system,
    { temperature: 0.8, max_tokens: 400 }
  );

  if (!result.success) return null;
  try { return JSON.parse(result.content); }
  catch { return null; }
}

// ---- Personalized Homepage Feed Ranking ----
export async function rankProductsForUser(userHistory, products) {
  if (!userHistory?.length) return products;

  const system = `You are a personalization engine for an e-commerce marketplace.
Given a user's browse history and a product list, return the product IDs reordered by predicted interest.
Return ONLY a JSON array of product IDs in order of relevance. No markdown, no explanation.`;

  const history = userHistory.slice(0, 10);
  const productList = products.slice(0, 20).map(p => ({ id: p.id, title: p.title, category: p.category }));

  const result = await callGroq(
    [{
      role: 'user',
      content: `User history: ${JSON.stringify(history)}\nProducts to rank: ${JSON.stringify(productList)}`
    }],
    system,
    { temperature: 0.2, max_tokens: 150 }
  );

  if (!result.success) return products;
  try {
    const orderedIds = JSON.parse(result.content);
    const map = Object.fromEntries(products.map(p => [p.id, p]));
    return orderedIds.map(id => map[id]).filter(Boolean);
  } catch { return products; }
}

// ---- Admin Insights ----
export async function generateAdminInsight(salesData) {
  const system = `You are a business analytics AI for NASTY marketplace.
Analyze sales data and provide 3 sharp, actionable insights.
Be direct and data-focused. Each insight max 2 sentences.
Return JSON array: [{ title, insight, action }]`;

  const result = await callGroq(
    [{ role: 'user', content: `Analyze this data: ${JSON.stringify(salesData)}` }],
    system,
    { temperature: 0.4, max_tokens: 400 }
  );

  if (!result.success) return [];
  try { return JSON.parse(result.content); }
  catch { return []; }
}
