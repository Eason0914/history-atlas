/* Offline classroom atlas. No libraries, remote requests, or build step. */
'use strict';
(() => {
  const data = window.ATLAS_DATA;
  const decks = window.SLIDE_SOURCES;
  const entries = data.entries;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const deckById = new Map(decks.map(d => [d.id, d]));
  const slideById = new Map(decks.flatMap(d => d.slides.map(s => [s.id, {...s, deck:d}])));
  const STORAGE_KEY = 'classroom-history-atlas-v1';
  const initialParams=new URLSearchParams(location.search);
  const requestedUnit=initialParams.get('unit');
  const initialUnit=['all','units12','unit3'].includes(requestedUnit)?requestedUnit:'unit3';
  let canSave = true;
  let stored = {};
  try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) stored = parsed; } catch (_) { canSave = false; }
  const objectOrEmpty = x => x && typeof x === 'object' && !Array.isArray(x) ? x : {};
  const state = {selected:'ottoman', tab:'notes', view:'explore', unit:initialUnit, query:'', region:'all', period:'all', revisionOnly:false,
    progress:objectOrEmpty(stored.progress), drafts:objectOrEmpty(stored.drafts), libraryPage:0, quiz:null, missed:[], model:false};
  let filtered = entries.slice();
  let toastTimer;
  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({progress:state.progress, drafts:state.drafts})); canSave = true; }
    catch (_) { canSave = false; }
    return canSave;
  };
  const toast = (message) => { $('toast').textContent=message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600); };
  const sourceName = ref => { const s=slideById.get(ref); return s ? `${s.deck.label} · slide ${s.number}` : ref; };
  const citations = refs => `<div class="source-chips">${refs.map(ref=>`<button class="source-chip" data-source="${esc(ref)}">${esc(sourceName(ref))} ↗</button>`).join('')}</div>`;
  const current = () => entries.find(e=>e.id===state.selected);
  const normalized = s => String(s).toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const searchable = new Map(entries.map(e=>[e.id,normalized([e.name,e.region,e.summary,...e.facts,...e.traps,e.tea.prompt,e.dates].join(' '))]));
  const searchMatch = (e,q) => {
    const tokens=normalized(q).trim().split(/\s+/).filter(Boolean);
    return tokens.every(t=> searchable.get(e.id).includes(t) || (t.length>4 && t.endsWith('s') && searchable.get(e.id).includes(t.slice(0,-1))));
  };
  const matches = e => (state.unit==='all'||e.units.includes(state.unit)) && (state.period==='all'||e.periods.includes(state.period)) && (state.region==='all'||e.region===state.region) && (!state.revisionOnly||state.progress[e.id]==='review') && searchMatch(e,state.query);
  const progressCount = () => entries.filter(e=>state.progress[e.id]==='known').length;
  const updateProgress = () => { const n=progressCount(); $('progress-bar').style.width=`${n/entries.length*100}%`; $('progress-label').textContent=`${n} of ${entries.length} places reviewed`; };

  // Coastline geometry uses Natural Earth public-domain land polygons.
  const NS='http://www.w3.org/2000/svg';
  const svgEl = (name,attrs={}) => { const e=document.createElementNS(NS,name); Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v)); return e; };
  const project = (lon,lat) => [(lon+180)/360*1100,30+(85-lat)/145*540];
  const linePath = coordinates => coordinates.map(([lon,lat],i)=>{const [x,y]=project(lon,lat);return `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`;}).join(' ');
  window.WORLD_LAND.features.forEach(f=>{
    const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[];
    polys.forEach(poly=>{
      if (poly[0].every(p=>p[1]<-60)) return;
      const path=svgEl('path',{d:poly.map(r=>linePath(r)+'Z').join(' '),'fill-rule':'evenodd'});
      $('land').append(path);
    });
  });
  for(let lon=-150;lon<=150;lon+=30) $('graticule').append(svgEl('path',{d:linePath([[lon,85],[lon,-60]])}));
  for(let lat=-60;lat<=60;lat+=30) $('graticule').append(svgEl('path',{d:linePath([[-180,lat],[180,lat]])}));
  [ ['NORTH AMERICA',-115,53,false],['SOUTH AMERICA',-66,-10,false],['EUROPE',12,63,false],['AFRICA',17,6,false],['ASIA',88,64,false],['OCEANIA',144,-32,false],['Pacific Ocean',-147,-8,true],['Atlantic Ocean',-34,28,true],['Indian Ocean',74,-25,true] ].forEach(([label,lon,lat,ocean])=>{
    const [x,y]=project(lon,lat);const t=svgEl('text',{x,y,'text-anchor':'middle',class:ocean?'ocean-label':'continent-label'});t.textContent=label;$('map-labels').append(t);
  });
  // Small offsets separate neighboring study topics; lines retain their geographic anchors.
  const offsets={song:[20,23],ming:[-17,38],yuan:[-15,-13],korea:[23,-2],japan:[30,11],vietnam:[22,18],mongols:[0,-21],delhi:[0,-14],vijayanagara:[-15,4],calicut:[-29,14],khmer:[27,-5],malacca:[-4,18],majapahit:[28,14],baghdad:[-29,-7],seljuk:[18,12],ilkhanate:[19,-12],'gunpowder-preview':[24,31],ghana:[-19,-8],mali:[17,4],ethiopia:[17,-7],aztec:[-24,-3],olmec:[8,18],maya:[25,-5],chavin:[-16,-14],inca:[12,15],'western-europe':[9,17],england:[-14,-12],byzantium:[0,16],alandalus:[-20,3],'golden-horde':[-13,-15],chagatai:[15,4]};
  Object.assign(offsets,{ottoman:[-15,-10],safavid:[25,-12],mughal:[21,10],qing:[13,-32],songhai:[12,-18],tokugawa:[26,-10],'louis-france':[-15,20],'ming-silver':[-27,8],protestant:[-3,-23],'catholic-reform':[18,5],sikhism:[-24,-8]});
  const featured=new Set(['aztec','inca','maya','cahokia','song','japan','mongols','baghdad','delhi','malacca','mali','swahili','zimbabwe','western-europe','calicut']);
  ['ottoman','safavid','mughal','qing','songhai','tokugawa'].forEach(id=>featured.add(id));
  const markerEls=new Map();
  function activateMarker(id,input) {
    const activation=new CustomEvent('atlas:marker-activate',{detail:{id,input},cancelable:true});
    if(document.dispatchEvent(activation))selectEntry(id);
  }
  entries.forEach(e=>{
    const [x,y]=project(e.lon,e.lat);const [ox,oy]=offsets[e.id]||[0,0];
    const g=svgEl('g',{class:'marker','data-entry':e.id,role:'button',tabindex:'0','aria-label':`${e.name}. ${e.summary}`,transform:`translate(${x+ox},${y+oy})`});
    if(ox||oy) g.append(svgEl('line',{x1:-ox,y1:-oy,x2:0,y2:0,class:'leader'}));
    g.append(svgEl('circle',{r:15,fill:'transparent'}));g.append(svgEl('circle',{r:7,class:'marker-halo'}));g.append(svgEl('circle',{r:4.7,class:'marker-core'}));
    const text=svgEl('text',{x:10,y:3,class:'marker-label'});text.textContent=e.name.replace('Empire','').replace('city-states','').replace(' & Indian Ocean','').trim();g.append(text);
    g.addEventListener('click',()=>{if(!dragMoved)activateMarker(e.id,'pointer');});
    g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activateMarker(e.id,'keyboard');}});
    const showTip = () => {
      const r=g.getBoundingClientRect(),wrap=$('map-wrap').getBoundingClientRect();$('map-tooltip').textContent=e.name;$('map-tooltip').classList.add('visible');
      $('map-tooltip').style.left=Math.max(8,Math.min(r.left-wrap.left,wrap.width-210))+'px';$('map-tooltip').style.top=Math.max(8,r.top-wrap.top-32)+'px';
    };
    g.addEventListener('mouseenter',showTip);g.addEventListener('focus',showTip);g.addEventListener('mouseleave',()=>$('map-tooltip').classList.remove('visible'));g.addEventListener('blur',()=>$('map-tooltip').classList.remove('visible'));
    markerEls.set(e.id,{g,text});$('markers').append(g);
  });
  function updateMarkers() {
    const visible=new Set(filtered.map(e=>e.id));
    markerEls.forEach(({g,text},id)=>{
      g.style.display=visible.has(id)?'':'none';g.classList.toggle('selected',id===state.selected);g.classList.toggle('reviewed',state.progress[id]==='known');
      g.setAttribute('aria-pressed',String(id===state.selected));text.style.display=id===state.selected||featured.has(id)||zoom.k>1.6?'':'none';
    });
    if(state.selected) $('markers').append(markerEls.get(state.selected).g);
  }
  const zoom={k:1,x:0,y:0};
  const applyZoom = () => { $('map-world').setAttribute('transform',`translate(${zoom.x} ${zoom.y}) scale(${zoom.k})`); updateMarkers(); $('zoom-in').disabled=zoom.k>=4;$('zoom-out').disabled=zoom.k<=1; };
  const zoomBy = factor => {const old=zoom.k;zoom.k=Math.min(4,Math.max(1,old*factor));const ratio=zoom.k/old;zoom.x=550-(550-zoom.x)*ratio;zoom.y=305-(305-zoom.y)*ratio;if(zoom.k===1)zoom.x=zoom.y=0;applyZoom();};
  $('zoom-in').addEventListener('click',()=>zoomBy(1.35));$('zoom-out').addEventListener('click',()=>zoomBy(1/1.35));$('zoom-reset').addEventListener('click',()=>{zoom.k=1;zoom.x=zoom.y=0;applyZoom();});
  let drag=null,dragMoved=false;
  const mapPoint=event=>{const p=$('world-map').createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform($('world-map').getScreenCTM().inverse());};
  $('world-map').addEventListener('pointerdown',event=>{if(event.button!==0 || event.target.closest('.marker'))return;const p=mapPoint(event);drag={id:event.pointerId,x:p.x,y:p.y,zx:zoom.x,zy:zoom.y};dragMoved=false;$('world-map').setPointerCapture(event.pointerId);$('world-map').classList.add('dragging');});
  $('world-map').addEventListener('pointermove',event=>{if(!drag)return;const p=mapPoint(event);const dx=p.x-drag.x,dy=p.y-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)dragMoved=true;zoom.x=Math.max(-1100*zoom.k+100,Math.min(1000,drag.zx+dx));zoom.y=Math.max(-610*zoom.k+100,Math.min(510,drag.zy+dy));applyZoom();});
  const endDrag=()=>{drag=null;$('world-map').classList.remove('dragging');setTimeout(()=>{dragMoved=false;},0);};
  $('world-map').addEventListener('pointerup',endDrag);$('world-map').addEventListener('pointercancel',endDrag);

  function updateList() {
    $('result-count').textContent=`${filtered.length} ${filtered.length===1?'place':'places'}`;
    $('location-list').innerHTML=filtered.length?filtered.map(e=>`<button class="location-item ${e.id===state.selected?'active':''}" data-select="${e.id}" aria-pressed="${e.id===state.selected}"><span class="place-dot ${state.progress[e.id]==='known'?'known':''}" aria-hidden="true"></span><span><strong>${esc(e.name)}</strong><small>${esc(e.region)}${state.progress[e.id]==='review'?' · Needs review':''}${state.progress[e.id]==='known'?' · Reviewed':''}</small></span></button>`).join(''):'<p class="empty-results">No places match. Try another search or reset the filters.</p>';
    updateProgress();
  }
  function filterAll() {
    filtered=entries.filter(matches);
    if(state.unit==='unit3')filtered.sort((a,b)=>a.units.length-b.units.length);
    if(!filtered.some(e=>e.id===state.selected)){state.selected=filtered[0]?.id||null;state.tab='notes';state.model=false;renderDetail();}
    updateList();updateMarkers();$('map-tooltip').classList.remove('visible');
    const scopes={all:['1200–1750','Units 1–3 · earlier context and later illustrations labeled'],units12:['1200–1450','Units 1–2 · context and extensions included'],unit3:['1450–1750','Unit 3 · expansion, administration, and belief systems']};
    $('scope-note').innerHTML=`${esc(scopes[state.unit][0])} <span>${esc(scopes[state.unit][1])}</span>`;
    if(location.protocol!=='file:'){
      const url=new URL(location.href);url.searchParams.set('unit',state.unit);history.replaceState(null,'',url);
    }
    window.ATLAS_THEME?.syncControls();
  }
  function selectEntry(id,scroll=false) {
    if(!entries.some(e=>e.id===id))return;
    state.selected=id;state.tab='notes';state.model=false;renderDetail();updateList();updateMarkers();$('map-tooltip').classList.remove('visible');
    $('detail-panel').scrollTop=0;
    if(scroll || innerWidth<1051) $('detail-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    document.dispatchEvent(new CustomEvent('atlas:entry-selected',{detail:{id}}));
  }
  document.addEventListener('atlas:open-entry',event=>selectEntry(event.detail?.id,event.detail?.scroll===true));
  function imageSource(e) {return e.refs.find(ref=>slideById.get(ref)?.images.some(i=>i.path===e.image)) || [...slideById.values()].find(s=>s.images.some(i=>i.path===e.image))?.id;}
  function renderDetail() {
    const e=current();
    if(!e){$('detail-panel').innerHTML='<div class="panel-empty"><span class="eyebrow">ROOM TO EXPLORE</span><h2>No matching places</h2><p class="muted">Clear a filter or try a different keyword.</p><button class="secondary-button" data-action="clear">Reset filters</button></div>';return;}
    const src=imageSource(e);
    $('detail-panel').innerHTML=`<div class="detail-topline"><span>${esc(e.region)}</span><button class="save-button ${state.progress[e.id]==='review'?'saved':''}" data-action="review">${state.progress[e.id]==='review'?'⚑ Needs review':'+ Add to review'}</button></div>
      <p class="entry-unit">${e.units.map(u=>u==='unit3'?'UNIT 3':'UNITS 1–2').join(' + ')}</p><h2>${esc(e.name)}</h2><p class="date-line">${esc(e.dates)}</p>
      <figure class="detail-figure"><button data-source="${src}" aria-label="View classroom image and its source slide"><img src="${esc(e.displayImage)}" alt="Classroom illustration for ${esc(e.name)}" decoding="async"></button><figcaption>Image from your slides · <button data-source="${src}">${esc(sourceName(src))} ↗</button></figcaption></figure>
      ${e.imageNote?`<p class="image-period-note">${esc(e.imageNote)}</p>`:''}
      <p class="detail-summary">${esc(e.summary)}</p>
      <div class="detail-tabs" role="tablist" aria-label="Study content">${[['notes','Notes'],['tea','SAQ · TEA'],['mcq','MCQ traps'],['sources','Sources']].map(([id,label])=>`<button role="tab" id="tab-${id}" aria-selected="${state.tab===id}" aria-controls="study-content" tabindex="${state.tab===id?'0':'-1'}" class="${state.tab===id?'active':''}" data-tab="${id}">${label}</button>`).join('')}</div>
      <div id="study-content" role="tabpanel" aria-labelledby="tab-${state.tab}"></div>
      <div class="review-actions"><button data-action="known" class="${state.progress[e.id]==='known'?'chosen':''}">${state.progress[e.id]==='known'?'✓ Reviewed':'✓ I know this'}</button><button data-action="review" class="review ${state.progress[e.id]==='review'?'chosen':''}">↺ Review again</button></div>${!canSave?'<p class="storage-warning">Browser storage is unavailable. Progress and drafts will last only for this open page.</p>':''}`;
    renderStudyContent();
  }
  function renderStudyContent() {
    const e=current();if(!e)return;const area=$('study-content');
    if(state.tab==='notes')area.innerHTML=`<h3 class="detail-subhead">WHAT TO REMEMBER</h3><ul class="fact-list">${e.facts.map((f,i)=>`<li>${esc(f)}${e.factRefs?.[i]?`<span class="fact-evidence">${e.factRefs[i].map(ref=>`<button class="source-chip" data-source="${esc(ref)}">${esc(sourceName(ref))} ↗</button>`).join('')}</span>`:''}</li>`).join('')}</ul><h3 class="detail-subhead">SLIDE EVIDENCE</h3>${citations(e.refs)}`;
    if(state.tab==='tea'){
      // Keep the existing draft/data keys so older saved responses still load.
      const draft=objectOrEmpty(state.drafts[e.id]);
      area.innerHTML=`<p class="derived-label">TEA means Topic, Evidence, Analysis. Give a specific historical example and explain how it supports your claim. This is a writing guide, not three separate scoring points.</p><a class="teacher-context-link" href="https://ap-history-skills-lab.netlify.app/" target="_blank" rel="noopener noreferrer">Practice with your teacher’s SAQ examples ↗</a><div class="prompt-box">${esc(e.tea.prompt)}</div>
      <button class="secondary-button wide" data-action="model" aria-expanded="${state.model}">${state.model?'Hide':'Show'} model response</button>
      <div id="tea-model" ${state.model?'':'hidden'}>${[['T','Topic','topic'],['E','Evidence','explain'],['A','Analysis','analyze']].map(([letter,label,key])=>`<div class="tea-line"><span class="tea-letter">${letter}</span><div><strong>${label}</strong><p>${esc(e.tea[key])}</p></div></div>`).join('')}${citations(e.refs)}</div>
      <h3 class="detail-subhead">TRY IT IN YOUR OWN WORDS</h3>${[['topic','T · Topic: answer the prompt','topic'],['explain','E · Evidence: give a specific historical example','evidence'],['analyze','A · Analysis: explain how or why it supports your claim','analysis']].map(([key,label,part])=>`<label class="draft-field">${label}<textarea data-draft="${key}" spellcheck="true" placeholder="Write your ${part} here…">${esc(draft[key]||'')}</textarea></label>`).join('')}<p class="draft-status" id="draft-status">${canSave?'Your draft saves automatically in this browser.':'Browser storage unavailable. Keep a copy before closing.'}</p>`;
    }
    if(state.tab==='mcq')area.innerHTML=`<p class="derived-label">Distinctions to check before choosing an answer. These are study aids, not predictions of exam questions.</p><a class="teacher-context-link" href="https://quizlet.com/class/31576935/materials" target="_blank" rel="noopener noreferrer">Open your teacher’s Quizlet class ↗</a>${e.traps.map((t,i)=>`<div class="trap"><span>${String(i+1).padStart(2,'0')}</span><p>${esc(t)}</p></div>`).join('')}${citations(e.refs)}<button class="primary-button wide" data-action="single-quiz">Try a question about this place →</button>`;
    if(state.tab==='sources')area.innerHTML=`<p class="derived-label">Every historical note in this entry is based on these classroom slides. TEA analysis and quiz wording are derived study aids. Open a slide to check its original wording and images.</p>${citations(e.refs)}${data.issues.filter(i=>i.refs.some(ref=>e.refs.includes(ref))).map(i=>`<div class="source-warning"><strong>${esc(i.title)}</strong><p>${esc(i.text)}</p></div>`).join('')}<button class="secondary-button wide" data-action="library">Browse all ${data.meta.slides} slides ↗</button>`;
  }
  $('detail-panel').addEventListener('click',event=>{
    const tab=event.target.closest('[data-tab]');
    if(tab){state.tab=tab.dataset.tab;state.model=false;renderDetail();$(`tab-${state.tab}`).focus();return;}
    const action=event.target.closest('[data-action]')?.dataset.action;
    if(action==='clear'){clearFilters();return;}
    const e=current();if(!e)return;
    if(action==='known'||action==='review'){
      const status=action==='known'?'known':'review';state.progress[e.id]=state.progress[e.id]===status?undefined:status;const saved=save();
      if(state.revisionOnly)filterAll();else{renderDetail();updateList();updateMarkers();}
      toast(saved?(state.progress[e.id]==='known'?'Marked as reviewed':state.progress[e.id]==='review'?'Added to your review list':'Review status cleared'):'Saved for this page only; browser storage is unavailable.');
    }
    if(action==='model'){state.model=!state.model;$('tea-model').hidden=!state.model;const button=event.target.closest('button');button.textContent=`${state.model?'Hide':'Show'} model response`;button.setAttribute('aria-expanded',String(state.model));}
    if(action==='library')setView('library');
    if(action==='single-quiz'){setView('practice');startQuiz([e]);}
  });
  $('detail-panel').addEventListener('keydown',event=>{
    if(!event.target.matches('[role=tab]')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const tabs=['notes','tea','mcq','sources'];let i=tabs.indexOf(state.tab);i=event.key==='Home'?0:event.key==='End'?3:(i+(event.key==='ArrowRight'?1:3))%4;state.tab=tabs[i];renderDetail();$(`tab-${state.tab}`).focus();
  });
  $('detail-panel').addEventListener('input',event=>{
    const key=event.target.dataset.draft;if(!key)return;const e=current();if(!e)return;
    state.drafts[e.id]=objectOrEmpty(state.drafts[e.id]);state.drafts[e.id][key]=event.target.value;
    $('draft-status').textContent=save()?'Draft saved in this browser.':'Browser storage is unavailable. Copy your draft before closing.';
  });
  $('location-list').addEventListener('click',event=>{const id=event.target.closest('[data-select]')?.dataset.select;if(id)selectEntry(id);});
  $('search').addEventListener('input',event=>{state.query=event.target.value;filterAll();});
  $('unit').addEventListener('change',event=>{state.unit=event.target.value;state.period='all';$('period').value='all';filterAll();});
  $('period').addEventListener('change',event=>{state.period=event.target.value;filterAll();});
  $('region').addEventListener('change',event=>{state.region=event.target.value;filterAll();});
  $('revision-only').addEventListener('change',event=>{state.revisionOnly=event.target.checked;filterAll();});
  function clearFilters(){state.unit='all';state.query='';state.period='all';state.region='all';state.revisionOnly=false;$('unit').value='all';$('search').value='';$('period').value='all';$('region').value='all';$('revision-only').checked=false;filterAll();}
  $('clear-filters').addEventListener('click',clearFilters);
  [...new Set(entries.map(e=>e.region))].forEach(region=>{const option=document.createElement('option');option.value=region;option.textContent=region;$('region').append(option);});
  $('entry-count').textContent=entries.length;
  $('unit').value=state.unit;
  $('library-description').textContent=`All ${data.meta.decks} decks and ${data.meta.slides} slides, including ${data.meta.unit3Slides} new Unit 3 slides. Original text, speaker notes where present, and embedded images.`;
  $('review-issues').textContent=`${data.issues.length} source notes to check`;

  // Source library and exact slide provenance.
  function openDialog(html) {$('dialog-content').innerHTML=html;if(!$('source-dialog').open)$('source-dialog').showModal();$('source-dialog').scrollTop=0;}
  function openSource(ref) {
    const s=slideById.get(ref);if(!s)return;
    const title=slideTitle(s);const issues=data.issues.filter(i=>i.refs.includes(ref));
    openDialog(`<h2 id="dialog-title">${esc(s.deck.label)} · Slide ${s.number}</h2><p class="file-name">${esc(s.deck.file)}</p><p class="muted">${esc(title)}</p>
      ${issues.map(i=>`<div class="source-warning"><strong>Check with your teacher: ${esc(i.title)}</strong><p>${esc(i.text)}</p></div>`).join('')}
      <h3 class="detail-subhead">ORIGINAL SLIDE TEXT</h3><div class="original-text">${s.text.length?s.text.map(p=>`<p>${esc(p)}</p>`).join(''):'<p>No native text on this slide. See the embedded image below.</p>'}</div>
      ${s.visualDescription?`<p class="derived-label"><strong>Visual inspection note:</strong> ${esc(s.visualDescription)}</p>`:''}
      ${s.notes.length?`<h3 class="detail-subhead">SPEAKER NOTES</h3><div class="original-text">${s.notes.map(n=>`<p>${esc(n)}</p>`).join('')}</div>`:''}
      <h3 class="detail-subhead">EMBEDDED SLIDE IMAGES · ${s.images.length}</h3><p class="derived-label">Extracted from the presentation. These may be maps, later illustrations, modern photographs, or slide backgrounds; their presence does not establish a date or primary-source status.</p>
      ${s.images.map(i=>`<figure class="source-image"><a href="${esc(i.path)}" target="_blank" rel="noreferrer" aria-label="Open original embedded image"><img src="${esc(i.display||i.path)}" alt="Embedded image from ${esc(s.deck.label)}, slide ${s.number}" loading="lazy"></a><figcaption><span>${esc(i.original)} · ${i.width||'?'} × ${i.height||'?'}</span><a href="${esc(i.path)}" download>Original image ↓</a></figcaption></figure>`).join('')}`);
  }
  document.addEventListener('click',event=>{const button=event.target.closest('[data-source]');if(button)openSource(button.dataset.source);});
  $('dialog-close').addEventListener('click',()=>$('source-dialog').close());
  $('source-dialog').addEventListener('click',event=>{if(event.target===$('source-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
  function showIssues(){openDialog(`<h2 id="dialog-title">Source notes to check</h2><p class="muted">Original wording remains available in the library. Study aids avoid relying on these questionable or overbroad claims.</p>${data.issues.map(i=>`<article class="issue-item"><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p>${citations(i.refs)}</article>`).join('')}`);}
  $('review-issues').addEventListener('click',showIssues);
  function showAbout(){openDialog(`<h2 id="dialog-title">Built from your classroom.</h2><div class="about-copy"><p>${esc(data.meta.scope)}</p><div class="about-stats"><div><strong>${data.meta.decks}</strong><span>PowerPoint decks</span></div><div><strong>${data.meta.slides}</strong><span>Source slides</span></div><div><strong>${entries.length}</strong><span>Study locations</span></div><div><strong>${data.meta.images}</strong><span>Embedded images</span></div></div><p>${esc(data.meta.method)}</p><p><strong>Period filters:</strong> An entry may appear in more than one filter when its slides discuss background or later developments. Entries without precise dates use the lesson window; this is not evidence that a state existed for the entire window.</p><p><strong>Images:</strong> All historical illustrations come from the supplied presentations. Their original credits, where embedded, remain in the images. Images are not automatically contemporary or primary sources.</p><p><strong>Your work:</strong> Review status and TEA drafts save in this browser’s local storage. There are no accounts or uploads. Moving the folder, clearing browser data, or using a different browser may reset access to those drafts.</p><p><strong>Geography:</strong> Coastlines use the public-domain <a href="https://www.naturalearthdata.com/downloads/110m-physical-vectors/" target="_blank" rel="noreferrer">Natural Earth land dataset</a>. Marker locations and offsets are navigation aids, not historical claims about borders.</p><p><strong>Source cautions:</strong> ${data.issues.length} notes flag questionable claims, inconsistencies, or map-period mismatches in the decks. Check these with your teacher before using them in assessed work.</p><button class="secondary-button" id="about-issues">Read source notes ↗</button></div>`);$('about-issues').addEventListener('click',showIssues);}
  $('about-button').addEventListener('click',showAbout);
  function slideTitle(s){
    if(s.visualTitle)return s.visualTitle;
    if(s.visualDescription && s.text.every(t=>!t.trim())) return s.visualDescription.split('.')[0];
    const candidates=s.text.filter(t=>t.trim() && !/^©/.test(t));
    return [...candidates].reverse().find(t=>t.length<90 && !/^AP World History/.test(t))||candidates[0]||`Image-only slide ${s.number}`;
  }
  decks.forEach(d=>{const option=document.createElement('option');option.value=d.id;option.textContent=`${d.label} · ${d.slides.length} slides`;$('deck-filter').append(option);});
  function renderLibrary(){
    const query=normalized($('library-search').value).trim(),deck=$('deck-filter').value,unit=$('library-unit').value;
    const slides=[...slideById.values()].filter(s=>(unit==='all'||s.deck.unit===unit)&&(deck==='all'||s.deck.id===deck)&&normalized([...s.text,...s.notes,s.visualDescription||'',s.deck.label].join(' ')).includes(query));
    const size=12,pages=Math.max(1,Math.ceil(slides.length/size));state.libraryPage=Math.min(state.libraryPage,pages-1);
    $('library-count').textContent=`${slides.length} of ${data.meta.slides} slides${query?' match your search':''}`;
    $('slide-grid').innerHTML=slides.length?slides.slice(state.libraryPage*size,(state.libraryPage+1)*size).map(s=>{
      const image=s.images.find(i=>!/-image1\./i.test(i.path))||s.images[0];
      const preview=s.text.find(t=>t.length>100)||s.visualDescription||s.text.filter(t=>t.length>25).join(' ');
      return `<button class="slide-card" data-source="${s.id}"><span class="eyebrow">${esc(s.deck.label)} · SLIDE ${s.number}</span>${image?`<img class="slide-card-image" src="${esc(image.display||image.path)}" alt="" loading="lazy">`:''}<h3>${esc(slideTitle(s))}</h3><p>${esc(preview.slice(0,150))}${preview.length>150?'…':''}</p><span class="slide-open">Open original text & images ↗</span></button>`;
    }).join(''):'<p class="empty-results">No slides match this search.</p>';
    $('library-pagination').innerHTML=slides.length?`<button id="library-prev" ${state.libraryPage===0?'disabled':''}>← Previous</button><span>Page ${state.libraryPage+1} of ${pages}</span><button id="library-next" ${state.libraryPage>=pages-1?'disabled':''}>Next →</button>`:'';
    $('library-prev')?.addEventListener('click',()=>{state.libraryPage--;renderLibrary();$('library-count').scrollIntoView({block:'start'});});
    $('library-next')?.addEventListener('click',()=>{state.libraryPage++;renderLibrary();$('library-count').scrollIntoView({block:'start'});});
  }
  $('library-unit').addEventListener('change',()=>{state.libraryPage=0;$('deck-filter').value='all';renderLibrary();});
  $('library-search').addEventListener('input',()=>{state.libraryPage=0;renderLibrary();});$('deck-filter').addEventListener('change',()=>{state.libraryPage=0;renderLibrary();});

  // Practice sessions use shuffled options, explanations, and retry queues.
  const shuffle = input => {const a=input.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  function renderPracticeScope(){const parts=[];if(state.unit!=='all')parts.push(state.unit==='unit3'?'Unit 3':'Units 1–2');if(state.period!=='all')parts.push($('period').selectedOptions[0].textContent);if(state.region!=='all')parts.push(state.region);if(state.query)parts.push(`“${state.query}”`);if(state.revisionOnly)parts.push('needs review');$('practice-scope').textContent=`${filtered.length} matching places${parts.length?' · '+parts.join(' · '):' · All classroom material'}. Change these filters on the map.`;}
  function startQuiz(pool){
    const source=pool||filtered.filter(e=>!$('quiz-review-only').checked||state.progress[e.id]==='review');
    if(!source.length){$('quiz-area').innerHTML='<div class="quiz-empty"><h2>No questions in this selection</h2><p>Change the map filters or add a place to your review list.</p></div>';return;}
    const count=$('question-count').value==='all'?source.length:Number($('question-count').value);
    state.quiz={items:shuffle(source).slice(0,pool?source.length:count).map(e=>({entry:e,options:shuffle(e.quiz.options.map((text,index)=>({text,correct:index===0})))})),index:0,answers:[],answered:false};
    state.missed=[];$('resume-missed').hidden=true;renderQuestion();
  }
  function renderQuestion(){
    const q=state.quiz;if(!q)return;const item=q.items[q.index];q.answered=false;
    $('quiz-area').innerHTML=`<div class="quiz-topline"><span>QUESTION ${q.index+1} OF ${q.items.length}</span><span>${q.answers.filter(a=>a.correct).length} correct so far</span></div><div class="quiz-progress"><span style="width:${q.index/q.items.length*100}%"></span></div><span class="eyebrow">${esc(item.entry.region)} · ${esc(item.entry.name)}</span><h2>${esc(item.entry.quiz.question)}</h2><div class="quiz-options">${item.options.map((option,i)=>`<button class="quiz-option" data-answer="${i}"><span>${'ABCD'[i]}</span>${esc(option.text)}</button>`).join('')}</div><div id="quiz-feedback"></div>`;
  }
  function answerQuestion(index){
    const q=state.quiz;if(!q||q.answered)return;q.answered=true;const item=q.items[q.index],correct=item.options[index].correct;
    q.answers.push({id:item.entry.id,correct});if(!correct){state.missed.push(item.entry.id);state.progress[item.entry.id]='review';save();updateProgress();}
    $('quiz-area').querySelectorAll('[data-answer]').forEach((button,i)=>{button.disabled=true;if(item.options[i].correct)button.classList.add('correct');else if(i===index)button.classList.add('wrong');});
    $('quiz-feedback').innerHTML=`<div class="quiz-feedback ${correct?'':'wrong'}"><strong>${correct?'Correct.':'Keep this one in your review list.'}</strong><p>${esc(item.entry.quiz.explanation)}</p>${citations(item.entry.refs)}</div><button class="primary-button quiz-next" id="quiz-next">${q.index+1===q.items.length?'See results':'Next question'} →</button>`;
    $('quiz-next').addEventListener('click',()=>{q.index++;if(q.index>=q.items.length)renderResults();else renderQuestion();});
  }
  function renderResults(){
    const q=state.quiz,score=q.answers.filter(a=>a.correct).length;
    $('quiz-area').innerHTML=`<span class="eyebrow">SESSION COMPLETE</span><div class="quiz-result-number">${score}<span style="font-size:30px;color:var(--muted)"> / ${q.items.length}</span></div><h2>${score===q.items.length?'A good time to try explaining why.':'A few places to revisit.'}</h2><p class="muted">${state.missed.length?`${state.missed.length} missed ${state.missed.length===1?'place has':'places have'} been added to your review list.`:'Try a TEA response from memory, then compare it with the slide evidence.'}</p>${state.missed.length?`<ul class="missed-list">${state.missed.map(id=>{const e=entries.find(e=>e.id===id);return `<li><button data-revisit="${id}">${esc(e.name)} ↗</button><br><span class="muted">${esc(e.quiz.explanation)}</span></li>`;}).join('')}</ul><button class="primary-button" id="retry-results">Retry missed questions →</button>`:'<button class="primary-button" id="return-map">Back to the map →</button>'}`;
    $('resume-missed').hidden=!state.missed.length;$('retry-results')?.addEventListener('click',retryMissed);$('return-map')?.addEventListener('click',()=>setView('explore'));
  }
  function retryMissed(){const pool=entries.filter(e=>state.missed.includes(e.id));startQuiz(pool);}
  $('start-quiz').addEventListener('click',()=>startQuiz());$('resume-missed').addEventListener('click',retryMissed);
  $('quiz-area').addEventListener('click',event=>{const answer=event.target.closest('[data-answer]');if(answer)answerQuestion(Number(answer.dataset.answer));const revisit=event.target.closest('[data-revisit]');if(revisit){clearFilters();setView('explore');selectEntry(revisit.dataset.revisit,true);}});

  const comparisons=[
    'Compare Ottoman tax farmers with Mughal zamindars. How did each arrangement connect local collection to imperial revenue?',
    'Compare Ottoman devshirme recruitment with Tokugawa samurai service. How did officials and soldiers support political authority?',
    'Compare Louis XIV’s divine right with the Sapa Inca’s sacred ancestry. Different beliefs could support a similar political purpose.',
    'Compare Luther’s religious challenge with the Catholic response at Trent. Which authorities and teachings did each emphasize?',
    'Compare Aztec tribute through local rulers with Inca appointed officials. Both extracted resources, but organized authority differently.',
    'Compare Song examination officials with Japanese regional lords. Cultural influence coexisted with different political structures.',
    'Compare the Silk Roads’ luxury cargoes with the Indian Ocean’s bulk goods. How did transport costs shape exchange?',
    'Compare Mali’s trans-Saharan connections with the Swahili coast’s maritime trade. Which goods and institutions linked each region?',
    'Compare Mongol Yam stations with Inca roads. How did communication infrastructure support political authority?',
    'Compare Islamic networks after Abbasid fragmentation with shared Catholic institutions in Western Europe. Unity could take more than one form.'
  ];let comparison=0;
  $('connection-next').addEventListener('click',()=>{comparison=(comparison+1)%comparisons.length;$('connection-text').textContent=comparisons[comparison];});
  $('connection-text').textContent=comparisons[0];
  function setView(view){
    if(!['explore','practice','library'].includes(view))return;state.view=view;
    ['explore','practice','library'].forEach(id=>$(`view-${id}`).hidden=id!==view);
    document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    if(view==='explore'){filterAll();renderDetail();}
    if(view==='library')renderLibrary();
    if(view==='practice'){renderPracticeScope();if(!state.quiz)$('quiz-area').innerHTML='<div class="quiz-empty"><span class="big-symbol" aria-hidden="true">✳</span><h2>A little recall goes a long way.</h2><p>Start a session to test key distinctions, see explanations, and collect places to revisit.</p></div>';}
    history.replaceState(null,'',`#${view}`);window.ATLAS_THEME?.syncControls();window.scrollTo(0,0);
  }
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
  document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();setView('explore');});
  document.addEventListener('keydown',event=>{if(event.key==='/' && !$('source-dialog').open && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){event.preventDefault();setView('explore');$('search').focus();}});
  filterAll();applyZoom();renderDetail();
  const initial=location.hash.slice(1);if(['practice','library'].includes(initial))setView(initial);
  // A read-only snapshot helps local validation without exposing or sending browser drafts.
  window.ATLAS_READY={entries:entries.length,slides:slideById.size,unit3:entries.filter(e=>e.units.includes('unit3')).length,version:2};
})();
