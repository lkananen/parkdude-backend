import {ParkingSpot} from '../entities/parking-spot';
import {ParkingSpotBody} from '../interfaces/parking-spot.interfaces';
import {User} from '../entities/user';
import {getManager} from 'typeorm';
import {DayReservation} from '../entities/day-reservation';
import {DayRelease} from '../entities/day-release';
import {ConflictError} from '../utils/errors';
import {resetReleasesForNewOwner} from './parking-reservation.service';

export async function fetchParkingSpots(availableOnDates?: string[]): Promise<ParkingSpot[]> {
  if (!availableOnDates) {
    return await ParkingSpot.find({
      order: {
        name: 'ASC'
      }
    });
  }

  // Filter out spots which are not available on all the dates
  return await getManager()
    .createQueryBuilder(ParkingSpot, 'spot')
    // Note: slightly less safe query generation,
    // but the dates have been validated in controller and it shouldn't be possible to abuse it.
    // This ensures that each date has its own row, even if there are no joins
    // with releases and reservations.
    .leftJoin(`(values (date '${availableOnDates.join('\'),(date \'')}'))`, 'spotDate', '1=1')
    .leftJoin(
      DayReservation, 'dayReservation',
      '(dayReservation.spotId = spot.id AND dayReservation.date = "spotDate"."column1")'
    )
    .leftJoin(DayRelease, 'dayRelease', '("dayRelease"."spotId" = spot.id AND dayRelease.date = "spotDate"."column1")')
    .leftJoinAndSelect('spot.owner', 'owner')
    .groupBy('spot.id, owner.id')
    .having(
      'SUM(' +
      'CASE WHEN dayReservation.id IS NULL AND (owner.id IS NULL OR dayRelease.id IS NOT NULL) THEN 0 ELSE 1 END' +
      ') = 0'
    )
    .orderBy('spot.name')
    .getMany();
}

export async function fetchParkingSpot(id: string): Promise<ParkingSpot> {
  return await ParkingSpot.findOneOrFail({id});
}

export async function fetchParkingSpotCount() {
  return await ParkingSpot.count();
}

export async function createParkingSpot({name, ownerEmail}: ParkingSpotBody): Promise<ParkingSpot> {
  const owner = await getOwner(ownerEmail);
  return await ParkingSpot.create({name, owner}).save();
}

export async function updateParkingSpot(id: string, {name, ownerEmail}: ParkingSpotBody) {
  const owner = await getOwner(ownerEmail);
  const parkingSpot = await ParkingSpot.findOneOrFail({id});

  if (owner?.id != parkingSpot.ownerId) {
    await resetReleasesForNewOwner(parkingSpot, owner);
  }

  parkingSpot.name = name;
  parkingSpot.owner = owner;
  return await parkingSpot.save();
}

export async function deleteParkingSpot(id: string) {
  return await ParkingSpot.delete(id);
}

async function getOwner(ownerEmail: string | undefined): Promise<User | null> {
  if (ownerEmail === undefined) {
    return null;
  }
  try {
    return await User.findOneOrFail({email: ownerEmail});
  } catch (err) {
    throw new ConflictError('Could not find user with email: ' + ownerEmail);
  }
}
