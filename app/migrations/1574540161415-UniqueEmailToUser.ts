/* eslint-disable max-len */
import {MigrationInterface, QueryRunner} from 'typeorm';

export class UniqueEmailToUser1574540161415 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email")`, undefined);
    await queryRunner.query(`ALTER TABLE "day_reservation" DROP CONSTRAINT "FK_39f921433c5802a824a748b5631"`, undefined);
    await queryRunner.query(`DROP INDEX "IDX_1c5822ed938334e9e43d86852c"`, undefined);
    await queryRunner.query(`ALTER TABLE "day_reservation" ALTER COLUMN "userId" SET NOT NULL`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_1c5822ed938334e9e43d86852c" ON "day_reservation" ("userId", "date") `, undefined);
    await queryRunner.query(`ALTER TABLE "day_reservation" ADD CONSTRAINT "FK_39f921433c5802a824a748b5631" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "day_reservation" DROP CONSTRAINT "FK_39f921433c5802a824a748b5631"`, undefined);
    await queryRunner.query(`DROP INDEX "IDX_1c5822ed938334e9e43d86852c"`, undefined);
    await queryRunner.query(`ALTER TABLE "day_reservation" ALTER COLUMN "userId" DROP NOT NULL`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_1c5822ed938334e9e43d86852c" ON "day_reservation" ("date", "userId") `, undefined);
    await queryRunner.query(`ALTER TABLE "day_reservation" ADD CONSTRAINT "FK_39f921433c5802a824a748b5631" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22"`, undefined);
  }
}
