/* eslint-disable max-len */
import {MigrationInterface, QueryRunner} from 'typeorm';

export class ReservationEntities1572691615415 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`CREATE TABLE "day_release" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "created" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "spotId" uuid, CONSTRAINT "PK_156e5720b9115270ff3b609d451" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX "DAY_RELEASE_DATE_SPOT" ON "day_release" ("date", "spotId") `, undefined);
    await queryRunner.query(`CREATE INDEX "DAY_RELEASE_SPOT_DATE" ON "day_release" ("spotId", "date") `, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_2f2a3dde80c9fe0b5d03efe864" ON "day_release" ("userId", "date") `, undefined);
    await queryRunner.query(`CREATE TABLE "day_reservation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "created" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "spotId" uuid, CONSTRAINT "PK_9ecd3a98cd0c3207ead63219863" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX "DAY_RESERVATION_DATE_SPOT" ON "day_reservation" ("date", "spotId") `, undefined);
    await queryRunner.query(`CREATE INDEX "DAY_RESERVATION_SPOT_DATE" ON "day_reservation" ("spotId", "date") `, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_1c5822ed938334e9e43d86852c" ON "day_reservation" ("userId", "date") `, undefined);
    await queryRunner.query(`ALTER TABLE "parking_spot" ADD "ownerId" uuid`, undefined);
    await queryRunner.query(`ALTER TABLE "parking_spot" ADD CONSTRAINT "FK_37381659f30a6243aad4e849bf5" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "day_release" ADD CONSTRAINT "FK_f6fa2d9eaf02b8523ee41a79d85" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "day_release" ADD CONSTRAINT "FK_458205e652146ba6d91ff060c3c" FOREIGN KEY ("spotId") REFERENCES "parking_spot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "day_reservation" ADD CONSTRAINT "FK_39f921433c5802a824a748b5631" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "day_reservation" ADD CONSTRAINT "FK_9230d051865cf5b044616e27a2b" FOREIGN KEY ("spotId") REFERENCES "parking_spot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "day_reservation" DROP CONSTRAINT "FK_9230d051865cf5b044616e27a2b"`, undefined);
    await queryRunner.query(`ALTER TABLE "day_reservation" DROP CONSTRAINT "FK_39f921433c5802a824a748b5631"`, undefined);
    await queryRunner.query(`ALTER TABLE "day_release" DROP CONSTRAINT "FK_458205e652146ba6d91ff060c3c"`, undefined);
    await queryRunner.query(`ALTER TABLE "day_release" DROP CONSTRAINT "FK_f6fa2d9eaf02b8523ee41a79d85"`, undefined);
    await queryRunner.query(`ALTER TABLE "parking_spot" DROP CONSTRAINT "FK_37381659f30a6243aad4e849bf5"`, undefined);
    await queryRunner.query(`ALTER TABLE "parking_spot" DROP COLUMN "ownerId"`, undefined);
    await queryRunner.query(`DROP INDEX "IDX_1c5822ed938334e9e43d86852c"`, undefined);
    await queryRunner.query(`DROP INDEX "DAY_RESERVATION_SPOT_DATE"`, undefined);
    await queryRunner.query(`DROP INDEX "DAY_RESERVATION_DATE_SPOT"`, undefined);
    await queryRunner.query(`DROP TABLE "day_reservation"`, undefined);
    await queryRunner.query(`DROP INDEX "IDX_2f2a3dde80c9fe0b5d03efe864"`, undefined);
    await queryRunner.query(`DROP INDEX "DAY_RELEASE_SPOT_DATE"`, undefined);
    await queryRunner.query(`DROP INDEX "DAY_RELEASE_DATE_SPOT"`, undefined);
    await queryRunner.query(`DROP TABLE "day_release"`, undefined);
  }
}
