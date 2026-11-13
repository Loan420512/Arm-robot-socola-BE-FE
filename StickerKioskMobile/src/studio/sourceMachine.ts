import * as THREE from 'three';

export type SourceMachinePhase = 'standby' | 'lowering' | 'extruding' | 'travel' | 'lifting';
export type SourceMachine = {
  group: THREE.Group;
  setColor: (color: string) => void;
  setProgress: (progress: number) => void;
  setPhase: (phase: SourceMachinePhase) => void;
};

export const SOURCE_MACHINE_SHA256 = 'd04fc219d0cf7e680aded7d95fa550283c6fa1ecba253e3bff6606626cdd8b5d';
export const SOURCE_MACHINE_RESTING_HEIGHT = 3.0;

/** Original machine from the supplied Threejs/src/main.js; geometry and materials are unchanged. */
export function createSourceMachine(initialColor: string): SourceMachine {
  const RESTING_HEIGHT = SOURCE_MACHINE_RESTING_HEIGHT;
  function createDispenserToolhead() {
    const toolheadGroup = new THREE.Group();
    toolheadGroup.name = 'RoboticDispenserToolhead';

    /* 1. Tapered Metal Dispensing Nozzle (Tip orifice at local Y = 0) */
    const nozzleGeo = new THREE.CylinderGeometry(0.075, 0.02, 0.35, 32);
    nozzleGeo.translate(0, 0.175, 0);

    const surgicalSteelMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.12,
    });

    const nozzleMesh = new THREE.Mesh(nozzleGeo, surgicalSteelMat);
    nozzleMesh.castShadow = true;
    toolheadGroup.add(nozzleMesh);

    const tipRingGeo = new THREE.TorusGeometry(0.024, 0.005, 12, 24);
    tipRingGeo.rotateX(Math.PI / 2);
    const tipRing = new THREE.Mesh(tipRingGeo, surgicalSteelMat);
    tipRing.position.y = 0.005;
    toolheadGroup.add(tipRing);

    const hubGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.1, 6);
    hubGeo.translate(0, 0.40, 0);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.22,
    });
    const hubMesh = new THREE.Mesh(hubGeo, brassMat);
    hubMesh.castShadow = true;
    toolheadGroup.add(hubMesh);

    /* 2. Transparent Syringe / Dispenser Barrel */
    const barrelLength = 1.25;
    const barrelRadius = 0.22;
    const barrelCenterY = 0.45 + barrelLength / 2;

    const glassGeo = new THREE.CylinderGeometry(barrelRadius, barrelRadius, barrelLength, 32, 1, true);
    glassGeo.translate(0, barrelCenterY, 0);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.08,
      metalness: 0.0,
      depthWrite: false,
    });

    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    toolheadGroup.add(glassMesh);

    const bottomCollarGeo = new THREE.CylinderGeometry(barrelRadius + 0.03, barrelRadius + 0.03, 0.06, 32);
    bottomCollarGeo.translate(0, 0.46, 0);
    const topCollarGeo = new THREE.CylinderGeometry(barrelRadius + 0.04, barrelRadius + 0.04, 0.08, 32);
    topCollarGeo.translate(0, 0.45 + barrelLength, 0);

    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.2,
    });
    const bCollar = new THREE.Mesh(bottomCollarGeo, collarMat);
    const tCollar = new THREE.Mesh(topCollarGeo, collarMat);
    bCollar.castShadow = true;
    tCollar.castShadow = true;
    toolheadGroup.add(bCollar);
    toolheadGroup.add(tCollar);

    for (let i = 1; i <= 5; i++) {
      const markY = 0.45 + (barrelLength / 6) * i;
      const markGeo = new THREE.TorusGeometry(barrelRadius + 0.002, 0.003, 8, 32);
      markGeo.rotateX(Math.PI / 2);
      const markMesh = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.8, transparent: true }));
      markMesh.position.y = markY;
      toolheadGroup.add(markMesh);
    }

    /* 3. Inside Sauce Reservoir (Liquid column) */
    const fluidRadius = barrelRadius - 0.02;
    const fluidLength = barrelLength - 0.1;
    const fluidGeo = new THREE.CylinderGeometry(fluidRadius, fluidRadius, fluidLength, 32);
    fluidGeo.translate(0, 0.47 + fluidLength / 2, 0);

    const syringeFluidMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialColor),
      roughness: 0.35,
      metalness: 0.02,
    });

    const syringeFluidMesh = new THREE.Mesh(fluidGeo, syringeFluidMat);
    toolheadGroup.add(syringeFluidMesh);

    /* 4. Moving Plunger */
    const plungerGroup = new THREE.Group();

    const stopperGeo = new THREE.CylinderGeometry(fluidRadius + 0.005, fluidRadius + 0.005, 0.08, 32);
    const stopperMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const stopperMesh = new THREE.Mesh(stopperGeo, stopperMat);
    stopperMesh.position.y = 0.45 + barrelLength - 0.04;
    plungerGroup.add(stopperMesh);

    const rodGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 16);
    rodGeo.translate(0, 0.45 + barrelLength + 0.5, 0);
    const rodMesh = new THREE.Mesh(rodGeo, surgicalSteelMat);
    rodMesh.castShadow = true;
    plungerGroup.add(rodMesh);

    const thumbGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.05, 32);
    thumbGeo.translate(0, 0.45 + barrelLength + 1.05, 0);
    const thumbMesh = new THREE.Mesh(thumbGeo, collarMat);
    thumbMesh.castShadow = true;
    plungerGroup.add(thumbMesh);

    toolheadGroup.add(plungerGroup);

    /* 5. Robotic Mounting Bracket */
    const spineGeo = new THREE.BoxGeometry(0.16, 2.4, 0.22);
    spineGeo.translate(0, 1.5, -0.32);
    const spineMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
    });
    const spineMesh = new THREE.Mesh(spineGeo, spineMat);
    spineMesh.castShadow = true;
    toolheadGroup.add(spineMesh);

    const clampGeo = new THREE.TorusGeometry(barrelRadius + 0.05, 0.05, 12, 32, Math.PI * 1.6);
    clampGeo.rotateX(Math.PI / 2);
    clampGeo.rotateZ(-Math.PI * 0.8);
    const clampMesh = new THREE.Mesh(clampGeo, spineMat);
    clampMesh.position.set(0, 1.1, 0);
    clampMesh.castShadow = true;
    toolheadGroup.add(clampMesh);

    const motorGeo = new THREE.BoxGeometry(0.48, 0.52, 0.48);
    motorGeo.translate(0, 2.45, -0.25);
    const motorMesh = new THREE.Mesh(motorGeo, new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.3 }));
    motorMesh.castShadow = true;
    toolheadGroup.add(motorMesh);

    const ledGeo = new THREE.TorusGeometry(barrelRadius + 0.065, 0.015, 12, 32);
    ledGeo.rotateX(Math.PI / 2);
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    });
    const toolheadLedMesh = new THREE.Mesh(ledGeo, ledMat);
    toolheadLedMesh.position.y = 0.55;
    toolheadGroup.add(toolheadLedMesh);

    const tubeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.45 + barrelLength + 1.05, 0),
      new THREE.Vector3(0.25, 2.7, -0.1),
      new THREE.Vector3(0.4, 3.2, -0.5),
      new THREE.Vector3(0.3, 3.6, -1.2),
    ]);
    const feedTubeGeo = new THREE.TubeGeometry(tubeCurve, 24, 0.025, 8, false);
    const feedTubeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.1 });
    const feedTubeMesh = new THREE.Mesh(feedTubeGeo, feedTubeMat);
    toolheadGroup.add(feedTubeMesh);

    // Initial toolhead placement at resting height Y = 3.0
    toolheadGroup.position.set(0, RESTING_HEIGHT, 0);
    return { group: toolheadGroup, fluidMaterial: syringeFluidMat, plunger: plungerGroup, ledMaterial: ledMat };
  }

  const { group, fluidMaterial, plunger, ledMaterial } = createDispenserToolhead();
  return {
    group,
    setColor(color) {
      fluidMaterial.color.set(color);
      fluidMaterial.needsUpdate = true;
    },
    setProgress(progress) {
      const amount = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
      // The source uses depressPlunger(offsetY), capped at 0.7 world units.
      plunger.position.y = -Math.min(0.7, amount * 0.7);
    },
    setPhase(phase) {
      // Preserve the original updateToolheadStatus LED colors.
      const color = phase === 'standby' ? 0x10b981
        : phase === 'lowering' ? 0x06b6d4
          : phase === 'extruding' ? 0xf59e0b
            : phase === 'travel' ? 0xa855f7 : 0x3b82f6;
      ledMaterial.color.setHex(color);
      ledMaterial.emissive.setHex(color);
      ledMaterial.needsUpdate = true;
    },
  };
}
