const express = require('express');
const router = express.Router();
const actuatorController = require('../controllers/actuatorController');

router.get('/', actuatorController.getAllActuators);
router.post('/:key/command', actuatorController.toggleActuator);

module.exports = router;
