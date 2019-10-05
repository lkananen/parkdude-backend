import { Request, Response } from "express";
import { fetchParkingSpots } from "../services/parking-spot.service";

export async function getParkingSpots(req: Request, res: Response) {
  const spots = await fetchParkingSpots();
  res.status(200).json({
    data: spots
  });
}
