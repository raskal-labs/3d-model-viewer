// Gesture-first camera navigation. All coordinates are CSS pixels.
export function createGestureNavigation(api) {
  const $=id=>document.getElementById(id);
  const button=$('precisionButton'),menu=$('precisionMenu'),instrument=$('precisionInstrument');
  const surface=$('precisionSurface'),undo=$('undoCamera'),clutchStatus=$('clutchStatus');
  const zoomBox=$('precisionZoom'),zoomSlider=$('precisionZoomSlider');
  const names=['orbit','pan','roll','zoom','clutch'];
  const hints={orbit:'Drag the rocker to orbit.',pan:'Drag the pad to pan.',roll:'Touch, move outward, then turn. Wider arcs are finer.',zoom:'Slide to move the camera closer or farther.'};
  const icons={orbit:'<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c-4 4-4 12 0 16M12 4c4 4 4 12 0 16"/>',pan:'<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',roll:'<path d="M20 12a8 8 0 1 1-2-5M18 3v5h-5"/>',zoom:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M7 10h6M10 7v6"/>',clutch:'<circle cx="12" cy="12" r="8"/><path d="M9 8v8M15 8v8"/>'};
  const feedback=()=>{try{navigator.vibrate?.(8);}catch{}};
  // The menu is arranged in a full circle; selection uses a directional sector.
  const directions=names.map((name,i)=>({name,angle:-Math.PI/2+i*Math.PI*2/names.length}));
  for(const {name,angle} of directions){
    const el=document.createElement('button');el.type='button';el.role='menuitem';el.dataset.mode=name;
    el.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg><span>${name[0].toUpperCase()+name.slice(1)}</span>`;el.setAttribute('aria-label',name);el.style.setProperty('--x',`${Math.cos(angle)*82}px`);el.style.setProperty('--y',`${Math.sin(angle)*82}px`);menu.append(el);
  }
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  let lastMode=null,clutched=false,buttonPointer=null,holdTimer=null,dwellTimer=null,selected=null,persistent=false;
  let toolPointer=null,toolState=null,transaction=null,zoomActive=false;
  const pointers=new Map(), history=[];
  let pair=null,single=null;
  function begin(){if(!transaction){transaction=api.getView();if(transaction)api.onManual();}}
  function finish(){if(!transaction)return;const after=api.getView();if(after&&JSON.stringify(transaction)!==JSON.stringify(after)){history.push(transaction);if(history.length>50)history.shift();undo.disabled=false;}transaction=null;}
  undo.onclick=()=>{if(!history.length)return;api.applyView(history.pop());undo.disabled=!history.length;};
  $('quickReset').onclick=()=>{begin();api.reset();finish();};
  function update(){
    if(instrument.hidden)return;
    const v=api.getView();if(!v)return;
    if(lastMode==='zoom'&&!zoomActive){const {min,max}=api.getZoomLimits();zoomSlider.value=String(Math.round(1000*Math.log(max/v.distance)/Math.log(max/min)));}
    $('precisionValue').textContent=lastMode==='orbit'?`Yaw ${v.yaw.toFixed(1)}° · Pitch ${v.pitch.toFixed(1)}°`:lastMode==='pan'?`Target ${v.target.map(n=>n.toFixed(2)).join(' / ')}`:lastMode==='roll'?`Roll ${v.roll.toFixed(1)}°`:`Distance ${v.distance.toFixed(3)}`;
  }
  function hideMenu(){button.classList.remove('is-active');clearTimeout(dwellTimer);dwellTimer=null;selected=null;menu.style.opacity='';menu.hidden=true;button.setAttribute('aria-expanded','false');for(const b of menu.children)b.classList.remove('selected');}
  function releaseClutch(){clutched=false;clutchStatus.hidden=true;}
  function showMenu(x,y,isPersistent){
    instrument.hidden=true;persistent=isPersistent;menu.hidden=false;button.classList.add('is-active');button.setAttribute('aria-expanded','true');
    const size=240,margin=8,topInset=8;
    menu.style.left=clamp(x-size/2,margin,Math.max(margin,innerWidth-size-margin))+'px';
    menu.style.top=clamp(y-size/2,topInset,Math.max(topInset,innerHeight-size-margin))+'px';
    const box=menu.getBoundingClientRect();if(buttonPointer){buttonPointer.centerX=box.left+size/2;buttonPointer.centerY=box.top+size/2;}
  }
  function openInstrument(mode){
    hideMenu();if(!hints[mode])return;lastMode=mode;instrument.hidden=false;instrument.dataset.mode=mode;button.classList.add('is-active');
    surface.hidden=mode==='zoom';zoomBox.hidden=mode!=='zoom';feedback();
    $('precisionTitle').textContent=mode[0].toUpperCase()+mode.slice(1);$('precisionHint').textContent=hints[mode];update();
  }
  $('closePrecision').onclick=()=>{instrument.hidden=true;button.classList.remove('is-active');};
  function choose(name){
    if(name===selected)return;selected=name;if(name)feedback();clearTimeout(dwellTimer);dwellTimer=null;
    for(const el of menu.children)el.classList.toggle('selected',el.dataset.mode===name);
    if(name==='clutch' && buttonPointer){
      dwellTimer=setTimeout(()=>{if(selected==='clutch'&&buttonPointer){clutched=true;clutchStatus.hidden=false;if(buttonPointer.menuClutch){menu.style.opacity='.35';}else{hideMenu();button.classList.add('is-active');}}},80);
    }
  }
  button.addEventListener('pointerdown',e=>{
    if(e.button!==0||buttonPointer)return;e.preventDefault();button.classList.add('is-active');button.setPointerCapture(e.pointerId);
    buttonPointer={id:e.pointerId,x:e.clientX,y:e.clientY,shown:false};
    holdTimer=setTimeout(()=>{if(buttonPointer){buttonPointer.shown=true;showMenu(buttonPointer.x,buttonPointer.y,false);}},250);
  });
  button.addEventListener('pointermove',e=>{
    if(!buttonPointer||e.pointerId!==buttonPointer.id||!buttonPointer.shown||clutched)return;
    if(Math.hypot(e.clientX-buttonPointer.x,e.clientY-buttonPointer.y)<10)return;
    const dx=e.clientX-buttonPointer.centerX,dy=e.clientY-buttonPointer.centerY,r=Math.hypot(dx,dy);
    if(r<40){choose(null);return;}
    const a=Math.atan2(dy,dx);let nearest=directions[0];
    for(const item of directions)if(Math.abs(angleDelta(a,item.angle))<Math.abs(angleDelta(a,nearest.angle)))nearest=item;
    choose(nearest.name==='clutch'&&r<56?null:nearest.name);
  });
  function buttonEnd(e,cancelled=false){
    if(!buttonPointer||e.pointerId!==buttonPointer.id)return;clearTimeout(holdTimer);
    const state=buttonPointer,choice=selected;buttonPointer=null;
    if(clutched){releaseClutch();hideMenu();return;}
    if(cancelled){hideMenu();return;}
    if(state.shown){if(choice&&choice!=='clutch')openInstrument(choice);else hideMenu();}
    else if(lastMode)openInstrument(lastMode);else showMenu(state.x,state.y,true);
  }
  button.addEventListener('pointerup',e=>buttonEnd(e));
  for(const type of ['pointercancel','lostpointercapture'])button.addEventListener(type,e=>buttonEnd(e,true));
  // In the persistent menu Clutch is momentary, held directly on its sector.
  for(const el of menu.children){
    el.addEventListener('pointerdown',e=>{
      if(!persistent)return;e.preventDefault();e.stopPropagation();
      if(el.dataset.mode!=='clutch'){openInstrument(el.dataset.mode);return;}
      el.setPointerCapture(e.pointerId);buttonPointer={id:e.pointerId,menuClutch:true};
      choose('clutch');
    });
    const end=e=>{if(buttonPointer?.menuClutch&&buttonPointer.id===e.pointerId){clearTimeout(dwellTimer);buttonPointer=null;releaseClutch();hideMenu();}};
    for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,end);
  }
  document.addEventListener('pointerdown',e=>{
    if(!menu.hidden&&persistent&&!buttonPointer?.menuClutch&&!menu.contains(e.target)&&e.target!==button)hideMenu();
    if(!instrument.hidden&&!instrument.contains(e.target)&&e.target!==button&&e.target!==surface){instrument.hidden=true;button.classList.remove('is-active');}
  },true);
  // Reset initial reference points whenever the set of viewport fingers changes.
  function rebase(){
    const points=[...pointers.values()].slice(0,2);single=null;pair=null;
    if(points.length===1)single={x:points[0].x,y:points[0].y,active:false};
    if(points.length===2){
      const [a,b]=points,dx=b.x-a.x,dy=b.y-a.y;
      pair={cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,dist:Math.hypot(dx,dy),angle:Math.atan2(dy,dx),panX:0,panY:0,scale:0,rotation:0,panOn:false,scaleOn:false,rollOn:false};
    }
  }
  function excess(value,threshold){return Math.sign(value)*Math.max(0,Math.abs(value)-threshold);}
  api.canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0||pointers.size>=2||!api.getView())return;
    e.preventDefault();if(pointers.size)flushMoves();api.canvas.setPointerCapture(e.pointerId);if(!pointers.size)begin();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});rebase();
  });
  let pendingFrame=0;
  function flushMoves(){
    if(pendingFrame){cancelAnimationFrame(pendingFrame);pendingFrame=0;}
    const multiplier=clutched?.1:1,points=[...pointers.values()];
    if(points.length===1&&single){
      const p=points[0];let dx=p.x-single.x,dy=p.y-single.y;
      if(!single.active){const length=Math.hypot(dx,dy);if(length<=4)return;const factor=(length-4)/length;dx*=factor;dy*=factor;single.active=true;}
      single.x=p.x;single.y=p.y;api.orbit(dx*multiplier,dy*multiplier);
    } else if(points.length===2&&pair){
      const [a,b]=points,dx=b.x-a.x,dy=b.y-a.y,cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,dist=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
      let px=cx-pair.cx,py=cy-pair.cy,scale=dist>=30&&pair.dist>=30?Math.log(dist/pair.dist):0,rot=dist>=30&&pair.dist>=30?angleDelta(angle,pair.angle):0;
      pair.cx=cx;pair.cy=cy;pair.dist=dist;pair.angle=angle;
      if(!pair.panOn){pair.panX+=px;pair.panY+=py;const d=Math.hypot(pair.panX,pair.panY);if(d>2.5){px=pair.panX*(d-2.5)/d;py=pair.panY*(d-2.5)/d;pair.panOn=true;}else px=py=0;}
      if(!pair.scaleOn){pair.scale+=scale;if(Math.abs(pair.scale)>Math.log(1.012)){scale=excess(pair.scale,Math.log(1.012));pair.scaleOn=true;}else scale=0;}
      if(!pair.rollOn){pair.rotation+=rot;if(Math.abs(pair.rotation)>Math.PI/120){rot=excess(pair.rotation,Math.PI/120);pair.rollOn=true;}else rot=0;}
      if(px||py)api.pan(px*multiplier,py*multiplier);
      if(scale)api.zoom(Math.exp(-scale*multiplier));
      if(rot)api.rollBy(rot*multiplier);
    }
  }
  api.canvas.addEventListener('pointermove',e=>{
    const p=pointers.get(e.pointerId);if(!p)return;e.preventDefault();p.x=e.clientX;p.y=e.clientY;
    if(!pendingFrame)pendingFrame=requestAnimationFrame(flushMoves);
  });
  function endViewport(e){if(!pointers.has(e.pointerId))return;flushMoves();pointers.delete(e.pointerId);if(!pointers.size)finish();rebase();}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])api.canvas.addEventListener(type,endViewport);
  surface.addEventListener('pointerdown',e=>{
    if(toolPointer!==null||e.button!==0||!api.getView())return;e.preventDefault();e.stopPropagation();
    toolPointer=e.pointerId;toolState={x:e.clientX,y:e.clientY,anchorX:e.clientX,anchorY:e.clientY,armed:false,angle:0};
    surface.setPointerCapture(e.pointerId);begin();
  });
  surface.addEventListener('pointermove',e=>{
    if(e.pointerId!==toolPointer)return;e.preventDefault();const s=toolState,dx=e.clientX-s.x,dy=e.clientY-s.y;s.x=e.clientX;s.y=e.clientY;
    if(lastMode==='orbit')api.orbit(dx*.2,dy*.2);
    else if(lastMode==='pan')api.pan(dx*.2,dy*.2);
    else{
      const x=e.clientX-s.anchorX,y=e.clientY-s.anchorY,r=Math.hypot(x,y),a=Math.atan2(y,x);
      if(r<28){s.armed=false;return;}if(!s.armed){s.armed=true;s.angle=a;return;}
      const d=angleDelta(a,s.angle),gain=clamp(Math.pow(72/r,1.4),.15,2.5);s.angle=a;
      if(d){if(lastMode==='roll')api.rollBy(d*gain);else api.zoom(Math.exp(-.35*d*gain));}
    }update();
  });
  function endTool(e){if(e.pointerId!==toolPointer)return;toolPointer=null;toolState=null;finish();}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,endTool);
  // The slider maps evenly in log distance so the whole zoom range is usable.
  zoomSlider.addEventListener('pointerdown',()=>{if(!api.getView())return;zoomActive=true;begin();});
  zoomSlider.addEventListener('input',()=>{
    if(!api.getView())return;if(!zoomActive)begin();
    const {min,max}=api.getZoomLimits(),t=Number(zoomSlider.value)/1000;
    api.setDistance(max*Math.exp(-t*Math.log(max/min)));update();
    if(!zoomActive)finish();
  });
  function endZoom(){if(!zoomActive)return;zoomActive=false;finish();update();}
  for(const event of ['pointerup','pointercancel','lostpointercapture','change'])zoomSlider.addEventListener(event,endZoom);
  function cancel(){clearTimeout(holdTimer);clearTimeout(dwellTimer);buttonPointer=null;releaseClutch();hideMenu();if(zoomActive){zoomActive=false;finish();}if(toolPointer!==null){toolPointer=null;toolState=null;finish();}if(pointers.size){flushMoves();pointers.clear();finish();rebase();}}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
  addEventListener('blur',cancel);addEventListener('resize',cancel);
  function clearHistory(){history.length=0;undo.disabled=true;transaction=null;}
  return {update,clearHistory};
}
