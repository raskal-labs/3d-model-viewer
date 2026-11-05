// Chromium/WebGL smoke test for the Porygon2 Render Lab.
// Intentionally runs on an unmodified checkout; no model/texture writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

// A small static GLB with vertex colours exercises the real upload path.
function testGLB(){
  const bin=Buffer.alloc(72);
  [0,0,0,1,0,0,0,1,0, 1,0,0,0,1,0,0,0,1].forEach((v,i)=>bin.writeFloatLE(v,i*4));
  const gltf={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0,COLOR_0:1}}]}],buffers:[{byteLength:72}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:36}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]},{bufferView:1,componentType:5126,count:3,type:'VEC3'}]};
  let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
  const header=Buffer.alloc(20),binHeader=Buffer.alloc(8);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);binHeader.writeUInt32LE(bin.length,0);binHeader.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,json,binHeader,bin]);
}

await fs.mkdir('viewer-smoke-artifacts', {recursive:true});
const browser=await chromium.launch({
  headless:true,
  args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
const problems=[];
const report=[];
const bindErrors=page=>{
  page.on('pageerror',e=>problems.push('pageerror: '+e.message));
  page.on('console',msg=>{
    if(msg.type()==='error'&&!/favicon\.ico/.test(msg.text()))problems.push('console: '+msg.text());
  });
};
const view = async(page,label) => {
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('meshes · ready'),null,{timeout:45000});
  assert.match(await page.locator('#status').innerText(),/\d+ meshes · ready/);
  report.push(label+': model loaded');
};
const canvasStats = async page => await page.evaluate(()=>{
  const src=document.querySelector('body > canvas');
  const c=document.createElement('canvas');c.width=src.width;c.height=src.height;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(src,0,0);
  const d=ctx.getImageData(0,0,c.width,c.height).data;
  let counts=[0,0];
  for(let y=Math.floor(c.height*.16);y<Math.floor(c.height*.84);y+=5){
    for(let x=0;x<c.width;x+=5){
      const k=4*(y*c.width+x),r=d[k],g=d[k+1],b=d[k+2];
      if(Math.max(r,g,b)-Math.min(r,g,b)>24 && Math.max(r,g,b)>70)counts[x<c.width/2?0:1]++;
    }
  }
  return {width:c.width,height:c.height,counts};
});
try{
  const context=await browser.newContext({viewport:{width:1080,height:800},deviceScaleFactor:1});
  const page=await context.newPage();bindErrors(page);
  await view(page,'desktop');
  await page.locator('#open').click();
  assert.equal(await page.locator('#panel').isVisible(),true);
  await page.locator('#labAppearance summary').click();
  await page.locator('[aria-label="Surface shading"] [data-value="Flat"]').click();
  await page.locator('[aria-label="Model colours"] [data-value="Game Boy"]').click();
  await page.locator('[aria-label="Internal render height"] [data-value="160p"]').click();
  assert.equal(await page.locator('#style').inputValue(),'Flat');
  assert.equal(await page.locator('#palette').inputValue(),'Game Boy');
  assert.equal(await page.locator('#resolution').inputValue(),'160p');
  const appearance=await page.evaluate(()=>JSON.parse(localStorage.getItem('raskal-porygon-render-lab:v1')).appearance);
  assert.equal(appearance.style,'Flat');assert.equal(appearance.palette,'Game Boy');assert.equal(appearance.resolution,'160p');
  // Editing one swatch starts from the selected palette, rather than stale custom colours.
  await page.locator('#labColour0').evaluate(el=>{el.value='#123456';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('#palette').inputValue(),'Custom');
  assert.equal(await page.locator('#labColour1').inputValue(),'#306230');
  // Outline colour stays independent of style, model palette and output quantization.
  await page.locator('[aria-label="Edge treatment"] [data-value="Off"]').click();
  assert.equal(await page.locator('#outlineColor').isDisabled(),true);
  await page.locator('[aria-label="Edge treatment"] [data-value="Solid"]').click();
  assert.equal(await page.locator('#outlineColor').isEnabled(),true);
  await page.locator('#outlineColor').evaluate(el=>{el.value='#00ff00';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#width').evaluate(el=>{el.value='5';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('[aria-label="Model colours"] [data-value="Original"]').click();
  await page.locator('[aria-label="Edge treatment"] [data-value="Ink"]').click();
  assert.equal(await page.locator('#outlineColor').inputValue(),'#00ff00');
  await page.locator('[aria-label="Edge treatment"] [data-value="Solid"]').click();
  await page.locator('[data-section="palette"] summary').click();
  assert.equal(await page.locator('#labDither').isDisabled(),true);
  await page.locator('#labQuantize').selectOption('4');
  assert.equal(await page.locator('#labDither').isEnabled(),true);
  await page.waitForTimeout(400);
  const greenOutlinePixels=await page.evaluate(()=>{
    const src=document.querySelector('body > canvas'),c=document.createElement('canvas');c.width=src.width;c.height=src.height;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(src,0,0);
    const d=ctx.getImageData(0,0,c.width,c.height).data;let count=0;
    for(let i=0;i<d.length;i+=4)if(d[i]<20&&d[i+1]>220&&d[i+2]<20)count++;
    return count;
  });
  assert(greenOutlinePixels>100,'Outline colour was changed by the palette or output quantization: '+greenOutlinePixels);
  const savedOutline=await page.evaluate(()=>JSON.parse(localStorage.getItem('raskal-porygon-render-lab:v1')).appearance);
  assert.equal(savedOutline.outlineColor,'#00ff00');assert.equal(savedOutline.outline,'Solid');
  await page.locator('#labQuantize').selectOption('Off');
  await page.locator('[data-section="palette"] summary').click();
  await page.locator('#defaults').evaluate(el=>el.click());
  await page.locator('#labAppearance summary').click();
  report.push('desktop: appearance controls select and persist styles, palette and resolution');
  for(const id of ['labBackdrop','labLight','labFxscanlines','labWireframe','labCompare']){
    assert.equal(await page.locator('#'+id).count(),1,'Missing '+id);
  }
  await page.locator('[data-section="scene"] summary').click();
  await page.locator('#labBackdrop').selectOption('Studio');
  await page.locator('#labLight').selectOption('Rim');
  assert.equal(await page.locator('#labBackdrop').inputValue(),'Studio');
  await page.locator('[data-section="filters"] summary').click();
  await page.locator('#labFxscanlines').evaluate(el=>{el.value='0.5';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.screenshot({path:'viewer-smoke-artifacts/desktop-effects.png'});
  report.push('desktop: styles panel, backdrop/light selectors, effects slider');
  await page.locator('#open').click();
  await page.locator('#labCompareToggle').click();
  await page.waitForFunction(()=>document.querySelector('#viewNotice')?.textContent.includes('Ready to compare with'),null,{timeout:45000});
  await page.waitForTimeout(450);
  assert.equal(await page.locator('#labComparisonLabels').evaluate(e=>e.classList.contains('active')),true);
  assert.equal(await page.locator('#labFilter').isEnabled(),true,'Texture sampling is available for the textured comparison model');
  const [left,right]=await page.locator('#labComparisonLabels span').allTextContents();
  assert.notEqual(left,right,'Comparison should show two distinct models');
  const stats=await canvasStats(page);
  assert(stats.counts[0]>45 && stats.counts[1]>45,'No colourful 3D geometry in one comparison half: '+JSON.stringify(stats));
  await page.screenshot({path:'viewer-smoke-artifacts/desktop-compare.png'});
  report.push('desktop: split compare rendered both models, '+JSON.stringify(stats));
  await page.locator('#labCompareToggle').click();
  assert.equal(await page.locator('#labComparisonLabels').evaluate(e=>e.classList.contains('active')),false);
  assert.equal(await page.locator('#labFilter').isDisabled(),true,'Texture sampling is unavailable for the untextured model');
  report.push('desktop: compare toggles off');
  await page.locator('#open').click();
  await page.locator('[data-section="models"] summary').click();
  await page.locator('#labModelFile').setInputFiles({name:'triangle.obj',mimeType:'text/plain',buffer:Buffer.from('o Triangle\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n')});
  await page.waitForFunction(()=>document.querySelector('#name').textContent==='triangle',null,{timeout:45000});
  const stl='solid sample\n facet normal 0 0 1\n outer loop\n vertex 0 0 0\n vertex 1 0 0\n vertex 0 1 0\n endloop\n endfacet\nendsolid sample\n';
  await page.locator('#labModelFile').setInputFiles({name:'triangle.stl',mimeType:'model/stl',buffer:Buffer.from(stl)});
  await page.waitForFunction(()=>document.querySelector('#name').textContent==='triangle (2)',null,{timeout:45000});
  const positions=Buffer.alloc(36);[0,0,0,1,0,0,0,1,0].forEach((v,i)=>positions.writeFloatLE(v,i*4));
  const embedded={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],buffers:[{byteLength:36,uri:'data:application/octet-stream;base64,'+positions.toString('base64')}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]}]};
  await page.locator('#labModelFile').setInputFiles({name:'embedded.gltf',mimeType:'model/gltf+json',buffer:Buffer.from(JSON.stringify(embedded))});
  await page.waitForFunction(()=>document.querySelector('#name').textContent==='embedded',null,{timeout:45000});
  await page.locator('#labModelFile').setInputFiles({name:'colour.glb',mimeType:'model/gltf-binary',buffer:testGLB()});
  await page.waitForFunction(()=>document.querySelector('#name').textContent==='colour',null,{timeout:45000});
  assert.match(await page.locator('#status').innerText(),/1 meshes · ready/);
  assert.equal(await page.locator('#labPart').isDisabled(),true,'A one-mesh model has no parts to isolate');
  await page.locator('#labModelSelect').selectOption({label:'triangle (2)'});
  await page.waitForFunction(()=>document.querySelector('#name').textContent==='triangle (2)',null,{timeout:45000});
  await page.locator('#labModelSelect').selectOption({label:'colour'});
  await page.waitForFunction(()=>document.querySelector('#name').textContent==='colour',null,{timeout:45000});
  await page.locator('[data-section="compare"] summary').click();
  await page.locator('#labCompare').check();
  await page.locator('#labCompareWith').selectOption('Porygon2');
  await page.waitForFunction(()=>document.querySelector('#viewNotice')?.textContent.includes('Ready to compare with Porygon2'),null,{timeout:45000});
  await page.locator('#labCompare').uncheck();
  await page.locator('#labModelFile').setInputFiles({name:'broken.glb',mimeType:'model/gltf-binary',buffer:Buffer.from('invalid')});
  await page.waitForFunction(()=>document.querySelector('#labStatus').textContent.includes('Could not load model'),null,{timeout:45000});
  assert.equal(await page.locator('#name').innerText(),'colour');
  await page.locator('#labFilterPreset').selectOption('CRT');
  await page.locator('[data-section="overlays"] summary').click();
  assert.equal(await page.locator('#labOverlayOpacity').isDisabled(),true);
  await page.locator('#labOverlayPreset').selectOption('Composition');
  await page.locator('[data-section="looks"] summary').click();
  await page.locator('#labLookName').fill('CRT guides');await page.locator('#labSaveLook').click();
  await page.locator('#labFilterPreset').selectOption('Film');
  await page.locator('#labLookName').fill('Film');await page.locator('#labSaveLook').click();
  await page.reload();await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('meshes · ready'),null,{timeout:45000});
  assert.equal(await page.locator('#name').innerText(),'Porygon2');
  assert.equal(await page.locator('#labFxscanlines').inputValue(),'0');
  assert.equal(await page.locator('#labCrosshair').isChecked(),false);
  await page.locator('#open').click();await page.locator('[data-section="looks"] summary').click();
  await page.locator('#labSavedLooks').selectOption('CRT guides');await page.locator('#labRestoreLook').click();
  assert.equal(await page.locator('#labFxscanlines').inputValue(),'0.7');
  assert.equal(await page.locator('#labCrosshair').isChecked(),true);
  await page.locator('#labSavedLooks').selectOption('Film');await page.locator('#labRestoreLook').click();
  assert.equal(await page.locator('#labFxgrain').inputValue(),'0.2');
  const oldLook={version:1,appearance:{},renderLab:{brightness:'0.35',lightStrength:'1.5',light:'Custom'}};
  await page.locator('#labLoadJSON').setInputFiles({name:'old-look.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(oldLook))});
  await page.waitForFunction(()=>document.querySelector('#labStatus').textContent==='Imported look preset.');
  assert.equal(await page.locator('#labBrightness').inputValue(),'0.35');
  assert.equal(await page.locator('#labStrength').inputValue(),'1.5');
  report.push('desktop: OBJ, STL, glTF and GLB upload, comparison, safe failure, session reset and saved looks');
  await context.close();
  const mobile=await browser.newContext({
    viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true
  });
  const mobilePage=await mobile.newPage();bindErrors(mobilePage);
  await view(mobilePage,'mobile Chromium');
  const reticle=await mobilePage.locator('#precisionButton').boundingBox();
  assert(Math.abs(reticle.x+reticle.width/2-195)<2 && reticle.y>740,'Reticle should be bottom center');
  await mobilePage.mouse.move(reticle.x+reticle.width/2,reticle.y+reticle.height/2);await mobilePage.mouse.down();
  await mobilePage.waitForTimeout(300);
  const panItem=await mobilePage.locator('#precisionMenu [data-mode="pan"]').boundingBox();
  await mobilePage.mouse.move(panItem.x+panItem.width/2,panItem.y+panItem.height/2);await mobilePage.mouse.up();
  assert.equal(await mobilePage.locator('#precisionInstrument').getAttribute('data-mode'),'pan');
  await mobilePage.locator('#closePrecision').click();
  await mobilePage.locator('#open').click();
  assert.equal(await mobilePage.locator('#panel').isVisible(),true);
  assert.equal(await mobilePage.locator('#panel').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'Settings overflow horizontally');
  assert.equal(await mobilePage.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,
    'Unexpected horizontal overflow');
  await mobilePage.screenshot({path:'viewer-smoke-artifacts/mobile-panel.png'});
  await mobilePage.locator('#open').click();
  await mobilePage.locator('#labCompareToggle').click();
  await mobilePage.waitForFunction(()=>document.querySelector('#viewNotice')?.textContent.includes('Ready to compare with'),null,{timeout:45000});
  await mobilePage.waitForTimeout(450);
  const mobileStats=await canvasStats(mobilePage);
  assert(mobileStats.counts[0]>30 && mobileStats.counts[1]>30,
    'Mobile comparison missing visible model: '+JSON.stringify(mobileStats));
  await mobilePage.screenshot({path:'viewer-smoke-artifacts/mobile-compare.png'});
  report.push('mobile Chromium: split compare '+JSON.stringify(mobileStats));
  await mobile.close();
}finally{
  await browser.close();
}
// Linux WebKit smoke is a useful Safari-engine regression signal, not a substitute for iOS Safari testing.
let safariEngine;
try {
  safariEngine=await webkit.launch({headless:true});
  const webkitContext=await safariEngine.newContext({
    viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true
  });
  const wkPage=await webkitContext.newPage();bindErrors(wkPage);
  await view(wkPage,'mobile WebKit');
  await wkPage.locator('#labCompareToggle').click();
  await wkPage.waitForFunction(()=>document.querySelector('#viewNotice')?.textContent.includes('Ready to compare with'),null,{timeout:45000});
  await wkPage.waitForTimeout(500);
  const stats=await canvasStats(wkPage);
  assert(stats.counts[0]>30 && stats.counts[1]>30,'WebKit compare missing model: '+JSON.stringify(stats));
  await wkPage.screenshot({path:'viewer-smoke-artifacts/webkit-mobile-compare.png'});
  report.push('mobile WebKit: split compare '+JSON.stringify(stats));
} finally {
  await safariEngine?.close();
}
if(problems.length){
  console.error('Browser errors:',problems.join('\n'));
  process.exitCode=1;
}
console.log(report.join('\n'));
if(problems.length)throw Error(problems.length+' browser error(s)');
