# Supplied studio models

These GLB files were supplied by the user in `C:/Users/thong/Downloads/Threejs/public/models/` and copied without modifying the source files. Runtime placement, scale and plate material are adjusted in the preview. Attribution and license information below comes directly from each GLB's `asset.extras` metadata.

| File | Author / source | License |
| --- | --- | --- |
| `dish.glb` | [Dish by bogdanzloy20280](https://sketchfab.com/3d-models/dish-ffbc1f59a2e94267a286d460f948632c) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `kuma_heavy_robot_r-9000s.glb` | [KUMA Heavy Robot R-9000S by Heinrich / Gevalt](https://sketchfab.com/3d-models/kuma-heavy-robot-r-9000s-8b77bdbe705f4e9697790fd404da49a9) | [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) |

The robot model's license is noncommercial. Commercial publication requires permission from the rights holder or replacement with a model licensed for that use. The preview includes visible model attribution.

The renderer uses the supplied articulated rig with a visual CCD pose adjustment and a mounted preview nozzle. The chocolate extrusion and joint motion illustrate a design and do not validate physical joint limits, kinematics, dimensions, G-code or hardware safety. No robot-control command is sent by this preview.

## Current runtime

The current studio uses only dish.glb from this folder. The optional KUMA GLB is retained as an unused supplied asset; it is no longer loaded or articulated by the renderer. The machine now comes from the original createDispenserToolhead() in the supplied Threejs/src/main.js, preserved in src/choco/studio/sourceMachine.ts with a source snapshot and geometry/material parity tests.
