/* Original ocean optics renderer. Only the photograph is refracted; map geometry stays intact. */
(() => {
  'use strict';
  const root=document.documentElement;
  const surface=document.getElementById('ocean-surface');
  const canvas=document.getElementById('ocean-canvas');
  const map=document.getElementById('map-wrap');
  if(!surface||!canvas||!map)return;
  const photoURL=new URL('assets/ocean-surface.jpg',document.baseURI).href;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const transparency=matchMedia('(prefers-reduced-transparency: reduce)');
  let image,loading=false,loaded=false,gl,program,texture,uniforms,frame=0,last=0,visible=true,failed=false;
  const pointer={x:.48,y:.50,targetX:.48,targetY:.50,active:0,targetActive:0};
  const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment=`precision mediump float;
    varying vec2 uv;
    uniform sampler2D photo;
    uniform vec2 resolution;
    uniform vec2 photoSize;
    uniform vec3 pointer;
    uniform float seconds;
    uniform float amount;
    vec2 cover(vec2 p){float screen=resolution.x/resolution.y;float aspect=photoSize.x/photoSize.y;vec2 ratio=vec2(min(screen/aspect,1.),min(aspect/screen,1.));return clamp((p-.5)*ratio+.5,vec2(.002),vec2(.998));}
    void main(){
      vec2 p=uv*2.-1.;
      float t=seconds*.19;
      vec2 edge=vec2(sign(p.x)*pow(abs(p.x),11.),sign(p.y)*pow(abs(p.y),11.));
      float rim=clamp(pow(abs(p.x),14.)+pow(abs(p.y),14.),0.,1.);
      vec2 slope=edge*1.9;
      slope+=vec2(.21*cos(p.x*4.7+p.y*2.8+t),.19*sin(p.y*4.9-p.x*2.1-t*.7));
      slope+=vec2(.10*sin(p.y*8.1+t*.55),.09*cos(p.x*7.2-t*.6));
      vec2 d=uv-pointer.xy;
      vec2 metric=d*vec2(resolution.x/resolution.y,1.);
      float lens=exp(-dot(metric,metric)*16.);
      slope+=d*lens*3.6*pointer.z;
      vec3 normal=normalize(vec3(slope,1.));
      vec3 ray=refract(vec3(0.,0.,-1.),normal,1./1.46);
      vec2 shift=ray.xy*.18*amount;
      vec2 sampleAt=uv+shift;
      float fringe=(.0008+.0018*rim)*amount;
      vec3 color=vec3(texture2D(photo,cover(sampleAt+vec2(fringe,0.))).r,texture2D(photo,cover(sampleAt)).g,texture2D(photo,cover(sampleAt-vec2(fringe,0.))).b);
      color=mix(color,color*vec3(.83,1.04,1.19)+vec3(.01,.035,.055),.42);
      vec3 light=normalize(vec3(-.7,.8,1.7));
      float shine=pow(max(dot(reflect(-light,normal),vec3(0.,0.,1.)),0.),54.);
      float fresnel=pow(1.-max(normal.z,0.),2.);
      color+=amount*(vec3(.75,.88,1.)*shine*.19+vec3(.65,.85,1.)*fresnel*.20);
      color=mix(color,vec3(.91,.97,1.),rim*.31*amount);
      gl_FragColor=vec4(color,1.);
    }`;
  function shader(type,source){const object=gl.createShader(type);gl.shaderSource(object,source);gl.compileShader(object);if(!gl.getShaderParameter(object,gl.COMPILE_STATUS))throw new Error('Ocean shader compilation failed');return object;}
  function svgFallback(){
    failed=true;gl=null;surface.dataset.renderer='svg';
    document.getElementById('ocean-fallback-photo').setAttribute('href',photoURL);
    surface.dataset.loaded='true';
  }
  function initialize(){
    if(location.protocol==='file:'){svgFallback();return;}
    try {
      gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power',preserveDrawingBuffer:false});
      if(!gl){svgFallback();return;}
      program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Ocean shader link failed');
      gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
      uniforms={};['photo','resolution','photoSize','pointer','seconds','amount'].forEach(name=>uniforms[name]=gl.getUniformLocation(program,name));
      gl.uniform1i(uniforms.photo,0);gl.uniform2f(uniforms.photoSize,image.naturalWidth,image.naturalHeight);
      surface.dataset.renderer='webgl';surface.dataset.loaded='true';resize();
    } catch (_) {svgFallback();}
  }
  function resize(){
    if(!gl)return;
    const bounds=map.getBoundingClientRect();const ratio=Math.min(devicePixelRatio||1,innerWidth<700?1:1.35);const scale=Math.min(1,1400/(bounds.width*ratio));
    canvas.width=Math.max(1,Math.round(bounds.width*ratio*scale));canvas.height=Math.max(1,Math.round(bounds.height*ratio*scale));
    gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);draw(performance.now());
  }
  function draw(now){
    if(!gl||failed||!loaded)return;
    const staticView=motion.matches||transparency.matches;
    pointer.x+=(pointer.targetX-pointer.x)*.12;pointer.y+=(pointer.targetY-pointer.y)*.12;pointer.active+=(pointer.targetActive-pointer.active)*.10;
    gl.uniform3f(uniforms.pointer,pointer.x,pointer.y,staticView?0:pointer.active);
    gl.uniform1f(uniforms.seconds,staticView?0:now/1000);gl.uniform1f(uniforms.amount,transparency.matches?0:1);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  const active=()=>root.dataset.theme==='glass'&&visible&&!document.hidden&&!document.getElementById('view-explore').hidden;
  function tick(now){
    frame=0;if(!active()||motion.matches||transparency.matches||failed)return;
    if(now-last>1000/24){last=now;draw(now);}frame=requestAnimationFrame(tick);
  }
  function sync(){
    if(frame){cancelAnimationFrame(frame);frame=0;}
    if(root.dataset.theme==='glass'&&!loaded&&!loading){
      loading=true;image=new Image();image.onload=()=>{loaded=true;initialize();sync();};image.onerror=()=>{surface.dataset.renderer='unavailable';};image.src=photoURL;
    }
    if(active()&&loaded){resize();if(!motion.matches&&!transparency.matches&&!failed)frame=requestAnimationFrame(tick);}
  }
  map.addEventListener('pointermove',event=>{if(motion.matches||transparency.matches)return;const r=map.getBoundingClientRect();pointer.targetX=Math.max(0,Math.min(1,(event.clientX-r.left)/r.width));pointer.targetY=1-Math.max(0,Math.min(1,(event.clientY-r.top)/r.height));pointer.targetActive=1;},{passive:true});
  map.addEventListener('pointerleave',()=>{pointer.targetActive=0;},{passive:true});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();svgFallback();if(frame)cancelAnimationFrame(frame);frame=0;});
  new ResizeObserver(resize).observe(map);
  new IntersectionObserver(items=>{visible=items[0]?.isIntersecting??true;sync();},{threshold:.01}).observe(map);
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-theme']});
  new MutationObserver(sync).observe(document.getElementById('view-explore'),{attributes:true,attributeFilter:['hidden']});
  motion.addEventListener('change',sync);transparency.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);

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
  enhanceButtons();sync();
})();
