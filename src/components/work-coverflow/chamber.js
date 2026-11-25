import * as T from 'three';

const colours={C:0xa5bbca,N:0x3489dc,O:0xda5965,CL:0x83be66};
const radii={C:.36,N:.38,O:.39,CL:.46};
const V=(x,y,z)=>new T.Vector3(x,y,z);

export function molecule(data,sphere,rod){
 const group=new T.Group(),atomMat=new T.MeshStandardMaterial({roughness:.27,metalness:.19}),bondMat=new T.MeshStandardMaterial({color:0x9daeba,roughness:.31,metalness:.23});
 const balls=new T.InstancedMesh(sphere,atomMat,data.atoms.length),sticks=new T.InstancedMesh(rod,bondMat,data.bonds.length);
 const dummy=new T.Object3D(),points=data.atoms.map(a=>V(...a.slice(2))),up=V(0,1,0),d=V();
 data.atoms.forEach(([,el],i)=>{dummy.position.copy(points[i]);dummy.scale.setScalar(radii[el]);dummy.updateMatrix();balls.setMatrixAt(i,dummy.matrix);balls.setColorAt(i,new T.Color(colours[el]));});
 data.bonds.forEach(([i,j],k)=>{d.subVectors(points[j],points[i]);dummy.position.addVectors(points[i],points[j]).multiplyScalar(.5);dummy.scale.set(.119,d.length(),.119);dummy.quaternion.setFromUnitVectors(up,d.normalize());dummy.updateMatrix();sticks.setMatrixAt(k,dummy.matrix);});
 group.add(balls,sticks);const box=new T.Box3().setFromObject(group),extent=box.getSize(V()),centre=box.getCenter(V());group.position.copy(centre).negate();
 const rig=new T.Group();rig.add(group);rig.scale.setScalar(1.34/Math.max(extent.x,extent.y));return rig;
}

export function suspension(seed,accent){
 // Irregular, gently precessing loops around the specimen. No spark bursts, flashes or trails across the brief.
 let n=seed+521;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 const count=34,geo=new T.BufferGeometry(),positions=new Float32Array(count*3),sizes=new Float32Array(count),values=new Float32Array(count),paths=[];
 for(let i=0;i<count;i++){paths.push([random()*Math.PI*2,.53+.42*random(),random()*.16+.09,random()*2-1,random()*6]);sizes[i]=.76+random()*.95;values[i]=.52+random()*.48;}
 geo.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('size',new T.BufferAttribute(sizes,1));geo.setAttribute('value',new T.BufferAttribute(values,1));
 const mat=new T.ShaderMaterial({transparent:true,depthTest:true,depthWrite:false,uniforms:{power:{value:0},scale:{value:4},area:{value:new T.Color(accent).convertLinearToSRGB()}},
  vertexShader:`attribute float size; attribute float value; uniform float scale; varying float tint; void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=max(2.5,1.24*size*scale*(.92+.21*position.z));tint=value;}`,
  fragmentShader:`uniform float power;uniform vec3 area;varying float tint;void main(){
   float r=2.*length(gl_PointCoord-.5);if(r>=1.)discard;
   float core=1.-smoothstep(.14,.60,r),h=1.-smoothstep(.12,1.,r);
   // Compensate the cool glass behind translucent warm motes without changing the glass.
   vec3 ink=area;ink.b=max(0.,ink.b-.23*max(0.,area.r-area.b));
   vec3 c=mix(ink,vec3(1.),.055+.13*core*tint);
   gl_FragColor=vec4(c,min(1.,.77*core+.34*h*h)*(.18+.82*tint)*power);}`});
 const cloud=new T.Points(geo,mat);cloud.frustumCulled=false;
 return {cloud,count,update(t,power,px){cloud.visible=power>0;mat.uniforms.power.value=power;mat.uniforms.scale.value=px;if(!cloud.visible)return;paths.forEach(([a,r,s,k,p],i)=>{const u=a+t*s,w=Math.cos(u)*r,z=Math.sin(u)*r;positions.set([w*.79+.033*Math.sin(p+t*.28),.72*k+.18*z+.065*Math.sin(u*2+p),.8*z],3*i);});geo.attributes.position.needsUpdate=true;}};
}
