/* Liquid Glass controls. The map ocean uses the static Classic style. */
(() => {
  'use strict';
  const root=document.documentElement;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');

  // Keep labels separate from the optical layer so SVG distortion never bends text.
  const controls='.nav-button,[data-theme-choice],.map-controls button,.primary-button,.secondary-button,.save-button,.detail-tabs button,.review-actions button,.pagination button,.about-button,.icon-button';
  function enhanceButtons(){
    document.querySelectorAll(controls).forEach(control=>{
      if(control.querySelector(':scope > .liquid-control-label'))return;
      control.classList.add('liquid-control');
      const label=document.createElement('span');label.className='liquid-control-label';
      while(control.firstChild)label.append(control.firstChild);
      const optics=document.createElement('span');optics.className='liquid-control-optics';optics.setAttribute('aria-hidden','true');
      control.append(optics,label);
    });
  }
  let buttonFrame=0;
  new MutationObserver(()=>{if(buttonFrame)return;buttonFrame=requestAnimationFrame(()=>{buttonFrame=0;enhanceButtons();});}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('pointermove',event=>{
    if(root.dataset.theme!=='glass'||motion.matches)return;
    const control=event.target.closest(controls);if(!control)return;
    const r=control.getBoundingClientRect();control.style.setProperty('--glass-light-x',`${(event.clientX-r.left)/r.width*100}%`);control.style.setProperty('--glass-light-y',`${(event.clientY-r.top)/r.height*100}%`);
  },{passive:true});
  enhanceButtons();
})();
