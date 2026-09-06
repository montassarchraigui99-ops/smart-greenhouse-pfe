const db = require('../config/database');

const getAllAlerts = (req, res) => {
    db.all(`SELECT * FROM alerts`, [], (err, rows) => {
        if (err) {
            console.error('[AlertController] Error fetching alerts:', err.message);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.status(200).json(rows);
    });
};

module.exports = {
    getAllAlerts
};
