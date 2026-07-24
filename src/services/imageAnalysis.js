/**
 * Image Analysis Service – Danta
 * Sends intraoral images to OpenAI GPT-4o Vision and returns structured
 * clinical feature extraction + probability adjustments for the Bayesian Network.
 */

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY

const SYSTEM_PROMPT = `Act as a clinical auditor. Analyze the intraoral image for dry socket pathology.
Do NOT use generic templates.

REQUIRED STEP:
Before analysis, describe the specific visual anchor of this photo (e.g. "Bright reflection at the mesial edge" or "Deep shadow in the distal corner"). This anchor is unique to this specific image capture.

CLINICAL SCRUTINY:
1. Identify physical colors (e.g. "dark ruby-red", "opaque grey slough").
2. Describe texture (e.g. "moist and filled", "dry and hollow").
3. Check bony margins for exposure.

Respond ONLY in valid JSON:
{
  "visual_landmark": "Unique description of lighting/shadows in this specific photo.",
  "clinical_finding": "Detailed clinical description of the socket floor, margins, and tissue using specific medical terms.",
  "clot_present": boolean | null,
  "bone_exposure": boolean,
  "inflammation_level": "none" | "mild" | "moderate" | "severe",
  "debris_present": boolean,
  "healing_stage": "early" | "intermediate" | "late" | "disrupted" | "cannot_assess",
  "image_quality": "poor" | "acceptable" | "good",
  "confidence": number,
  "clinical_notes": "Diagnostic summary.",
  "dry_socket_indicators": ["Specific visual abnormalities"],
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
      max_tokens: 3000,
      temperature: 0.6,
      top_p: 0.95,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${SYSTEM_PROMPT}\n\n[Analysis Request ID: ${analysisId}]\nAnalyze this specific photo and provide unique clinical findings in JSON.`,
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
