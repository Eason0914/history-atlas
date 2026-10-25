/* Optional stage-one prototype: glass.html?prototype=live-map
   Original implementation; no page screenshots, remote textures, or runtime libraries.
   Chromium refracts the actual compositor backdrop. Other engines reuse the live
   map's SVG scene through <use>, so the fallback follows the same geometry. */
(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  if(params.get('prototype')!=='live-map')return;
  const root=document.documentElement;
  const map=document.getElementById('world-map');
  const wrap=document.getElementById('map-wrap');
  const explore=document.getElementById('view-explore');
  if(!map||!wrap||!window.ATLAS_DATA)return;
  root.dataset.mapPrototype='live';
  const NS='http://www.w3.org/2000/svg';
  const svg=(name,attrs={})=>{const element=document.createElementNS(NS,name);for(const [key,value] of Object.entries(attrs))element.setAttribute(key,value);return element;};
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const transparency=matchMedia('(prefers-reduced-transparency: reduce)');
  const contrast=matchMedia('(forced-colors: active)');
  const desktop=matchMedia('(min-width:1051px)');
  const nativeBackdrop=params.get('glassRenderer')!=='svg' && /(?:Chrome|Chromium|Edg|OPR)\//.test(navigator.userAgent) && CSS.supports('backdrop-filter','url("#filter")');
  const definitions=svg('svg',{class:'live-map-defs','aria-hidden':'true',focusable:'false'});
  const defs=svg('defs');definitions.append(defs);document.body.append(definitions);

  // Rounded-rectangle surface normals are encoded in red/green. Only the bevel
  // bends the backdrop; the center is neutral. The displacement is capped at 7px.
  function lensMap(width,height,radius){
    const factor=Math.min(1,1000/width);
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*factor));canvas.height=Math.max(1,Math.round(height*factor));
    const context=canvas.getContext('2d');if(!context)return null;
    const image=context.createImageData(canvas.width,canvas.height);
    const r=Math.min(radius,width/2,height/2),bevel=Math.min(16,height/3),eta=1/1.46;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
      const px=(x+.5)/factor-width/2,py=(y+.5)/factor-height/2;
      const qx=Math.abs(px)-width/2+r,qy=Math.abs(py)-height/2+r;
      const ox=Math.max(qx,0),oy=Math.max(qy,0),length=Math.hypot(ox,oy);
      const distance=length+Math.min(Math.max(qx,qy),0)-r;
      let nx=0,ny=0;
      if(length>0){nx=ox/length*Math.sign(px);ny=oy/length*Math.sign(py);}
      else if(qx>qy)nx=Math.sign(px);else ny=Math.sign(py);
      const depth=Math.max(0,Math.min(1,-distance/bevel));
      const slope=distance<=0?Math.pow(1-depth,2)*1.3:0;
      const normalZ=1/Math.sqrt(1+slope*slope);
      const ray=(eta*normalZ-Math.sqrt(1-eta*eta*(1-normalZ*normalZ)))*slope*normalZ;
      const offset=Math.max(-7,Math.min(7,ray*22));
      const i=(y*canvas.width+x)*4;
      image.data[i]=Math.round(127.5+nx*offset/20*255);
      image.data[i+1]=Math.round(127.5+ny*offset/20*255);
      image.data[i+2]=128;image.data[i+3]=255;
    }
    context.putImageData(image,0,0);return canvas.toDataURL('image/png');
  }

  class LiveGlassPane {
    constructor(element,name){
      this.element=element;this.size='';this.material='current';this.tintAmount=.28;this.failed=false;
      this.filter=svg('filter',{id:`atlas-live-${name}`,filterUnits:'userSpaceOnUse',primitiveUnits:'userSpaceOnUse','color-interpolation-filters':'sRGB'});
      this.heightMap=svg('feImage',{preserveAspectRatio:'none',result:'lens-normal'});
      this.filter.append(this.heightMap,svg('feDisplacementMap',{in:'SourceGraphic',in2:'lens-normal',scale:'20',xChannelSelector:'R',yChannelSelector:'G'}));defs.append(this.filter);
      this.optics=document.createElement('span');this.optics.className='live-glass-optics';
      this.tint=document.createElement('span');this.tint.className='live-glass-tint';
      this.fallback=document.createElement('span');this.fallback.className='live-glass-fallback';
      this.fallbackSVG=svg('svg',{width:'100%',height:'100%',preserveAspectRatio:'none',focusable:'false'});
      this.fallbackSVG.append(svg('rect',{width:'100%',height:'100%',fill:'#e7ede7'}));
      this.scene=svg('g');
      this.ocean=svg('rect',{fill:'url(#ocean-dots)'});
      this.scene.append(this.ocean,svg('use',{href:'#map-world'}));this.fallbackSVG.append(this.scene);this.fallback.append(this.fallbackSVG);
      for(const layer of [this.optics,this.fallback,this.tint]){layer.setAttribute('aria-hidden','true');layer.setAttribute('inert','');}
      element.prepend(this.optics,this.fallback,this.tint);
      element.style.setProperty('--live-lens-filter',`url("#atlas-live-${name}")`);
      this.observer=new ResizeObserver(()=>{this.resize();schedule();});this.observer.observe(element);
    }
    setMaterial(material){
      const next=material==='refined'&&window.ATLAS_GLASS_MATERIAL?'refined':'current';
      this.element.dataset.glassMaterial=next;
      if(next===this.material)return;
      this.material=next;this.size='';this.failed=false;
      this.filter.replaceChildren();
      if(next==='current'){
        this.heightMap=svg('feImage',{preserveAspectRatio:'none',result:'lens-normal'});
        this.filter.append(this.heightMap,svg('feDisplacementMap',{in:'SourceGraphic',in2:'lens-normal',scale:'20',xChannelSelector:'R',yChannelSelector:'G'}));
        if(this.edge)this.edge.hidden=true;
      }else{
        this.diffusionMap=svg('feImage',{preserveAspectRatio:'none',result:'diffusion-mask'});
        this.blur=svg('feGaussianBlur',{in:'SourceGraphic',stdDeviation:'1.1',result:'diffused'});
        this.heightMap=svg('feImage',{preserveAspectRatio:'none',result:'lens-normal'});
        const calibrated=svg('feComponentTransfer',{in:'lens-normal',result:'calibrated-normal'});
        calibrated.append(svg('feFuncR',{type:'linear',slope:1,intercept:-1/510}),svg('feFuncG',{type:'linear',slope:1,intercept:-1/510}));
        const merge=svg('feMerge',{result:'readable-source'});merge.append(svg('feMergeNode',{in:'clear-edge'}),svg('feMergeNode',{in:'soft-center'}));
        this.filter.append(this.blur,this.diffusionMap,svg('feComposite',{in:'diffused',in2:'diffusion-mask',operator:'in',result:'soft-center'}),svg('feComposite',{in:'SourceGraphic',in2:'diffusion-mask',operator:'out',result:'clear-edge'}),merge,this.heightMap,calibrated,svg('feDisplacementMap',{in:'readable-source',in2:'calibrated-normal',scale:'20',xChannelSelector:'R',yChannelSelector:'G'}));
        if(!this.edge){this.edge=document.createElement('span');this.edge.className='live-glass-edge';this.edge.setAttribute('aria-hidden','true');this.edge.setAttribute('inert','');this.element.prepend(this.edge);}
        this.edge.hidden=false;
      }
      this.setTint(this.tintAmount);this.resize();
    }
    setTint(amount){
      this.tintAmount=Math.max(0,Math.min(1,amount));
      this.element.style.setProperty('--glass-tint-alpha',(.07+this.tintAmount*.71).toFixed(3));
      if(this.blur)this.blur.setAttribute('stdDeviation',(.55+this.tintAmount*1.8).toFixed(2));
    }
    setActive(active){
      this.element.classList.toggle('live-glass',active);
      this.element.dataset.glassActive=String(active);
      this.element.dataset.glassRenderer=transparency.matches||contrast.matches||this.failed?'opaque':nativeBackdrop?'native-backdrop':'svg-map';
      if(active)this.resize();
    }
    resize(){
      if(this.element.hidden||this.element.dataset.glassActive!=='true'||transparency.matches||contrast.matches)return;
      const r=this.element.getBoundingClientRect(),width=this.material==='refined'?this.element.clientWidth:Math.round(r.width),height=this.material==='refined'?this.element.clientHeight:Math.round(r.height);
      const key=`${this.material}:${width}x${height}`;if(width<1||height<1||key===this.size)return;this.size=key;
      const radius=(parseFloat(getComputedStyle(this.element).borderRadius)||24)-(this.material==='refined'?1:0);
      const textures=this.material==='refined'?window.ATLAS_GLASS_MATERIAL.generate(width,height,radius):null;
      const uri=this.material==='refined'?textures?.normal:lensMap(width,height,radius);
      if(!uri){this.failed=true;this.element.dataset.glassRenderer='opaque';return;}
      for(const [name,value] of Object.entries({x:-12,y:-12,width:width+24,height:height+24}))this.filter.setAttribute(name,value);
      for(const [name,value] of Object.entries({x:0,y:0,width,height,href:uri}))this.heightMap.setAttribute(name,value);
      if(textures){
        for(const [name,value] of Object.entries({x:0,y:0,width,height,href:textures.diffusion}))this.diffusionMap.setAttribute(name,value);
        this.edge.style.backgroundImage=`url("${textures.light}")`;
      }
      this.fallbackSVG.setAttribute('viewBox',`0 0 ${width} ${height}`);
    }
    syncMap(){
      if(this.element.hidden||this.element.dataset.glassActive!=='true'||this.element.dataset.glassRenderer!=='svg-map')return;
      const matrix=map.getScreenCTM();if(!matrix)return;
      const r=this.element.getBoundingClientRect();
      this.scene.setAttribute('transform',`matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e-r.left-1} ${matrix.f-r.top-1})`);
      const box=map.viewBox.baseVal;
      for(const name of ['x','y','width','height'])this.ocean.setAttribute(name,box[name]);
    }
  }

  const card=document.createElement('section');card.id='marker-preview';card.className='marker-preview';card.hidden=true;
  card.setAttribute('role','dialog');card.setAttribute('aria-labelledby','preview-title');
  card.innerHTML='<p class="preview-meta"></p><h2 id="preview-title"></h2><p class="preview-dates"></p><p class="preview-summary"></p><p class="preview-context"></p><button class="preview-expand" type="button">Expand study notes <span aria-hidden="true">↗</span></button><button class="preview-close" type="button" aria-label="Dismiss location preview">×</button>';
  wrap.append(card);
  let pendingFrame=0,preview=null,lastPointer=null,dragged=false;
  const headerPane=new LiveGlassPane(document.querySelector('.site-header'),'navigation');
  const cardPane=new LiveGlassPane(card,'preview');
  let comparisonMaterial=params.get('material')==='current'?'current':'refined',diagnosticPinned=false;
  // New approved default also replaces preferences saved during the Qing trial.
  const tintStorageKey='classroom-atlas-glass-tint-v2';
  let savedTint=1;
  try{const value=localStorage.getItem(tintStorageKey);if(value!==null&&Number.isFinite(Number(value)))savedTint=Math.max(0,Math.min(1,Number(value)));}catch(_){}
  cardPane.setTint(savedTint);
  const enabled=()=>root.dataset.theme==='glass';
  const setAttribute=(element,name,value)=>{if(element.getAttribute(name)!==String(value))element.setAttribute(name,value);};
  function visibleBounds(){
    const r=wrap.getBoundingClientRect(),header=document.querySelector('.site-header').getBoundingClientRect();
    let left=Math.max(r.left+12,12),right=Math.min(r.right-12,innerWidth-12);
    let top=Math.max(r.top+12,header.bottom+12),bottom=Math.min(r.bottom-20,innerHeight-12);
    if(desktop.matches){
      left=Math.max(left,document.querySelector('.sidebar').getBoundingClientRect().right+16);
      right=Math.min(right,document.querySelector('.detail-panel').getBoundingClientRect().left-16);
      top=Math.max(top,document.querySelector('.atlas-heading').getBoundingClientRect().bottom+12);
      bottom=Math.min(bottom,document.querySelector('.map-legend').getBoundingClientRect().top-10);
    }
    return{left,right,top,bottom};
  }
  function layoutMap(){
    const background=map.querySelector(':scope>rect');
    if(!enabled()||!desktop.matches){
      setAttribute(map,'viewBox','0 0 1100 610');
      for(const [name,value] of Object.entries({x:0,y:0,width:1100,height:610}))setAttribute(background,name,value);
      return;
    }
    if(explore.hidden)return;
    const r=wrap.getBoundingClientRect(),b=visibleBounds();
    const scale=Math.max(.25,Math.min((b.right-b.left)/1100,(b.bottom-b.top-25)/610));
    const centerX=(b.left+b.right)/2-r.left,centerY=(b.top+b.bottom)/2-r.top;
    const box={x:550-centerX/scale,y:305-centerY/scale,width:r.width/scale,height:r.height/scale};
    setAttribute(map,'viewBox',Object.values(box).map(v=>v.toFixed(3)).join(' '));
    for(const [name,value] of Object.entries(box))setAttribute(background,name,value.toFixed(3));
    wrap.style.setProperty('--live-controls-right',`${r.right-b.right+6}px`);
    wrap.style.setProperty('--live-controls-bottom',`${r.bottom-b.bottom+6}px`);
    wrap.style.setProperty('--live-help-bottom',`${r.bottom-b.bottom+8}px`);
    wrap.style.setProperty('--live-help-right',`${r.right-b.right+58}px`);
    const stage=document.querySelector('.atlas-stage').getBoundingClientRect(),region=explore.getBoundingClientRect();
    explore.style.setProperty('--live-footer-left',`${stage.left-region.left+4}px`);
    explore.style.setProperty('--live-footer-right',`${region.right-stage.right+4}px`);
  }
  function closePreview(restoreFocus=false){
    if(!preview)return;
    const marker=preview.marker;marker.classList.remove('previewing','preview-pending');marker.removeAttribute('aria-expanded');marker.removeAttribute('aria-controls');
    preview=null;card.hidden=true;
    delete root.dataset.previewEntry;
    document.dispatchEvent(new CustomEvent('atlas:preview-closed'));
    if(restoreFocus&&marker.style.display!=='none')marker.focus({preventScroll:true});
  }
  function syncPreviewState(){
    if(!preview)return;
    const committed=document.querySelector('.marker.selected')?.dataset.entry;
    const lesson=window.ATLAS_DATA.entries.find(e=>e.id===committed),pending=committed!==preview.id;
    card.dataset.previewPending=String(pending);
    if(preview.marker.classList.contains('preview-pending')!==pending)preview.marker.classList.toggle('preview-pending',pending);
    const context=pending?`Study panel: ${lesson?.name||'no lesson selected'}`:'This lesson is open in the study panel.';
    if(card.querySelector('.preview-context').textContent!==context)card.querySelector('.preview-context').textContent=context;
  }
  function positionPreview(){
    if(!preview)return;
    const core=preview.marker.querySelector('.marker-core'),r=core.getBoundingClientRect(),b=visibleBounds(),base=wrap.getBoundingClientRect();
    const x=r.left+r.width/2,y=r.top+r.height/2;
    if(preview.marker.style.display==='none'||(!diagnosticPinned&&(x<b.left||x>b.right||y<b.top||y>b.bottom))){closePreview();return;}
    card.style.width=`${Math.max(190,Math.min(280,b.right-b.left))}px`;
    const width=card.offsetWidth,height=card.offsetHeight,gap=19;
    const choices=[{x:x+gap,y:y-height-10},{x:x+gap,y:y+gap},{x:x-width-gap,y:y-height-10},{x:x-width-gap,y:y+gap}];
    const controls=document.querySelector('.map-controls').getBoundingClientRect();
    const score=p=>{
      const overlapsControls=p.x<controls.right+8&&p.x+width>controls.left-8&&p.y<controls.bottom+8&&p.y+height>controls.top-8;
      return Math.max(0,b.left-p.x)+Math.max(0,p.x+width-b.right)+Math.max(0,b.top-p.y)+Math.max(0,p.y+height-b.bottom)+(overlapsControls?100:0);
    };
    let best=0;choices.forEach((candidate,index)=>{if(score(candidate)<score(choices[best]))best=index;});
    if(preview.placement!==undefined&&score(choices[preview.placement])<=score(choices[best])+24)best=preview.placement;
    preview.placement=best;
    const point=diagnosticPinned&&preview.pinned?preview.pinned:choices[best];
    const maxTop=Math.min(b.bottom-height,innerHeight-height-12);
    const minTop=Math.min(b.top,Math.max(document.querySelector('.site-header').getBoundingClientRect().bottom+8,maxTop));
    const left=Math.max(b.left,Math.min(point.x,b.right-width)),top=Math.max(minTop,Math.min(point.y,maxTop));
    card.style.left=`${left-base.left}px`;card.style.top=`${top-base.top}px`;
    if(diagnosticPinned)preview.pinned={x:left,y:top};
  }
  function openPreview(id,input){
    const entry=window.ATLAS_DATA.entries.find(e=>e.id===id),marker=document.querySelector(`.marker[data-entry="${id}"]`);
    if(!entry||!marker)return;
    closePreview();preview={id,marker};
    card.querySelector('.preview-meta').textContent=`Preview · ${entry.region}`;
    card.querySelector('#preview-title').textContent=entry.name;
    card.querySelector('.preview-dates').textContent=entry.dates;
    card.querySelector('.preview-summary').textContent=entry.summary;
    card.dataset.entry=id;root.dataset.previewEntry=id;syncPreviewState();
    cardPane.setMaterial(id==='qing'?comparisonMaterial:'refined');
    marker.classList.add('previewing');marker.setAttribute('aria-expanded','true');marker.setAttribute('aria-controls',card.id);
    card.hidden=false;cardPane.setActive(true);positionPreview();cardPane.syncMap();
    if(input==='keyboard'&&!card.hidden)card.querySelector('.preview-expand').focus({preventScroll:true});
    document.dispatchEvent(new CustomEvent('atlas:preview-opened',{detail:{id,material:cardPane.material,tint:cardPane.tintAmount}}));
  }
  function update(){
    pendingFrame=0;
    const view=explore.hidden?(document.getElementById('view-practice').hidden?'library':'practice'):'explore';
    if(root.dataset.atlasView!==view)root.dataset.atlasView=view;
    if(!enabled()||explore.hidden)closePreview();
    headerPane.setActive(enabled()&&!explore.hidden);cardPane.setActive(enabled());
    layoutMap();syncPreviewState();positionPreview();headerPane.syncMap();cardPane.syncMap();
    for(const marker of document.querySelectorAll('.marker')){
      if(enabled())setAttribute(marker,'aria-haspopup','dialog');else marker.removeAttribute('aria-haspopup');
    }
  }
  function schedule(){if(!pendingFrame)pendingFrame=requestAnimationFrame(update);}
  document.addEventListener('atlas:marker-activate',event=>{if(!enabled())return;event.preventDefault();openPreview(event.detail.id,event.detail.input);});
  document.addEventListener('atlas:entry-selected',()=>closePreview());
  document.addEventListener('atlas:preview-request',event=>{if(enabled())openPreview(event.detail?.id,'pointer');});
  document.addEventListener('atlas:glass-settings',event=>{
    const settings=event.detail||{};
    if(settings.material){comparisonMaterial=settings.material==='current'?'current':'refined';if(preview?.id==='qing')cardPane.setMaterial(comparisonMaterial);}
    if(Number.isFinite(settings.tint)){cardPane.setTint(settings.tint);try{localStorage.setItem(tintStorageKey,String(cardPane.tintAmount));}catch(_){}}
    if(typeof settings.pinned==='boolean'){diagnosticPinned=settings.pinned;card.dataset.pinned=String(diagnosticPinned);if(preview)delete preview.pinned;}
    schedule();
  });
  let lightFrame=0,lightPointer=null;
  card.addEventListener('pointermove',event=>{
    if(motion.matches||cardPane.material!=='refined')return;lightPointer={x:event.clientX,y:event.clientY};if(lightFrame)return;
    lightFrame=requestAnimationFrame(()=>{lightFrame=0;const r=card.getBoundingClientRect();card.style.setProperty('--glass-light-x',`${(lightPointer.x-r.left)/r.width*100}%`);card.style.setProperty('--glass-light-y',`${Math.max(0,Math.min(40,(lightPointer.y-r.top)/r.height*40))}%`);});
  },{passive:true});
  card.querySelector('.preview-expand').addEventListener('click',()=>{
    if(!preview)return;const id=preview.id;closePreview();
    document.dispatchEvent(new CustomEvent('atlas:open-entry',{detail:{id}}));
    document.getElementById('detail-panel').focus({preventScroll:true});
  });
  card.querySelector('.preview-close').addEventListener('click',()=>closePreview(true));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&preview&&!document.getElementById('source-dialog').open){event.preventDefault();closePreview(true);}});
  document.addEventListener('pointerdown',event=>{lastPointer={x:event.clientX,y:event.clientY};dragged=false;},{passive:true});
  document.addEventListener('pointermove',event=>{if(lastPointer&&Math.hypot(event.clientX-lastPointer.x,event.clientY-lastPointer.y)>5)dragged=true;},{passive:true});
  document.addEventListener('click',event=>{
    if(!preview||card.contains(event.target)||event.target.closest('.marker,.map-controls,#glass-diagnostics'))return;
    if(event.target.closest('#world-map')&&dragged)return;
    closePreview();
  });
  new MutationObserver(schedule).observe(document.getElementById('map-world'),{attributes:true,subtree:true,childList:true});
  new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['data-theme']});
  new MutationObserver(schedule).observe(explore,{attributes:true,attributeFilter:['hidden']});
  new ResizeObserver(schedule).observe(wrap);
  window.addEventListener('resize',schedule,{passive:true});window.addEventListener('scroll',schedule,{passive:true,capture:true});
  for(const preference of [desktop,motion,transparency,contrast])preference.addEventListener('change',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
  update();
})();
