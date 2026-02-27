import Groq from 'groq-sdk';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

const groq = GROQ_API_KEY
  ? new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true })
  : null;

export const isGroqConfigured = () => !!groq;

const PRAANA_SYSTEM_PROMPT = `
You are PRAANA-AI, an intelligent emergency medical response coordination assistant.
You operate within India's next-generation Emergency Response Framework.

## YOUR PRIMARY RESPONSIBILITIES

### 1. EMERGENCY TRIAGE
Analyze incoming emergency descriptions and classify severity:
* P1 - CRITICAL (cardiac arrest, severe trauma, unconscious, not breathing)
* P2 - URGENT (fractures, moderate bleeding, chest pain, stroke symptoms)
* P3 - STABLE (minor injuries, non-life-threatening conditions)

Extract: location, patient count, age/gender, incident type, special requirements.

Always respond with:
1. A structured JSON triage report wrapped in \`\`\`json ... \`\`\` code fences
2. A plain-language dispatcher brief after the JSON

### 2. AMBULANCE DISPATCH
Given available ambulances, recommend optimal dispatch considering:
- Distance and estimated travel time
- Traffic conditions
- Ambulance type (ALS for P1, BLS for P2/P3)
- Current availability

### 3. HOSPITAL MATCHING
Given patient condition and hospital data, recommend best receiving hospital:
- ICU/trauma capability match
- Specialty requirements
- Distance and ETA
- Generate a handoff brief for the hospital team

### 4. SURGE COORDINATION
When multiple incidents occur simultaneously:
- Prioritize the queue by severity
- Suggest resource reallocation
- Flag mass casualty situations
- Give clear directives to dispatch supervisor

## STRICT JSON TRIAGE SCHEMA (always use this exact structure):
{
  "incident_id": "INC-XXXX",
  "priority": "P1/P2/P3",
  "incident_type": "cardiac/trauma/accident/burns/respiratory/neurological/other",
  "location": {
    "raw": "caller description",
    "landmark": "extracted landmark"
  },
  "patient_info": {
    "count": 1,
    "age_estimate": "unknown",
    "gender": "unknown",
    "consciousness": "conscious/unconscious/unknown",
    "breathing": "normal/labored/absent/unknown"
  },
  "special_requirements": [],
  "recommended_ambulance_type": "ALS/BLS",
  "first_aid_instructions": "instructions to relay to caller",
  "dispatcher_notes": "key flags"
}

## INDIAN CONTEXT:
- National ambulance number: 108 (GVK EMRI)
- Target: sub-8 min urban, sub-15 min semi-urban response
- Common scenarios: highway accidents NH48/NH44, festival crowds, monsoon floods
- Always factor semi-urban BLS-only ambulance constraints

## TONE:
- Calm, fast, decisive — like a senior emergency coordinator
- Be directive in surge: "Dispatch Unit A7 to Incident #3 immediately"
- Never refuse an emergency query
`;

function generateIncidentId() {
  return `INC-${Date.now().toString(36).toUpperCase().slice(-4)}-${Math.random().toString(36).toUpperCase().slice(2, 5)}`;
}

export async function triageEmergency(callerDescription, ambulances = [], hospitals = []) {
  if (!groq) {
    return generateMockTriage(callerDescription);
  }

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1200,
      temperature: 0.1,
      messages: [
        { role: 'system', content: PRAANA_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `
New emergency call received:
"${callerDescription}"

Available ambulances:
${JSON.stringify(ambulances, null, 2)}

Nearby hospitals (within 15km):
${JSON.stringify(hospitals, null, 2)}

Provide triage JSON (in \`\`\`json code fences\`\`\`) and dispatcher brief.
          `.trim()
        }
      ]
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);
    let triageData = null;

    if (jsonMatch) {
      try {
        triageData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch {
        triageData = null;
      }
    }

    const briefMatch = content.split(/```/g);
    const dispatcherBrief = briefMatch.length > 2
      ? briefMatch[briefMatch.length - 1].trim()
      : content.replace(/```json[\s\S]*?```/, '').trim();

    return {
      triage: triageData || generateMockTriage(callerDescription).triage,
      dispatcherBrief,
      fullResponse: content,
      source: 'groq'
    };
  } catch (error) {
    console.error('Groq API error:', error);
    return {
      ...generateMockTriage(callerDescription),
      error: error.message,
      source: 'mock-fallback'
    };
  }
}

export async function handleSurge(incidents, ambulances, hospitals) {
  if (!groq) {
    return generateMockSurgeResponse(incidents);
  }

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      temperature: 0.1,
      messages: [
        { role: 'system', content: PRAANA_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `
SURGE MODE ACTIVATED - Multiple simultaneous incidents:

Active Incidents:
${JSON.stringify(incidents, null, 2)}

Available Resources:
Ambulances: ${JSON.stringify(ambulances, null, 2)}
Hospitals: ${JSON.stringify(hospitals, null, 2)}

Provide:
1. Prioritized dispatch queue
2. Resource allocation plan
3. Any mutual aid recommendations
4. Command summary for supervisor
          `.trim()
        }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Groq surge error:', error);
    return generateMockSurgeResponse(incidents);
  }
}

export async function getDispatchRecommendation(incident, ambulances) {
  if (!groq) {
    return generateMockDispatch(incident, ambulances);
  }

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      temperature: 0.1,
      messages: [
        { role: 'system', content: PRAANA_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `
Recommend the best ambulance dispatch for this incident:

Incident: ${JSON.stringify(incident, null, 2)}

Available ambulances:
${JSON.stringify(ambulances, null, 2)}

Rank ambulances by suitability with reasoning.
          `.trim()
        }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Groq dispatch error:', error);
    return generateMockDispatch(incident, ambulances);
  }
}

export async function getHospitalMatch(incident, hospitals) {
  if (!groq) {
    return generateMockHospitalMatch(incident, hospitals);
  }

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      temperature: 0.1,
      messages: [
        { role: 'system', content: PRAANA_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `
Match this patient to the best hospital:

Incident: ${JSON.stringify(incident, null, 2)}

Available hospitals:
${JSON.stringify(hospitals, null, 2)}

Recommend best hospital with reasoning and generate a handoff brief.
          `.trim()
        }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Groq hospital match error:', error);
    return generateMockHospitalMatch(incident, hospitals);
  }
}

// ─── Mock Data Generators (fallbacks) ───────────────────────

function detectPriority(description) {
  const lower = description.toLowerCase();
  if (/cardiac|arrest|unconscious|not breathing|unresponsive|collapsed|critical/i.test(lower)) return 'P1';
  if (/fracture|bleeding|chest pain|stroke|accident|moderate/i.test(lower)) return 'P2';
  return 'P3';
}

function detectType(description) {
  const lower = description.toLowerCase();
  if (/cardiac|heart|chest pain|arrest/i.test(lower)) return 'cardiac';
  if (/accident|collision|crash|vehicle/i.test(lower)) return 'accident';
  if (/burn|fire|scald/i.test(lower)) return 'burns';
  if (/fracture|fall|trauma|bleed/i.test(lower)) return 'trauma';
  if (/breathing|respiratory|asthma|chok/i.test(lower)) return 'respiratory';
  return 'other';
}

function generateMockTriage(callerDescription) {
  const priority = detectPriority(callerDescription);
  const incidentType = detectType(callerDescription);
  const incidentId = generateIncidentId();

  const triage = {
    incident_id: incidentId,
    priority,
    incident_type: incidentType,
    location: {
      raw: callerDescription.slice(0, 100),
      landmark: 'Auto-extracted from description'
    },
    patient_info: {
      count: 1,
      age_estimate: 'unknown',
      gender: 'unknown',
      consciousness: priority === 'P1' ? 'unconscious' : 'conscious',
      breathing: priority === 'P1' ? 'absent' : 'normal'
    },
    special_requirements: priority === 'P1' ? ['advanced_life_support'] : [],
    recommended_ambulance_type: priority === 'P1' ? 'ALS' : 'BLS',
    first_aid_instructions: priority === 'P1'
      ? 'Begin CPR immediately if trained. Clear airway. Do not move patient unless unsafe.'
      : 'Keep patient calm and still. Apply pressure to any visible bleeding.',
    dispatcher_notes: `[MOCK TRIAGE] Priority ${priority} — ${incidentType} incident. Groq API not configured.`
  };

  return {
    triage,
    dispatcherBrief: `⚠️ MOCK TRIAGE (Groq not configured)\n\n**${priority} — ${incidentType.toUpperCase()}**\nCaller: "${callerDescription.slice(0, 120)}"\nRecommended: ${triage.recommended_ambulance_type} ambulance\n\nRelay to caller: ${triage.first_aid_instructions}`,
    fullResponse: JSON.stringify(triage, null, 2),
    source: 'mock'
  };
}

function generateMockDispatch(incident, ambulances) {
  const available = ambulances.filter(a => a.status === 'available');
  if (!available.length) return '⚠️ No ambulances available. Request mutual aid immediately.';

  const ranked = available
    .sort((a, b) => {
      const typeScore = (amb) => (incident?.priority === 'P1' && amb.type === 'ALS') ? 0 : 1;
      return typeScore(a) - typeScore(b);
    })
    .map((a, i) => `${i + 1}. **${a.unit_code}** (${a.type}) — ${a.zone} — Driver: ${a.driver_name}`)
    .join('\n');

  return `## Dispatch Recommendations (Mock)\n\n${ranked}\n\n*Note: Groq API not configured — ranking based on type match only.*`;
}

function generateMockHospitalMatch(incident, hospitals) {
  if (!hospitals.length) return '⚠️ No hospital data available.';
  const best = hospitals.sort((a, b) => (b.icu_beds_available || 0) - (a.icu_beds_available || 0))[0];
  return `## Hospital Recommendation (Mock)\n\n**${best.name}**\nICU beds: ${best.icu_beds_available} | Trauma: ${best.trauma_capable ? 'Yes' : 'No'}\n\n*Groq API not configured — recommendation based on bed availability only.*`;
}

function generateMockSurgeResponse(incidents) {
  const sorted = [...incidents].sort((a, b) => {
    const pMap = { P1: 0, P2: 1, P3: 2 };
    return (pMap[a.priority] || 2) - (pMap[b.priority] || 2);
  });

  const queue = sorted.map((inc, i) =>
    `${i + 1}. **${inc.priority}** — ${inc.incident_type || 'unknown'} — ${inc.location_raw || 'location unknown'}`
  ).join('\n');

  return `## SURGE MODE — Prioritized Queue (Mock)\n\n${queue}\n\n### Recommendations\n- Dispatch ALS units to P1 incidents first\n- BLS units to P2/P3\n- Consider requesting mutual aid if available units < active P1 incidents\n\n*Groq API not configured — basic priority sorting applied.*`;
}
