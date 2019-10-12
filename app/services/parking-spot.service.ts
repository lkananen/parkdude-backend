import {ParkingSpot} from '../entities/parking-spot';
import {ParkingSpotBody} from '../interfaces/parking-spot.interfaces';

export async function fetchParkingSpots(): Promise<ParkingSpot[]> {
  return ParkingSpot.find();
}

export async function createParkingSpot({name}: ParkingSpotBody): Promise<ParkingSpot> {
  return ParkingSpot.create({name});
}
