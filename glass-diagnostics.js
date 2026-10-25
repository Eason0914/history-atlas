/* Temporary inspection tools. The diagnostic grid belongs to the live map scene,
   so it pans/zooms with the geography and is sampled by the same optical filter. */
(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  if(params.get('prototype')!=='live-map'||params.get('diagnostics')!=='glass')return;
  const map=document.getElementById('map-world'),card=document.getElementById('marker-preview');if(!map||!card)return;
  const subscriptions=new AbortController(),signal=subscriptions.signal;
  const NS='http://www.w3.org/2000/svg';
  const grid=document.createElementNS(NS,'g');grid.id='glass-diagnostic-grid';grid.classList.add('glass-diagnostic-grid');grid.setAttribute('aria-hidden','true');grid.setAttribute('pointer-events','none');
  let path='';
  for(let x=-3300;x<=4400;x+=28)path+=`M${x},-2000V2600`;
  for(let y=-2000;y<=2600;y+=28)path+=`M-3300,${y}H4400`;
  const lines=document.createElementNS(NS,'path');lines.setAttribute('d',path);lines.setAttribute('fill','none');lines.setAttribute('stroke','#345b7f');lines.setAttribute('stroke-width','.8');lines.setAttribute('opacity','.36');lines.setAttribute('vector-effect','non-scaling-stroke');
  const diagonal=document.createElementNS(NS,'path');let diagonalPath='';
  for(let x=-3300;x<=4400;x+=112)diagonalPath+=`M${x},-1200l3800,3800`;
  diagonal.setAttribute('d',diagonalPath);diagonal.setAttribute('stroke','#3e6587');diagonal.setAttribute('stroke-width','1');diagonal.setAttribute('opacity','.25');diagonal.setAttribute('fill','none');diagonal.setAttribute('vector-effect','non-scaling-stroke');
  grid.append(lines,diagonal);grid.style.display='none';map.insertBefore(grid,document.getElementById('markers'));
  const panel=document.createElement('aside');panel.id='glass-diagnostics';panel.setAttribute('aria-label','Temporary glass comparison controls');
  panel.innerHTML='<div class="diagnostic-heading"><h2>Qing China · Glass comparison</h2><button class="diagnostic-close" type="button" aria-label="Close diagnostics and remove grid">×</button></div><div class="diagnostic-variants" role="group" aria-label="Compare glass materials"><button type="button" data-material="current" aria-pressed="false">A · Previous</button><button type="button" data-material="refined" aria-pressed="true">B · Refined</button></div><label class="diagnostic-tint-label" for="glass-tint"><span>Ultra-clear</span><span id="glass-tint-value">100%</span><span>Tinted</span></label><input id="glass-tint" type="range" min="0" max="100" value="100" aria-label="Glass tint from ultra-clear to tinted"><div class="diagnostic-options"><label><input id="glass-grid" type="checkbox"> Thin grid</label><label><input id="glass-pin" type="checkbox" checked> Hold card still</label><button class="diagnostic-reopen" type="button">Reopen Qing</button></div><p class="diagnostic-status" role="status">Pan or zoom the map to inspect the edge.</p>';
  document.body.append(panel);
  const send=detail=>document.dispatchEvent(new CustomEvent('atlas:glass-settings',{detail}));
  const tint=panel.querySelector('#glass-tint'),pin=panel.querySelector('#glass-pin'),gridCheck=panel.querySelector('#glass-grid');
  const readStatus=()=>{
    if(card.hidden||card.dataset.entry!=='qing'){panel.querySelector('.diagnostic-status').textContent='Reopen Qing to compare. The main study panel stays independent until Expand.';tint.disabled=true;return;}
    const name=card.dataset.glassRenderer==='native-backdrop'?'Live compositor backdrop':card.dataset.glassRenderer==='svg-map'?'Live SVG map fallback':'Opaque accessibility fallback';
    panel.querySelector('.diagnostic-status').textContent=`${name} · ${card.dataset.glassMaterial==='current'?'A uses the previous fixed tint.':'B keeps the center readable.'} ${pin.checked?'Card held still; drag the exposed map.':'Card follows its marker.'}`;
    tint.disabled=card.dataset.glassMaterial==='current';
  };
  panel.querySelectorAll('[data-material]').forEach(button=>button.addEventListener('click',()=>{
    panel.querySelectorAll('[data-material]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
    send({material:button.dataset.material});if(card.hidden||card.dataset.entry!=='qing')reopen();readStatus();
  }));
  tint.addEventListener('input',()=>{panel.querySelector('#glass-tint-value').textContent=`${tint.value}%`;send({tint:Number(tint.value)/100});});
  pin.addEventListener('change',()=>{send({pinned:pin.checked});readStatus();});
  gridCheck.addEventListener('change',()=>{grid.style.display=gridCheck.checked?'':'none';});
  const reopen=()=>{if(innerWidth<=1050)document.getElementById('map-wrap').scrollIntoView({block:'center',behavior:'instant'});document.dispatchEvent(new CustomEvent('atlas:preview-request',{detail:{id:'qing'}}));readStatus();};
  panel.querySelector('.diagnostic-reopen').addEventListener('click',reopen);
  panel.querySelector('.diagnostic-close').addEventListener('click',()=>{observer.disconnect();subscriptions.abort();grid.remove();panel.remove();send({pinned:false});});
  document.addEventListener('atlas:preview-opened',event=>{tint.value=String(Math.round(event.detail.tint*100));panel.querySelector('#glass-tint-value').textContent=`${tint.value}%`;if(event.detail.id==='qing')panel.querySelectorAll('[data-material]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.material===event.detail.material)));readStatus();},{signal});
  document.addEventListener('atlas:preview-closed',readStatus,{signal});
  function place(){
    const visible=document.documentElement.dataset.theme==='glass'&&!document.getElementById('view-explore').hidden;
    panel.hidden=!visible;const display=visible&&gridCheck.checked?'':'none';if(grid.style.display!==display)grid.style.display=display;
    if(innerWidth<=1050)return;
    const left=document.querySelector('.sidebar').getBoundingClientRect().right+20,right=document.querySelector('.detail-panel').getBoundingClientRect().left-20;
    panel.style.setProperty('--diagnostic-left',`${left}px`);panel.style.setProperty('--diagnostic-width',`${Math.min(480,right-left)}px`);
  }
  const observer=new MutationObserver(place);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-atlas-view']});
  window.addEventListener('resize',place,{passive:true,signal});place();send({pinned:true});reopen();
})();
