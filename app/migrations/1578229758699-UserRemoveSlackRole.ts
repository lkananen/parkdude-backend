/* eslint-disable max-len */
import {MigrationInterface, QueryRunner} from 'typeorm';

export class UserRemoveSlackRole1578229758699 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TYPE "public"."user_role_enum" RENAME TO "user_role_enum_old"`, undefined);
    await queryRunner.query(`CREATE TYPE "user_role_enum" AS ENUM('admin', 'unverified', 'verified')`, undefined);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`, undefined);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" TYPE "user_role_enum" USING "role"::"text"::"user_role_enum"`, undefined);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'unverified'`, undefined);
    await queryRunner.query(`DROP TYPE "user_role_enum_old"`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`CREATE TYPE "user_role_enum_old" AS ENUM('admin', 'unverified', 'verified', 'slack')`, undefined);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`, undefined);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" TYPE "user_role_enum_old" USING "role"::"text"::"user_role_enum_old"`, undefined);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'unverified'`, undefined);
    await queryRunner.query(`DROP TYPE "user_role_enum"`, undefined);
    await queryRunner.query(`ALTER TYPE "user_role_enum_old" RENAME TO  "user_role_enum"`, undefined);
  }
}
