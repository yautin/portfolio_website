// One light sheet. The gallery owns the mechanical timeline; the only independent
// clock is the faint, slow shimmer after the brief has settled.
import {printStroke} from './engraving-registration.js';
const ns='http://www.w3.org/2000/svg',clamp=t=>Math.max(0,Math.min(1,t)),mix=(a,b,t)=>a+(b-a)*t;
const blend=(a,b,t)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)}),xy=p=>`${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
function node(parent,tag,attrs){const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));parent.append(n);return n;}
export function attachProjection(light,brief,stage,reduce,signal){
 const field=node(light,'g',{'aria-hidden':'true'}),defs=light.querySelector('defs');
 const veil=node(defs,'linearGradient',{id:'projection-afterglow',gradientUnits:'userSpaceOnUse'});
 for(const [offset,opacity] of [[0,0],[.64,.09],[.89,.27],[1,.48]])node(veil,'stop',{offset,'stop-color':'currentColor','stop-opacity':opacity});
 const tail=node(field,'path',{fill:'url(#projection-afterglow)'}),lip=node(field,'path',{fill:'none',stroke:'#e8edff','stroke-linecap':'round'});
 let state=null,clock=0,raf=0,previous=null,onscreen=true,project=-1;
 function ambient(){return state&&!state.opening&&!reduce.matches&&!document.hidden&&onscreen;}
 function wake(){if(ambient()&&!raf)raf=requestAnimationFrame(tick);}
 function stop(){cancelAnimationFrame(raf);raf=0;previous=null;}
 function tick(now){raf=0;if(!ambient()){previous=null;return;}if(previous===null)previous=now;const dt=now-previous;if(dt>=32){clock=(clock+Math.min(dt,80)/5400)%1;previous=now;paint();}wake();}
 function paint(){if(!state)return;const {a,b,c,d,opening,reach}=state;const at=(t,u)=>blend(blend(a,c,t),blend(b,d,t),u);
  // At release the brighter leading edge is also the actual limit of the fan.
  // At rest, a single quiet optical reflection replaces the travelling ribbons.
  const t=opening?1:(clock+.58)%1;
  // Fade only at the loop seam: fading throughout the second half makes the
  // reflection disappear before the reader ever sees it reach the receiving edge.
  const strength=opening?Math.sin(Math.PI*reach):.48*clamp(t/.15)*clamp((1-t)/.075);
  const end0=at(t,0),end1=at(t,1),bow=opening?0:.043*Math.sin(t*Math.PI),mid=at(t+bow,.5),back=Math.max(0,t-(opening?.32:.21));
  const lead=`M${xy(end0)} Q${xy(mid)} ${xy(end1)}`;
  lip.setAttribute('d',lead);lip.setAttribute('stroke-width',opening?1.35:.8);lip.style.opacity=clamp(strength)*(opening?.95:.7);
  tail.setAttribute('d',`${lead} L${xy(at(back,1))} Q${xy(at(back+bow,.5))} ${xy(at(back,0))} Z`);tail.style.opacity=clamp(strength)*(opening?1.25:.62);
  const origin=at(back,.5),end=at(t,.5);for(const [k,v] of Object.entries({x1:origin.x,y1:origin.y,x2:end.x,y2:end.y}))veil.setAttribute(k,v);
 }
 const motionChange=()=>{if(ambient())wake();else stop();};document.addEventListener('visibilitychange',motionChange,{signal});reduce.addEventListener('change',motionChange,{signal});const observer=new IntersectionObserver(es=>{onscreen=es[0].isIntersecting;motionChange();});observer.observe(stage);signal.addEventListener('abort',()=>{stop();observer.disconnect();},{once:true});
 function update(next){if(project!==next.project){project=next.project;clock=0;}state=next;brief.dataset.hologram='on';field.style.display='';paint();motionChange();}
 function hide(){state=null;project=-1;stop();field.style.display='none';delete brief.dataset.hologram;}
 // The fallback trace is inside the same clipped SVG surface as its print, not
 // in a page overlay. The live renderer supplies the depth-tested equivalent.
 let last=null;function release(){if(!last)return;const {card,points}=last;card.projectStroke?.(points,null);if(card.posterTrace)card.posterTrace.style.opacity='0';last=null;}
 function source(card,name,pose,sweep,poster){if(last&&last.card!==card)release();const points=printStroke(name);last={card,points};
  if(!poster&&card.projectStroke){const local=card.projectStroke(points,sweep);return local?.map(p=>({x:pose.x+p.x*pose.k,y:pose.y+p.y*pose.k}));}
  if(!poster||!card.posterPrint)return null;const image=card.posterPrint,q=k=>image[k].baseVal.value;
  const seg=points.map(({u,v})=>({x:q('x')+u*q('width'),y:q('y')+v*q('height')}));
  if(sweep!==null||card.posterTrace){const n=card.posterTrace??=node(image.parentNode,'line',{'stroke-width':5,stroke:'#f4f6ff','stroke-linecap':'round'});n.style.opacity=sweep===null?0:Math.sin(Math.PI*sweep)**.5;if(sweep!==null){const a=blend(...seg,Math.max(0,sweep-.24)),b=blend(...seg,sweep);for(const [k,v] of Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y}))n.setAttribute(k,v);}}
  const m=card.plane;return seg.map(({x,y})=>({x:pose.x+(m.a*x+m.c*y+m.e+322*pose.s)*pose.k,y:pose.y+(m.b*x+m.d*y+m.f-48*pose.s)*pose.k}));
 }
 return {update,source,hide(){release();hide();}};
}
