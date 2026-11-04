// Render Lab additions for the Porygon2 / Chief viewer.
// Controls are deliberately kept inside the existing Styles panel.
// No modification to source geometry or source texture files.
export function createRenderLab(ctx) {
  const { THREE, OBJLoader, MTLLoader, renderer, scene, camera, controls,
    postScene, postCamera, post, surface, colors, presets, styles, state,
    models, parts, getModel, getCurrent, getTarget, getRoll, syncAppearance,
    resizeView, notify } = ctx;
  const $ = id => document.getElementById(id);
  const LKEY = 'raskal-porygon-render-lab:v1';
  const defaults = {
    backdrop: 'Dark', background: '#171a23', light: 'Original',
    lightAzimuth: 40, lightElevation: 45, lightStrength: 1,
    compare: false, compareIndex: 1, spin: false, wireframe: false,
    filter: 'Nearest', material: 'Original', part: 'All',
    quantize: 0, grain: 0, scanlines: 0, vignette: 0, crt: 0,
    pixelGrid: 0, halftone: 0, chromatic: 0, bloom: 0,
    sepia: 0, threshold: 0, posterize: 0, dither: 0,
    brightness: 0, contrast: 0, saturation: 0,
    crosshair: false, thirds: false, overlayOpacity: .5,
    customPalette: ['#000000','#C84850','#5060C0','#FFFFFF']
  };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(LKEY) || '{}') || {}; } catch {}
  const cfg = { ...defaults, ...saved };
  delete cfg.appearance;
  if(saved.appearance && typeof saved.appearance==='object'){
    for(const key of ['style','outline','palette','resolution']){
      if(typeof saved.appearance[key]==='string')state[key]=saved.appearance[key];
    }
    if(Number.isFinite(saved.appearance.width))state.width=Math.max(0,Math.min(5,saved.appearance.width));
  }
  if (!Array.isArray(cfg.customPalette) || cfg.customPalette.length !== 4 ||
      cfg.customPalette.some(s => !/^#[0-9a-fA-F]{6}$/.test(s))) {
    cfg.customPalette = defaults.customPalette.slice();
  }
  presets.Custom = cfg.customPalette.slice();
  const paletteSelect = $('palette');
  if (!Array.from(paletteSelect.options).some(o => o.value === 'Custom')) {
    paletteSelect.add(new Option('Custom', 'Custom'));
  }

  const css = document.createElement('style');
  css.textContent = `
    #renderLabRoot{font-size:12px;display:grid;gap:7px;margin:10px 0}
    #renderLabRoot details{border:1px solid #526379;border-radius:9px;background:#131d2b}
    #renderLabRoot summary{cursor:pointer;padding:9px 11px;font-weight:650;list-style:none}
    #renderLabRoot summary::-webkit-details-marker{display:none}
    #renderLabRoot summary::after{content:'＋';float:right;opacity:.65}
    #renderLabRoot details[open] summary::after{content:'−'}
    .lab-inner{padding:2px 10px 10px;display:grid;gap:8px}
    .lab-row{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:26px}
    .lab-row label{min-width:80px;flex:1}
    .lab-row select,.lab-row input[type=color],.lab-row input[type=range],.lab-row input[type=file]{min-width:0;max-width:62%;flex:1}
    .lab-row select{max-width:64%;padding:5px;color:#eaf2ff;background:#26354d;border:1px solid #566980;border-radius:5px}
    .lab-row input[type=color]{height:30px;max-width:62px;border:0;background:transparent}
    .lab-row input[type=checkbox]{width:20px;height:20px;flex:none}
    .lab-row input[type=range]{accent-color:#94bbf0}
    .lab-swatches{display:flex;gap:8px;justify-content:space-around}
    .lab-swatches input[type=color]{width:45px;height:36px}
    .lab-actions{display:flex;gap:6px;flex-wrap:wrap}
    .lab-actions button{flex:1;min-height:32px}
    .lab-note{font-size:11px;color:#b6c8dc;line-height:1.45}
    header{gap:6px}
    header strong{min-width:0;max-width:98px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    header small{min-width:0;max-width:75px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    header button{padding:7px 8px}
    #labCompareToggle{padding:7px 9px;white-space:nowrap;min-width:32px}
    @media(max-width:420px){header small{max-width:42px}header strong{max-width:86px}}
    #labCompareToggle[aria-pressed=true]{background:#526b95;border-color:#bed1f0}
    #labComparisonLabels{position:fixed;top:calc(env(safe-area-inset-top) + 58px);left:0;right:0;
      display:none;z-index:1;pointer-events:none;color:white;text-shadow:0 1px 3px #000;
      font:600 12px system-ui}
    #labComparisonLabels.active{display:flex}
    #labComparisonLabels span{width:50%;text-align:center;padding:4px}
    #labImageOverlay{position:fixed;inset:0;z-index:1;pointer-events:none;
      width:100%;height:100%;object-fit:contain;display:none}
    #renderLabRoot .lab-small{font-size:11px;opacity:.86}
  `;
  document.head.append(css);
  const panel = $('panel');
  const root = document.createElement('div');
  root.id = 'renderLabRoot';
  // Native render settings are kept as-is, just collected under one fold.
  const original = document.createElement('details');
  original.id = 'labAppearance';
  original.innerHTML = '<summary>Style · Palette · Resolution</summary><div class="lab-inner" id="labNativeSettings"></div>';
  const nodes = ['style','outline','width','palette','swatches','resolution'].map(id => $(id));
  const inner = original.querySelector('#labNativeSettings');
  for (const node of nodes) {
    if (!node) continue;
    const parent = node.closest('label') || node;
    inner.append(parent);
  }
  root.append(original);
  const section = (title, name, markup) => {
    const el = document.createElement('details');
    el.innerHTML = `<summary>${title}</summary><div class="lab-inner">${markup}</div>`;
    el.dataset.section = name;
    root.append(el);
    return el;
  };
  const row = (title, id, options) =>
    `<div class="lab-row"><label for="${id}">${title}</label><select id="${id}">${options.map(v=>`<option>${v}</option>`).join('')}</select></div>`;
  const slider = (title,id,min,max,step,def=0) =>
    `<div class="lab-row"><label for="${id}">${title}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${def}"></div>`;
  const toggle = (title,id) =>
    `<div class="lab-row"><label for="${id}">${title}</label><input id="${id}" type="checkbox"></div>`;
  const lighting = section('Scene & Lighting','scene',
    row('Quick look','labLook',['Custom','Clean','Game Boy','Virtual Boy','CRT TV','PS1','Blueprint']) +
    row('Backdrop','labBackdrop',['Dark','Studio','White','Black','Chroma Green','Chroma Blue','Sunset','Game Boy','Checkerboard','Custom']) +
    '<div class="lab-row"><label for="labBackground">Custom colour</label><input id="labBackground" type="color"></div>' +
    row('Lighting','labLight',['Original','Unlit','Studio','Soft','Hard','Dramatic','Rim','Overhead','Underlit','Custom']) +
    slider('Light direction ↔','labAzimuth',-180,180,1,40) +
    slider('Light height','labElevation',-90,90,1,45) +
    slider('Strength','labStrength',0,2,.05,1));
  const pal = section('Palette & Materials','palette',
    '<div class="lab-note">Edit any swatch to create a custom palette. Changes are reversible.</div>' +
    '<div class="lab-swatches" id="labPaletteSwatches">' +
    Array.from({length:4},(_,i)=>`<input type="color" id="labColour${i}" aria-label="Palette colour ${i+1}">`).join('')+'</div>' +
    row('Output colours','labQuantize',['Off','2','4','8','16']) +
    slider('Dither','labDither',0,1,.05) +
    row('Texture sampling','labFilter',['Nearest','Linear']) +
    row('Surface','labMaterial',['Original','Matte','Glossy','Metal-like']) +
    '<div class="lab-row"><label for="labTexture">Replace texture</label><input id="labTexture" type="file" accept="image/png,image/jpeg,image/webp"></div>' +
    '<div class="lab-actions"><button id="labResetTexture" type="button">Restore texture</button><button id="labSaveLook" type="button">Save look</button></div>');
  const fxFields = [
    ['Grain','grain'],['Scanlines','scanlines'],['Vignette','vignette'],
    ['CRT curvature','crt'],['Pixel grid','pixelGrid'],['Halftone','halftone'],
    ['Chromatic shift','chromatic'],['Bloom','bloom'],['Sepia','sepia'],
    ['Threshold','threshold'],['Posterize','posterize']
  ];
  section('Filters','filters',
    '<div class="lab-note">Stack effects; each slider ranges from off (left) to full intensity (right).</div>' +
    fxFields.map(([label,id])=>slider(label,'labFx'+id,0,1,.05)).join('') +
    slider('Brightness','labBrightness',-1,1,.05) +
    slider('Contrast','labContrast',-1,1,.05) +
    slider('Saturation','labSaturation',-1,1,.05) +
    '<div class="lab-actions"><button type="button" id="labClearEffects">Clear filters</button><button type="button" id="labToggleBefore">Hold to bypass filters</button></div>');
  section('Overlays & Inspection','overlays',
    toggle('Mesh wireframe','labWireframe') +
    toggle('Crosshair','labCrosshair') + toggle('Rule of thirds','labThirds') +
    row('Show mesh part','labPart',['All']) +
    '<div class="lab-row"><label for="labOverlayFile">Reference image</label><input type="file" id="labOverlayFile" accept="image/*"></div>' +
    slider('Reference opacity','labOverlayOpacity',0,1,.05,.5) +
    '<div class="lab-actions"><button type="button" id="labRemoveOverlay">Remove image</button><button type="button" id="labResetParts">Show all parts</button></div>');
  section('Compare & Capture','compare',
    row('Right-hand model','labCompareWith',models.map(m=>m.name)) +
    toggle('Split-screen compare','labCompare') +
    toggle('Turntable rotation','labSpin') +
    '<div class="lab-actions"><button type="button" id="labScreenshot">Save PNG</button><button type="button" id="labCopyLook">Copy look JSON</button></div>' +
    '<div class="lab-row"><label for="labLoadJSON">Import look JSON</label><input type="file" id="labLoadJSON" accept="application/json,.json"></div>' +
    '<div class="lab-note">Comparison uses synchronized angles and proportional framing. Both models share the same rendering settings.</div>');
  const viewPanel = $('viewPanel');
  panel.insertBefore(root, viewPanel);
  const compareBtn = document.createElement('button');
  compareBtn.id = 'labCompareToggle';
  compareBtn.type = 'button';
  compareBtn.title = 'Toggle side-by-side model comparison';
  compareBtn.setAttribute('aria-label', 'Toggle side-by-side comparison');
  compareBtn.textContent = '⇔';
  $('open').before(compareBtn);
  const labels = document.createElement('div');
  labels.id = 'labComparisonLabels'; labels.setAttribute('aria-hidden','true');
  labels.innerHTML = '<span></span><span></span>';
  document.body.append(labels);
  const imageOverlay = document.createElement('img');
  imageOverlay.id = 'labImageOverlay'; imageOverlay.alt = '';
  document.body.append(imageOverlay);
  let overlayObjectURL = null;
  const persist = () => { try { localStorage.setItem(LKEY, JSON.stringify({...cfg,appearance:{...state}})); } catch {} };
  const hexToVec = hex => new THREE.Vector3(
    parseInt(hex.slice(1,3),16)/255,
    parseInt(hex.slice(3,5),16)/255,
    parseInt(hex.slice(5,7),16)/255);
  const backdropColours = {
    Dark:'#171a23',Studio:'#727b8a',White:'#ffffff',Black:'#000000',
    'Chroma Green':'#00ff00','Chroma Blue':'#0000ff',Sunset:'#bb6b61',
    'Game Boy':'#9bbc0f'
  };
  const looks = {
    Clean: {backdrop:'Studio',light:'Studio',quantize:0,grain:0,scanlines:0,crt:0,vignette:0,pixelGrid:0,halftone:0,dither:0},
    'Game Boy': {backdrop:'Game Boy',light:'Soft',quantize:4,grain:0,scanlines:0,crt:0,vignette:.15,pixelGrid:.2,dither:.25},
    'Virtual Boy': {backdrop:'Black',light:'Dramatic',quantize:4,grain:0,scanlines:.2,crt:.15,vignette:.3,pixelGrid:0,dither:0},
    'CRT TV': {backdrop:'Black',light:'Studio',quantize:0,grain:.08,scanlines:.75,crt:.75,vignette:.4,pixelGrid:0,dither:0},
    PS1: {backdrop:'Dark',light:'Hard',quantize:16,grain:.2,scanlines:0,crt:0,vignette:.15,pixelGrid:0,dither:.3},
    Blueprint: {backdrop:'Chroma Blue',light:'Unlit',quantize:2,grain:0,scanlines:0,crt:0,vignette:0,pixelGrid:0,dither:0}
  };
  const lightModes = {
    Original:[.4,.7,.5,1],Studio:[.5,.8,.65,1.1],Soft:[.2,.9,.6,.65],
    Hard:[1,.45,.1,1.6],Dramatic:[-.9,.25,.1,1.25],
    Rim:[-.65,.35,-.85,1.55],Overhead:[.1,1,.05,1],
    Underlit:[.15,-.9,.15,1.1],Unlit:[.4,.7,.5,0]
  };
  let pausedFX=false, currentTexture=null, originalMaps=new WeakMap();
  let secondaryModel=null, secondaryIndex=-1, secondaryLoading=0;
  const secondaryCache = new Map();
  let primaryOverlayRoot=null, secondaryWireRoots=new WeakMap();
  const allMeshes = rootModel => {
    const out=[];rootModel?.traverse(o=>{if(o.isMesh && o.userData.labWire!==true)out.push(o);});return out;
  };
  const releaseModel = modelRoot => {
    const wires=secondaryWireRoots.get(modelRoot)||[];
    for(const wire of wires){wire.removeFromParent();wire.geometry.dispose();wire.material.dispose();}
    if(modelRoot)secondaryWireRoots.delete(modelRoot);
  };
  const ensureWires = modelRoot => {
    if (!modelRoot || secondaryWireRoots.has(modelRoot)) return;
    const objs=[];
    for (const m of allMeshes(modelRoot)) {
      const geom = new THREE.WireframeGeometry(m.geometry);
      const wire = new THREE.LineSegments(geom,new THREE.LineBasicMaterial({color:0x111111,transparent:true,opacity:.8,depthTest:true}));
      wire.userData.labWire=true; wire.visible=Boolean(cfg.wireframe);
      m.add(wire);objs.push(wire);
    }
    secondaryWireRoots.set(modelRoot,objs);
  };
  const applyWires = modelRoot => {
    ensureWires(modelRoot);
    (secondaryWireRoots.get(modelRoot)||[]).forEach(w=>w.visible=Boolean(cfg.wireframe));
  };
  const lightDir = new THREE.Vector3();
  const updateLight = () => {
    if (cfg.light === 'Custom') {
      const a=THREE.MathUtils.degToRad(+cfg.lightAzimuth),e=THREE.MathUtils.degToRad(+cfg.lightElevation);
      lightDir.set(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)).normalize();
    } else {
      const p=lightModes[cfg.light]||lightModes.Original;
      lightDir.set(p[0],p[1],p[2]).normalize();
    }
    for (const rootModel of [getModel(),secondaryModel]) {
      for (const mesh of allMeshes(rootModel)) {
        for (const m of (Array.isArray(mesh.material)?mesh.material:[mesh.material])) {
          if (!m?.uniforms) continue;
          m.uniforms.lightDir?.value.copy(lightDir);
          if (m.uniforms.lightStrength) m.uniforms.lightStrength.value = cfg.light==='Custom'?+cfg.lightStrength:(lightModes[cfg.light]?.[3]??1);
          if (m.uniforms.unlitMode) m.uniforms.unlitMode.value = cfg.light==='Unlit'?1:0;
          if (m.uniforms.glossMode) m.uniforms.glossMode.value = ['Original','Matte','Glossy','Metal-like'].indexOf(cfg.material);
          if (m.uniforms.colorMap?.value) {
            const texture=m.uniforms.colorMap.value;
            texture.magFilter=cfg.filter==='Linear'?THREE.LinearFilter:THREE.NearestFilter;
            texture.minFilter=cfg.filter==='Linear'?THREE.LinearFilter:THREE.NearestFilter;
            texture.needsUpdate=true;
          }
        }
      }
      applyWires(rootModel);
    }
  };
  const rebuildParts = () => {
    const selector=$('labPart'), prev=cfg.part;
    selector.replaceChildren(new Option('All','All'));
    for (const m of allMeshes(getModel()))selector.add(new Option(m.name||'Unnamed part',m.uuid));
    cfg.part = Array.from(selector.options).some(o=>o.value===prev)?prev:'All';
    selector.value=cfg.part;
    showParts();
  };
  const showParts = () => {
    for (const m of allMeshes(getModel()))m.visible=cfg.part==='All'||m.uuid===cfg.part;
  };
  $('labLook').onchange=e=>{
    const preset=looks[e.target.value];if(!preset)return;
    Object.assign(cfg,preset);
    if(e.target.value==='Game Boy')state.palette='Game Boy';
    else if(e.target.value==='Virtual Boy')state.palette='Virtual Boy';
    else if(e.target.value==='Blueprint'){state.palette='Cyanotype';cfg.wireframe=true;}
    else if(e.target.value==='PS1')state.resolution='240p';
    else if(e.target.value==='Clean'){state.palette='Original';state.resolution='Native';cfg.wireframe=false;}
    syncAppearance();syncUI();persist();notify('Applied '+e.target.value+' look.');
  };
  const applyBackground = () => {
    const bg=cfg.backdrop==='Custom'?cfg.background:backdropColours[cfg.backdrop]||'#171a23';
    post.uniforms.background.value.copy(hexToVec(bg));
    if(post.uniforms.background2){
      const second=cfg.backdrop==='Studio'?'#303849':cfg.backdrop==='Sunset'?'#e9ae75':bg;
      post.uniforms.background2.value.copy(hexToVec(second));
      post.uniforms.gradientMode.value=['Studio','Sunset'].includes(cfg.backdrop)?1:0;
      post.uniforms.checkerMode.value=cfg.backdrop==='Checkerboard'?1:0;
    }
    const bgSolid=$('labBackground');if(bgSolid)bgSolid.value=bg;
  };
  // Final image postprocessing: all colour and screen effects remain independent of the base style shader.
  const filterFragment = `
    precision highp float;varying vec2 vUv;
    uniform sampler2D source;uniform vec2 dims;uniform float time;
    uniform float grain,scanlines,vignette,crt,pixelGrid,halftone,chromatic,bloom,sepia,threshold,posterize,dither,brightness,contrast,saturation;
    uniform float crosshair,thirds,quantize;
    uniform vec3 palette16[16];
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    vec3 sampleTex(vec2 uv){return texture2D(source,clamp(uv,0.,1.)).rgb;}
    float bayer(vec2 p){vec2 f=mod(floor(p),4.);float x=f.x,y=f.y;
      return (mod(x,2.)*8.+mod(y,2.)*4.+floor(x/2.)*2.+floor(y/2.))/16.-.5;}
    vec3 nearestColor(vec3 c){
      float best=1e10;vec3 result=c;
      for(int i=0;i<16;i++){if(float(i)>=quantize)break;
        float d=dot(c-palette16[i],c-palette16[i]);
        if(d<best){best=d;result=palette16[i];}}
      return result;
    }
    void main(){
      vec2 uv=vUv;
      if(crt>0.){
        vec2 p=uv*2.-1.;
        p*=1.+crt*.13*dot(p,p);
        uv=mix(uv,p*.5+.5,crt);
      }
      if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.){gl_FragColor=vec4(0.,0.,0.,1.);return;}
      vec3 col=sampleTex(uv);
      if(chromatic>0.){
        float shift=chromatic*.006;
        col.r=sampleTex(uv+vec2(shift,0.)).r;
        col.b=sampleTex(uv-vec2(shift,0.)).b;
      }
      if(bloom>0.){
        vec2 px=1./dims;
        vec3 glow=vec3(0.);
        for(int i=0;i<4;i++){
          vec2 v=i==0?vec2(3.,0.):i==1?vec2(-3.,0.):i==2?vec2(0.,3.):vec2(0.,-3.);
          vec3 sampleCol=sampleTex(uv+v*px*2.);
          glow+=sampleCol*max(max(sampleCol.r,sampleCol.g),sampleCol.b);
        }
        col+=glow*.12*bloom;
      }
      col=(col-.5)*(1.+contrast)+.5+brightness;
      float l=dot(col,vec3(.299,.587,.114));
      col=mix(vec3(l),col,max(0.,1.+saturation));
      if(sepia>0.){vec3 s=vec3(dot(col,vec3(.393,.769,.189)),dot(col,vec3(.349,.686,.168)),dot(col,vec3(.272,.534,.131)));col=mix(col,s,sepia);}
      if(posterize>0.)col=mix(col,floor(col*5.+.5)/5.,posterize);
      if(threshold>0.)col=mix(col,vec3(step(.5,l)),threshold);
      if(halftone>0.){
        vec2 cell=fract(uv*dims/7.)-.5;
        float dotFill=step(length(cell),sqrt(clamp(1.-l,0.,1.))*.54);
        col=mix(col,col*(1.-.42*dotFill),halftone);
      }
      if(grain>0.)col+=(hash(gl_FragCoord.xy+time*19.)-.5)*grain*.32;
      if(pixelGrid>0.){
        vec2 p=fract(uv*dims);
        float edge=step(p.x,.055)+step(p.y,.055);
        col*=1.-min(edge,1.)*pixelGrid*.7;
      }
      if(scanlines>0.)col*=1.-scanlines*.46*(1.-step(.5,fract(gl_FragCoord.y*.5)));
      if(crt>0.)col*=1.-crt*.28*(1.-step(.53,fract(gl_FragCoord.y/2.)));
      if(vignette>0.||crt>0.){
        float v=clamp(length((vUv-.5)*1.5),0.,1.);
        col*=1.-v*v*(vignette*.8+crt*.25);
      }
      if(quantize>=2.){
        col=nearestColor(clamp(col+vec3(bayer(gl_FragCoord.xy)*dither*.24),0.,1.));
      }
      if(crosshair>.5){
        float cross=min(abs(vUv.x-.5)*dims.x,abs(vUv.y-.5)*dims.y);
        col=mix(col,vec3(.9,.95,1.),(1.-step(1.,cross))*.6);
      }
      if(thirds>.5){
        float dist=min(min(abs(vUv.x-1./3.),abs(vUv.x-2./3.))*dims.x,
          min(abs(vUv.y-1./3.),abs(vUv.y-2./3.))*dims.y);
        col=mix(col,vec3(.92,.92,.8),(1.-step(1.,dist))*.47);
      }
      gl_FragColor=vec4(clamp(col,0.,1.),1.);
    }
  `;
  const fxMat = new THREE.ShaderMaterial({
    depthTest:false,depthWrite:false,
    uniforms: {
      source:{value:null},dims:{value:new THREE.Vector2(1,1)},time:{value:0},
      palette16:{value:Array.from({length:16},()=>new THREE.Vector3())},
      ...Object.fromEntries([...fxFields.map(([,key])=>key),
        'dither','brightness','contrast','saturation','crosshair','thirds','quantize']
        .map(key=>[key,{value:0}]))
    },
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:filterFragment
  });
  const fxScene = new THREE.Scene(),fxCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  fxScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),fxMat));
  let fxTarget=null;
  const buildPalette = () => {
    const core=(presets[state.palette]||presets.Original).map(hexToVec);
    const entries = [
      core[0],core[3],core[1],core[2],
      core[0].clone().lerp(core[1],.5),core[0].clone().lerp(core[2],.5),
      core[1].clone().lerp(core[3],.5),core[2].clone().lerp(core[3],.5),
      core[0].clone().lerp(core[1],.25),core[0].clone().lerp(core[2],.25),
      core[1].clone().lerp(core[2],.5),core[1].clone().lerp(core[3],.25),
      core[2].clone().lerp(core[3],.25),core[0].clone().lerp(core[3],.5),
      core[1].clone().lerp(core[3],.75),core[2].clone().lerp(core[3],.75)
    ];
    entries.forEach((c,i)=>fxMat.uniforms.palette16.value[i].copy(c));
    for(let i=0;i<4;i++)$('labColour'+i).value=(presets[state.palette]||presets.Original)[i];
  };
  const syncFX = () => {
    for (const [,key] of fxFields)fxMat.uniforms[key].value=pausedFX?0:+cfg[key];
    for (const key of ['dither','brightness','contrast','saturation','quantize'])
      fxMat.uniforms[key].value=pausedFX?0:+cfg[key];
    fxMat.uniforms.crosshair.value=pausedFX?0:Number(cfg.crosshair);
    fxMat.uniforms.thirds.value=pausedFX?0:Number(cfg.thirds);
    buildPalette();applyBackground();updateLight();
  };
  const syncUI = () => {
    const map={labBackdrop:'backdrop',labBackground:'background',labLight:'light',
      labAzimuth:'lightAzimuth',labElevation:'lightElevation',labStrength:'lightStrength',
      labQuantize:'quantize',labDither:'dither',labFilter:'filter',labMaterial:'material',
      labCompare:'compare',labSpin:'spin',labWireframe:'wireframe',labCrosshair:'crosshair',
      labThirds:'thirds',labOverlayOpacity:'overlayOpacity',labCompareWith:'compareIndex',
      labPart:'part',labBrightness:'brightness',labContrast:'contrast',labSaturation:'saturation'};
    for(const [,key] of fxFields)map['labFx'+key]=key;
    for (const [id,key] of Object.entries(map)) {
      const el=$(id);if(!el)continue;
      if(el.type==='checkbox')el.checked=Boolean(cfg[key]);
      else if(id==='labCompareWith')el.value=models[cfg.compareIndex]?.name||models[0].name;
      else if(id==='labQuantize')el.value=cfg[key]===0?'Off':String(cfg[key]);
      else el.value=String(cfg[key]);
    }
    compareBtn.setAttribute('aria-pressed',String(Boolean(cfg.compare)));
    labels.classList.toggle('active',Boolean(cfg.compare));
    labels.children[0].textContent=models[getCurrent()].name;
    labels.children[1].textContent=models[cfg.compareIndex]?.name||'';
    controls.autoRotate=Boolean(cfg.spin);
    if(imageOverlay.src)imageOverlay.style.opacity=String(cfg.overlayOpacity);
    syncFX();
  };
  for(const [id,key] of Object.entries({
    labBackdrop:'backdrop',labBackground:'background',labLight:'light',
    labAzimuth:'lightAzimuth',labElevation:'lightElevation',labStrength:'lightStrength',
    labDither:'dither',labFilter:'filter',labMaterial:'material',
    labCompare:'compare',labSpin:'spin',labWireframe:'wireframe',
    labCrosshair:'crosshair',labThirds:'thirds',labOverlayOpacity:'overlayOpacity',
    labBrightness:'brightness',labContrast:'contrast',labSaturation:'saturation'
  })) {
    const el=$(id);
    el.addEventListener(el.type==='range'||el.type==='color'?'input':'change',()=>{
      cfg[key]=el.type==='checkbox'?el.checked:el.value;
      if(['lightAzimuth','lightElevation','lightStrength'].includes(key))cfg.light='Custom';
      if(key==='light'&&lightModes[cfg.light]){
        const v=new THREE.Vector3(...lightModes[cfg.light].slice(0,3)).normalize();
        cfg.lightAzimuth=Math.round(THREE.MathUtils.radToDeg(Math.atan2(v.x,v.z)));
        cfg.lightElevation=Math.round(THREE.MathUtils.radToDeg(Math.asin(v.y)));
        cfg.lightStrength=lightModes[cfg.light][3];
      }
      if(key==='background')cfg.backdrop='Custom';
      syncUI();persist();if(key==='compare')setCompare(cfg.compare);
    });
  }
  $('labQuantize').onchange=e=>{cfg.quantize=e.target.value==='Off'?0:+e.target.value;syncUI();persist();};
  for (const [,key] of fxFields)$('labFx'+key).oninput=e=>{cfg[key]=+e.target.value;syncFX();persist();};
  for (let i=0;i<4;i++)$('labColour'+i).oninput=e=>{
    cfg.customPalette[i]=e.target.value;presets.Custom=cfg.customPalette.slice();
    state.palette='Custom';syncAppearance();syncFX();persist();
  };
  $('labCompareWith').onchange=e=>{
    const i=models.findIndex(m=>m.name===e.target.value);
    if(i<0)return;cfg.compareIndex=i;persist();if(cfg.compare)loadSecondary();syncUI();
  };
  $('labPart').onchange=e=>{cfg.part=e.target.value;showParts();};
  $('labResetParts').onclick=()=>{cfg.part='All';$('labPart').value='All';showParts();};
  $('labClearEffects').onclick=()=>{
    for(const [,key] of fxFields)cfg[key]=0;
    for(const key of ['brightness','contrast','saturation'])cfg[key]=0;
    syncUI();persist();
  };
  const before=$('labToggleBefore');
  const beforeDown=e=>{e.preventDefault();pausedFX=true;syncFX();};
  const beforeUp=()=>{pausedFX=false;syncFX();};
  for(const event of ['pointerdown'])before.addEventListener(event,beforeDown);
  for(const event of ['pointerup','pointercancel','pointerleave','lostpointercapture'])before.addEventListener(event,beforeUp);
  const overlayInput=$('labOverlayFile');
  overlayInput.onchange=()=>{
    const file=overlayInput.files?.[0];if(!file)return;
    if(overlayObjectURL)URL.revokeObjectURL(overlayObjectURL);
    overlayObjectURL=URL.createObjectURL(file);
    imageOverlay.src=overlayObjectURL;imageOverlay.style.display='block';
    imageOverlay.style.opacity=String(cfg.overlayOpacity);
  };
  $('labRemoveOverlay').onclick=()=>{
    if(overlayObjectURL)URL.revokeObjectURL(overlayObjectURL);
    overlayObjectURL=null;imageOverlay.removeAttribute('src');
    imageOverlay.style.display='none';overlayInput.value='';
  };
  const originalTexture = new WeakMap();
  const applyTexture = texture => {
    let applied=0;
    for(const mesh of allMeshes(getModel())){
      if(!mesh.geometry.attributes.uv)continue;
      for(const mat of (Array.isArray(mesh.material)?mesh.material:[mesh.material])){
        if(!mat?.uniforms?.colorMap)continue;
        if(!originalTexture.has(mat))originalTexture.set(mat,{
          map:mat.uniforms.colorMap.value, textured:mat.uniforms.textured.value
        });
        // Protect UV parts with no original texture (e.g. helmet lettering) from being overwritten.
        if(originalTexture.get(mat).textured!==1)continue;
        mat.uniforms.colorMap.value=texture;
        mat.uniforms.textured.value=1;applied++;
      }
    }
    return applied;
  };
  $('labTexture').onchange=()=>{
    const file=$('labTexture').files?.[0];if(!file)return;
    const url=URL.createObjectURL(file);
    new THREE.TextureLoader().load(url,texture=>{
      URL.revokeObjectURL(url);
      texture.colorSpace=THREE.SRGBColorSpace;
      const existing=allMeshes(getModel()).flatMap(m=>Array.isArray(m.material)?m.material:[m.material]).find(m=>m.uniforms?.colorMap?.value);
      texture.flipY=existing?.uniforms.colorMap.value.flipY ?? true;
      texture.minFilter=cfg.filter==='Linear'?THREE.LinearFilter:THREE.NearestFilter;
      texture.magFilter=cfg.filter==='Linear'?THREE.LinearFilter:THREE.NearestFilter;
      const applied=applyTexture(texture);
      if(currentTexture && currentTexture!==texture)currentTexture.dispose();
      currentTexture=applied?texture:null;
      if(!applied){texture.dispose();notify('No textured UV-mapped parts available on this model.');}
      else notify('Applied custom texture to '+applied+' material(s).');
    },undefined,()=>{URL.revokeObjectURL(url);notify('Could not read image texture.');});
  };
  $('labResetTexture').onclick=()=>{
    for(const mesh of allMeshes(getModel()))for(const mat of (Array.isArray(mesh.material)?mesh.material:[mesh.material])){
      const source=originalTexture.get(mat);if(!source)continue;
      mat.uniforms.colorMap.value=source.map;mat.uniforms.textured.value=source.textured;
    }
    currentTexture?.dispose();currentTexture=null;$('labTexture').value='';
    notify('Restored original texture.');
  };
  $('labSaveLook').onclick=()=>{persist();notify('Saved appearance in this browser.');};
  const makePreset=()=>({version:1,model:models[getCurrent()].id,appearance:state,renderLab:cfg});
  $('labCopyLook').onclick=async()=>{
    const text=JSON.stringify(makePreset(),null,2);
    try{await navigator.clipboard.writeText(text);notify('Copied complete look JSON.');}
    catch{notify('Clipboard unavailable. Use Safari share/copy.');}
  };
  $('labLoadJSON').onchange=async()=>{
    try{
      const file=$('labLoadJSON').files?.[0];if(!file)return;
      const parsed=JSON.parse(await file.text());
      if(parsed.version!==1||!parsed.renderLab||typeof parsed.renderLab!=='object')throw Error('Invalid preset');
      const incoming=parsed.renderLab;
      for(const key of Object.keys(defaults)){
        if(key in incoming && ['number','boolean','string'].includes(typeof defaults[key]) &&
           typeof incoming[key]===typeof defaults[key])cfg[key]=incoming[key];
      }
      if(Array.isArray(incoming.customPalette)&&incoming.customPalette.length===4&&incoming.customPalette.every(v=>/^#[0-9a-fA-F]{6}$/.test(v)))cfg.customPalette=incoming.customPalette;
      presets.Custom=cfg.customPalette.slice();
      if(parsed.appearance?.palette in presets)state.palette=parsed.appearance.palette;
      syncAppearance();syncUI();persist();setCompare(Boolean(cfg.compare));
      notify('Imported look preset.');
    }catch{notify('Invalid look preset.');}
    $('labLoadJSON').value='';
  };
  const snapshot=()=>{
    // Compose DOM reference image and comparison labels with the WebGL output.
    const canvas=document.createElement('canvas');
    canvas.width=renderer.domElement.width;canvas.height=renderer.domElement.height;
    const context=canvas.getContext('2d');context.drawImage(renderer.domElement,0,0);
    if(imageOverlay.src && imageOverlay.complete && imageOverlay.naturalWidth){
      const scale=Math.min(canvas.width/imageOverlay.naturalWidth,canvas.height/imageOverlay.naturalHeight);
      const iw=imageOverlay.naturalWidth*scale,ih=imageOverlay.naturalHeight*scale;
      context.globalAlpha=+cfg.overlayOpacity;
      context.drawImage(imageOverlay,(canvas.width-iw)/2,(canvas.height-ih)/2,iw,ih);
      context.globalAlpha=1;
    }
    if(cfg.compare){
      const ratio=renderer.domElement.width/Math.max(1,innerWidth);
      context.font=`${Math.round(13*ratio)}px system-ui`;
      context.fillStyle='#ffffff';context.shadowColor='#000000';context.shadowBlur=5;
      context.textAlign='center';
      context.fillText(models[getCurrent()].name,canvas.width*.25,72*ratio);
      context.fillText(models[cfg.compareIndex]?.name||'',canvas.width*.75,72*ratio);
    }
    canvas.toBlob(blob=>{
      if(!blob){notify('PNG capture unavailable in this browser.');return;}
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='porygon-'+models[getCurrent()].id+(cfg.compare?'-comparison':'')+'.png';
      document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
    },'image/png');
  };
  $('labScreenshot').onclick=snapshot;
  const loadSecondary=async()=>{
    if(!cfg.compare)return;
    const token=++secondaryLoading;
    let index=Number.isInteger(cfg.compareIndex)&&cfg.compareIndex>=0&&cfg.compareIndex<models.length?cfg.compareIndex:0;
    if(index===getCurrent()&&models.length>1)index=(index+1)%models.length;
    cfg.compareIndex=index;
    if(secondaryCache.has(index)){
      secondaryModel=secondaryCache.get(index);secondaryIndex=index;
      syncUI();updateLight();return;
    }
    const entry=models[index];
    if(!entry)return;
    try{
      const manager=new THREE.LoadingManager(),loader=new OBJLoader(manager);
      if(entry.mtl){
        const mtl=await new MTLLoader(manager).setResourcePath('./chief/').loadAsync(entry.mtl);
        mtl.preload();loader.setMaterials(mtl);
      }
      const result=await loader.loadAsync(entry.file);
      if(token!==secondaryLoading){return;}
      result.traverse(o=>{
        if(!o.isMesh)return;o.geometry.computeVertexNormals();
        const make=source=>{
          const m=surface.clone();m.uniforms.palette.value=colors;
          m.uniforms.partId.value=entry.mtl?0:(parts[o.name]??0);
          m.uniforms.styleId.value=styles.indexOf(state.style);
          m.uniforms.originalPalette.value=state.palette==='Original'?1:0;
          if(entry.mtl){m.uniforms.textured.value=2;m.uniforms.diffuse.value.copy(source.color).convertLinearToSRGB();}
          if(source?.map){source.map.minFilter=THREE.NearestFilter;source.map.magFilter=THREE.NearestFilter;m.uniforms.colorMap.value=source.map;m.uniforms.textured.value=1;}
          source?.dispose();return m;
        };
        o.material=Array.isArray(o.material)?o.material.map(make):make(o.material);
      });
      result.visible=false;scene.add(result);
      secondaryCache.set(index,result);secondaryModel=result;secondaryIndex=index;
      updateLight();syncUI();notify('Ready to compare with '+entry.name+'.');
    }catch(err){console.error('Compare model load failed',err);notify('Could not load comparison model.');}
  };
  const setCompare = enabled=>{
    cfg.compare=Boolean(enabled);if(cfg.compare)loadSecondary();
    else{++secondaryLoading;if(secondaryModel)secondaryModel.visible=false;}
    resizeView();syncUI();persist();
  };
  compareBtn.onclick=()=>setCompare(!cfg.compare);
  const onModelChanged=()=>{
    currentTexture=null;
    if(secondaryModel)secondaryModel.visible=false;
    if(cfg.compare){
      if(cfg.compareIndex===getCurrent()&&models.length>1)cfg.compareIndex=(getCurrent()+1)%models.length;
      loadSecondary();
    }
    rebuildParts();updateLight();syncUI();
  };
  const onSync=()=>{
    for (const modelRoot of [getModel(),secondaryModel]) {
      for(const m of allMeshes(modelRoot))for(const mat of (Array.isArray(m.material)?m.material:[m.material])){
        if(mat?.uniforms){mat.uniforms.styleId.value=styles.indexOf(state.style);
          mat.uniforms.originalPalette.value=state.palette==='Original'?1:0;}
      }
    }
    syncFX();
  };
  const secondCamera=camera.clone();
  const render=(now)=>{
    const target=getTarget();if(!target)return;
    if(!fxTarget||fxTarget.width!==target.width||fxTarget.height!==target.height){
      fxTarget?.dispose();
      fxTarget=new THREE.WebGLRenderTarget(target.width,target.height,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat,depthBuffer:false});
    }
    renderer.setRenderTarget(target);renderer.setScissorTest(false);
    const primary=getModel();
    if(cfg.compare&&secondaryModel&&primary){
      const w=target.width,h=target.height,l=Math.floor(w/2),r=w-l;
      const primaryBounds=new THREE.Box3().setFromObject(primary);
      const secondaryBounds=new THREE.Box3().setFromObject(secondaryModel);
      const a=primaryBounds.getSize(new THREE.Vector3()).length()||1;
      const b=secondaryBounds.getSize(new THREE.Vector3()).length()||1;
      const from=controls.target;
      const to=secondaryBounds.getCenter(new THREE.Vector3());
      secondCamera.copy(camera);
      secondCamera.aspect=r/h;secondCamera.updateProjectionMatrix();
      secondCamera.position.copy(camera.position).sub(from).multiplyScalar(b/a).add(to);
      secondCamera.quaternion.copy(camera.quaternion);
      secondCamera.near=Math.max(.001,b/1000);secondCamera.far=b*100;secondCamera.updateProjectionMatrix();
      renderer.setScissorTest(true);
      renderer.setViewport(0,0,l,h);renderer.setScissor(0,0,l,h);
      primary.visible=true;secondaryModel.visible=false;
      renderer.clear();renderer.render(scene,camera);
      renderer.setViewport(l,0,r,h);renderer.setScissor(l,0,r,h);
      primary.visible=false;secondaryModel.visible=true;
      renderer.clear();renderer.render(scene,secondCamera);
      primary.visible=true;secondaryModel.visible=false;
      renderer.setScissorTest(false);
    }else{
      if(primary)primary.visible=true;
      if(secondaryModel)secondaryModel.visible=false;
      renderer.setViewport(0,0,target.width,target.height);
      renderer.clear();renderer.render(scene,camera);
    }
    renderer.setRenderTarget(fxTarget);
    renderer.setViewport(0,0,target.width,target.height);
    renderer.clear();renderer.render(postScene,postCamera);
    renderer.setRenderTarget(null);
    renderer.setViewport(0,0,innerWidth,innerHeight);
    fxMat.uniforms.source.value=fxTarget.texture;
    fxMat.uniforms.dims.value.set(target.width,target.height);
    fxMat.uniforms.time.value=now*.001;
    renderer.render(fxScene,fxCam);
  };
  window.addEventListener('beforeunload',()=>{
    if(overlayObjectURL)URL.revokeObjectURL(overlayObjectURL);
    fxTarget?.dispose();
  });
  syncUI();
  if(cfg.compare)loadSecondary();
  return { onModelChanged, onSync, render, releaseModel, isCompare:()=>Boolean(cfg.compare), save:persist };
}
