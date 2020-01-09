import {BadRequestError} from './errors';

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

export function getDateRange(startDate: Date, endDate: Date): string[] {
  const dateIterator = new Date(startDate);
  const dateStrings: string[] = [];
  while (dateIterator <= endDate) {
    dateStrings.push(toDateString(dateIterator));
    dateIterator.setDate(dateIterator.getDate()+1);
  }
  return dateStrings;
}

/**
 * Returns ISO formatted date object
 * Note: date.getFullYear/etc. must be used instead of date.getUTCFullYear/etc.
 * because TypeORM has converted dates to "current" timezone
 */
export function toDateString(dateObject: Date) {
  const year = padZero(dateObject.getFullYear());
  const month = padZero(dateObject.getMonth()+1);
  const date = padZero(dateObject.getDate());
  return `${year}-${month}-${date}`;
}

function padZero(number: number) {
  return number < 10 ? '0' + number : number.toString();
}

export function isValidDate(date: Date) {
  return date instanceof Date && !isNaN(date.getTime());
}

export function isValidDateString(date: string) {
  return date.length === 10 && isValidDate(new Date(date));
}

export function validateDateRange(startDate: string, endDate: string, maxRange: number) {
  if (!startDate || !endDate) {
    throw new BadRequestError('startDate and endDate are required.');
  }
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    throw new BadRequestError('Date must be valid.');
  }
  if (startDate > endDate) {
    throw new BadRequestError('Start date must be after end date.');
  }
  const timeDifference = new Date(endDate).getTime() - new Date(startDate).getTime();
  if (timeDifference > maxRange * MILLISECONDS_IN_DAY) {
    throw new BadRequestError(`Date range is too long (over ${maxRange} days).`);
  }
}

export function formatDateRange(startDate: string, endDate: string) {
  return startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

export function formatDate(date: string) {
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
}

/**
 * Used to parse input received from users via Slack commands
 */
export function parseDateInput(dateInput?: string) {
  // Defaults to current date
  let date = new Date();
  if (dateInput) {
    if (dateInput === 'tomorrow') {
      date.setDate(date.getDate()+1);
      return date;
    }
    const [day, month, year] = dateInput.split('.').map((str) => +str);
    // Parse used to verify that date is valid
    date = new Date(Date.parse(`${year || date.getFullYear()}-${month}-${day}`));
  }
  return date;
}
