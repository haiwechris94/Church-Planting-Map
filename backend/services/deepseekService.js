/**
 * DeepSeek AI Service
 * Provides AI-powered analysis interpretation and recommendations for DMM DNA criteria
 */
const axios = require('axios');

// OpenRouter API configuration
const DEEPSEEK_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Default free-model fallback chain (tried in order)
const DEFAULT_MODEL_CHAIN = [
  'deepseek/deepseek-chat-v3.1:free',
  'openai/gpt-oss-120b:free',
  'google/gemma-4-31b:free',
  'openrouter/free',
];

/**
 * Build the model chain from env vars:
 *  - DEEPSEEK_MODELS (CSV) takes full precedence over the default chain
 *  - DEEPSEEK_MODEL (single) is prepended to the default chain (deduplicated)
 */
function buildModelChain() {
  const csv = process.env.DEEPSEEK_MODELS;
  if (csv && csv.trim()) {
    const list = csv.split(',').map(s => s.trim()).filter(Boolean);
    if (list.length > 0) return Array.from(new Set(list));
  }
  const single = process.env.DEEPSEEK_MODEL && process.env.DEEPSEEK_MODEL.trim();
  if (single) {
    return Array.from(new Set([single, ...DEFAULT_MODEL_CHAIN]));
  }
  return [...DEFAULT_MODEL_CHAIN];
}

const MODEL_CHAIN = buildModelChain();

if (!DEEPSEEK_API_KEY) {
  console.warn('[DeepSeek] DEEPSEEK_API_KEY is not set. AI insights will fall back to deterministic responses.');
} else {
  console.log(`[DeepSeek] Model fallback chain (${MODEL_CHAIN.length}): ${MODEL_CHAIN.join(' -> ')}`);
}

// DMM DNA Criteria definitions for context
const DMM_DNA_CRITERIA = {
  prayer: {
    name: 'Prayer',
    nameFr: 'Prière',
    description: 'Regular prayer for the people group and the work',
  },
  compassion: {
    name: 'Compassion',
    nameFr: 'Compassion',
    description: 'Demonstrating Christ\'s love through acts of service and care',
  },
  person_of_peace: {
    name: 'Person of Peace',
    nameFr: 'Personne de paix',
    description: 'Identifying and working with persons of peace in the community',
  },
  dbs: {
    name: 'DBS (Discovery Bible Study)',
    nameFr: 'EBD (Étude Biblique de Découverte)',
    description: 'Regular Discovery Bible Studies being conducted',
  },
  obedience: {
    name: 'Obedience',
    nameFr: 'Obéissance',
    description: 'Believers practicing immediate obedience to Scripture',
  },
  church_gathering: {
    name: 'Church Gathering',
    nameFr: 'Rassemblement d\'église',
    description: 'Regular gatherings of believers for worship and fellowship',
  },
  disciple_replication: {
    name: 'Disciple Replication',
    nameFr: 'Réplication de disciples',
    description: 'Disciples making new disciples who make disciples',
  },
  leader_development: {
    name: 'Leader Development',
    nameFr: 'Développement de leaders',
    description: 'Local leaders being trained and empowered',
  },
  church_multiplication: {
    name: 'Church Multiplication',
    nameFr: 'Multiplication d\'églises',
    description: 'Churches planting new churches',
  },
  evaluation: {
    name: 'Evaluation',
    nameFr: 'Évaluation',
    description: 'Regular assessment and adjustment of strategies',
  },
};

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determine if an error is retryable on the SAME model (transient network errors only).
 */
function isRetryableError(error) {
  const retryCodes = ['ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN'];
  if (error.code && retryCodes.includes(error.code)) return true;
  if (error.message) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('socket hang up') ||
      msg.includes('econnreset') ||
      msg.includes('timeout') ||
      msg.includes('econnrefused') ||
      msg.includes('network error')
    ) return true;
  }
  // Never retry same model on HTTP responses (those are handled by shouldSwitchModel/isFatalError)
  if (error.response) return false;
  return false;
}

/**
 * Fatal errors abort the entire chain - no further models will be tried.
 * 400 (bad request), 401 (unauthorized), 403 (forbidden) indicate a problem
 * that won't be solved by switching models.
 */
function isFatalError(error) {
  if (!error || !error.response) return false;
  const status = error.response.status;
  return status === 400 || status === 401 || status === 403;
}

/**
 * Should we switch to the NEXT model in the chain?
 * Switch on: 402 (payment required), 404 (model not found),
 * 429 (rate limit), or any 5xx (server error).
 */
function shouldSwitchModel(error) {
  if (!error || !error.response) return false;
  const status = error.response.status;
  if (status === 402 || status === 404 || status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

/**
 * Call OpenRouter for a specific model with up to 2 attempts.
 * Retries the SAME model only on transient network errors.
 * Throws the last error otherwise (caller decides whether to switch model).
 */
async function callOpenRouter(model, messages, opts = {}) {
  const {
    maxAttempts = 2,
    timeoutMs = 15000,
    maxTokens = 2000,
    temperature = 0.7,
  } = opts;

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs - 1000));

    try {
      console.log(`[DeepSeek] -> Calling model "${model}" (attempt ${attempt}/${maxAttempts})`);
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://church-planting-map.app',
            'X-Title': 'Church Planting Map - DMM Analysis',
          },
          timeout: timeoutMs,
          signal: controller.signal,
        }
      );
      clearTimeout(abortTimer);
      return response;
    } catch (error) {
      clearTimeout(abortTimer);
      lastError = error;
      const status = error.response && error.response.status;
      console.error(
        `[DeepSeek]    Model "${model}" attempt ${attempt}/${maxAttempts} failed. ` +
        `Status: ${status || 'N/A'}, Code: ${error.code || 'N/A'}, Message: ${error.message}`
      );

      // If it's a transient network error and we have attempts left, retry same model.
      if (attempt < maxAttempts && isRetryableError(error)) {
        console.log(`[DeepSeek]    Transient error - retrying same model in 1s...`);
        await sleep(1000);
        continue;
      }
      // Otherwise stop attempting this model.
      throw error;
    }
  }

  // Defensive - should not reach here.
  throw lastError || new Error('callOpenRouter exhausted attempts without an error');
}

/**
 * Generate AI interpretation and recommendations for qualitative analysis
 * @param {Object} analysisData - The analysis data including scores and people group info
 * @returns {Promise<Object>} AI-generated interpretation and recommendations
 */
async function generateAnalysisInsights(analysisData) {
  const { peopleGroupName, villageName, country, criteriaScores, overallScore, priorityLevel, remarks, recommendations } = analysisData;

  // Build detailed criteria summary for the prompt with names, scores, weights, and descriptions
  const criteriaSummary = criteriaScores.map(cs => {
    const criterion = DMM_DNA_CRITERIA[cs.criterionId] || { name: cs.criterionName, nameFr: cs.criterionName, description: '' };
    const weight = cs.weight || 1;
    const weightedScore = (cs.score * weight).toFixed(1);
    return `- **${criterion.nameFr || criterion.name}**: ${cs.score}/5 (${getScoreLabel(cs.score)}) - Poids: ${weight} - Score pondéré: ${weightedScore}\n  Description: ${criterion.description || 'N/A'}`;
  }).join('\n');

  // Calculate weighted average for context
  const totalWeight = criteriaScores.reduce((sum, cs) => sum + (cs.weight || 1), 0);
  const weightedSum = criteriaScores.reduce((sum, cs) => sum + (cs.score * (cs.weight || 1)), 0);
  const weightedAverage = totalWeight > 0 ? (weightedSum / totalWeight).toFixed(2) : 0;

  // Identify strengths and weaknesses with French names
  const strengths = criteriaScores.filter(cs => cs.score >= 4).map(cs => {
    const criterion = DMM_DNA_CRITERIA[cs.criterionId] || { nameFr: cs.criterionName };
    return criterion.nameFr || criterion.name;
  });
  
  const weaknesses = criteriaScores.filter(cs => cs.score <= 2).map(cs => {
    const criterion = DMM_DNA_CRITERIA[cs.criterionId] || { nameFr: cs.criterionName };
    return criterion.nameFr || criterion.name;
  });

  // Get priority level in French
  const priorityLabelFr = getPriorityLabel(priorityLevel);

  const prompt = `Vous êtes un expert en Mouvements de Formation de Disciples (DMM - Disciple Making Movements) et en stratégies d'implantation d'églises. Analysez l'évaluation qualitative suivante d'un groupe de peuples et fournissez des insights et recommandations détaillés.

**INFORMATIONS SUR LE GROUPE DE PEUPLES:**
- Nom du groupe: ${peopleGroupName}
- Village: ${villageName || 'Non spécifié'}
- Pays: ${country || 'Non spécifié'}
- Score global: ${overallScore}% (moyenne pondérée: ${weightedAverage}/5)
- Niveau de priorité: ${priorityLabelFr}

**SCORES DÉTAILLÉS DES 10 CRITÈRES DMM DNA:**
${criteriaSummary}

**ANALYSE DES SCORES:**
- Points forts (scores 4-5): ${strengths.length > 0 ? strengths.join(', ') : 'Aucun identifié'}
- Points faibles (scores 1-2): ${weaknesses.length > 0 ? weaknesses.join(', ') : 'Aucun identifié'}
- Nombre de critères évalués: ${criteriaScores.length}/10

${remarks ? `**REMARQUES DE L'UTILISATEUR:**\n${remarks}` : ''}

${recommendations ? `**RECOMMANDATIONS DE L'UTILISATEUR:**\n${recommendations}` : ''}

**INSTRUCTIONS:**
Veuillez fournir une analyse complète en français:

1. **Interprétation (2-3 paragraphes):**
   - Analysez l'état actuel de la progression DMM pour ce groupe de peuples basé sur les scores des 10 critères
   - Que révèle cette évaluation sur la santé et la trajectoire du mouvement?
   - Identifiez les tendances et les corrélations entre les différents critères

2. **Recommandations Stratégiques (3-5 points):**
   - Fournissez des recommandations spécifiques et actionnables pour renforcer le travail DMM
   - Concentrez-vous sur les domaines les plus faibles tout en exploitant les forces
   - Tenez compte des remarques et recommandations de l'utilisateur si fournies

3. **Actions Prioritaires (2-3 éléments):**
   - Quelles sont les prochaines étapes les plus urgentes à entreprendre?
   - Classez-les par ordre de priorité basé sur le niveau de priorité (${priorityLabelFr})

4. **Évaluation de la Priorité:**
   - Expliquez pourquoi ce groupe de peuples a un niveau de priorité "${priorityLabelFr}"
   - Quels critères contribuent le plus à ce niveau de priorité?

Soyez encourageant mais réaliste dans votre analyse.`;

  // Short-circuit if no API key - return deterministic fallback immediately.
  if (!DEEPSEEK_API_KEY) {
    console.warn('[DeepSeek] No DEEPSEEK_API_KEY configured - returning deterministic fallback.');
    return {
      success: false,
      error: 'DEEPSEEK_API_KEY environment variable is not configured',
      triedModels: [],
      interpretation: generateFallbackInterpretation(analysisData),
      recommendations: generateFallbackRecommendations(analysisData),
    };
  }

  const messages = [
    {
      role: 'system',
      content: 'You are an expert consultant in Disciple Making Movements (DMM) and church planting. You provide insightful analysis and practical recommendations based on DMM DNA criteria assessments. Always respond in French.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const triedModels = [];
  let lastError = null;

  console.log(`[DeepSeek] Starting insights generation across ${MODEL_CHAIN.length} model(s).`);

  for (let i = 0; i < MODEL_CHAIN.length; i++) {
    const model = MODEL_CHAIN[i];
    triedModels.push(model);

    try {
      const response = await callOpenRouter(model, messages, {
        maxAttempts: 2,
        timeoutMs: 15000,
        maxTokens: 2000,
        temperature: 0.7,
      });

      const aiResponse = response.data.choices[0]?.message?.content || '';
      const { interpretation, recommendations } = parseAIResponse(aiResponse);

      console.log(`[DeepSeek] OK Success with model "${model}" (after trying ${triedModels.length}/${MODEL_CHAIN.length}).`);

      return {
        success: true,
        modelUsed: model,
        interpretation,
        recommendations,
        rawResponse: aiResponse,
      };
    } catch (error) {
      lastError = error;
      const status = error.response && error.response.status;

      if (isFatalError(error)) {
        console.error(`[DeepSeek] FATAL error (status ${status}) on model "${model}" - aborting entire chain.`);
        break;
      }

      if (shouldSwitchModel(error)) {
        const reason = status ? `HTTP ${status}` : (error.code || 'unknown');
        const next = MODEL_CHAIN[i + 1];
        if (next) {
          console.warn(`[DeepSeek] Switching model: "${model}" failed with ${reason} - trying next model "${next}".`);
        } else {
          console.warn(`[DeepSeek] Model "${model}" failed with ${reason} - no more models in chain.`);
        }
        continue;
      }

      // Non-switchable, non-fatal error (e.g. exhausted network retries on this model).
      // Try the next model anyway as a best effort.
      const next = MODEL_CHAIN[i + 1];
      if (next) {
        console.warn(`[DeepSeek] Non-switch error on "${model}" (${error.code || error.message}) - falling through to next model "${next}".`);
      } else {
        console.warn(`[DeepSeek] Non-switch error on "${model}" (${error.code || error.message}) - no more models in chain.`);
      }
      continue;
    }
  }

  console.error(
    `[DeepSeek] All models exhausted. Tried: [${triedModels.join(', ')}]. ` +
    `Last error: ${lastError ? lastError.message : 'unknown'}`
  );
  return {
    success: false,
    error: lastError ? lastError.message : 'All models failed',
    triedModels,
    interpretation: generateFallbackInterpretation(analysisData),
    recommendations: generateFallbackRecommendations(analysisData),
  };
}

/**
 * Get score label for display
 */
function getScoreLabel(score) {
  const labels = {
    1: 'Très faible',
    2: 'Faible',
    3: 'Moyen',
    4: 'Bon',
    5: 'Excellent',
  };
  return labels[score] || 'Non évalué';
}

/**
 * Parse AI response to extract interpretation and recommendations
 */
function parseAIResponse(response) {
  // Try to split the response into sections
  let interpretation = '';
  let recommendations = '';

  // Look for section markers
  const interpretationMatch = response.match(/\*\*Interprétation.*?\*\*:?([\s\S]*?)(?=\*\*Recommandations|\*\*Actions|$)/i);
  const recommendationsMatch = response.match(/\*\*Recommandations.*?\*\*:?([\s\S]*?)(?=\*\*Actions|$)/i);
  const actionsMatch = response.match(/\*\*Actions.*?\*\*:?([\s\S]*?)$/i);

  if (interpretationMatch) {
    interpretation = interpretationMatch[1].trim();
  }

  if (recommendationsMatch || actionsMatch) {
    recommendations = (recommendationsMatch ? recommendationsMatch[1] : '') + 
                     (actionsMatch ? '\n\n**Actions prioritaires:**\n' + actionsMatch[1] : '');
    recommendations = recommendations.trim();
  }

  // If parsing failed, use the whole response
  if (!interpretation && !recommendations) {
    const parts = response.split(/\n\n+/);
    if (parts.length >= 2) {
      interpretation = parts.slice(0, Math.ceil(parts.length / 2)).join('\n\n');
      recommendations = parts.slice(Math.ceil(parts.length / 2)).join('\n\n');
    } else {
      interpretation = response;
      recommendations = '';
    }
  }

  return { interpretation, recommendations };
}

/**
 * Generate fallback interpretation when AI is unavailable
 */
function generateFallbackInterpretation(analysisData) {
  const { overallScore, priorityLevel, criteriaScores } = analysisData;
  
  const strengths = criteriaScores.filter(cs => cs.score >= 4);
  const weaknesses = criteriaScores.filter(cs => cs.score <= 2);

  let interpretation = `Avec un score global de ${overallScore}%, ce groupe de peuples présente un niveau de priorité ${getPriorityLabel(priorityLevel)}. `;

  if (strengths.length > 0) {
    interpretation += `Les points forts identifiés incluent ${strengths.map(s => s.criterionName).join(', ')}. `;
  }

  if (weaknesses.length > 0) {
    interpretation += `Les domaines nécessitant une attention particulière sont ${weaknesses.map(w => w.criterionName).join(', ')}. `;
  }

  interpretation += `Une analyse plus approfondie est recommandée pour développer une stratégie d'engagement adaptée.`;

  return interpretation;
}

/**
 * Generate fallback recommendations when AI is unavailable
 */
function generateFallbackRecommendations(analysisData) {
  const { criteriaScores } = analysisData;
  const weaknesses = criteriaScores.filter(cs => cs.score <= 2);

  let recommendations = '**Recommandations générales:**\n\n';

  if (weaknesses.length > 0) {
    recommendations += '• Concentrer les efforts sur les domaines les plus faibles:\n';
    weaknesses.forEach(w => {
      recommendations += `  - ${w.criterionName}: Développer un plan d'action spécifique\n`;
    });
  }

  recommendations += '\n• Organiser des sessions de formation pour l\'équipe locale\n';
  recommendations += '• Établir des objectifs mesurables pour les 3 prochains mois\n';
  recommendations += '• Planifier une réévaluation dans 6 mois\n';

  return recommendations;
}

/**
 * Get priority label in French
 */
function getPriorityLabel(priority) {
  const labels = {
    'critical': 'critique',
    'very-high': 'très élevé',
    'high': 'élevé',
    'moderate': 'modéré',
    'low': 'faible',
  };
  return labels[priority] || priority;
}

module.exports = {
  generateAnalysisInsights,
  DMM_DNA_CRITERIA,
};
