import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto('http://127.0.0.1:8765/gesture-navigation.js');
 await page.setContent(`<canvas id="canvas"></canvas><button id="precisionButton"></button><button id="undoCamera"></button><button id="quickReset"></button><div id="precisionMenu" hidden></div><section id="precisionInstrument" hidden><b id="precisionTitle"></b><p id="precisionHint"></p><output id="precisionValue"></output><button id="closePrecision"></button><div id="precisionSurface"></div><div id="precisionZoom" hidden><input id="precisionZoomSlider" type="range" min="0" max="1000"></div></section><output id="clutchStatus" hidden>clutch</output>`);
 await page.evaluate(async()=>{
  Element.prototype.setPointerCapture=function(){};
  const {createGestureNavigation}=await import('/gesture-navigation.js');
  window.v={yaw:0,pitch:0,roll:0,distance:10,target:[0,0,0],position:[0,0,10]};window.calls=[];
  const api={canvas:document.querySelector('canvas'),getView:()=>structuredClone(window.v),applyView:v=>{window.v=structuredClone(v)},getAngles:()=>window.v,
   orbit:(x,y)=>{window.v.yaw+=x;window.v.pitch+=y;window.calls.push(['orbit',x,y])},pan:(x,y)=>{window.v.target[0]+=x;window.v.target[1]+=y;window.calls.push(['pan',x,y])},
   getZoomLimits:()=>({min:1,max:100}),setDistance:d=>{window.v.distance=d},zoom:f=>{window.v.distance*=f;window.calls.push(['zoom',f])},rollBy:a=>{window.v.roll+=a;window.calls.push(['roll',a])},reset:()=>{},onManual:()=>{}};
  window.nav=createGestureNavigation(api);
  window.send=(id,type,x,y,pointerId=1)=>document.getElementById(id).dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId,clientX:x,clientY:y,button:0}));
 });
 const send=(...args)=>page.evaluate(args=>window.send(...args),args);
 await send('canvas','pointerdown',100,100,1);await send('canvas','pointermove',130,100,1);await send('canvas','pointerup',130,100,1);
 assert.equal(await page.evaluate(()=>window.v.yaw),26);assert.equal(await page.locator('#undoCamera').isEnabled(),true);
 await page.locator('#undoCamera').click();assert.equal(await page.evaluate(()=>window.v.yaw),0);
 await page.evaluate(()=>window.calls=[]);
 await send('canvas','pointerdown',100,100,1);await send('canvas','pointerdown',200,100,2);
 await send('canvas','pointermove',95,100,1);await send('canvas','pointermove',205,100,2);
 await page.waitForTimeout(30);assert(await page.evaluate(()=>window.calls.some(c=>c[0]==='zoom')));assert.equal(await page.evaluate(()=>window.calls.some(c=>c[0]==='roll')),false);
 await send('canvas','pointerup',95,100,1);await send('canvas','pointerup',205,100,2);
 await send('precisionButton','pointerdown',195,800,8);await send('precisionButton','pointerup',195,800,8);
 assert.equal(await page.locator('#precisionMenu').isVisible(),true);
 await page.locator('[data-mode="clutch"]').dispatchEvent('pointerdown',{pointerId:9,button:0,bubbles:true});
 await page.waitForTimeout(110);assert.equal(await page.locator('#clutchStatus').isVisible(),true);
 await page.evaluate(()=>{window.calls=[]});await send('canvas','pointerdown',100,100,3);await send('canvas','pointermove',134,100,3);await send('canvas','pointerup',134,100,3);
 assert(Math.abs(await page.evaluate(()=>window.calls.find(c=>c[0]==='orbit')[1])-3)<.001,'clutch reduces sensitivity');
 await page.locator('[data-mode="clutch"]').dispatchEvent('pointerup',{pointerId:9,button:0,bubbles:true});
 assert.equal(await page.locator('#clutchStatus').isVisible(),false);
 await send('precisionButton','pointerdown',195,800,8);await send('precisionButton','pointerup',195,800,8);
 await page.locator('[data-mode="roll"]').dispatchEvent('pointerdown',{pointerId:9,button:0,bubbles:true});
 assert.equal(await page.locator('#precisionInstrument').isVisible(),true);
 await page.evaluate(()=>window.calls=[]);
 await send('precisionSurface','pointerdown',100,100,1);await send('precisionSurface','pointermove',140,100,1);await send('precisionSurface','pointermove',180,100,1);
 assert.equal(await page.evaluate(()=>window.calls.length),0,'radial movement must not roll');
 await send('precisionSurface','pointermove',180,130,1);assert(await page.evaluate(()=>window.calls.some(c=>c[0]==='roll')));
 await send('precisionSurface','pointerup',180,130,1);
 await page.locator('#closePrecision').click();
 await send('precisionButton','pointerdown',195,400,18);await page.waitForTimeout(275);
 const center=await page.locator('#precisionMenu').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.left+120,y:r.top+120};});
 await send('precisionButton','pointermove',center.x-50,center.y+70,18);
 await send('precisionButton','pointerup',center.x-50,center.y+70,18);
 assert.equal(await page.locator('#precisionZoomSlider').isVisible(),true,'zoom uses a slider');
 const distanceBefore=await page.evaluate(()=>window.v.distance);
 await page.locator('#precisionZoomSlider').evaluate(el=>{el.value='800';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.notEqual(await page.evaluate(()=>window.v.distance),distanceBefore,'slider changes camera distance');
 console.log('Gesture tests passed: orbit, undo, pinch, clutch, precision roll and zoom slider.');
}finally{await browser.close();}
