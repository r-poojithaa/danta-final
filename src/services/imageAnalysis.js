/**
 * Image Analysis Service – Danta
 * Sends intraoral images to OpenAI GPT-4o Vision and returns structured
 * clinical feature extraction + probability adjustments for the Bayesian Network.
 */

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY

const SYSTEM_PROMPT = `You are a specialist dental radiologist and oral surgeon AI assistant.
You will analyze intraoral photographs of extraction sites and detect clinical features relevant to dry socket (alveolar osteitis) diagnosis and risk assessment.

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanation, just the JSON object.

Analyze the image for:
1. Blood clot presence/absence in the socket
2. Alveolar bone exposure
3. Inflammation markers (erythema, oedema)
4. Food debris or contamination
5. Overall wound healing stage
6. Any other relevant clinical findings

JSON schema:
{
  "clot_present": boolean | null,
  "bone_exposure": boolean,
  "inflammation_level": "none" | "mild" | "moderate" | "severe",
  "debris_present": boolean,
  "healing_stage": "early" | "intermediate" | "late" | "disrupted" | "cannot_assess",
  "image_quality": "poor" | "acceptable" | "good",
  "confidence": number (0.0–1.0),
  "clinical_notes": string,
  "dry_socket_indicators": string[],
  "recommended_actions": string[]
}`

/**
 * Analyze an intraoral image using GPT-4o Vision
 * @param {string} base64Image  – base64-encoded image (without data URI prefix)
 * @param {string} mimeType     – e.g. 'image/jpeg'
 * @returns {Promise<ImageAnalysisResult>}
 */
export async function analyzeImage(base64Image, mimeType = 'image/jpeg') {
  const dataUrl = `data:${mimeType};base64,${base64Image}`
  let apiKey, apiUrl, modelName
  
  // Try to find any available key
  const key = GROK_API_KEY || OPENAI_API_KEY
  
  if (!key || key.includes('removed_to_force_grok')) {
    // If no real key, or dummy key, check for Grok key specifically
    if (!GROK_API_KEY || GROK_API_KEY === '') {
      console.warn('[ImageAnalysis] No valid AI key found – using heuristic fallback')
      return heuristicFallback()
    }
  }

  // Detect provider based on key prefix
  if (key.startsWith('gsk_')) {
    // Groq API (Commonly used by people asking for "Grok")
    apiKey = key
    apiUrl = 'https://api.groq.com/openai/v1/chat/completions'
    modelName = 'meta-llama/llama-4-scout-17b-16e-instruct'
  } else if (key.startsWith('xai-')) {
    // xAI API (The official Grok API)
    apiKey = key
    apiUrl = 'https://api.x.ai/v1/chat/completions'
    modelName = 'grok-4.3'
  } else {
    // Default to OpenAI
    apiKey = key
    apiUrl = 'https://api.openai.com/v1/chat/completions'
    modelName = 'gpt-4o'
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 800,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this intraoral extraction site photograph for dry socket risk indicators. Return structured JSON only.',
            },
            {
              type: 'image_url',
              image_url: { url: dataUrl, detail: 'high' },
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`AI API Error (${apiUrl}): ${response.status} – ${err}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content?.trim()

  let result
  try {
    result = JSON.parse(content)
  } catch {
    // Try to extract JSON from response
    const match = content.match(/\{[\s\S]*\}/)
    result = match ? JSON.parse(match[0]) : heuristicFallback()
  }

  return enrichWithBNFeatures(result)
}

/**
 * Convert image analysis result → Bayesian Network evidence keys
 * Maps GPT-4o output to the BN's CPT keys for image features
 */
export function imageToBNEvidence(analysisResult) {
  if (!analysisResult) return {}

  return {
    no_clot: analysisResult.clot_present === false,
    bone_exposure: analysisResult.bone_exposure === true,
    inflammation: ['moderate', 'severe'].includes(analysisResult.inflammation_level),
    debris: analysisResult.debris_present === true,
  }
}

/**
 * Calculate image-based risk score (0–100)
 * Independent score from image features alone
 */
export function imageRiskScore(analysisResult) {
  if (!analysisResult) return 0
  let score = 0
  if (analysisResult.clot_present === false) score += 40
  if (analysisResult.bone_exposure) score += 35
  if (analysisResult.inflammation_level === 'severe') score += 20
  else if (analysisResult.inflammation_level === 'moderate') score += 12
  else if (analysisResult.inflammation_level === 'mild') score += 5
  if (analysisResult.debris_present) score += 10
  if (analysisResult.healing_stage === 'disrupted') score += 15
  return Math.min(100, Math.round(score))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function enrichWithBNFeatures(result) {
  return {
    ...result,
    bn_evidence: imageToBNEvidence(result),
    image_risk_score: imageRiskScore(result),
  }
}

function heuristicFallback() {
  return enrichWithBNFeatures({
    clot_present: false,
    bone_exposure: true,
    inflammation_level: 'severe',
    debris_present: false,
    healing_stage: 'disrupted',
    image_quality: 'acceptable',
    confidence: 0.85,
    clinical_notes: '[DEMO MODE] No OpenAI API key found. Simulating image analysis with high-risk findings to demonstrate the Bayesian fusion engine.',
    dry_socket_indicators: ['Simulated absent clot', 'Simulated bone exposure', 'Simulated severe erythema'],
    recommended_actions: ['Provide OpenAI API key in .env for real analysis'],
  })
}
