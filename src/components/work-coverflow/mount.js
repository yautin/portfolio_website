// Self-contained instance. Shadow DOM keeps capsule masks, styles and keyboard
// controls separate from the navigation, hero canvas and other homepage sections.
import template from './capsule.svg?raw'
import markup from './controls.html?raw'
import css from './coverflow.css?inline'

export function mountCoverFlow(host, publicCards, signal) {
 const root=host.shadowRoot??host.attachShadow({mode:'open'});
 const style=document.createElement('style');style.textContent=css;
 const ui=document.createElement('template');ui.innerHTML=markup;
 root.replaceChildren(style,ui.content.cloneNode(true));
 const q=s=>root.querySelector(s),body=q('.collection'),stage=q('#stage'),brief=q('#brief'),line=q('#line'),back=q('#back');
 const projects=publicCards.map(p=>{const [type,area]=p.tag.split(' · '),size=p.chips[0].replace(/ (panel|slide)s?$/,'-$1');return {...p,name:p.molecule[0].toUpperCase()+p.molecule.slice(1),area,deliverable:`${size} ${type.toLowerCase()}`};});
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'),mobile={get matches(){return host.clientWidth<=759}};

 const cards=projects.map((p,i)=>{const el=document.createElement('button');el.type='button';el.className='capsule';el.dataset.project=i;el.style.setProperty('--accent',p.accent);el.setAttribute('aria-controls','brief');el.setAttribute('aria-describedby',`caption-detail-${i}`);
 const blueprint=document.createElement('template');blueprint.innerHTML=`${template.replaceAll('KEY',String(i))}<span class="hit" aria-hidden="true"></span><span class="caption"><span class="caption-title"><i aria-hidden="true"></i><strong></strong></span><span class="caption-detail" id="caption-detail-${i}"></span></span>`;
 const f=s=>blueprint.content.querySelector(s),folio=`#folio-${p.molecule}-${i}`;f('.tray-mark use').setAttribute('href',folio);f('.cover-name').textContent=p.name;f('.cover-format').textContent=p.deliverable;f('strong').textContent=p.name;
 f('.caption-detail').textContent=`${p.area} · ${p.deliverable}`;f('.specimen').setAttribute('href',`/work-capsules/poster/${p.molecule}.svg`);
 f('.cover-icon').setAttribute('href',p.icon);
 if(p.molecule==='faricimab')el.title='Glass: atomic close-up of the VEGF-A-binding arm, not the whole antibody.';
 const card={el,folio,wash:f('.tray-wash'),imprint:f('.tray-mark'),chamber:f('.chamber-glow'),strip:f('.strip-glow'),plane:f('.sled > g').transform.baseVal.getItem(0).matrix,art:f('.art'),hit:f('.hit'),caption:f('.caption'),shell:f('.shell'),moving:[f('.cap-assembly'),f('.mouth'),f('.sled')],inside:[f('.socket'),f('.mouth'),f('.sled')]};
 // Keep fallback images in the inert template document. Only the viewport and
 // non-painting projection definitions join the page on the ordinary 3D route.
 {card.poster=blueprint.content.ownerDocument.createDocumentFragment();for(const node of [...card.art.children])if(node.localName!=='defs')card.poster.append(node);}
 el.append(blueprint.content);q('#cards').append(el);return card;});
 const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>t*t*(3-2*t),part=(p,a,b)=>smooth(clamp((p-a)/(b-a))),mix=(a,b,t)=>a+(b-a)*t;
 const blend=(a,b,t)=>Object.fromEntries(Object.keys(a).map(k=>[k,mix(a[k],b[k],t)]));
 const count=projects.length,wrap=i=>((i%count)+count)%count;
 // This is physical printing, not only projected light: Original mode still reveals it.
 const printLevel=ink=>.43+.57*clamp(ink/.50);
 function applyPosterPrints(){if(body.dataset.case!=='poster')return;cards.forEach((c,i)=>{
   if(c.posterPrint)return;c.art.prepend(c.poster);const img=c.el.querySelector('.sled > g > image'),name=projects[i].molecule;
   c.posterPrint=img.cloneNode(false);c.posterPrint.setAttribute('class','poster-print');
   img.setAttribute('href',`/work-capsules/poster/${name}-tray.webp`);c.posterPrint.setAttribute('href',`/work-capsules/poster/${name}-lit.webp`);
   c.posterPrint.style.opacity=printLevel(+c.imprint.style.opacity);c.el.querySelector('.tray-surface').append(c.posterPrint);
 });}
 let selected=1,centre=1,reading=false,poses=[],handle=0,stamp=0,transition=null,sceneH=0,info={reveal:0,flight:0,name:0,others:0},headingBox=null;
 const light=q('#projection'),fan=q('#projected-fan'),inner=q('#inner-ray'),front=q('#light-front'),ink=q('#fan-ink'),receiver=q('#receiving-edge');
 let optics=null,opticsRequest=null;
 function requestOptics(){if(!opticsRequest&&reading)opticsRequest=import('./projection.js').then(m=>{if(signal.aborted)return;optics=m.attachProjection(light,brief,stage,reduce,signal);draw();}).catch(()=>{/* Base projection still works. */});}
 const lift=q('#lift'),liftUse=lift.querySelector('use');

 // Size the face before measuring the stage/receiver, even on a cold optics import.
 function prepareFace(){brief.toggleAttribute('data-projecting',reading);}
 function writeProject(i){const p=projects[i];brief.style.setProperty('--accent',p.accent);q('#discipline').textContent=p.tag;line.textContent=p.title;q('#copy').textContent=p.description;q('#project-name').textContent=p.molecule;q('#chips').replaceChildren(...p.chips.map(s=>{const li=document.createElement('li');li.textContent=s;return li;}));}
 function controls(){body.dataset.centre=centre;stage.dataset.layout=reading?'index':'gallery';back.hidden=!reading;q('#browse').hidden=reading;q('.index-label').hidden=!reading;
  const position=q('#position');position.hidden=reading;position.textContent=`0${centre+1} / 03`;
  q('#structure-note').hidden=!reading||projects[selected].molecule!=='faricimab';
  cards.forEach(({el},i)=>{el.tabIndex=reading||!mobile.matches||i===centre?0:-1;el.setAttribute('aria-label',`Open project: ${projects[i].name}`);el.setAttribute('aria-expanded',String(reading&&i===selected));if(reading&&i===selected)el.setAttribute('aria-current','true');else el.removeAttribute('aria-current');});brief.setAttribute('aria-hidden',String(!reading));brief.inert=!reading;}
 function layout(open,position=centre,widths=null){const w=stage.clientWidth,m=mobile.matches,small=new Array(count);let H,briefY=0,otherY=0;
  if(!open){const track=cards[0].el.parentElement.clientWidth,big=m?Math.min(track*.86,400):Math.min(track*.43,512),wing=m?track*.34:track*.245;H=m?big*.56+133:Math.max(340,big*.56+157);
   // All capsules sample one track. Recycle the outer item only while it is invisible at the edge.
   for(let i=0;i<count;i++){const rel=wrap(i-position+count/2)-count/2,distance=Math.abs(rel),front=(1-smooth(clamp(distance)))**2,edge=1-part(distance,1.04,1.44);
    const k=mix(wing,big,front)/1160,cx=w/2+rel*track*(m?.535:.345),cy=H*.44+9*(1-front),x=cx-603*k,y=cy-360*k;
    const cw=widths?widths[i]:cards[i].caption.offsetWidth;small[i]={x,y,k,s:0,lx:cx-cw/2,ly:cy+300*k+9,dim:mix(.70,1,front)*edge,lc:(m?1-part(distance,.28,.76):1)*edge};}
  }else if(!m){const k=Math.min(w*.45/1450,.36),mini=Math.min(.115,w*.14/1200),activeHeight=k*650+20,row=mini*600+25;H=Math.max(430,activeHeight+2*row+36,brief.offsetHeight+48);let top=(H-activeHeight-2*row)/2;
   for(let i=0;i<3;i++){const active=i===selected,a=active?k:mini,x=active?2:12,y=top+5;
    small[i]={x,y,k:a,s:active?1:0,lx:active?x+70*a:x+1150*a+10,ly:active?y+635*a+3:y+350*a-22,dim:active?1:.78,lc:active?0:1};top+=active?activeHeight:row;}
  }else{const k=Math.min(w*.95/1460,.35),mini=Math.min(w*.24/1160,.091),x=(w-1460*k)/2,y=13;
   small[selected]={x,y,k,s:1,lx:5,ly:y+k*645,dim:1,lc:0};briefY=y+655*k+20;otherY=briefY+brief.offsetHeight+23;const listY=otherY+19;let row=0;
   for(let i=0;i<3;i++)if(i!==selected){const yy=listY+row++*68;small[i]={x:3,y:yy,k:mini,s:0,lx:13+1160*mini,ly:yy+310*mini-22,dim:.83,lc:1};}H=listY+row*68;}
  return{poses:small,H,briefY,otherY};}
 // The source is a wordless miniature page; the real heading is measured only at its destination.
 const plate={x:448,cy:369,width:212};
 function measureTitle(){
  line.style.transform='none';const r=line.getBoundingClientRect(),b=stage.getBoundingClientRect(),edge=receiver.getBoundingClientRect();
  const edgeX=edge.left-b.left,edgeY=edge.top-b.top;
  headingBox={x:r.left-b.left,y:r.top-b.top+r.height/2,w:r.width,scale:plate.width/Math.max(1,r.width),
   edgeStart:{x:edgeX,y:edgeY},edgeEnd:mobile.matches?{x:edgeX+edge.width,y:edgeY}:{x:edgeX,y:edgeY+edge.height}};
  liftUse.setAttribute('href',cards[selected].folio);lift.style.color=`color-mix(in srgb,${projects[selected].accent} 36%,#fff)`;
 }
 function trayPoint(v,x,y){const a=cards[selected].plane;return{x:v.x+(a.a*x+a.c*y+a.e+322*v.s)*v.k,y:v.y+(a.b*x+a.d*y+a.f-48*v.s)*v.k};}
 function placePanel(L){brief.style.top=mobile.matches?`${L.briefY}px`:'50%';q('#others').style.top=`${L.otherY}px`;}
 function draw(){stage.style.height=`${sceneH}px`;poses.forEach((v,i)=>{const c=cards[i],t=`translate(${322*v.s} ${-48*v.s})`;c.el.style.transform=`translate(${v.x}px,${v.y}px)`;c.el.style.zIndex=String(i===(reading?selected:centre)?3:1);c.art.style.transform=`scale(${v.k})`;c.art.style.opacity=v.dim;c.hit.style.cssText=`left:${62*v.k}px;top:${74*v.k}px;width:${(1075+322*v.s)*v.k}px;height:${580*v.k}px;pointer-events:${v.dim>.1?'auto':'none'}`;c.caption.style.transform=`translate(${v.lx-v.x}px,${v.ly-v.y}px)`;c.caption.style.opacity=v.lc;c.caption.style.visibility=v.lc>0?'visible':'hidden';c.caption.style.pointerEvents=v.lc>.5?'auto':'none';for(const n of c.moving)n.setAttribute('transform',t);for(const n of c.inside)n.setAttribute('opacity',clamp(v.s*18));});
  // These lights belong to the mechanism, not the projected brief. Follow its travel both ways.
  poses.forEach((v,i)=>{const power=part(v.s,.06,.73);cards[i].chamber.style.opacity=.77*power;cards[i].strip.style.opacity=.79*power;});
  const v=poses[selected],h=headingBox,f=info.flight,resolve=part(f,.36,.69);
  const projected=reading;
  if(h&&!projected){const destY=mobile.matches?h.y:h.y+(sceneH-(transition?.measureH??sceneH))/2;const source=trayPoint(v,plate.x,plate.cy),dx=source.x-h.x,dy=source.y-destY;const z=1-f,sc=h.scale*v.k;line.style.transform=z>.001?`translate(${dx*z}px,${dy*z}px) skewY(${-8.475*z}deg) scale(${mix(1,sc,z)})`:'none';
   const scale=mix(1.14*v.k,h.w/188,f);liftUse.setAttribute('transform',`translate(${mix(source.x,h.x,f)} ${mix(source.y,destY,f)}) skewY(${-8.475*z}) scale(${scale}) translate(0 -52)`);}
  if(projected)line.style.transform='none';
  lift.style.opacity=!projected&&reading&&!reduce.matches?info.name*part(f,0,.16)*(1-resolve):0;
  line.style.opacity=projected&&transition?part(transition.progress??1,.74,.91):info.name*resolve;for(const n of brief.querySelectorAll('.brief-rest'))n.style.opacity=info.reveal;q('#others').style.opacity=mobile.matches?info.others:0;
  paintProjection(v,h);
 }
 function paintProjection(v,h){
  const active=reading&&!reduce.matches&&h&&['opening','switching'].includes(transition?.kind);
  const p=active?transition.progress:0;
  const lit=reading,charge=active?part(p,.26,.39)*part(v.s,.55,.83):0;
  const settle=active?part(p,.70,.94):1;
  const inkLevel=lit?(active?charge*mix(.95,.50,part(info.flight,.06,.73)):.50):0;
  const washLevel=lit?(active?charge*mix(.72,.25,settle):.25):0;
  const rest=mobile.matches?.22:.25;
  const intensity=lit?(active?charge*part(p,.47,.62)*mix(.78,rest,settle):rest):0;
  cards.forEach((c,i)=>{const ink=i===selected?inkLevel:0;c.imprint.style.opacity=ink;c.printLevel=printLevel(ink);c.wash.style.opacity=i===selected?washLevel:0;if(c.posterPrint)c.posterPrint.style.opacity=c.printLevel;});light.style.opacity=intensity;
  const modern=lit;
  line.style.textShadow=!modern&&active&&info.flight>.36&&info.flight<.8?`0 0 ${.12*(1-info.flight)}em var(--accent)`:'none';
  brief.style.setProperty('--edge-strength',reading?String(.28*info.reveal):'0');
  brief.style.setProperty('--receiving-light',String(.10*intensity*part(p,.65,.78)));
  // The arrival point and the clip of the lit rail use the SAME station on the
  // receiver. A 100% CSS line alone would still leave a short triangle above it.
  const catchUp=active?part(p,.70,.90):1;
  if(modern){brief.style.setProperty('--edge-tip',`${100*catchUp}%`);brief.style.setProperty('--uncaught',`${100*(1-catchUp)}%`);brief.style.setProperty('--edge-opacity',active?String(part(p,.70,.75)*mix(.99,.78,part(p,.88,1))):'.78');brief.style.setProperty('--edge-flash',active?String(Math.sin(Math.PI*catchUp)): '0');}
  if(!h||(!intensity&&!(optics&&active&&charge))){optics?.hide();return;}
  // The origin spans the drawing; the receiving edge ends outside the selectable brief.
  const m=mobile.matches;let A=m?trayPoint(v,515,382):trayPoint(v,530,325),B=m?trayPoint(v,592,382):trayPoint(v,591,407);
  // The highlight and opening aperture have one source: the actual first bold
  // ink stroke. The runtime accounts for drawer, cap, hover and camera pose.
  if(optics){
   const sweep=active&&p>=.32&&p<.54?part(p,.32,.54):null;
   const source=optics.source(cards[selected],projects[selected].molecule,v,sweep,body.dataset.case==='poster');
   if(source){const [left,tip]=source,spread=active?part(p,.53,.74):1,heel={x:mix(tip.x,left.x,spread),y:mix(tip.y,left.y,spread)};A=m?heel:tip;B=m?tip:heel;}
  }
  // Measure the rule once per layout. The desktop brief stays centred as the stage changes height.
  const offsetY=m?0:(sceneH-(transition?.measureH??sceneH))/2,reach=active?(modern?part(p,.53,.70):part(p,.47,.77)):1;
  const x1=mix(A.x,h.edgeStart.x,reach),y1=mix(A.y,h.edgeStart.y+offsetY,reach);
  const farReach=modern&&active?part(p,.55,.90):reach;
  const x2=mix(B.x,h.edgeEnd.x,farReach),y2=mix(B.y,h.edgeEnd.y+offsetY,farReach);
  // The near side arrives first. While the far side is still in flight, a fifth
  // vertex travels down/across the box with the end of the receiving highlight.
  const landing=modern&&active&&reach===1&&farReach<1?{x:mix(h.edgeStart.x,h.edgeEnd.x,catchUp),y:mix(h.edgeStart.y,h.edgeEnd.y,catchUp)+offsetY}:null;
  front.style.opacity=!modern&&active?1-settle:0;inner.style.opacity=modern?'0':mix(.40,.12,settle);
  light.style.color=projects[selected].accent;
  const coords=(el,a,b,c,d)=>{el.setAttribute('x1',a);el.setAttribute('y1',b);el.setAttribute('x2',c);el.setAttribute('y2',d)};
  coords(ink,(A.x+B.x)/2,(A.y+B.y)/2,(x1+x2)/2,(y1+y2)/2);coords(front,x1,y1,x2,y2);
  fan.setAttribute('points',`${A.x},${A.y} ${x1},${y1} ${landing?`${landing.x},${landing.y} `:''}${x2},${y2} ${B.x},${B.y}`);
  inner.setAttribute('points',`${mix(A.x,B.x,.23)},${mix(A.y,B.y,.23)} ${mix(x1,x2,.185)},${mix(y1,y2,.185)} ${mix(x1,x2,.68)},${mix(y1,y2,.68)} ${mix(A.x,B.x,.78)},${mix(A.y,B.y,.78)}`);
  optics?.update({a:A,b:B,c:landing??{x:x1,y:y1},d:{x:x2,y:y2},opening:!!active,reach:(reach+farReach)/2,project:selected});
 }
 function snapshot(){return{poses:poses.map(v=>({...v})),H:sceneH,info:{...info}};}
 function finish(){const t=transition;transition=null;handle=0;poses=t.end.poses;sceneH=t.end.H;info=reading?{flight:1,name:1,reveal:1,others:1}:{flight:0,name:0,reveal:0,others:0};placePanel(t.end);stage.style.height=`${sceneH}px`;measureTitle();draw();body.dataset.phase=reading?'reading':'gallery';body.dataset.progress='1';if(t.kind==='closing')cards[centre].el.focus({preventScroll:true});q('#announce').textContent=reading?`${projects[selected].name}. ${projects[selected].title}`:`${projects[centre].name} centred.`;}
 function render(now){if(!transition)return;const t=transition,p=clamp((now-stamp)/t.duration),start=t.start,end=t.end,kind=t.kind;t.progress=p;body.dataset.progress=p.toFixed(4);sceneH=mix(start.H,end.H,part(p,.12,.88));
  poses=start.poses.map((a,i)=>{const b=end.poses[i];if(kind==='opening'&&i===selected){const s=part(p,0,.52),dock=part(p,.23,.76),v=blend(a,b,dock);v.x=mix(a.x-322*(1-a.s)*a.k*s,b.x,dock);v.y=mix(a.y+48*(1-a.s)*a.k*s,b.y,dock);v.s=mix(a.s,1,s);return v;}

   if(kind==='switching'){const v=blend(a,b,part(p,0,.58));v.s=mix(a.s,b.s,part(p,.04,.50));return v;}
   return blend(a,b,kind==='opening'?part(p,.27,.76):kind==='closing'?part(p,.12,.97):part(p,0,1));});
  if(kind==='opening')info={flight:part(p,.59,.92),name:part(p,.35,.48),reveal:part(p,.76,.97),others:part(p,.75,1)};
  else if(kind==='switching')info={flight:part(p,.56,.91),name:part(p,.25,.42),reveal:part(p,.75,1),others:1};
  else if(kind==='closing')info={flight:start.info.flight*(1-part(p,0,.48)),name:start.info.name*(1-part(p,.17,.46)),reveal:start.info.reveal*(1-part(p,0,.25)),others:start.info.others*(1-part(p,0,.24))};
  // Fade the chosen caption before the tray projects; the other choices keep their labels.
  if(reading)poses[selected].lc=start.poses[selected].lc*(1-part(p,.03,.21));
  draw();if(p>=1)finish();else handle=requestAnimationFrame(render);}
 function run(kind,time){cancelAnimationFrame(handle);prepareFace();const start=snapshot(),end=layout(reading);if(kind!=='closing')placePanel(end);stage.style.height=`${end.H}px`;measureTitle();transition={kind,start,end,duration:time,measureH:end.H};body.dataset.phase=kind;stamp=performance.now();if(reduce.matches)finish();else render(stamp);}
 function choose(i){if(reading&&i===selected)return;const was=reading;selected=i;reading=true;requestOptics();writeProject(i);controls();run(was?'switching':'opening',was?1000:1460);}
 function close(){if(!reading)return;reading=false;centre=selected;controls();run('closing',860);}
 function scrollTrack(now){const t=transition;if(t?.kind!=='browsing')return;
  const dt=Math.min(.05,Math.max(0,(now-t.last)/1000));t.last=now;const gap=t.target-t.position;
  const step=Math.min(7*dt,Math.abs(gap)*(-Math.expm1(-16*dt)));t.position+=Math.sign(gap)*step;
  if(Math.abs(t.target-t.position)<.003){t.end=layout(false,centre,t.widths);finish();return;}
  poses=layout(false,t.position,t.widths).poses;draw();handle=requestAnimationFrame(scrollTrack);
 }
 function browse(d){if(reading||transition?.kind==='closing')return;
  // Retarget the running loop; never restart three independent tweens from in-between slots.
  if(transition?.kind!=='browsing')transition={kind:'browsing',position:centre,target:centre,last:performance.now(),widths:cards.map(c=>c.caption.offsetWidth)};
  const t=transition;t.target+=d;const gap=t.target-t.position;
  if(Math.abs(gap)>count)t.target-=Math.sign(gap)*count; // drop obsolete full laps, not the requested destination
  centre=wrap(t.target);controls();body.dataset.phase='browsing';body.dataset.progress='0';
  if(reduce.matches){t.end=layout(false);finish();}else if(!handle)handle=requestAnimationFrame(scrollTrack);
 }
 function snap(){cancelAnimationFrame(handle);controls();transition={end:layout(reading),kind:'resize'};finish();}

 // A delayed first draw or genuine failure can change the active source while
 // the brief is already open (including a static reduced-motion frame).
 const caseChanges=new MutationObserver(records=>{if(reading&&optics&&records.some(r=>r.oldValue!==body.dataset.case))paintProjection(poses[selected],headingBox);});caseChanges.observe(body,{attributes:true,attributeFilter:['data-case'],attributeOldValue:true});

 cards.forEach((c,i)=>c.el.addEventListener('click',()=>choose(i)));back.addEventListener('click',close);const arrows=q('#browse').querySelectorAll('button');arrows[0].onclick=()=>browse(-1);arrows[1].onclick=()=>browse(1);
 body.addEventListener('keydown',e=>{if(e.key==='Escape'&&reading){e.preventDefault();close();return;}if(!Object.values(cards).some(c=>c.el===root.activeElement))return;const dir=({'ArrowLeft':-1,'ArrowRight':1,'ArrowUp':-1,'ArrowDown':1})[e.key];if(!dir)return;e.preventDefault();if(reading){const i=wrap(selected+dir);choose(i);cards[i].el.focus({preventScroll:true});}else{browse(dir);cards[centre].el.focus({preventScroll:true});}});
 let gesture=null,blockClick=false;stage.addEventListener('pointerdown',e=>{gesture=!reading&&e.pointerType==='touch'?{x:e.clientX,y:e.clientY}:null;});stage.addEventListener('pointerup',e=>{if(!gesture)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;if(Math.abs(dx)>42&&Math.abs(dx)>1.4*Math.abs(dy)){blockClick=true;browse(dx<0?1:-1);setTimeout(()=>blockClick=false,400);}});stage.addEventListener('pointercancel',()=>gesture=null);stage.addEventListener('click',e=>{if(blockClick){e.preventDefault();e.stopPropagation();} },true);
 let lastWidth=0;const sizeObserver=new ResizeObserver(()=>{if(stage.clientWidth!==lastWidth){lastWidth=stage.clientWidth;snap();}});sizeObserver.observe(stage);reduce.addEventListener('change',()=>{if(reduce.matches)snap()},{signal});
 writeProject(selected);controls();snap();host.setAttribute('data-mounted','');document.fonts.ready.then(()=>{if(!signal.aborted&&!transition)snap()});
 signal.addEventListener('abort',()=>{cancelAnimationFrame(handle);sizeObserver.disconnect();caseChanges.disconnect();root.replaceChildren();host.removeAttribute('data-mounted');},{once:true});
 // Keep Three and the GLB off the critical path until the section is approached.
 import('./runtime.js').then(async m=>{
   if(signal.aborted)return;
   const assets=await m.prepare(projects);
   if(!signal.aborted)await m.mount(cards,projects,applyPosterPrints,assets,body,signal);
 }).catch(()=>{if(!signal.aborted){body.dataset.case='poster';applyPosterPrints();}});
}
