const nodemailer = require('nodemailer');

let transporter = null;

// Initialisation asynchrone du compte de test Ethereal Email pour le Dev
async function initTransporter() {
    try {
        let testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true pour 465
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        console.log('[SMTP Service] Transporter Ethereal (Mock) initialisé.');
    } catch (err) {
        console.error('[SMTP Service] Erreur lors de la création du compte de test Ethereal:', err);
    }
}

initTransporter();

/**
 * Envoie une alerte e-mail critique à l'administrateur
 * @param {string} subject Le sujet de l'email
 * @param {string} message Le contenu de l'alerte
 */
async function sendCriticalAlert(subject, message) {
    if (!transporter) {
        console.warn('[SMTP Service] Transporter non configuré. Alerte annulée.');
        return;
    }

    try {
        let info = await transporter.sendMail({
            from: '"🤖 CYBER-BRAIN" <noreply@smartgreenhouse.local>',
            to: "admin@smartgreenhouse.local",
            subject: subject,
            text: message,
            html: `<h3 style="color:red;">Alerte Critique</h3><p>${message}</p>`,
        });

        console.log(`[SMTP Service] Alerte Email "CYBER-BRAIN" envoyée avec succès (ID: ${info.messageId})`);
        // Lien magique d'Ethereal pour prévisualiser le faux e-mail envoyé depuis notre environnement Dev
        console.log(`[SMTP Service] 🔗 LIEN DE L'EMAIL (A CLIQUER) : ${nodemailer.getTestMessageUrl(info)}`);
    } catch (err) {
        console.error('[SMTP Service] Échec de l\'envoi de l\'alerte e-mail:', err.message);
    }
}

module.exports = { sendCriticalAlert };
