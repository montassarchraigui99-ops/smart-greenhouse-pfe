/**
 * Rôle : Lead Systems Architect & Principal Backend/DevOps Engineer
 * Fichier : services/mailService.js
 * Objectif : Dispatcher automatisé de notifications e-mail (SMTP / Nodemailer) pour CyberCortex ERP.
 *            Alerte en temps réel des incidents critiques, recommandations agronomiques et simulations Cyber-Brain.
 */

const nodemailer = require('nodemailer');
const { db } = require('../database');

// ============================================================================
// 1. CONFIGURATION DU TRANSPORTEUR SMTP MODULAIRE
// ============================================================================

/**
 * Crée ou réutilise le transporteur Nodemailer selon les variables d'environnement.
 * Supporte : Gmail (App Password), SendGrid, SMTP d'entreprise personnalisé, ou Ethereal (fallback dev).
 */
function createSmtpTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // Si les identifiants SMTP réels sont fournis
    if (user && pass) {
        return nodemailer.createTransport({
            host,
            port,
            secure,
            auth: {
                user,
                pass,
            },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 10000,
            tls: {
                rejectUnauthorized: false // Tolère les certificats auto-signés d'environnements Edge/Lab
            }
        });
    }

    // Mode simulation / fallback local si aucun identifiant n'est renseigné
    return null;
}

let activeTransporter = null;
let fallbackEtherealAccount = null;

async function getTransporter() {
    if (activeTransporter) return activeTransporter;

    activeTransporter = createSmtpTransporter();
    if (activeTransporter) {
        console.log(`[SMTP-DISPATCHER] 📬 Transporteur SMTP configuré sur ${process.env.SMTP_HOST || 'smtp.gmail.com'}:${process.env.SMTP_PORT || 587} (Utilisateur: ${process.env.SMTP_USER})`);
        return activeTransporter;
    }

    // Si pas de config SMTP, initialisation d'un compte de test Ethereal pour prévisualisation immédiate
    try {
        if (!fallbackEtherealAccount) {
            fallbackEtherealAccount = await nodemailer.createTestAccount();
        }
        activeTransporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: fallbackEtherealAccount.user,
                pass: fallbackEtherealAccount.pass
            },
            connectionTimeout: 8000
        });
        console.log(`[SMTP-DISPATCHER] 🧪 Mode Démonstration/Ethereal actif (Aucun SMTP_USER configuré dans .env)`);
        return activeTransporter;
    } catch (err) {
        console.warn(`[SMTP-DISPATCHER] Impossible de créer le compte Ethereal de test:`, err.message);
        return null;
    }
}

// ============================================================================
// 2. GÉNÉRATEUR DE TEMPLATE HTML HAUT DE GAMME (DESIGN INDUSTRIEL)
// ============================================================================

/**
 * Génère un e-mail HTML responsive aux couleurs et normes industrielles du CyberCortex ERP.
 * 
 * @param {Object} options
 * @param {string} options.title Titre explicite de l'alerte
 * @param {string} options.severity Sévérité : 'critique' | 'warning' | 'info'
 * @param {string} options.tag Code d'incident (ex: 'ERR-PH-7.6', 'SIMU-HYDR', 'SYS-VENT')
 * @param {string} options.message Description agronomique / technique précise
 * @param {string} [options.timestamp] Horodatage ISO
 * @param {string} [options.recipientName] Nom de l'ingénieur destinataire
 * @param {Array}  [options.actions] Liste des contre-mesures déclenchées
 * @param {string} [options.dashboardUrl] URL du Jumeau Numérique / ERP
 * @returns {string} Code HTML complet
 */
function generateIndustrialAlertEmailTemplate({
    title,
    severity = 'critique',
    tag = 'SYS-ALERT',
    message,
    timestamp = new Date().toISOString(),
    recipientName = 'Ingénieur Exploitant',
    actions = [],
    dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:8081'
}) {
    // Thème chromatique par sévérité
    const themes = {
        critique: {
            bannerColor: '#dc2626',
            bannerBg: '#fef2f2',
            borderColor: '#b91c1c',
            badgeBg: '#ef4444',
            badgeText: '#ffffff',
            badgeLabel: 'URGENCE CRITIQUE',
            icon: '🚨'
        },
        warning: {
            bannerColor: '#d97706',
            bannerBg: '#fffbeb',
            borderColor: '#b45309',
            badgeBg: '#f59e0b',
            badgeText: '#ffffff',
            badgeLabel: 'AVERTISSEMENT AGRONOMIQUE',
            icon: '⚠️'
        },
        info: {
            bannerColor: '#059669',
            bannerBg: '#ecfdf5',
            borderColor: '#047857',
            badgeBg: '#10b981',
            badgeText: '#ffffff',
            badgeLabel: 'RECOMMANDATION SYSTÈME',
            icon: 'ℹ️'
        }
    };

    const currentTheme = themes[severity.toLowerCase()] || themes.critique;

    // Formatage horodatage Local et UTC
    const dateObj = new Date(timestamp);
    const localTimeStr = isNaN(dateObj.getTime())
        ? new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Tunis' })
        : dateObj.toLocaleString('fr-FR', { timeZone: 'Africa/Tunis' });
    const utcTimeStr = isNaN(dateObj.getTime())
        ? new Date().toISOString()
        : dateObj.toISOString();

    // Rendu formaté des contre-mesures
    let actionsHtml = '';
    if (actions && actions.length > 0) {
        actionsHtml = `
            <div style="margin-top: 16px; padding: 12px 16px; background-color: #f1f5f9; border-left: 4px solid #0284c7; border-radius: 4px;">
                <span style="font-size: 11px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">⚡ Actions Cyber-Brain Enclenchées</span>
                <ul style="margin: 8px 0 0 0; padding-left: 18px; color: #1e293b; font-size: 13px; line-height: 1.5;">
                    ${actions.map(a => `<li><b>${escapeHtml(a.actuator_key || a.key || a.name || 'Actionneur')}</b> : <span style="color:#059669; font-weight:600;">${escapeHtml(a.action || 'ACTIVÉ')}</span></li>`).join('')}
                </ul>
            </div>
        `;
    }

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} - CyberCortex ERP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1320; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b1320; padding: 32px 12px;">
        <tr>
            <td align="center">
                <!-- CONTENEUR PRINCIPAL (640px) -->
                <table role="presentation" width="100%" style="max-width: 640px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); border: 1px solid #1e293b;">
                    
                    <!-- 1. EN-TÊTE INDUSTRIEL CYBERCORTEX -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #09121d 0%, #112233 100%); padding: 24px 30px; border-bottom: 3px solid #27ae60;">
                            <table role="presentation" width="100%">
                                <tr>
                                    <td>
                                        <table role="presentation">
                                            <tr>
                                                <td style="background-color: #27ae60; width: 34px; height: 34px; border-radius: 6px; text-align: center; vertical-align: middle; color: #ffffff; font-weight: 900; font-size: 18px;">
                                                    🌿
                                                </td>
                                                <td style="padding-left: 12px;">
                                                    <div style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: 0.8px; text-transform: uppercase;">CYBERCORTEX <span style="color: #2ecc71;">ERP</span></div>
                                                    <div style="font-size: 11px; color: #94a3b8; font-weight: 500; letter-spacing: 0.4px;">Moteur Autonome Cyber-Brain • Télémétrie Edge</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td align="right" style="vertical-align: middle;">
                                        <span style="font-family: Consolas, Monaco, monospace; font-size: 10px; color: #2ecc71; background-color: rgba(39, 174, 96, 0.15); border: 1px solid rgba(46, 204, 113, 0.3); padding: 4px 8px; border-radius: 4px;">
                                            STATUS: ONLINE
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- 2. BANDEAU DE SÉVÉRITÉ ET CODE D'INCIDENT -->
                    <tr>
                        <td style="background-color: ${currentTheme.bannerBg}; border-bottom: 2px solid ${currentTheme.borderColor}; padding: 18px 30px;">
                            <table role="presentation" width="100%">
                                <tr>
                                    <td>
                                        <span style="display: inline-block; background-color: ${currentTheme.badgeBg}; color: ${currentTheme.badgeText}; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; letter-spacing: 0.6px;">
                                            ${currentTheme.icon} ${currentTheme.badgeLabel}
                                        </span>
                                        <span style="display: inline-block; margin-left: 8px; font-family: Consolas, Monaco, 'Courier New', monospace; font-size: 12px; font-weight: 700; color: #0f172a; background-color: #e2e8f0; padding: 4px 10px; border-radius: 4px; border: 1px solid #cbd5e1;">
                                            CODE: ${escapeHtml(tag)}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top: 10px;">
                                        <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                                            ${escapeHtml(title)}
                                        </h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- 3. CORPS DU MESSAGE ET DIAGNOSTIC -->
                    <tr>
                        <td style="padding: 28px 30px 20px 30px;">
                            <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b;">
                                Destinataire : <strong style="color: #1e293b;">${escapeHtml(recipientName)}</strong>
                            </p>

                            <!-- Cadre de l'incident -->
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
                                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 8px;">
                                    📝 Rapport d'Incident & Diagnostic Agronomique
                                </div>
                                <div style="font-size: 14px; color: #1e293b; line-height: 1.6; white-space: pre-line;">
                                    ${escapeHtml(message)}
                                </div>

                                ${actionsHtml}
                            </div>

                            <!-- Métadonnées Techniques -->
                            <table role="presentation" width="100%" style="margin-top: 16px; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px 0 0 6px; width: 50%;">
                                        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b;">Horodatage Local</div>
                                        <div style="font-size: 13px; font-weight: 600; color: #0f172a; font-family: Consolas, monospace; margin-top: 2px;">
                                            ${localTimeStr}
                                        </div>
                                    </td>
                                    <td style="padding: 10px 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: none; border-radius: 0 6px 6px 0; width: 50%;">
                                        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b;">Horodatage Système (UTC)</div>
                                        <div style="font-size: 13px; font-weight: 600; color: #0f172a; font-family: Consolas, monospace; margin-top: 2px;">
                                            ${utcTimeStr}
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <!-- 4. APPEL À L'ACTION (CTA) -->
                            <div style="margin-top: 30px; text-align: center;">
                                <a href="${dashboardUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #27ae60 0%, #1e8449 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4); letter-spacing: 0.3px;">
                                    🎮 Ouvrir le Jumeau Numérique ➔
                                </a>
                                <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                                    Accédez en temps réel au panneau de télémesure et au contrôle des actionneurs
                                </div>
                            </div>
                        </td>
                    </tr>

                    <!-- 5. PIED DE PAGE INDUSTRIEL -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 22px 30px; border-top: 1px solid #1e293b; text-align: center;">
                            <div style="font-size: 12px; font-weight: 600; color: #cbd5e1;">
                                CyberCortex ERP • Nœud Edge Computing Autonome
                            </div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.4;">
                                Ce message est généré automatiquement par le Moteur Cyber-Brain en réaction aux franchissements de seuils physiques.<br>
                                En cas d'intervention physique sur site, veuillez verrouiller les relais en mode manuel via l'ERP.
                            </div>
                            <div style="font-size: 10px; color: #475569; margin-top: 10px; font-family: Consolas, monospace;">
                                CYBERCORTEX-ENGINE-ID: 0xCC-NODE-01 • SÉCURITÉ INDUSTRIELLE ISO-AGRICULTURE
                            </div>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

/**
 * Sécurise les chaînes de caractères pour l'injection HTML
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============================================================================
// 3. SERVICE PRINCIPAL DE DISPATCH D'ALERTES
// ============================================================================

/**
 * Envoie une alerte e-mail formalisée en temps réel (Mode asynchrone non-bloquant).
 * 
 * @param {Object} alert
 * @param {string} alert.title Titre de l'alerte
 * @param {string} alert.message Message descriptif
 * @param {string} alert.severity 'critique' | 'warning' | 'info'
 * @param {string} [alert.tag] Code d'incident (ex: 'ERR-PH-7.6', 'SIMU-HYDR')
 * @param {string} [alert.timestamp] Horodatage
 * @param {Array}  [alert.actions] Commandes d'actionneurs associées
 * @param {string} [alert.recipientEmail] E-mail spécifique (sinon extrait de user_profiles)
 * @param {string} [alert.recipientName] Nom de l'ingénieur
 * @returns {Promise<Object>} Résultat de l'opération
 */
async function sendAlertNotification({
    title,
    message,
    severity = 'critique',
    tag = 'SYS-ALERT',
    timestamp = new Date().toISOString(),
    actions = [],
    recipientEmail = null,
    recipientName = null
}) {
    try {
        // 1. Récupération de l'e-mail destinataire via la BDD si non fourni
        let targetEmail = recipientEmail;
        let targetName = recipientName;

        if (!targetEmail) {
            try {
                const profile = db.prepare('SELECT email, full_name FROM user_profiles ORDER BY id ASC LIMIT 1').get();
                if (profile && profile.email) {
                    targetEmail = profile.email;
                    targetName = targetName || profile.full_name;
                }
            } catch (dbErr) {
                console.warn('[SMTP-DISPATCHER] Avertissement BDD profil:', dbErr.message);
            }
        }

        if (!targetEmail) {
            targetEmail = process.env.DEFAULT_ALERT_EMAIL || 'montassarchraigui99@gmail.com';
        }

        targetName = targetName || 'Ingénieur Agronome Exploitant';

        // 2. Génération de l'e-mail HTML et texte brut
        const htmlContent = generateIndustrialAlertEmailTemplate({
            title,
            severity,
            tag,
            message,
            timestamp,
            recipientName: targetName,
            actions,
            dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:8081'
        });

        const textContent = `[CYBERCORTEX ERP - ALERTE ${severity.toUpperCase()}]\nCode: ${tag}\nTitre: ${title}\nDate: ${timestamp}\n\nDescription:\n${message}\n\nAccédez au Jumeau Numérique: ${process.env.DASHBOARD_URL || 'http://localhost:8081'}`;

        const transporter = await getTransporter();

        if (!transporter) {
            console.log(`[SMTP-DISPATCHER] ℹ️ Transporteur SMTP inactif. Dispatch simulé pour [${targetEmail}] : "${title}" (${tag})`);
            return {
                status: 'simulated',
                recipient: targetEmail,
                tag,
                title,
                message: 'E-mail tracé en mode local (SMTP non configuré)'
            };
        }

        let senderAddress = process.env.SMTP_FROM || process.env.SMTP_USER || '"CyberCortex ERP" <alerts@cybercortex.local>';
        // Si le transporteur de test Ethereal est utilisé (sans SMTP_USER réel), utiliser l'adresse du compte Ethereal
        if (fallbackEtherealAccount && (!process.env.SMTP_USER || !process.env.SMTP_PASS)) {
            senderAddress = `"CyberCortex ERP" <${fallbackEtherealAccount.user}>`;
        }

        const mailOptions = {
            from: senderAddress,
            to: targetEmail,
            subject: `[${tag}] ${severity === 'critique' ? '🚨 CRITIQUE' : '⚠️ AVERTISSEMENT'} : ${title}`,
            text: textContent,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[SMTP-DISPATCHER] ✅ Alerte e-mail expédiée avec succès à [${targetEmail}] (ID: ${info.messageId}) - Tag: ${tag}`);

        // Si Ethereal Email (mode de test de développement), loguer le lien magique de prévisualisation
        const etherealPreviewUrl = nodemailer.getTestMessageUrl(info);
        if (etherealPreviewUrl) {
            console.log(`[SMTP-DISPATCHER] 🔗 Prévisualisation Ethereal : ${etherealPreviewUrl}`);
        }

        return {
            status: 'success',
            messageId: info.messageId,
            recipient: targetEmail,
            previewUrl: etherealPreviewUrl || null
        };

    } catch (error) {
        console.error(`[SMTP-DISPATCHER] ⚠️ Erreur non-bloquante lors de l'envoi de l'e-mail :`, error.message);
        return {
            status: 'error',
            error: error.message
        };
    }
}

/**
 * Dispatcher résilient non-bloquant (fire-and-forget).
 * Garantit que la boucle d'ingestion MQTT ou la réponse HTTP de simulation ne sera JAMAIS ralentie ni bloquée.
 */
function dispatchAlertMailSafely(alertData) {
    // Exécution hors du flux synchrone principal
    setImmediate(() => {
        sendAlertNotification(alertData).catch(err => {
            console.warn('[SMTP-DISPATCHER-SILENT-FAIL]', err.message);
        });
    });
}

/**
 * E-mail de test de la passerelle SMTP (déclenché depuis la route API ou l'Espace Scientifique).
 */
async function sendTestNotification(toEmail) {
    const testData = {
        title: "Test Opérationnel de la Passerelle SMTP CyberCortex",
        severity: "info",
        tag: "SYS-TEST-01",
        message: "Ce message confirme la configuration optimale du dispatcher d'alertes e-mail. Le Moteur Cyber-Brain est opérationnel et prêt à transmettre les alertes de stress agronomique et les situations d'urgence.",
        timestamp: new Date().toISOString(),
        recipientEmail: toEmail,
        actions: [
            { actuator_key: 'smtp_dispatcher', action: 'ONLINE' },
            { actuator_key: 'cyber_brain_inference', action: 'ACTIVE' }
        ]
    };

    return await sendAlertNotification(testData);
}

module.exports = {
    sendAlertNotification,
    dispatchAlertMailSafely,
    sendTestNotification,
    generateIndustrialAlertEmailTemplate,
    getTransporter
};
