/**
 * Rôle : Lead AI Integration Architect & Principal Prompt Engineer
 * Fichier : backend/routes/copilot.js
 * Objectif : Moteur d'IA Copilot avec "Conscience Spatiale Dynamique"
 *            - Dés-ancrage linguistique des données (injection JSON agnostique pure)
 *            - Contrainte Terminale de Recency Bias pour obéissance absolue au Language Mirroring
 *            - Function Calling (Tools) Gemini : fetch_telemetry_for_greenhouse
 *            - Moteur heuristique local bilingue (Français / Arabe)
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database');

/**
 * 1. DÉS-ANCRAGE DES DONNÉES :
 * Récupère les métriques consolidées sous forme de dictionnaire/JSON brut et agnostique.
 * Zéro phrase pré-construite en français, zéro étiquette textuelle ancrante.
 */
function getLatestTelemetryForGreenhouse(greenhouseId) {
    try {
        const rows = db.prepare(`
            SELECT t.sensor_key, t.value, t.timestamp
            FROM telemetry t
            WHERE t.greenhouse_id = ?
            GROUP BY t.sensor_key
            ORDER BY t.timestamp DESC
        `).all(greenhouseId);

        if (rows.length === 0) {
            const gh = db.prepare('SELECT target_temp, target_humidity FROM greenhouses WHERE id = ?').get(greenhouseId);
            return {
                temp: gh ? gh.target_temp : 24.0,
                humidity: gh ? gh.target_humidity : 65.0,
                photoperiod: 14.0,
                water_l: 38.0
            };
        }

        const metrics = {};
        for (const r of rows) {
            let key = r.sensor_key
                .replace(/^ambient_/, '')
                .replace(/^air_/, '')
                .replace(/_consumption$/, '');
            if (key === 'water') key = 'water_l';
            metrics[key] = typeof r.value === 'number' ? r.value : parseFloat(r.value) || 0;
        }

        if (metrics.temp === undefined) metrics.temp = 24.0;
        if (metrics.humidity === undefined) metrics.humidity = 65.0;
        if (metrics.photoperiod === undefined) metrics.photoperiod = 14.0;
        if (metrics.water_l === undefined) metrics.water_l = 38.0;

        return metrics;
    } catch (err) {
        console.error(`[COPILOT-ERROR] getLatestTelemetryForGreenhouse (${greenhouseId}):`, err.message);
        return { temp: 24.0, humidity: 65.0, photoperiod: 14.0, water_l: 38.0 };
    }
}

/**
 * Déclaration de l'outil (Tool) pour Gemini Function Calling
 * Schéma et descriptions agnostiques
 */
const GEMINI_TOOLS = [
    {
        functionDeclarations: [
            {
                name: 'fetch_telemetry_for_greenhouse',
                description: 'Fetches real-time sensor metrics (temperature, humidity, water consumption, photoperiod) for a specific greenhouse ID.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        greenhouseId: {
                            type: 'STRING',
                            description: 'The unique greenhouse ID to query (e.g. "gh-01", "gh-02", "gh-03").'
                        }
                    },
                    required: ['greenhouseId']
                }
            }
        ]
    }
];

/**
 * POST /api/copilot/chat
 * Point d'entrée principal de l'AI Copilot
 */
router.post('/chat', async (req, res) => {
    try {
        const {
            message,
            messages,
            history,
            activeGreenhouseId,
            activeGreenhouseName,
            availableGreenhouses
        } = req.body;

        const userMessage = (message || (Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1].text : '') || '').trim();

        if (!userMessage) {
            return res.status(400).json({ status: 'error', message: 'Message requis' });
        }

        // 1. Liste complète des serres
        let greenhousesList = Array.isArray(availableGreenhouses) && availableGreenhouses.length > 0
            ? availableGreenhouses
            : db.prepare('SELECT id, name, status, location, crop_type, target_temp, target_humidity FROM greenhouses WHERE user_id = 1').all();

        if (greenhousesList.length === 0) {
            greenhousesList = [
                { id: 'gh-01', name: 'Serre Maraîchère Alpha (NFT)' },
                { id: 'gh-02', name: 'Serre Hydroponique Bêta (Aéroponie)' },
                { id: 'gh-03', name: 'Serre Tropicale Gamma (Vertical)' }
            ];
        }

        // 2. Serre active
        const activeId = activeGreenhouseId || (greenhousesList[0] ? greenhousesList[0].id : 'gh-01');
        const matchedGh = greenhousesList.find(g => g.id === activeId);
        const activeName = activeGreenhouseName || (matchedGh ? matchedGh.name : `Serre #${activeId}`);

        // 3. Récupération des données brutes agnostiques (Dés-ancrage)
        const activeTelemetry = getLatestTelemetryForGreenhouse(activeId);

        const systemData = {
            greenhouse_id: activeId,
            name: activeName,
            crop_type: matchedGh?.crop_type || 'CEA greenhouse crop',
            status: matchedGh?.status || 'healthy',
            metrics: activeTelemetry,
            available_greenhouses: greenhousesList.map(g => ({
                greenhouse_id: g.id,
                name: g.name
            }))
        };

        // 4. Définition des Guardrails et Protocoles de Rejet (Zero-Hallucination & Scope Bounding)
        const domainBounding = `[IDENTITÉ ET PÉRIMÈTRE STRICT - ZERO HALLUCINATION]
1. TON RÔLE : Tu es l'AI Copilot exclusif du système "Smart Agri Greenhouse / CyberCortex ERP". Tu es un expert en ingénierie agronomique, hydroponie, télémétrie IoT et pilotage de serres.
2. PÉRIMÈTRE D'ACTION : Ton domaine de compétence est STRICTEMENT limité aux données de la serre active, aux systèmes biophysiques (température, humidité, pH, EC, photopériode), aux actionneurs (pompes, ventilation, éclairage) et aux sciences agricoles associées.
3. RÈGLE D'OR (ANTI-HALLUCINATION) : Tu ne dois JAMAIS inventer, supposer ou extrapoler des données de capteurs qui ne sont pas explicitement présentes dans le payload JSON fourni. Si une information est manquante, tu dois déclarer que le capteur n'est pas disponible.`;

        const outOfScopeRejection = `[PROTOCOLE DE REJET DES QUESTIONS HORS-SUJET]
Si l'utilisateur pose une question qui ne concerne PAS l'agriculture, la gestion de la serre, les capteurs, l'IoT ou le système CyberCortex (exemples : politique, culture générale, programmation informatique générale, blagues, recettes de cuisine), tu as l'INTERDICTION ABSOLUE d'y répondre.
Dans ce cas, utilise EXACTEMENT la formule de rejet suivante (traduite dans la langue de l'utilisateur) :
- En Français : "En tant qu'IA agronomique du CyberCortex, mon périmètre est strictement limité à l'analyse et à la gestion de votre serre. Je ne peux pas répondre à cette question. Souhaitez-vous consulter l'état de vos cultures ou analyser la télémétrie ?"
- En Arabe : "بصفتي المساعد الذكي الخاص بنظام CyberCortex، يقتصر دوري حصرياً على تحليل وإدارة البيت المحمي الخاص بك. لا يمكنني الإجابة على هذا السؤال. هل ترغب في التحقق من حالة المحاصيل أو تحليل بيانات المستشعرات؟"`;

        // 5. Définition de la Contrainte Terminale (Language Mirroring Strict)
        const terminalConstraint = `[CONTRAINTE ABSOLUE D'OUTPUT]
1. La requête de l'utilisateur est : "${userMessage}".
2. IDENTIFIE la langue exacte de cette requête (ex: Arabe, Français, Anglais).
3. TRADUIS obligatoirement l'intégralité de ton raisonnement, tes étiquettes de données (ex: "Température", "Consommation"), et tes recommandations dans CETTE MÊME LANGUE avant de générer ta réponse finale.
4. Il est strictement interdit de répondre en français si la question est en arabe.`;

        // 6. System Prompt complet avec Guardrails en tête
        const systemPrompt = `${domainBounding}

${outOfScopeRejection}

SYSTEM_DATA: ${JSON.stringify(systemData)}

OPERATIONAL RULES:
1. When the user refers to 'this greenhouse', 'here', or does not specify a greenhouse name, ground your analysis strictly on the active greenhouse: ${activeName} (ID: ${activeId}).
2. When the user asks about another greenhouse from the farm, specify the context and use the fetch_telemetry_for_greenhouse tool to inspect its metrics.
3. When the user asks for a comparison across greenhouses, use the fetch_telemetry_for_greenhouse tool to inspect other units.

${terminalConstraint}`;

        // 7. Paramètres d'Appel Haute Précision (Deterministic Model Parameters)
        const generationConfig = {
            temperature: 0.1,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 2500
        };

        // 8. Appel à l'API Google Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

        if (apiKey && apiKey.trim() !== '') {
            try {
                // Historique conversationnel
                const conversationHistory = Array.isArray(messages) ? messages : (Array.isArray(history) ? history : []);
                const contents = [];

                for (const msg of conversationHistory.slice(-5)) {
                    if (msg.role && (msg.text || msg.content)) {
                        contents.push({
                            role: msg.role === 'user' ? 'user' : 'model',
                            parts: [{ text: msg.text || msg.content }]
                        });
                    }
                }

                // Ajout de la question utilisateur avec la Contrainte Terminale positionnée TOUT À LA FIN
                contents.push({
                    role: 'user',
                    parts: [{
                        text: `${userMessage}\n\n${terminalConstraint}`
                    }]
                });

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

                const requestPayload = {
                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    contents,
                    tools: GEMINI_TOOLS,
                    toolConfig: {
                        functionCallingConfig: {
                            mode: 'AUTO'
                        }
                    },
                    generationConfig
                };

                const initialResponse = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestPayload)
                });

                if (initialResponse.ok) {
                    const initialData = await initialResponse.json();
                    const candidate = initialData.candidates?.[0];
                    const contentParts = candidate?.content?.parts || [];

                    // Détection des appels de fonction
                    const functionCallParts = contentParts.filter(p => p.functionCall);

                    if (functionCallParts.length > 0) {
                        console.log(`[COPILOT-TOOL] Gemini a déclenché ${functionCallParts.length} appel(s) de fonction`);

                        const updatedContents = [
                            ...contents,
                            { role: 'model', parts: contentParts }
                        ];

                        for (const fnPart of functionCallParts) {
                            const callName = fnPart.functionCall.name;
                            const callArgs = fnPart.functionCall.args || {};
                            let requestedGhId = callArgs.greenhouseId;

                            if (!greenhousesList.some(g => g.id === requestedGhId)) {
                                const matched = greenhousesList.find(g =>
                                    g.id.toLowerCase() === String(requestedGhId).toLowerCase() ||
                                    g.name.toLowerCase().includes(String(requestedGhId).toLowerCase())
                                );
                                if (matched) requestedGhId = matched.id;
                            }

                            console.log(`[COPILOT-TOOL] Exécution ${callName} pour serre: ${requestedGhId}`);
                            const targetTelemetry = getLatestTelemetryForGreenhouse(requestedGhId);
                            const targetGh = greenhousesList.find(g => g.id === requestedGhId) || { id: requestedGhId, name: requestedGhId };

                            updatedContents.push({
                                role: 'user',
                                parts: [
                                    {
                                        functionResponse: {
                                            name: callName,
                                            response: {
                                                greenhouse_id: requestedGhId,
                                                greenhouse_name: targetGh.name,
                                                metrics: targetTelemetry
                                            }
                                        }
                                    },
                                    {
                                        text: terminalConstraint
                                    }
                                ]
                            });
                        }

                        // Second tour de génération avec réinjection terminale
                        const followUpResponse = await fetch(geminiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                systemInstruction: { parts: [{ text: systemPrompt }] },
                                contents: updatedContents,
                                tools: GEMINI_TOOLS,
                                generationConfig
                            })
                        });

                        if (followUpResponse.ok) {
                            const followUpData = await followUpResponse.json();
                            const finalParts = followUpData.candidates?.[0]?.content?.parts || [];
                            const replyText = finalParts.map(p => p.text || '').filter(Boolean).join('\n').trim();

                            if (replyText) {
                                return res.json({
                                    status: 'success',
                                    reply: replyText,
                                    source: 'gemini',
                                    model,
                                    toolCallExecuted: true,
                                    activeGreenhouseId: activeId,
                                    activeGreenhouseName: activeName
                                });
                            }
                        } else {
                            const errBody = await followUpResponse.json().catch(() => ({}));
                            console.warn('[COPILOT-WARN] Erreur followUp Gemini:', followUpResponse.status, errBody);
                        }
                    }

                    // Réponse textuelle directe
                    const directText = contentParts.map(p => p.text || '').filter(Boolean).join('\n').trim();
                    if (directText) {
                        return res.json({
                            status: 'success',
                            reply: directText,
                            source: 'gemini',
                            model,
                            activeGreenhouseId: activeId,
                            activeGreenhouseName: activeName
                        });
                    }
                } else {
                    const errBody = await initialResponse.json().catch(() => ({}));
                    console.warn('[COPILOT-WARN] Erreur Gemini API initial:', initialResponse.status, errBody);
                }
            } catch (geminiException) {
                console.error('[COPILOT-ERROR] Exception appel Gemini :', geminiException.message);
            }
        }

        // 7. Moteur Agronomique Local Déterministe Bilingue (Sécurité & Haute Disponibilité)
        console.log(`[COPILOT-LOCAL] Exécution du moteur heuristique bilingue pour '${activeName}' (${activeId})`);
        
        // Détection de la langue de la requête utilisateur
        const isArabic = /[\u0600-\u06FF]/.test(userMessage);

        const normalizeStr = (s) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const normalizeArabic = (s) => (s || '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[\u064B-\u0652]/g, '');
        const normMsg = normalizeStr(userMessage);
        const normArMsg = normalizeArabic(userMessage);

        const isComparisonRequest = isArabic
            ? (normArMsg.includes('مقارن') || normArMsg.includes('ايهم') || normArMsg.includes('احر') || normArMsg.includes('اكثر') || normArMsg.includes('كل') || normArMsg.includes('جميع') || normArMsg.includes('فرق') || normArMsg.includes('حراره'))
            : (normMsg.includes('compar') || normMsg.includes('laquelle') || normMsg.includes('plus chaude') || normMsg.includes('plus chaud') || normMsg.includes('plus humide') || normMsg.includes('toutes les serres') || normMsg.includes('difference'));

        const otherGreenhouses = greenhousesList.filter(g => g.id !== activeId);
        const mentionedOtherGh = otherGreenhouses.find(g =>
            normMsg.includes(normalizeStr(g.id)) ||
            normMsg.includes(normalizeStr(g.name)) ||
            (normalizeStr(g.name).includes('beta') && normMsg.includes('beta')) ||
            (normalizeStr(g.name).includes('gamma') && normMsg.includes('gamma')) ||
            (normalizeStr(g.name).includes('alpha') && normMsg.includes('alpha')) ||
            (isArabic && (userMessage.includes('بيتا') || userMessage.includes('غاما') || userMessage.includes('ألفا')))
        );

        // Formules canoniques de rejet strict
        const OFF_TOPIC_REJECTION_FR = "En tant qu'IA agronomique du CyberCortex, mon périmètre est strictement limité à l'analyse et à la gestion de votre serre. Je ne peux pas répondre à cette question. Souhaitez-vous consulter l'état de vos cultures ou analyser la télémétrie ?";
        const OFF_TOPIC_REJECTION_AR = "بصفتي المساعد الذكي الخاص بنظام CyberCortex، يقتصر دوري حصرياً على تحليل وإدارة البيت المحمي الخاص بك. لا يمكنني الإجابة على هذا السؤال. هل ترغب في التحقق من حالة المحاصيل أو تحليل بيانات المستشعرات؟";

        // Garde-fou heuristique hors-sujet (Zero Scope Leakage)
        const AGRI_KEYWORDS_FR = [
            'serre', 'greenhouse', 'temp', 'humid', 'eau', 'water', 'arros', 'irrig', 'ph', 'ec', 'lumi', 'light',
            'photo', 'pompe', 'pump', 'ventilat', 'cultur', 'plante', 'tomat', 'capteur', 'sensor', 'metrique',
            'statut', 'alert', 'iot', 'cyber', 'cortex', 'alpha', 'beta', 'gamma', 'compar', 'nft', 'climat',
            'racine', 'substrat', 'aerat', 'chaleur', 'froid', 'vpd', 'pression', 'actionneur', 'actuator',
            'etat', 'bonjour', 'salut', 'aide', 'help', 'menu', 'bilan', 'synthese', 'rapport', 'diagnost'
        ];
        const AGRI_KEYWORDS_AR = [
            'دفيئ', 'بيت', 'حرار', 'رطوب', 'ماء', 'ميا', 'ري', 'سقي', 'نبات', 'محصول', 'طماطم', 'مستشعر',
            'حساس', 'تهوي', 'مضخ', 'مقارن', 'بيتا', 'غاما', 'الفا', 'مرحب', 'سلام', 'مساعد', 'زرع',
            'حموض', 'ناقلي', 'ضوء', 'شمس', 'انتاج', 'تغذ', 'محلول', 'وضع', 'تقرير', 'حالة'
        ];

        const isAgriRelated = isArabic
            ? AGRI_KEYWORDS_AR.some(kw => normArMsg.includes(kw))
            : AGRI_KEYWORDS_FR.some(kw => normMsg.includes(kw));

        if (!isAgriRelated && !isComparisonRequest && !mentionedOtherGh) {
            return res.json({
                status: 'success',
                reply: isArabic ? OFF_TOPIC_REJECTION_AR : OFF_TOPIC_REJECTION_FR,
                source: 'guardrail_rejection',
                outOfScope: true,
                activeGreenhouseId: activeId,
                activeGreenhouseName: activeName
            });
        }

        let fallbackReply = '';

        if (isArabic) {
            // === RÉPONSES STRICTEMENT EN ARABE ===
            if (isComparisonRequest) {
                const summaries = greenhousesList.map(g => {
                    const tel = getLatestTelemetryForGreenhouse(g.id);
                    const isCurrent = g.id === activeId;
                    return `* **${g.name}** (المعرف: \`${g.id}\`)${isCurrent ? ' 📍 *(الدفيئة المحددة حالياً)*' : ''} :\n  - درجة الحرارة : **${tel.temp} °C**\n  - الرطوبة النسبية : **${tel.humidity} %**\n  - استهلاك المياه : **${tel.water_l} لتر**`;
                }).join('\n\n');

                fallbackReply = `🔍 **التحليل المقارن لدفيئات المزرعة :**\n\n` +
                    `إليك الوضع المناخي المقارن لجميع دفيئاتك (**${greenhousesList.length} دفيئات**) :\n\n` +
                    `${summaries}\n\n` +
                    `💡 **توصية النظام الذكي :**\n` +
                    `أنت تراقب حالياً **${activeName}**. لتعديل بارامترات أو استهداف دفيئة أخرى، اخترها مباشرة من القائمة المنسدلة في الأعلى.`;
            } else if (mentionedOtherGh) {
                const otherTel = getLatestTelemetryForGreenhouse(mentionedOtherGh.id);
                fallbackReply = `📍 **ملاحظة السياق :** أنت تراقب حالياً واجهة **${activeName}**.\n\n` +
                    `لإدارة **${mentionedOtherGh.name}** (المعرف: \`${mentionedOtherGh.id}\`)، يُرجى تحديدها من القائمة العلوية. إليك بياناتها الحالية:\n` +
                    `- 🌡️ درجة الحرارة : **${otherTel.temp} °C**\n` +
                    `- 💧 رطوبة الهواء : **${otherTel.humidity} %**\n` +
                    `- 🚰 استهلاك المياه : **${otherTel.water_l} لتر**\n` +
                    `- 🛡️ الحالة التشغيلية : **${mentionedOtherGh.status || 'مثالية'}**\n\n` +
                    `💬 *هل ترغب في مقارنة هذه المؤشرات مع دفيئة ${activeName}؟*`;
            } else {
                const isWaterQuery = userMessage.includes('ري') || userMessage.includes('سقي') || userMessage.includes('ماء') || userMessage.includes('ترطيب');
                if (isWaterQuery) {
                    fallbackReply = `💧 **تحسين الري لدفيئة ${activeName}** (المعرف: \`${activeId}\`)\n\n` +
                        `* **استهلاك المياه التراكمي** : **${activeTelemetry.water_l} لتر**\n` +
                        `* **الرطوبة النسبية الحالية** : **${activeTelemetry.humidity} %**\n` +
                        `* **درجة الحرارة المحيطة** : **${activeTelemetry.temp} °C**\n\n` +
                        `🌱 **التوصية الإجرائية** : معدل التبخر معتدل. يُنصح بضبط دورة الري عبر نظام التنقيط لمدة 12 دقيقة كل 3 ساعات للحفاظ على رطوبة مثالية للجذور دون إهدار للمياه.`;
                } else {
                    fallbackReply = `🌱 **التقرير الزراعي المباشر : ${activeName}** (المعرف: \`${activeId}\`)\n\n` +
                        `جميع البيانات الواردة أدناه مستخرجة حصرياً من الدفيئة التي تراقبها حالياً:\n` +
                        `* 🌡️ **درجة الحرارة المحيطة** : **${activeTelemetry.temp} °C**\n` +
                        `* 💧 **الرطوبة النسبية** : **${activeTelemetry.humidity} %**\n` +
                        `* ☀️ **الفترة الضوئية** : **${activeTelemetry.photoperiod} ساعة**\n` +
                        `* 🚰 **استهلاك المياه** : **${activeTelemetry.water_l} لتر**\n\n` +
                        `🛡️ **تشخيص Cyber-Brain** : البيئة الزراعية مستقرة ومضبوطة. يمكنك ضبط المعايير أو تشغيل التوأم الرقمي ثلاثي الأبعاد لمراقبة التدفقات.`;
                }
            }
        } else {
            // === RÉPONSES EN FRANÇAIS ===
            if (isComparisonRequest) {
                const allTelemetrySummaries = greenhousesList.map(g => {
                    const tel = getLatestTelemetryForGreenhouse(g.id);
                    const isCurrent = g.id === activeId;
                    return `* **${g.name}** (ID: \`${g.id}\`)${isCurrent ? ' 📍 *(Serre actuellement observée)*' : ''} :\n  - Température : **${tel.temp}°C**\n  - Humidité : **${tel.humidity}%**\n  - Eau : **${tel.water_l}L**`;
                }).join('\n\n');

                fallbackReply = `🔍 **Analyse Comparative Multi-Serres de l'Exploitation :**\n\n` +
                    `Voici l'état climatique comparé de vos **${greenhousesList.length} serres** :\n\n` +
                    `${allTelemetrySummaries}\n\n` +
                    `💡 **Recommandation Agronomique :**\n` +
                    `Vous visualisez actuellement l'interface de **${activeName}**. Pour agir sur les paramètres d'une autre serre, sélectionnez-la simplement via le menu déroulant en haut de l'écran.`;
            } else if (mentionedOtherGh) {
                const otherTel = getLatestTelemetryForGreenhouse(mentionedOtherGh.id);
                fallbackReply = `📍 **Note de Contexte :** Vous regardez actuellement l'interface de **${activeName}**.\n\n` +
                    `Pour analyser la **${mentionedOtherGh.name}** (ID: \`${mentionedOtherGh.id}\`), veuillez la sélectionner dans le menu en haut, mais voici ses métriques réelles :\n` +
                    `- 🌡️ Température actuelle : **${otherTel.temp}°C**\n` +
                    `- 💧 Humidité de l'air : **${otherTel.humidity}%**\n` +
                    `- 🚰 Consommation d'eau : **${otherTel.water_l}L**\n` +
                    `- 🛡️ Statut : **${mentionedOtherGh.status || 'OPTIMAL'}**\n\n` +
                    `💬 *Souhaitez-vous que je compare les paramètres de cette serre avec ceux de ${activeName} ?*`;
            } else {
                fallbackReply = `🌱 **Bilan Agronomique : ${activeName}** (ID: \`${activeId}\`)\n\n` +
                    `Toutes les données ci-dessous proviennent exclusivement de la serre que vous observez :\n` +
                    `* 🌡️ **Température ambiante** : **${activeTelemetry.temp} °C**\n` +
                    `* 💧 **Hygrométrie relative** : **${activeTelemetry.humidity} %**\n` +
                    `* ☀️ **Photopériode** : **${activeTelemetry.photoperiod} h**\n` +
                    `* 🚰 **Consommation d'eau** : **${activeTelemetry.water_l} L**\n\n` +
                    `🛡️ **Diagnostic Cyber-Brain** : Paramètres stables et confinés à cette unité. Vous pouvez ajuster les consignes ou explorer le Jumeau 3D.`;
            }
        }

        return res.json({
            status: 'success',
            reply: fallbackReply,
            source: 'cyber-brain-local',
            activeGreenhouseId: activeId,
            activeGreenhouseName: activeName
        });

    } catch (error) {
        console.error('[COPILOT-ERROR] POST /api/copilot/chat :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur interne du copilote : ' + error.message });
    }
});

module.exports = router;
