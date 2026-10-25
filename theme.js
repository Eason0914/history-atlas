/* Both editions use the same content and the existing browser study records. */
(() => {
  'use strict';
  const root=document.documentElement;
  const key='classroom-history-atlas-theme';
  const valid=value=>['classic','glass'].includes(value);
  const requested=new URLSearchParams(location.search).get('theme');
  const leaf=location.pathname.split('/').pop();
  const explicit=leaf==='glass.html'?'glass':leaf==='classic.html'?'classic':null;
  let saved;
  try {saved=localStorage.getItem(key);} catch (_) {}
  let theme=valid(requested)?requested:explicit||(valid(saved)?saved:root.dataset.defaultTheme||'classic');
  function syncControls(){
    document.querySelectorAll('[data-theme-choice]').forEach(link=>{
      const active=link.dataset.themeChoice===theme;
      if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
      const target=new URL(link.dataset.themeChoice==='glass'?'glass.html':'classic.html',location.href);
      target.search=location.search;target.searchParams.delete('theme');target.hash=location.hash;
      link.href=target.href;
    });
  }
  function set(value,updateURL=false){
    if(!valid(value))return;
    theme=value;root.dataset.theme=value;
    const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=value==='glass'?'#eaf1fc':'#f7f5ef';
    try {localStorage.setItem(key,value);} catch (_) {}
    if(updateURL && location.protocol!=='file:'){
      const target=new URL(value==='glass'?'glass.html':'classic.html',location.href);target.search=location.search;target.searchParams.delete('theme');target.hash=location.hash;
      history.replaceState(null,'',target);
    }
    syncControls();
  }
  root.dataset.theme=theme;
  window.ATLAS_THEME={set,syncControls};
  document.addEventListener('DOMContentLoaded',()=>{
    set(theme);
    document.querySelectorAll('[data-theme-choice]').forEach(link=>link.addEventListener('click',event=>{
      if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();set(link.dataset.themeChoice,true);
    }));
  });
})();
