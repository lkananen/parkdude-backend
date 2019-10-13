import {Request, Response} from 'express';
import {fetchParkingSpots, createParkingSpot} from '../services/parking-spot.service';

export async function getParkingSpots(req: Request, res: Response) {
  const parkingSpots = await fetchParkingSpots();
  res.status(200).json({
    data: parkingSpots
  });
}

export async function postParkingSpot(req: Request, res: Response) {
  const parkingSpot = await createParkingSpot(req.body);
  res.status(201).json({
    message: 'Parking spot successfully created.',
    data: parkingSpot
  });
}
