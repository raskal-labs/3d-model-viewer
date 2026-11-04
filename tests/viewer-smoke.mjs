// Chromium/WebGL smoke test for the Porygon2 Render Lab.
// Intentionally runs on an unmodified checkout; no model/texture writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

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
  await page.goto('http://127.0.0.1:8765/porygon2/',{waitUntil:'domcontentloaded'});
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
  const [left,right]=await page.locator('#labComparisonLabels span').allTextContents();
  assert.notEqual(left,right,'Comparison should show two distinct models');
  const stats=await canvasStats(page);
  assert(stats.counts[0]>45 && stats.counts[1]>45,'No colourful 3D geometry in one comparison half: '+JSON.stringify(stats));
  await page.screenshot({path:'viewer-smoke-artifacts/desktop-compare.png'});
  report.push('desktop: split compare rendered both models, '+JSON.stringify(stats));
  await page.locator('#labCompareToggle').click();
  assert.equal(await page.locator('#labComparisonLabels').evaluate(e=>e.classList.contains('active')),false);
  report.push('desktop: compare toggles off');
  await context.close();
  const mobile=await browser.newContext({
    viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true
  });
  const mobilePage=await mobile.newPage();bindErrors(mobilePage);
  await view(mobilePage,'mobile Chromium');
  await mobilePage.locator('#open').click();
  assert.equal(await mobilePage.locator('#panel').isVisible(),true);
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
if(problems.length){
  console.error('Browser errors:',problems.join('\n'));
  process.exitCode=1;
}
console.log(report.join('\n'));
if(problems.length)throw Error(problems.length+' browser error(s)');
