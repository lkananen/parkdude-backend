import {ParkingSpot} from '../entities/parking-spot';
import {getDateRange, toDateString} from '../utils/date';
import {getConnection, EntityManager, Between, OrderByCondition, SaveOptions} from 'typeorm';
import {DayReservation} from '../entities/day-reservation';
import {DayRelease} from '../entities/day-release';
import {User} from '../entities/user';
import {
  CalendarEntry, Calendar, ParkingSpotDayStatus, QueriedParkingSpotDayStatus
} from '../interfaces/parking-reservation.interfaces';
import {ReservationFailedError} from '../utils/errors';

// Always true if condition to simplify conditional where queries
const ALWAYS_TRUE = '1=1';

/**
 * Returns reservation calendar for given date range, specialised to the user
 */
export async function fetchCalendar(
  startDate: string, endDate: string, user: User, parkingSpotId?: string
): Promise<CalendarEntry[]> {
  return getConnection().transaction(async (transactionManager) => {
    const calendar = await initialiseCalendar(transactionManager, startDate, endDate, user, parkingSpotId);
    await applyReservationCountsToCalendar(calendar, transactionManager, parkingSpotId);
    await applyReleasesToCalendar(calendar, transactionManager, parkingSpotId);
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
  user: User,
  parkingSpotId?: string
): Promise<Calendar> {
  const dateRange = getDateRange(new Date(startDate), new Date(endDate));

  const unownedParkingSpotCount = await transactionManager
    .createQueryBuilder(ParkingSpot, 'parkingSpot')
    .leftJoin('parkingSpot.owner', 'owner')
    .where('owner.id is null')
    .andWhere(parkingSpotId ? 'parkingSpot.id = :parkingSpotId' : ALWAYS_TRUE, {parkingSpotId})
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
  transactionManager: EntityManager,
  parkingSpotId?: string
) {
  const reservationCounts: {date: string; count: number}[] = await transactionManager
    .createQueryBuilder(DayReservation, 'dayReservation')
    .select('COUNT(*), dayReservation.date')
    .where(':startDate <= dayReservation.date', {startDate})
    .andWhere('dayReservation.date <= :endDate', {endDate})
    .andWhere(parkingSpotId ? 'dayReservation.spotId = :parkingSpotId' : ALWAYS_TRUE, {parkingSpotId})
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
  transactionManager: EntityManager,
  parkingSpotId?: string
) {
  const parkingSpotReleases = await transactionManager
    .createQueryBuilder(DayRelease, 'dayRelease')
    .innerJoinAndSelect('dayRelease.spot', 'spot')
    .where(':startDate <= dayRelease.date', {startDate})
    .andWhere('dayRelease.date <= :endDate', {endDate})
    .andWhere(parkingSpotId ? 'dayRelease.spotId = :parkingSpotId' : ALWAYS_TRUE, {parkingSpotId})
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
    .andWhere(user ? 'spot.ownerId = :userId' : ALWAYS_TRUE, {userId: user ? user.id : undefined})
    .orderBy('dayRelease.date', 'ASC')
    .getMany();
}

export async function reserveSpots(dates: string[], user: User, parkingSpotId?: string): Promise<DayReservation[]> {
  return await getConnection().transaction(async (transactionManager) => {
    // Get reservation/release information for each day there is reservation or release
    // If parking spot has reservationId = null, releaseId = null, and ownerId = null,
    // it is available for all days.
    const spotStatuses: ParkingSpotDayStatus[] = await transactionManager.createQueryBuilder(ParkingSpot, 'spot')
      .leftJoin(DayReservation, 'dayReservation', 'dayReservation.spotId = spot.id')
      .leftJoin(DayRelease, 'dayRelease', '"dayRelease"."spotId" = spot.id')
      .leftJoin('spot.owner', 'owner')
      .select(
        'spot.ownerId ownerId, spot.id spotId, ' +
        'dayReservation.date reservationDate, dayReservation.id reservationId, ' +
        'dayRelease.date releaseDate, dayRelease.id releaseId'
      )
      .where(parkingSpotId ? 'spot.id = :parkingSpotId' : ALWAYS_TRUE, {parkingSpotId})
      .andWhere('(dayReservation.id IS NULL OR dayReservation.date IN (:...dates))', {dates})
      .andWhere('(dayRelease.id IS NULL OR dayRelease.date IN (:...dates))', {dates})
      .andWhere('((dayReservation.id IS NULL OR dayRelease.id IS NULL) OR dayReservation.date = dayRelease.date)')
      .getRawMany()
      .then((statuses: QueriedParkingSpotDayStatus[]) => statuses.map((status) => ({
        ownerId: status.ownerid,
        spotId: status.spotid,
        reservationId: status.reservationid,
        releaseId: status.releaseid,
        date: (status.reservationdate && toDateString(status.reservationdate)) ||
              (status.releasedate && toDateString(status.releasedate))
      })));

    const availabilityBySpot = Object.values(getAvailabilityByParkingSpot(spotStatuses, dates));
    // Order days by most available spot
    // Note: This currently does not take overlap into account (e.g. "remaining" dates after most available spot)
    availabilityBySpot.sort(
      ({availabilityDates: days1}, {availabilityDates: days2}) => days1.length > days2.length ? -1 : 1
    );

    const availabilityByDate = Object.entries(getAvailabilityByDate(availabilityBySpot));
    if (availabilityByDate.length !== dates.length) {
      const failedDates = dates.filter((date) => !availabilityByDate.find(([availabledate]) => date === availabledate));
      throw new ReservationFailedError('No available spot.', failedDates);
    }

    // Select first spot for each, which is most available due to previous sorting
    const reservations = availabilityByDate.map(([date, spotIds]) => DayReservation.create({
      date,
      spotId: spotIds[0],
      user
    }));
    const reservationIds = (await transactionManager.save(reservations)).map((reservation) => reservation.id);
    // Must be fetched again to get full information
    return await transactionManager.getRepository(DayReservation).findByIds(reservationIds, {order: {date: 'ASC'}});
  });
}

/**
 * Returns spotId <-> availableDate[] key-value object.
 * Extracts reservations and releases from ParkingSpotDayStatus into one object for each parking spot,
 * and determines which days overall are available for them.
 */
function getAvailabilityByParkingSpot(spotDayStatuses: ParkingSpotDayStatus[], dates: string[]) {
  // parkingSpotId <-> date
  const parkingSpotMap: {[id: string]: string[]} = {};
  // Add reservation and release dates for each spot
  for (const {spotId, reservationId, releaseId, date: statusDate, ownerId} of spotDayStatuses) {
    if (!parkingSpotMap[spotId]) {
      parkingSpotMap[spotId] = ownerId === null ? [...dates] : [];
    }
    if (ownerId === null && reservationId !== null) {
      // Is reserved, -> remove from available days
      parkingSpotMap[spotId] = parkingSpotMap[spotId].filter((date) => date !== statusDate);
    }
    if (ownerId !== null && reservationId === null && releaseId !== null) {
      // Owned by user, but released for the day
      parkingSpotMap[spotId].push(statusDate!);
    }
  }
  return Object.entries(parkingSpotMap).map(([spotId, availabilityDates]) => ({spotId, availabilityDates}));
}

/**
 * Returns date <-> parkingSpotId[] key-value object
 */
function getAvailabilityByDate(
  spotAvailabilityDates: {spotId: string; availabilityDates: string[]}[]
): {[date: string]: string[]} {
  const dateMap: {[date: string]: string[]} = {};
  // Note: Because spots are ordered by number of availabilityDates,
  // dateMap has them ordered by total availability
  for (const {spotId, availabilityDates} of spotAvailabilityDates) {
    for (const date of availabilityDates) {
      if (!dateMap[date]) {
        dateMap[date] = [];
      }
      dateMap[date].push(spotId);
    }
  }
  return dateMap;
}
