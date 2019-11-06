import {Length, validateOrReject} from 'class-validator';
import {
  BaseEntity, BeforeInsert, BeforeUpdate, Column,
  CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, ManyToOne
} from 'typeorm';
import {User} from './user';


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
}
