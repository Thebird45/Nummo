import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { resetDb, tokenFor } from "./helpers/testDb.js";

const auth = { Authorization: `Bearer ${tokenFor()}` };

function binaryParser(res, callback) {
  const chunks = [];
  res.on("data", (chunk) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
}

describe("reporte de ventas en PDF", () => {
  beforeAll(resetDb);

  it("descarga el PDF del periodo con nombre por fechas de Colombia", async () => {
    const res = await request(app)
      .get("/api/reportes/pdf")
      .query({ inicio: "2026-10-17T05:00:00.000Z", fin: "2026-10-19T04:59:59.999Z" })
      .set(auth)
      .buffer(true)
      .parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-disposition"]).toContain("reporte-ventas-2026-10-17_2026-10-18.pdf");
    expect(res.body.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("funciona sin ventas en el periodo", async () => {
    const res = await request(app)
      .get("/api/reportes/pdf")
      .query({ inicio: "2020-01-01T05:00:00.000Z", fin: "2020-01-02T04:59:59.999Z" })
      .set(auth)
      .buffer(true)
      .parse(binaryParser);
    expect(res.status).toBe(200);
  });

  it("rechaza fechas invalidas o invertidas", async () => {
    const invalida = await request(app).get("/api/reportes/pdf").query({ inicio: "ayer" }).set(auth);
    expect(invalida.status).toBe(400);

    const invertida = await request(app)
      .get("/api/reportes/pdf")
      .query({ inicio: "2026-10-18T00:00:00Z", fin: "2026-10-17T00:00:00Z" })
      .set(auth);
    expect(invertida.status).toBe(400);
  });

  it("exige token", async () => {
    const res = await request(app).get("/api/reportes/pdf");
    expect(res.status).toBe(401);
  });
});
