// utilityFunctions.ts
import { format, parse } from 'date-fns';
import { ContextData } from '../types/types';

/**
 * Generates a random integer between 0 and n-1.
 * @param n - Upper bound (exclusive) for the random integer.
 * @returns A random integer between 0 and n-1.
 */
export function getRandomInt(n: number): number {
  return Math.floor(Math.random() * n);
}

/**
 * Converts a date string from DD/MM/YYYY format to YYYY-MM-DD format.
 * Optionally includes the time if provided in the input or if requested.
 * 
 * @param dateStr - The date string in DD/MM/YYYY format.
 * @param includeTime - Whether to include the time in the output (default: false).
 * @returns The formatted date as YYYY-MM-DD or YYYY-MM-DD HH:MM.
 * @throws Will throw an error if the input date is invalid.
 */
export function convertDateFormat(dateStr: string, includeTime: boolean = false): string {

  if (!dateStr || dateStr.trim() === '') {
    return ''; // Return undefined when dateStr is not provided or is empty
  }

  // Split the input into date and time components if present
  const [datePart, timePart] = dateStr.split(' '); // Split by space to separate date and time
  // console.log(datePart);
  // Split the date string based on '/' separator (DD/MM/YYYY format)
  const [day, month, year] = datePart.split('/'); // Day comes first for DD/MM/YYYY

  // Ensure the values are valid and not empty
  if (!month || !day || !year) {
    throw new Error('Invalid date format');
  }

  // Manually create the date using UTC to avoid timezone issues
  const formattedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  // Check if the date is valid
  if (isNaN(formattedDate.getTime())) {
    // console.log(formattedDate)
    throw new Error('Invalid date format');
  }

  // Format the date as YYYY-MM-DD
  const formattedDateString = formattedDate.toISOString().split('T')[0];

  // If time is provided, append it, otherwise handle based on includeTime flag
  if (timePart) {
    return `${formattedDateString} ${timePart}`;
  } else if (includeTime) {
    // Append default time (in 'HH:MM AM/PM' format)
    const timeStr = formattedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${formattedDateString} ${timeStr}`;
  }

  // Return the formatted date string (YYYY-MM-DD) if no time is provided
  return formattedDateString;
}





/**
 * Formats the given date as a string in YYYY-MM-DD format.
 * @param date - The date object to format (default: current date).
 * @returns A formatted date string in YYYY-MM-DD format.
 */
export const formatCurrentDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so we add 1
  const day = String(date.getDate()).padStart(2, '0'); // Pad single digits with '0'
  
  return `${year}-${month}-${day}`;
};


/**
 * Check if a given date is today.
 * @param date The date to check.
 * @returns {boolean} True if the date is today, otherwise false.
 */
export const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

/**
 * Adjust the time based on whether the date is today or a future date.
 * If today, return the current time. If in the future, return '05:00'.
 * @param date The date to check.
 * @returns {string} Adjusted time.
 */
export const adjustTime = (date: Date): string => {
    if (isToday(date)) {
        return format(new Date(), 'HH:mm');  // Return current time if today
    } else {
        return '05:00';  // Default to 05:00 AM if future date
    }
};

/**
 * Format the date and time in 'dd/MM/yyyy HH:mm' format.
 * @param date The date to format.
 * @returns {string} Formatted date and time.
 */
export const formatDateTime = (date: Date): string => format(date, 'dd/MM/yyyy HH:mm');
// Helper function to handle time part
export const formatDateWithTime = (date: string, time: string, fallbackTime: string): string => {
  if (!time || time === 'undefined') {
    // If time is missing or undefined, use the fallback time
    time = fallbackTime;
  }
  return `${convertToDDMMYYYY(date)} ${time}`;
};

/**
 * Format the date in 'dd/MM/yyyy' format.
 * @param date The date to format.
 * @returns {string} Formatted date.
 */


export const formatDate = (date: Date): string => format(date, 'dd/MM/yyyy');




// Utility function to convert dates to DD/MM/YYYY format
export const convertToDDMMYYYY = (dateStr: string): string => {
  const isISOFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  let day: string, month: string, year: string;

  if (isISOFormat) {
    // Handle YYYY-MM-DD format
    [year, month, day] = dateStr.split('-');
  } else {
    // Assume it's already in DD/MM/YYYY
    [day, month, year] = dateStr.split('/');
  }

  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
};


export function formatDepartureDate(departureDate: string): string {
  // Assuming the input is in DD/MM/YYYY format
  const parsedDate = parse(departureDate, 'dd/MM/yyyy', new Date());

  // Format the date to 'EEE dd, MMMM yyyy' (e.g., 'Wed 22, October 2024')
  return format(parsedDate, 'EEE dd, MMMM yyyy');
}

export function validateReturnDateTime(contextData: ContextData): boolean {
  const { departure_date_time, return_date_time } = contextData;

  console.log('Departure DateTime:', departure_date_time);
  console.log('Return DateTime:', return_date_time);

  // If either date is an empty string, return true
  if (!departure_date_time || !return_date_time) {
    console.log('One of the date times is empty, returning true.');
    return true;
  }

  // Convert date strings to Date objects for comparison
  const departureDateTime = new Date(departure_date_time.split('/').reverse().join('/') + ' UTC');
  const returnDateTime = new Date(return_date_time.split('/').reverse().join('/') + ' UTC');

  console.log('Parsed Departure DateTime:', departureDateTime);
  console.log('Parsed Return DateTime:', returnDateTime);

  // Compare the dates
  const isReturnAfterOrEqual = returnDateTime >= departureDateTime;
  console.log('Comparison Result (returnDateTime >= departureDateTime):', isReturnAfterOrEqual);

  // Return the result of the comparison
  return isReturnAfterOrEqual;
}

export function formatISODateToYYYYMMDD(isoDateStr: string): string {
  if (!isoDateStr) return '';
  return format(new Date(isoDateStr), 'yyyy-MM-dd');
}
