/* eslint-disable max-len */
import {MigrationInterface, QueryRunner} from 'typeorm';

export class RemoveDayReleaseUser1573387029106 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "day_release" DROP CONSTRAINT "FK_f6fa2d9eaf02b8523ee41a79d85"`, undefined);
    await queryRunner.query(`DROP INDEX "IDX_2f2a3dde80c9fe0b5d03efe864"`, undefined);
    await queryRunner.query(`ALTER TABLE "day_release" DROP COLUMN "userId"`, undefined);
    await queryRunner.query(`ALTER TABLE "day_reservation" DROP CONSTRAINT "FK_9230d051865cf5b044616e27a2b"`, undefined);
    await queryRunner.query(`DROP INDEX "DAY_RESERVATION_DATE_SPOT"`, undefined);
    await queryRunner.query(`DROP INDEX "DAY_RESERVATION_SPOT_DATE"`, undefined);
    await queryRunner.query(`ALTER TABLE "day_reservation" ALTER COLUMN "spotId" SET NOT NULL`, undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX "DAY_RESERVATION_DATE_SPOT" ON "day_reservation" ("date", "spotId") `, undefined);
    await queryRunner.query(`CREATE INDEX "DAY_RESERVATION_SPOT_DATE" ON "day_reservation" ("spotId", "date") `, undefined);
    await queryRunner.query(`ALTER TABLE "day_reservation" ADD CONSTRAINT "FK_9230d051865cf5b044616e27a2b" FOREIGN KEY ("spotId") REFERENCES "parking_spot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "day_reservation" DROP CONSTRAINT "FK_9230d051865cf5b044616e27a2b"`, undefined);
    await queryRunner.query(`DROP INDEX "DAY_RESERVATION_SPOT_DATE"`, undefined);
    await queryRunner.query(`DROP INDEX "DAY_RESERVATION_DATE_SPOT"`, undefined);
    await queryRunner.query(`ALTER TABLE "day_reservation" ALTER COLUMN "spotId" DROP NOT NULL`, undefined);
    await queryRunner.query(`CREATE INDEX "DAY_RESERVATION_SPOT_DATE" ON "day_reservation" ("date", "spotId") `, undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX "DAY_RESERVATION_DATE_SPOT" ON "day_reservation" ("date", "spotId") `, undefined);
    await queryRunner.query(`ALTER TABLE "day_reservation" ADD CONSTRAINT "FK_9230d051865cf5b044616e27a2b" FOREIGN KEY ("spotId") REFERENCES "parking_spot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "day_release" ADD "userId" uuid`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_2f2a3dde80c9fe0b5d03efe864" ON "day_release" ("date", "userId") `, undefined);
    await queryRunner.query(`ALTER TABLE "day_release" ADD CONSTRAINT "FK_f6fa2d9eaf02b8523ee41a79d85" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
  }
}
