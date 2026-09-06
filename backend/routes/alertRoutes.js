const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

// Route racine / => getAllAlerts
router.get('/', alertController.getAllAlerts);

module.exports = router;
