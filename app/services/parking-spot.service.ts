import {ParkingSpot} from '../entities/parking-spot';
import {ParkingSpotBody} from '../interfaces/parking-spot.interfaces';
import {User} from '../entities/user';

export async function fetchParkingSpots(): Promise<ParkingSpot[]> {
  return await ParkingSpot.find();
}

export async function fetchParkingspot(id: string): Promise<ParkingSpot> {
  // TODO: Catch 404s in error handler
  return await ParkingSpot.findOneOrFail({id});
}

export async function createParkingSpot({name, ownerEmail}: ParkingSpotBody): Promise<ParkingSpot> {
  const owner = ownerEmail ? await User.findOne({email: ownerEmail}) : undefined;
  return await ParkingSpot.create({name, owner}).save();
}

export async function updateParkingSpot(id: string, {name, ownerEmail}: ParkingSpotBody) {
  const owner = ownerEmail ? await User.findOne({email: ownerEmail}) : undefined;
  const parkingSpot = await ParkingSpot.findOneOrFail({id});
  parkingSpot.name = name;
  parkingSpot.owner = owner;
  return await parkingSpot.save();
}
