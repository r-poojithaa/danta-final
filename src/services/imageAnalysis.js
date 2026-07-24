/**
 * Image Analysis Service – Danta
 * Sends intraoral images to OpenAI GPT-4o Vision and returns structured
 * clinical feature extraction + probability adjustments for the Bayesian Network.
 */

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY

const SYSTEM_PROMPT = `Act as an expert clinical auditor. Analyze the intraoral photo for dry socket pathology.

PHYSICAL ANCHORING (Unique to every capture):
Before discussing pathology, describe 2-3 unique physical artifacts in this photo (e.g. "Bright glare on the tooth", "Deep shadow at the base", "Texture of the surgical bib"). This ensures the analysis is tied to the unique pixels of this specific capture.

CLINICAL CRITERIA:
1. Examine the socket floor for color (ruby-red vs grey/empty).
2. Look for high-contrast creamy areas (exposed bone).
3. Check gingival cuff for edema/erythema.

Respond ONLY in valid JSON:
{
  "visual_landmark": "Physical artifacts, lighting, and angle description.",
  "clinical_finding": "Detailed description of the socket tissue and bone state.",
  "clot_present": boolean | null,
  "bone_exposure": boolean,
  "inflammation_level": "none" | "mild" | "moderate" | "severe",
  "debris_present": boolean,
  "healing_stage": "early" | "intermediate" | "late" | "disrupted" | "cannot_assess",
  "image_quality": "poor" | "acceptable" | "good",
  "confidence": number,
  "clinical_notes": "Objective diagnostic summary.",
  "dry_socket_indicators": ["List specific abnormal findings or 'None'"],
  "recommended_actions": ["Clinical steps"]
}`

/**
 * Analyze an intraoral image using High-Sensitivity Vision AI
 * @param {string} base64Image  – base64-encoded image
 * @param {string} mimeType     – e.g. 'image/jpeg'
 * @returns {Promise<ImageAnalysisResult>}
 */
export async function analyzeImage(base64Image, mimeType = 'image/jpeg') {
  const dataUrl = `data:${mimeType};base64,${base64Image}`
  const analysisId = crypto.randomUUID()
  let apiKey, apiUrl, modelName
  
  const key = GROK_API_KEY || OPENAI_API_KEY
  if (!key) throw new Error('Missing AI API Key (VITE_GROK_API_KEY).')

  if (key.startsWith('gsk_')) {
    apiKey = key
    apiUrl = 'https://api.groq.com/openai/v1/chat/completions'
    modelName = 'qwen/qwen3.6-27b'
  } else if (key.startsWith('xai-')) {
    apiKey = key
    apiUrl = 'https://api.x.ai/v1/chat/completions'
    modelName = 'grok-4.5'
  } else {
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
      max_tokens: 4096,
      temperature: 0.6,
      top_p: 0.95,
      reasoning_effort: "none",
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${SYSTEM_PROMPT}\n\n[RANDOM_SEED: ${Math.random()}]\nAnalyze this specific photo for clinical evidence and output valid JSON.`,
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

  // Non-linear critical scoring
  if (analysisResult.clot_present === false) score += 50
  if (analysisResult.bone_exposure) score += 60 // Immediate High Risk indicator

  // Secondary indicators
  if (analysisResult.inflammation_level === 'severe') score += 25
  else if (analysisResult.inflammation_level === 'moderate') score += 15
  else if (analysisResult.inflammation_level === 'mild') score += 5

  if (analysisResult.debris_present) score += 15
  if (analysisResult.healing_stage === 'disrupted') score += 30

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
