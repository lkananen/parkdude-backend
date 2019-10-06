import * as request from "supertest";
import { Express } from "express";
import { createApp } from "../app";

describe("Parking spots (e2e)", () => {
  let app: Express;

  beforeEach(async () => {
    app = await createApp();
  });

  describe("GET /api/parking-spots", () => {
    test("Should return parking-spots", async () => {
      // TODO
      await request(app)
        .get("/api/parking-spots")
        .expect(200);
    });
  });
});
