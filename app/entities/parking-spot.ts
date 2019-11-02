import {Length, validateOrReject} from 'class-validator';
import {
  BaseEntity, BeforeInsert, BeforeUpdate, Column,
  CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, ManyToOne
} from 'typeorm';
import {User} from './user';
import {ParkingSpotData, BasicParkingSpotData} from '../interfaces/parking-spot.interfaces';


@Entity()
export class ParkingSpot extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', {length: 200})
  @Length(1, 200, {message: ({value, constraints}) => {
    if (!value) {
      return 'Name is required.';
    }
    return `Name ${value} is too long (${value && value.length} characters). Maximum length is ${constraints[1]}.`;
  }})
  name: string;

  @ManyToOne(() => User, {nullable: true, onDelete: 'SET NULL'})
  owner?: User;

  @CreateDateColumn()
  created: Date;

  @UpdateDateColumn()
  updated: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async validate() {
    await validateOrReject(this);
  }

  toParkingSpotData(): ParkingSpotData {
    const {id, name, owner, created, updated} = this;
    return {
      id,
      name,
      owner: owner && owner.toUserData(),
      created,
      updated
    };
  }

  toBasicParkingSpotData(): BasicParkingSpotData {
    const {id, name} = this;
    return {
      id,
      name
    };
  }
}
