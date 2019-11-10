/* eslint-disable max-len */
import {MigrationInterface, QueryRunner} from 'typeorm';

export class AddSpotId1573390075029 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "day_release" DROP CONSTRAINT "FK_458205e652146ba6d91ff060c3c"`, undefined);
    await queryRunner.query(`DROP INDEX "DAY_RELEASE_DATE_SPOT"`, undefined);
    await queryRunner.query(`DROP INDEX "DAY_RELEASE_SPOT_DATE"`, undefined);
    await queryRunner.query(`ALTER TABLE "day_release" ALTER COLUMN "spotId" SET NOT NULL`, undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX "DAY_RELEASE_DATE_SPOT" ON "day_release" ("date", "spotId") `, undefined);
    await queryRunner.query(`CREATE INDEX "DAY_RELEASE_SPOT_DATE" ON "day_release" ("spotId", "date") `, undefined);
    await queryRunner.query(`ALTER TABLE "day_release" ADD CONSTRAINT "FK_458205e652146ba6d91ff060c3c" FOREIGN KEY ("spotId") REFERENCES "parking_spot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "day_release" DROP CONSTRAINT "FK_458205e652146ba6d91ff060c3c"`, undefined);
    await queryRunner.query(`DROP INDEX "DAY_RELEASE_SPOT_DATE"`, undefined);
    await queryRunner.query(`DROP INDEX "DAY_RELEASE_DATE_SPOT"`, undefined);
    await queryRunner.query(`ALTER TABLE "day_release" ALTER COLUMN "spotId" DROP NOT NULL`, undefined);
    await queryRunner.query(`CREATE INDEX "DAY_RELEASE_SPOT_DATE" ON "day_release" ("date", "spotId") `, undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX "DAY_RELEASE_DATE_SPOT" ON "day_release" ("date", "spotId") `, undefined);
    await queryRunner.query(`ALTER TABLE "day_release" ADD CONSTRAINT "FK_458205e652146ba6d91ff060c3c" FOREIGN KEY ("spotId") REFERENCES "parking_spot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
  }
}
