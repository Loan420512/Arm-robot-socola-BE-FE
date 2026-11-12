/// <reference types="node" />
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createSourceMachine, SOURCE_MACHINE_RESTING_HEIGHT, SOURCE_MACHINE_SHA256 } from './sourceMachine';

const original = readFileSync(new URL('./vendor/threejs/createDispenserToolhead.original.txt', import.meta.url), 'utf8');

function originalMachine(color: string): THREE.Group {
  const context = {
    THREE,
    state: { sauceColor: color },
    scene: new THREE.Scene(),
    RESTING_HEIGHT: 3,
  };
  // The fixture is the exact user-provided function, isolated from the original app's DOM and renderer.
  return runInNewContext(`
    let toolheadGroup = null, syringeFluidMesh = null, syringeFluidMat = null, plungerGroup = null, toolheadLedMesh = null;
    ${original}
    createDispenserToolhead();
    toolheadGroup;
  `, context) as THREE.Group;
}

function fingerprint(node: THREE.Object3D): unknown {
  const mesh = node instanceof THREE.Mesh ? node : null;
  const geometry = mesh?.geometry as (THREE.BufferGeometry & { parameters?: unknown }) | undefined;
  const materials: THREE.Material[] = mesh ? Array.isArray(mesh.material) ? mesh.material : [mesh.material] : [];
  return {
    type: node.type,
    name: node.name,
    position: node.position.toArray(),
    quaternion: node.quaternion.toArray(),
    scale: node.scale.toArray(),
    castShadow: node.castShadow,
    receiveShadow: node.receiveShadow,
    geometry: geometry ? {
      type: geometry.type,
      parameters: geometry.parameters,
      attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([name, attribute]) => [name, {
        itemSize: attribute.itemSize,
        count: attribute.count,
        hash: createHash('sha256').update(new Uint8Array(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength)).digest('hex'),
      }])),
      index: geometry.index ? Array.from(geometry.index.array) : null,
    } : null,
    materials: materials.map(material => Object.fromEntries(Object.entries(material.toJSON()).filter(([key]) => key !== 'uuid' && key !== 'metadata'))),
    children: node.children.map(fingerprint),
  };
}

function dispose(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}

describe('the supplied Three.js machine', () => {
  it('matches the original function geometry, materials, hierarchy and initial placement exactly', () => {
    expect(createHash('sha256').update(original).digest('hex')).toBe(SOURCE_MACHINE_SHA256);
    const reference = originalMachine('#5b2f20');
    const machine = createSourceMachine('#5b2f20');
    expect(fingerprint(machine.group)).toEqual(fingerprint(reference));
    expect(machine.group.name).toBe('RoboticDispenserToolhead');
    expect(machine.group.position.y).toBe(SOURCE_MACHINE_RESTING_HEIGHT);
    dispose(reference);
    dispose(machine.group);
  });

  it('exposes the original fluid, bounded plunger and LED controls without adding machine parts', () => {
    const machine = createSourceMachine('#123456');
    const originalChildCount = machine.group.children.length;
    const plunger = machine.group.children.find(child => child instanceof THREE.Group);
    let fluid: THREE.MeshPhysicalMaterial | undefined;
    let led: THREE.MeshStandardMaterial | undefined;
    machine.group.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      if (node.material instanceof THREE.MeshPhysicalMaterial && node.material.color.getHexString() === '123456') fluid = node.material;
      if (node.material instanceof THREE.MeshStandardMaterial && node.material.emissiveIntensity === 1.8) led = node.material;
    });
    expect(plunger).toBeDefined();
    machine.setColor('#abcdef');
    expect(fluid?.color.getHexString()).toBe('abcdef');
    machine.setProgress(0.5);
    expect(plunger?.position.y).toBe(-0.35);
    machine.setProgress(10);
    expect(plunger?.position.y).toBe(-0.7);
    machine.setProgress(Number.NaN);
    expect(plunger?.position.y).toBe(-0);
    machine.setPhase('extruding');
    expect(led?.color.getHex()).toBe(0xf59e0b);
    expect(led?.emissive.getHex()).toBe(0xf59e0b);
    machine.setPhase('standby');
    expect(led?.color.getHex()).toBe(0x10b981);
    expect(machine.group.children.length).toBe(originalChildCount);
    dispose(machine.group);
  });
});
