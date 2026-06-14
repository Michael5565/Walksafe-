import { ScheduledChecklist } from "../types";

export const isScheduleDueToday = (schedule: ScheduledChecklist): boolean => {
  const now = new Date();
  
  // Set to local midnight for comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const dueDate = new Date(schedule.dueDate);
  // Ensure dueDate is also treated as local midnight
  const targetDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  if (schedule.status !== 'pending') return false;
  
  // Rule 1: Never show Tasks before their initial Due Date
  if (today < targetDate) return false;

  // Rule 2: Frequency logic — only show on the correct day
  if (schedule.frequency === 'daily') {
    // Daily: show every day from dueDate onwards, but only once per day
    return true;
  }
  if (schedule.frequency === 'weekly' && typeof schedule.dayOfWeek === 'number') {
    // Weekly: only show on the scheduled day of week
    return today.getDay() === schedule.dayOfWeek;
  }
  if (schedule.frequency === 'monthly' && typeof schedule.dayOfMonth === 'number') {
    // Monthly: only show on the scheduled day of month
    return today.getDate() === schedule.dayOfMonth;
  }
  
  // For 'once' or no frequency: show on due date and keep showing if overdue
  return today >= targetDate;
};
