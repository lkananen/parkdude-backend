import {ISession} from 'connect-typeorm';
import {Column, Entity, Index, PrimaryColumn} from 'typeorm';
import {Bigint} from 'typeorm-static';

@Entity()
export class Session implements ISession {
  @Index()
  @Column('bigint', {transformer: Bigint})
  expiredAt = Date.now();

  @PrimaryColumn('varchar', {length: 255})
  id = '';

  @Column('text')
  json = '';
}
