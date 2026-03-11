const Timetable = require('../models/Timetable');
const emailService = require('../services/email.service');
const User = require('../models/User');

exports.getTimetable = async (req, res) => {
  try {
    let timetable = await Timetable.findOne({ user: req.user.id });
    
    if (!timetable) {
      timetable = new Timetable({ user: req.user.id, schedules: [] });
      await timetable.save();
    }

    res.json({
      success: true,
      timetable
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
};

exports.addSchedule = async (req, res) => {
  try {
    const { subject, topic, dayOfWeek, startTime, endTime, priority, notes, isRecurring } = req.body;
    
    let timetable = await Timetable.findOne({ user: req.user.id });
    if (!timetable) {
      timetable = new Timetable({ user: req.user.id, schedules: [] });
    }

    // Check for conflicts
    const conflict = timetable.schedules.find(s => 
      s.dayOfWeek === dayOfWeek &&
      ((startTime >= s.startTime && startTime < s.endTime) ||
       (endTime > s.startTime && endTime <= s.endTime))
    );

    if (conflict) {
      return res.status(400).json({ 
        error: 'Time conflict with existing schedule',
        conflict 
      });
    }

    timetable.schedules.push({
      subject,
      topic,
      dayOfWeek,
      startTime,
      endTime,
      priority: priority || 'medium',
      notes,
      isRecurring: isRecurring !== false
    });

    timetable.lastUpdated = Date.now();
    await timetable.save();

    res.json({
      success: true,
      message: 'Schedule added successfully',
      timetable
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add schedule' });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const updates = req.body;

    const timetable = await Timetable.findOne({ user: req.user.id });
    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }

    const schedule = timetable.schedules.id(scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    Object.keys(updates).forEach(key => {
      schedule[key] = updates[key];
    });

    timetable.lastUpdated = Date.now();
    await timetable.save();

    res.json({
      success: true,
      schedule
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update schedule' });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    const timetable = await Timetable.findOne({ user: req.user.id });
    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }

    timetable.schedules = timetable.schedules.filter(s => s._id.toString() !== scheduleId);
    timetable.lastUpdated = Date.now();
    await timetable.save();

    res.json({
      success: true,
      message: 'Schedule deleted'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
};

exports.toggleReminders = async (req, res) => {
  try {
    const { enabled, reminderTime } = req.body;
    
    const timetable = await Timetable.findOneAndUpdate(
      { user: req.user.id },
      { 
        emailReminders: enabled,
        reminderTime: reminderTime || 30
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      emailReminders: timetable.emailReminders,
      reminderTime: timetable.reminderTime
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reminder settings' });
  }
};

// Cron job function (call this every hour)
exports.sendReminders = async () => {
  try {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const timetables = await Timetable.find({ emailReminders: true }).populate('user');
    
    for (const timetable of timetables) {
      for (const schedule of timetable.schedules) {
        if (schedule.dayOfWeek !== currentDay) continue;
        if (schedule.reminderSent) continue;

        const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
        const reminderMinutes = timetable.reminderTime || 30;
        
        let reminderHour = startHour;
        let reminderMinute = startMinute - reminderMinutes;
        
        if (reminderMinute < 0) {
          reminderHour -= 1;
          reminderMinute += 60;
        }

        if (currentHour === reminderHour && currentMinute === reminderMinute) {
          await emailService.sendTimetableReminder(
            timetable.user.email,
            schedule,
            timetable.user.firstName
          );
          
          schedule.reminderSent = true;
          await timetable.save();
          
          // Reset reminder flag after the time passes
          setTimeout(async () => {
            schedule.reminderSent = false;
            await timetable.save();
          }, 60 * 60 * 1000); // Reset after 1 hour
        }
      }
    }
  } catch (error) {
    console.error('Reminder error:', error);
  }
};
