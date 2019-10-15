import {ParkingSpot} from '../entities/parking-spot';
import {ParkingSpotBody} from '../interfaces/parking-spot.interfaces';

export async function fetchParkingSpots(): Promise<ParkingSpot[]> {
  return await ParkingSpot.find();
}

export async function createParkingSpot({name}: ParkingSpotBody): Promise<ParkingSpot> {
  return await ParkingSpot.create({name}).save();
}
