import {ParkingSpot} from '../entities/parking-spot';
import {getDateRange, toDateString} from '../utils/date';
import {getConnection, EntityManager, Between, OrderByCondition, SaveOptions, TransactionManager} from 'typeorm';
import {DayReservation} from '../entities/day-reservation';
import {DayRelease} from '../entities/day-release';
import {User} from '../entities/user';
import {
  CalendarEntry, Calendar, ParkingSpotDayStatus, QueriedParkingSpotDayStatus
} from '../interfaces/parking-reservation.interfaces';
import {ReservationFailedError, ReleaseFailedError, NotFoundError} from '../utils/errors';
import {sendReservationSlackNotification, sendReleaseSlackNotification} from './slack.service';

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

export async function fetchReservations(startDate: string, endDate: string, user?: User, spot?: ParkingSpot) {
  const where = {
    date: Between(startDate, endDate),
    user,
    spot
  };
  // Even undefined values need to be removed for condition to work
  if (!user) {
    delete where.user;
  }
  if (!spot) {
    delete where.spot;
  }
  const relations = ['spot', 'user'];
  const order: OrderByCondition = {
    date: 'ASC'
  };
  return await DayReservation.find({where, relations, order});
}

export async function fetchReleases(startDate: string, endDate: string, user?: User, spot?: ParkingSpot) {
  return await DayRelease.createQueryBuilder('dayRelease')
    .innerJoinAndSelect('dayRelease.spot', 'spot')
    .leftJoinAndMapOne(
      'dayRelease.reservation',
      DayReservation,
      'dayReservation',
      '(dayReservation.spotId = spot.id AND dayReservation.date = dayRelease.date)'
    )
    .leftJoinAndSelect('dayReservation.user', 'reserver')
    .where('dayRelease.date BETWEEN :startDate AND :endDate', {startDate, endDate})
    .andWhere(user ? 'spot.ownerId = :userId' : ALWAYS_TRUE, {userId: user ? user.id : undefined})
    .andWhere(spot ? 'spot.id = :spotId' : ALWAYS_TRUE, {spotId: spot && spot.id})
    .orderBy('dayRelease.date', 'ASC')
    .getMany();
}

/**
 * Reserves spots and deletes own releases
 * If parkingSpotId is not given, any spots available for dates can be used.
 */
export async function reserveSpots(
  dates: string[], user: User, parkingSpotId?: string
): Promise<(DayReservation|DayRelease)[]> {
  const spot = parkingSpotId ? await ParkingSpot.findOne(parkingSpotId) : null;
  if (parkingSpotId && !spot) {
    throw new NotFoundError('Parking spot does not exist. It might have been removed.');
  }

  const {reservationIds, removedReleases} = await reserveSpotsTransaction(dates, user, parkingSpotId);

  // Reservations must be fetched again to get full information
  const reservationsAndDeletedReleases = [
    ...await DayReservation.findByIds(reservationIds),
    ...removedReleases
  ];
    // Sorting done here because there are two separate queries
    // The number of results is not expected to be large.
  reservationsAndDeletedReleases.sort((a, b) => a.date < b.date ? -1 : 1);
  // Fail silently to not show user the error message
  await sendReservationSlackNotification(reservationsAndDeletedReleases, user).catch(() => {});

  return reservationsAndDeletedReleases;
}

async function reserveSpotsTransaction(dates: string[], user: User, parkingSpotId?: string) {
  return await getConnection().transaction(async (transactionManager) => {
    // Get reservation/release information for each day
    // Note: slightly less safe query generation,
    // but the dates have been validated in controller and it shouldn't be possible to abuse it.
    // This ensures that each date has its own row, even if there are no joins
    // with releases and reservations.
    const spotStatuses: ParkingSpotDayStatus[] = await transactionManager.createQueryBuilder(ParkingSpot, 'spot')
      .leftJoin(`(values (date '${dates.join('\'),(date \'')}'))`, 'spotDate', '1=1')
      .leftJoin(
        DayReservation, 'dayReservation',
        '(dayReservation.spotId = spot.id AND dayReservation.date = "spotDate"."column1")'
      )
      .leftJoin(DayRelease, 'dayRelease',
        '("dayRelease"."spotId" = spot.id AND dayRelease.date = "spotDate"."column1")')
      .leftJoin('spot.owner', 'owner')
      .select(
        'spot.ownerId ownerId, spot.id spotId, ' +
        'dayReservation.id reservationId, ' +
        'dayRelease.id releaseId, "spotDate"."column1" spotDate'
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
        date: toDateString(status.spotdate)
      })));

    const availabilityBySpot = Object.values(getAvailabilityByParkingSpot(spotStatuses));
    // Order days by most available spot
    // Note: This currently does not take overlap into account (e.g. "remaining" dates after most available spot)
    availabilityBySpot.sort(
      ({dates: dates1}, {dates: dates2}) => dates1.length > dates2.length ? -1 : 1
    );

    const availabilityByDate = Object.entries(getAvailabilityByDate(availabilityBySpot));
    if (availabilityByDate.length !== dates.length) {
      const failedDates = dates.filter((date) => !availabilityByDate.find(([availabledate]) => date === availabledate));
      throw new ReservationFailedError('No available spot.', failedDates);
    }

    // If user owns the spot, its release should be removed instead of
    // making a reservation
    const releasesToRemoveCondition = availabilityByDate
      .filter(([date, spotData]) => spotData[0].ownerId === user.id)
      .map(([date, spotData]) => ({
        ownerId: spotData[0].ownerId as string,
        spotId: spotData[0].spotId,
        date
      }));
    const removedReleases = await deleteReleases(releasesToRemoveCondition, transactionManager);

    // Select first spot for each, which is most available due to previous sorting
    const reservations = availabilityByDate
      .filter(([date, spotData]) => spotData[0].ownerId !== user.id)
      .map(([date, spotData]) => DayReservation.create({
        date,
        spotId: spotData[0].spotId,
        user
      }));
    const reservationIds = (await transactionManager.save(reservations)).map((reservation) => reservation.id);

    return {reservationIds, removedReleases};
  });
}

async function deleteReleases(
  releasesToRemoveCondition: { ownerId: string; spotId: string; date: string }[], transactionManager: EntityManager
) {
  if (!releasesToRemoveCondition.length) {
    return [];
  }

  let query = await transactionManager
    .createQueryBuilder(DayRelease, 'release')
    .innerJoinAndSelect('release.spot', 'spot');
  let counter = 0;
  for (const releaseCondition of releasesToRemoveCondition) {
    // All variables must have unique names, which is why counter is required
    query = query.orWhere(
      `(spot.ownerId = :ownerId${counter} and spot.id = :spotId${counter} and release.date = :date${counter})`,
      {
        ['ownerId' + counter]: releaseCondition.ownerId,
        ['spotId' + counter]: releaseCondition.spotId,
        ['date' + counter]: releaseCondition.date,
      }
    );
    counter++;
  }
  const releasesToRemove = await query.getMany();
  await transactionManager.remove(releasesToRemove);
  return releasesToRemove;
}

/**
 * Returns spotId <-> availableDate[] key-value object.
 * Extracts reservations and releases from ParkingSpotDayStatus into one object for each parking spot,
 * and determines which days overall are available for them.
 */
function getAvailabilityByParkingSpot(spotDayStatuses: ParkingSpotDayStatus[]) {
  // parkingSpotId <-> date
  const parkingSpotMap: {[id: string]: {dates: string[]; ownerId: string|null}} = {};
  // Add reservation and release dates for each spot
  for (const spotDayStatus of spotDayStatuses) {
    const {spotId, reservationId, releaseId, date: statusDate, ownerId} = spotDayStatus;
    if (!parkingSpotMap[spotId]) {
      parkingSpotMap[spotId] = {
        dates: [] as string[],
        ownerId
      };
    }
    if (ownerId === null && reservationId === null) {
      // Is not reserved or owned
      parkingSpotMap[spotId].dates.push(statusDate);
    }
    if (ownerId !== null && reservationId === null && releaseId !== null) {
      // Owned by user, but released for the day
      parkingSpotMap[spotId].dates.push(statusDate);
    }
  }
  return Object.entries(parkingSpotMap).map(([spotId, {dates, ownerId}]) => ({spotId, dates, ownerId}));
}

/**
 * Returns date <-> parkingSpotId[] key-value object
 */
function getAvailabilityByDate(
  spotAvailabilityDates: {spotId: string; ownerId: string|null; dates: string[]}[]
) {
  const dateMap: {[date: string]: {spotId: string; ownerId: string|null}[]} = {};
  // Note: Because spots are ordered by number of availabilityDates,
  // dateMap has them ordered by total availability
  for (const {spotId, ownerId, dates} of spotAvailabilityDates) {
    for (const date of dates) {
      if (!dateMap[date]) {
        dateMap[date] = [];
      }
      dateMap[date].push({spotId, ownerId});
    }
  }
  return dateMap;
}

export async function releaseSpots(dates: string[], user: User, parkingSpotId: string) {
  const spot = await ParkingSpot.findOne(parkingSpotId);
  if (!spot) {
    throw new NotFoundError('Parking spot does not exist. It might have been removed.');
  }
  const spotStatuses = await releaseSpotsTransaction(dates, user, parkingSpotId);
  spotStatuses.sort(({date: date1}, {date: date2}) => date1! < date2! ? 1 : -1);

  // Fail silently to not show user the error message
  await sendReleaseSlackNotification(spotStatuses, spot).catch(() => {});
}

async function releaseSpotsTransaction(dates: string[], user: User, parkingSpotId: string) {
  return await getConnection().transaction(async (transactionManager) => {
    const spotStatuses: ParkingSpotDayStatus[] = await transactionManager.createQueryBuilder(ParkingSpot, 'spot')
      .leftJoin(`(values (date '${dates.join('\'),(date \'')}'))`, 'spotDate', '1=1')
      .leftJoin(
        DayReservation, 'dayReservation',
        '(dayReservation.spotId = spot.id AND dayReservation.date = "spotDate"."column1")'
      )
      .leftJoin(DayRelease, 'dayRelease',
        '("dayRelease"."spotId" = spot.id AND dayRelease.date = "spotDate"."column1")')
      .leftJoin('spot.owner', 'owner')
      .select(
        'spot.ownerId ownerId, spot.id spotId, ' +
        'dayReservation.id reservationId, ' +
        'dayReservation.userId reserverId, ' +
        'dayRelease.id releaseId, "spotDate"."column1" spotDate'
      )
      .where('spot.id = :parkingSpotId', {parkingSpotId})
      .andWhere('(dayReservation.id IS NULL OR dayReservation.date IN (:...dates))', {dates})
      .andWhere('(dayRelease.id IS NULL OR dayRelease.date IN (:...dates))', {dates})
      .andWhere('(dayReservation.id IS NULL OR dayRelease.id IS NULL OR dayReservation.date = dayRelease.date)')
      .getRawMany()
      .then((statuses: QueriedParkingSpotDayStatus[]) => statuses.map((status) => ({
        ownerId: status.ownerid,
        spotId: status.spotid,
        reservationId: status.reservationid,
        reserverId: status.reserverid,
        releaseId: status.releaseid,
        date: toDateString(status.spotdate)
      })));
    validateReleases(spotStatuses, user);

    const reservationIdsToCancel = getReservationIdsToCancel(spotStatuses);
    const releasesToAdd = getReleasesToAdd(spotStatuses);

    if (reservationIdsToCancel.length) {
      await transactionManager.getRepository(DayReservation).delete(reservationIdsToCancel);
    }
    if (releasesToAdd.length) {
      await transactionManager.save(releasesToAdd);
    }
    return spotStatuses;
  });
}

function validateReleases(parkingSpotStatuses: ParkingSpotDayStatus[], user: User) {
  const invalidReleases = parkingSpotStatuses.filter((spotStatus) => !canReleaseSpot(spotStatus, user));
  if (invalidReleases.length !== 0) {
    throw new ReleaseFailedError(
      'Parking spot does not have reservation, and cannot be released.',
      invalidReleases.map(({date}) => date!)
    );
  }
}

function canReleaseSpot(parkingSpotStatus: ParkingSpotDayStatus, user: User): boolean {
  if (parkingSpotStatus.reservationId) {
    // Normal reservation by user
    return parkingSpotStatus.reserverId === user.id || user.isAdmin;
  }
  if (parkingSpotStatus.ownerId === user.id || (parkingSpotStatus.ownerId && user.isAdmin)) {
    // Owned spot by user
    return true;
  }
  // Is not reserved/owned by user
  return false;
}

function getReservationIdsToCancel(parkingSpotStatuses: ParkingSpotDayStatus[]): string[] {
  return parkingSpotStatuses
    .filter(({reservationId}) => !!reservationId)
    .map(({reservationId}) => reservationId) as string[];
}

function getReleasesToAdd(parkingSpotStatuses: ParkingSpotDayStatus[]) {
  // Releases only for days without normal reservations, which are instead removed
  return parkingSpotStatuses
    .filter(({reservationId}) => !reservationId)
    .map(({date, spotId}) => DayRelease.create({date: date!, spotId}));
}

/**
 * "Resets" releases for parking spot when new owner is added or removed
 * If new owner:
 * - New owner's old reservations for the spot are removed
 * - Releases without reservations removed
 * - Releases with reservations are kept
 * - Reservations without releases get releases
 * If owner completely removed:
 * - All releases removed
 */
export async function resetReleasesForNewOwner(spot: ParkingSpot, newOwner?: User|null) {
  await getConnection().transaction(async (transactionManager) => {
    const reservationRepository = transactionManager.getRepository(DayReservation);
    const releaseRepository = transactionManager.getRepository(DayRelease);

    // At first: remove all releases
    const oldReleases = await releaseRepository.find({spotId: spot.id});
    await releaseRepository.remove(oldReleases);

    if (!newOwner) {
      // Other changes don't apply if spot does not have owner
      return;
    }

    // All owner reservations should be removed, since all days are "reserved" by default
    const newOwnersOldReservations = await reservationRepository
      .find({
        spotId: spot.id,
        userId: newOwner.id
      });
    await reservationRepository.remove(newOwnersOldReservations);

    // Create releases for all existing reservations
    const remainingReservations = await reservationRepository.find({spotId: spot.id});
    const releases = remainingReservations.map(
      (reservation) => releaseRepository.create({
        date: reservation.date,
        spotId: spot.id
      })
    );
    await releaseRepository.save(releases);
  });
}
