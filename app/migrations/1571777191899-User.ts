/* eslint-disable max-len */
import {MigrationInterface, QueryRunner} from 'typeorm';

export class User1571777191899 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "usergroup"`, undefined);
    await queryRunner.query(`ALTER TABLE "user" ADD "password" character varying`, undefined);
    await queryRunner.query(`CREATE TYPE "user_role_enum" AS ENUM('admin', 'unverified', 'verified', 'slack')`, undefined);
    await queryRunner.query(`ALTER TABLE "user" ADD "role" "user_role_enum" NOT NULL DEFAULT 'unverified'`, undefined);
    await queryRunner.query(`ALTER TABLE "user" ADD "created" TIMESTAMP NOT NULL DEFAULT now()`, undefined);
    await queryRunner.query(`ALTER TABLE "user" ADD "updated" TIMESTAMP NOT NULL DEFAULT now()`, undefined);
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "PK_cace4a159ff9f2512dd42373760"`, undefined);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "id"`, undefined);
    await queryRunner.query(`ALTER TABLE "user" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`, undefined);
    await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "PK_cace4a159ff9f2512dd42373760"`, undefined);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "id"`, undefined);
    await queryRunner.query(`ALTER TABLE "user" ADD "id" SERIAL NOT NULL`, undefined);
    await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")`, undefined);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "updated"`, undefined);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "created"`, undefined);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "role"`, undefined);
    await queryRunner.query(`DROP TYPE "user_role_enum"`, undefined);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "password"`, undefined);
    await queryRunner.query(`ALTER TABLE "user" ADD "usergroup" character varying NOT NULL`, undefined);
  }
}
