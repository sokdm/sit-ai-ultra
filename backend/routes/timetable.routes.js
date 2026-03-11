const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetable.controller');
const { protect } = require('../middleware/auth');

router.get('/', protect, timetableController.getTimetable);
router.post('/schedule', protect, timetableController.addSchedule);
router.put('/schedule/:scheduleId', protect, timetableController.updateSchedule);
router.delete('/schedule/:scheduleId', protect, timetableController.deleteSchedule);
router.post('/reminders', protect, timetableController.toggleReminders);

module.exports = router;
