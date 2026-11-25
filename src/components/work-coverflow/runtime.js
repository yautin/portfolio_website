import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {molecule,suspension} from './chamber.js';
import {seatContents} from './chamber-mount.js';
import {rockMolecule} from './molecule-motion.js';
const asset=p=>`/work-capsules/${p}`, svgNS='http://www.w3.org/2000/svg';
const limit=(v,a,b)=>Math.max(a,Math.min(b,v));
import {caseCoating,spillCoating,studioKeyPosition} from './coatings.js';
// Keep the factory seam for the tray-visibility witness.
function coating(maps,role,seatPlane){return caseCoating(maps,role,seatPlane);}
// Basis of the actual tray, from asset.json physicalSection (model units/mm).
// Keep it here: fetching registration metadata would delay the first live frame.
const sheetOrigin=new T.Vector3(-4.90171523,-17.44744494,0);
const sheetX=new T.Vector3(.867826806,.129365487,-.479730346);
const sheetY=new T.Vector3(-.496422829,.184940058,-.848151844);
const sheetZ=new T.Vector3(-.021000218,.974198001,.224715921);
function sheetPoint({u,v}) {
 // Invert panel_finish's sampling of the 720x408 full-bleed print. Its last
 // texel centre, not its right/bottom edge, corresponds to the design limit.
 const x=-6.375+66.05*((720*u-.5)/719-.495),z=19-38*(408*v-.5)/407,mm=6.008784458;
 return sheetOrigin.clone().addScaledVector(sheetX,x*mm).addScaledVector(sheetY,-7.4*mm).addScaledVector(sheetZ,z*mm);
}
function withdrawal(v){return v.card.moving[0].transform.baseVal.getItem(0).matrix.e/322;}
function poseDrawer(v,open){
 v.cap.position.set(322*open,48*open,-178*open);
 v.drawer.position.copy(v.stop).multiplyScalar(1-T.MathUtils.smoothstep(open,0,.60));
}
function projectOnSheet(v,camera,points){
 // Gallery draw can call before the renderer's next RAF. Pose the very same
 // hierarchy the renderer will use, including the closed-stop displacement.
 poseDrawer(v,withdrawal(v));v.drawer.updateWorldMatrix(true,false);camera.updateWorldMatrix(true,false);
 return points.map(point=>{const q=point.clone().applyMatrix4(v.drawer.matrixWorld).project(camera);
  return {x:(1+q.x)*760,y:(1-q.y)*345};});
}
function addTraceToPrint(material){
 // Finish the *existing* depth-tested tray fragment. No second surface,
 // depth bias or overlay can bring the trace through the rim or housing.
 const trace={traceStart:{value:new T.Vector3()},traceDelta:{value:new T.Vector3()},traceSweep:{value:-1}};
 Object.assign(material.uniforms,trace);
 material.fragmentShader=`#define main shadePrint\n${material.fragmentShader}\n#undef main
 uniform vec3 traceStart,traceDelta;
 uniform float traceSweep;
 void main(){
   shadePrint(); if(traceSweep<0.)return;
   vec3 d=localP-traceStart;
   float t=clamp(dot(d,traceDelta)/max(.0001,dot(traceDelta,traceDelta)),0.,1.);
   // The radius is narrower than the bold ink and than the sheet thickness:
   // no tint can reach the reverse face, even under a changed inspection camera.
   float ink=1.-smoothstep(1.35,3.,length(d-t*traceDelta));
   float tail=1.-smoothstep(.018,.24,traceSweep-t);
   float head=1.-smoothstep(0.,.024,t-traceSweep);
   gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.93,.955,.98),ink*tail*head);
 }`;
 return trace;
}
// This patch is inside the stationary opaque housing, including at full withdrawal.
// Check presentation on first draw and at settled layout changes, never per hover frame.
function checkHousing(v,w,h){const pixels=v.ctx.getImageData(Math.floor(w*.29),Math.floor(h*.48),4,4).data;
 for(let i=3;i<pixels.length;i+=4)if(pixels[i]>127)return;
 throw Error('The capsule frame has no visible housing');}
function makeWindow(c){const port=document.createElementNS(svgNS,'foreignObject');port.setAttribute('class','case-port');port.setAttribute('width','1520');port.setAttribute('height','690');port.setAttribute('aria-hidden','true');const canvas=document.createElement('canvas');canvas.className='case-view';port.append(canvas);c.art.append(port);return {canvas,ctx:canvas.getContext('2d'),port};}
function assemble(scene,model,data,maps,card,i,shared){
 // One reflection offset per capsule; the open case never rotates to produce it.
 const readingLight=new T.Vector2();maps={...maps,readingLight};
 const root=new T.Group(),cap=new T.Group(),mats=[];root.add(cap);scene.add(root);root.visible=false;let tris=0,drawer,stop;
 model.traverse(o=>{if(!o.isMesh)return;const role=o.userData.role||o.name,g=o.geometry,mat=coating(maps,role,o.userData.seatPlane),ob=new T.Mesh(g,mat);tris+=g.index.count/3;(o.userData.moving?cap:root).add(ob);if(role==='tray'){drawer=ob;stop=new T.Vector3(...o.userData.closedSlide);}mats.push(mat);if(role==='glass'){ob.renderOrder=-5;const skin=new T.Mesh(g,coating(maps,'glassFront'));skin.renderOrder=3;cap.add(skin);mats.push(skin.material);}});
 const mol=molecule(data,shared.sphere,shared.rod),bay=new T.Group(),field=suspension(i,maps.accent);seatContents(T,bay,field.cloud,data.name);bay.add(mol,field.cloud);cap.add(bay);
 // Only the soft spill is a light card; the traced channel and its filament are on the metal geometry.
 const spill=new T.Mesh(shared.spill,spillCoating(maps.strip,maps.accent));spill.position.z=-175;root.add(spill);
 const v=makeWindow(card);v.canvas.dataset.triangles=tris;v.canvas.dataset.source='case.glb';v.canvas.dataset.atoms=data.atoms.length;v.canvas.dataset.bonds=data.bonds.length;
 return {...v,card,root,cap,drawer,stop,mats,mol,field,spill,readingLight,i,x:0,y:0,tx:0,ty:0,lastKey:''};
}
export function prepare(catalog){
 const tex=new T.TextureLoader(),getTex=f=>tex.loadAsync(asset('textures/'+f+'.webp'));
 const inks=Promise.resolve(catalog).then(projects=>Promise.all(projects.map(async p=>{const [body,tray,lit]=await Promise.all(['body','tray','lit'].map(n=>getTex(p.molecule+'-'+n)));return {body,tray,lit};})));
 return Promise.all([new GLTFLoader().loadAsync(asset('case.glb')),fetch(asset('models.json')).then(r=>{if(!r.ok)throw Error('No chamber data');return r.json()}),...['strip','cap','skin','skin-lit','fitted-collar','seated-glass','studio-return'].map(getTex),inks]);
}
export async function mount(cards,projects,onPoster,prepared,body,signal){
 const [model,data,strip,cap,skin,skinLit,seated,clear,studioReturn,paints]=prepared??await prepare(projects);
 if(signal.aborted)return;
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setClearColor(0,0);const scene=new T.Scene(),camera=new T.OrthographicCamera(-600,920,345,-345,.1,4800);camera.position.z=1700;
 scene.add(new T.HemisphereLight(0xe3eeff,0x283342,1.12));for(const [x,y,z,col,p] of [[...studioKeyPosition,0xfff6e8,2.6],[3,1,-2,0x95d8ff,2.8],[2,-1,3,0xb3d6ec,.48]]){const l=new T.DirectionalLight(col,p);l.position.set(x,y,z);scene.add(l);}
 const shared={sphere:new T.SphereGeometry(1,20,14),rod:new T.CylinderGeometry(1,1,1,12,1),spill:new T.PlaneGeometry(1200,690)},views=cards.map((c,i)=>assemble(scene,model.scene,data.find(d=>d.name===projects[i].molecule),{...paints[i],strip,cap,skin,skinLit,seated,clear,studioReturn,accent:projects[i].accent},c,i,shared));
 const reduce=matchMedia('(prefers-reduced-motion:reduce)'),pointer=matchMedia('(any-hover:hover) and (any-pointer:fine)');let raf=0,last=0,t=0,visible=true,lost=false,failed=false;
 const active=()=>!reduce.matches;
 const canTrace=v=>active()&&v.card.el.getAttribute('aria-expanded')==='true';
 for(const v of views){
  const trace=v.trace=addTraceToPrint(v.drawer.material);
  v.card.projectStroke=(points,sweep=null)=>{
   const local=points.map(sheetPoint),level=Number.isFinite(sweep)&&canTrace(v)?limit(sweep,0,1):-1;
   trace.traceStart.value.copy(local[0]);trace.traceDelta.value.subVectors(local[1],local[0]);
   if(level>=0||level!==trace.traceSweep.value){trace.traceSweep.value=level;v.lastKey='';wake();}
   return projectOnSheet(v,camera,local);
  };
 }
 function wake(){if(!signal.aborted&&!raf&&visible&&!lost&&!failed&&!document.hidden)raf=requestAnimationFrame(present);}
 function poster(){cancelAnimationFrame(raf);raf=0;for(const v of views)delete v.card.projectStroke;if(body.dataset.case!=='poster'){body.dataset.case='poster';onPoster();}}
 function present(now){try{frame(now);}catch(error){
   if(renderer.getContext().isContextLost())lost=true;else failed=true;
   views.forEach(v=>{v.root.visible=false;});poster();console.warn('Using capsule poster:',error);}}
 function neutral(){views.forEach(v=>{v.tx=v.ty=0;});wake();}
 function frame(now){raf=0;if(lost||!visible||document.hidden)return;const dt=last?Math.min(.06,(now-last)/1000):0;last=now;const anim=active(),browsing=body.dataset.phase==='gallery',reading=body.dataset.phase==='reading';if(anim)t+=dt;
  const rects=views.map(v=>v.port.getBoundingClientRect());const dpr=limit(devicePixelRatio||1,1.65,2),heights=rects.map(r=>limit(Math.ceil(r.height*dpr/8)*8,56,540));const maxH=Math.max(...heights),maxW=Math.round(maxH*1520/690);if(renderer.domElement.width!==maxW||renderer.domElement.height!==maxH)renderer.setSize(maxW,maxH,false);
  let drawable=false;
  for(const [i,v] of views.entries()){const rect=rects[i],c=v.card;if(!rect.width||!rect.height||rect.right<=0||rect.left>=innerWidth)continue;drawable=true;
   if(v.trace.traceSweep.value>=0&&!canTrace(v)){v.trace.traceSweep.value=-1;v.lastKey='';}
   if((!browsing&&!reading)||!anim)v.tx=v.ty=0;
   const selected=reading&&c.el.getAttribute('aria-expanded')==='true',tilt=browsing?1:reading&&!selected?.5:0;
   const a=1-Math.exp(-dt/(browsing||reading?.083:.037));
   v.x=anim&&!selected?T.MathUtils.lerp(v.x,v.tx*tilt,a):0;v.y=anim&&!selected?T.MathUtils.lerp(v.y,v.ty*tilt,a):0;
   if(selected&&anim){v.readingLight.x=T.MathUtils.lerp(v.readingLight.x,v.tx*.034,a);v.readingLight.y=T.MathUtils.lerp(v.readingLight.y,v.ty*.024,a);}
   else v.readingLight.set(0,0);
   const open=withdrawal(v),power=Number(c.strip.style.opacity)/.79,mark=c.printLevel,clock=reduce.matches?0:t;
   const settled=browsing?'gallery':reading?(selected?'open':'index'):null;
   const verify=!v.checked||(settled&&v.checked!==settled);
   const h=heights[i],w=Math.round(h*1520/690),key=[h,open,power,mark,clock,v.x,v.y,v.readingLight.x,v.readingLight.y].join('/');if(v.lastKey===key&&!verify)continue;v.lastKey=key;
   // The cap follows the withdrawal axis. In its guide, the tray retracts behind the joint at the closed stop.
   v.root.visible=true;v.root.rotation.set(v.y*.065,-v.x*.16,0,'YXZ');poseDrawer(v,open);v.spill.visible=power>.002;v.spill.material.opacity=.72*power;for(const m of v.mats){m.uniforms.power.value=power;m.uniforms.mark.value=mark;if(m.uniforms.travel)m.uniforms.travel.value=open;}
   rockMolecule(v.mol,clock,i,reduce.matches);v.field.update(clock,power,Math.max(2.4,h/690*424*.027));
   renderer.setViewport(0,0,w,h);renderer.render(scene,camera);if(v.canvas.width!==w||v.canvas.height!==h){v.canvas.width=w;v.canvas.height=h;}v.ctx.clearRect(0,0,w,h);v.ctx.drawImage(renderer.domElement,0,maxH-h,w,h,0,0,w,h);
   if(verify){checkHousing(v,w,h);v.checked=settled||'first';}
   v.root.visible=false;v.canvas.dataset.yaw=(-v.root.rotation.y).toFixed(5);v.canvas.dataset.open=open.toFixed(3);v.canvas.dataset.particles=power>0?v.field.count:0;
  }
  if(drawable)body.dataset.case='blender';if(anim)wake();
 }
 for(const v of views){const {hit,caption}=v.card;
  const move=e=>{const phase=body.dataset.phase;if(e.pointerType!=='mouse'||!pointer.matches||!active()||e.buttons)return;
   if(phase!=='reading'&&!(phase==='gallery'&&e.currentTarget===hit))return;
   const r=e.currentTarget.getBoundingClientRect();v.tx=limit((e.clientX-r.left)*2/r.width-1,-1,1);v.ty=limit((e.clientY-r.top)*2/r.height-1,-1,1);wake();};
  const leave=()=>{v.tx=v.ty=0;wake();};for(const el of [hit,caption]){el.addEventListener('pointerenter',move);el.addEventListener('pointermove',move);for(const n of ['pointerleave','pointerdown','pointercancel'])el.addEventListener(n,leave);}}
 const mutations=new MutationObserver(wake);mutations.observe(body.querySelector('#cards'),{subtree:true,attributes:true,attributeFilter:['style','transform','aria-expanded']});const visibility=new IntersectionObserver(es=>{visible=es[0].isIntersecting;last=0;if(visible)wake();});visibility.observe(body.querySelector('#stage'));
 reduce.addEventListener('change',neutral,{signal});pointer.addEventListener('change',neutral,{signal});window.addEventListener('blur',neutral,{signal});document.addEventListener('visibilitychange',()=>{last=0;wake()},{signal});window.addEventListener('resize',neutral,{signal});
 // Once the poster has been shown, do not replace it during the same visit.
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;poster();},{signal});
 signal.addEventListener('abort',()=>{
  lost=true;cancelAnimationFrame(raf);mutations.disconnect();visibility.disconnect();
  const geometries=new Set(),materials=new Set(),textures=new Set();
  scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);if(o.isInstancedMesh)o.dispose();});
  for(const m of materials){if(m.map)textures.add(m.map);for(const u of Object.values(m.uniforms??{}))if(u.value?.isTexture)textures.add(u.value);m.dispose();}
  for(const t of textures)t.dispose();for(const g of geometries)g.dispose();renderer.dispose();renderer.forceContextLoss();
 },{once:true});present(performance.now());
}
