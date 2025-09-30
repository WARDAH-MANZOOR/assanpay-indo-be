import CustomError from "./custom_error.js";
import { toZonedTime } from "date-fns-tz";
const addWeekdays = (date: Date, days: number) => { 
  // Get the current date
  const date2 = new Date(date);

  // Define the Pakistan timezone
  const timeZone = 'Asia/Karachi';

  // Convert the date to the Pakistan timezone
  const zonedDate = toZonedTime(date2, timeZone);
  let addedDays = 0;

  while (addedDays < days) { 
    zonedDate.setDate(zonedDate.getDate() + 1);

    // Skip weekends
    const dayOfWeek = zonedDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  // Set a random time before 4:00 pm (16:00)
  zonedDate.setHours(0, 0, 0, 0);

  return zonedDate;
};

const getDateRange = (range: string, startDate?: string, endDate?: string) => {
  const currentDate = new Date();
  let fromDate: Date, toDate: Date;

  if (range === 'daily') {
    fromDate = new Date(currentDate.setHours(0, 0, 0, 0)); // start of today
    toDate = new Date();
  } else if (range === 'weekly') {
    fromDate = new Date(currentDate.setDate(currentDate.getDate() - 7)); // 7 days ago
    toDate = new Date();
  } else if (range === 'custom' && startDate && endDate) {
    fromDate = new Date(startDate);
    toDate = new Date(endDate);
  } else {
    throw new CustomError('Invalid range or missing date parameters', 400);
  }

  return { fromDate, toDate };
};

export { addWeekdays, getDateRange };