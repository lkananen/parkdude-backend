import {MigrationInterface, QueryRunner} from 'typeorm';

export class ParkingSpot1570894017831 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`CREATE TABLE "parking_spot" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, CONSTRAINT "PK_15bcb502057157741cff7a11ece" PRIMARY KEY ("id"))`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP TABLE "parking_spot"`, undefined);
  }
}
