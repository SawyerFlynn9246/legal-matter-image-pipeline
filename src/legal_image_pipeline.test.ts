import { planMatterImage } from "./legal_image_pipeline.ts";
const plan = planMatterImage({ matterId: "m-1", documentId: "d-1", contentType: "image/png", originalBytes: 400_000, deadline: "2026-08-09T00:00:00Z" });
if (plan.followUp !== "send-reminder") throw new Error("an overdue signed document needs a reminder");
if (plan.thumbnailKey !== "matters/m-1/documents/d-1/thumbnail-1200") throw new Error("thumbnail key should stay matter-scoped");
console.log("legal image decision: passed");

