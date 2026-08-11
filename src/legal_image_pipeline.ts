import { infrai } from "./infrai_storage.ts";
export type MatterIntake = { matterId: string; documentId: string; contentType: string; originalBytes: number; deadline: string };
export type UploadPlan = { originalKey: string; thumbnailKey: string; thumbnailMaxBytes: number; followUp: "send-reminder" | "wait" };
export function planMatterImage(input: MatterIntake, now = new Date("2026-08-10T00:00:00Z")): UploadPlan {
  const due = new Date(input.deadline); const prefix = `matters/${input.matterId}/documents/${input.documentId}`;
  return { originalKey: `${prefix}/original`, thumbnailKey: `${prefix}/thumbnail-1200`, thumbnailMaxBytes: 700_000, followUp: due.getTime() <= now.getTime() ? "send-reminder" : "wait" };
}
export async function createSignedDelivery(bucket: string, plan: UploadPlan): Promise<string> { return (await infrai.storage.object.presign(bucket, plan.thumbnailKey, "get")).url; }
export async function createUploadUrls(bucket: string, plan: UploadPlan, contentType: string): Promise<{ original: string; thumbnail: string }> {
  const [original, thumbnail] = await Promise.all([infrai.storage.object.presign(bucket, plan.originalKey, "put", contentType), infrai.storage.object.presign(bucket, plan.thumbnailKey, "put", "image/jpeg")]);
  return { original: original.url, thumbnail: thumbnail.url };
}
async function main(): Promise<void> {
  const bucket = process.env.INFRAI_BUCKET ?? "legal-matter-images";
  const matter: MatterIntake = { matterId: "matter-1042", documentId: "signed-delivery-7", contentType: "image/jpeg", originalBytes: 1_800_000, deadline: "2026-08-09T17:00:00Z" };
  try {
    await infrai.storage.bucket.create(bucket); const plan = planMatterImage(matter); const upload = await createUploadUrls(bucket, plan, matter.contentType); const deliveryUrl = await createSignedDelivery(bucket, plan); console.log(JSON.stringify({ plan, upload, deliveryUrl }, null, 2));
  } finally {
    await infrai.storage.bucket.delete(bucket);
  }
}
if (process.argv[1]?.endsWith("legal_image_pipeline.ts")) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
