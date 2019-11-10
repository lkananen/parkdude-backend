import {validateOrReject} from 'class-validator';
import {
  BaseEntity, BeforeInsert, BeforeUpdate, Column, CreateDateColumn,
  Entity, Index, ManyToOne, PrimaryGeneratedColumn
} from 'typeorm';

import {ParkingSpot} from './parking-spot';
import {User} from './user';
import {ReleaseResponse} from '../interfaces/parking-reservation.interfaces';


@Entity()
@Index(['user', 'date'])
@Index('DAY_RELEASE_SPOT_DATE', ['spot', 'date'])
@Index('DAY_RELEASE_DATE_SPOT', ['date', 'spot'], {unique: true})
export class DayRelease extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, {onDelete: 'CASCADE'})
  user: User;

  @ManyToOne(() => ParkingSpot, {onDelete: 'CASCADE'})
  spot: ParkingSpot;

  @Column({type: 'date'})
  date: string;

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
      parkingSpot: spot.toBasicParkingSpotData()
    };
  }
}
