import { describe, expect, it } from "vitest";
import { uploadImageSchema } from "../admin.schema.js";

describe("uploadImageSchema", () => {
  const base = { fileName: "photo.png", dataBase64: "aGVsbG8=" };

  it("accepts raster image types", () => {
    for (const mimeType of ["image/png", "image/jpeg", "image/webp", "image/gif"]) {
      expect(uploadImageSchema.safeParse({ ...base, mimeType }).success).toBe(true);
    }
  });

  it("rejects SVG uploads, which can carry executable script", () => {
    const result = uploadImageSchema.safeParse({
      ...base,
      fileName: "logo.svg",
      mimeType: "image/svg+xml",
    });
    expect(result.success).toBe(false);
  });
});
