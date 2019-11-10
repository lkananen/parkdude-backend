import {ParkingSpot} from '../entities/parking-spot';
import {getDateRange, toDateString} from '../utils/date';
import {getConnection, EntityManager, Between, OrderByCondition} from 'typeorm';
import {DayReservation} from '../entities/day-reservation';
import {DayRelease} from '../entities/day-release';
import {User} from '../entities/user';
import {CalendarEntry, Calendar} from '../interfaces/parking-reservation.interfaces';

/**
 * Returns reservation calendar for given date range, specialised to the user
 */
export async function fetchCalendar(startDate: string, endDate: string, user: User): Promise<CalendarEntry[]> {
  return getConnection().transaction(async (transactionManager) => {
    const calendar = await initialiseCalendar(transactionManager, startDate, endDate, user);
    await applyReservationCountsToCalendar(calendar, transactionManager);
    await applyReleasesToCalendar(calendar, transactionManager);
    await addOwnReservationsToCalendar(calendar, transactionManager, user);

    return Object.values(calendar.dates);
  });
}

/**
 * Returns calendar with date <-> CalendarEntry pairs that have some initialised data
 */
async function initialiseCalendar(
  transactionManager: EntityManager,
  startDate: string,
  endDate: string,
  user: User
): Promise<Calendar> {
  const dateRange = getDateRange(new Date(startDate), new Date(endDate));

  const unownedParkingSpotCount = await transactionManager
    .createQueryBuilder(ParkingSpot, 'parkingSpot')
    .leftJoin('parkingSpot.owner', 'owner')
    .where('owner.id is null')
    .getCount();

  // Initially: Mark all owned spots as "reserved" for all days
  const ownedParkingSpots = await transactionManager
    .getRepository(ParkingSpot)
    .find({owner: {id: user.id}});

  const parkingSpotData = ownedParkingSpots.map((spot) => spot.toBasicParkingSpotData());
  return dateRange.reduce<Calendar>((calendar, date) => {
    calendar.dates[date] = {
      date,
      spacesReservedByUser: [...parkingSpotData],
      availableSpaces: unownedParkingSpotCount
    };
    return calendar;
  }, {startDate, endDate, dates: {}});
}

/**
 * Removes number of reservations from calendar's availableSpaces for each date
 */
async function applyReservationCountsToCalendar(
  {startDate, endDate, dates}: Calendar,
  transactionManager: EntityManager
) {
  const reservationCounts: {date: string; count: number}[] = await transactionManager
    .createQueryBuilder(DayReservation, 'dayReservation')
    .select('COUNT(*), dayReservation.date')
    .where(':startDate <= dayReservation.date', {startDate})
    .andWhere('dayReservation.date <= :endDate', {endDate})
    .groupBy('dayReservation.date')
    .getRawMany()
    .then((counts) =>
      counts.map(
        ({count, date}) => ({count: +count, date: toDateString(date)})
      )
    );

  for (const {date, count} of reservationCounts) {
    dates[date].availableSpaces -= count;
  }
}

/**
 * Add freed space as available, and potentially remove it from user's reserved spots.
 * This must be called before addOwnReservationsToCalendar.
 */
async function applyReleasesToCalendar(
  {startDate, endDate, dates}: Calendar,
  transactionManager: EntityManager
) {
  const parkingSpotReleases = await transactionManager
    .createQueryBuilder(DayRelease, 'dayRelease')
    .innerJoinAndSelect('dayRelease.spot', 'spot')
    .where(':startDate <= dayRelease.date', {startDate})
    .andWhere('dayRelease.date <= :endDate', {endDate})
    .getMany();

  for (const {date, spot} of parkingSpotReleases) {
    const calendarDate = dates[date];
    calendarDate.availableSpaces++;
    // If user owns the released spot, remove it from reserved spots for the day
    calendarDate.spacesReservedByUser = calendarDate.spacesReservedByUser.filter(
      (availableSpot) => availableSpot.id !== spot.id
    );
  }
}

/**
 * Adds own reservations to calendar.
 * Does not affect availableSpaces counter, since that is already done by different function.
 */
async function addOwnReservationsToCalendar(
  {startDate, endDate, dates}: Calendar,
  transactionManager: EntityManager,
  user: User
) {
  const ownParkingSpotReservations = await transactionManager
    .createQueryBuilder(DayReservation, 'dayReservation')
    .select('dayReservation.date')
    .innerJoin('dayReservation.user', 'user')
    .innerJoinAndSelect('dayReservation.spot', 'spot')
    .where('user.id = :userId', {userId: user.id})
    .andWhere(':startDate <= dayReservation.date', {startDate})
    .andWhere('dayReservation.date <= :endDate', {endDate})
    .getMany();
  for (const {spot, date} of ownParkingSpotReservations) {
    dates[date].spacesReservedByUser.push(spot.toBasicParkingSpotData());
  }
}

export async function fetchReservations(startDate: string, endDate: string, user?: User) {
  const where = {
    date: Between(startDate, endDate),
    user: user
  };
  const relations = ['spot'];
  const order: OrderByCondition = {
    date: 'ASC'
  };
  return await DayReservation.find({where, relations, order});
}

export async function fetchReleases(startDate: string, endDate: string, user?: User) {
  // Note: Not tested when user is not defined
  return await DayRelease.createQueryBuilder('dayRelease')
    .innerJoinAndSelect('dayRelease.spot', 'spot')
    .where('dayRelease.date BETWEEN :startDate AND :endDate', {startDate, endDate})
    .andWhere(user ? 'spot.ownerId = :userId' : '', {userId: user ? user.id : undefined})
    .orderBy('dayRelease.date', 'ASC')
    .getMany();
}
