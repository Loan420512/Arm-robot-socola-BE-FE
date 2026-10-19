# Design rationale, round 2

## Problem

Round 1 put the sticker on the phone, let the customer resize it, hardcoded the models, and had one screen. Phone and case GLBs used different axes, so the case floated beside the phone. The business needs admins to import models and stickers without code, and a robot needs an exact placement.

## Shape

The case back is a millimetre sheet. A placement is two integers: the sticker center in tenths of a millimetre from the top-left of the back. Each case stores its GLB, a pose (which mesh axis is the back, which is up), its real height, and a 1 mm occupancy mask baked when the admin imports it. The browser and the API run the same integer footprint test against that mask, so the server never parses a GLB and still rejects a sticker over the camera hole.

`canonicalize` in `src/stage/canonical.ts` is the only function that rotates or scales a GLB. The case, the phone backdrop, and the mask bake all use it, so they share one frame. The stage raycasts the case only.

## Synthesis decision

Two candidates were sketched in parallel. Both converged on a back sheet in tenths of a millimetre with a baked mask and a shared integer test.

- Base: BackSheet (Grok). Pose as back axis plus up axis, mask on `PHONE_CASE`, public `GET /api/Catalog`, `GET /api/Orders/by-code/{code}`, status transitions on the server.
- Grafts from the back-space candidate (Claude Sonnet): the decal is projected straight along the back axis, so the picture matches the rectangle the robot applies; choosing a sticker auto-spots it at the nearest legal center; the mask is eroded by 1 mm.
- Rejected: storing a raw mesh hit or UV (meaning changes when an admin re-orients a model, and the server could not check it); hand-drawn printable rectangles (a second source of truth beside the mesh); a global fallback auth policy (the anonymous kiosk endpoints are listed explicitly instead).

The GPU bake (one orthographic render of normal and depth) replaced the per-cell raycast in both sketches, because 10,000 raycasts against an unindexed mesh took too long in the browser.

## Tradeoffs accepted

- The admin's browser bakes the mask; the server checks only its size. A wrong pose gives a wrong mask, which the admin sees as a red or green overlay before saving.
- Stickers are always upright. There is no rotation column.
- Payment is recorded as Success when the customer confirms. There is no gateway callback.

## Open questions

- Is 30 degrees of tilt and a 1 mm margin right for the applicator head?
- Should stock decrease when an order is completed?
- Should the public lookup require a phone number as well as the order code?
