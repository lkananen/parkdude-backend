import {validateOrReject} from 'class-validator';
import {
  BaseEntity, BeforeInsert, BeforeUpdate, Column, CreateDateColumn,
  Entity, Index, ManyToOne, PrimaryGeneratedColumn
} from 'typeorm';

import {ParkingSpot} from './parking-spot';
import {ReleaseResponse, ReservationResponse} from '../interfaces/parking-reservation.interfaces';
import {DayReservation} from './day-reservation';


@Entity()
@Index('DAY_RELEASE_SPOT_DATE', ['spot', 'date'])
@Index('DAY_RELEASE_DATE_SPOT', ['date', 'spot'], {unique: true})
export class DayRelease extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  spotId: string;

  @ManyToOne(() => ParkingSpot, {onDelete: 'CASCADE', nullable: false, eager: true})
  spot: ParkingSpot;

  @Column({type: 'date'})
  date: string;

  // Is mapped with query builder
  reservation?: DayReservation;

  @CreateDateColumn()
  created: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async validate() {
    await validateOrReject(this);
  }

  toReleaseResponse(): ReleaseResponse {
    const {date, spot} = this;
    return {
      date,
      parkingSpot: spot.toBasicParkingSpotData(),
      reservation: this.reservation && {
        user: this.reservation.user.toUserData()
      }
    };
  }

  // Used when release is deleted
  toReservationResponse(): ReservationResponse {
    return this.toReleaseResponse();
  }
}
