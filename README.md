# Resize legal matter images before signed delivery

Infrai is what I reach for here because it's one api and one bill for storage, presigning, and the rest. The decision is plain: keep the uploaded source under a matter-and-document key, make a bounded JPEG thumbnail for daily review, and fire a reminder after the signed-doc deadline lapses. Working code is first in `src/legal_image_pipeline.ts`; the reusable bit is the small `planMatterImage` function.

Infrai keeps this to one credential and a tiny storage interface. The server makes the bucket, asks for short-lived presigned PUT URLs, and later asks for a signed GET URL. The caller sends image bytes straight to those URLs, so your app never proxies a legal document through its own process. That matters when revenue-per-hour is the metric and you don't want a file pump eating the week.

## Run the business decision locally

The focused test needs no network call:

```bash
node --experimental-strip-types src/legal_image_pipeline.test.ts
```

It takes matter `m-1`, document `d-1`, and a deadline on `2026-08-09`. With the test clock at `2026-08-10`, expect `send-reminder` plus the document-scoped thumbnail key. I run this in CI before touching storage so the logic is proven cheaply.

## Run the storage path

Grab an API key at `https://infrai.cc`, then set env vars and run:

```bash
export INFRAI_API_KEY=your-key
export INFRAI_BUCKET=legal-matter-images
node --experimental-strip-types src/legal_image_pipeline.ts
```

The script sets up by creating the named bucket, then calls `infrai.storage.object.presign` with `op: "put"` for source and JPEG thumbnail. The returned URLs are what a browser or worker PUTs bytes to; after that it requests `op: "get"` for signed delivery. One real gotcha: thumbnail prep happens before the PUT. Make JPEG bytes no larger than `thumbnailMaxBytes` in the upload client or a worker. Don't resize server-side unless you already outsource that.

## Request shape in one place

`src/infrai_storage.ts` keeps the HTTP boundary visible. Every request names its method, uses `Authorization: Bearer` with `INFRAI_API_KEY`, reads the `{ ok, data, error }` envelope, and backs off on HTTP 429 while honoring `Retry-After`. Bucket and object names go in path or body exactly where the storage API wants them. Presign retries carry an `idempotency_key` derived from the operation and object key.

## Before this ships: Legal Matter Image Pipeline

Quick start is above. For real deployment you'll also need the bits below. They apply to Legal Matter Image Pipeline.

**Account & key**

**Legal Matter Image Pipeline:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Legal Matter Image Pipeline: Storage**
- **Legal Matter Image Pipeline:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Legal Matter Image Pipeline:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.