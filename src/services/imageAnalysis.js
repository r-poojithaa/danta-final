/**
 * Image Analysis Service – Danta
 * Sends intraoral images to OpenAI GPT-4o Vision and returns structured
 * clinical feature extraction + probability adjustments for the Bayesian Network.
 */

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY

const SYSTEM_PROMPT = `Act as a dental clinical assistant. Analyze the extraction site image for dry socket risk.
Respond strictly in JSON format.

{
  "clot_present": boolean | null,
  "bone_exposure": boolean,
  "inflammation_level": "none" | "mild" | "moderate" | "severe",
  "debris_present": boolean,
  "healing_stage": "early" | "intermediate" | "late" | "disrupted" | "cannot_assess",
  "image_quality": "poor" | "acceptable" | "good",
  "confidence": number,
  "clinical_notes": "string",
  "dry_socket_indicators": ["string"],
  "recommended_actions": ["string"]
}`

/**
 * Analyze an intraoral image using Vision AI
 * @param {string} base64Image  – base64-encoded image (without data URI prefix)
 * @param {string} mimeType     – e.g. 'image/jpeg'
 * @returns {Promise<ImageAnalysisResult>}
 */
export async function analyzeImage(base64Image, mimeType = 'image/jpeg') {
  const dataUrl = `data:${mimeType};base64,${base64Image}`
  let apiKey, apiUrl, modelName
  
  // Try to find any available key
  const key = GROK_API_KEY || OPENAI_API_KEY
  
  if (!key) {
    throw new Error('Missing AI API Key (VITE_GROK_API_KEY). Please check your .env file and RESTART your terminal.')
  }

  // Detect provider based on key prefix
  if (key.startsWith('gsk_')) {
    // Groq API - Using the primary vision model
    apiKey = key
    apiUrl = 'https://api.groq.com/openai/v1/chat/completions'
    modelName = 'qwen/qwen3.6-27b'
  } else if (key.startsWith('xai-')) {
    // xAI API
    apiKey = key
    apiUrl = 'https://api.x.ai/v1/chat/completions'
    modelName = 'grok-4.5'
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
      max_tokens: 2048,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: SYSTEM_PROMPT + '\n\nOutput ONLY valid JSON for this image.',
            },
            {
              type: 'image_url',
              image_url: { url: dataUrl },
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

  console.log('[ImageAnalysis] Raw AI Content:', content)

  let result
  try {
    result = JSON.parse(content)
  } catch {
    // Try to extract JSON from response
    const match = content.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        result = JSON.parse(match[0])
      } catch (innerErr) {
        console.error('[ImageAnalysis] JSON extraction failed:', innerErr)
        throw new Error('AI returned malformed JSON. Please try again.')
      }
    } else {
      console.error('[ImageAnalysis] No JSON found in content')
      throw new Error('AI returned an invalid response format. Please try again.')
    }
  }

  return enrichWithBNFeatures(result)
}

/**
 * Convert image analysis result → Bayesian Network evidence keys
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
