import {UserData} from './user.interfaces';
export interface ParkingSpotBody {
  name: string;
  ownerEmail?: string;
}

export interface ParkingSpotData {
  id: string;
  name: string;
  owner?: UserData;
  created: Date;
  updated: Date;
}

export interface GetParkingspotsResponse {
  data: ParkingSpotData[];
}

export interface GetParkingspotResponse {
  data: ParkingSpotData;
}

export interface PostParkingSpotResponse {
  message: string;
  data: ParkingSpotData;
}

export interface PostUpdatedParkingSpotResponse {
  message: string;
  data: ParkingSpotData;
}
