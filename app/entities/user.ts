import {
  BaseEntity, Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn
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

    @CreateDateColumn()
    created: Date;

    @UpdateDateColumn()
    updated: Date;
}
