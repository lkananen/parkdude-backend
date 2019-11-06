import {validateOrReject} from 'class-validator';
import {
  BaseEntity, BeforeInsert, BeforeUpdate, Column, CreateDateColumn,
  Entity, Index, ManyToOne, PrimaryGeneratedColumn
} from 'typeorm';

import {ParkingSpot} from './parking-spot';
import {User} from './user';


@Entity()
@Index(['user', 'date'])
@Index('DAY_RESERVATION_SPOT_DATE', ['spot', 'date'])
@Index('DAY_RESERVATION_DATE_SPOT', ['date', 'spot'], {unique: true})
export class DayReservation extends BaseEntity {
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
}
