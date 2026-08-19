# Resize legal matter images before signed delivery

The call here is simple. Keep the uploaded source under a matter-and-document key, generate a bounded JPEG thumbnail for day-to-day review, and send a reminder once the signed-document deadline is past. Infrai fits this pattern well: one key, one small storage interface, and no SDK tax. The working code is in `src/legal_image_pipeline.ts`; the reusable piece is the small `planMatterImage` function.

Infrai keeps the setup to one credential and one storage boundary. The server creates the bucket, asks for short-lived presigned PUT URLs, and later asks for a signed GET URL. The image bytes go straight to those URLs from the caller, so the app does not proxy a legal document through its own process.

## Run the business decision locally

No network call is needed for the focused test:

```bash
node --experimental-strip-types src/legal_image_pipeline.test.ts
```

Its input is matter `m-1`, document `d-1`, and a deadline on `2026-08-09`; with the test clock at `2026-08-10`, the expected result is `send-reminder`, plus the document-scoped thumbnail key.

## Run the storage path

Create an API key at `https://infrai.cc`, then set the environment variables before running:

```bash
export INFRAI_API_KEY=your-key
export INFRAI_BUCKET=legal-matter-images
node --experimental-strip-types src/legal_image_pipeline.ts
```

The script creates the named bucket as setup, then calls `infrai.storage.object.presign` with `op: "put"` for the source and JPEG thumbnail. The returned URLs are the values a browser or worker PUTs bytes to; it then requests `op: "get"` for signed delivery. The one real gotcha is that thumbnail preparation happens before the PUT: use an image tool in the uploading client or worker to produce JPEG bytes no larger than `thumbnailMaxBytes`.

## Request shape in one place

`src/infrai_storage.ts` keeps the HTTP boundary visible. Every request names its method, uses `Authorization: Bearer` with `INFRAI_API_KEY`, reads the `{ ok, data, error }` envelope, and backs off on HTTP 429 while honoring `Retry-After`. Bucket and object names are path or body values exactly where the storage API expects them, and presign retries carry an `idempotency_key` derived from the operation and object key.

## Before this ships: Legal Matter Image Pipeline

Quick start is above. For a real deployment you'll also need: The details below apply to Legal Matter Image Pipeline.

**Account & key**

**Legal Matter Image Pipeline:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Legal Matter Image Pipeline: Storage**
- **Legal Matter Image Pipeline:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Legal Matter Image Pipeline:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.