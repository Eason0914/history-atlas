(() => {
  'use strict';
  const explore=document.getElementById('view-explore');
  const panel=document.getElementById('detail-panel');
  if(!explore||!panel)return;
  const desktop=matchMedia('(min-width:1051px)');
  const storageKey='classroom-atlas-study-width-v1';
  let preferred=null,frame=0,drag=null,baselineLeft=null;
  try{
    const saved=Number(localStorage.getItem(storageKey));
    if(Number.isFinite(saved)&&saved>=320&&saved<=760)preferred=saved;
  }catch{/* Reading remains available when storage is disabled. */}
  const handle=document.createElement('div');
  handle.className='study-resize-handle';handle.tabIndex=0;
  handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');
  handle.setAttribute('aria-label','Resize study panel');handle.setAttribute('aria-controls',panel.id);
  handle.title='Drag to resize · Double-click to reset · Arrow keys to adjust';
  explore.append(handle);
  const pixels=value=>parseFloat(value)||0;
  function limits(){
    const style=getComputedStyle(explore),left=baselineLeft??document.querySelector('.sidebar').getBoundingClientRect().width;
    const space=explore.clientWidth-pixels(style.paddingLeft)-pixels(style.paddingRight)-2*pixels(style.columnGap)-left;
    return{left,min:320,max:Math.max(320,Math.min(760,Math.floor(space-(innerWidth<=1300?300:350))))};
  }
  function persist(){
    try{if(preferred===null)localStorage.removeItem(storageKey);else localStorage.setItem(storageKey,String(preferred));}catch{/* Resizing also works without persistence. */}
  }
  function update(){
    frame=0;
    const active=desktop.matches&&!explore.hidden;
    handle.hidden=!active;
    if(!desktop.matches){explore.style.removeProperty('grid-template-columns');return;}
    if(!active)return;
    if(baselineLeft===null){
      explore.style.removeProperty('grid-template-columns');
      baselineLeft=document.querySelector('.sidebar').getBoundingClientRect().width;
    }
    const bound=limits();
    if(preferred===null)explore.style.removeProperty('grid-template-columns');
    else{
      const width=Math.max(bound.min,Math.min(bound.max,preferred));
      const columns=`${bound.left}px minmax(${innerWidth<=1300?300:350}px, 1fr) ${width}px`;
      if(explore.style.gridTemplateColumns!==columns)explore.style.gridTemplateColumns=columns;
    }
    const r=panel.getBoundingClientRect(),parent=explore.getBoundingClientRect();
    for(const [name,value] of Object.entries({left:`${r.left-parent.left-7}px`,top:`${r.top-parent.top}px`,height:`${r.height}px`})){
      if(handle.style[name]!==value)handle.style[name]=value;
    }
    handle.setAttribute('aria-valuemin',String(bound.min));handle.setAttribute('aria-valuemax',String(bound.max));
    handle.setAttribute('aria-valuenow',String(Math.round(r.width)));
    handle.setAttribute('aria-valuetext',`${Math.round(r.width)} pixels wide`);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  function finish(event){
    if(!drag||(event?.pointerId!==undefined&&event.pointerId!==drag.id))return;
    const id=drag.id;drag=null;document.body.classList.remove('study-resizing');
    if(handle.hasPointerCapture(id))handle.releasePointerCapture(id);
    persist();schedule();
  }
  handle.addEventListener('pointerdown',event=>{
    if(!desktop.matches||event.button!==0||drag)return;
    event.preventDefault();
    drag={id:event.pointerId,x:event.clientX,width:panel.getBoundingClientRect().width};
    handle.setPointerCapture(event.pointerId);handle.focus({preventScroll:true});
    document.body.classList.add('study-resizing');window.getSelection()?.removeAllRanges();
  });
  handle.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const bound=limits();
    preferred=Math.round(Math.max(bound.min,Math.min(bound.max,drag.width+drag.x-event.clientX)));
    schedule();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(type,finish);
  window.addEventListener('blur',()=>finish());
  function reset(){preferred=null;persist();schedule();}
  handle.addEventListener('dblclick',reset);
  handle.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    if(event.key==='Home'){reset();return;}
    const bound=limits(),step=event.shiftKey?50:20;
    preferred=event.key==='End'?bound.max:Math.round(Math.max(bound.min,Math.min(bound.max,panel.getBoundingClientRect().width+(event.key==='ArrowLeft'?step:-step))));
    persist();schedule();
  });
  new ResizeObserver(schedule).observe(panel);
  new ResizeObserver(schedule).observe(explore);
  new MutationObserver(()=>{if(explore.hidden)finish();schedule();}).observe(explore,{attributes:true,attributeFilter:['hidden']});
  function refresh(){baselineLeft=null;schedule();}
  new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  desktop.addEventListener('change',()=>{finish();refresh();});
  window.addEventListener('resize',refresh,{passive:true});
  window.addEventListener('scroll',schedule,{passive:true,capture:true});
  schedule();
})();
