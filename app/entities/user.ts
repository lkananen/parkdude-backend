import {UserData} from '../interfaces/user.interfaces';
import {ParkingSpot} from './parking-spot';
import {
  BaseEntity, Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany
} from 'typeorm';

export enum UserRole {
    ADMIN = 'admin',
    UNVERIFIED = 'unverified',
    VERIFIED = 'verified',
    SLACK = 'slack'
}

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    email: string;

    @Column({
      nullable: true
    })
    password: string;

    @Column()
    name: string;

    @Column({
      type: 'enum',
      enum: UserRole,
      default: UserRole.UNVERIFIED
    })
    role: UserRole;

    @OneToMany(() => ParkingSpot, (spot) => spot.owner, {
      lazy: true
    })
    ownedParkingSpots: Promise<ParkingSpot[]>

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
}
