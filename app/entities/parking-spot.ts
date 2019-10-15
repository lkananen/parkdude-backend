import {Length, validateOrReject} from 'class-validator';
import {
  BaseEntity, BeforeInsert, BeforeUpdate, Column,
  CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn
} from 'typeorm';


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
