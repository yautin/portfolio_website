// The source atoms remain rigid. Only the chamber placement, uniform size and particle volume change.
import {chamberFit} from './chamber-fit-data.js';
export function seatContents(T,bay,cloud,name) {
 const f=chamberFit.models[name];if(!f)throw Error(`Missing optical chamber fit: ${name}`);
 bay.position.fromArray(f.position);bay.quaternion.fromArray(f.quaternion);bay.scale.setScalar(f.scale);
 cloud.quaternion.copy(bay.quaternion).invert().multiply(new T.Quaternion().fromArray(chamberFit.fieldQuaternion));cloud.scale.fromArray(f.fieldScale).divideScalar(f.scale);
}
