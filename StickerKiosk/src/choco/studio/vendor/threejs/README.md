# Original Three.js dispenser machine

Source provided by the user: `C:/Users/thong/Downloads/Threejs/src/main.js`.

- Source function: `createDispenserToolhead()`.
- Original function SHA-256 (UTF-8 bytes, original line endings): `d04fc219d0cf7e680aded7d95fa550283c6fa1ecba253e3bff6606626cdd8b5d`.
- Full original main.js SHA-256: `6b4ed2ca095cc9b95ef512204791a9696bbda412801b2f72f17674e63c5fa15a`.
- Original function lines: 355–533 (179 lines).
- Verbatim source snapshot: `createDispenserToolhead.original.txt`.

The original sample creates and uses this procedural dispenser. Its main.js does not import GLTFLoader or load the optional KUMA robot GLB that also exists in the supplied folder.

The runtime adapter in `../../sourceMachine.ts` retains the original geometries, dimensions, materials, mesh hierarchy and group name. Changes are limited to function-local variables, replacing `state.sauceColor` with an input, returning the group instead of adding it to a global scene, and exposing the original fluid color, plunger movement and LED phase controls to the application. No new machine parts, robot arm, joints or connector are introduced.

The application owns placement, visibility, camera framing, playback and resource disposal. The source folder remains unchanged.
