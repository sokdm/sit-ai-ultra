// Input validation helpers
exports.validateSignup = (data) => {
  const errors = [];
  
  if (!data.firstName || data.firstName.length < 2) {
    errors.push('First name must be at least 2 characters');
  }
  
  if (!data.lastName || data.lastName.length < 2) {
    errors.push('Last name must be at least 2 characters');
  }
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Valid email is required');
  }
  
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!data.password || !passwordRegex.test(data.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, number and special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

exports.validateQuizAttempt = (data) => {
  const errors = [];
  
  if (!data.attemptId) errors.push('Attempt ID is required');
  if (typeof data.questionIndex !== 'number') errors.push('Question index is required');
  if (typeof data.selectedAnswer !== 'number') errors.push('Selected answer is required');
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

exports.validateSchedule = (data) => {
  const errors = [];
  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  if (!data.subject) errors.push('Subject is required');
  if (!validDays.includes(data.dayOfWeek)) errors.push('Valid day of week is required');
  if (!data.startTime || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.startTime)) {
    errors.push('Valid start time (HH:MM) is required');
  }
  if (!data.endTime || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.endTime)) {
    errors.push('Valid end time (HH:MM) is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
