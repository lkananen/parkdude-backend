import {UserData, FullUserData} from '../interfaces/user.interfaces';
import {ParkingSpot} from './parking-spot';
import {DayReservation} from './day-reservation';
import {
  BaseEntity, Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany
} from 'typeorm';

export enum UserRole {
    ADMIN = 'admin',
    UNVERIFIED = 'unverified',
    VERIFIED = 'verified'
}

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
      unique: true
    })
    email: string;

    @Column({
      nullable: true,
      select: false
    })
    password?: string;

    @Column()
    name: string;

    @Column({
      type: 'enum',
      enum: UserRole,
      default: UserRole.UNVERIFIED
    })
    role: UserRole;

    @Column({default: false})
    hasPassword: boolean;

    @OneToMany(() => ParkingSpot, (spot) => spot.owner, {
      lazy: true
    })
    ownedParkingSpots: Promise<ParkingSpot[]>

    @OneToMany(() => DayReservation, (dayReservation) => dayReservation.user, {
      lazy: true
    })
    reservations: DayReservation[]

    // Mapped separately
    reservationCount: number;

    @CreateDateColumn()
    created: Date;

    @UpdateDateColumn()
    updated: Date;

    get isAdmin() {
      return this.role === UserRole.ADMIN;
    }

    toUserData(): UserData {
      return {
        id: this.id,
        email: this.email,
        name: this.name,
        role: this.role
      };
    }

    async toFullUserData(): Promise<FullUserData> {
      return {
        id: this.id,
        email: this.email,
        name: this.name,
        role: this.role,
        ownedParkingSpots: (await this.ownedParkingSpots).map((spot) => spot.toBasicParkingSpotData()),
        reservationCount: this.reservationCount
      };
    }
}
