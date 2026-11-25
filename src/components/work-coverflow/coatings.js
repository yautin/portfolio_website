// Camera-registered finish at the approved pose; a surface BRDF around the rest of the object.
// All uniforms/textures are shared with the gallery. No reflection pass, scene copy, or orbit atlas.
import * as T from 'three';
export const studioKeyPosition=Object.freeze([-3,5,5]);
const halfKey=new T.Vector3(...studioKeyPosition).normalize().add(new T.Vector3(0,0,1)).normalize();

// Use the neutral/core detail in the original strip exposure, not its cyan RGB.
// This ramp is shared by the surface pass and the soft spill outside the housing.
const stripRamp=`uniform vec3 areaInk;
vec3 stripLight(float core){return mix(areaInk,vec3(1.),.06+.72*smoothstep(.20,.94,core));}`;

const vary = `varying vec3 localP,localN,viewN,vEyePos; varying vec2 at,keyTurn; varying float hero;`;
export const vertex = vary + `uniform vec3 halfKey; uniform vec2 readingLight; void main(){
  localP=position; localN=normal; viewN=normalize(normalMatrix*normal);
  at=(position.xy+vec2(600.,345.))/vec2(1200.,690.);
  // Angle of the CAMERA to the registered axis, not a yaw slider (also valid at both poles).
  hero=smoothstep(.82,.985,normalize(normalMatrix*vec3(0.,0.,1.)).z);
  vEyePos=(modelViewMatrix*vec4(position,1.)).xyz;
  // A fixed studio key, seen from the gallery's orthographic camera. Rotate its
  // half vector back into the rigid case, not in response to raw pointer position.
  keyTurn=readingLight+vec2(dot(halfKey,modelMatrix[0].xyz-vec3(1.,0.,0.)),dot(halfKey,modelMatrix[1].xyz-vec3(0.,1.,0.)));

  gl_Position=projectionMatrix*vec4(vEyePos,1.);
}`;
const common = `
#include <common>
#include <lights_pars_begin>
${vary}
uniform sampler2D baseInk,litInk,stripInk,seatedInk,clearInk;
uniform sampler2D studioInk;
uniform float power,mark,travel;
uniform vec4 plane;
${stripRamp}
const vec3 faceAxis=vec3(.488127,-.186165,.852687);
// Longitudinal, rearward and dorsal axes of the fitted section (design mm).
// Both halves use rest-local coordinates, so a finish cannot slide during opening.
vec3 sectionPoint(){vec3 p=(localP-vec3(-4.901715,-17.447445,0.))/6.00878446;
  return vec3(dot(p,vec3(.86782681,.12936549,-.47973035)),dot(p,vec3(-.49642283,.18494006,-.84815184)),dot(p,vec3(-.02100022,.97419800,.22471592)));}
float silk(vec3 n){vec3 r=reflect(vec3(0.,0.,-1.),normalize(n));return .62*exp(-pow((r.y-.7)*3.9,2.))*smoothstep(-.8,.35,r.z)+.28*pow(max(0.,dot(r,normalize(vec3(-.8,.27,.6)))),10.);}
// Move only the separated light; the original silhouette, label, seam, and glass transmission stay registered.
float studioShift(bool optical){
  if(dot(keyTurn,keyTurn)<1.e-12)return 0.;
  vec2 radius=optical?vec2(227.,202.):vec2(312.,190.);
  vec2 offset=keyTurn*radius/vec2(1200.,690.);
  vec2 d=texture2D(studioInk,at-offset).rg-texture2D(studioInk,at).rg;
  return optical?d.r:d.g;
}
vec3 linearToDisplay(vec3 c){return sRGBTransferOETF(vec4(clamp(c,0.,1.),1.)).rgb;}
// GGX / Smith with Schlick Fresnel, plus the broad, roughness-filtered studio returns.
// All irradiance and reflection colours come from actual scene lights in camera space.
vec3 studio(vec3 n,vec3 albedo,float metal,float rough,vec3 f0){
  float nv=max(n.z,.001), a2=pow(rough,4.),k=pow(rough+1.,2.)/8.;
  vec3 view=vec3(0.,0.,1.),r=reflect(-view,n),diff=albedo*(1.-metal),sum=ambientLightColor*diff;
  vec3 fView=f0+(1.-f0)*pow(1.-nv,5.);
  #if NUM_HEMI_LIGHTS > 0
  for(int i=0;i<NUM_HEMI_LIGHTS;i++){
    vec3 sky=getHemisphereLightIrradiance(hemisphereLights[i],n);
    vec3 bounce=getHemisphereLightIrradiance(hemisphereLights[i],r);
    sum+=diff*sky*.30+fView*bounce*.29;
  }
  #endif
  #if NUM_DIR_LIGHTS > 0
  for(int i=0;i<NUM_DIR_LIGHTS;i++){
    vec3 l=directionalLights[i].direction,h=normalize(l+view); float nl=max(dot(n,l),0.);
    float nh=max(dot(n,h),0.),vh=max(dot(view,h),0.),d=nh*nh*(a2-1.)+1.;
    float dg=a2/(PI*d*d*4.*(nv*(1.-k)+k)*(nl*(1.-k)+k));
    vec3 f=f0+(1.-f0)*pow(1.-vh,5.);
    // A finite studio source softens the pin highlight; it stays fixed to its light.
    float soft=pow(max(dot(r,l),0.),mix(22.,5.,rough));
    sum+=directionalLights[i].color*(nl*(diff*(1.-f)/PI+f*min(dg,3.))+.40*fView*soft);
  }
  #endif
  return max(sum,vec3(0.));
}
`;
const recipes = { // linear substrate colour, metallic fraction, roughness
  housing:['.062,.069,.086',.76,.39], label:['.015,.021,.030',.19,.46],
  crown:['.39,.41,.46',.89,.31], bodyRim:['.34,.37,.42',.86,.33],capRim:['.34,.37,.42',.86,.33],
  seal:['.010,.014,.019',.08,.60],joint:['.014,.019,.024',.16,.54],
  channel:['.015,.021,.026',.48,.43],strip:['.09,.28,.31',.30,.29],tray:['.092,.107,.129',.69,.39]
};
function physical(role,film){
  if(film)return `
    // The mesh already has an outer and inner wall. Composite the four real interfaces
    // weakly rather than painting an 85%-opaque photographic return on the far wall.
    float f=.036+(1.-.036)*pow(1.-max(n.z,0.),5.);
    float absorption=1.-exp(-.017/max(.16,n.z));
    float alpha=clamp(.47*f+absorption,.025,.43);
    vec3 refl=studio(n,vec3(0.),0.,.24,vec3(.036));
    vec3 tint=vec3(.015,.045,.083);
    vec3 rgb=linearToDisplay(tint+.60*refl/max(alpha,.05));
    ${role==='glassFront'?`// One broad studio strip seen in reflection, fixed in the studio world.
    // No geometry card, painted back image, general opacity lift or screen-space stripe.
    vec3 ray=inverseTransformDirection(reflect(vec3(0.,0.,-1.),n),viewMatrix);
    vec3 axis=normalize(vec3(322.,48.,-178.)),lamp=normalize(vec3(-.293,.919,-.269));
    float axial=dot(ray,axis);vec3 crossRay=ray-axis*axial;
    float card=.12*smoothstep(.86,.992,dot(crossRay,lamp)/max(length(crossRay),.001))*(1.-smoothstep(.30,.94,abs(axial)));
    float combined=alpha+(1.-alpha)*card;rgb=(rgb*alpha*(1.-card)+vec3(.77,.83,.91)*card)/combined;alpha=combined;`:''}
    return vec4(rgb,alpha);`;
  const [color,metal,rough]=recipes[role];
  return `vec3 base=vec3(${color});float metal=${metal.toFixed(3)},rough=${rough.toFixed(3)};
    ${role==='joint'?`// The face carrying the drawer is a metal backplate. Keep its perimeter gasket
      // and reverse face dark; don't let the exposed seat disappear against the page.
      vec3 seatN=normalize(cross(dFdx(localP),dFdy(localP)));
      float seat=smoothstep(.88,.98,abs(dot(seatN,vec3(.86782681,.12936549,-.47973035))))*(1.-smoothstep(24.12,24.40,sectionPoint().x));
      base=mix(base,vec3(.089,.103,.122),seat);metal=mix(metal,.55,seat);rough=mix(rough,.46,seat);`:''}
    ${role==='label'||role==='tray'?`
      // Only the actual printed plane can carry ink: NOT its back, bevel or the housing.
      // The derivative normal points to the viewer; this also rejects reverse-side reads.
      vec3 face=normalize(cross(dFdx(localP),dFdy(localP)));
      float printed=smoothstep(.96,.989,dot(face,faceAxis));
      ${role==='tray'?'printed*=texture2D(baseInk,at).a;':''}
      if(printed>0.){vec3 ink=texture2D(baseInk,at).rgb;
        ${role==='tray'?'ink=mix(ink,texture2D(litInk,at).rgb,mark);':''}
        base=mix(base,sRGBTransferEOTF(vec4(ink,1.)).rgb,printed);metal=mix(metal,.13,printed);
        // A flat plate must not inherit the bevel's averaged vertex normal across its face.
        vec3 planeN=normalize(cross(dFdx(vEyePos),dFdy(vEyePos)));
        n=normalize(mix(n,planeN,printed));}`:''}
    ${role==='strip'?'base=mix(vec3(.055),sRGBTransferEOTF(vec4(areaInk,1.)).rgb,.32);':''}
    vec3 c=studio(n,base,metal,rough,mix(vec3(.04),base,metal));
    ${role==='strip'?'c+=power*sRGBTransferEOTF(vec4(stripLight(.46),1.)).rgb*.93;':''}
    return vec4(linearToDisplay(c),1.);`;
}
function heroFinish(role,rim){
  const glass=role==='glass',front=role==='glassFront';
  if(glass||front)return `
    vec4 skin=texture2D(baseInk,at);
    // Alpha belongs only to the calibrated hero image, never to geometric coverage.
    if((skin.a<.15 && at.x<.65)${glass?' || dot(localP+vec3(4.90,17.45,0.),-faceAxis)<0.':''})return vec4(0.);
    // The photographic cap includes its old silver lip. Never restore that lip
    // on the optical wall when opening: the adjoining capRim already owns it.
    // Beyond the socket, keep the original chamber exposure and powered catch.
    vec3 rgb=mix(texture2D(clearInk,at).rgb,skin.rgb,
      smoothstep(0.,.10,travel)*smoothstep(794./1200.,816./1200.,at.x));
    rgb+=studioShift(true)*vec3(.91,1.,1.13);
    ${front?`float f=pow(1.-abs(normalize(viewN).z),3.);return vec4(rgb+vec3(.02,.04,.065)+.4*s,clamp(.035+.12*f+.035*silk(viewN),.02,.19));`:
    `// The shared exposure contains an ice-blue lamp. Keep its footprint, not its hue.
     // Lighting only the measured difference leaves unpowered glass and reflections intact.
     vec3 delta=texture2D(litInk,at).rgb-skin.rgb;
     float catchLight=smoothstep(.012,.31,max(delta.b,max(delta.g,delta.r)));
     rgb=mix(rgb,mix(areaInk,vec3(1.),.10),.80*catchLight*power);
     rgb+=.27*s*vec3(.85,.92,1.);
     return vec4(clamp((rgb-.15*vec3(.09,.095,.12))/.85,0.,1.),.85);`}`;
  return `vec3 rgb=texture2D(baseInk,at).rgb;
    ${role==='tray'?'rgb=mix(rgb,texture2D(litInk,at).rgb,mark);':`vec4 line=texture2D(stripInk,at);
      // The closed photo has a narrow cyan inlay too. Separate its cool component
      // only inside the filament mask, retaining the metal's neutral highlights.
      float cool=max(0.,min(rgb.g-rgb.r,rgb.b-rgb.r));
      rgb=mix(rgb,vec3(rgb.r)+areaInk*(rgb.b-rgb.r),smoothstep(.035,.17,cool)*line.a);
      rgb=mix(rgb,stripLight(line.r),line.a*power*.90);`}
    rgb+=${role==='label'||role==='tray'?'.12':role==='crown'?'.43':'.27'}*s*vec3(.85,.92,1.);
    ${rim?`// Carry the broad studio return around the physical section, not the
      // photograph's obsolete diagonal parting mark. The only sharp line is the join.
      float station=dot(localP,plane.xyz)-plane.w;vec3 centre=localP-plane.xyz*station;
      vec2 uv=(centre.xy+vec2(600.,345.))/vec2(1200.,690.);
      vec2 offset=vec2(14./1200.,0.);vec3 mid=texture2D(seatedInk,uv,2.7).rgb;
      vec3 shoulders=max(texture2D(seatedInk,uv-offset,2.7).rgb,texture2D(seatedInk,uv+offset,2.7).rgb);
      // Both lips carry the same satin shoulder through the stroke. Sampling the
      // body/skin photo here after withdrawal would replace silver with shell/glass.
      rgb=mix(mid,max(mid,shoulders),.78)*mix(.91,1.035,smoothstep(.8,11.,abs(station)))+.23*s;`:''}
    ${['housing','crown','bodyRim','capRim'].includes(role)?`rgb+=studioShift(false)*vec3(.96,.98,1.);`:''}
    return vec4(clamp(rgb,0.,1.),1.);`;
}
// The exterior spill map is a hero photographic effect, not a luminous object in space.
// Shrinking its projected alpha with the same camera cone leaves only the live filament at other angles.
export function spillCoating(map,accent){
  const mat=new T.MeshBasicMaterial({map,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
  mat.onBeforeCompile=s=>{
    s.uniforms.areaInk={value:new T.Color(accent).convertLinearToSRGB()};
    s.vertexShader='varying float spillWeight;\n'+s.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\nspillWeight=smoothstep(.82,.985,normalize(normalMatrix*vec3(0.,0.,1.)).z);');
    s.fragmentShader=stripRamp+'\nvarying float spillWeight;\n'+s.fragmentShader.replace('#include <map_fragment>',
      '#include <map_fragment>\n diffuseColor.rgb=sRGBTransferEOTF(vec4(stripLight(diffuseColor.r),1.)).rgb;').replace('#include <opaque_fragment>',
      'diffuseColor.a*=spillWeight;\n#include <opaque_fragment>');
  };
  return mat;
}
export function caseCoating(maps,role,seatPlane){
  const glass=role==='glass',front=role==='glassFront',film=glass||front,optical=film||role==='capRim';
  const uniforms={...T.UniformsUtils.clone(T.UniformsLib.lights),
    areaInk:{value:new T.Color(maps.accent).convertLinearToSRGB()},
    baseInk:{value:role==='tray'?maps.tray:optical?maps.skin:role==='joint'?maps.cap:maps.body},
    litInk:{value:optical?maps.skinLit:maps.lit},stripInk:{value:maps.strip},seatedInk:{value:maps.seated},clearInk:{value:maps.clear},
    // A cached renderer from before reading-hover has no offset. Neutral is a valid pose.
    halfKey:{value:halfKey},readingLight:{value:maps.readingLight??new T.Vector2()},studioInk:{value:maps.studioReturn},plane:{value:seatPlane?new T.Vector4(...seatPlane):new T.Vector4()},power:{value:0},mark:{value:0},travel:{value:0}};
  const fragmentShader=common+`
    vec4 substrate(vec3 n){${physical(role,film)}}
    vec4 calibrated(float s){${heroFinish(role,!!seatPlane)}}
    void main(){float w=hero;
      ${role==='housing'||film?`// The approved front photograph ends inside the real roof. Fade it out on
      // this return rather than projecting boundary texels onto the curved silhouette.
      vec3 mm=sectionPoint();float roof=smoothstep(36.6,39.65,mm.z)*smoothstep(-7.,-.5,mm.y);
      ${film?'w*=1.-roof*(1.-smoothstep(45.,61.,mm.x));':`// The opposite rollover also inherited the old rim's bright end texel.
      float underside=(1.-smoothstep(-37.,-31.,mm.z))*smoothstep(-15.,-13.,mm.y);
      w*=1.-max(roof,underside)*smoothstep(-12.,6.,mm.x);`}`:''}
      ${seatPlane?`// Filter the contact once, in the common section of the two real rims.
      // A fixed model-space hairline vanishes when rasterised onto a small angled card.
      // Both halves shade only their own edge; nothing spans the split during withdrawal.
      float station=dot(localP,plane.xyz)-plane.w;
      float footprint=clamp(length(vec2(dFdx(station),dFdy(station))),.38,5.);
      float edgeDist=abs(station)/footprint;
      float contact=(1.-smoothstep(.55,1.65,edgeDist))*(1.-smoothstep(0.,.035,travel));`:''}
      ${rimWeight(role)}
      ${role==='tray'?`// Outside the original inset the real metal supports the drawer.
      // Extrapolated border texels are not a finish for that newly exposed surface.
      w*=texture2D(baseInk,at).a;`:''}
      // This front-facing receiver test prevents the calibrated front from leaking onto
      // newly exposed back-facing solids as the object leaves the approved camera cone.
      ${!film?`vec3 geom=normalize(cross(dFdx(localP),dFdy(localP)));w*=smoothstep(-.13,-.018,geom.z);`:''}
      vec4 reg=vec4(0.);
      if(w>0.){reg=calibrated(silk(viewN)-silk(localN));${seatPlane?'':'if(w>=1.){gl_FragColor=reg;return;}'}}
      vec3 n=normalize(viewN);if(n.z<0.)n=-n;
      vec4 side=substrate(n);
      // Blend associated radiances, not straight RGB, so zero-alpha calibration cannot
      // paint dark borders or punch holes as real glass takes over.
      float a=mix(side.a,reg.a,w);
      gl_FragColor=vec4(mix(side.rgb*side.a,reg.rgb*reg.a,w)/max(a,.00001),a);
      ${seatPlane?`vec3 titanium=gl_FragColor.rgb;
      gl_FragColor.rgb=mix(titanium,min(.34*titanium,vec3(.105,.117,.134)),contact);`:''}
    }`;
  const m=new T.ShaderMaterial({name:'case/'+role,uniforms,vertexShader:vertex,fragmentShader,lights:true,
    side:glass?T.BackSide:front?T.FrontSide:T.DoubleSide,depthWrite:!film,transparent:film,toneMapped:false});
  return m;
}
// Solid hardware is now dimensionally fitted. Shade it at its real depth in every view.
function rimWeight(role){
  if(role==='joint')return 'w=0.;';
  // Changing the camera can change the reflection; merely translating the cap
  // should not change the metal. Let the uncovered bevel keep its 3-D shading.
  return role==='bodyRim'||role==='capRim'?'w*=smoothstep(.972,1.,normalize(mat3(viewMatrix)*vec3(0.,0.,1.)).z);':'';
}
