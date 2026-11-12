/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { parse } from 'opentype.js';
import { describe, it, expect } from 'vitest';
import { buildElementStrokes } from './templateLayout';
import type { CatalogElement } from './catalog';
const files=['latin','latin-ext','vietnamese'];
const fonts=files.map(name=>{const data=readFileSync(new URL('../../../node_modules/@fontsource/be-vietnam-pro/files/be-vietnam-pro-'+name+'-400-normal.woff',import.meta.url));return parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));});
const element:CatalogElement={id:1,templateId:1,staffId:1,elementName:'Happy Birthday',positionX:100,positionY:75,scale:1};
describe('database template elements',()=>{
 it('renders literal API text at its X/Y position without attachment files',()=>{const strokes=buildElementStrokes([element],fonts);expect(strokes.length).toBeGreaterThan(10);const points=strokes.flatMap(stroke=>stroke.points);expect(points.length).toBeGreaterThan(100);const xs=points.map(p=>p.x),ys=points.map(p=>p.y);expect((Math.max(...xs)+Math.min(...xs))/2).toBeCloseTo(0);expect((Math.max(...ys)+Math.min(...ys))/2).toBeCloseTo(-.25);expect(points.every(p=>Math.hypot(p.x,p.y)<=.82)).toBe(true);});
 it('uses API element scale and position for actual outline geometry',()=>{const first=buildElementStrokes([{...element,elementName:'Hi',positionY:100}],fonts).flatMap(s=>s.points);const second=buildElementStrokes([{...element,elementName:'Hi',positionX:110,positionY:100,scale:2}],fonts).flatMap(s=>s.points);const width=(points:{x:number}[])=>Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x));expect(width(second)).toBeCloseTo(width(first)*2);expect((Math.max(...second.map(p=>p.x))+Math.min(...second.map(p=>p.x)))/2).toBeCloseTo(.1);});
 it('keeps a truly empty element list empty instead of inventing a shape',()=>expect(buildElementStrokes([],fonts)).toEqual([]));
 it('supports Vietnamese names via bundled font subsets',()=>expect(buildElementStrokes([{...element,elementName:'Mừng vui',positionY:100}],fonts).length).toBeGreaterThan(1));
 it.each([{...element,elementName:''},{...element,positionX:null},{...element,positionY:500},{...element,scale:1000},{...element,elementName:'Happy Birthday',scale:10}])('fails closed on invalid or off-plate layout',value=>expect(()=>buildElementStrokes([value],fonts)).toThrow());
});
