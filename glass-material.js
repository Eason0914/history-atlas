/* Original, bounded optical textures. These encode normals/diffusion/light, never
   a screenshot or image of the map. The live scene remains the filter's input. */
(() => {
  'use strict';
  function generate(width,height,radius,maxDisplacement=6){
    const ratio=Math.min(1,1000/width),w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
    const make=()=>{const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;return canvas;};
    const normalCanvas=make(),diffusionCanvas=make(),lightCanvas=make();
    const context=normalCanvas.getContext('2d'),diffusionContext=diffusionCanvas.getContext('2d'),lightContext=lightCanvas.getContext('2d');
    if(!context||!diffusionContext||!lightContext)return null;
    const normal=context.createImageData(w,h),diffusion=context.createImageData(w,h),light=lightContext.createImageData(w,h);
    const r=Math.min(radius,width/2,height/2),bevel=Math.min(22,r+1,height/3),eta=1/1.46,profile=[];
    let peak=0;
    // A smooth, convex shoulder: finite slope, Snell-inspired ray bending, and a
    // neutral flat center. Normalized displacement avoids a hard, clipped rim.
    for(let i=0;i<=256;i++){
      const u=i/256,heightFraction=.5-.5*Math.cos(Math.PI*u),slope=1.35*Math.sin(Math.PI*u);
      const nz=1/Math.sqrt(1+slope*slope);
      const ray=(eta*nz-Math.sqrt(1-eta*eta*(1-nz*nz)))*slope*nz;
      const value=ray*(.3+.7*heightFraction);profile.push(value);peak=Math.max(peak,Math.abs(value));
    }
    const smooth=t=>{const v=Math.max(0,Math.min(1,t));return v*v*(3-2*v);};
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const px=(x+.5)/ratio-width/2,py=(y+.5)/ratio-height/2;
      const qx=Math.abs(px)-width/2+r,qy=Math.abs(py)-height/2+r;
      const ox=Math.max(qx,0),oy=Math.max(qy,0),length=Math.hypot(ox,oy);
      const distance=length+Math.min(Math.max(qx,qy),0)-r,depth=-distance;
      let nx=0,ny=0;
      if(length>0){nx=ox/length*Math.sign(px);ny=oy/length*Math.sign(py);}
      else if(qx>qy)nx=Math.sign(px);else ny=Math.sign(py);
      const u=Math.max(0,Math.min(1,depth/bevel)),sample=u*256,low=Math.floor(sample);
      const value=profile[low]+(profile[Math.min(256,low+1)]-profile[low])*(sample-low);
      const offset=distance<=0?value/peak*maxDisplacement:0,index=(y*w+x)*4;
      normal.data[index]=Math.round(128+nx*offset/20*255);
      normal.data[index+1]=Math.round(128+ny*offset/20*255);normal.data[index+2]=128;normal.data[index+3]=255;
      // Center-only diffusion protects text while leaving the optical rim crisp.
      diffusion.data[index]=diffusion.data[index+1]=diffusion.data[index+2]=255;
      diffusion.data[index+3]=Math.round(255*smooth((depth-9)/13));
      const directional=nx*-.55+ny*-.835;
      const rim=Math.exp(-Math.pow((depth-1.1)/.95,2));
      const shoulder=Math.exp(-Math.pow((depth-3.2)/2.4,2));
      const bright=Math.max(0,directional),dark=Math.max(0,-directional);
      const opacity=depth>=0?Math.min(1,(rim*(.12+.86*bright)+shoulder*.12*bright)*(1-dark*.8)+dark*(rim*.29+shoulder*.055)):0;
      const color=directional>=0?[255,255,255]:[23,48,73];
      light.data[index]=color[0];light.data[index+1]=color[1];light.data[index+2]=color[2];light.data[index+3]=Math.round(opacity*255);
    }
    context.putImageData(normal,0,0);diffusionContext.putImageData(diffusion,0,0);lightContext.putImageData(light,0,0);
    return{normal:normalCanvas.toDataURL(),diffusion:diffusionCanvas.toDataURL(),light:lightCanvas.toDataURL(),bevel,maxDisplacement};
  }
  window.ATLAS_GLASS_MATERIAL=Object.freeze({generate});
})();
