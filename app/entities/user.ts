import {UserData, FullUserData} from '../interfaces/user.interfaces';
import {ParkingSpot} from './parking-spot';
import {DayReservation} from './day-reservation';
import {
  BaseEntity, Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany, BeforeInsert, BeforeUpdate
} from 'typeorm';
import {Length, IsEmail, validateOrReject} from 'class-validator';

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
    @Length(1, 200, {message: ({value, constraints}) => {
      if (!value) {
        return 'Email is required.';
      }
      return `Email ${value} is too long (${value && value.length} characters). Maximum length is ${constraints[1]}.`;
    }})
    @IsEmail({}, {
      message: 'Email must be valid.'
    })
    email: string;

    @Column({
      nullable: true,
      select: false
    })
    password?: string;

    @Column()
    @Length(1, 200, {message: ({value, constraints}) => {
      if (!value) {
        return 'Name is required.';
      }
      return `Name ${value} is too long (${value && value.length} characters). Maximum length is ${constraints[1]}.`;
    }})
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

    @BeforeInsert()
    @BeforeUpdate()
    async validate() {
      await validateOrReject(this);
    }

    toUserData(): UserData {
      return {
        id: this.id,
        email: this.email,
        name: this.name,
        role: this.role,
        // Users can only login either with Google login or with password.
        // Emails associated with password users are not validated, so there is no way
        // to know 100 % whether user is really owner of the email.
        isEmailValidated: !this.hasPassword
      };
    }

    async toFullUserData(): Promise<FullUserData> {
      return {
        id: this.id,
        email: this.email,
        name: this.name,
        role: this.role,
        ownedParkingSpots: (await this.ownedParkingSpots).map((spot) => spot.toBasicParkingSpotData()),
        reservationCount: this.reservationCount,
        isEmailValidated: !this.hasPassword
      };
    }
}
