import {Quaternion,Vector3} from 'three';
import {chamberFit} from './chamber-fit-data.js';

// Angles in radians; drift in fitted-bay units. One closed path permits a full-cycle clearance proof.
export const path=Object.freeze({period:16,roll:.42,tilt:.075,along:.024,lift:.030});
const chamber=new Quaternion().fromArray(chamberFit.fieldQuaternion);
const depth=new Vector3(0,0,1),up=new Vector3(0,1,0),secondary=new Quaternion();
const frames=new WeakMap();

export function rockMolecule(rig,seconds,index,reduced=false){
  if(reduced){rig.position.set(0,0,0);rig.quaternion.identity();return;}
  // The fitted bays have different neutral orientations. Express the SAME physical
  // chamber axes in each bay's local frame; do not rotate the bay, field or glass.
  let axes=frames.get(rig);
  if(!axes){
    const basis=rig.parent.quaternion.clone().invert().multiply(chamber);
    axes={depth:depth.clone().applyQuaternion(basis),up:up.clone().applyQuaternion(basis),basis};
    frames.set(rig,axes);
  }
  const phase=2*Math.PI*seconds/path.period+.73*index,sway=Math.sin(phase),turn=Math.sin(2*phase);
  rig.quaternion.setFromAxisAngle(axes.depth,path.roll*sway)
    .multiply(secondary.setFromAxisAngle(axes.up,path.tilt*turn));
  rig.position.set(path.along*turn,path.lift*sway,0).applyQuaternion(axes.basis);
}
