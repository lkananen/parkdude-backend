import {MigrationInterface, QueryRunner} from 'typeorm';

export class ParkingSpot1570897770911 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "parking_spot" ADD "created" TIMESTAMP NOT NULL DEFAULT now()`, undefined);
    await queryRunner.query(`ALTER TABLE "parking_spot" ADD "updated" TIMESTAMP NOT NULL DEFAULT now()`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "parking_spot" DROP COLUMN "updated"`, undefined);
    await queryRunner.query(`ALTER TABLE "parking_spot" DROP COLUMN "created"`, undefined);
  }
}
