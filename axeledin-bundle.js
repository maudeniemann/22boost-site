(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))r(o);new MutationObserver(o=>{for(const u of o)if(u.type==="childList")for(const c of u.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function n(o){const u={};return o.integrity&&(u.integrity=o.integrity),o.referrerPolicy&&(u.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?u.credentials="include":o.crossOrigin==="anonymous"?u.credentials="omit":u.credentials="same-origin",u}function r(o){if(o.ep)return;o.ep=!0;const u=n(o);fetch(o.href,u)}})();const bS=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,oA=`
  uniform float iTime;
  uniform vec2 iResolution;
  uniform vec4 iMouse;
  uniform int iFrame;
  uniform sampler2D iPreviousFrame;
  uniform float uBrushSize;
  uniform float uBrushStrength;
  uniform float uFluidDecay;
  uniform float uTrailLength;
  uniform float uStopDecay;
  varying vec2 vUv;
  
  vec2 ur, U;
  
  float ln(vec2 p, vec2 a, vec2 b) {
      return length(p-a-(b-a)*clamp(dot(p-a,b-a)/dot(b-a,b-a),0.,1.));
  }
  
  vec4 t(vec2 v, int a, int b) {
      return texture2D(iPreviousFrame, fract((v+vec2(float(a),float(b)))/ur));
  }
  
  vec4 t(vec2 v) {
      return texture2D(iPreviousFrame, fract(v/ur));
  }
  
  float area(vec2 a, vec2 b, vec2 c) {
      float A = length(b-c), B = length(c-a), C = length(a-b), s = 0.5*(A+B+C);
      return sqrt(s*(s-A)*(s-B)*(s-C));
  }
  
  void main() {
      U = vUv * iResolution;
      ur = iResolution.xy;
      
      if (iFrame < 1) {
          float w = 0.5+sin(0.2*U.x)*0.5;
          float q = length(U-0.5*ur);
          gl_FragColor = vec4(0.1*exp(-0.001*q*q),0,0,w);
      } else {
          vec2 v = U,
               A = v + vec2( 1, 1),
               B = v + vec2( 1,-1),
               C = v + vec2(-1, 1),
               D = v + vec2(-1,-1);
          
          for (int i = 0; i < 8; i++) {
              v -= t(v).xy;
              A -= t(A).xy;
              B -= t(B).xy;
              C -= t(C).xy;
              D -= t(D).xy;
          }
          
          vec4 me = t(v);
          vec4 n = t(v, 0, 1),
              e = t(v, 1, 0),
              s = t(v, 0, -1),
              w = t(v, -1, 0);
          vec4 ne = .25*(n+e+s+w);
          me = mix(t(v), ne, vec4(0.15,0.15,0.95,0.));
          me.z = me.z - 0.01*((area(A,B,C)+area(B,C,D))-4.);
          
          vec4 pr = vec4(e.z,w.z,n.z,s.z);
          me.xy = me.xy + 100.*vec2(pr.x-pr.y, pr.z-pr.w)/ur;
          
          me.xy *= uFluidDecay;
          me.z *= uTrailLength;
          
          if (iMouse.z > 0.0) {
              vec2 mousePos = iMouse.xy;
              vec2 mousePrev = iMouse.zw;
              vec2 mouseVel = mousePos - mousePrev;
              float velMagnitude = length(mouseVel);
              float q = ln(U, mousePos, mousePrev);
              vec2 m = mousePos - mousePrev;
              float l = length(m);
              if (l > 0.0) m = min(l, 10.0) * m / l;
              
              float brushSizeFactor = 1e-4 / uBrushSize;
              float strengthFactor = 0.03 * uBrushStrength;
              
              float falloff = exp(-brushSizeFactor*q*q*q);
              falloff = pow(falloff, 0.5);
              
              me.xyw += strengthFactor * falloff * vec3(m, 10.);
              
              if (velMagnitude < 2.0) {
                  float distToCursor = length(U - mousePos);
                  float influence = exp(-distToCursor * 0.01);
                  float cursorDecay = mix(1.0, uStopDecay, influence);
                  me.xy *= cursorDecay;
                  me.z *= cursorDecay;
              }
          }
          
          gl_FragColor = clamp(me, -0.4, 0.4);
      }
  }
`,lA=`
  uniform float iTime;
  uniform vec2 iResolution;
  uniform sampler2D iFluid;
  uniform float uDistortionAmount;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform vec3 uColor4;
  uniform float uColorIntensity;
  uniform float uSoftness;
  varying vec2 vUv;
  
  void main() {
    vec2 fragCoord = vUv * iResolution;
    
    vec4 fluid = texture2D(iFluid, vUv);
    vec2 fluidVel = fluid.xy;
    
    float mr = min(iResolution.x, iResolution.y);
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / mr;
    
    uv += fluidVel * (0.5 * uDistortionAmount);
    
    float d = -iTime * 0.5;
    float a = 0.0;
    for (float i = 0.0; i < 8.0; ++i) {
      a += cos(i - d - a * uv.x);
      d += sin(uv.y * i + a);
    }
    d += iTime * 0.5;
    
    float mixer1 = cos(uv.x * d) * 0.5 + 0.5;
    float mixer2 = cos(uv.y * a) * 0.5 + 0.5;
    float mixer3 = sin(d + a) * 0.5 + 0.5;
    
    float smoothAmount = clamp(uSoftness * 0.1, 0.0, 0.9);
    mixer1 = mix(mixer1, 0.5, smoothAmount);
    mixer2 = mix(mixer2, 0.5, smoothAmount);
    mixer3 = mix(mixer3, 0.5, smoothAmount);
    
    vec3 col = mix(uColor1, uColor2, mixer1);
    col = mix(col, uColor3, mixer2);
    col = mix(col, uColor4, mixer3 * 0.4);
    
    col *= uColorIntensity;
    
    gl_FragColor = vec4(col, 1.0);
  }
`;/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Pm="180",uA=0,ty=1,cA=2,AS=1,fA=2,Sa=3,pr=0,$n=1,Ma=2,fr=0,ro=1,ey=2,ny=3,iy=4,hA=5,Wr=100,dA=101,pA=102,mA=103,gA=104,vA=200,_A=201,yA=202,xA=203,xp=204,Sp=205,SA=206,MA=207,EA=208,TA=209,bA=210,AA=211,RA=212,CA=213,wA=214,Mp=0,Ep=1,Tp=2,lo=3,bp=4,Ap=5,Rp=6,Cp=7,RS=0,DA=1,UA=2,hr=0,LA=1,PA=2,NA=3,OA=4,BA=5,FA=6,IA=7,CS=300,uo=301,co=302,wp=303,Dp=304,lf=306,Up=1e3,Yr=1001,Lp=1002,Ii=1003,zA=1004,dc=1005,Zn=1006,vd=1007,jr=1008,ba=1009,wS=1010,DS=1011,Pl=1012,Nm=1013,es=1014,Bi=1015,Wl=1016,Om=1017,Bm=1018,Nl=1020,US=35902,LS=35899,PS=1021,NS=1022,ci=1023,Ol=1026,Bl=1027,OS=1028,Fm=1029,BS=1030,Im=1031,zm=1033,Vc=33776,Hc=33777,Gc=33778,kc=33779,Pp=35840,Np=35841,Op=35842,Bp=35843,Fp=36196,Ip=37492,zp=37496,Vp=37808,Hp=37809,Gp=37810,kp=37811,Xp=37812,Wp=37813,qp=37814,Yp=37815,jp=37816,Kp=37817,Zp=37818,Qp=37819,$p=37820,Jp=37821,tm=36492,em=36494,nm=36495,im=36283,am=36284,rm=36285,sm=36286,VA=3200,HA=3201,GA=0,kA=1,ur="",Si="srgb",fo="srgb-linear",$c="linear",Fe="srgb",zs=7680,ay=519,XA=512,WA=513,qA=514,FS=515,YA=516,jA=517,KA=518,ZA=519,ry=35044,sy="300 es",Yi=2e3,Jc=2001;class go{addEventListener(t,n){this._listeners===void 0&&(this._listeners={});const r=this._listeners;r[t]===void 0&&(r[t]=[]),r[t].indexOf(n)===-1&&r[t].push(n)}hasEventListener(t,n){const r=this._listeners;return r===void 0?!1:r[t]!==void 0&&r[t].indexOf(n)!==-1}removeEventListener(t,n){const r=this._listeners;if(r===void 0)return;const o=r[t];if(o!==void 0){const u=o.indexOf(n);u!==-1&&o.splice(u,1)}}dispatchEvent(t){const n=this._listeners;if(n===void 0)return;const r=n[t.type];if(r!==void 0){t.target=this;const o=r.slice(0);for(let u=0,c=o.length;u<c;u++)o[u].call(this,t);t.target=null}}}const On=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],_d=Math.PI/180,om=180/Math.PI;function ql(){const i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(On[i&255]+On[i>>8&255]+On[i>>16&255]+On[i>>24&255]+"-"+On[t&255]+On[t>>8&255]+"-"+On[t>>16&15|64]+On[t>>24&255]+"-"+On[n&63|128]+On[n>>8&255]+"-"+On[n>>16&255]+On[n>>24&255]+On[r&255]+On[r>>8&255]+On[r>>16&255]+On[r>>24&255]).toLowerCase()}function Se(i,t,n){return Math.max(t,Math.min(n,i))}function QA(i,t){return(i%t+t)%t}function yd(i,t,n){return(1-n)*i+n*t}function vl(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function Kn(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}class we{constructor(t=0,n=0){we.prototype.isVector2=!0,this.x=t,this.y=n}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,n){return this.x=t,this.y=n,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,n){switch(t){case 0:this.x=n;break;case 1:this.y=n;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,n){return this.x=t.x+n.x,this.y=t.y+n.y,this}addScaledVector(t,n){return this.x+=t.x*n,this.y+=t.y*n,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,n){return this.x=t.x-n.x,this.y=t.y-n.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const n=this.x,r=this.y,o=t.elements;return this.x=o[0]*n+o[3]*r+o[6],this.y=o[1]*n+o[4]*r+o[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,n){return this.x=Se(this.x,t.x,n.x),this.y=Se(this.y,t.y,n.y),this}clampScalar(t,n){return this.x=Se(this.x,t,n),this.y=Se(this.y,t,n),this}clampLength(t,n){const r=this.length();return this.divideScalar(r||1).multiplyScalar(Se(r,t,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const n=Math.sqrt(this.lengthSq()*t.lengthSq());if(n===0)return Math.PI/2;const r=this.dot(t)/n;return Math.acos(Se(r,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const n=this.x-t.x,r=this.y-t.y;return n*n+r*r}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,n){return this.x+=(t.x-this.x)*n,this.y+=(t.y-this.y)*n,this}lerpVectors(t,n,r){return this.x=t.x+(n.x-t.x)*r,this.y=t.y+(n.y-t.y)*r,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,n=0){return this.x=t[n],this.y=t[n+1],this}toArray(t=[],n=0){return t[n]=this.x,t[n+1]=this.y,t}fromBufferAttribute(t,n){return this.x=t.getX(n),this.y=t.getY(n),this}rotateAround(t,n){const r=Math.cos(n),o=Math.sin(n),u=this.x-t.x,c=this.y-t.y;return this.x=u*r-c*o+t.x,this.y=u*o+c*r+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Yl{constructor(t=0,n=0,r=0,o=1){this.isQuaternion=!0,this._x=t,this._y=n,this._z=r,this._w=o}static slerpFlat(t,n,r,o,u,c,f){let p=r[o+0],d=r[o+1],m=r[o+2],v=r[o+3];const _=u[c+0],x=u[c+1],E=u[c+2],T=u[c+3];if(f===0){t[n+0]=p,t[n+1]=d,t[n+2]=m,t[n+3]=v;return}if(f===1){t[n+0]=_,t[n+1]=x,t[n+2]=E,t[n+3]=T;return}if(v!==T||p!==_||d!==x||m!==E){let S=1-f;const y=p*_+d*x+m*E+v*T,w=y>=0?1:-1,C=1-y*y;if(C>Number.EPSILON){const N=Math.sqrt(C),F=Math.atan2(N,y*w);S=Math.sin(S*F)/N,f=Math.sin(f*F)/N}const D=f*w;if(p=p*S+_*D,d=d*S+x*D,m=m*S+E*D,v=v*S+T*D,S===1-f){const N=1/Math.sqrt(p*p+d*d+m*m+v*v);p*=N,d*=N,m*=N,v*=N}}t[n]=p,t[n+1]=d,t[n+2]=m,t[n+3]=v}static multiplyQuaternionsFlat(t,n,r,o,u,c){const f=r[o],p=r[o+1],d=r[o+2],m=r[o+3],v=u[c],_=u[c+1],x=u[c+2],E=u[c+3];return t[n]=f*E+m*v+p*x-d*_,t[n+1]=p*E+m*_+d*v-f*x,t[n+2]=d*E+m*x+f*_-p*v,t[n+3]=m*E-f*v-p*_-d*x,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,n,r,o){return this._x=t,this._y=n,this._z=r,this._w=o,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,n=!0){const r=t._x,o=t._y,u=t._z,c=t._order,f=Math.cos,p=Math.sin,d=f(r/2),m=f(o/2),v=f(u/2),_=p(r/2),x=p(o/2),E=p(u/2);switch(c){case"XYZ":this._x=_*m*v+d*x*E,this._y=d*x*v-_*m*E,this._z=d*m*E+_*x*v,this._w=d*m*v-_*x*E;break;case"YXZ":this._x=_*m*v+d*x*E,this._y=d*x*v-_*m*E,this._z=d*m*E-_*x*v,this._w=d*m*v+_*x*E;break;case"ZXY":this._x=_*m*v-d*x*E,this._y=d*x*v+_*m*E,this._z=d*m*E+_*x*v,this._w=d*m*v-_*x*E;break;case"ZYX":this._x=_*m*v-d*x*E,this._y=d*x*v+_*m*E,this._z=d*m*E-_*x*v,this._w=d*m*v+_*x*E;break;case"YZX":this._x=_*m*v+d*x*E,this._y=d*x*v+_*m*E,this._z=d*m*E-_*x*v,this._w=d*m*v-_*x*E;break;case"XZY":this._x=_*m*v-d*x*E,this._y=d*x*v-_*m*E,this._z=d*m*E+_*x*v,this._w=d*m*v+_*x*E;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+c)}return n===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,n){const r=n/2,o=Math.sin(r);return this._x=t.x*o,this._y=t.y*o,this._z=t.z*o,this._w=Math.cos(r),this._onChangeCallback(),this}setFromRotationMatrix(t){const n=t.elements,r=n[0],o=n[4],u=n[8],c=n[1],f=n[5],p=n[9],d=n[2],m=n[6],v=n[10],_=r+f+v;if(_>0){const x=.5/Math.sqrt(_+1);this._w=.25/x,this._x=(m-p)*x,this._y=(u-d)*x,this._z=(c-o)*x}else if(r>f&&r>v){const x=2*Math.sqrt(1+r-f-v);this._w=(m-p)/x,this._x=.25*x,this._y=(o+c)/x,this._z=(u+d)/x}else if(f>v){const x=2*Math.sqrt(1+f-r-v);this._w=(u-d)/x,this._x=(o+c)/x,this._y=.25*x,this._z=(p+m)/x}else{const x=2*Math.sqrt(1+v-r-f);this._w=(c-o)/x,this._x=(u+d)/x,this._y=(p+m)/x,this._z=.25*x}return this._onChangeCallback(),this}setFromUnitVectors(t,n){let r=t.dot(n)+1;return r<1e-8?(r=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=r):(this._x=0,this._y=-t.z,this._z=t.y,this._w=r)):(this._x=t.y*n.z-t.z*n.y,this._y=t.z*n.x-t.x*n.z,this._z=t.x*n.y-t.y*n.x,this._w=r),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Se(this.dot(t),-1,1)))}rotateTowards(t,n){const r=this.angleTo(t);if(r===0)return this;const o=Math.min(1,n/r);return this.slerp(t,o),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,n){const r=t._x,o=t._y,u=t._z,c=t._w,f=n._x,p=n._y,d=n._z,m=n._w;return this._x=r*m+c*f+o*d-u*p,this._y=o*m+c*p+u*f-r*d,this._z=u*m+c*d+r*p-o*f,this._w=c*m-r*f-o*p-u*d,this._onChangeCallback(),this}slerp(t,n){if(n===0)return this;if(n===1)return this.copy(t);const r=this._x,o=this._y,u=this._z,c=this._w;let f=c*t._w+r*t._x+o*t._y+u*t._z;if(f<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,f=-f):this.copy(t),f>=1)return this._w=c,this._x=r,this._y=o,this._z=u,this;const p=1-f*f;if(p<=Number.EPSILON){const x=1-n;return this._w=x*c+n*this._w,this._x=x*r+n*this._x,this._y=x*o+n*this._y,this._z=x*u+n*this._z,this.normalize(),this}const d=Math.sqrt(p),m=Math.atan2(d,f),v=Math.sin((1-n)*m)/d,_=Math.sin(n*m)/d;return this._w=c*v+this._w*_,this._x=r*v+this._x*_,this._y=o*v+this._y*_,this._z=u*v+this._z*_,this._onChangeCallback(),this}slerpQuaternions(t,n,r){return this.copy(t).slerp(n,r)}random(){const t=2*Math.PI*Math.random(),n=2*Math.PI*Math.random(),r=Math.random(),o=Math.sqrt(1-r),u=Math.sqrt(r);return this.set(o*Math.sin(t),o*Math.cos(t),u*Math.sin(n),u*Math.cos(n))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,n=0){return this._x=t[n],this._y=t[n+1],this._z=t[n+2],this._w=t[n+3],this._onChangeCallback(),this}toArray(t=[],n=0){return t[n]=this._x,t[n+1]=this._y,t[n+2]=this._z,t[n+3]=this._w,t}fromBufferAttribute(t,n){return this._x=t.getX(n),this._y=t.getY(n),this._z=t.getZ(n),this._w=t.getW(n),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class rt{constructor(t=0,n=0,r=0){rt.prototype.isVector3=!0,this.x=t,this.y=n,this.z=r}set(t,n,r){return r===void 0&&(r=this.z),this.x=t,this.y=n,this.z=r,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,n){switch(t){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,n){return this.x=t.x+n.x,this.y=t.y+n.y,this.z=t.z+n.z,this}addScaledVector(t,n){return this.x+=t.x*n,this.y+=t.y*n,this.z+=t.z*n,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,n){return this.x=t.x-n.x,this.y=t.y-n.y,this.z=t.z-n.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,n){return this.x=t.x*n.x,this.y=t.y*n.y,this.z=t.z*n.z,this}applyEuler(t){return this.applyQuaternion(oy.setFromEuler(t))}applyAxisAngle(t,n){return this.applyQuaternion(oy.setFromAxisAngle(t,n))}applyMatrix3(t){const n=this.x,r=this.y,o=this.z,u=t.elements;return this.x=u[0]*n+u[3]*r+u[6]*o,this.y=u[1]*n+u[4]*r+u[7]*o,this.z=u[2]*n+u[5]*r+u[8]*o,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const n=this.x,r=this.y,o=this.z,u=t.elements,c=1/(u[3]*n+u[7]*r+u[11]*o+u[15]);return this.x=(u[0]*n+u[4]*r+u[8]*o+u[12])*c,this.y=(u[1]*n+u[5]*r+u[9]*o+u[13])*c,this.z=(u[2]*n+u[6]*r+u[10]*o+u[14])*c,this}applyQuaternion(t){const n=this.x,r=this.y,o=this.z,u=t.x,c=t.y,f=t.z,p=t.w,d=2*(c*o-f*r),m=2*(f*n-u*o),v=2*(u*r-c*n);return this.x=n+p*d+c*v-f*m,this.y=r+p*m+f*d-u*v,this.z=o+p*v+u*m-c*d,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const n=this.x,r=this.y,o=this.z,u=t.elements;return this.x=u[0]*n+u[4]*r+u[8]*o,this.y=u[1]*n+u[5]*r+u[9]*o,this.z=u[2]*n+u[6]*r+u[10]*o,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,n){return this.x=Se(this.x,t.x,n.x),this.y=Se(this.y,t.y,n.y),this.z=Se(this.z,t.z,n.z),this}clampScalar(t,n){return this.x=Se(this.x,t,n),this.y=Se(this.y,t,n),this.z=Se(this.z,t,n),this}clampLength(t,n){const r=this.length();return this.divideScalar(r||1).multiplyScalar(Se(r,t,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,n){return this.x+=(t.x-this.x)*n,this.y+=(t.y-this.y)*n,this.z+=(t.z-this.z)*n,this}lerpVectors(t,n,r){return this.x=t.x+(n.x-t.x)*r,this.y=t.y+(n.y-t.y)*r,this.z=t.z+(n.z-t.z)*r,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,n){const r=t.x,o=t.y,u=t.z,c=n.x,f=n.y,p=n.z;return this.x=o*p-u*f,this.y=u*c-r*p,this.z=r*f-o*c,this}projectOnVector(t){const n=t.lengthSq();if(n===0)return this.set(0,0,0);const r=t.dot(this)/n;return this.copy(t).multiplyScalar(r)}projectOnPlane(t){return xd.copy(this).projectOnVector(t),this.sub(xd)}reflect(t){return this.sub(xd.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const n=Math.sqrt(this.lengthSq()*t.lengthSq());if(n===0)return Math.PI/2;const r=this.dot(t)/n;return Math.acos(Se(r,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const n=this.x-t.x,r=this.y-t.y,o=this.z-t.z;return n*n+r*r+o*o}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,n,r){const o=Math.sin(n)*t;return this.x=o*Math.sin(r),this.y=Math.cos(n)*t,this.z=o*Math.cos(r),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,n,r){return this.x=t*Math.sin(n),this.y=r,this.z=t*Math.cos(n),this}setFromMatrixPosition(t){const n=t.elements;return this.x=n[12],this.y=n[13],this.z=n[14],this}setFromMatrixScale(t){const n=this.setFromMatrixColumn(t,0).length(),r=this.setFromMatrixColumn(t,1).length(),o=this.setFromMatrixColumn(t,2).length();return this.x=n,this.y=r,this.z=o,this}setFromMatrixColumn(t,n){return this.fromArray(t.elements,n*4)}setFromMatrix3Column(t,n){return this.fromArray(t.elements,n*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,n=0){return this.x=t[n],this.y=t[n+1],this.z=t[n+2],this}toArray(t=[],n=0){return t[n]=this.x,t[n+1]=this.y,t[n+2]=this.z,t}fromBufferAttribute(t,n){return this.x=t.getX(n),this.y=t.getY(n),this.z=t.getZ(n),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,n=Math.random()*2-1,r=Math.sqrt(1-n*n);return this.x=r*Math.cos(t),this.y=n,this.z=r*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const xd=new rt,oy=new Yl;class fe{constructor(t,n,r,o,u,c,f,p,d){fe.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,n,r,o,u,c,f,p,d)}set(t,n,r,o,u,c,f,p,d){const m=this.elements;return m[0]=t,m[1]=o,m[2]=f,m[3]=n,m[4]=u,m[5]=p,m[6]=r,m[7]=c,m[8]=d,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const n=this.elements,r=t.elements;return n[0]=r[0],n[1]=r[1],n[2]=r[2],n[3]=r[3],n[4]=r[4],n[5]=r[5],n[6]=r[6],n[7]=r[7],n[8]=r[8],this}extractBasis(t,n,r){return t.setFromMatrix3Column(this,0),n.setFromMatrix3Column(this,1),r.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const n=t.elements;return this.set(n[0],n[4],n[8],n[1],n[5],n[9],n[2],n[6],n[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,n){const r=t.elements,o=n.elements,u=this.elements,c=r[0],f=r[3],p=r[6],d=r[1],m=r[4],v=r[7],_=r[2],x=r[5],E=r[8],T=o[0],S=o[3],y=o[6],w=o[1],C=o[4],D=o[7],N=o[2],F=o[5],z=o[8];return u[0]=c*T+f*w+p*N,u[3]=c*S+f*C+p*F,u[6]=c*y+f*D+p*z,u[1]=d*T+m*w+v*N,u[4]=d*S+m*C+v*F,u[7]=d*y+m*D+v*z,u[2]=_*T+x*w+E*N,u[5]=_*S+x*C+E*F,u[8]=_*y+x*D+E*z,this}multiplyScalar(t){const n=this.elements;return n[0]*=t,n[3]*=t,n[6]*=t,n[1]*=t,n[4]*=t,n[7]*=t,n[2]*=t,n[5]*=t,n[8]*=t,this}determinant(){const t=this.elements,n=t[0],r=t[1],o=t[2],u=t[3],c=t[4],f=t[5],p=t[6],d=t[7],m=t[8];return n*c*m-n*f*d-r*u*m+r*f*p+o*u*d-o*c*p}invert(){const t=this.elements,n=t[0],r=t[1],o=t[2],u=t[3],c=t[4],f=t[5],p=t[6],d=t[7],m=t[8],v=m*c-f*d,_=f*p-m*u,x=d*u-c*p,E=n*v+r*_+o*x;if(E===0)return this.set(0,0,0,0,0,0,0,0,0);const T=1/E;return t[0]=v*T,t[1]=(o*d-m*r)*T,t[2]=(f*r-o*c)*T,t[3]=_*T,t[4]=(m*n-o*p)*T,t[5]=(o*u-f*n)*T,t[6]=x*T,t[7]=(r*p-d*n)*T,t[8]=(c*n-r*u)*T,this}transpose(){let t;const n=this.elements;return t=n[1],n[1]=n[3],n[3]=t,t=n[2],n[2]=n[6],n[6]=t,t=n[5],n[5]=n[7],n[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const n=this.elements;return t[0]=n[0],t[1]=n[3],t[2]=n[6],t[3]=n[1],t[4]=n[4],t[5]=n[7],t[6]=n[2],t[7]=n[5],t[8]=n[8],this}setUvTransform(t,n,r,o,u,c,f){const p=Math.cos(u),d=Math.sin(u);return this.set(r*p,r*d,-r*(p*c+d*f)+c+t,-o*d,o*p,-o*(-d*c+p*f)+f+n,0,0,1),this}scale(t,n){return this.premultiply(Sd.makeScale(t,n)),this}rotate(t){return this.premultiply(Sd.makeRotation(-t)),this}translate(t,n){return this.premultiply(Sd.makeTranslation(t,n)),this}makeTranslation(t,n){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,n,0,0,1),this}makeRotation(t){const n=Math.cos(t),r=Math.sin(t);return this.set(n,-r,0,r,n,0,0,0,1),this}makeScale(t,n){return this.set(t,0,0,0,n,0,0,0,1),this}equals(t){const n=this.elements,r=t.elements;for(let o=0;o<9;o++)if(n[o]!==r[o])return!1;return!0}fromArray(t,n=0){for(let r=0;r<9;r++)this.elements[r]=t[r+n];return this}toArray(t=[],n=0){const r=this.elements;return t[n]=r[0],t[n+1]=r[1],t[n+2]=r[2],t[n+3]=r[3],t[n+4]=r[4],t[n+5]=r[5],t[n+6]=r[6],t[n+7]=r[7],t[n+8]=r[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const Sd=new fe;function IS(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function tf(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function $A(){const i=tf("canvas");return i.style.display="block",i}const ly={};function Fl(i){i in ly||(ly[i]=!0,console.warn(i))}function JA(i,t,n){return new Promise(function(r,o){function u(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:o();break;case i.TIMEOUT_EXPIRED:setTimeout(u,n);break;default:r()}}setTimeout(u,n)})}const uy=new fe().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),cy=new fe().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function t1(){const i={enabled:!0,workingColorSpace:fo,spaces:{},convert:function(o,u,c){return this.enabled===!1||u===c||!u||!c||(this.spaces[u].transfer===Fe&&(o.r=Ea(o.r),o.g=Ea(o.g),o.b=Ea(o.b)),this.spaces[u].primaries!==this.spaces[c].primaries&&(o.applyMatrix3(this.spaces[u].toXYZ),o.applyMatrix3(this.spaces[c].fromXYZ)),this.spaces[c].transfer===Fe&&(o.r=so(o.r),o.g=so(o.g),o.b=so(o.b))),o},workingToColorSpace:function(o,u){return this.convert(o,this.workingColorSpace,u)},colorSpaceToWorking:function(o,u){return this.convert(o,u,this.workingColorSpace)},getPrimaries:function(o){return this.spaces[o].primaries},getTransfer:function(o){return o===ur?$c:this.spaces[o].transfer},getToneMappingMode:function(o){return this.spaces[o].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(o,u=this.workingColorSpace){return o.fromArray(this.spaces[u].luminanceCoefficients)},define:function(o){Object.assign(this.spaces,o)},_getMatrix:function(o,u,c){return o.copy(this.spaces[u].toXYZ).multiply(this.spaces[c].fromXYZ)},_getDrawingBufferColorSpace:function(o){return this.spaces[o].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(o=this.workingColorSpace){return this.spaces[o].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(o,u){return Fl("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(o,u)},toWorkingColorSpace:function(o,u){return Fl("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(o,u)}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],r=[.3127,.329];return i.define({[fo]:{primaries:t,whitePoint:r,transfer:$c,toXYZ:uy,fromXYZ:cy,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:Si},outputColorSpaceConfig:{drawingBufferColorSpace:Si}},[Si]:{primaries:t,whitePoint:r,transfer:Fe,toXYZ:uy,fromXYZ:cy,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:Si}}}),i}const Ae=t1();function Ea(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function so(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Vs;class e1{static getDataURL(t,n="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let r;if(t instanceof HTMLCanvasElement)r=t;else{Vs===void 0&&(Vs=tf("canvas")),Vs.width=t.width,Vs.height=t.height;const o=Vs.getContext("2d");t instanceof ImageData?o.putImageData(t,0,0):o.drawImage(t,0,0,t.width,t.height),r=Vs}return r.toDataURL(n)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const n=tf("canvas");n.width=t.width,n.height=t.height;const r=n.getContext("2d");r.drawImage(t,0,0,t.width,t.height);const o=r.getImageData(0,0,t.width,t.height),u=o.data;for(let c=0;c<u.length;c++)u[c]=Ea(u[c]/255)*255;return r.putImageData(o,0,0),n}else if(t.data){const n=t.data.slice(0);for(let r=0;r<n.length;r++)n instanceof Uint8Array||n instanceof Uint8ClampedArray?n[r]=Math.floor(Ea(n[r]/255)*255):n[r]=Ea(n[r]);return{data:n,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let n1=0;class Vm{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:n1++}),this.uuid=ql(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){const n=this.data;return typeof HTMLVideoElement<"u"&&n instanceof HTMLVideoElement?t.set(n.videoWidth,n.videoHeight,0):n instanceof VideoFrame?t.set(n.displayHeight,n.displayWidth,0):n!==null?t.set(n.width,n.height,n.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const n=t===void 0||typeof t=="string";if(!n&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const r={uuid:this.uuid,url:""},o=this.data;if(o!==null){let u;if(Array.isArray(o)){u=[];for(let c=0,f=o.length;c<f;c++)o[c].isDataTexture?u.push(Md(o[c].image)):u.push(Md(o[c]))}else u=Md(o);r.url=u}return n||(t.images[this.uuid]=r),r}}function Md(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?e1.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let i1=0;const Ed=new rt;class Jn extends go{constructor(t=Jn.DEFAULT_IMAGE,n=Jn.DEFAULT_MAPPING,r=Yr,o=Yr,u=Zn,c=jr,f=ci,p=ba,d=Jn.DEFAULT_ANISOTROPY,m=ur){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:i1++}),this.uuid=ql(),this.name="",this.source=new Vm(t),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=r,this.wrapT=o,this.magFilter=u,this.minFilter=c,this.anisotropy=d,this.format=f,this.internalFormat=null,this.type=p,this.offset=new we(0,0),this.repeat=new we(1,1),this.center=new we(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new fe,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=m,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Ed).x}get height(){return this.source.getSize(Ed).y}get depth(){return this.source.getSize(Ed).z}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,n){this.updateRanges.push({start:t,count:n})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(const n in t){const r=t[n];if(r===void 0){console.warn(`THREE.Texture.setValues(): parameter '${n}' has value of undefined.`);continue}const o=this[n];if(o===void 0){console.warn(`THREE.Texture.setValues(): property '${n}' does not exist.`);continue}o&&r&&o.isVector2&&r.isVector2||o&&r&&o.isVector3&&r.isVector3||o&&r&&o.isMatrix3&&r.isMatrix3?o.copy(r):this[n]=r}}toJSON(t){const n=t===void 0||typeof t=="string";if(!n&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const r={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(r.userData=this.userData),n||(t.textures[this.uuid]=r),r}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==CS)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Up:t.x=t.x-Math.floor(t.x);break;case Yr:t.x=t.x<0?0:1;break;case Lp:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Up:t.y=t.y-Math.floor(t.y);break;case Yr:t.y=t.y<0?0:1;break;case Lp:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}Jn.DEFAULT_IMAGE=null;Jn.DEFAULT_MAPPING=CS;Jn.DEFAULT_ANISOTROPY=1;class rn{constructor(t=0,n=0,r=0,o=1){rn.prototype.isVector4=!0,this.x=t,this.y=n,this.z=r,this.w=o}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,n,r,o){return this.x=t,this.y=n,this.z=r,this.w=o,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,n){switch(t){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;case 3:this.w=n;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,n){return this.x=t.x+n.x,this.y=t.y+n.y,this.z=t.z+n.z,this.w=t.w+n.w,this}addScaledVector(t,n){return this.x+=t.x*n,this.y+=t.y*n,this.z+=t.z*n,this.w+=t.w*n,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,n){return this.x=t.x-n.x,this.y=t.y-n.y,this.z=t.z-n.z,this.w=t.w-n.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const n=this.x,r=this.y,o=this.z,u=this.w,c=t.elements;return this.x=c[0]*n+c[4]*r+c[8]*o+c[12]*u,this.y=c[1]*n+c[5]*r+c[9]*o+c[13]*u,this.z=c[2]*n+c[6]*r+c[10]*o+c[14]*u,this.w=c[3]*n+c[7]*r+c[11]*o+c[15]*u,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const n=Math.sqrt(1-t.w*t.w);return n<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/n,this.y=t.y/n,this.z=t.z/n),this}setAxisAngleFromRotationMatrix(t){let n,r,o,u;const p=t.elements,d=p[0],m=p[4],v=p[8],_=p[1],x=p[5],E=p[9],T=p[2],S=p[6],y=p[10];if(Math.abs(m-_)<.01&&Math.abs(v-T)<.01&&Math.abs(E-S)<.01){if(Math.abs(m+_)<.1&&Math.abs(v+T)<.1&&Math.abs(E+S)<.1&&Math.abs(d+x+y-3)<.1)return this.set(1,0,0,0),this;n=Math.PI;const C=(d+1)/2,D=(x+1)/2,N=(y+1)/2,F=(m+_)/4,z=(v+T)/4,H=(E+S)/4;return C>D&&C>N?C<.01?(r=0,o=.707106781,u=.707106781):(r=Math.sqrt(C),o=F/r,u=z/r):D>N?D<.01?(r=.707106781,o=0,u=.707106781):(o=Math.sqrt(D),r=F/o,u=H/o):N<.01?(r=.707106781,o=.707106781,u=0):(u=Math.sqrt(N),r=z/u,o=H/u),this.set(r,o,u,n),this}let w=Math.sqrt((S-E)*(S-E)+(v-T)*(v-T)+(_-m)*(_-m));return Math.abs(w)<.001&&(w=1),this.x=(S-E)/w,this.y=(v-T)/w,this.z=(_-m)/w,this.w=Math.acos((d+x+y-1)/2),this}setFromMatrixPosition(t){const n=t.elements;return this.x=n[12],this.y=n[13],this.z=n[14],this.w=n[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,n){return this.x=Se(this.x,t.x,n.x),this.y=Se(this.y,t.y,n.y),this.z=Se(this.z,t.z,n.z),this.w=Se(this.w,t.w,n.w),this}clampScalar(t,n){return this.x=Se(this.x,t,n),this.y=Se(this.y,t,n),this.z=Se(this.z,t,n),this.w=Se(this.w,t,n),this}clampLength(t,n){const r=this.length();return this.divideScalar(r||1).multiplyScalar(Se(r,t,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,n){return this.x+=(t.x-this.x)*n,this.y+=(t.y-this.y)*n,this.z+=(t.z-this.z)*n,this.w+=(t.w-this.w)*n,this}lerpVectors(t,n,r){return this.x=t.x+(n.x-t.x)*r,this.y=t.y+(n.y-t.y)*r,this.z=t.z+(n.z-t.z)*r,this.w=t.w+(n.w-t.w)*r,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,n=0){return this.x=t[n],this.y=t[n+1],this.z=t[n+2],this.w=t[n+3],this}toArray(t=[],n=0){return t[n]=this.x,t[n+1]=this.y,t[n+2]=this.z,t[n+3]=this.w,t}fromBufferAttribute(t,n){return this.x=t.getX(n),this.y=t.getY(n),this.z=t.getZ(n),this.w=t.getW(n),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class a1 extends go{constructor(t=1,n=1,r={}){super(),r=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Zn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},r),this.isRenderTarget=!0,this.width=t,this.height=n,this.depth=r.depth,this.scissor=new rn(0,0,t,n),this.scissorTest=!1,this.viewport=new rn(0,0,t,n);const o={width:t,height:n,depth:r.depth},u=new Jn(o);this.textures=[];const c=r.count;for(let f=0;f<c;f++)this.textures[f]=u.clone(),this.textures[f].isRenderTargetTexture=!0,this.textures[f].renderTarget=this;this._setTextureOptions(r),this.depthBuffer=r.depthBuffer,this.stencilBuffer=r.stencilBuffer,this.resolveDepthBuffer=r.resolveDepthBuffer,this.resolveStencilBuffer=r.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=r.depthTexture,this.samples=r.samples,this.multiview=r.multiview}_setTextureOptions(t={}){const n={minFilter:Zn,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(n.mapping=t.mapping),t.wrapS!==void 0&&(n.wrapS=t.wrapS),t.wrapT!==void 0&&(n.wrapT=t.wrapT),t.wrapR!==void 0&&(n.wrapR=t.wrapR),t.magFilter!==void 0&&(n.magFilter=t.magFilter),t.minFilter!==void 0&&(n.minFilter=t.minFilter),t.format!==void 0&&(n.format=t.format),t.type!==void 0&&(n.type=t.type),t.anisotropy!==void 0&&(n.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(n.colorSpace=t.colorSpace),t.flipY!==void 0&&(n.flipY=t.flipY),t.generateMipmaps!==void 0&&(n.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(n.internalFormat=t.internalFormat);for(let r=0;r<this.textures.length;r++)this.textures[r].setValues(n)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),t!==null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,n,r=1){if(this.width!==t||this.height!==n||this.depth!==r){this.width=t,this.height=n,this.depth=r;for(let o=0,u=this.textures.length;o<u;o++)this.textures[o].image.width=t,this.textures[o].image.height=n,this.textures[o].image.depth=r,this.textures[o].isArrayTexture=this.textures[o].image.depth>1;this.dispose()}this.viewport.set(0,0,t,n),this.scissor.set(0,0,t,n)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let n=0,r=t.textures.length;n<r;n++){this.textures[n]=t.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0,this.textures[n].renderTarget=this;const o=Object.assign({},t.textures[n].image);this.textures[n].source=new Vm(o)}return this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Aa extends a1{constructor(t=1,n=1,r={}){super(t,n,r),this.isWebGLRenderTarget=!0}}class zS extends Jn{constructor(t=null,n=1,r=1,o=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:n,height:r,depth:o},this.magFilter=Ii,this.minFilter=Ii,this.wrapR=Yr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class r1 extends Jn{constructor(t=null,n=1,r=1,o=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:n,height:r,depth:o},this.magFilter=Ii,this.minFilter=Ii,this.wrapR=Yr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class jl{constructor(t=new rt(1/0,1/0,1/0),n=new rt(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=n}set(t,n){return this.min.copy(t),this.max.copy(n),this}setFromArray(t){this.makeEmpty();for(let n=0,r=t.length;n<r;n+=3)this.expandByPoint(wi.fromArray(t,n));return this}setFromBufferAttribute(t){this.makeEmpty();for(let n=0,r=t.count;n<r;n++)this.expandByPoint(wi.fromBufferAttribute(t,n));return this}setFromPoints(t){this.makeEmpty();for(let n=0,r=t.length;n<r;n++)this.expandByPoint(t[n]);return this}setFromCenterAndSize(t,n){const r=wi.copy(n).multiplyScalar(.5);return this.min.copy(t).sub(r),this.max.copy(t).add(r),this}setFromObject(t,n=!1){return this.makeEmpty(),this.expandByObject(t,n)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,n=!1){t.updateWorldMatrix(!1,!1);const r=t.geometry;if(r!==void 0){const u=r.getAttribute("position");if(n===!0&&u!==void 0&&t.isInstancedMesh!==!0)for(let c=0,f=u.count;c<f;c++)t.isMesh===!0?t.getVertexPosition(c,wi):wi.fromBufferAttribute(u,c),wi.applyMatrix4(t.matrixWorld),this.expandByPoint(wi);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),pc.copy(t.boundingBox)):(r.boundingBox===null&&r.computeBoundingBox(),pc.copy(r.boundingBox)),pc.applyMatrix4(t.matrixWorld),this.union(pc)}const o=t.children;for(let u=0,c=o.length;u<c;u++)this.expandByObject(o[u],n);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,n){return n.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,wi),wi.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let n,r;return t.normal.x>0?(n=t.normal.x*this.min.x,r=t.normal.x*this.max.x):(n=t.normal.x*this.max.x,r=t.normal.x*this.min.x),t.normal.y>0?(n+=t.normal.y*this.min.y,r+=t.normal.y*this.max.y):(n+=t.normal.y*this.max.y,r+=t.normal.y*this.min.y),t.normal.z>0?(n+=t.normal.z*this.min.z,r+=t.normal.z*this.max.z):(n+=t.normal.z*this.max.z,r+=t.normal.z*this.min.z),n<=-t.constant&&r>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(_l),mc.subVectors(this.max,_l),Hs.subVectors(t.a,_l),Gs.subVectors(t.b,_l),ks.subVectors(t.c,_l),nr.subVectors(Gs,Hs),ir.subVectors(ks,Gs),Or.subVectors(Hs,ks);let n=[0,-nr.z,nr.y,0,-ir.z,ir.y,0,-Or.z,Or.y,nr.z,0,-nr.x,ir.z,0,-ir.x,Or.z,0,-Or.x,-nr.y,nr.x,0,-ir.y,ir.x,0,-Or.y,Or.x,0];return!Td(n,Hs,Gs,ks,mc)||(n=[1,0,0,0,1,0,0,0,1],!Td(n,Hs,Gs,ks,mc))?!1:(gc.crossVectors(nr,ir),n=[gc.x,gc.y,gc.z],Td(n,Hs,Gs,ks,mc))}clampPoint(t,n){return n.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,wi).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(wi).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(ga[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),ga[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),ga[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),ga[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),ga[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),ga[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),ga[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),ga[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(ga),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}}const ga=[new rt,new rt,new rt,new rt,new rt,new rt,new rt,new rt],wi=new rt,pc=new jl,Hs=new rt,Gs=new rt,ks=new rt,nr=new rt,ir=new rt,Or=new rt,_l=new rt,mc=new rt,gc=new rt,Br=new rt;function Td(i,t,n,r,o){for(let u=0,c=i.length-3;u<=c;u+=3){Br.fromArray(i,u);const f=o.x*Math.abs(Br.x)+o.y*Math.abs(Br.y)+o.z*Math.abs(Br.z),p=t.dot(Br),d=n.dot(Br),m=r.dot(Br);if(Math.max(-Math.max(p,d,m),Math.min(p,d,m))>f)return!1}return!0}const s1=new jl,yl=new rt,bd=new rt;class Hm{constructor(t=new rt,n=-1){this.isSphere=!0,this.center=t,this.radius=n}set(t,n){return this.center.copy(t),this.radius=n,this}setFromPoints(t,n){const r=this.center;n!==void 0?r.copy(n):s1.setFromPoints(t).getCenter(r);let o=0;for(let u=0,c=t.length;u<c;u++)o=Math.max(o,r.distanceToSquared(t[u]));return this.radius=Math.sqrt(o),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const n=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=n*n}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,n){const r=this.center.distanceToSquared(t);return n.copy(t),r>this.radius*this.radius&&(n.sub(this.center).normalize(),n.multiplyScalar(this.radius).add(this.center)),n}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;yl.subVectors(t,this.center);const n=yl.lengthSq();if(n>this.radius*this.radius){const r=Math.sqrt(n),o=(r-this.radius)*.5;this.center.addScaledVector(yl,o/r),this.radius+=o}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(bd.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(yl.copy(t.center).add(bd)),this.expandByPoint(yl.copy(t.center).sub(bd))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}}const va=new rt,Ad=new rt,vc=new rt,ar=new rt,Rd=new rt,_c=new rt,Cd=new rt;class o1{constructor(t=new rt,n=new rt(0,0,-1)){this.origin=t,this.direction=n}set(t,n){return this.origin.copy(t),this.direction.copy(n),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,n){return n.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,va)),this}closestPointToPoint(t,n){n.subVectors(t,this.origin);const r=n.dot(this.direction);return r<0?n.copy(this.origin):n.copy(this.origin).addScaledVector(this.direction,r)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const n=va.subVectors(t,this.origin).dot(this.direction);return n<0?this.origin.distanceToSquared(t):(va.copy(this.origin).addScaledVector(this.direction,n),va.distanceToSquared(t))}distanceSqToSegment(t,n,r,o){Ad.copy(t).add(n).multiplyScalar(.5),vc.copy(n).sub(t).normalize(),ar.copy(this.origin).sub(Ad);const u=t.distanceTo(n)*.5,c=-this.direction.dot(vc),f=ar.dot(this.direction),p=-ar.dot(vc),d=ar.lengthSq(),m=Math.abs(1-c*c);let v,_,x,E;if(m>0)if(v=c*p-f,_=c*f-p,E=u*m,v>=0)if(_>=-E)if(_<=E){const T=1/m;v*=T,_*=T,x=v*(v+c*_+2*f)+_*(c*v+_+2*p)+d}else _=u,v=Math.max(0,-(c*_+f)),x=-v*v+_*(_+2*p)+d;else _=-u,v=Math.max(0,-(c*_+f)),x=-v*v+_*(_+2*p)+d;else _<=-E?(v=Math.max(0,-(-c*u+f)),_=v>0?-u:Math.min(Math.max(-u,-p),u),x=-v*v+_*(_+2*p)+d):_<=E?(v=0,_=Math.min(Math.max(-u,-p),u),x=_*(_+2*p)+d):(v=Math.max(0,-(c*u+f)),_=v>0?u:Math.min(Math.max(-u,-p),u),x=-v*v+_*(_+2*p)+d);else _=c>0?-u:u,v=Math.max(0,-(c*_+f)),x=-v*v+_*(_+2*p)+d;return r&&r.copy(this.origin).addScaledVector(this.direction,v),o&&o.copy(Ad).addScaledVector(vc,_),x}intersectSphere(t,n){va.subVectors(t.center,this.origin);const r=va.dot(this.direction),o=va.dot(va)-r*r,u=t.radius*t.radius;if(o>u)return null;const c=Math.sqrt(u-o),f=r-c,p=r+c;return p<0?null:f<0?this.at(p,n):this.at(f,n)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const n=t.normal.dot(this.direction);if(n===0)return t.distanceToPoint(this.origin)===0?0:null;const r=-(this.origin.dot(t.normal)+t.constant)/n;return r>=0?r:null}intersectPlane(t,n){const r=this.distanceToPlane(t);return r===null?null:this.at(r,n)}intersectsPlane(t){const n=t.distanceToPoint(this.origin);return n===0||t.normal.dot(this.direction)*n<0}intersectBox(t,n){let r,o,u,c,f,p;const d=1/this.direction.x,m=1/this.direction.y,v=1/this.direction.z,_=this.origin;return d>=0?(r=(t.min.x-_.x)*d,o=(t.max.x-_.x)*d):(r=(t.max.x-_.x)*d,o=(t.min.x-_.x)*d),m>=0?(u=(t.min.y-_.y)*m,c=(t.max.y-_.y)*m):(u=(t.max.y-_.y)*m,c=(t.min.y-_.y)*m),r>c||u>o||((u>r||isNaN(r))&&(r=u),(c<o||isNaN(o))&&(o=c),v>=0?(f=(t.min.z-_.z)*v,p=(t.max.z-_.z)*v):(f=(t.max.z-_.z)*v,p=(t.min.z-_.z)*v),r>p||f>o)||((f>r||r!==r)&&(r=f),(p<o||o!==o)&&(o=p),o<0)?null:this.at(r>=0?r:o,n)}intersectsBox(t){return this.intersectBox(t,va)!==null}intersectTriangle(t,n,r,o,u){Rd.subVectors(n,t),_c.subVectors(r,t),Cd.crossVectors(Rd,_c);let c=this.direction.dot(Cd),f;if(c>0){if(o)return null;f=1}else if(c<0)f=-1,c=-c;else return null;ar.subVectors(this.origin,t);const p=f*this.direction.dot(_c.crossVectors(ar,_c));if(p<0)return null;const d=f*this.direction.dot(Rd.cross(ar));if(d<0||p+d>c)return null;const m=-f*ar.dot(Cd);return m<0?null:this.at(m/c,u)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class yn{constructor(t,n,r,o,u,c,f,p,d,m,v,_,x,E,T,S){yn.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,n,r,o,u,c,f,p,d,m,v,_,x,E,T,S)}set(t,n,r,o,u,c,f,p,d,m,v,_,x,E,T,S){const y=this.elements;return y[0]=t,y[4]=n,y[8]=r,y[12]=o,y[1]=u,y[5]=c,y[9]=f,y[13]=p,y[2]=d,y[6]=m,y[10]=v,y[14]=_,y[3]=x,y[7]=E,y[11]=T,y[15]=S,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new yn().fromArray(this.elements)}copy(t){const n=this.elements,r=t.elements;return n[0]=r[0],n[1]=r[1],n[2]=r[2],n[3]=r[3],n[4]=r[4],n[5]=r[5],n[6]=r[6],n[7]=r[7],n[8]=r[8],n[9]=r[9],n[10]=r[10],n[11]=r[11],n[12]=r[12],n[13]=r[13],n[14]=r[14],n[15]=r[15],this}copyPosition(t){const n=this.elements,r=t.elements;return n[12]=r[12],n[13]=r[13],n[14]=r[14],this}setFromMatrix3(t){const n=t.elements;return this.set(n[0],n[3],n[6],0,n[1],n[4],n[7],0,n[2],n[5],n[8],0,0,0,0,1),this}extractBasis(t,n,r){return t.setFromMatrixColumn(this,0),n.setFromMatrixColumn(this,1),r.setFromMatrixColumn(this,2),this}makeBasis(t,n,r){return this.set(t.x,n.x,r.x,0,t.y,n.y,r.y,0,t.z,n.z,r.z,0,0,0,0,1),this}extractRotation(t){const n=this.elements,r=t.elements,o=1/Xs.setFromMatrixColumn(t,0).length(),u=1/Xs.setFromMatrixColumn(t,1).length(),c=1/Xs.setFromMatrixColumn(t,2).length();return n[0]=r[0]*o,n[1]=r[1]*o,n[2]=r[2]*o,n[3]=0,n[4]=r[4]*u,n[5]=r[5]*u,n[6]=r[6]*u,n[7]=0,n[8]=r[8]*c,n[9]=r[9]*c,n[10]=r[10]*c,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromEuler(t){const n=this.elements,r=t.x,o=t.y,u=t.z,c=Math.cos(r),f=Math.sin(r),p=Math.cos(o),d=Math.sin(o),m=Math.cos(u),v=Math.sin(u);if(t.order==="XYZ"){const _=c*m,x=c*v,E=f*m,T=f*v;n[0]=p*m,n[4]=-p*v,n[8]=d,n[1]=x+E*d,n[5]=_-T*d,n[9]=-f*p,n[2]=T-_*d,n[6]=E+x*d,n[10]=c*p}else if(t.order==="YXZ"){const _=p*m,x=p*v,E=d*m,T=d*v;n[0]=_+T*f,n[4]=E*f-x,n[8]=c*d,n[1]=c*v,n[5]=c*m,n[9]=-f,n[2]=x*f-E,n[6]=T+_*f,n[10]=c*p}else if(t.order==="ZXY"){const _=p*m,x=p*v,E=d*m,T=d*v;n[0]=_-T*f,n[4]=-c*v,n[8]=E+x*f,n[1]=x+E*f,n[5]=c*m,n[9]=T-_*f,n[2]=-c*d,n[6]=f,n[10]=c*p}else if(t.order==="ZYX"){const _=c*m,x=c*v,E=f*m,T=f*v;n[0]=p*m,n[4]=E*d-x,n[8]=_*d+T,n[1]=p*v,n[5]=T*d+_,n[9]=x*d-E,n[2]=-d,n[6]=f*p,n[10]=c*p}else if(t.order==="YZX"){const _=c*p,x=c*d,E=f*p,T=f*d;n[0]=p*m,n[4]=T-_*v,n[8]=E*v+x,n[1]=v,n[5]=c*m,n[9]=-f*m,n[2]=-d*m,n[6]=x*v+E,n[10]=_-T*v}else if(t.order==="XZY"){const _=c*p,x=c*d,E=f*p,T=f*d;n[0]=p*m,n[4]=-v,n[8]=d*m,n[1]=_*v+T,n[5]=c*m,n[9]=x*v-E,n[2]=E*v-x,n[6]=f*m,n[10]=T*v+_}return n[3]=0,n[7]=0,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromQuaternion(t){return this.compose(l1,t,u1)}lookAt(t,n,r){const o=this.elements;return oi.subVectors(t,n),oi.lengthSq()===0&&(oi.z=1),oi.normalize(),rr.crossVectors(r,oi),rr.lengthSq()===0&&(Math.abs(r.z)===1?oi.x+=1e-4:oi.z+=1e-4,oi.normalize(),rr.crossVectors(r,oi)),rr.normalize(),yc.crossVectors(oi,rr),o[0]=rr.x,o[4]=yc.x,o[8]=oi.x,o[1]=rr.y,o[5]=yc.y,o[9]=oi.y,o[2]=rr.z,o[6]=yc.z,o[10]=oi.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,n){const r=t.elements,o=n.elements,u=this.elements,c=r[0],f=r[4],p=r[8],d=r[12],m=r[1],v=r[5],_=r[9],x=r[13],E=r[2],T=r[6],S=r[10],y=r[14],w=r[3],C=r[7],D=r[11],N=r[15],F=o[0],z=o[4],H=o[8],U=o[12],L=o[1],G=o[5],nt=o[9],ct=o[13],pt=o[2],ut=o[6],I=o[10],q=o[14],W=o[3],yt=o[7],P=o[11],J=o[15];return u[0]=c*F+f*L+p*pt+d*W,u[4]=c*z+f*G+p*ut+d*yt,u[8]=c*H+f*nt+p*I+d*P,u[12]=c*U+f*ct+p*q+d*J,u[1]=m*F+v*L+_*pt+x*W,u[5]=m*z+v*G+_*ut+x*yt,u[9]=m*H+v*nt+_*I+x*P,u[13]=m*U+v*ct+_*q+x*J,u[2]=E*F+T*L+S*pt+y*W,u[6]=E*z+T*G+S*ut+y*yt,u[10]=E*H+T*nt+S*I+y*P,u[14]=E*U+T*ct+S*q+y*J,u[3]=w*F+C*L+D*pt+N*W,u[7]=w*z+C*G+D*ut+N*yt,u[11]=w*H+C*nt+D*I+N*P,u[15]=w*U+C*ct+D*q+N*J,this}multiplyScalar(t){const n=this.elements;return n[0]*=t,n[4]*=t,n[8]*=t,n[12]*=t,n[1]*=t,n[5]*=t,n[9]*=t,n[13]*=t,n[2]*=t,n[6]*=t,n[10]*=t,n[14]*=t,n[3]*=t,n[7]*=t,n[11]*=t,n[15]*=t,this}determinant(){const t=this.elements,n=t[0],r=t[4],o=t[8],u=t[12],c=t[1],f=t[5],p=t[9],d=t[13],m=t[2],v=t[6],_=t[10],x=t[14],E=t[3],T=t[7],S=t[11],y=t[15];return E*(+u*p*v-o*d*v-u*f*_+r*d*_+o*f*x-r*p*x)+T*(+n*p*x-n*d*_+u*c*_-o*c*x+o*d*m-u*p*m)+S*(+n*d*v-n*f*x-u*c*v+r*c*x+u*f*m-r*d*m)+y*(-o*f*m-n*p*v+n*f*_+o*c*v-r*c*_+r*p*m)}transpose(){const t=this.elements;let n;return n=t[1],t[1]=t[4],t[4]=n,n=t[2],t[2]=t[8],t[8]=n,n=t[6],t[6]=t[9],t[9]=n,n=t[3],t[3]=t[12],t[12]=n,n=t[7],t[7]=t[13],t[13]=n,n=t[11],t[11]=t[14],t[14]=n,this}setPosition(t,n,r){const o=this.elements;return t.isVector3?(o[12]=t.x,o[13]=t.y,o[14]=t.z):(o[12]=t,o[13]=n,o[14]=r),this}invert(){const t=this.elements,n=t[0],r=t[1],o=t[2],u=t[3],c=t[4],f=t[5],p=t[6],d=t[7],m=t[8],v=t[9],_=t[10],x=t[11],E=t[12],T=t[13],S=t[14],y=t[15],w=v*S*d-T*_*d+T*p*x-f*S*x-v*p*y+f*_*y,C=E*_*d-m*S*d-E*p*x+c*S*x+m*p*y-c*_*y,D=m*T*d-E*v*d+E*f*x-c*T*x-m*f*y+c*v*y,N=E*v*p-m*T*p-E*f*_+c*T*_+m*f*S-c*v*S,F=n*w+r*C+o*D+u*N;if(F===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const z=1/F;return t[0]=w*z,t[1]=(T*_*u-v*S*u-T*o*x+r*S*x+v*o*y-r*_*y)*z,t[2]=(f*S*u-T*p*u+T*o*d-r*S*d-f*o*y+r*p*y)*z,t[3]=(v*p*u-f*_*u-v*o*d+r*_*d+f*o*x-r*p*x)*z,t[4]=C*z,t[5]=(m*S*u-E*_*u+E*o*x-n*S*x-m*o*y+n*_*y)*z,t[6]=(E*p*u-c*S*u-E*o*d+n*S*d+c*o*y-n*p*y)*z,t[7]=(c*_*u-m*p*u+m*o*d-n*_*d-c*o*x+n*p*x)*z,t[8]=D*z,t[9]=(E*v*u-m*T*u-E*r*x+n*T*x+m*r*y-n*v*y)*z,t[10]=(c*T*u-E*f*u+E*r*d-n*T*d-c*r*y+n*f*y)*z,t[11]=(m*f*u-c*v*u-m*r*d+n*v*d+c*r*x-n*f*x)*z,t[12]=N*z,t[13]=(m*T*o-E*v*o+E*r*_-n*T*_-m*r*S+n*v*S)*z,t[14]=(E*f*o-c*T*o-E*r*p+n*T*p+c*r*S-n*f*S)*z,t[15]=(c*v*o-m*f*o+m*r*p-n*v*p-c*r*_+n*f*_)*z,this}scale(t){const n=this.elements,r=t.x,o=t.y,u=t.z;return n[0]*=r,n[4]*=o,n[8]*=u,n[1]*=r,n[5]*=o,n[9]*=u,n[2]*=r,n[6]*=o,n[10]*=u,n[3]*=r,n[7]*=o,n[11]*=u,this}getMaxScaleOnAxis(){const t=this.elements,n=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],r=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],o=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(n,r,o))}makeTranslation(t,n,r){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,n,0,0,1,r,0,0,0,1),this}makeRotationX(t){const n=Math.cos(t),r=Math.sin(t);return this.set(1,0,0,0,0,n,-r,0,0,r,n,0,0,0,0,1),this}makeRotationY(t){const n=Math.cos(t),r=Math.sin(t);return this.set(n,0,r,0,0,1,0,0,-r,0,n,0,0,0,0,1),this}makeRotationZ(t){const n=Math.cos(t),r=Math.sin(t);return this.set(n,-r,0,0,r,n,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,n){const r=Math.cos(n),o=Math.sin(n),u=1-r,c=t.x,f=t.y,p=t.z,d=u*c,m=u*f;return this.set(d*c+r,d*f-o*p,d*p+o*f,0,d*f+o*p,m*f+r,m*p-o*c,0,d*p-o*f,m*p+o*c,u*p*p+r,0,0,0,0,1),this}makeScale(t,n,r){return this.set(t,0,0,0,0,n,0,0,0,0,r,0,0,0,0,1),this}makeShear(t,n,r,o,u,c){return this.set(1,r,u,0,t,1,c,0,n,o,1,0,0,0,0,1),this}compose(t,n,r){const o=this.elements,u=n._x,c=n._y,f=n._z,p=n._w,d=u+u,m=c+c,v=f+f,_=u*d,x=u*m,E=u*v,T=c*m,S=c*v,y=f*v,w=p*d,C=p*m,D=p*v,N=r.x,F=r.y,z=r.z;return o[0]=(1-(T+y))*N,o[1]=(x+D)*N,o[2]=(E-C)*N,o[3]=0,o[4]=(x-D)*F,o[5]=(1-(_+y))*F,o[6]=(S+w)*F,o[7]=0,o[8]=(E+C)*z,o[9]=(S-w)*z,o[10]=(1-(_+T))*z,o[11]=0,o[12]=t.x,o[13]=t.y,o[14]=t.z,o[15]=1,this}decompose(t,n,r){const o=this.elements;let u=Xs.set(o[0],o[1],o[2]).length();const c=Xs.set(o[4],o[5],o[6]).length(),f=Xs.set(o[8],o[9],o[10]).length();this.determinant()<0&&(u=-u),t.x=o[12],t.y=o[13],t.z=o[14],Di.copy(this);const d=1/u,m=1/c,v=1/f;return Di.elements[0]*=d,Di.elements[1]*=d,Di.elements[2]*=d,Di.elements[4]*=m,Di.elements[5]*=m,Di.elements[6]*=m,Di.elements[8]*=v,Di.elements[9]*=v,Di.elements[10]*=v,n.setFromRotationMatrix(Di),r.x=u,r.y=c,r.z=f,this}makePerspective(t,n,r,o,u,c,f=Yi,p=!1){const d=this.elements,m=2*u/(n-t),v=2*u/(r-o),_=(n+t)/(n-t),x=(r+o)/(r-o);let E,T;if(p)E=u/(c-u),T=c*u/(c-u);else if(f===Yi)E=-(c+u)/(c-u),T=-2*c*u/(c-u);else if(f===Jc)E=-c/(c-u),T=-c*u/(c-u);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+f);return d[0]=m,d[4]=0,d[8]=_,d[12]=0,d[1]=0,d[5]=v,d[9]=x,d[13]=0,d[2]=0,d[6]=0,d[10]=E,d[14]=T,d[3]=0,d[7]=0,d[11]=-1,d[15]=0,this}makeOrthographic(t,n,r,o,u,c,f=Yi,p=!1){const d=this.elements,m=2/(n-t),v=2/(r-o),_=-(n+t)/(n-t),x=-(r+o)/(r-o);let E,T;if(p)E=1/(c-u),T=c/(c-u);else if(f===Yi)E=-2/(c-u),T=-(c+u)/(c-u);else if(f===Jc)E=-1/(c-u),T=-u/(c-u);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+f);return d[0]=m,d[4]=0,d[8]=0,d[12]=_,d[1]=0,d[5]=v,d[9]=0,d[13]=x,d[2]=0,d[6]=0,d[10]=E,d[14]=T,d[3]=0,d[7]=0,d[11]=0,d[15]=1,this}equals(t){const n=this.elements,r=t.elements;for(let o=0;o<16;o++)if(n[o]!==r[o])return!1;return!0}fromArray(t,n=0){for(let r=0;r<16;r++)this.elements[r]=t[r+n];return this}toArray(t=[],n=0){const r=this.elements;return t[n]=r[0],t[n+1]=r[1],t[n+2]=r[2],t[n+3]=r[3],t[n+4]=r[4],t[n+5]=r[5],t[n+6]=r[6],t[n+7]=r[7],t[n+8]=r[8],t[n+9]=r[9],t[n+10]=r[10],t[n+11]=r[11],t[n+12]=r[12],t[n+13]=r[13],t[n+14]=r[14],t[n+15]=r[15],t}}const Xs=new rt,Di=new yn,l1=new rt(0,0,0),u1=new rt(1,1,1),rr=new rt,yc=new rt,oi=new rt,fy=new yn,hy=new Yl;class ns{constructor(t=0,n=0,r=0,o=ns.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=r,this._order=o}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,n,r,o=this._order){return this._x=t,this._y=n,this._z=r,this._order=o,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,n=this._order,r=!0){const o=t.elements,u=o[0],c=o[4],f=o[8],p=o[1],d=o[5],m=o[9],v=o[2],_=o[6],x=o[10];switch(n){case"XYZ":this._y=Math.asin(Se(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(-m,x),this._z=Math.atan2(-c,u)):(this._x=Math.atan2(_,d),this._z=0);break;case"YXZ":this._x=Math.asin(-Se(m,-1,1)),Math.abs(m)<.9999999?(this._y=Math.atan2(f,x),this._z=Math.atan2(p,d)):(this._y=Math.atan2(-v,u),this._z=0);break;case"ZXY":this._x=Math.asin(Se(_,-1,1)),Math.abs(_)<.9999999?(this._y=Math.atan2(-v,x),this._z=Math.atan2(-c,d)):(this._y=0,this._z=Math.atan2(p,u));break;case"ZYX":this._y=Math.asin(-Se(v,-1,1)),Math.abs(v)<.9999999?(this._x=Math.atan2(_,x),this._z=Math.atan2(p,u)):(this._x=0,this._z=Math.atan2(-c,d));break;case"YZX":this._z=Math.asin(Se(p,-1,1)),Math.abs(p)<.9999999?(this._x=Math.atan2(-m,d),this._y=Math.atan2(-v,u)):(this._x=0,this._y=Math.atan2(f,x));break;case"XZY":this._z=Math.asin(-Se(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(_,d),this._y=Math.atan2(f,u)):(this._x=Math.atan2(-m,x),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+n)}return this._order=n,r===!0&&this._onChangeCallback(),this}setFromQuaternion(t,n,r){return fy.makeRotationFromQuaternion(t),this.setFromRotationMatrix(fy,n,r)}setFromVector3(t,n=this._order){return this.set(t.x,t.y,t.z,n)}reorder(t){return hy.setFromEuler(this),this.setFromQuaternion(hy,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],n=0){return t[n]=this._x,t[n+1]=this._y,t[n+2]=this._z,t[n+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}ns.DEFAULT_ORDER="XYZ";class VS{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let c1=0;const dy=new rt,Ws=new Yl,_a=new yn,xc=new rt,xl=new rt,f1=new rt,h1=new Yl,py=new rt(1,0,0),my=new rt(0,1,0),gy=new rt(0,0,1),vy={type:"added"},d1={type:"removed"},qs={type:"childadded",child:null},wd={type:"childremoved",child:null};class Mi extends go{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:c1++}),this.uuid=ql(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Mi.DEFAULT_UP.clone();const t=new rt,n=new ns,r=new Yl,o=new rt(1,1,1);function u(){r.setFromEuler(n,!1)}function c(){n.setFromQuaternion(r,void 0,!1)}n._onChange(u),r._onChange(c),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:o},modelViewMatrix:{value:new yn},normalMatrix:{value:new fe}}),this.matrix=new yn,this.matrixWorld=new yn,this.matrixAutoUpdate=Mi.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Mi.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new VS,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,n){this.quaternion.setFromAxisAngle(t,n)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,n){return Ws.setFromAxisAngle(t,n),this.quaternion.multiply(Ws),this}rotateOnWorldAxis(t,n){return Ws.setFromAxisAngle(t,n),this.quaternion.premultiply(Ws),this}rotateX(t){return this.rotateOnAxis(py,t)}rotateY(t){return this.rotateOnAxis(my,t)}rotateZ(t){return this.rotateOnAxis(gy,t)}translateOnAxis(t,n){return dy.copy(t).applyQuaternion(this.quaternion),this.position.add(dy.multiplyScalar(n)),this}translateX(t){return this.translateOnAxis(py,t)}translateY(t){return this.translateOnAxis(my,t)}translateZ(t){return this.translateOnAxis(gy,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(_a.copy(this.matrixWorld).invert())}lookAt(t,n,r){t.isVector3?xc.copy(t):xc.set(t,n,r);const o=this.parent;this.updateWorldMatrix(!0,!1),xl.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?_a.lookAt(xl,xc,this.up):_a.lookAt(xc,xl,this.up),this.quaternion.setFromRotationMatrix(_a),o&&(_a.extractRotation(o.matrixWorld),Ws.setFromRotationMatrix(_a),this.quaternion.premultiply(Ws.invert()))}add(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.add(arguments[n]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(vy),qs.child=t,this.dispatchEvent(qs),qs.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let r=0;r<arguments.length;r++)this.remove(arguments[r]);return this}const n=this.children.indexOf(t);return n!==-1&&(t.parent=null,this.children.splice(n,1),t.dispatchEvent(d1),wd.child=t,this.dispatchEvent(wd),wd.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),_a.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),_a.multiply(t.parent.matrixWorld)),t.applyMatrix4(_a),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(vy),qs.child=t,this.dispatchEvent(qs),qs.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,n){if(this[t]===n)return this;for(let r=0,o=this.children.length;r<o;r++){const c=this.children[r].getObjectByProperty(t,n);if(c!==void 0)return c}}getObjectsByProperty(t,n,r=[]){this[t]===n&&r.push(this);const o=this.children;for(let u=0,c=o.length;u<c;u++)o[u].getObjectsByProperty(t,n,r);return r}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(xl,t,f1),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(xl,h1,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const n=this.matrixWorld.elements;return t.set(n[8],n[9],n[10]).normalize()}raycast(){}traverse(t){t(this);const n=this.children;for(let r=0,o=n.length;r<o;r++)n[r].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const n=this.children;for(let r=0,o=n.length;r<o;r++)n[r].traverseVisible(t)}traverseAncestors(t){const n=this.parent;n!==null&&(t(n),n.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const n=this.children;for(let r=0,o=n.length;r<o;r++)n[r].updateMatrixWorld(t)}updateWorldMatrix(t,n){const r=this.parent;if(t===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),n===!0){const o=this.children;for(let u=0,c=o.length;u<c;u++)o[u].updateWorldMatrix(!1,!0)}}toJSON(t){const n=t===void 0||typeof t=="string",r={};n&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},r.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const o={};o.uuid=this.uuid,o.type=this.type,this.name!==""&&(o.name=this.name),this.castShadow===!0&&(o.castShadow=!0),this.receiveShadow===!0&&(o.receiveShadow=!0),this.visible===!1&&(o.visible=!1),this.frustumCulled===!1&&(o.frustumCulled=!1),this.renderOrder!==0&&(o.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(o.userData=this.userData),o.layers=this.layers.mask,o.matrix=this.matrix.toArray(),o.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(o.matrixAutoUpdate=!1),this.isInstancedMesh&&(o.type="InstancedMesh",o.count=this.count,o.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(o.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(o.type="BatchedMesh",o.perObjectFrustumCulled=this.perObjectFrustumCulled,o.sortObjects=this.sortObjects,o.drawRanges=this._drawRanges,o.reservedRanges=this._reservedRanges,o.geometryInfo=this._geometryInfo.map(f=>({...f,boundingBox:f.boundingBox?f.boundingBox.toJSON():void 0,boundingSphere:f.boundingSphere?f.boundingSphere.toJSON():void 0})),o.instanceInfo=this._instanceInfo.map(f=>({...f})),o.availableInstanceIds=this._availableInstanceIds.slice(),o.availableGeometryIds=this._availableGeometryIds.slice(),o.nextIndexStart=this._nextIndexStart,o.nextVertexStart=this._nextVertexStart,o.geometryCount=this._geometryCount,o.maxInstanceCount=this._maxInstanceCount,o.maxVertexCount=this._maxVertexCount,o.maxIndexCount=this._maxIndexCount,o.geometryInitialized=this._geometryInitialized,o.matricesTexture=this._matricesTexture.toJSON(t),o.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(o.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(o.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(o.boundingBox=this.boundingBox.toJSON()));function u(f,p){return f[p.uuid]===void 0&&(f[p.uuid]=p.toJSON(t)),p.uuid}if(this.isScene)this.background&&(this.background.isColor?o.background=this.background.toJSON():this.background.isTexture&&(o.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(o.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){o.geometry=u(t.geometries,this.geometry);const f=this.geometry.parameters;if(f!==void 0&&f.shapes!==void 0){const p=f.shapes;if(Array.isArray(p))for(let d=0,m=p.length;d<m;d++){const v=p[d];u(t.shapes,v)}else u(t.shapes,p)}}if(this.isSkinnedMesh&&(o.bindMode=this.bindMode,o.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(u(t.skeletons,this.skeleton),o.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const f=[];for(let p=0,d=this.material.length;p<d;p++)f.push(u(t.materials,this.material[p]));o.material=f}else o.material=u(t.materials,this.material);if(this.children.length>0){o.children=[];for(let f=0;f<this.children.length;f++)o.children.push(this.children[f].toJSON(t).object)}if(this.animations.length>0){o.animations=[];for(let f=0;f<this.animations.length;f++){const p=this.animations[f];o.animations.push(u(t.animations,p))}}if(n){const f=c(t.geometries),p=c(t.materials),d=c(t.textures),m=c(t.images),v=c(t.shapes),_=c(t.skeletons),x=c(t.animations),E=c(t.nodes);f.length>0&&(r.geometries=f),p.length>0&&(r.materials=p),d.length>0&&(r.textures=d),m.length>0&&(r.images=m),v.length>0&&(r.shapes=v),_.length>0&&(r.skeletons=_),x.length>0&&(r.animations=x),E.length>0&&(r.nodes=E)}return r.object=o,r;function c(f){const p=[];for(const d in f){const m=f[d];delete m.metadata,p.push(m)}return p}}clone(t){return new this.constructor().copy(this,t)}copy(t,n=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),n===!0)for(let r=0;r<t.children.length;r++){const o=t.children[r];this.add(o.clone())}return this}}Mi.DEFAULT_UP=new rt(0,1,0);Mi.DEFAULT_MATRIX_AUTO_UPDATE=!0;Mi.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Ui=new rt,ya=new rt,Dd=new rt,xa=new rt,Ys=new rt,js=new rt,_y=new rt,Ud=new rt,Ld=new rt,Pd=new rt,Nd=new rn,Od=new rn,Bd=new rn;class Oi{constructor(t=new rt,n=new rt,r=new rt){this.a=t,this.b=n,this.c=r}static getNormal(t,n,r,o){o.subVectors(r,n),Ui.subVectors(t,n),o.cross(Ui);const u=o.lengthSq();return u>0?o.multiplyScalar(1/Math.sqrt(u)):o.set(0,0,0)}static getBarycoord(t,n,r,o,u){Ui.subVectors(o,n),ya.subVectors(r,n),Dd.subVectors(t,n);const c=Ui.dot(Ui),f=Ui.dot(ya),p=Ui.dot(Dd),d=ya.dot(ya),m=ya.dot(Dd),v=c*d-f*f;if(v===0)return u.set(0,0,0),null;const _=1/v,x=(d*p-f*m)*_,E=(c*m-f*p)*_;return u.set(1-x-E,E,x)}static containsPoint(t,n,r,o){return this.getBarycoord(t,n,r,o,xa)===null?!1:xa.x>=0&&xa.y>=0&&xa.x+xa.y<=1}static getInterpolation(t,n,r,o,u,c,f,p){return this.getBarycoord(t,n,r,o,xa)===null?(p.x=0,p.y=0,"z"in p&&(p.z=0),"w"in p&&(p.w=0),null):(p.setScalar(0),p.addScaledVector(u,xa.x),p.addScaledVector(c,xa.y),p.addScaledVector(f,xa.z),p)}static getInterpolatedAttribute(t,n,r,o,u,c){return Nd.setScalar(0),Od.setScalar(0),Bd.setScalar(0),Nd.fromBufferAttribute(t,n),Od.fromBufferAttribute(t,r),Bd.fromBufferAttribute(t,o),c.setScalar(0),c.addScaledVector(Nd,u.x),c.addScaledVector(Od,u.y),c.addScaledVector(Bd,u.z),c}static isFrontFacing(t,n,r,o){return Ui.subVectors(r,n),ya.subVectors(t,n),Ui.cross(ya).dot(o)<0}set(t,n,r){return this.a.copy(t),this.b.copy(n),this.c.copy(r),this}setFromPointsAndIndices(t,n,r,o){return this.a.copy(t[n]),this.b.copy(t[r]),this.c.copy(t[o]),this}setFromAttributeAndIndices(t,n,r,o){return this.a.fromBufferAttribute(t,n),this.b.fromBufferAttribute(t,r),this.c.fromBufferAttribute(t,o),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Ui.subVectors(this.c,this.b),ya.subVectors(this.a,this.b),Ui.cross(ya).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return Oi.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return Oi.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,r,o,u){return Oi.getInterpolation(t,this.a,this.b,this.c,n,r,o,u)}containsPoint(t){return Oi.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return Oi.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,n){const r=this.a,o=this.b,u=this.c;let c,f;Ys.subVectors(o,r),js.subVectors(u,r),Ud.subVectors(t,r);const p=Ys.dot(Ud),d=js.dot(Ud);if(p<=0&&d<=0)return n.copy(r);Ld.subVectors(t,o);const m=Ys.dot(Ld),v=js.dot(Ld);if(m>=0&&v<=m)return n.copy(o);const _=p*v-m*d;if(_<=0&&p>=0&&m<=0)return c=p/(p-m),n.copy(r).addScaledVector(Ys,c);Pd.subVectors(t,u);const x=Ys.dot(Pd),E=js.dot(Pd);if(E>=0&&x<=E)return n.copy(u);const T=x*d-p*E;if(T<=0&&d>=0&&E<=0)return f=d/(d-E),n.copy(r).addScaledVector(js,f);const S=m*E-x*v;if(S<=0&&v-m>=0&&x-E>=0)return _y.subVectors(u,o),f=(v-m)/(v-m+(x-E)),n.copy(o).addScaledVector(_y,f);const y=1/(S+T+_);return c=T*y,f=_*y,n.copy(r).addScaledVector(Ys,c).addScaledVector(js,f)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const HS={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},sr={h:0,s:0,l:0},Sc={h:0,s:0,l:0};function Fd(i,t,n){return n<0&&(n+=1),n>1&&(n-=1),n<1/6?i+(t-i)*6*n:n<1/2?t:n<2/3?i+(t-i)*6*(2/3-n):i}class Ie{constructor(t,n,r){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,n,r)}set(t,n,r){if(n===void 0&&r===void 0){const o=t;o&&o.isColor?this.copy(o):typeof o=="number"?this.setHex(o):typeof o=="string"&&this.setStyle(o)}else this.setRGB(t,n,r);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,n=Si){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Ae.colorSpaceToWorking(this,n),this}setRGB(t,n,r,o=Ae.workingColorSpace){return this.r=t,this.g=n,this.b=r,Ae.colorSpaceToWorking(this,o),this}setHSL(t,n,r,o=Ae.workingColorSpace){if(t=QA(t,1),n=Se(n,0,1),r=Se(r,0,1),n===0)this.r=this.g=this.b=r;else{const u=r<=.5?r*(1+n):r+n-r*n,c=2*r-u;this.r=Fd(c,u,t+1/3),this.g=Fd(c,u,t),this.b=Fd(c,u,t-1/3)}return Ae.colorSpaceToWorking(this,o),this}setStyle(t,n=Si){function r(u){u!==void 0&&parseFloat(u)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let o;if(o=/^(\w+)\(([^\)]*)\)/.exec(t)){let u;const c=o[1],f=o[2];switch(c){case"rgb":case"rgba":if(u=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(f))return r(u[4]),this.setRGB(Math.min(255,parseInt(u[1],10))/255,Math.min(255,parseInt(u[2],10))/255,Math.min(255,parseInt(u[3],10))/255,n);if(u=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(f))return r(u[4]),this.setRGB(Math.min(100,parseInt(u[1],10))/100,Math.min(100,parseInt(u[2],10))/100,Math.min(100,parseInt(u[3],10))/100,n);break;case"hsl":case"hsla":if(u=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(f))return r(u[4]),this.setHSL(parseFloat(u[1])/360,parseFloat(u[2])/100,parseFloat(u[3])/100,n);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(o=/^\#([A-Fa-f\d]+)$/.exec(t)){const u=o[1],c=u.length;if(c===3)return this.setRGB(parseInt(u.charAt(0),16)/15,parseInt(u.charAt(1),16)/15,parseInt(u.charAt(2),16)/15,n);if(c===6)return this.setHex(parseInt(u,16),n);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,n);return this}setColorName(t,n=Si){const r=HS[t.toLowerCase()];return r!==void 0?this.setHex(r,n):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Ea(t.r),this.g=Ea(t.g),this.b=Ea(t.b),this}copyLinearToSRGB(t){return this.r=so(t.r),this.g=so(t.g),this.b=so(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Si){return Ae.workingToColorSpace(Bn.copy(this),t),Math.round(Se(Bn.r*255,0,255))*65536+Math.round(Se(Bn.g*255,0,255))*256+Math.round(Se(Bn.b*255,0,255))}getHexString(t=Si){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,n=Ae.workingColorSpace){Ae.workingToColorSpace(Bn.copy(this),n);const r=Bn.r,o=Bn.g,u=Bn.b,c=Math.max(r,o,u),f=Math.min(r,o,u);let p,d;const m=(f+c)/2;if(f===c)p=0,d=0;else{const v=c-f;switch(d=m<=.5?v/(c+f):v/(2-c-f),c){case r:p=(o-u)/v+(o<u?6:0);break;case o:p=(u-r)/v+2;break;case u:p=(r-o)/v+4;break}p/=6}return t.h=p,t.s=d,t.l=m,t}getRGB(t,n=Ae.workingColorSpace){return Ae.workingToColorSpace(Bn.copy(this),n),t.r=Bn.r,t.g=Bn.g,t.b=Bn.b,t}getStyle(t=Si){Ae.workingToColorSpace(Bn.copy(this),t);const n=Bn.r,r=Bn.g,o=Bn.b;return t!==Si?`color(${t} ${n.toFixed(3)} ${r.toFixed(3)} ${o.toFixed(3)})`:`rgb(${Math.round(n*255)},${Math.round(r*255)},${Math.round(o*255)})`}offsetHSL(t,n,r){return this.getHSL(sr),this.setHSL(sr.h+t,sr.s+n,sr.l+r)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,n){return this.r=t.r+n.r,this.g=t.g+n.g,this.b=t.b+n.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,n){return this.r+=(t.r-this.r)*n,this.g+=(t.g-this.g)*n,this.b+=(t.b-this.b)*n,this}lerpColors(t,n,r){return this.r=t.r+(n.r-t.r)*r,this.g=t.g+(n.g-t.g)*r,this.b=t.b+(n.b-t.b)*r,this}lerpHSL(t,n){this.getHSL(sr),t.getHSL(Sc);const r=yd(sr.h,Sc.h,n),o=yd(sr.s,Sc.s,n),u=yd(sr.l,Sc.l,n);return this.setHSL(r,o,u),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const n=this.r,r=this.g,o=this.b,u=t.elements;return this.r=u[0]*n+u[3]*r+u[6]*o,this.g=u[1]*n+u[4]*r+u[7]*o,this.b=u[2]*n+u[5]*r+u[8]*o,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,n=0){return this.r=t[n],this.g=t[n+1],this.b=t[n+2],this}toArray(t=[],n=0){return t[n]=this.r,t[n+1]=this.g,t[n+2]=this.b,t}fromBufferAttribute(t,n){return this.r=t.getX(n),this.g=t.getY(n),this.b=t.getZ(n),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Bn=new Ie;Ie.NAMES=HS;let p1=0;class uf extends go{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:p1++}),this.uuid=ql(),this.name="",this.type="Material",this.blending=ro,this.side=pr,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=xp,this.blendDst=Sp,this.blendEquation=Wr,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ie(0,0,0),this.blendAlpha=0,this.depthFunc=lo,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=ay,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=zs,this.stencilZFail=zs,this.stencilZPass=zs,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const n in t){const r=t[n];if(r===void 0){console.warn(`THREE.Material: parameter '${n}' has value of undefined.`);continue}const o=this[n];if(o===void 0){console.warn(`THREE.Material: '${n}' is not a property of THREE.${this.type}.`);continue}o&&o.isColor?o.set(r):o&&o.isVector3&&r&&r.isVector3?o.copy(r):this[n]=r}}toJSON(t){const n=t===void 0||typeof t=="string";n&&(t={textures:{},images:{}});const r={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.color&&this.color.isColor&&(r.color=this.color.getHex()),this.roughness!==void 0&&(r.roughness=this.roughness),this.metalness!==void 0&&(r.metalness=this.metalness),this.sheen!==void 0&&(r.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(r.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(r.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(r.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(r.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(r.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(r.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(r.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(r.shininess=this.shininess),this.clearcoat!==void 0&&(r.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(r.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(r.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(r.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(r.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,r.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(r.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(r.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(r.dispersion=this.dispersion),this.iridescence!==void 0&&(r.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(r.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(r.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(r.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(r.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(r.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(r.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(r.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(r.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(r.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(r.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(r.lightMap=this.lightMap.toJSON(t).uuid,r.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(r.aoMap=this.aoMap.toJSON(t).uuid,r.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(r.bumpMap=this.bumpMap.toJSON(t).uuid,r.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(r.normalMap=this.normalMap.toJSON(t).uuid,r.normalMapType=this.normalMapType,r.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(r.displacementMap=this.displacementMap.toJSON(t).uuid,r.displacementScale=this.displacementScale,r.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(r.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(r.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(r.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(r.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(r.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(r.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(r.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(r.combine=this.combine)),this.envMapRotation!==void 0&&(r.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(r.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(r.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(r.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(r.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(r.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(r.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(r.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(r.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(r.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(r.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(r.size=this.size),this.shadowSide!==null&&(r.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(r.sizeAttenuation=this.sizeAttenuation),this.blending!==ro&&(r.blending=this.blending),this.side!==pr&&(r.side=this.side),this.vertexColors===!0&&(r.vertexColors=!0),this.opacity<1&&(r.opacity=this.opacity),this.transparent===!0&&(r.transparent=!0),this.blendSrc!==xp&&(r.blendSrc=this.blendSrc),this.blendDst!==Sp&&(r.blendDst=this.blendDst),this.blendEquation!==Wr&&(r.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(r.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(r.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(r.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(r.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(r.blendAlpha=this.blendAlpha),this.depthFunc!==lo&&(r.depthFunc=this.depthFunc),this.depthTest===!1&&(r.depthTest=this.depthTest),this.depthWrite===!1&&(r.depthWrite=this.depthWrite),this.colorWrite===!1&&(r.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(r.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==ay&&(r.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(r.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(r.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==zs&&(r.stencilFail=this.stencilFail),this.stencilZFail!==zs&&(r.stencilZFail=this.stencilZFail),this.stencilZPass!==zs&&(r.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(r.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(r.rotation=this.rotation),this.polygonOffset===!0&&(r.polygonOffset=!0),this.polygonOffsetFactor!==0&&(r.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(r.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(r.linewidth=this.linewidth),this.dashSize!==void 0&&(r.dashSize=this.dashSize),this.gapSize!==void 0&&(r.gapSize=this.gapSize),this.scale!==void 0&&(r.scale=this.scale),this.dithering===!0&&(r.dithering=!0),this.alphaTest>0&&(r.alphaTest=this.alphaTest),this.alphaHash===!0&&(r.alphaHash=!0),this.alphaToCoverage===!0&&(r.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(r.premultipliedAlpha=!0),this.forceSinglePass===!0&&(r.forceSinglePass=!0),this.wireframe===!0&&(r.wireframe=!0),this.wireframeLinewidth>1&&(r.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(r.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(r.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(r.flatShading=!0),this.visible===!1&&(r.visible=!1),this.toneMapped===!1&&(r.toneMapped=!1),this.fog===!1&&(r.fog=!1),Object.keys(this.userData).length>0&&(r.userData=this.userData);function o(u){const c=[];for(const f in u){const p=u[f];delete p.metadata,c.push(p)}return c}if(n){const u=o(t.textures),c=o(t.images);u.length>0&&(r.textures=u),c.length>0&&(r.images=c)}return r}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const n=t.clippingPlanes;let r=null;if(n!==null){const o=n.length;r=new Array(o);for(let u=0;u!==o;++u)r[u]=n[u].clone()}return this.clippingPlanes=r,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}}class GS extends uf{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ie(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new ns,this.combine=RS,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const dn=new rt,Mc=new we;let m1=0;class ji{constructor(t,n,r=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:m1++}),this.name="",this.array=t,this.itemSize=n,this.count=t!==void 0?t.length/n:0,this.normalized=r,this.usage=ry,this.updateRanges=[],this.gpuType=Bi,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,n){this.updateRanges.push({start:t,count:n})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,n,r){t*=this.itemSize,r*=n.itemSize;for(let o=0,u=this.itemSize;o<u;o++)this.array[t+o]=n.array[r+o];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let n=0,r=this.count;n<r;n++)Mc.fromBufferAttribute(this,n),Mc.applyMatrix3(t),this.setXY(n,Mc.x,Mc.y);else if(this.itemSize===3)for(let n=0,r=this.count;n<r;n++)dn.fromBufferAttribute(this,n),dn.applyMatrix3(t),this.setXYZ(n,dn.x,dn.y,dn.z);return this}applyMatrix4(t){for(let n=0,r=this.count;n<r;n++)dn.fromBufferAttribute(this,n),dn.applyMatrix4(t),this.setXYZ(n,dn.x,dn.y,dn.z);return this}applyNormalMatrix(t){for(let n=0,r=this.count;n<r;n++)dn.fromBufferAttribute(this,n),dn.applyNormalMatrix(t),this.setXYZ(n,dn.x,dn.y,dn.z);return this}transformDirection(t){for(let n=0,r=this.count;n<r;n++)dn.fromBufferAttribute(this,n),dn.transformDirection(t),this.setXYZ(n,dn.x,dn.y,dn.z);return this}set(t,n=0){return this.array.set(t,n),this}getComponent(t,n){let r=this.array[t*this.itemSize+n];return this.normalized&&(r=vl(r,this.array)),r}setComponent(t,n,r){return this.normalized&&(r=Kn(r,this.array)),this.array[t*this.itemSize+n]=r,this}getX(t){let n=this.array[t*this.itemSize];return this.normalized&&(n=vl(n,this.array)),n}setX(t,n){return this.normalized&&(n=Kn(n,this.array)),this.array[t*this.itemSize]=n,this}getY(t){let n=this.array[t*this.itemSize+1];return this.normalized&&(n=vl(n,this.array)),n}setY(t,n){return this.normalized&&(n=Kn(n,this.array)),this.array[t*this.itemSize+1]=n,this}getZ(t){let n=this.array[t*this.itemSize+2];return this.normalized&&(n=vl(n,this.array)),n}setZ(t,n){return this.normalized&&(n=Kn(n,this.array)),this.array[t*this.itemSize+2]=n,this}getW(t){let n=this.array[t*this.itemSize+3];return this.normalized&&(n=vl(n,this.array)),n}setW(t,n){return this.normalized&&(n=Kn(n,this.array)),this.array[t*this.itemSize+3]=n,this}setXY(t,n,r){return t*=this.itemSize,this.normalized&&(n=Kn(n,this.array),r=Kn(r,this.array)),this.array[t+0]=n,this.array[t+1]=r,this}setXYZ(t,n,r,o){return t*=this.itemSize,this.normalized&&(n=Kn(n,this.array),r=Kn(r,this.array),o=Kn(o,this.array)),this.array[t+0]=n,this.array[t+1]=r,this.array[t+2]=o,this}setXYZW(t,n,r,o,u){return t*=this.itemSize,this.normalized&&(n=Kn(n,this.array),r=Kn(r,this.array),o=Kn(o,this.array),u=Kn(u,this.array)),this.array[t+0]=n,this.array[t+1]=r,this.array[t+2]=o,this.array[t+3]=u,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==ry&&(t.usage=this.usage),t}}class kS extends ji{constructor(t,n,r){super(new Uint16Array(t),n,r)}}class XS extends ji{constructor(t,n,r){super(new Uint32Array(t),n,r)}}class $r extends ji{constructor(t,n,r){super(new Float32Array(t),n,r)}}let g1=0;const _i=new yn,Id=new Mi,Ks=new rt,li=new jl,Sl=new jl,An=new rt;class is extends go{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:g1++}),this.uuid=ql(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(IS(t)?XS:kS)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,n){return this.attributes[t]=n,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,n,r=0){this.groups.push({start:t,count:n,materialIndex:r})}clearGroups(){this.groups=[]}setDrawRange(t,n){this.drawRange.start=t,this.drawRange.count=n}applyMatrix4(t){const n=this.attributes.position;n!==void 0&&(n.applyMatrix4(t),n.needsUpdate=!0);const r=this.attributes.normal;if(r!==void 0){const u=new fe().getNormalMatrix(t);r.applyNormalMatrix(u),r.needsUpdate=!0}const o=this.attributes.tangent;return o!==void 0&&(o.transformDirection(t),o.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return _i.makeRotationFromQuaternion(t),this.applyMatrix4(_i),this}rotateX(t){return _i.makeRotationX(t),this.applyMatrix4(_i),this}rotateY(t){return _i.makeRotationY(t),this.applyMatrix4(_i),this}rotateZ(t){return _i.makeRotationZ(t),this.applyMatrix4(_i),this}translate(t,n,r){return _i.makeTranslation(t,n,r),this.applyMatrix4(_i),this}scale(t,n,r){return _i.makeScale(t,n,r),this.applyMatrix4(_i),this}lookAt(t){return Id.lookAt(t),Id.updateMatrix(),this.applyMatrix4(Id.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Ks).negate(),this.translate(Ks.x,Ks.y,Ks.z),this}setFromPoints(t){const n=this.getAttribute("position");if(n===void 0){const r=[];for(let o=0,u=t.length;o<u;o++){const c=t[o];r.push(c.x,c.y,c.z||0)}this.setAttribute("position",new $r(r,3))}else{const r=Math.min(t.length,n.count);for(let o=0;o<r;o++){const u=t[o];n.setXYZ(o,u.x,u.y,u.z||0)}t.length>n.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),n.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new jl);const t=this.attributes.position,n=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new rt(-1/0,-1/0,-1/0),new rt(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),n)for(let r=0,o=n.length;r<o;r++){const u=n[r];li.setFromBufferAttribute(u),this.morphTargetsRelative?(An.addVectors(this.boundingBox.min,li.min),this.boundingBox.expandByPoint(An),An.addVectors(this.boundingBox.max,li.max),this.boundingBox.expandByPoint(An)):(this.boundingBox.expandByPoint(li.min),this.boundingBox.expandByPoint(li.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Hm);const t=this.attributes.position,n=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new rt,1/0);return}if(t){const r=this.boundingSphere.center;if(li.setFromBufferAttribute(t),n)for(let u=0,c=n.length;u<c;u++){const f=n[u];Sl.setFromBufferAttribute(f),this.morphTargetsRelative?(An.addVectors(li.min,Sl.min),li.expandByPoint(An),An.addVectors(li.max,Sl.max),li.expandByPoint(An)):(li.expandByPoint(Sl.min),li.expandByPoint(Sl.max))}li.getCenter(r);let o=0;for(let u=0,c=t.count;u<c;u++)An.fromBufferAttribute(t,u),o=Math.max(o,r.distanceToSquared(An));if(n)for(let u=0,c=n.length;u<c;u++){const f=n[u],p=this.morphTargetsRelative;for(let d=0,m=f.count;d<m;d++)An.fromBufferAttribute(f,d),p&&(Ks.fromBufferAttribute(t,d),An.add(Ks)),o=Math.max(o,r.distanceToSquared(An))}this.boundingSphere.radius=Math.sqrt(o),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,n=this.attributes;if(t===null||n.position===void 0||n.normal===void 0||n.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const r=n.position,o=n.normal,u=n.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new ji(new Float32Array(4*r.count),4));const c=this.getAttribute("tangent"),f=[],p=[];for(let H=0;H<r.count;H++)f[H]=new rt,p[H]=new rt;const d=new rt,m=new rt,v=new rt,_=new we,x=new we,E=new we,T=new rt,S=new rt;function y(H,U,L){d.fromBufferAttribute(r,H),m.fromBufferAttribute(r,U),v.fromBufferAttribute(r,L),_.fromBufferAttribute(u,H),x.fromBufferAttribute(u,U),E.fromBufferAttribute(u,L),m.sub(d),v.sub(d),x.sub(_),E.sub(_);const G=1/(x.x*E.y-E.x*x.y);isFinite(G)&&(T.copy(m).multiplyScalar(E.y).addScaledVector(v,-x.y).multiplyScalar(G),S.copy(v).multiplyScalar(x.x).addScaledVector(m,-E.x).multiplyScalar(G),f[H].add(T),f[U].add(T),f[L].add(T),p[H].add(S),p[U].add(S),p[L].add(S))}let w=this.groups;w.length===0&&(w=[{start:0,count:t.count}]);for(let H=0,U=w.length;H<U;++H){const L=w[H],G=L.start,nt=L.count;for(let ct=G,pt=G+nt;ct<pt;ct+=3)y(t.getX(ct+0),t.getX(ct+1),t.getX(ct+2))}const C=new rt,D=new rt,N=new rt,F=new rt;function z(H){N.fromBufferAttribute(o,H),F.copy(N);const U=f[H];C.copy(U),C.sub(N.multiplyScalar(N.dot(U))).normalize(),D.crossVectors(F,U);const G=D.dot(p[H])<0?-1:1;c.setXYZW(H,C.x,C.y,C.z,G)}for(let H=0,U=w.length;H<U;++H){const L=w[H],G=L.start,nt=L.count;for(let ct=G,pt=G+nt;ct<pt;ct+=3)z(t.getX(ct+0)),z(t.getX(ct+1)),z(t.getX(ct+2))}}computeVertexNormals(){const t=this.index,n=this.getAttribute("position");if(n!==void 0){let r=this.getAttribute("normal");if(r===void 0)r=new ji(new Float32Array(n.count*3),3),this.setAttribute("normal",r);else for(let _=0,x=r.count;_<x;_++)r.setXYZ(_,0,0,0);const o=new rt,u=new rt,c=new rt,f=new rt,p=new rt,d=new rt,m=new rt,v=new rt;if(t)for(let _=0,x=t.count;_<x;_+=3){const E=t.getX(_+0),T=t.getX(_+1),S=t.getX(_+2);o.fromBufferAttribute(n,E),u.fromBufferAttribute(n,T),c.fromBufferAttribute(n,S),m.subVectors(c,u),v.subVectors(o,u),m.cross(v),f.fromBufferAttribute(r,E),p.fromBufferAttribute(r,T),d.fromBufferAttribute(r,S),f.add(m),p.add(m),d.add(m),r.setXYZ(E,f.x,f.y,f.z),r.setXYZ(T,p.x,p.y,p.z),r.setXYZ(S,d.x,d.y,d.z)}else for(let _=0,x=n.count;_<x;_+=3)o.fromBufferAttribute(n,_+0),u.fromBufferAttribute(n,_+1),c.fromBufferAttribute(n,_+2),m.subVectors(c,u),v.subVectors(o,u),m.cross(v),r.setXYZ(_+0,m.x,m.y,m.z),r.setXYZ(_+1,m.x,m.y,m.z),r.setXYZ(_+2,m.x,m.y,m.z);this.normalizeNormals(),r.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let n=0,r=t.count;n<r;n++)An.fromBufferAttribute(t,n),An.normalize(),t.setXYZ(n,An.x,An.y,An.z)}toNonIndexed(){function t(f,p){const d=f.array,m=f.itemSize,v=f.normalized,_=new d.constructor(p.length*m);let x=0,E=0;for(let T=0,S=p.length;T<S;T++){f.isInterleavedBufferAttribute?x=p[T]*f.data.stride+f.offset:x=p[T]*m;for(let y=0;y<m;y++)_[E++]=d[x++]}return new ji(_,m,v)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const n=new is,r=this.index.array,o=this.attributes;for(const f in o){const p=o[f],d=t(p,r);n.setAttribute(f,d)}const u=this.morphAttributes;for(const f in u){const p=[],d=u[f];for(let m=0,v=d.length;m<v;m++){const _=d[m],x=t(_,r);p.push(x)}n.morphAttributes[f]=p}n.morphTargetsRelative=this.morphTargetsRelative;const c=this.groups;for(let f=0,p=c.length;f<p;f++){const d=c[f];n.addGroup(d.start,d.count,d.materialIndex)}return n}toJSON(){const t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const p=this.parameters;for(const d in p)p[d]!==void 0&&(t[d]=p[d]);return t}t.data={attributes:{}};const n=this.index;n!==null&&(t.data.index={type:n.array.constructor.name,array:Array.prototype.slice.call(n.array)});const r=this.attributes;for(const p in r){const d=r[p];t.data.attributes[p]=d.toJSON(t.data)}const o={};let u=!1;for(const p in this.morphAttributes){const d=this.morphAttributes[p],m=[];for(let v=0,_=d.length;v<_;v++){const x=d[v];m.push(x.toJSON(t.data))}m.length>0&&(o[p]=m,u=!0)}u&&(t.data.morphAttributes=o,t.data.morphTargetsRelative=this.morphTargetsRelative);const c=this.groups;c.length>0&&(t.data.groups=JSON.parse(JSON.stringify(c)));const f=this.boundingSphere;return f!==null&&(t.data.boundingSphere=f.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const n={};this.name=t.name;const r=t.index;r!==null&&this.setIndex(r.clone());const o=t.attributes;for(const d in o){const m=o[d];this.setAttribute(d,m.clone(n))}const u=t.morphAttributes;for(const d in u){const m=[],v=u[d];for(let _=0,x=v.length;_<x;_++)m.push(v[_].clone(n));this.morphAttributes[d]=m}this.morphTargetsRelative=t.morphTargetsRelative;const c=t.groups;for(let d=0,m=c.length;d<m;d++){const v=c[d];this.addGroup(v.start,v.count,v.materialIndex)}const f=t.boundingBox;f!==null&&(this.boundingBox=f.clone());const p=t.boundingSphere;return p!==null&&(this.boundingSphere=p.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const yy=new yn,Fr=new o1,Ec=new Hm,xy=new rt,Tc=new rt,bc=new rt,Ac=new rt,zd=new rt,Rc=new rt,Sy=new rt,Cc=new rt;class Fi extends Mi{constructor(t=new is,n=new GS){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=n,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,n){return super.copy(t,n),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const n=this.geometry.morphAttributes,r=Object.keys(n);if(r.length>0){const o=n[r[0]];if(o!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let u=0,c=o.length;u<c;u++){const f=o[u].name||String(u);this.morphTargetInfluences.push(0),this.morphTargetDictionary[f]=u}}}}getVertexPosition(t,n){const r=this.geometry,o=r.attributes.position,u=r.morphAttributes.position,c=r.morphTargetsRelative;n.fromBufferAttribute(o,t);const f=this.morphTargetInfluences;if(u&&f){Rc.set(0,0,0);for(let p=0,d=u.length;p<d;p++){const m=f[p],v=u[p];m!==0&&(zd.fromBufferAttribute(v,t),c?Rc.addScaledVector(zd,m):Rc.addScaledVector(zd.sub(n),m))}n.add(Rc)}return n}raycast(t,n){const r=this.geometry,o=this.material,u=this.matrixWorld;o!==void 0&&(r.boundingSphere===null&&r.computeBoundingSphere(),Ec.copy(r.boundingSphere),Ec.applyMatrix4(u),Fr.copy(t.ray).recast(t.near),!(Ec.containsPoint(Fr.origin)===!1&&(Fr.intersectSphere(Ec,xy)===null||Fr.origin.distanceToSquared(xy)>(t.far-t.near)**2))&&(yy.copy(u).invert(),Fr.copy(t.ray).applyMatrix4(yy),!(r.boundingBox!==null&&Fr.intersectsBox(r.boundingBox)===!1)&&this._computeIntersections(t,n,Fr)))}_computeIntersections(t,n,r){let o;const u=this.geometry,c=this.material,f=u.index,p=u.attributes.position,d=u.attributes.uv,m=u.attributes.uv1,v=u.attributes.normal,_=u.groups,x=u.drawRange;if(f!==null)if(Array.isArray(c))for(let E=0,T=_.length;E<T;E++){const S=_[E],y=c[S.materialIndex],w=Math.max(S.start,x.start),C=Math.min(f.count,Math.min(S.start+S.count,x.start+x.count));for(let D=w,N=C;D<N;D+=3){const F=f.getX(D),z=f.getX(D+1),H=f.getX(D+2);o=wc(this,y,t,r,d,m,v,F,z,H),o&&(o.faceIndex=Math.floor(D/3),o.face.materialIndex=S.materialIndex,n.push(o))}}else{const E=Math.max(0,x.start),T=Math.min(f.count,x.start+x.count);for(let S=E,y=T;S<y;S+=3){const w=f.getX(S),C=f.getX(S+1),D=f.getX(S+2);o=wc(this,c,t,r,d,m,v,w,C,D),o&&(o.faceIndex=Math.floor(S/3),n.push(o))}}else if(p!==void 0)if(Array.isArray(c))for(let E=0,T=_.length;E<T;E++){const S=_[E],y=c[S.materialIndex],w=Math.max(S.start,x.start),C=Math.min(p.count,Math.min(S.start+S.count,x.start+x.count));for(let D=w,N=C;D<N;D+=3){const F=D,z=D+1,H=D+2;o=wc(this,y,t,r,d,m,v,F,z,H),o&&(o.faceIndex=Math.floor(D/3),o.face.materialIndex=S.materialIndex,n.push(o))}}else{const E=Math.max(0,x.start),T=Math.min(p.count,x.start+x.count);for(let S=E,y=T;S<y;S+=3){const w=S,C=S+1,D=S+2;o=wc(this,c,t,r,d,m,v,w,C,D),o&&(o.faceIndex=Math.floor(S/3),n.push(o))}}}}function v1(i,t,n,r,o,u,c,f){let p;if(t.side===$n?p=r.intersectTriangle(c,u,o,!0,f):p=r.intersectTriangle(o,u,c,t.side===pr,f),p===null)return null;Cc.copy(f),Cc.applyMatrix4(i.matrixWorld);const d=n.ray.origin.distanceTo(Cc);return d<n.near||d>n.far?null:{distance:d,point:Cc.clone(),object:i}}function wc(i,t,n,r,o,u,c,f,p,d){i.getVertexPosition(f,Tc),i.getVertexPosition(p,bc),i.getVertexPosition(d,Ac);const m=v1(i,t,n,r,Tc,bc,Ac,Sy);if(m){const v=new rt;Oi.getBarycoord(Sy,Tc,bc,Ac,v),o&&(m.uv=Oi.getInterpolatedAttribute(o,f,p,d,v,new we)),u&&(m.uv1=Oi.getInterpolatedAttribute(u,f,p,d,v,new we)),c&&(m.normal=Oi.getInterpolatedAttribute(c,f,p,d,v,new rt),m.normal.dot(r.direction)>0&&m.normal.multiplyScalar(-1));const _={a:f,b:p,c:d,normal:new rt,materialIndex:0};Oi.getNormal(Tc,bc,Ac,_.normal),m.face=_,m.barycoord=v}return m}class Kl extends is{constructor(t=1,n=1,r=1,o=1,u=1,c=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:n,depth:r,widthSegments:o,heightSegments:u,depthSegments:c};const f=this;o=Math.floor(o),u=Math.floor(u),c=Math.floor(c);const p=[],d=[],m=[],v=[];let _=0,x=0;E("z","y","x",-1,-1,r,n,t,c,u,0),E("z","y","x",1,-1,r,n,-t,c,u,1),E("x","z","y",1,1,t,r,n,o,c,2),E("x","z","y",1,-1,t,r,-n,o,c,3),E("x","y","z",1,-1,t,n,r,o,u,4),E("x","y","z",-1,-1,t,n,-r,o,u,5),this.setIndex(p),this.setAttribute("position",new $r(d,3)),this.setAttribute("normal",new $r(m,3)),this.setAttribute("uv",new $r(v,2));function E(T,S,y,w,C,D,N,F,z,H,U){const L=D/z,G=N/H,nt=D/2,ct=N/2,pt=F/2,ut=z+1,I=H+1;let q=0,W=0;const yt=new rt;for(let P=0;P<I;P++){const J=P*G-ct;for(let xt=0;xt<ut;xt++){const St=xt*L-nt;yt[T]=St*w,yt[S]=J*C,yt[y]=pt,d.push(yt.x,yt.y,yt.z),yt[T]=0,yt[S]=0,yt[y]=F>0?1:-1,m.push(yt.x,yt.y,yt.z),v.push(xt/z),v.push(1-P/H),q+=1}}for(let P=0;P<H;P++)for(let J=0;J<z;J++){const xt=_+J+ut*P,St=_+J+ut*(P+1),Ut=_+(J+1)+ut*(P+1),Vt=_+(J+1)+ut*P;p.push(xt,St,Vt),p.push(St,Ut,Vt),W+=6}f.addGroup(x,W,U),x+=W,_+=q}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Kl(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function ho(i){const t={};for(const n in i){t[n]={};for(const r in i[n]){const o=i[n][r];o&&(o.isColor||o.isMatrix3||o.isMatrix4||o.isVector2||o.isVector3||o.isVector4||o.isTexture||o.isQuaternion)?o.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[n][r]=null):t[n][r]=o.clone():Array.isArray(o)?t[n][r]=o.slice():t[n][r]=o}}return t}function Gn(i){const t={};for(let n=0;n<i.length;n++){const r=ho(i[n]);for(const o in r)t[o]=r[o]}return t}function _1(i){const t=[];for(let n=0;n<i.length;n++)t.push(i[n].clone());return t}function WS(i){const t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Ae.workingColorSpace}const y1={clone:ho,merge:Gn};var x1=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,S1=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class $i extends uf{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=x1,this.fragmentShader=S1,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=ho(t.uniforms),this.uniformsGroups=_1(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const n=super.toJSON(t);n.glslVersion=this.glslVersion,n.uniforms={};for(const o in this.uniforms){const c=this.uniforms[o].value;c&&c.isTexture?n.uniforms[o]={type:"t",value:c.toJSON(t).uuid}:c&&c.isColor?n.uniforms[o]={type:"c",value:c.getHex()}:c&&c.isVector2?n.uniforms[o]={type:"v2",value:c.toArray()}:c&&c.isVector3?n.uniforms[o]={type:"v3",value:c.toArray()}:c&&c.isVector4?n.uniforms[o]={type:"v4",value:c.toArray()}:c&&c.isMatrix3?n.uniforms[o]={type:"m3",value:c.toArray()}:c&&c.isMatrix4?n.uniforms[o]={type:"m4",value:c.toArray()}:n.uniforms[o]={value:c}}Object.keys(this.defines).length>0&&(n.defines=this.defines),n.vertexShader=this.vertexShader,n.fragmentShader=this.fragmentShader,n.lights=this.lights,n.clipping=this.clipping;const r={};for(const o in this.extensions)this.extensions[o]===!0&&(r[o]=!0);return Object.keys(r).length>0&&(n.extensions=r),n}}class qS extends Mi{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new yn,this.projectionMatrix=new yn,this.projectionMatrixInverse=new yn,this.coordinateSystem=Yi,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,n){return super.copy(t,n),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,n){super.updateWorldMatrix(t,n),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const or=new rt,My=new we,Ey=new we;class Ni extends qS{constructor(t=50,n=1,r=.1,o=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=r,this.far=o,this.focus=10,this.aspect=n,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,n){return super.copy(t,n),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const n=.5*this.getFilmHeight()/t;this.fov=om*2*Math.atan(n),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(_d*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return om*2*Math.atan(Math.tan(_d*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,n,r){or.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(or.x,or.y).multiplyScalar(-t/or.z),or.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),r.set(or.x,or.y).multiplyScalar(-t/or.z)}getViewSize(t,n){return this.getViewBounds(t,My,Ey),n.subVectors(Ey,My)}setViewOffset(t,n,r,o,u,c){this.aspect=t/n,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=n,this.view.offsetX=r,this.view.offsetY=o,this.view.width=u,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let n=t*Math.tan(_d*.5*this.fov)/this.zoom,r=2*n,o=this.aspect*r,u=-.5*o;const c=this.view;if(this.view!==null&&this.view.enabled){const p=c.fullWidth,d=c.fullHeight;u+=c.offsetX*o/p,n-=c.offsetY*r/d,o*=c.width/p,r*=c.height/d}const f=this.filmOffset;f!==0&&(u+=t*f/this.getFilmWidth()),this.projectionMatrix.makePerspective(u,u+o,n,n-r,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const n=super.toJSON(t);return n.object.fov=this.fov,n.object.zoom=this.zoom,n.object.near=this.near,n.object.far=this.far,n.object.focus=this.focus,n.object.aspect=this.aspect,this.view!==null&&(n.object.view=Object.assign({},this.view)),n.object.filmGauge=this.filmGauge,n.object.filmOffset=this.filmOffset,n}}const Zs=-90,Qs=1;class M1 extends Mi{constructor(t,n,r){super(),this.type="CubeCamera",this.renderTarget=r,this.coordinateSystem=null,this.activeMipmapLevel=0;const o=new Ni(Zs,Qs,t,n);o.layers=this.layers,this.add(o);const u=new Ni(Zs,Qs,t,n);u.layers=this.layers,this.add(u);const c=new Ni(Zs,Qs,t,n);c.layers=this.layers,this.add(c);const f=new Ni(Zs,Qs,t,n);f.layers=this.layers,this.add(f);const p=new Ni(Zs,Qs,t,n);p.layers=this.layers,this.add(p);const d=new Ni(Zs,Qs,t,n);d.layers=this.layers,this.add(d)}updateCoordinateSystem(){const t=this.coordinateSystem,n=this.children.concat(),[r,o,u,c,f,p]=n;for(const d of n)this.remove(d);if(t===Yi)r.up.set(0,1,0),r.lookAt(1,0,0),o.up.set(0,1,0),o.lookAt(-1,0,0),u.up.set(0,0,-1),u.lookAt(0,1,0),c.up.set(0,0,1),c.lookAt(0,-1,0),f.up.set(0,1,0),f.lookAt(0,0,1),p.up.set(0,1,0),p.lookAt(0,0,-1);else if(t===Jc)r.up.set(0,-1,0),r.lookAt(-1,0,0),o.up.set(0,-1,0),o.lookAt(1,0,0),u.up.set(0,0,1),u.lookAt(0,1,0),c.up.set(0,0,-1),c.lookAt(0,-1,0),f.up.set(0,-1,0),f.lookAt(0,0,1),p.up.set(0,-1,0),p.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const d of n)this.add(d),d.updateMatrixWorld()}update(t,n){this.parent===null&&this.updateMatrixWorld();const{renderTarget:r,activeMipmapLevel:o}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[u,c,f,p,d,m]=this.children,v=t.getRenderTarget(),_=t.getActiveCubeFace(),x=t.getActiveMipmapLevel(),E=t.xr.enabled;t.xr.enabled=!1;const T=r.texture.generateMipmaps;r.texture.generateMipmaps=!1,t.setRenderTarget(r,0,o),t.render(n,u),t.setRenderTarget(r,1,o),t.render(n,c),t.setRenderTarget(r,2,o),t.render(n,f),t.setRenderTarget(r,3,o),t.render(n,p),t.setRenderTarget(r,4,o),t.render(n,d),r.texture.generateMipmaps=T,t.setRenderTarget(r,5,o),t.render(n,m),t.setRenderTarget(v,_,x),t.xr.enabled=E,r.texture.needsPMREMUpdate=!0}}class YS extends Jn{constructor(t=[],n=uo,r,o,u,c,f,p,d,m){super(t,n,r,o,u,c,f,p,d,m),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class E1 extends Aa{constructor(t=1,n={}){super(t,t,n),this.isWebGLCubeRenderTarget=!0;const r={width:t,height:t,depth:1},o=[r,r,r,r,r,r];this.texture=new YS(o),this._setTextureOptions(n),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,n){this.texture.type=n.type,this.texture.colorSpace=n.colorSpace,this.texture.generateMipmaps=n.generateMipmaps,this.texture.minFilter=n.minFilter,this.texture.magFilter=n.magFilter;const r={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},o=new Kl(5,5,5),u=new $i({name:"CubemapFromEquirect",uniforms:ho(r.uniforms),vertexShader:r.vertexShader,fragmentShader:r.fragmentShader,side:$n,blending:fr});u.uniforms.tEquirect.value=n;const c=new Fi(o,u),f=n.minFilter;return n.minFilter===jr&&(n.minFilter=Zn),new M1(1,10,this).update(t,c),n.minFilter=f,c.geometry.dispose(),c.material.dispose(),this}clear(t,n=!0,r=!0,o=!0){const u=t.getRenderTarget();for(let c=0;c<6;c++)t.setRenderTarget(this,c),t.clear(n,r,o);t.setRenderTarget(u)}}class Dc extends Mi{constructor(){super(),this.isGroup=!0,this.type="Group"}}const T1={type:"move"};class Vd{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Dc,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Dc,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new rt,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new rt),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Dc,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new rt,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new rt),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const n=this._hand;if(n)for(const r of t.hand.values())this._getHandJoint(n,r)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,n,r){let o=null,u=null,c=null;const f=this._targetRay,p=this._grip,d=this._hand;if(t&&n.session.visibilityState!=="visible-blurred"){if(d&&t.hand){c=!0;for(const T of t.hand.values()){const S=n.getJointPose(T,r),y=this._getHandJoint(d,T);S!==null&&(y.matrix.fromArray(S.transform.matrix),y.matrix.decompose(y.position,y.rotation,y.scale),y.matrixWorldNeedsUpdate=!0,y.jointRadius=S.radius),y.visible=S!==null}const m=d.joints["index-finger-tip"],v=d.joints["thumb-tip"],_=m.position.distanceTo(v.position),x=.02,E=.005;d.inputState.pinching&&_>x+E?(d.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!d.inputState.pinching&&_<=x-E&&(d.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else p!==null&&t.gripSpace&&(u=n.getPose(t.gripSpace,r),u!==null&&(p.matrix.fromArray(u.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,u.linearVelocity?(p.hasLinearVelocity=!0,p.linearVelocity.copy(u.linearVelocity)):p.hasLinearVelocity=!1,u.angularVelocity?(p.hasAngularVelocity=!0,p.angularVelocity.copy(u.angularVelocity)):p.hasAngularVelocity=!1));f!==null&&(o=n.getPose(t.targetRaySpace,r),o===null&&u!==null&&(o=u),o!==null&&(f.matrix.fromArray(o.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,o.linearVelocity?(f.hasLinearVelocity=!0,f.linearVelocity.copy(o.linearVelocity)):f.hasLinearVelocity=!1,o.angularVelocity?(f.hasAngularVelocity=!0,f.angularVelocity.copy(o.angularVelocity)):f.hasAngularVelocity=!1,this.dispatchEvent(T1)))}return f!==null&&(f.visible=o!==null),p!==null&&(p.visible=u!==null),d!==null&&(d.visible=c!==null),this}_getHandJoint(t,n){if(t.joints[n.jointName]===void 0){const r=new Dc;r.matrixAutoUpdate=!1,r.visible=!1,t.joints[n.jointName]=r,t.add(r)}return t.joints[n.jointName]}}const Hd=new rt,b1=new rt,A1=new fe;class Gr{constructor(t=new rt(1,0,0),n=0){this.isPlane=!0,this.normal=t,this.constant=n}set(t,n){return this.normal.copy(t),this.constant=n,this}setComponents(t,n,r,o){return this.normal.set(t,n,r),this.constant=o,this}setFromNormalAndCoplanarPoint(t,n){return this.normal.copy(t),this.constant=-n.dot(this.normal),this}setFromCoplanarPoints(t,n,r){const o=Hd.subVectors(r,n).cross(b1.subVectors(t,n)).normalize();return this.setFromNormalAndCoplanarPoint(o,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,n){return n.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,n){const r=t.delta(Hd),o=this.normal.dot(r);if(o===0)return this.distanceToPoint(t.start)===0?n.copy(t.start):null;const u=-(t.start.dot(this.normal)+this.constant)/o;return u<0||u>1?null:n.copy(t.start).addScaledVector(r,u)}intersectsLine(t){const n=this.distanceToPoint(t.start),r=this.distanceToPoint(t.end);return n<0&&r>0||r<0&&n>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,n){const r=n||A1.getNormalMatrix(t),o=this.coplanarPoint(Hd).applyMatrix4(t),u=this.normal.applyMatrix3(r).normalize();return this.constant=-o.dot(u),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Ir=new Hm,R1=new we(.5,.5),Uc=new rt;class jS{constructor(t=new Gr,n=new Gr,r=new Gr,o=new Gr,u=new Gr,c=new Gr){this.planes=[t,n,r,o,u,c]}set(t,n,r,o,u,c){const f=this.planes;return f[0].copy(t),f[1].copy(n),f[2].copy(r),f[3].copy(o),f[4].copy(u),f[5].copy(c),this}copy(t){const n=this.planes;for(let r=0;r<6;r++)n[r].copy(t.planes[r]);return this}setFromProjectionMatrix(t,n=Yi,r=!1){const o=this.planes,u=t.elements,c=u[0],f=u[1],p=u[2],d=u[3],m=u[4],v=u[5],_=u[6],x=u[7],E=u[8],T=u[9],S=u[10],y=u[11],w=u[12],C=u[13],D=u[14],N=u[15];if(o[0].setComponents(d-c,x-m,y-E,N-w).normalize(),o[1].setComponents(d+c,x+m,y+E,N+w).normalize(),o[2].setComponents(d+f,x+v,y+T,N+C).normalize(),o[3].setComponents(d-f,x-v,y-T,N-C).normalize(),r)o[4].setComponents(p,_,S,D).normalize(),o[5].setComponents(d-p,x-_,y-S,N-D).normalize();else if(o[4].setComponents(d-p,x-_,y-S,N-D).normalize(),n===Yi)o[5].setComponents(d+p,x+_,y+S,N+D).normalize();else if(n===Jc)o[5].setComponents(p,_,S,D).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+n);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Ir.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const n=t.geometry;n.boundingSphere===null&&n.computeBoundingSphere(),Ir.copy(n.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Ir)}intersectsSprite(t){Ir.center.set(0,0,0);const n=R1.distanceTo(t.center);return Ir.radius=.7071067811865476+n,Ir.applyMatrix4(t.matrixWorld),this.intersectsSphere(Ir)}intersectsSphere(t){const n=this.planes,r=t.center,o=-t.radius;for(let u=0;u<6;u++)if(n[u].distanceToPoint(r)<o)return!1;return!0}intersectsBox(t){const n=this.planes;for(let r=0;r<6;r++){const o=n[r];if(Uc.x=o.normal.x>0?t.max.x:t.min.x,Uc.y=o.normal.y>0?t.max.y:t.min.y,Uc.z=o.normal.z>0?t.max.z:t.min.z,o.distanceToPoint(Uc)<0)return!1}return!0}containsPoint(t){const n=this.planes;for(let r=0;r<6;r++)if(n[r].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class KS extends Jn{constructor(t,n,r=es,o,u,c,f=Ii,p=Ii,d,m=Ol,v=1){if(m!==Ol&&m!==Bl)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const _={width:t,height:n,depth:v};super(_,o,u,c,f,p,m,r,d),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Vm(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){const n=super.toJSON(t);return this.compareFunction!==null&&(n.compareFunction=this.compareFunction),n}}class ZS extends Jn{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}}class Zl extends is{constructor(t=1,n=1,r=1,o=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:n,widthSegments:r,heightSegments:o};const u=t/2,c=n/2,f=Math.floor(r),p=Math.floor(o),d=f+1,m=p+1,v=t/f,_=n/p,x=[],E=[],T=[],S=[];for(let y=0;y<m;y++){const w=y*_-c;for(let C=0;C<d;C++){const D=C*v-u;E.push(D,-w,0),T.push(0,0,1),S.push(C/f),S.push(1-y/p)}}for(let y=0;y<p;y++)for(let w=0;w<f;w++){const C=w+d*y,D=w+d*(y+1),N=w+1+d*(y+1),F=w+1+d*y;x.push(C,D,F),x.push(D,N,F)}this.setIndex(x),this.setAttribute("position",new $r(E,3)),this.setAttribute("normal",new $r(T,3)),this.setAttribute("uv",new $r(S,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Zl(t.width,t.height,t.widthSegments,t.heightSegments)}}class C1 extends uf{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=VA,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class w1 extends uf{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}class QS extends qS{constructor(t=-1,n=1,r=1,o=-1,u=.1,c=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=n,this.top=r,this.bottom=o,this.near=u,this.far=c,this.updateProjectionMatrix()}copy(t,n){return super.copy(t,n),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,n,r,o,u,c){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=n,this.view.offsetX=r,this.view.offsetY=o,this.view.width=u,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),n=(this.top-this.bottom)/(2*this.zoom),r=(this.right+this.left)/2,o=(this.top+this.bottom)/2;let u=r-t,c=r+t,f=o+n,p=o-n;if(this.view!==null&&this.view.enabled){const d=(this.right-this.left)/this.view.fullWidth/this.zoom,m=(this.top-this.bottom)/this.view.fullHeight/this.zoom;u+=d*this.view.offsetX,c=u+d*this.view.width,f-=m*this.view.offsetY,p=f-m*this.view.height}this.projectionMatrix.makeOrthographic(u,c,f,p,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const n=super.toJSON(t);return n.object.zoom=this.zoom,n.object.left=this.left,n.object.right=this.right,n.object.top=this.top,n.object.bottom=this.bottom,n.object.near=this.near,n.object.far=this.far,this.view!==null&&(n.object.view=Object.assign({},this.view)),n}}class D1 extends Ni{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}}function Ty(i,t,n,r){const o=U1(r);switch(n){case PS:return i*t;case OS:return i*t/o.components*o.byteLength;case Fm:return i*t/o.components*o.byteLength;case BS:return i*t*2/o.components*o.byteLength;case Im:return i*t*2/o.components*o.byteLength;case NS:return i*t*3/o.components*o.byteLength;case ci:return i*t*4/o.components*o.byteLength;case zm:return i*t*4/o.components*o.byteLength;case Vc:case Hc:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Gc:case kc:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Np:case Bp:return Math.max(i,16)*Math.max(t,8)/4;case Pp:case Op:return Math.max(i,8)*Math.max(t,8)/2;case Fp:case Ip:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case zp:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Vp:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Hp:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case Gp:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case kp:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case Xp:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case Wp:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case qp:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case Yp:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case jp:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case Kp:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case Zp:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case Qp:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case $p:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case Jp:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case tm:case em:case nm:return Math.ceil(i/4)*Math.ceil(t/4)*16;case im:case am:return Math.ceil(i/4)*Math.ceil(t/4)*8;case rm:case sm:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${n} format.`)}function U1(i){switch(i){case ba:case wS:return{byteLength:1,components:1};case Pl:case DS:case Wl:return{byteLength:2,components:1};case Om:case Bm:return{byteLength:2,components:4};case es:case Nm:case Bi:return{byteLength:4,components:1};case US:case LS:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Pm}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Pm);/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function $S(){let i=null,t=!1,n=null,r=null;function o(u,c){n(u,c),r=i.requestAnimationFrame(o)}return{start:function(){t!==!0&&n!==null&&(r=i.requestAnimationFrame(o),t=!0)},stop:function(){i.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(u){n=u},setContext:function(u){i=u}}}function L1(i){const t=new WeakMap;function n(f,p){const d=f.array,m=f.usage,v=d.byteLength,_=i.createBuffer();i.bindBuffer(p,_),i.bufferData(p,d,m),f.onUploadCallback();let x;if(d instanceof Float32Array)x=i.FLOAT;else if(typeof Float16Array<"u"&&d instanceof Float16Array)x=i.HALF_FLOAT;else if(d instanceof Uint16Array)f.isFloat16BufferAttribute?x=i.HALF_FLOAT:x=i.UNSIGNED_SHORT;else if(d instanceof Int16Array)x=i.SHORT;else if(d instanceof Uint32Array)x=i.UNSIGNED_INT;else if(d instanceof Int32Array)x=i.INT;else if(d instanceof Int8Array)x=i.BYTE;else if(d instanceof Uint8Array)x=i.UNSIGNED_BYTE;else if(d instanceof Uint8ClampedArray)x=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+d);return{buffer:_,type:x,bytesPerElement:d.BYTES_PER_ELEMENT,version:f.version,size:v}}function r(f,p,d){const m=p.array,v=p.updateRanges;if(i.bindBuffer(d,f),v.length===0)i.bufferSubData(d,0,m);else{v.sort((x,E)=>x.start-E.start);let _=0;for(let x=1;x<v.length;x++){const E=v[_],T=v[x];T.start<=E.start+E.count+1?E.count=Math.max(E.count,T.start+T.count-E.start):(++_,v[_]=T)}v.length=_+1;for(let x=0,E=v.length;x<E;x++){const T=v[x];i.bufferSubData(d,T.start*m.BYTES_PER_ELEMENT,m,T.start,T.count)}p.clearUpdateRanges()}p.onUploadCallback()}function o(f){return f.isInterleavedBufferAttribute&&(f=f.data),t.get(f)}function u(f){f.isInterleavedBufferAttribute&&(f=f.data);const p=t.get(f);p&&(i.deleteBuffer(p.buffer),t.delete(f))}function c(f,p){if(f.isInterleavedBufferAttribute&&(f=f.data),f.isGLBufferAttribute){const m=t.get(f);(!m||m.version<f.version)&&t.set(f,{buffer:f.buffer,type:f.type,bytesPerElement:f.elementSize,version:f.version});return}const d=t.get(f);if(d===void 0)t.set(f,n(f,p));else if(d.version<f.version){if(d.size!==f.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");r(d.buffer,f,p),d.version=f.version}}return{get:o,remove:u,update:c}}var P1=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,N1=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,O1=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,B1=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,F1=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,I1=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,z1=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,V1=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,H1=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,G1=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,k1=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,X1=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,W1=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,q1=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Y1=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,j1=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,K1=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Z1=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Q1=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,$1=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,J1=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,tR=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,eR=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,nR=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,iR=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,aR=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,rR=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,sR=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,oR=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,lR=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,uR="gl_FragColor = linearToOutputTexel( gl_FragColor );",cR=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,fR=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,hR=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,dR=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,pR=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,mR=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,gR=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,vR=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,_R=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,yR=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,xR=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,SR=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,MR=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,ER=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,TR=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,bR=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,AR=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,RR=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,CR=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,wR=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,DR=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,UR=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,LR=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,PR=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,NR=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,OR=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,BR=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,FR=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,IR=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,zR=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,VR=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,HR=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,GR=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,kR=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,XR=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,WR=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,qR=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,YR=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,jR=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,KR=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,ZR=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,QR=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,$R=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,JR=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,tC=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,eC=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,nC=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,iC=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,aC=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,rC=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,sC=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,oC=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,lC=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,uC=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,cC=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,fC=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,hC=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,dC=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,pC=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,mC=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,gC=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,vC=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,_C=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,yC=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,xC=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,SC=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,MC=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,EC=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,TC=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,bC=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,AC=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,RC=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,CC=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,wC=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,DC=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,UC=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const LC=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,PC=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,NC=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,OC=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,BC=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,FC=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,IC=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,zC=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,VC=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,HC=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,GC=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,kC=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,XC=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,WC=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,qC=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,YC=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,jC=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,KC=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ZC=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,QC=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,$C=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,JC=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,tw=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,ew=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,nw=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,iw=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,aw=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,rw=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,sw=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,ow=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,lw=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,uw=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,cw=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,fw=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,pe={alphahash_fragment:P1,alphahash_pars_fragment:N1,alphamap_fragment:O1,alphamap_pars_fragment:B1,alphatest_fragment:F1,alphatest_pars_fragment:I1,aomap_fragment:z1,aomap_pars_fragment:V1,batching_pars_vertex:H1,batching_vertex:G1,begin_vertex:k1,beginnormal_vertex:X1,bsdfs:W1,iridescence_fragment:q1,bumpmap_pars_fragment:Y1,clipping_planes_fragment:j1,clipping_planes_pars_fragment:K1,clipping_planes_pars_vertex:Z1,clipping_planes_vertex:Q1,color_fragment:$1,color_pars_fragment:J1,color_pars_vertex:tR,color_vertex:eR,common:nR,cube_uv_reflection_fragment:iR,defaultnormal_vertex:aR,displacementmap_pars_vertex:rR,displacementmap_vertex:sR,emissivemap_fragment:oR,emissivemap_pars_fragment:lR,colorspace_fragment:uR,colorspace_pars_fragment:cR,envmap_fragment:fR,envmap_common_pars_fragment:hR,envmap_pars_fragment:dR,envmap_pars_vertex:pR,envmap_physical_pars_fragment:bR,envmap_vertex:mR,fog_vertex:gR,fog_pars_vertex:vR,fog_fragment:_R,fog_pars_fragment:yR,gradientmap_pars_fragment:xR,lightmap_pars_fragment:SR,lights_lambert_fragment:MR,lights_lambert_pars_fragment:ER,lights_pars_begin:TR,lights_toon_fragment:AR,lights_toon_pars_fragment:RR,lights_phong_fragment:CR,lights_phong_pars_fragment:wR,lights_physical_fragment:DR,lights_physical_pars_fragment:UR,lights_fragment_begin:LR,lights_fragment_maps:PR,lights_fragment_end:NR,logdepthbuf_fragment:OR,logdepthbuf_pars_fragment:BR,logdepthbuf_pars_vertex:FR,logdepthbuf_vertex:IR,map_fragment:zR,map_pars_fragment:VR,map_particle_fragment:HR,map_particle_pars_fragment:GR,metalnessmap_fragment:kR,metalnessmap_pars_fragment:XR,morphinstance_vertex:WR,morphcolor_vertex:qR,morphnormal_vertex:YR,morphtarget_pars_vertex:jR,morphtarget_vertex:KR,normal_fragment_begin:ZR,normal_fragment_maps:QR,normal_pars_fragment:$R,normal_pars_vertex:JR,normal_vertex:tC,normalmap_pars_fragment:eC,clearcoat_normal_fragment_begin:nC,clearcoat_normal_fragment_maps:iC,clearcoat_pars_fragment:aC,iridescence_pars_fragment:rC,opaque_fragment:sC,packing:oC,premultiplied_alpha_fragment:lC,project_vertex:uC,dithering_fragment:cC,dithering_pars_fragment:fC,roughnessmap_fragment:hC,roughnessmap_pars_fragment:dC,shadowmap_pars_fragment:pC,shadowmap_pars_vertex:mC,shadowmap_vertex:gC,shadowmask_pars_fragment:vC,skinbase_vertex:_C,skinning_pars_vertex:yC,skinning_vertex:xC,skinnormal_vertex:SC,specularmap_fragment:MC,specularmap_pars_fragment:EC,tonemapping_fragment:TC,tonemapping_pars_fragment:bC,transmission_fragment:AC,transmission_pars_fragment:RC,uv_pars_fragment:CC,uv_pars_vertex:wC,uv_vertex:DC,worldpos_vertex:UC,background_vert:LC,background_frag:PC,backgroundCube_vert:NC,backgroundCube_frag:OC,cube_vert:BC,cube_frag:FC,depth_vert:IC,depth_frag:zC,distanceRGBA_vert:VC,distanceRGBA_frag:HC,equirect_vert:GC,equirect_frag:kC,linedashed_vert:XC,linedashed_frag:WC,meshbasic_vert:qC,meshbasic_frag:YC,meshlambert_vert:jC,meshlambert_frag:KC,meshmatcap_vert:ZC,meshmatcap_frag:QC,meshnormal_vert:$C,meshnormal_frag:JC,meshphong_vert:tw,meshphong_frag:ew,meshphysical_vert:nw,meshphysical_frag:iw,meshtoon_vert:aw,meshtoon_frag:rw,points_vert:sw,points_frag:ow,shadow_vert:lw,shadow_frag:uw,sprite_vert:cw,sprite_frag:fw},Nt={common:{diffuse:{value:new Ie(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new fe},alphaMap:{value:null},alphaMapTransform:{value:new fe},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new fe}},envmap:{envMap:{value:null},envMapRotation:{value:new fe},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new fe}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new fe}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new fe},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new fe},normalScale:{value:new we(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new fe},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new fe}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new fe}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new fe}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ie(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ie(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new fe},alphaTest:{value:0},uvTransform:{value:new fe}},sprite:{diffuse:{value:new Ie(16777215)},opacity:{value:1},center:{value:new we(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new fe},alphaMap:{value:null},alphaMapTransform:{value:new fe},alphaTest:{value:0}}},qi={basic:{uniforms:Gn([Nt.common,Nt.specularmap,Nt.envmap,Nt.aomap,Nt.lightmap,Nt.fog]),vertexShader:pe.meshbasic_vert,fragmentShader:pe.meshbasic_frag},lambert:{uniforms:Gn([Nt.common,Nt.specularmap,Nt.envmap,Nt.aomap,Nt.lightmap,Nt.emissivemap,Nt.bumpmap,Nt.normalmap,Nt.displacementmap,Nt.fog,Nt.lights,{emissive:{value:new Ie(0)}}]),vertexShader:pe.meshlambert_vert,fragmentShader:pe.meshlambert_frag},phong:{uniforms:Gn([Nt.common,Nt.specularmap,Nt.envmap,Nt.aomap,Nt.lightmap,Nt.emissivemap,Nt.bumpmap,Nt.normalmap,Nt.displacementmap,Nt.fog,Nt.lights,{emissive:{value:new Ie(0)},specular:{value:new Ie(1118481)},shininess:{value:30}}]),vertexShader:pe.meshphong_vert,fragmentShader:pe.meshphong_frag},standard:{uniforms:Gn([Nt.common,Nt.envmap,Nt.aomap,Nt.lightmap,Nt.emissivemap,Nt.bumpmap,Nt.normalmap,Nt.displacementmap,Nt.roughnessmap,Nt.metalnessmap,Nt.fog,Nt.lights,{emissive:{value:new Ie(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:pe.meshphysical_vert,fragmentShader:pe.meshphysical_frag},toon:{uniforms:Gn([Nt.common,Nt.aomap,Nt.lightmap,Nt.emissivemap,Nt.bumpmap,Nt.normalmap,Nt.displacementmap,Nt.gradientmap,Nt.fog,Nt.lights,{emissive:{value:new Ie(0)}}]),vertexShader:pe.meshtoon_vert,fragmentShader:pe.meshtoon_frag},matcap:{uniforms:Gn([Nt.common,Nt.bumpmap,Nt.normalmap,Nt.displacementmap,Nt.fog,{matcap:{value:null}}]),vertexShader:pe.meshmatcap_vert,fragmentShader:pe.meshmatcap_frag},points:{uniforms:Gn([Nt.points,Nt.fog]),vertexShader:pe.points_vert,fragmentShader:pe.points_frag},dashed:{uniforms:Gn([Nt.common,Nt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:pe.linedashed_vert,fragmentShader:pe.linedashed_frag},depth:{uniforms:Gn([Nt.common,Nt.displacementmap]),vertexShader:pe.depth_vert,fragmentShader:pe.depth_frag},normal:{uniforms:Gn([Nt.common,Nt.bumpmap,Nt.normalmap,Nt.displacementmap,{opacity:{value:1}}]),vertexShader:pe.meshnormal_vert,fragmentShader:pe.meshnormal_frag},sprite:{uniforms:Gn([Nt.sprite,Nt.fog]),vertexShader:pe.sprite_vert,fragmentShader:pe.sprite_frag},background:{uniforms:{uvTransform:{value:new fe},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:pe.background_vert,fragmentShader:pe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new fe}},vertexShader:pe.backgroundCube_vert,fragmentShader:pe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:pe.cube_vert,fragmentShader:pe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:pe.equirect_vert,fragmentShader:pe.equirect_frag},distanceRGBA:{uniforms:Gn([Nt.common,Nt.displacementmap,{referencePosition:{value:new rt},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:pe.distanceRGBA_vert,fragmentShader:pe.distanceRGBA_frag},shadow:{uniforms:Gn([Nt.lights,Nt.fog,{color:{value:new Ie(0)},opacity:{value:1}}]),vertexShader:pe.shadow_vert,fragmentShader:pe.shadow_frag}};qi.physical={uniforms:Gn([qi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new fe},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new fe},clearcoatNormalScale:{value:new we(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new fe},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new fe},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new fe},sheen:{value:0},sheenColor:{value:new Ie(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new fe},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new fe},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new fe},transmissionSamplerSize:{value:new we},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new fe},attenuationDistance:{value:0},attenuationColor:{value:new Ie(0)},specularColor:{value:new Ie(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new fe},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new fe},anisotropyVector:{value:new we},anisotropyMap:{value:null},anisotropyMapTransform:{value:new fe}}]),vertexShader:pe.meshphysical_vert,fragmentShader:pe.meshphysical_frag};const Lc={r:0,b:0,g:0},zr=new ns,hw=new yn;function dw(i,t,n,r,o,u,c){const f=new Ie(0);let p=u===!0?0:1,d,m,v=null,_=0,x=null;function E(C){let D=C.isScene===!0?C.background:null;return D&&D.isTexture&&(D=(C.backgroundBlurriness>0?n:t).get(D)),D}function T(C){let D=!1;const N=E(C);N===null?y(f,p):N&&N.isColor&&(y(N,1),D=!0);const F=i.xr.getEnvironmentBlendMode();F==="additive"?r.buffers.color.setClear(0,0,0,1,c):F==="alpha-blend"&&r.buffers.color.setClear(0,0,0,0,c),(i.autoClear||D)&&(r.buffers.depth.setTest(!0),r.buffers.depth.setMask(!0),r.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function S(C,D){const N=E(D);N&&(N.isCubeTexture||N.mapping===lf)?(m===void 0&&(m=new Fi(new Kl(1,1,1),new $i({name:"BackgroundCubeMaterial",uniforms:ho(qi.backgroundCube.uniforms),vertexShader:qi.backgroundCube.vertexShader,fragmentShader:qi.backgroundCube.fragmentShader,side:$n,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),m.geometry.deleteAttribute("normal"),m.geometry.deleteAttribute("uv"),m.onBeforeRender=function(F,z,H){this.matrixWorld.copyPosition(H.matrixWorld)},Object.defineProperty(m.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),o.update(m)),zr.copy(D.backgroundRotation),zr.x*=-1,zr.y*=-1,zr.z*=-1,N.isCubeTexture&&N.isRenderTargetTexture===!1&&(zr.y*=-1,zr.z*=-1),m.material.uniforms.envMap.value=N,m.material.uniforms.flipEnvMap.value=N.isCubeTexture&&N.isRenderTargetTexture===!1?-1:1,m.material.uniforms.backgroundBlurriness.value=D.backgroundBlurriness,m.material.uniforms.backgroundIntensity.value=D.backgroundIntensity,m.material.uniforms.backgroundRotation.value.setFromMatrix4(hw.makeRotationFromEuler(zr)),m.material.toneMapped=Ae.getTransfer(N.colorSpace)!==Fe,(v!==N||_!==N.version||x!==i.toneMapping)&&(m.material.needsUpdate=!0,v=N,_=N.version,x=i.toneMapping),m.layers.enableAll(),C.unshift(m,m.geometry,m.material,0,0,null)):N&&N.isTexture&&(d===void 0&&(d=new Fi(new Zl(2,2),new $i({name:"BackgroundMaterial",uniforms:ho(qi.background.uniforms),vertexShader:qi.background.vertexShader,fragmentShader:qi.background.fragmentShader,side:pr,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),d.geometry.deleteAttribute("normal"),Object.defineProperty(d.material,"map",{get:function(){return this.uniforms.t2D.value}}),o.update(d)),d.material.uniforms.t2D.value=N,d.material.uniforms.backgroundIntensity.value=D.backgroundIntensity,d.material.toneMapped=Ae.getTransfer(N.colorSpace)!==Fe,N.matrixAutoUpdate===!0&&N.updateMatrix(),d.material.uniforms.uvTransform.value.copy(N.matrix),(v!==N||_!==N.version||x!==i.toneMapping)&&(d.material.needsUpdate=!0,v=N,_=N.version,x=i.toneMapping),d.layers.enableAll(),C.unshift(d,d.geometry,d.material,0,0,null))}function y(C,D){C.getRGB(Lc,WS(i)),r.buffers.color.setClear(Lc.r,Lc.g,Lc.b,D,c)}function w(){m!==void 0&&(m.geometry.dispose(),m.material.dispose(),m=void 0),d!==void 0&&(d.geometry.dispose(),d.material.dispose(),d=void 0)}return{getClearColor:function(){return f},setClearColor:function(C,D=1){f.set(C),p=D,y(f,p)},getClearAlpha:function(){return p},setClearAlpha:function(C){p=C,y(f,p)},render:T,addToRenderList:S,dispose:w}}function pw(i,t){const n=i.getParameter(i.MAX_VERTEX_ATTRIBS),r={},o=_(null);let u=o,c=!1;function f(L,G,nt,ct,pt){let ut=!1;const I=v(ct,nt,G);u!==I&&(u=I,d(u.object)),ut=x(L,ct,nt,pt),ut&&E(L,ct,nt,pt),pt!==null&&t.update(pt,i.ELEMENT_ARRAY_BUFFER),(ut||c)&&(c=!1,D(L,G,nt,ct),pt!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(pt).buffer))}function p(){return i.createVertexArray()}function d(L){return i.bindVertexArray(L)}function m(L){return i.deleteVertexArray(L)}function v(L,G,nt){const ct=nt.wireframe===!0;let pt=r[L.id];pt===void 0&&(pt={},r[L.id]=pt);let ut=pt[G.id];ut===void 0&&(ut={},pt[G.id]=ut);let I=ut[ct];return I===void 0&&(I=_(p()),ut[ct]=I),I}function _(L){const G=[],nt=[],ct=[];for(let pt=0;pt<n;pt++)G[pt]=0,nt[pt]=0,ct[pt]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:G,enabledAttributes:nt,attributeDivisors:ct,object:L,attributes:{},index:null}}function x(L,G,nt,ct){const pt=u.attributes,ut=G.attributes;let I=0;const q=nt.getAttributes();for(const W in q)if(q[W].location>=0){const P=pt[W];let J=ut[W];if(J===void 0&&(W==="instanceMatrix"&&L.instanceMatrix&&(J=L.instanceMatrix),W==="instanceColor"&&L.instanceColor&&(J=L.instanceColor)),P===void 0||P.attribute!==J||J&&P.data!==J.data)return!0;I++}return u.attributesNum!==I||u.index!==ct}function E(L,G,nt,ct){const pt={},ut=G.attributes;let I=0;const q=nt.getAttributes();for(const W in q)if(q[W].location>=0){let P=ut[W];P===void 0&&(W==="instanceMatrix"&&L.instanceMatrix&&(P=L.instanceMatrix),W==="instanceColor"&&L.instanceColor&&(P=L.instanceColor));const J={};J.attribute=P,P&&P.data&&(J.data=P.data),pt[W]=J,I++}u.attributes=pt,u.attributesNum=I,u.index=ct}function T(){const L=u.newAttributes;for(let G=0,nt=L.length;G<nt;G++)L[G]=0}function S(L){y(L,0)}function y(L,G){const nt=u.newAttributes,ct=u.enabledAttributes,pt=u.attributeDivisors;nt[L]=1,ct[L]===0&&(i.enableVertexAttribArray(L),ct[L]=1),pt[L]!==G&&(i.vertexAttribDivisor(L,G),pt[L]=G)}function w(){const L=u.newAttributes,G=u.enabledAttributes;for(let nt=0,ct=G.length;nt<ct;nt++)G[nt]!==L[nt]&&(i.disableVertexAttribArray(nt),G[nt]=0)}function C(L,G,nt,ct,pt,ut,I){I===!0?i.vertexAttribIPointer(L,G,nt,pt,ut):i.vertexAttribPointer(L,G,nt,ct,pt,ut)}function D(L,G,nt,ct){T();const pt=ct.attributes,ut=nt.getAttributes(),I=G.defaultAttributeValues;for(const q in ut){const W=ut[q];if(W.location>=0){let yt=pt[q];if(yt===void 0&&(q==="instanceMatrix"&&L.instanceMatrix&&(yt=L.instanceMatrix),q==="instanceColor"&&L.instanceColor&&(yt=L.instanceColor)),yt!==void 0){const P=yt.normalized,J=yt.itemSize,xt=t.get(yt);if(xt===void 0)continue;const St=xt.buffer,Ut=xt.type,Vt=xt.bytesPerElement,et=Ut===i.INT||Ut===i.UNSIGNED_INT||yt.gpuType===Nm;if(yt.isInterleavedBufferAttribute){const vt=yt.data,At=vt.stride,Qt=yt.offset;if(vt.isInstancedInterleavedBuffer){for(let Yt=0;Yt<W.locationSize;Yt++)y(W.location+Yt,vt.meshPerAttribute);L.isInstancedMesh!==!0&&ct._maxInstanceCount===void 0&&(ct._maxInstanceCount=vt.meshPerAttribute*vt.count)}else for(let Yt=0;Yt<W.locationSize;Yt++)S(W.location+Yt);i.bindBuffer(i.ARRAY_BUFFER,St);for(let Yt=0;Yt<W.locationSize;Yt++)C(W.location+Yt,J/W.locationSize,Ut,P,At*Vt,(Qt+J/W.locationSize*Yt)*Vt,et)}else{if(yt.isInstancedBufferAttribute){for(let vt=0;vt<W.locationSize;vt++)y(W.location+vt,yt.meshPerAttribute);L.isInstancedMesh!==!0&&ct._maxInstanceCount===void 0&&(ct._maxInstanceCount=yt.meshPerAttribute*yt.count)}else for(let vt=0;vt<W.locationSize;vt++)S(W.location+vt);i.bindBuffer(i.ARRAY_BUFFER,St);for(let vt=0;vt<W.locationSize;vt++)C(W.location+vt,J/W.locationSize,Ut,P,J*Vt,J/W.locationSize*vt*Vt,et)}}else if(I!==void 0){const P=I[q];if(P!==void 0)switch(P.length){case 2:i.vertexAttrib2fv(W.location,P);break;case 3:i.vertexAttrib3fv(W.location,P);break;case 4:i.vertexAttrib4fv(W.location,P);break;default:i.vertexAttrib1fv(W.location,P)}}}}w()}function N(){H();for(const L in r){const G=r[L];for(const nt in G){const ct=G[nt];for(const pt in ct)m(ct[pt].object),delete ct[pt];delete G[nt]}delete r[L]}}function F(L){if(r[L.id]===void 0)return;const G=r[L.id];for(const nt in G){const ct=G[nt];for(const pt in ct)m(ct[pt].object),delete ct[pt];delete G[nt]}delete r[L.id]}function z(L){for(const G in r){const nt=r[G];if(nt[L.id]===void 0)continue;const ct=nt[L.id];for(const pt in ct)m(ct[pt].object),delete ct[pt];delete nt[L.id]}}function H(){U(),c=!0,u!==o&&(u=o,d(u.object))}function U(){o.geometry=null,o.program=null,o.wireframe=!1}return{setup:f,reset:H,resetDefaultState:U,dispose:N,releaseStatesOfGeometry:F,releaseStatesOfProgram:z,initAttributes:T,enableAttribute:S,disableUnusedAttributes:w}}function mw(i,t,n){let r;function o(d){r=d}function u(d,m){i.drawArrays(r,d,m),n.update(m,r,1)}function c(d,m,v){v!==0&&(i.drawArraysInstanced(r,d,m,v),n.update(m,r,v))}function f(d,m,v){if(v===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(r,d,0,m,0,v);let x=0;for(let E=0;E<v;E++)x+=m[E];n.update(x,r,1)}function p(d,m,v,_){if(v===0)return;const x=t.get("WEBGL_multi_draw");if(x===null)for(let E=0;E<d.length;E++)c(d[E],m[E],_[E]);else{x.multiDrawArraysInstancedWEBGL(r,d,0,m,0,_,0,v);let E=0;for(let T=0;T<v;T++)E+=m[T]*_[T];n.update(E,r,1)}}this.setMode=o,this.render=u,this.renderInstances=c,this.renderMultiDraw=f,this.renderMultiDrawInstances=p}function gw(i,t,n,r){let o;function u(){if(o!==void 0)return o;if(t.has("EXT_texture_filter_anisotropic")===!0){const z=t.get("EXT_texture_filter_anisotropic");o=i.getParameter(z.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else o=0;return o}function c(z){return!(z!==ci&&r.convert(z)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function f(z){const H=z===Wl&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(z!==ba&&r.convert(z)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&z!==Bi&&!H)}function p(z){if(z==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";z="mediump"}return z==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let d=n.precision!==void 0?n.precision:"highp";const m=p(d);m!==d&&(console.warn("THREE.WebGLRenderer:",d,"not supported, using",m,"instead."),d=m);const v=n.logarithmicDepthBuffer===!0,_=n.reversedDepthBuffer===!0&&t.has("EXT_clip_control"),x=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),E=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),T=i.getParameter(i.MAX_TEXTURE_SIZE),S=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),y=i.getParameter(i.MAX_VERTEX_ATTRIBS),w=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),C=i.getParameter(i.MAX_VARYING_VECTORS),D=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),N=E>0,F=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:u,getMaxPrecision:p,textureFormatReadable:c,textureTypeReadable:f,precision:d,logarithmicDepthBuffer:v,reversedDepthBuffer:_,maxTextures:x,maxVertexTextures:E,maxTextureSize:T,maxCubemapSize:S,maxAttributes:y,maxVertexUniforms:w,maxVaryings:C,maxFragmentUniforms:D,vertexTextures:N,maxSamples:F}}function vw(i){const t=this;let n=null,r=0,o=!1,u=!1;const c=new Gr,f=new fe,p={value:null,needsUpdate:!1};this.uniform=p,this.numPlanes=0,this.numIntersection=0,this.init=function(v,_){const x=v.length!==0||_||r!==0||o;return o=_,r=v.length,x},this.beginShadows=function(){u=!0,m(null)},this.endShadows=function(){u=!1},this.setGlobalState=function(v,_){n=m(v,_,0)},this.setState=function(v,_,x){const E=v.clippingPlanes,T=v.clipIntersection,S=v.clipShadows,y=i.get(v);if(!o||E===null||E.length===0||u&&!S)u?m(null):d();else{const w=u?0:r,C=w*4;let D=y.clippingState||null;p.value=D,D=m(E,_,C,x);for(let N=0;N!==C;++N)D[N]=n[N];y.clippingState=D,this.numIntersection=T?this.numPlanes:0,this.numPlanes+=w}};function d(){p.value!==n&&(p.value=n,p.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function m(v,_,x,E){const T=v!==null?v.length:0;let S=null;if(T!==0){if(S=p.value,E!==!0||S===null){const y=x+T*4,w=_.matrixWorldInverse;f.getNormalMatrix(w),(S===null||S.length<y)&&(S=new Float32Array(y));for(let C=0,D=x;C!==T;++C,D+=4)c.copy(v[C]).applyMatrix4(w,f),c.normal.toArray(S,D),S[D+3]=c.constant}p.value=S,p.needsUpdate=!0}return t.numPlanes=T,t.numIntersection=0,S}}function _w(i){let t=new WeakMap;function n(c,f){return f===wp?c.mapping=uo:f===Dp&&(c.mapping=co),c}function r(c){if(c&&c.isTexture){const f=c.mapping;if(f===wp||f===Dp)if(t.has(c)){const p=t.get(c).texture;return n(p,c.mapping)}else{const p=c.image;if(p&&p.height>0){const d=new E1(p.height);return d.fromEquirectangularTexture(i,c),t.set(c,d),c.addEventListener("dispose",o),n(d.texture,c.mapping)}else return null}}return c}function o(c){const f=c.target;f.removeEventListener("dispose",o);const p=t.get(f);p!==void 0&&(t.delete(f),p.dispose())}function u(){t=new WeakMap}return{get:r,dispose:u}}const Js=4,by=[.125,.215,.35,.446,.526,.582],qr=20,Gd=new QS,Ay=new Ie;let kd=null,Xd=0,Wd=0,qd=!1;const kr=(1+Math.sqrt(5))/2,$s=1/kr,Ry=[new rt(-kr,$s,0),new rt(kr,$s,0),new rt(-$s,0,kr),new rt($s,0,kr),new rt(0,kr,-$s),new rt(0,kr,$s),new rt(-1,1,-1),new rt(1,1,-1),new rt(-1,1,1),new rt(1,1,1)],yw=new rt;class Cy{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,n=0,r=.1,o=100,u={}){const{size:c=256,position:f=yw}=u;kd=this._renderer.getRenderTarget(),Xd=this._renderer.getActiveCubeFace(),Wd=this._renderer.getActiveMipmapLevel(),qd=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(c);const p=this._allocateTargets();return p.depthBuffer=!0,this._sceneToCubeUV(t,r,o,p,f),n>0&&this._blur(p,0,0,n),this._applyPMREM(p),this._cleanup(p),p}fromEquirectangular(t,n=null){return this._fromTexture(t,n)}fromCubemap(t,n=null){return this._fromTexture(t,n)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Uy(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Dy(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(kd,Xd,Wd),this._renderer.xr.enabled=qd,t.scissorTest=!1,Pc(t,0,0,t.width,t.height)}_fromTexture(t,n){t.mapping===uo||t.mapping===co?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),kd=this._renderer.getRenderTarget(),Xd=this._renderer.getActiveCubeFace(),Wd=this._renderer.getActiveMipmapLevel(),qd=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const r=n||this._allocateTargets();return this._textureToCubeUV(t,r),this._applyPMREM(r),this._cleanup(r),r}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),n=4*this._cubeSize,r={magFilter:Zn,minFilter:Zn,generateMipmaps:!1,type:Wl,format:ci,colorSpace:fo,depthBuffer:!1},o=wy(t,n,r);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==n){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=wy(t,n,r);const{_lodMax:u}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=xw(u)),this._blurMaterial=Sw(u,t,n)}return o}_compileMaterial(t){const n=new Fi(this._lodPlanes[0],t);this._renderer.compile(n,Gd)}_sceneToCubeUV(t,n,r,o,u){const p=new Ni(90,1,n,r),d=[1,-1,1,1,1,1],m=[1,1,1,-1,-1,-1],v=this._renderer,_=v.autoClear,x=v.toneMapping;v.getClearColor(Ay),v.toneMapping=hr,v.autoClear=!1,v.state.buffers.depth.getReversed()&&(v.setRenderTarget(o),v.clearDepth(),v.setRenderTarget(null));const T=new GS({name:"PMREM.Background",side:$n,depthWrite:!1,depthTest:!1}),S=new Fi(new Kl,T);let y=!1;const w=t.background;w?w.isColor&&(T.color.copy(w),t.background=null,y=!0):(T.color.copy(Ay),y=!0);for(let C=0;C<6;C++){const D=C%3;D===0?(p.up.set(0,d[C],0),p.position.set(u.x,u.y,u.z),p.lookAt(u.x+m[C],u.y,u.z)):D===1?(p.up.set(0,0,d[C]),p.position.set(u.x,u.y,u.z),p.lookAt(u.x,u.y+m[C],u.z)):(p.up.set(0,d[C],0),p.position.set(u.x,u.y,u.z),p.lookAt(u.x,u.y,u.z+m[C]));const N=this._cubeSize;Pc(o,D*N,C>2?N:0,N,N),v.setRenderTarget(o),y&&v.render(S,p),v.render(t,p)}S.geometry.dispose(),S.material.dispose(),v.toneMapping=x,v.autoClear=_,t.background=w}_textureToCubeUV(t,n){const r=this._renderer,o=t.mapping===uo||t.mapping===co;o?(this._cubemapMaterial===null&&(this._cubemapMaterial=Uy()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Dy());const u=o?this._cubemapMaterial:this._equirectMaterial,c=new Fi(this._lodPlanes[0],u),f=u.uniforms;f.envMap.value=t;const p=this._cubeSize;Pc(n,0,0,3*p,2*p),r.setRenderTarget(n),r.render(c,Gd)}_applyPMREM(t){const n=this._renderer,r=n.autoClear;n.autoClear=!1;const o=this._lodPlanes.length;for(let u=1;u<o;u++){const c=Math.sqrt(this._sigmas[u]*this._sigmas[u]-this._sigmas[u-1]*this._sigmas[u-1]),f=Ry[(o-u-1)%Ry.length];this._blur(t,u-1,u,c,f)}n.autoClear=r}_blur(t,n,r,o,u){const c=this._pingPongRenderTarget;this._halfBlur(t,c,n,r,o,"latitudinal",u),this._halfBlur(c,t,r,r,o,"longitudinal",u)}_halfBlur(t,n,r,o,u,c,f){const p=this._renderer,d=this._blurMaterial;c!=="latitudinal"&&c!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const m=3,v=new Fi(this._lodPlanes[o],d),_=d.uniforms,x=this._sizeLods[r]-1,E=isFinite(u)?Math.PI/(2*x):2*Math.PI/(2*qr-1),T=u/E,S=isFinite(u)?1+Math.floor(m*T):qr;S>qr&&console.warn(`sigmaRadians, ${u}, is too large and will clip, as it requested ${S} samples when the maximum is set to ${qr}`);const y=[];let w=0;for(let z=0;z<qr;++z){const H=z/T,U=Math.exp(-H*H/2);y.push(U),z===0?w+=U:z<S&&(w+=2*U)}for(let z=0;z<y.length;z++)y[z]=y[z]/w;_.envMap.value=t.texture,_.samples.value=S,_.weights.value=y,_.latitudinal.value=c==="latitudinal",f&&(_.poleAxis.value=f);const{_lodMax:C}=this;_.dTheta.value=E,_.mipInt.value=C-r;const D=this._sizeLods[o],N=3*D*(o>C-Js?o-C+Js:0),F=4*(this._cubeSize-D);Pc(n,N,F,3*D,2*D),p.setRenderTarget(n),p.render(v,Gd)}}function xw(i){const t=[],n=[],r=[];let o=i;const u=i-Js+1+by.length;for(let c=0;c<u;c++){const f=Math.pow(2,o);n.push(f);let p=1/f;c>i-Js?p=by[c-i+Js-1]:c===0&&(p=0),r.push(p);const d=1/(f-2),m=-d,v=1+d,_=[m,m,v,m,v,v,m,m,v,v,m,v],x=6,E=6,T=3,S=2,y=1,w=new Float32Array(T*E*x),C=new Float32Array(S*E*x),D=new Float32Array(y*E*x);for(let F=0;F<x;F++){const z=F%3*2/3-1,H=F>2?0:-1,U=[z,H,0,z+2/3,H,0,z+2/3,H+1,0,z,H,0,z+2/3,H+1,0,z,H+1,0];w.set(U,T*E*F),C.set(_,S*E*F);const L=[F,F,F,F,F,F];D.set(L,y*E*F)}const N=new is;N.setAttribute("position",new ji(w,T)),N.setAttribute("uv",new ji(C,S)),N.setAttribute("faceIndex",new ji(D,y)),t.push(N),o>Js&&o--}return{lodPlanes:t,sizeLods:n,sigmas:r}}function wy(i,t,n){const r=new Aa(i,t,n);return r.texture.mapping=lf,r.texture.name="PMREM.cubeUv",r.scissorTest=!0,r}function Pc(i,t,n,r,o){i.viewport.set(t,n,r,o),i.scissor.set(t,n,r,o)}function Sw(i,t,n){const r=new Float32Array(qr),o=new rt(0,1,0);return new $i({name:"SphericalGaussianBlur",defines:{n:qr,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:o}},vertexShader:Gm(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:fr,depthTest:!1,depthWrite:!1})}function Dy(){return new $i({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Gm(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:fr,depthTest:!1,depthWrite:!1})}function Uy(){return new $i({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Gm(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:fr,depthTest:!1,depthWrite:!1})}function Gm(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Mw(i){let t=new WeakMap,n=null;function r(f){if(f&&f.isTexture){const p=f.mapping,d=p===wp||p===Dp,m=p===uo||p===co;if(d||m){let v=t.get(f);const _=v!==void 0?v.texture.pmremVersion:0;if(f.isRenderTargetTexture&&f.pmremVersion!==_)return n===null&&(n=new Cy(i)),v=d?n.fromEquirectangular(f,v):n.fromCubemap(f,v),v.texture.pmremVersion=f.pmremVersion,t.set(f,v),v.texture;if(v!==void 0)return v.texture;{const x=f.image;return d&&x&&x.height>0||m&&x&&o(x)?(n===null&&(n=new Cy(i)),v=d?n.fromEquirectangular(f):n.fromCubemap(f),v.texture.pmremVersion=f.pmremVersion,t.set(f,v),f.addEventListener("dispose",u),v.texture):null}}}return f}function o(f){let p=0;const d=6;for(let m=0;m<d;m++)f[m]!==void 0&&p++;return p===d}function u(f){const p=f.target;p.removeEventListener("dispose",u);const d=t.get(p);d!==void 0&&(t.delete(p),d.dispose())}function c(){t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:r,dispose:c}}function Ew(i){const t={};function n(r){if(t[r]!==void 0)return t[r];let o;switch(r){case"WEBGL_depth_texture":o=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":o=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":o=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":o=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:o=i.getExtension(r)}return t[r]=o,o}return{has:function(r){return n(r)!==null},init:function(){n("EXT_color_buffer_float"),n("WEBGL_clip_cull_distance"),n("OES_texture_float_linear"),n("EXT_color_buffer_half_float"),n("WEBGL_multisampled_render_to_texture"),n("WEBGL_render_shared_exponent")},get:function(r){const o=n(r);return o===null&&Fl("THREE.WebGLRenderer: "+r+" extension not supported."),o}}}function Tw(i,t,n,r){const o={},u=new WeakMap;function c(v){const _=v.target;_.index!==null&&t.remove(_.index);for(const E in _.attributes)t.remove(_.attributes[E]);_.removeEventListener("dispose",c),delete o[_.id];const x=u.get(_);x&&(t.remove(x),u.delete(_)),r.releaseStatesOfGeometry(_),_.isInstancedBufferGeometry===!0&&delete _._maxInstanceCount,n.memory.geometries--}function f(v,_){return o[_.id]===!0||(_.addEventListener("dispose",c),o[_.id]=!0,n.memory.geometries++),_}function p(v){const _=v.attributes;for(const x in _)t.update(_[x],i.ARRAY_BUFFER)}function d(v){const _=[],x=v.index,E=v.attributes.position;let T=0;if(x!==null){const w=x.array;T=x.version;for(let C=0,D=w.length;C<D;C+=3){const N=w[C+0],F=w[C+1],z=w[C+2];_.push(N,F,F,z,z,N)}}else if(E!==void 0){const w=E.array;T=E.version;for(let C=0,D=w.length/3-1;C<D;C+=3){const N=C+0,F=C+1,z=C+2;_.push(N,F,F,z,z,N)}}else return;const S=new(IS(_)?XS:kS)(_,1);S.version=T;const y=u.get(v);y&&t.remove(y),u.set(v,S)}function m(v){const _=u.get(v);if(_){const x=v.index;x!==null&&_.version<x.version&&d(v)}else d(v);return u.get(v)}return{get:f,update:p,getWireframeAttribute:m}}function bw(i,t,n){let r;function o(_){r=_}let u,c;function f(_){u=_.type,c=_.bytesPerElement}function p(_,x){i.drawElements(r,x,u,_*c),n.update(x,r,1)}function d(_,x,E){E!==0&&(i.drawElementsInstanced(r,x,u,_*c,E),n.update(x,r,E))}function m(_,x,E){if(E===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(r,x,0,u,_,0,E);let S=0;for(let y=0;y<E;y++)S+=x[y];n.update(S,r,1)}function v(_,x,E,T){if(E===0)return;const S=t.get("WEBGL_multi_draw");if(S===null)for(let y=0;y<_.length;y++)d(_[y]/c,x[y],T[y]);else{S.multiDrawElementsInstancedWEBGL(r,x,0,u,_,0,T,0,E);let y=0;for(let w=0;w<E;w++)y+=x[w]*T[w];n.update(y,r,1)}}this.setMode=o,this.setIndex=f,this.render=p,this.renderInstances=d,this.renderMultiDraw=m,this.renderMultiDrawInstances=v}function Aw(i){const t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(u,c,f){switch(n.calls++,c){case i.TRIANGLES:n.triangles+=f*(u/3);break;case i.LINES:n.lines+=f*(u/2);break;case i.LINE_STRIP:n.lines+=f*(u-1);break;case i.LINE_LOOP:n.lines+=f*u;break;case i.POINTS:n.points+=f*u;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",c);break}}function o(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:o,update:r}}function Rw(i,t,n){const r=new WeakMap,o=new rn;function u(c,f,p){const d=c.morphTargetInfluences,m=f.morphAttributes.position||f.morphAttributes.normal||f.morphAttributes.color,v=m!==void 0?m.length:0;let _=r.get(f);if(_===void 0||_.count!==v){let L=function(){H.dispose(),r.delete(f),f.removeEventListener("dispose",L)};var x=L;_!==void 0&&_.texture.dispose();const E=f.morphAttributes.position!==void 0,T=f.morphAttributes.normal!==void 0,S=f.morphAttributes.color!==void 0,y=f.morphAttributes.position||[],w=f.morphAttributes.normal||[],C=f.morphAttributes.color||[];let D=0;E===!0&&(D=1),T===!0&&(D=2),S===!0&&(D=3);let N=f.attributes.position.count*D,F=1;N>t.maxTextureSize&&(F=Math.ceil(N/t.maxTextureSize),N=t.maxTextureSize);const z=new Float32Array(N*F*4*v),H=new zS(z,N,F,v);H.type=Bi,H.needsUpdate=!0;const U=D*4;for(let G=0;G<v;G++){const nt=y[G],ct=w[G],pt=C[G],ut=N*F*4*G;for(let I=0;I<nt.count;I++){const q=I*U;E===!0&&(o.fromBufferAttribute(nt,I),z[ut+q+0]=o.x,z[ut+q+1]=o.y,z[ut+q+2]=o.z,z[ut+q+3]=0),T===!0&&(o.fromBufferAttribute(ct,I),z[ut+q+4]=o.x,z[ut+q+5]=o.y,z[ut+q+6]=o.z,z[ut+q+7]=0),S===!0&&(o.fromBufferAttribute(pt,I),z[ut+q+8]=o.x,z[ut+q+9]=o.y,z[ut+q+10]=o.z,z[ut+q+11]=pt.itemSize===4?o.w:1)}}_={count:v,texture:H,size:new we(N,F)},r.set(f,_),f.addEventListener("dispose",L)}if(c.isInstancedMesh===!0&&c.morphTexture!==null)p.getUniforms().setValue(i,"morphTexture",c.morphTexture,n);else{let E=0;for(let S=0;S<d.length;S++)E+=d[S];const T=f.morphTargetsRelative?1:1-E;p.getUniforms().setValue(i,"morphTargetBaseInfluence",T),p.getUniforms().setValue(i,"morphTargetInfluences",d)}p.getUniforms().setValue(i,"morphTargetsTexture",_.texture,n),p.getUniforms().setValue(i,"morphTargetsTextureSize",_.size)}return{update:u}}function Cw(i,t,n,r){let o=new WeakMap;function u(p){const d=r.render.frame,m=p.geometry,v=t.get(p,m);if(o.get(v)!==d&&(t.update(v),o.set(v,d)),p.isInstancedMesh&&(p.hasEventListener("dispose",f)===!1&&p.addEventListener("dispose",f),o.get(p)!==d&&(n.update(p.instanceMatrix,i.ARRAY_BUFFER),p.instanceColor!==null&&n.update(p.instanceColor,i.ARRAY_BUFFER),o.set(p,d))),p.isSkinnedMesh){const _=p.skeleton;o.get(_)!==d&&(_.update(),o.set(_,d))}return v}function c(){o=new WeakMap}function f(p){const d=p.target;d.removeEventListener("dispose",f),n.remove(d.instanceMatrix),d.instanceColor!==null&&n.remove(d.instanceColor)}return{update:u,dispose:c}}const JS=new Jn,Ly=new KS(1,1),tM=new zS,eM=new r1,nM=new YS,Py=[],Ny=[],Oy=new Float32Array(16),By=new Float32Array(9),Fy=new Float32Array(4);function vo(i,t,n){const r=i[0];if(r<=0||r>0)return i;const o=t*n;let u=Py[o];if(u===void 0&&(u=new Float32Array(o),Py[o]=u),t!==0){r.toArray(u,0);for(let c=1,f=0;c!==t;++c)f+=n,i[c].toArray(u,f)}return u}function xn(i,t){if(i.length!==t.length)return!1;for(let n=0,r=i.length;n<r;n++)if(i[n]!==t[n])return!1;return!0}function Sn(i,t){for(let n=0,r=t.length;n<r;n++)i[n]=t[n]}function cf(i,t){let n=Ny[t];n===void 0&&(n=new Int32Array(t),Ny[t]=n);for(let r=0;r!==t;++r)n[r]=i.allocateTextureUnit();return n}function ww(i,t){const n=this.cache;n[0]!==t&&(i.uniform1f(this.addr,t),n[0]=t)}function Dw(i,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(xn(n,t))return;i.uniform2fv(this.addr,t),Sn(n,t)}}function Uw(i,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(xn(n,t))return;i.uniform3fv(this.addr,t),Sn(n,t)}}function Lw(i,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(xn(n,t))return;i.uniform4fv(this.addr,t),Sn(n,t)}}function Pw(i,t){const n=this.cache,r=t.elements;if(r===void 0){if(xn(n,t))return;i.uniformMatrix2fv(this.addr,!1,t),Sn(n,t)}else{if(xn(n,r))return;Fy.set(r),i.uniformMatrix2fv(this.addr,!1,Fy),Sn(n,r)}}function Nw(i,t){const n=this.cache,r=t.elements;if(r===void 0){if(xn(n,t))return;i.uniformMatrix3fv(this.addr,!1,t),Sn(n,t)}else{if(xn(n,r))return;By.set(r),i.uniformMatrix3fv(this.addr,!1,By),Sn(n,r)}}function Ow(i,t){const n=this.cache,r=t.elements;if(r===void 0){if(xn(n,t))return;i.uniformMatrix4fv(this.addr,!1,t),Sn(n,t)}else{if(xn(n,r))return;Oy.set(r),i.uniformMatrix4fv(this.addr,!1,Oy),Sn(n,r)}}function Bw(i,t){const n=this.cache;n[0]!==t&&(i.uniform1i(this.addr,t),n[0]=t)}function Fw(i,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(xn(n,t))return;i.uniform2iv(this.addr,t),Sn(n,t)}}function Iw(i,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(xn(n,t))return;i.uniform3iv(this.addr,t),Sn(n,t)}}function zw(i,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(xn(n,t))return;i.uniform4iv(this.addr,t),Sn(n,t)}}function Vw(i,t){const n=this.cache;n[0]!==t&&(i.uniform1ui(this.addr,t),n[0]=t)}function Hw(i,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(xn(n,t))return;i.uniform2uiv(this.addr,t),Sn(n,t)}}function Gw(i,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(xn(n,t))return;i.uniform3uiv(this.addr,t),Sn(n,t)}}function kw(i,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(xn(n,t))return;i.uniform4uiv(this.addr,t),Sn(n,t)}}function Xw(i,t,n){const r=this.cache,o=n.allocateTextureUnit();r[0]!==o&&(i.uniform1i(this.addr,o),r[0]=o);let u;this.type===i.SAMPLER_2D_SHADOW?(Ly.compareFunction=FS,u=Ly):u=JS,n.setTexture2D(t||u,o)}function Ww(i,t,n){const r=this.cache,o=n.allocateTextureUnit();r[0]!==o&&(i.uniform1i(this.addr,o),r[0]=o),n.setTexture3D(t||eM,o)}function qw(i,t,n){const r=this.cache,o=n.allocateTextureUnit();r[0]!==o&&(i.uniform1i(this.addr,o),r[0]=o),n.setTextureCube(t||nM,o)}function Yw(i,t,n){const r=this.cache,o=n.allocateTextureUnit();r[0]!==o&&(i.uniform1i(this.addr,o),r[0]=o),n.setTexture2DArray(t||tM,o)}function jw(i){switch(i){case 5126:return ww;case 35664:return Dw;case 35665:return Uw;case 35666:return Lw;case 35674:return Pw;case 35675:return Nw;case 35676:return Ow;case 5124:case 35670:return Bw;case 35667:case 35671:return Fw;case 35668:case 35672:return Iw;case 35669:case 35673:return zw;case 5125:return Vw;case 36294:return Hw;case 36295:return Gw;case 36296:return kw;case 35678:case 36198:case 36298:case 36306:case 35682:return Xw;case 35679:case 36299:case 36307:return Ww;case 35680:case 36300:case 36308:case 36293:return qw;case 36289:case 36303:case 36311:case 36292:return Yw}}function Kw(i,t){i.uniform1fv(this.addr,t)}function Zw(i,t){const n=vo(t,this.size,2);i.uniform2fv(this.addr,n)}function Qw(i,t){const n=vo(t,this.size,3);i.uniform3fv(this.addr,n)}function $w(i,t){const n=vo(t,this.size,4);i.uniform4fv(this.addr,n)}function Jw(i,t){const n=vo(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,n)}function t2(i,t){const n=vo(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,n)}function e2(i,t){const n=vo(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,n)}function n2(i,t){i.uniform1iv(this.addr,t)}function i2(i,t){i.uniform2iv(this.addr,t)}function a2(i,t){i.uniform3iv(this.addr,t)}function r2(i,t){i.uniform4iv(this.addr,t)}function s2(i,t){i.uniform1uiv(this.addr,t)}function o2(i,t){i.uniform2uiv(this.addr,t)}function l2(i,t){i.uniform3uiv(this.addr,t)}function u2(i,t){i.uniform4uiv(this.addr,t)}function c2(i,t,n){const r=this.cache,o=t.length,u=cf(n,o);xn(r,u)||(i.uniform1iv(this.addr,u),Sn(r,u));for(let c=0;c!==o;++c)n.setTexture2D(t[c]||JS,u[c])}function f2(i,t,n){const r=this.cache,o=t.length,u=cf(n,o);xn(r,u)||(i.uniform1iv(this.addr,u),Sn(r,u));for(let c=0;c!==o;++c)n.setTexture3D(t[c]||eM,u[c])}function h2(i,t,n){const r=this.cache,o=t.length,u=cf(n,o);xn(r,u)||(i.uniform1iv(this.addr,u),Sn(r,u));for(let c=0;c!==o;++c)n.setTextureCube(t[c]||nM,u[c])}function d2(i,t,n){const r=this.cache,o=t.length,u=cf(n,o);xn(r,u)||(i.uniform1iv(this.addr,u),Sn(r,u));for(let c=0;c!==o;++c)n.setTexture2DArray(t[c]||tM,u[c])}function p2(i){switch(i){case 5126:return Kw;case 35664:return Zw;case 35665:return Qw;case 35666:return $w;case 35674:return Jw;case 35675:return t2;case 35676:return e2;case 5124:case 35670:return n2;case 35667:case 35671:return i2;case 35668:case 35672:return a2;case 35669:case 35673:return r2;case 5125:return s2;case 36294:return o2;case 36295:return l2;case 36296:return u2;case 35678:case 36198:case 36298:case 36306:case 35682:return c2;case 35679:case 36299:case 36307:return f2;case 35680:case 36300:case 36308:case 36293:return h2;case 36289:case 36303:case 36311:case 36292:return d2}}class m2{constructor(t,n,r){this.id=t,this.addr=r,this.cache=[],this.type=n.type,this.setValue=jw(n.type)}}class g2{constructor(t,n,r){this.id=t,this.addr=r,this.cache=[],this.type=n.type,this.size=n.size,this.setValue=p2(n.type)}}class v2{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,n,r){const o=this.seq;for(let u=0,c=o.length;u!==c;++u){const f=o[u];f.setValue(t,n[f.id],r)}}}const Yd=/(\w+)(\])?(\[|\.)?/g;function Iy(i,t){i.seq.push(t),i.map[t.id]=t}function _2(i,t,n){const r=i.name,o=r.length;for(Yd.lastIndex=0;;){const u=Yd.exec(r),c=Yd.lastIndex;let f=u[1];const p=u[2]==="]",d=u[3];if(p&&(f=f|0),d===void 0||d==="["&&c+2===o){Iy(n,d===void 0?new m2(f,i,t):new g2(f,i,t));break}else{let v=n.map[f];v===void 0&&(v=new v2(f),Iy(n,v)),n=v}}}class Xc{constructor(t,n){this.seq=[],this.map={};const r=t.getProgramParameter(n,t.ACTIVE_UNIFORMS);for(let o=0;o<r;++o){const u=t.getActiveUniform(n,o),c=t.getUniformLocation(n,u.name);_2(u,c,this)}}setValue(t,n,r,o){const u=this.map[n];u!==void 0&&u.setValue(t,r,o)}setOptional(t,n,r){const o=n[r];o!==void 0&&this.setValue(t,r,o)}static upload(t,n,r,o){for(let u=0,c=n.length;u!==c;++u){const f=n[u],p=r[f.id];p.needsUpdate!==!1&&f.setValue(t,p.value,o)}}static seqWithValue(t,n){const r=[];for(let o=0,u=t.length;o!==u;++o){const c=t[o];c.id in n&&r.push(c)}return r}}function zy(i,t,n){const r=i.createShader(t);return i.shaderSource(r,n),i.compileShader(r),r}const y2=37297;let x2=0;function S2(i,t){const n=i.split(`
`),r=[],o=Math.max(t-6,0),u=Math.min(t+6,n.length);for(let c=o;c<u;c++){const f=c+1;r.push(`${f===t?">":" "} ${f}: ${n[c]}`)}return r.join(`
`)}const Vy=new fe;function M2(i){Ae._getMatrix(Vy,Ae.workingColorSpace,i);const t=`mat3( ${Vy.elements.map(n=>n.toFixed(4))} )`;switch(Ae.getTransfer(i)){case $c:return[t,"LinearTransferOETF"];case Fe:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function Hy(i,t,n){const r=i.getShaderParameter(t,i.COMPILE_STATUS),u=(i.getShaderInfoLog(t)||"").trim();if(r&&u==="")return"";const c=/ERROR: 0:(\d+)/.exec(u);if(c){const f=parseInt(c[1]);return n.toUpperCase()+`

`+u+`

`+S2(i.getShaderSource(t),f)}else return u}function E2(i,t){const n=M2(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,"}"].join(`
`)}function T2(i,t){let n;switch(t){case LA:n="Linear";break;case PA:n="Reinhard";break;case NA:n="Cineon";break;case OA:n="ACESFilmic";break;case FA:n="AgX";break;case IA:n="Neutral";break;case BA:n="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),n="Linear"}return"vec3 "+i+"( vec3 color ) { return "+n+"ToneMapping( color ); }"}const Nc=new rt;function b2(){Ae.getLuminanceCoefficients(Nc);const i=Nc.x.toFixed(4),t=Nc.y.toFixed(4),n=Nc.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${n} );`,"	return dot( weights, rgb );","}"].join(`
`)}function A2(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Al).join(`
`)}function R2(i){const t=[];for(const n in i){const r=i[n];r!==!1&&t.push("#define "+n+" "+r)}return t.join(`
`)}function C2(i,t){const n={},r=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let o=0;o<r;o++){const u=i.getActiveAttrib(t,o),c=u.name;let f=1;u.type===i.FLOAT_MAT2&&(f=2),u.type===i.FLOAT_MAT3&&(f=3),u.type===i.FLOAT_MAT4&&(f=4),n[c]={type:u.type,location:i.getAttribLocation(t,c),locationSize:f}}return n}function Al(i){return i!==""}function Gy(i,t){const n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function ky(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const w2=/^[ \t]*#include +<([\w\d./]+)>/gm;function lm(i){return i.replace(w2,U2)}const D2=new Map;function U2(i,t){let n=pe[t];if(n===void 0){const r=D2.get(t);if(r!==void 0)n=pe[r],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,r);else throw new Error("Can not resolve #include <"+t+">")}return lm(n)}const L2=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Xy(i){return i.replace(L2,P2)}function P2(i,t,n,r){let o="";for(let u=parseInt(t);u<parseInt(n);u++)o+=r.replace(/\[\s*i\s*\]/g,"[ "+u+" ]").replace(/UNROLLED_LOOP_INDEX/g,u);return o}function Wy(i){let t=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function N2(i){let t="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===AS?t="SHADOWMAP_TYPE_PCF":i.shadowMapType===fA?t="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===Sa&&(t="SHADOWMAP_TYPE_VSM"),t}function O2(i){let t="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case uo:case co:t="ENVMAP_TYPE_CUBE";break;case lf:t="ENVMAP_TYPE_CUBE_UV";break}return t}function B2(i){let t="ENVMAP_MODE_REFLECTION";if(i.envMap)switch(i.envMapMode){case co:t="ENVMAP_MODE_REFRACTION";break}return t}function F2(i){let t="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case RS:t="ENVMAP_BLENDING_MULTIPLY";break;case DA:t="ENVMAP_BLENDING_MIX";break;case UA:t="ENVMAP_BLENDING_ADD";break}return t}function I2(i){const t=i.envMapCubeUVHeight;if(t===null)return null;const n=Math.log2(t)-2,r=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,n),112)),texelHeight:r,maxMip:n}}function z2(i,t,n,r){const o=i.getContext(),u=n.defines;let c=n.vertexShader,f=n.fragmentShader;const p=N2(n),d=O2(n),m=B2(n),v=F2(n),_=I2(n),x=A2(n),E=R2(u),T=o.createProgram();let S,y,w=n.glslVersion?"#version "+n.glslVersion+`
`:"";n.isRawShaderMaterial?(S=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,E].filter(Al).join(`
`),S.length>0&&(S+=`
`),y=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,E].filter(Al).join(`
`),y.length>0&&(y+=`
`)):(S=[Wy(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,E,n.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",n.batching?"#define USE_BATCHING":"",n.batchingColor?"#define USE_BATCHING_COLOR":"",n.instancing?"#define USE_INSTANCING":"",n.instancingColor?"#define USE_INSTANCING_COLOR":"",n.instancingMorph?"#define USE_INSTANCING_MORPH":"",n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.map?"#define USE_MAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+m:"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.displacementMap?"#define USE_DISPLACEMENTMAP":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.mapUv?"#define MAP_UV "+n.mapUv:"",n.alphaMapUv?"#define ALPHAMAP_UV "+n.alphaMapUv:"",n.lightMapUv?"#define LIGHTMAP_UV "+n.lightMapUv:"",n.aoMapUv?"#define AOMAP_UV "+n.aoMapUv:"",n.emissiveMapUv?"#define EMISSIVEMAP_UV "+n.emissiveMapUv:"",n.bumpMapUv?"#define BUMPMAP_UV "+n.bumpMapUv:"",n.normalMapUv?"#define NORMALMAP_UV "+n.normalMapUv:"",n.displacementMapUv?"#define DISPLACEMENTMAP_UV "+n.displacementMapUv:"",n.metalnessMapUv?"#define METALNESSMAP_UV "+n.metalnessMapUv:"",n.roughnessMapUv?"#define ROUGHNESSMAP_UV "+n.roughnessMapUv:"",n.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+n.anisotropyMapUv:"",n.clearcoatMapUv?"#define CLEARCOATMAP_UV "+n.clearcoatMapUv:"",n.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+n.clearcoatNormalMapUv:"",n.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+n.clearcoatRoughnessMapUv:"",n.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+n.iridescenceMapUv:"",n.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+n.iridescenceThicknessMapUv:"",n.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+n.sheenColorMapUv:"",n.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+n.sheenRoughnessMapUv:"",n.specularMapUv?"#define SPECULARMAP_UV "+n.specularMapUv:"",n.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+n.specularColorMapUv:"",n.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+n.specularIntensityMapUv:"",n.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+n.transmissionMapUv:"",n.thicknessMapUv?"#define THICKNESSMAP_UV "+n.thicknessMapUv:"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.flatShading?"#define FLAT_SHADED":"",n.skinning?"#define USE_SKINNING":"",n.morphTargets?"#define USE_MORPHTARGETS":"",n.morphNormals&&n.flatShading===!1?"#define USE_MORPHNORMALS":"",n.morphColors?"#define USE_MORPHCOLORS":"",n.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+n.morphTextureStride:"",n.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+n.morphTargetsCount:"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+p:"",n.sizeAttenuation?"#define USE_SIZEATTENUATION":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",n.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Al).join(`
`),y=[Wy(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,E,n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",n.map?"#define USE_MAP":"",n.matcap?"#define USE_MATCAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+d:"",n.envMap?"#define "+m:"",n.envMap?"#define "+v:"",_?"#define CUBEUV_TEXEL_WIDTH "+_.texelWidth:"",_?"#define CUBEUV_TEXEL_HEIGHT "+_.texelHeight:"",_?"#define CUBEUV_MAX_MIP "+_.maxMip+".0":"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoat?"#define USE_CLEARCOAT":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.dispersion?"#define USE_DISPERSION":"",n.iridescence?"#define USE_IRIDESCENCE":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaTest?"#define USE_ALPHATEST":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.sheen?"#define USE_SHEEN":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors||n.instancingColor||n.batchingColor?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.gradientMap?"#define USE_GRADIENTMAP":"",n.flatShading?"#define FLAT_SHADED":"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+p:"",n.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",n.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",n.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",n.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",n.toneMapping!==hr?"#define TONE_MAPPING":"",n.toneMapping!==hr?pe.tonemapping_pars_fragment:"",n.toneMapping!==hr?T2("toneMapping",n.toneMapping):"",n.dithering?"#define DITHERING":"",n.opaque?"#define OPAQUE":"",pe.colorspace_pars_fragment,E2("linearToOutputTexel",n.outputColorSpace),b2(),n.useDepthPacking?"#define DEPTH_PACKING "+n.depthPacking:"",`
`].filter(Al).join(`
`)),c=lm(c),c=Gy(c,n),c=ky(c,n),f=lm(f),f=Gy(f,n),f=ky(f,n),c=Xy(c),f=Xy(f),n.isRawShaderMaterial!==!0&&(w=`#version 300 es
`,S=[x,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+S,y=["#define varying in",n.glslVersion===sy?"":"layout(location = 0) out highp vec4 pc_fragColor;",n.glslVersion===sy?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+y);const C=w+S+c,D=w+y+f,N=zy(o,o.VERTEX_SHADER,C),F=zy(o,o.FRAGMENT_SHADER,D);o.attachShader(T,N),o.attachShader(T,F),n.index0AttributeName!==void 0?o.bindAttribLocation(T,0,n.index0AttributeName):n.morphTargets===!0&&o.bindAttribLocation(T,0,"position"),o.linkProgram(T);function z(G){if(i.debug.checkShaderErrors){const nt=o.getProgramInfoLog(T)||"",ct=o.getShaderInfoLog(N)||"",pt=o.getShaderInfoLog(F)||"",ut=nt.trim(),I=ct.trim(),q=pt.trim();let W=!0,yt=!0;if(o.getProgramParameter(T,o.LINK_STATUS)===!1)if(W=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(o,T,N,F);else{const P=Hy(o,N,"vertex"),J=Hy(o,F,"fragment");console.error("THREE.WebGLProgram: Shader Error "+o.getError()+" - VALIDATE_STATUS "+o.getProgramParameter(T,o.VALIDATE_STATUS)+`

Material Name: `+G.name+`
Material Type: `+G.type+`

Program Info Log: `+ut+`
`+P+`
`+J)}else ut!==""?console.warn("THREE.WebGLProgram: Program Info Log:",ut):(I===""||q==="")&&(yt=!1);yt&&(G.diagnostics={runnable:W,programLog:ut,vertexShader:{log:I,prefix:S},fragmentShader:{log:q,prefix:y}})}o.deleteShader(N),o.deleteShader(F),H=new Xc(o,T),U=C2(o,T)}let H;this.getUniforms=function(){return H===void 0&&z(this),H};let U;this.getAttributes=function(){return U===void 0&&z(this),U};let L=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return L===!1&&(L=o.getProgramParameter(T,y2)),L},this.destroy=function(){r.releaseStatesOfProgram(this),o.deleteProgram(T),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=x2++,this.cacheKey=t,this.usedTimes=1,this.program=T,this.vertexShader=N,this.fragmentShader=F,this}let V2=0;class H2{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const n=t.vertexShader,r=t.fragmentShader,o=this._getShaderStage(n),u=this._getShaderStage(r),c=this._getShaderCacheForMaterial(t);return c.has(o)===!1&&(c.add(o),o.usedTimes++),c.has(u)===!1&&(c.add(u),u.usedTimes++),this}remove(t){const n=this.materialCache.get(t);for(const r of n)r.usedTimes--,r.usedTimes===0&&this.shaderCache.delete(r.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const n=this.materialCache;let r=n.get(t);return r===void 0&&(r=new Set,n.set(t,r)),r}_getShaderStage(t){const n=this.shaderCache;let r=n.get(t);return r===void 0&&(r=new G2(t),n.set(t,r)),r}}class G2{constructor(t){this.id=V2++,this.code=t,this.usedTimes=0}}function k2(i,t,n,r,o,u,c){const f=new VS,p=new H2,d=new Set,m=[],v=o.logarithmicDepthBuffer,_=o.vertexTextures;let x=o.precision;const E={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function T(U){return d.add(U),U===0?"uv":`uv${U}`}function S(U,L,G,nt,ct){const pt=nt.fog,ut=ct.geometry,I=U.isMeshStandardMaterial?nt.environment:null,q=(U.isMeshStandardMaterial?n:t).get(U.envMap||I),W=q&&q.mapping===lf?q.image.height:null,yt=E[U.type];U.precision!==null&&(x=o.getMaxPrecision(U.precision),x!==U.precision&&console.warn("THREE.WebGLProgram.getParameters:",U.precision,"not supported, using",x,"instead."));const P=ut.morphAttributes.position||ut.morphAttributes.normal||ut.morphAttributes.color,J=P!==void 0?P.length:0;let xt=0;ut.morphAttributes.position!==void 0&&(xt=1),ut.morphAttributes.normal!==void 0&&(xt=2),ut.morphAttributes.color!==void 0&&(xt=3);let St,Ut,Vt,et;if(yt){const Ee=qi[yt];St=Ee.vertexShader,Ut=Ee.fragmentShader}else St=U.vertexShader,Ut=U.fragmentShader,p.update(U),Vt=p.getVertexShaderID(U),et=p.getFragmentShaderID(U);const vt=i.getRenderTarget(),At=i.state.buffers.depth.getReversed(),Qt=ct.isInstancedMesh===!0,Yt=ct.isBatchedMesh===!0,me=!!U.map,un=!!U.matcap,V=!!q,Le=!!U.aoMap,oe=!!U.lightMap,ie=!!U.bumpMap,Ot=!!U.normalMap,He=!!U.displacementMap,Gt=!!U.emissiveMap,le=!!U.metalnessMap,je=!!U.roughnessMap,Ke=U.anisotropy>0,O=U.clearcoat>0,b=U.dispersion>0,tt=U.iridescence>0,ft=U.sheen>0,mt=U.transmission>0,lt=Ke&&!!U.anisotropyMap,Bt=O&&!!U.clearcoatMap,Rt=O&&!!U.clearcoatNormalMap,Xt=O&&!!U.clearcoatRoughnessMap,jt=tt&&!!U.iridescenceMap,Mt=tt&&!!U.iridescenceThicknessMap,Lt=ft&&!!U.sheenColorMap,Zt=ft&&!!U.sheenRoughnessMap,kt=!!U.specularMap,wt=!!U.specularColorMap,ue=!!U.specularIntensityMap,X=mt&&!!U.transmissionMap,bt=mt&&!!U.thicknessMap,Ct=!!U.gradientMap,Ft=!!U.alphaMap,Et=U.alphaTest>0,_t=!!U.alphaHash,Ht=!!U.extensions;let se=hr;U.toneMapped&&(vt===null||vt.isXRRenderTarget===!0)&&(se=i.toneMapping);const Ce={shaderID:yt,shaderType:U.type,shaderName:U.name,vertexShader:St,fragmentShader:Ut,defines:U.defines,customVertexShaderID:Vt,customFragmentShaderID:et,isRawShaderMaterial:U.isRawShaderMaterial===!0,glslVersion:U.glslVersion,precision:x,batching:Yt,batchingColor:Yt&&ct._colorsTexture!==null,instancing:Qt,instancingColor:Qt&&ct.instanceColor!==null,instancingMorph:Qt&&ct.morphTexture!==null,supportsVertexTextures:_,outputColorSpace:vt===null?i.outputColorSpace:vt.isXRRenderTarget===!0?vt.texture.colorSpace:fo,alphaToCoverage:!!U.alphaToCoverage,map:me,matcap:un,envMap:V,envMapMode:V&&q.mapping,envMapCubeUVHeight:W,aoMap:Le,lightMap:oe,bumpMap:ie,normalMap:Ot,displacementMap:_&&He,emissiveMap:Gt,normalMapObjectSpace:Ot&&U.normalMapType===kA,normalMapTangentSpace:Ot&&U.normalMapType===GA,metalnessMap:le,roughnessMap:je,anisotropy:Ke,anisotropyMap:lt,clearcoat:O,clearcoatMap:Bt,clearcoatNormalMap:Rt,clearcoatRoughnessMap:Xt,dispersion:b,iridescence:tt,iridescenceMap:jt,iridescenceThicknessMap:Mt,sheen:ft,sheenColorMap:Lt,sheenRoughnessMap:Zt,specularMap:kt,specularColorMap:wt,specularIntensityMap:ue,transmission:mt,transmissionMap:X,thicknessMap:bt,gradientMap:Ct,opaque:U.transparent===!1&&U.blending===ro&&U.alphaToCoverage===!1,alphaMap:Ft,alphaTest:Et,alphaHash:_t,combine:U.combine,mapUv:me&&T(U.map.channel),aoMapUv:Le&&T(U.aoMap.channel),lightMapUv:oe&&T(U.lightMap.channel),bumpMapUv:ie&&T(U.bumpMap.channel),normalMapUv:Ot&&T(U.normalMap.channel),displacementMapUv:He&&T(U.displacementMap.channel),emissiveMapUv:Gt&&T(U.emissiveMap.channel),metalnessMapUv:le&&T(U.metalnessMap.channel),roughnessMapUv:je&&T(U.roughnessMap.channel),anisotropyMapUv:lt&&T(U.anisotropyMap.channel),clearcoatMapUv:Bt&&T(U.clearcoatMap.channel),clearcoatNormalMapUv:Rt&&T(U.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Xt&&T(U.clearcoatRoughnessMap.channel),iridescenceMapUv:jt&&T(U.iridescenceMap.channel),iridescenceThicknessMapUv:Mt&&T(U.iridescenceThicknessMap.channel),sheenColorMapUv:Lt&&T(U.sheenColorMap.channel),sheenRoughnessMapUv:Zt&&T(U.sheenRoughnessMap.channel),specularMapUv:kt&&T(U.specularMap.channel),specularColorMapUv:wt&&T(U.specularColorMap.channel),specularIntensityMapUv:ue&&T(U.specularIntensityMap.channel),transmissionMapUv:X&&T(U.transmissionMap.channel),thicknessMapUv:bt&&T(U.thicknessMap.channel),alphaMapUv:Ft&&T(U.alphaMap.channel),vertexTangents:!!ut.attributes.tangent&&(Ot||Ke),vertexColors:U.vertexColors,vertexAlphas:U.vertexColors===!0&&!!ut.attributes.color&&ut.attributes.color.itemSize===4,pointsUvs:ct.isPoints===!0&&!!ut.attributes.uv&&(me||Ft),fog:!!pt,useFog:U.fog===!0,fogExp2:!!pt&&pt.isFogExp2,flatShading:U.flatShading===!0&&U.wireframe===!1,sizeAttenuation:U.sizeAttenuation===!0,logarithmicDepthBuffer:v,reversedDepthBuffer:At,skinning:ct.isSkinnedMesh===!0,morphTargets:ut.morphAttributes.position!==void 0,morphNormals:ut.morphAttributes.normal!==void 0,morphColors:ut.morphAttributes.color!==void 0,morphTargetsCount:J,morphTextureStride:xt,numDirLights:L.directional.length,numPointLights:L.point.length,numSpotLights:L.spot.length,numSpotLightMaps:L.spotLightMap.length,numRectAreaLights:L.rectArea.length,numHemiLights:L.hemi.length,numDirLightShadows:L.directionalShadowMap.length,numPointLightShadows:L.pointShadowMap.length,numSpotLightShadows:L.spotShadowMap.length,numSpotLightShadowsWithMaps:L.numSpotLightShadowsWithMaps,numLightProbes:L.numLightProbes,numClippingPlanes:c.numPlanes,numClipIntersection:c.numIntersection,dithering:U.dithering,shadowMapEnabled:i.shadowMap.enabled&&G.length>0,shadowMapType:i.shadowMap.type,toneMapping:se,decodeVideoTexture:me&&U.map.isVideoTexture===!0&&Ae.getTransfer(U.map.colorSpace)===Fe,decodeVideoTextureEmissive:Gt&&U.emissiveMap.isVideoTexture===!0&&Ae.getTransfer(U.emissiveMap.colorSpace)===Fe,premultipliedAlpha:U.premultipliedAlpha,doubleSided:U.side===Ma,flipSided:U.side===$n,useDepthPacking:U.depthPacking>=0,depthPacking:U.depthPacking||0,index0AttributeName:U.index0AttributeName,extensionClipCullDistance:Ht&&U.extensions.clipCullDistance===!0&&r.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ht&&U.extensions.multiDraw===!0||Yt)&&r.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:r.has("KHR_parallel_shader_compile"),customProgramCacheKey:U.customProgramCacheKey()};return Ce.vertexUv1s=d.has(1),Ce.vertexUv2s=d.has(2),Ce.vertexUv3s=d.has(3),d.clear(),Ce}function y(U){const L=[];if(U.shaderID?L.push(U.shaderID):(L.push(U.customVertexShaderID),L.push(U.customFragmentShaderID)),U.defines!==void 0)for(const G in U.defines)L.push(G),L.push(U.defines[G]);return U.isRawShaderMaterial===!1&&(w(L,U),C(L,U),L.push(i.outputColorSpace)),L.push(U.customProgramCacheKey),L.join()}function w(U,L){U.push(L.precision),U.push(L.outputColorSpace),U.push(L.envMapMode),U.push(L.envMapCubeUVHeight),U.push(L.mapUv),U.push(L.alphaMapUv),U.push(L.lightMapUv),U.push(L.aoMapUv),U.push(L.bumpMapUv),U.push(L.normalMapUv),U.push(L.displacementMapUv),U.push(L.emissiveMapUv),U.push(L.metalnessMapUv),U.push(L.roughnessMapUv),U.push(L.anisotropyMapUv),U.push(L.clearcoatMapUv),U.push(L.clearcoatNormalMapUv),U.push(L.clearcoatRoughnessMapUv),U.push(L.iridescenceMapUv),U.push(L.iridescenceThicknessMapUv),U.push(L.sheenColorMapUv),U.push(L.sheenRoughnessMapUv),U.push(L.specularMapUv),U.push(L.specularColorMapUv),U.push(L.specularIntensityMapUv),U.push(L.transmissionMapUv),U.push(L.thicknessMapUv),U.push(L.combine),U.push(L.fogExp2),U.push(L.sizeAttenuation),U.push(L.morphTargetsCount),U.push(L.morphAttributeCount),U.push(L.numDirLights),U.push(L.numPointLights),U.push(L.numSpotLights),U.push(L.numSpotLightMaps),U.push(L.numHemiLights),U.push(L.numRectAreaLights),U.push(L.numDirLightShadows),U.push(L.numPointLightShadows),U.push(L.numSpotLightShadows),U.push(L.numSpotLightShadowsWithMaps),U.push(L.numLightProbes),U.push(L.shadowMapType),U.push(L.toneMapping),U.push(L.numClippingPlanes),U.push(L.numClipIntersection),U.push(L.depthPacking)}function C(U,L){f.disableAll(),L.supportsVertexTextures&&f.enable(0),L.instancing&&f.enable(1),L.instancingColor&&f.enable(2),L.instancingMorph&&f.enable(3),L.matcap&&f.enable(4),L.envMap&&f.enable(5),L.normalMapObjectSpace&&f.enable(6),L.normalMapTangentSpace&&f.enable(7),L.clearcoat&&f.enable(8),L.iridescence&&f.enable(9),L.alphaTest&&f.enable(10),L.vertexColors&&f.enable(11),L.vertexAlphas&&f.enable(12),L.vertexUv1s&&f.enable(13),L.vertexUv2s&&f.enable(14),L.vertexUv3s&&f.enable(15),L.vertexTangents&&f.enable(16),L.anisotropy&&f.enable(17),L.alphaHash&&f.enable(18),L.batching&&f.enable(19),L.dispersion&&f.enable(20),L.batchingColor&&f.enable(21),L.gradientMap&&f.enable(22),U.push(f.mask),f.disableAll(),L.fog&&f.enable(0),L.useFog&&f.enable(1),L.flatShading&&f.enable(2),L.logarithmicDepthBuffer&&f.enable(3),L.reversedDepthBuffer&&f.enable(4),L.skinning&&f.enable(5),L.morphTargets&&f.enable(6),L.morphNormals&&f.enable(7),L.morphColors&&f.enable(8),L.premultipliedAlpha&&f.enable(9),L.shadowMapEnabled&&f.enable(10),L.doubleSided&&f.enable(11),L.flipSided&&f.enable(12),L.useDepthPacking&&f.enable(13),L.dithering&&f.enable(14),L.transmission&&f.enable(15),L.sheen&&f.enable(16),L.opaque&&f.enable(17),L.pointsUvs&&f.enable(18),L.decodeVideoTexture&&f.enable(19),L.decodeVideoTextureEmissive&&f.enable(20),L.alphaToCoverage&&f.enable(21),U.push(f.mask)}function D(U){const L=E[U.type];let G;if(L){const nt=qi[L];G=y1.clone(nt.uniforms)}else G=U.uniforms;return G}function N(U,L){let G;for(let nt=0,ct=m.length;nt<ct;nt++){const pt=m[nt];if(pt.cacheKey===L){G=pt,++G.usedTimes;break}}return G===void 0&&(G=new z2(i,L,U,u),m.push(G)),G}function F(U){if(--U.usedTimes===0){const L=m.indexOf(U);m[L]=m[m.length-1],m.pop(),U.destroy()}}function z(U){p.remove(U)}function H(){p.dispose()}return{getParameters:S,getProgramCacheKey:y,getUniforms:D,acquireProgram:N,releaseProgram:F,releaseShaderCache:z,programs:m,dispose:H}}function X2(){let i=new WeakMap;function t(c){return i.has(c)}function n(c){let f=i.get(c);return f===void 0&&(f={},i.set(c,f)),f}function r(c){i.delete(c)}function o(c,f,p){i.get(c)[f]=p}function u(){i=new WeakMap}return{has:t,get:n,remove:r,update:o,dispose:u}}function W2(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.z!==t.z?i.z-t.z:i.id-t.id}function qy(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function Yy(){const i=[];let t=0;const n=[],r=[],o=[];function u(){t=0,n.length=0,r.length=0,o.length=0}function c(v,_,x,E,T,S){let y=i[t];return y===void 0?(y={id:v.id,object:v,geometry:_,material:x,groupOrder:E,renderOrder:v.renderOrder,z:T,group:S},i[t]=y):(y.id=v.id,y.object=v,y.geometry=_,y.material=x,y.groupOrder=E,y.renderOrder=v.renderOrder,y.z=T,y.group=S),t++,y}function f(v,_,x,E,T,S){const y=c(v,_,x,E,T,S);x.transmission>0?r.push(y):x.transparent===!0?o.push(y):n.push(y)}function p(v,_,x,E,T,S){const y=c(v,_,x,E,T,S);x.transmission>0?r.unshift(y):x.transparent===!0?o.unshift(y):n.unshift(y)}function d(v,_){n.length>1&&n.sort(v||W2),r.length>1&&r.sort(_||qy),o.length>1&&o.sort(_||qy)}function m(){for(let v=t,_=i.length;v<_;v++){const x=i[v];if(x.id===null)break;x.id=null,x.object=null,x.geometry=null,x.material=null,x.group=null}}return{opaque:n,transmissive:r,transparent:o,init:u,push:f,unshift:p,finish:m,sort:d}}function q2(){let i=new WeakMap;function t(r,o){const u=i.get(r);let c;return u===void 0?(c=new Yy,i.set(r,[c])):o>=u.length?(c=new Yy,u.push(c)):c=u[o],c}function n(){i=new WeakMap}return{get:t,dispose:n}}function Y2(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let n;switch(t.type){case"DirectionalLight":n={direction:new rt,color:new Ie};break;case"SpotLight":n={position:new rt,direction:new rt,color:new Ie,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":n={position:new rt,color:new Ie,distance:0,decay:0};break;case"HemisphereLight":n={direction:new rt,skyColor:new Ie,groundColor:new Ie};break;case"RectAreaLight":n={color:new Ie,position:new rt,halfWidth:new rt,halfHeight:new rt};break}return i[t.id]=n,n}}}function j2(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let n;switch(t.type){case"DirectionalLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"SpotLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"PointLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=n,n}}}let K2=0;function Z2(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function Q2(i){const t=new Y2,n=j2(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let d=0;d<9;d++)r.probe.push(new rt);const o=new rt,u=new yn,c=new yn;function f(d){let m=0,v=0,_=0;for(let U=0;U<9;U++)r.probe[U].set(0,0,0);let x=0,E=0,T=0,S=0,y=0,w=0,C=0,D=0,N=0,F=0,z=0;d.sort(Z2);for(let U=0,L=d.length;U<L;U++){const G=d[U],nt=G.color,ct=G.intensity,pt=G.distance,ut=G.shadow&&G.shadow.map?G.shadow.map.texture:null;if(G.isAmbientLight)m+=nt.r*ct,v+=nt.g*ct,_+=nt.b*ct;else if(G.isLightProbe){for(let I=0;I<9;I++)r.probe[I].addScaledVector(G.sh.coefficients[I],ct);z++}else if(G.isDirectionalLight){const I=t.get(G);if(I.color.copy(G.color).multiplyScalar(G.intensity),G.castShadow){const q=G.shadow,W=n.get(G);W.shadowIntensity=q.intensity,W.shadowBias=q.bias,W.shadowNormalBias=q.normalBias,W.shadowRadius=q.radius,W.shadowMapSize=q.mapSize,r.directionalShadow[x]=W,r.directionalShadowMap[x]=ut,r.directionalShadowMatrix[x]=G.shadow.matrix,w++}r.directional[x]=I,x++}else if(G.isSpotLight){const I=t.get(G);I.position.setFromMatrixPosition(G.matrixWorld),I.color.copy(nt).multiplyScalar(ct),I.distance=pt,I.coneCos=Math.cos(G.angle),I.penumbraCos=Math.cos(G.angle*(1-G.penumbra)),I.decay=G.decay,r.spot[T]=I;const q=G.shadow;if(G.map&&(r.spotLightMap[N]=G.map,N++,q.updateMatrices(G),G.castShadow&&F++),r.spotLightMatrix[T]=q.matrix,G.castShadow){const W=n.get(G);W.shadowIntensity=q.intensity,W.shadowBias=q.bias,W.shadowNormalBias=q.normalBias,W.shadowRadius=q.radius,W.shadowMapSize=q.mapSize,r.spotShadow[T]=W,r.spotShadowMap[T]=ut,D++}T++}else if(G.isRectAreaLight){const I=t.get(G);I.color.copy(nt).multiplyScalar(ct),I.halfWidth.set(G.width*.5,0,0),I.halfHeight.set(0,G.height*.5,0),r.rectArea[S]=I,S++}else if(G.isPointLight){const I=t.get(G);if(I.color.copy(G.color).multiplyScalar(G.intensity),I.distance=G.distance,I.decay=G.decay,G.castShadow){const q=G.shadow,W=n.get(G);W.shadowIntensity=q.intensity,W.shadowBias=q.bias,W.shadowNormalBias=q.normalBias,W.shadowRadius=q.radius,W.shadowMapSize=q.mapSize,W.shadowCameraNear=q.camera.near,W.shadowCameraFar=q.camera.far,r.pointShadow[E]=W,r.pointShadowMap[E]=ut,r.pointShadowMatrix[E]=G.shadow.matrix,C++}r.point[E]=I,E++}else if(G.isHemisphereLight){const I=t.get(G);I.skyColor.copy(G.color).multiplyScalar(ct),I.groundColor.copy(G.groundColor).multiplyScalar(ct),r.hemi[y]=I,y++}}S>0&&(i.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=Nt.LTC_FLOAT_1,r.rectAreaLTC2=Nt.LTC_FLOAT_2):(r.rectAreaLTC1=Nt.LTC_HALF_1,r.rectAreaLTC2=Nt.LTC_HALF_2)),r.ambient[0]=m,r.ambient[1]=v,r.ambient[2]=_;const H=r.hash;(H.directionalLength!==x||H.pointLength!==E||H.spotLength!==T||H.rectAreaLength!==S||H.hemiLength!==y||H.numDirectionalShadows!==w||H.numPointShadows!==C||H.numSpotShadows!==D||H.numSpotMaps!==N||H.numLightProbes!==z)&&(r.directional.length=x,r.spot.length=T,r.rectArea.length=S,r.point.length=E,r.hemi.length=y,r.directionalShadow.length=w,r.directionalShadowMap.length=w,r.pointShadow.length=C,r.pointShadowMap.length=C,r.spotShadow.length=D,r.spotShadowMap.length=D,r.directionalShadowMatrix.length=w,r.pointShadowMatrix.length=C,r.spotLightMatrix.length=D+N-F,r.spotLightMap.length=N,r.numSpotLightShadowsWithMaps=F,r.numLightProbes=z,H.directionalLength=x,H.pointLength=E,H.spotLength=T,H.rectAreaLength=S,H.hemiLength=y,H.numDirectionalShadows=w,H.numPointShadows=C,H.numSpotShadows=D,H.numSpotMaps=N,H.numLightProbes=z,r.version=K2++)}function p(d,m){let v=0,_=0,x=0,E=0,T=0;const S=m.matrixWorldInverse;for(let y=0,w=d.length;y<w;y++){const C=d[y];if(C.isDirectionalLight){const D=r.directional[v];D.direction.setFromMatrixPosition(C.matrixWorld),o.setFromMatrixPosition(C.target.matrixWorld),D.direction.sub(o),D.direction.transformDirection(S),v++}else if(C.isSpotLight){const D=r.spot[x];D.position.setFromMatrixPosition(C.matrixWorld),D.position.applyMatrix4(S),D.direction.setFromMatrixPosition(C.matrixWorld),o.setFromMatrixPosition(C.target.matrixWorld),D.direction.sub(o),D.direction.transformDirection(S),x++}else if(C.isRectAreaLight){const D=r.rectArea[E];D.position.setFromMatrixPosition(C.matrixWorld),D.position.applyMatrix4(S),c.identity(),u.copy(C.matrixWorld),u.premultiply(S),c.extractRotation(u),D.halfWidth.set(C.width*.5,0,0),D.halfHeight.set(0,C.height*.5,0),D.halfWidth.applyMatrix4(c),D.halfHeight.applyMatrix4(c),E++}else if(C.isPointLight){const D=r.point[_];D.position.setFromMatrixPosition(C.matrixWorld),D.position.applyMatrix4(S),_++}else if(C.isHemisphereLight){const D=r.hemi[T];D.direction.setFromMatrixPosition(C.matrixWorld),D.direction.transformDirection(S),T++}}}return{setup:f,setupView:p,state:r}}function jy(i){const t=new Q2(i),n=[],r=[];function o(m){d.camera=m,n.length=0,r.length=0}function u(m){n.push(m)}function c(m){r.push(m)}function f(){t.setup(n)}function p(m){t.setupView(n,m)}const d={lightsArray:n,shadowsArray:r,camera:null,lights:t,transmissionRenderTarget:{}};return{init:o,state:d,setupLights:f,setupLightsView:p,pushLight:u,pushShadow:c}}function $2(i){let t=new WeakMap;function n(o,u=0){const c=t.get(o);let f;return c===void 0?(f=new jy(i),t.set(o,[f])):u>=c.length?(f=new jy(i),c.push(f)):f=c[u],f}function r(){t=new WeakMap}return{get:n,dispose:r}}const J2=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,tD=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function eD(i,t,n){let r=new jS;const o=new we,u=new we,c=new rn,f=new C1({depthPacking:HA}),p=new w1,d={},m=n.maxTextureSize,v={[pr]:$n,[$n]:pr,[Ma]:Ma},_=new $i({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new we},radius:{value:4}},vertexShader:J2,fragmentShader:tD}),x=_.clone();x.defines.HORIZONTAL_PASS=1;const E=new is;E.setAttribute("position",new ji(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const T=new Fi(E,_),S=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=AS;let y=this.type;this.render=function(F,z,H){if(S.enabled===!1||S.autoUpdate===!1&&S.needsUpdate===!1||F.length===0)return;const U=i.getRenderTarget(),L=i.getActiveCubeFace(),G=i.getActiveMipmapLevel(),nt=i.state;nt.setBlending(fr),nt.buffers.depth.getReversed()===!0?nt.buffers.color.setClear(0,0,0,0):nt.buffers.color.setClear(1,1,1,1),nt.buffers.depth.setTest(!0),nt.setScissorTest(!1);const ct=y!==Sa&&this.type===Sa,pt=y===Sa&&this.type!==Sa;for(let ut=0,I=F.length;ut<I;ut++){const q=F[ut],W=q.shadow;if(W===void 0){console.warn("THREE.WebGLShadowMap:",q,"has no shadow.");continue}if(W.autoUpdate===!1&&W.needsUpdate===!1)continue;o.copy(W.mapSize);const yt=W.getFrameExtents();if(o.multiply(yt),u.copy(W.mapSize),(o.x>m||o.y>m)&&(o.x>m&&(u.x=Math.floor(m/yt.x),o.x=u.x*yt.x,W.mapSize.x=u.x),o.y>m&&(u.y=Math.floor(m/yt.y),o.y=u.y*yt.y,W.mapSize.y=u.y)),W.map===null||ct===!0||pt===!0){const J=this.type!==Sa?{minFilter:Ii,magFilter:Ii}:{};W.map!==null&&W.map.dispose(),W.map=new Aa(o.x,o.y,J),W.map.texture.name=q.name+".shadowMap",W.camera.updateProjectionMatrix()}i.setRenderTarget(W.map),i.clear();const P=W.getViewportCount();for(let J=0;J<P;J++){const xt=W.getViewport(J);c.set(u.x*xt.x,u.y*xt.y,u.x*xt.z,u.y*xt.w),nt.viewport(c),W.updateMatrices(q,J),r=W.getFrustum(),D(z,H,W.camera,q,this.type)}W.isPointLightShadow!==!0&&this.type===Sa&&w(W,H),W.needsUpdate=!1}y=this.type,S.needsUpdate=!1,i.setRenderTarget(U,L,G)};function w(F,z){const H=t.update(T);_.defines.VSM_SAMPLES!==F.blurSamples&&(_.defines.VSM_SAMPLES=F.blurSamples,x.defines.VSM_SAMPLES=F.blurSamples,_.needsUpdate=!0,x.needsUpdate=!0),F.mapPass===null&&(F.mapPass=new Aa(o.x,o.y)),_.uniforms.shadow_pass.value=F.map.texture,_.uniforms.resolution.value=F.mapSize,_.uniforms.radius.value=F.radius,i.setRenderTarget(F.mapPass),i.clear(),i.renderBufferDirect(z,null,H,_,T,null),x.uniforms.shadow_pass.value=F.mapPass.texture,x.uniforms.resolution.value=F.mapSize,x.uniforms.radius.value=F.radius,i.setRenderTarget(F.map),i.clear(),i.renderBufferDirect(z,null,H,x,T,null)}function C(F,z,H,U){let L=null;const G=H.isPointLight===!0?F.customDistanceMaterial:F.customDepthMaterial;if(G!==void 0)L=G;else if(L=H.isPointLight===!0?p:f,i.localClippingEnabled&&z.clipShadows===!0&&Array.isArray(z.clippingPlanes)&&z.clippingPlanes.length!==0||z.displacementMap&&z.displacementScale!==0||z.alphaMap&&z.alphaTest>0||z.map&&z.alphaTest>0||z.alphaToCoverage===!0){const nt=L.uuid,ct=z.uuid;let pt=d[nt];pt===void 0&&(pt={},d[nt]=pt);let ut=pt[ct];ut===void 0&&(ut=L.clone(),pt[ct]=ut,z.addEventListener("dispose",N)),L=ut}if(L.visible=z.visible,L.wireframe=z.wireframe,U===Sa?L.side=z.shadowSide!==null?z.shadowSide:z.side:L.side=z.shadowSide!==null?z.shadowSide:v[z.side],L.alphaMap=z.alphaMap,L.alphaTest=z.alphaToCoverage===!0?.5:z.alphaTest,L.map=z.map,L.clipShadows=z.clipShadows,L.clippingPlanes=z.clippingPlanes,L.clipIntersection=z.clipIntersection,L.displacementMap=z.displacementMap,L.displacementScale=z.displacementScale,L.displacementBias=z.displacementBias,L.wireframeLinewidth=z.wireframeLinewidth,L.linewidth=z.linewidth,H.isPointLight===!0&&L.isMeshDistanceMaterial===!0){const nt=i.properties.get(L);nt.light=H}return L}function D(F,z,H,U,L){if(F.visible===!1)return;if(F.layers.test(z.layers)&&(F.isMesh||F.isLine||F.isPoints)&&(F.castShadow||F.receiveShadow&&L===Sa)&&(!F.frustumCulled||r.intersectsObject(F))){F.modelViewMatrix.multiplyMatrices(H.matrixWorldInverse,F.matrixWorld);const ct=t.update(F),pt=F.material;if(Array.isArray(pt)){const ut=ct.groups;for(let I=0,q=ut.length;I<q;I++){const W=ut[I],yt=pt[W.materialIndex];if(yt&&yt.visible){const P=C(F,yt,U,L);F.onBeforeShadow(i,F,z,H,ct,P,W),i.renderBufferDirect(H,null,ct,P,F,W),F.onAfterShadow(i,F,z,H,ct,P,W)}}}else if(pt.visible){const ut=C(F,pt,U,L);F.onBeforeShadow(i,F,z,H,ct,ut,null),i.renderBufferDirect(H,null,ct,ut,F,null),F.onAfterShadow(i,F,z,H,ct,ut,null)}}const nt=F.children;for(let ct=0,pt=nt.length;ct<pt;ct++)D(nt[ct],z,H,U,L)}function N(F){F.target.removeEventListener("dispose",N);for(const H in d){const U=d[H],L=F.target.uuid;L in U&&(U[L].dispose(),delete U[L])}}}const nD={[Mp]:Ep,[Tp]:Rp,[bp]:Cp,[lo]:Ap,[Ep]:Mp,[Rp]:Tp,[Cp]:bp,[Ap]:lo};function iD(i,t){function n(){let X=!1;const bt=new rn;let Ct=null;const Ft=new rn(0,0,0,0);return{setMask:function(Et){Ct!==Et&&!X&&(i.colorMask(Et,Et,Et,Et),Ct=Et)},setLocked:function(Et){X=Et},setClear:function(Et,_t,Ht,se,Ce){Ce===!0&&(Et*=se,_t*=se,Ht*=se),bt.set(Et,_t,Ht,se),Ft.equals(bt)===!1&&(i.clearColor(Et,_t,Ht,se),Ft.copy(bt))},reset:function(){X=!1,Ct=null,Ft.set(-1,0,0,0)}}}function r(){let X=!1,bt=!1,Ct=null,Ft=null,Et=null;return{setReversed:function(_t){if(bt!==_t){const Ht=t.get("EXT_clip_control");_t?Ht.clipControlEXT(Ht.LOWER_LEFT_EXT,Ht.ZERO_TO_ONE_EXT):Ht.clipControlEXT(Ht.LOWER_LEFT_EXT,Ht.NEGATIVE_ONE_TO_ONE_EXT),bt=_t;const se=Et;Et=null,this.setClear(se)}},getReversed:function(){return bt},setTest:function(_t){_t?vt(i.DEPTH_TEST):At(i.DEPTH_TEST)},setMask:function(_t){Ct!==_t&&!X&&(i.depthMask(_t),Ct=_t)},setFunc:function(_t){if(bt&&(_t=nD[_t]),Ft!==_t){switch(_t){case Mp:i.depthFunc(i.NEVER);break;case Ep:i.depthFunc(i.ALWAYS);break;case Tp:i.depthFunc(i.LESS);break;case lo:i.depthFunc(i.LEQUAL);break;case bp:i.depthFunc(i.EQUAL);break;case Ap:i.depthFunc(i.GEQUAL);break;case Rp:i.depthFunc(i.GREATER);break;case Cp:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Ft=_t}},setLocked:function(_t){X=_t},setClear:function(_t){Et!==_t&&(bt&&(_t=1-_t),i.clearDepth(_t),Et=_t)},reset:function(){X=!1,Ct=null,Ft=null,Et=null,bt=!1}}}function o(){let X=!1,bt=null,Ct=null,Ft=null,Et=null,_t=null,Ht=null,se=null,Ce=null;return{setTest:function(Ee){X||(Ee?vt(i.STENCIL_TEST):At(i.STENCIL_TEST))},setMask:function(Ee){bt!==Ee&&!X&&(i.stencilMask(Ee),bt=Ee)},setFunc:function(Ee,Ti,mn){(Ct!==Ee||Ft!==Ti||Et!==mn)&&(i.stencilFunc(Ee,Ti,mn),Ct=Ee,Ft=Ti,Et=mn)},setOp:function(Ee,Ti,mn){(_t!==Ee||Ht!==Ti||se!==mn)&&(i.stencilOp(Ee,Ti,mn),_t=Ee,Ht=Ti,se=mn)},setLocked:function(Ee){X=Ee},setClear:function(Ee){Ce!==Ee&&(i.clearStencil(Ee),Ce=Ee)},reset:function(){X=!1,bt=null,Ct=null,Ft=null,Et=null,_t=null,Ht=null,se=null,Ce=null}}}const u=new n,c=new r,f=new o,p=new WeakMap,d=new WeakMap;let m={},v={},_=new WeakMap,x=[],E=null,T=!1,S=null,y=null,w=null,C=null,D=null,N=null,F=null,z=new Ie(0,0,0),H=0,U=!1,L=null,G=null,nt=null,ct=null,pt=null;const ut=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let I=!1,q=0;const W=i.getParameter(i.VERSION);W.indexOf("WebGL")!==-1?(q=parseFloat(/^WebGL (\d)/.exec(W)[1]),I=q>=1):W.indexOf("OpenGL ES")!==-1&&(q=parseFloat(/^OpenGL ES (\d)/.exec(W)[1]),I=q>=2);let yt=null,P={};const J=i.getParameter(i.SCISSOR_BOX),xt=i.getParameter(i.VIEWPORT),St=new rn().fromArray(J),Ut=new rn().fromArray(xt);function Vt(X,bt,Ct,Ft){const Et=new Uint8Array(4),_t=i.createTexture();i.bindTexture(X,_t),i.texParameteri(X,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(X,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Ht=0;Ht<Ct;Ht++)X===i.TEXTURE_3D||X===i.TEXTURE_2D_ARRAY?i.texImage3D(bt,0,i.RGBA,1,1,Ft,0,i.RGBA,i.UNSIGNED_BYTE,Et):i.texImage2D(bt+Ht,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Et);return _t}const et={};et[i.TEXTURE_2D]=Vt(i.TEXTURE_2D,i.TEXTURE_2D,1),et[i.TEXTURE_CUBE_MAP]=Vt(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),et[i.TEXTURE_2D_ARRAY]=Vt(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),et[i.TEXTURE_3D]=Vt(i.TEXTURE_3D,i.TEXTURE_3D,1,1),u.setClear(0,0,0,1),c.setClear(1),f.setClear(0),vt(i.DEPTH_TEST),c.setFunc(lo),ie(!1),Ot(ty),vt(i.CULL_FACE),Le(fr);function vt(X){m[X]!==!0&&(i.enable(X),m[X]=!0)}function At(X){m[X]!==!1&&(i.disable(X),m[X]=!1)}function Qt(X,bt){return v[X]!==bt?(i.bindFramebuffer(X,bt),v[X]=bt,X===i.DRAW_FRAMEBUFFER&&(v[i.FRAMEBUFFER]=bt),X===i.FRAMEBUFFER&&(v[i.DRAW_FRAMEBUFFER]=bt),!0):!1}function Yt(X,bt){let Ct=x,Ft=!1;if(X){Ct=_.get(bt),Ct===void 0&&(Ct=[],_.set(bt,Ct));const Et=X.textures;if(Ct.length!==Et.length||Ct[0]!==i.COLOR_ATTACHMENT0){for(let _t=0,Ht=Et.length;_t<Ht;_t++)Ct[_t]=i.COLOR_ATTACHMENT0+_t;Ct.length=Et.length,Ft=!0}}else Ct[0]!==i.BACK&&(Ct[0]=i.BACK,Ft=!0);Ft&&i.drawBuffers(Ct)}function me(X){return E!==X?(i.useProgram(X),E=X,!0):!1}const un={[Wr]:i.FUNC_ADD,[dA]:i.FUNC_SUBTRACT,[pA]:i.FUNC_REVERSE_SUBTRACT};un[mA]=i.MIN,un[gA]=i.MAX;const V={[vA]:i.ZERO,[_A]:i.ONE,[yA]:i.SRC_COLOR,[xp]:i.SRC_ALPHA,[bA]:i.SRC_ALPHA_SATURATE,[EA]:i.DST_COLOR,[SA]:i.DST_ALPHA,[xA]:i.ONE_MINUS_SRC_COLOR,[Sp]:i.ONE_MINUS_SRC_ALPHA,[TA]:i.ONE_MINUS_DST_COLOR,[MA]:i.ONE_MINUS_DST_ALPHA,[AA]:i.CONSTANT_COLOR,[RA]:i.ONE_MINUS_CONSTANT_COLOR,[CA]:i.CONSTANT_ALPHA,[wA]:i.ONE_MINUS_CONSTANT_ALPHA};function Le(X,bt,Ct,Ft,Et,_t,Ht,se,Ce,Ee){if(X===fr){T===!0&&(At(i.BLEND),T=!1);return}if(T===!1&&(vt(i.BLEND),T=!0),X!==hA){if(X!==S||Ee!==U){if((y!==Wr||D!==Wr)&&(i.blendEquation(i.FUNC_ADD),y=Wr,D=Wr),Ee)switch(X){case ro:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case ey:i.blendFunc(i.ONE,i.ONE);break;case ny:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case iy:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",X);break}else switch(X){case ro:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case ey:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case ny:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case iy:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",X);break}w=null,C=null,N=null,F=null,z.set(0,0,0),H=0,S=X,U=Ee}return}Et=Et||bt,_t=_t||Ct,Ht=Ht||Ft,(bt!==y||Et!==D)&&(i.blendEquationSeparate(un[bt],un[Et]),y=bt,D=Et),(Ct!==w||Ft!==C||_t!==N||Ht!==F)&&(i.blendFuncSeparate(V[Ct],V[Ft],V[_t],V[Ht]),w=Ct,C=Ft,N=_t,F=Ht),(se.equals(z)===!1||Ce!==H)&&(i.blendColor(se.r,se.g,se.b,Ce),z.copy(se),H=Ce),S=X,U=!1}function oe(X,bt){X.side===Ma?At(i.CULL_FACE):vt(i.CULL_FACE);let Ct=X.side===$n;bt&&(Ct=!Ct),ie(Ct),X.blending===ro&&X.transparent===!1?Le(fr):Le(X.blending,X.blendEquation,X.blendSrc,X.blendDst,X.blendEquationAlpha,X.blendSrcAlpha,X.blendDstAlpha,X.blendColor,X.blendAlpha,X.premultipliedAlpha),c.setFunc(X.depthFunc),c.setTest(X.depthTest),c.setMask(X.depthWrite),u.setMask(X.colorWrite);const Ft=X.stencilWrite;f.setTest(Ft),Ft&&(f.setMask(X.stencilWriteMask),f.setFunc(X.stencilFunc,X.stencilRef,X.stencilFuncMask),f.setOp(X.stencilFail,X.stencilZFail,X.stencilZPass)),Gt(X.polygonOffset,X.polygonOffsetFactor,X.polygonOffsetUnits),X.alphaToCoverage===!0?vt(i.SAMPLE_ALPHA_TO_COVERAGE):At(i.SAMPLE_ALPHA_TO_COVERAGE)}function ie(X){L!==X&&(X?i.frontFace(i.CW):i.frontFace(i.CCW),L=X)}function Ot(X){X!==uA?(vt(i.CULL_FACE),X!==G&&(X===ty?i.cullFace(i.BACK):X===cA?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):At(i.CULL_FACE),G=X}function He(X){X!==nt&&(I&&i.lineWidth(X),nt=X)}function Gt(X,bt,Ct){X?(vt(i.POLYGON_OFFSET_FILL),(ct!==bt||pt!==Ct)&&(i.polygonOffset(bt,Ct),ct=bt,pt=Ct)):At(i.POLYGON_OFFSET_FILL)}function le(X){X?vt(i.SCISSOR_TEST):At(i.SCISSOR_TEST)}function je(X){X===void 0&&(X=i.TEXTURE0+ut-1),yt!==X&&(i.activeTexture(X),yt=X)}function Ke(X,bt,Ct){Ct===void 0&&(yt===null?Ct=i.TEXTURE0+ut-1:Ct=yt);let Ft=P[Ct];Ft===void 0&&(Ft={type:void 0,texture:void 0},P[Ct]=Ft),(Ft.type!==X||Ft.texture!==bt)&&(yt!==Ct&&(i.activeTexture(Ct),yt=Ct),i.bindTexture(X,bt||et[X]),Ft.type=X,Ft.texture=bt)}function O(){const X=P[yt];X!==void 0&&X.type!==void 0&&(i.bindTexture(X.type,null),X.type=void 0,X.texture=void 0)}function b(){try{i.compressedTexImage2D(...arguments)}catch(X){console.error("THREE.WebGLState:",X)}}function tt(){try{i.compressedTexImage3D(...arguments)}catch(X){console.error("THREE.WebGLState:",X)}}function ft(){try{i.texSubImage2D(...arguments)}catch(X){console.error("THREE.WebGLState:",X)}}function mt(){try{i.texSubImage3D(...arguments)}catch(X){console.error("THREE.WebGLState:",X)}}function lt(){try{i.compressedTexSubImage2D(...arguments)}catch(X){console.error("THREE.WebGLState:",X)}}function Bt(){try{i.compressedTexSubImage3D(...arguments)}catch(X){console.error("THREE.WebGLState:",X)}}function Rt(){try{i.texStorage2D(...arguments)}catch(X){console.error("THREE.WebGLState:",X)}}function Xt(){try{i.texStorage3D(...arguments)}catch(X){console.error("THREE.WebGLState:",X)}}function jt(){try{i.texImage2D(...arguments)}catch(X){console.error("THREE.WebGLState:",X)}}function Mt(){try{i.texImage3D(...arguments)}catch(X){console.error("THREE.WebGLState:",X)}}function Lt(X){St.equals(X)===!1&&(i.scissor(X.x,X.y,X.z,X.w),St.copy(X))}function Zt(X){Ut.equals(X)===!1&&(i.viewport(X.x,X.y,X.z,X.w),Ut.copy(X))}function kt(X,bt){let Ct=d.get(bt);Ct===void 0&&(Ct=new WeakMap,d.set(bt,Ct));let Ft=Ct.get(X);Ft===void 0&&(Ft=i.getUniformBlockIndex(bt,X.name),Ct.set(X,Ft))}function wt(X,bt){const Ft=d.get(bt).get(X);p.get(bt)!==Ft&&(i.uniformBlockBinding(bt,Ft,X.__bindingPointIndex),p.set(bt,Ft))}function ue(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),c.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),m={},yt=null,P={},v={},_=new WeakMap,x=[],E=null,T=!1,S=null,y=null,w=null,C=null,D=null,N=null,F=null,z=new Ie(0,0,0),H=0,U=!1,L=null,G=null,nt=null,ct=null,pt=null,St.set(0,0,i.canvas.width,i.canvas.height),Ut.set(0,0,i.canvas.width,i.canvas.height),u.reset(),c.reset(),f.reset()}return{buffers:{color:u,depth:c,stencil:f},enable:vt,disable:At,bindFramebuffer:Qt,drawBuffers:Yt,useProgram:me,setBlending:Le,setMaterial:oe,setFlipSided:ie,setCullFace:Ot,setLineWidth:He,setPolygonOffset:Gt,setScissorTest:le,activeTexture:je,bindTexture:Ke,unbindTexture:O,compressedTexImage2D:b,compressedTexImage3D:tt,texImage2D:jt,texImage3D:Mt,updateUBOMapping:kt,uniformBlockBinding:wt,texStorage2D:Rt,texStorage3D:Xt,texSubImage2D:ft,texSubImage3D:mt,compressedTexSubImage2D:lt,compressedTexSubImage3D:Bt,scissor:Lt,viewport:Zt,reset:ue}}function aD(i,t,n,r,o,u,c){const f=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,p=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),d=new we,m=new WeakMap;let v;const _=new WeakMap;let x=!1;try{x=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function E(O,b){return x?new OffscreenCanvas(O,b):tf("canvas")}function T(O,b,tt){let ft=1;const mt=Ke(O);if((mt.width>tt||mt.height>tt)&&(ft=tt/Math.max(mt.width,mt.height)),ft<1)if(typeof HTMLImageElement<"u"&&O instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&O instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&O instanceof ImageBitmap||typeof VideoFrame<"u"&&O instanceof VideoFrame){const lt=Math.floor(ft*mt.width),Bt=Math.floor(ft*mt.height);v===void 0&&(v=E(lt,Bt));const Rt=b?E(lt,Bt):v;return Rt.width=lt,Rt.height=Bt,Rt.getContext("2d").drawImage(O,0,0,lt,Bt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+mt.width+"x"+mt.height+") to ("+lt+"x"+Bt+")."),Rt}else return"data"in O&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+mt.width+"x"+mt.height+")."),O;return O}function S(O){return O.generateMipmaps}function y(O){i.generateMipmap(O)}function w(O){return O.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:O.isWebGL3DRenderTarget?i.TEXTURE_3D:O.isWebGLArrayRenderTarget||O.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function C(O,b,tt,ft,mt=!1){if(O!==null){if(i[O]!==void 0)return i[O];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+O+"'")}let lt=b;if(b===i.RED&&(tt===i.FLOAT&&(lt=i.R32F),tt===i.HALF_FLOAT&&(lt=i.R16F),tt===i.UNSIGNED_BYTE&&(lt=i.R8)),b===i.RED_INTEGER&&(tt===i.UNSIGNED_BYTE&&(lt=i.R8UI),tt===i.UNSIGNED_SHORT&&(lt=i.R16UI),tt===i.UNSIGNED_INT&&(lt=i.R32UI),tt===i.BYTE&&(lt=i.R8I),tt===i.SHORT&&(lt=i.R16I),tt===i.INT&&(lt=i.R32I)),b===i.RG&&(tt===i.FLOAT&&(lt=i.RG32F),tt===i.HALF_FLOAT&&(lt=i.RG16F),tt===i.UNSIGNED_BYTE&&(lt=i.RG8)),b===i.RG_INTEGER&&(tt===i.UNSIGNED_BYTE&&(lt=i.RG8UI),tt===i.UNSIGNED_SHORT&&(lt=i.RG16UI),tt===i.UNSIGNED_INT&&(lt=i.RG32UI),tt===i.BYTE&&(lt=i.RG8I),tt===i.SHORT&&(lt=i.RG16I),tt===i.INT&&(lt=i.RG32I)),b===i.RGB_INTEGER&&(tt===i.UNSIGNED_BYTE&&(lt=i.RGB8UI),tt===i.UNSIGNED_SHORT&&(lt=i.RGB16UI),tt===i.UNSIGNED_INT&&(lt=i.RGB32UI),tt===i.BYTE&&(lt=i.RGB8I),tt===i.SHORT&&(lt=i.RGB16I),tt===i.INT&&(lt=i.RGB32I)),b===i.RGBA_INTEGER&&(tt===i.UNSIGNED_BYTE&&(lt=i.RGBA8UI),tt===i.UNSIGNED_SHORT&&(lt=i.RGBA16UI),tt===i.UNSIGNED_INT&&(lt=i.RGBA32UI),tt===i.BYTE&&(lt=i.RGBA8I),tt===i.SHORT&&(lt=i.RGBA16I),tt===i.INT&&(lt=i.RGBA32I)),b===i.RGB&&(tt===i.UNSIGNED_INT_5_9_9_9_REV&&(lt=i.RGB9_E5),tt===i.UNSIGNED_INT_10F_11F_11F_REV&&(lt=i.R11F_G11F_B10F)),b===i.RGBA){const Bt=mt?$c:Ae.getTransfer(ft);tt===i.FLOAT&&(lt=i.RGBA32F),tt===i.HALF_FLOAT&&(lt=i.RGBA16F),tt===i.UNSIGNED_BYTE&&(lt=Bt===Fe?i.SRGB8_ALPHA8:i.RGBA8),tt===i.UNSIGNED_SHORT_4_4_4_4&&(lt=i.RGBA4),tt===i.UNSIGNED_SHORT_5_5_5_1&&(lt=i.RGB5_A1)}return(lt===i.R16F||lt===i.R32F||lt===i.RG16F||lt===i.RG32F||lt===i.RGBA16F||lt===i.RGBA32F)&&t.get("EXT_color_buffer_float"),lt}function D(O,b){let tt;return O?b===null||b===es||b===Nl?tt=i.DEPTH24_STENCIL8:b===Bi?tt=i.DEPTH32F_STENCIL8:b===Pl&&(tt=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):b===null||b===es||b===Nl?tt=i.DEPTH_COMPONENT24:b===Bi?tt=i.DEPTH_COMPONENT32F:b===Pl&&(tt=i.DEPTH_COMPONENT16),tt}function N(O,b){return S(O)===!0||O.isFramebufferTexture&&O.minFilter!==Ii&&O.minFilter!==Zn?Math.log2(Math.max(b.width,b.height))+1:O.mipmaps!==void 0&&O.mipmaps.length>0?O.mipmaps.length:O.isCompressedTexture&&Array.isArray(O.image)?b.mipmaps.length:1}function F(O){const b=O.target;b.removeEventListener("dispose",F),H(b),b.isVideoTexture&&m.delete(b)}function z(O){const b=O.target;b.removeEventListener("dispose",z),L(b)}function H(O){const b=r.get(O);if(b.__webglInit===void 0)return;const tt=O.source,ft=_.get(tt);if(ft){const mt=ft[b.__cacheKey];mt.usedTimes--,mt.usedTimes===0&&U(O),Object.keys(ft).length===0&&_.delete(tt)}r.remove(O)}function U(O){const b=r.get(O);i.deleteTexture(b.__webglTexture);const tt=O.source,ft=_.get(tt);delete ft[b.__cacheKey],c.memory.textures--}function L(O){const b=r.get(O);if(O.depthTexture&&(O.depthTexture.dispose(),r.remove(O.depthTexture)),O.isWebGLCubeRenderTarget)for(let ft=0;ft<6;ft++){if(Array.isArray(b.__webglFramebuffer[ft]))for(let mt=0;mt<b.__webglFramebuffer[ft].length;mt++)i.deleteFramebuffer(b.__webglFramebuffer[ft][mt]);else i.deleteFramebuffer(b.__webglFramebuffer[ft]);b.__webglDepthbuffer&&i.deleteRenderbuffer(b.__webglDepthbuffer[ft])}else{if(Array.isArray(b.__webglFramebuffer))for(let ft=0;ft<b.__webglFramebuffer.length;ft++)i.deleteFramebuffer(b.__webglFramebuffer[ft]);else i.deleteFramebuffer(b.__webglFramebuffer);if(b.__webglDepthbuffer&&i.deleteRenderbuffer(b.__webglDepthbuffer),b.__webglMultisampledFramebuffer&&i.deleteFramebuffer(b.__webglMultisampledFramebuffer),b.__webglColorRenderbuffer)for(let ft=0;ft<b.__webglColorRenderbuffer.length;ft++)b.__webglColorRenderbuffer[ft]&&i.deleteRenderbuffer(b.__webglColorRenderbuffer[ft]);b.__webglDepthRenderbuffer&&i.deleteRenderbuffer(b.__webglDepthRenderbuffer)}const tt=O.textures;for(let ft=0,mt=tt.length;ft<mt;ft++){const lt=r.get(tt[ft]);lt.__webglTexture&&(i.deleteTexture(lt.__webglTexture),c.memory.textures--),r.remove(tt[ft])}r.remove(O)}let G=0;function nt(){G=0}function ct(){const O=G;return O>=o.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+O+" texture units while this GPU supports only "+o.maxTextures),G+=1,O}function pt(O){const b=[];return b.push(O.wrapS),b.push(O.wrapT),b.push(O.wrapR||0),b.push(O.magFilter),b.push(O.minFilter),b.push(O.anisotropy),b.push(O.internalFormat),b.push(O.format),b.push(O.type),b.push(O.generateMipmaps),b.push(O.premultiplyAlpha),b.push(O.flipY),b.push(O.unpackAlignment),b.push(O.colorSpace),b.join()}function ut(O,b){const tt=r.get(O);if(O.isVideoTexture&&le(O),O.isRenderTargetTexture===!1&&O.isExternalTexture!==!0&&O.version>0&&tt.__version!==O.version){const ft=O.image;if(ft===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(ft.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{et(tt,O,b);return}}else O.isExternalTexture&&(tt.__webglTexture=O.sourceTexture?O.sourceTexture:null);n.bindTexture(i.TEXTURE_2D,tt.__webglTexture,i.TEXTURE0+b)}function I(O,b){const tt=r.get(O);if(O.isRenderTargetTexture===!1&&O.version>0&&tt.__version!==O.version){et(tt,O,b);return}n.bindTexture(i.TEXTURE_2D_ARRAY,tt.__webglTexture,i.TEXTURE0+b)}function q(O,b){const tt=r.get(O);if(O.isRenderTargetTexture===!1&&O.version>0&&tt.__version!==O.version){et(tt,O,b);return}n.bindTexture(i.TEXTURE_3D,tt.__webglTexture,i.TEXTURE0+b)}function W(O,b){const tt=r.get(O);if(O.version>0&&tt.__version!==O.version){vt(tt,O,b);return}n.bindTexture(i.TEXTURE_CUBE_MAP,tt.__webglTexture,i.TEXTURE0+b)}const yt={[Up]:i.REPEAT,[Yr]:i.CLAMP_TO_EDGE,[Lp]:i.MIRRORED_REPEAT},P={[Ii]:i.NEAREST,[zA]:i.NEAREST_MIPMAP_NEAREST,[dc]:i.NEAREST_MIPMAP_LINEAR,[Zn]:i.LINEAR,[vd]:i.LINEAR_MIPMAP_NEAREST,[jr]:i.LINEAR_MIPMAP_LINEAR},J={[XA]:i.NEVER,[ZA]:i.ALWAYS,[WA]:i.LESS,[FS]:i.LEQUAL,[qA]:i.EQUAL,[KA]:i.GEQUAL,[YA]:i.GREATER,[jA]:i.NOTEQUAL};function xt(O,b){if(b.type===Bi&&t.has("OES_texture_float_linear")===!1&&(b.magFilter===Zn||b.magFilter===vd||b.magFilter===dc||b.magFilter===jr||b.minFilter===Zn||b.minFilter===vd||b.minFilter===dc||b.minFilter===jr)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(O,i.TEXTURE_WRAP_S,yt[b.wrapS]),i.texParameteri(O,i.TEXTURE_WRAP_T,yt[b.wrapT]),(O===i.TEXTURE_3D||O===i.TEXTURE_2D_ARRAY)&&i.texParameteri(O,i.TEXTURE_WRAP_R,yt[b.wrapR]),i.texParameteri(O,i.TEXTURE_MAG_FILTER,P[b.magFilter]),i.texParameteri(O,i.TEXTURE_MIN_FILTER,P[b.minFilter]),b.compareFunction&&(i.texParameteri(O,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(O,i.TEXTURE_COMPARE_FUNC,J[b.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(b.magFilter===Ii||b.minFilter!==dc&&b.minFilter!==jr||b.type===Bi&&t.has("OES_texture_float_linear")===!1)return;if(b.anisotropy>1||r.get(b).__currentAnisotropy){const tt=t.get("EXT_texture_filter_anisotropic");i.texParameterf(O,tt.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(b.anisotropy,o.getMaxAnisotropy())),r.get(b).__currentAnisotropy=b.anisotropy}}}function St(O,b){let tt=!1;O.__webglInit===void 0&&(O.__webglInit=!0,b.addEventListener("dispose",F));const ft=b.source;let mt=_.get(ft);mt===void 0&&(mt={},_.set(ft,mt));const lt=pt(b);if(lt!==O.__cacheKey){mt[lt]===void 0&&(mt[lt]={texture:i.createTexture(),usedTimes:0},c.memory.textures++,tt=!0),mt[lt].usedTimes++;const Bt=mt[O.__cacheKey];Bt!==void 0&&(mt[O.__cacheKey].usedTimes--,Bt.usedTimes===0&&U(b)),O.__cacheKey=lt,O.__webglTexture=mt[lt].texture}return tt}function Ut(O,b,tt){return Math.floor(Math.floor(O/tt)/b)}function Vt(O,b,tt,ft){const lt=O.updateRanges;if(lt.length===0)n.texSubImage2D(i.TEXTURE_2D,0,0,0,b.width,b.height,tt,ft,b.data);else{lt.sort((Mt,Lt)=>Mt.start-Lt.start);let Bt=0;for(let Mt=1;Mt<lt.length;Mt++){const Lt=lt[Bt],Zt=lt[Mt],kt=Lt.start+Lt.count,wt=Ut(Zt.start,b.width,4),ue=Ut(Lt.start,b.width,4);Zt.start<=kt+1&&wt===ue&&Ut(Zt.start+Zt.count-1,b.width,4)===wt?Lt.count=Math.max(Lt.count,Zt.start+Zt.count-Lt.start):(++Bt,lt[Bt]=Zt)}lt.length=Bt+1;const Rt=i.getParameter(i.UNPACK_ROW_LENGTH),Xt=i.getParameter(i.UNPACK_SKIP_PIXELS),jt=i.getParameter(i.UNPACK_SKIP_ROWS);i.pixelStorei(i.UNPACK_ROW_LENGTH,b.width);for(let Mt=0,Lt=lt.length;Mt<Lt;Mt++){const Zt=lt[Mt],kt=Math.floor(Zt.start/4),wt=Math.ceil(Zt.count/4),ue=kt%b.width,X=Math.floor(kt/b.width),bt=wt,Ct=1;i.pixelStorei(i.UNPACK_SKIP_PIXELS,ue),i.pixelStorei(i.UNPACK_SKIP_ROWS,X),n.texSubImage2D(i.TEXTURE_2D,0,ue,X,bt,Ct,tt,ft,b.data)}O.clearUpdateRanges(),i.pixelStorei(i.UNPACK_ROW_LENGTH,Rt),i.pixelStorei(i.UNPACK_SKIP_PIXELS,Xt),i.pixelStorei(i.UNPACK_SKIP_ROWS,jt)}}function et(O,b,tt){let ft=i.TEXTURE_2D;(b.isDataArrayTexture||b.isCompressedArrayTexture)&&(ft=i.TEXTURE_2D_ARRAY),b.isData3DTexture&&(ft=i.TEXTURE_3D);const mt=St(O,b),lt=b.source;n.bindTexture(ft,O.__webglTexture,i.TEXTURE0+tt);const Bt=r.get(lt);if(lt.version!==Bt.__version||mt===!0){n.activeTexture(i.TEXTURE0+tt);const Rt=Ae.getPrimaries(Ae.workingColorSpace),Xt=b.colorSpace===ur?null:Ae.getPrimaries(b.colorSpace),jt=b.colorSpace===ur||Rt===Xt?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,b.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,b.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,jt);let Mt=T(b.image,!1,o.maxTextureSize);Mt=je(b,Mt);const Lt=u.convert(b.format,b.colorSpace),Zt=u.convert(b.type);let kt=C(b.internalFormat,Lt,Zt,b.colorSpace,b.isVideoTexture);xt(ft,b);let wt;const ue=b.mipmaps,X=b.isVideoTexture!==!0,bt=Bt.__version===void 0||mt===!0,Ct=lt.dataReady,Ft=N(b,Mt);if(b.isDepthTexture)kt=D(b.format===Bl,b.type),bt&&(X?n.texStorage2D(i.TEXTURE_2D,1,kt,Mt.width,Mt.height):n.texImage2D(i.TEXTURE_2D,0,kt,Mt.width,Mt.height,0,Lt,Zt,null));else if(b.isDataTexture)if(ue.length>0){X&&bt&&n.texStorage2D(i.TEXTURE_2D,Ft,kt,ue[0].width,ue[0].height);for(let Et=0,_t=ue.length;Et<_t;Et++)wt=ue[Et],X?Ct&&n.texSubImage2D(i.TEXTURE_2D,Et,0,0,wt.width,wt.height,Lt,Zt,wt.data):n.texImage2D(i.TEXTURE_2D,Et,kt,wt.width,wt.height,0,Lt,Zt,wt.data);b.generateMipmaps=!1}else X?(bt&&n.texStorage2D(i.TEXTURE_2D,Ft,kt,Mt.width,Mt.height),Ct&&Vt(b,Mt,Lt,Zt)):n.texImage2D(i.TEXTURE_2D,0,kt,Mt.width,Mt.height,0,Lt,Zt,Mt.data);else if(b.isCompressedTexture)if(b.isCompressedArrayTexture){X&&bt&&n.texStorage3D(i.TEXTURE_2D_ARRAY,Ft,kt,ue[0].width,ue[0].height,Mt.depth);for(let Et=0,_t=ue.length;Et<_t;Et++)if(wt=ue[Et],b.format!==ci)if(Lt!==null)if(X){if(Ct)if(b.layerUpdates.size>0){const Ht=Ty(wt.width,wt.height,b.format,b.type);for(const se of b.layerUpdates){const Ce=wt.data.subarray(se*Ht/wt.data.BYTES_PER_ELEMENT,(se+1)*Ht/wt.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,Et,0,0,se,wt.width,wt.height,1,Lt,Ce)}b.clearLayerUpdates()}else n.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,Et,0,0,0,wt.width,wt.height,Mt.depth,Lt,wt.data)}else n.compressedTexImage3D(i.TEXTURE_2D_ARRAY,Et,kt,wt.width,wt.height,Mt.depth,0,wt.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else X?Ct&&n.texSubImage3D(i.TEXTURE_2D_ARRAY,Et,0,0,0,wt.width,wt.height,Mt.depth,Lt,Zt,wt.data):n.texImage3D(i.TEXTURE_2D_ARRAY,Et,kt,wt.width,wt.height,Mt.depth,0,Lt,Zt,wt.data)}else{X&&bt&&n.texStorage2D(i.TEXTURE_2D,Ft,kt,ue[0].width,ue[0].height);for(let Et=0,_t=ue.length;Et<_t;Et++)wt=ue[Et],b.format!==ci?Lt!==null?X?Ct&&n.compressedTexSubImage2D(i.TEXTURE_2D,Et,0,0,wt.width,wt.height,Lt,wt.data):n.compressedTexImage2D(i.TEXTURE_2D,Et,kt,wt.width,wt.height,0,wt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):X?Ct&&n.texSubImage2D(i.TEXTURE_2D,Et,0,0,wt.width,wt.height,Lt,Zt,wt.data):n.texImage2D(i.TEXTURE_2D,Et,kt,wt.width,wt.height,0,Lt,Zt,wt.data)}else if(b.isDataArrayTexture)if(X){if(bt&&n.texStorage3D(i.TEXTURE_2D_ARRAY,Ft,kt,Mt.width,Mt.height,Mt.depth),Ct)if(b.layerUpdates.size>0){const Et=Ty(Mt.width,Mt.height,b.format,b.type);for(const _t of b.layerUpdates){const Ht=Mt.data.subarray(_t*Et/Mt.data.BYTES_PER_ELEMENT,(_t+1)*Et/Mt.data.BYTES_PER_ELEMENT);n.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,_t,Mt.width,Mt.height,1,Lt,Zt,Ht)}b.clearLayerUpdates()}else n.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,Mt.width,Mt.height,Mt.depth,Lt,Zt,Mt.data)}else n.texImage3D(i.TEXTURE_2D_ARRAY,0,kt,Mt.width,Mt.height,Mt.depth,0,Lt,Zt,Mt.data);else if(b.isData3DTexture)X?(bt&&n.texStorage3D(i.TEXTURE_3D,Ft,kt,Mt.width,Mt.height,Mt.depth),Ct&&n.texSubImage3D(i.TEXTURE_3D,0,0,0,0,Mt.width,Mt.height,Mt.depth,Lt,Zt,Mt.data)):n.texImage3D(i.TEXTURE_3D,0,kt,Mt.width,Mt.height,Mt.depth,0,Lt,Zt,Mt.data);else if(b.isFramebufferTexture){if(bt)if(X)n.texStorage2D(i.TEXTURE_2D,Ft,kt,Mt.width,Mt.height);else{let Et=Mt.width,_t=Mt.height;for(let Ht=0;Ht<Ft;Ht++)n.texImage2D(i.TEXTURE_2D,Ht,kt,Et,_t,0,Lt,Zt,null),Et>>=1,_t>>=1}}else if(ue.length>0){if(X&&bt){const Et=Ke(ue[0]);n.texStorage2D(i.TEXTURE_2D,Ft,kt,Et.width,Et.height)}for(let Et=0,_t=ue.length;Et<_t;Et++)wt=ue[Et],X?Ct&&n.texSubImage2D(i.TEXTURE_2D,Et,0,0,Lt,Zt,wt):n.texImage2D(i.TEXTURE_2D,Et,kt,Lt,Zt,wt);b.generateMipmaps=!1}else if(X){if(bt){const Et=Ke(Mt);n.texStorage2D(i.TEXTURE_2D,Ft,kt,Et.width,Et.height)}Ct&&n.texSubImage2D(i.TEXTURE_2D,0,0,0,Lt,Zt,Mt)}else n.texImage2D(i.TEXTURE_2D,0,kt,Lt,Zt,Mt);S(b)&&y(ft),Bt.__version=lt.version,b.onUpdate&&b.onUpdate(b)}O.__version=b.version}function vt(O,b,tt){if(b.image.length!==6)return;const ft=St(O,b),mt=b.source;n.bindTexture(i.TEXTURE_CUBE_MAP,O.__webglTexture,i.TEXTURE0+tt);const lt=r.get(mt);if(mt.version!==lt.__version||ft===!0){n.activeTexture(i.TEXTURE0+tt);const Bt=Ae.getPrimaries(Ae.workingColorSpace),Rt=b.colorSpace===ur?null:Ae.getPrimaries(b.colorSpace),Xt=b.colorSpace===ur||Bt===Rt?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,b.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,b.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Xt);const jt=b.isCompressedTexture||b.image[0].isCompressedTexture,Mt=b.image[0]&&b.image[0].isDataTexture,Lt=[];for(let _t=0;_t<6;_t++)!jt&&!Mt?Lt[_t]=T(b.image[_t],!0,o.maxCubemapSize):Lt[_t]=Mt?b.image[_t].image:b.image[_t],Lt[_t]=je(b,Lt[_t]);const Zt=Lt[0],kt=u.convert(b.format,b.colorSpace),wt=u.convert(b.type),ue=C(b.internalFormat,kt,wt,b.colorSpace),X=b.isVideoTexture!==!0,bt=lt.__version===void 0||ft===!0,Ct=mt.dataReady;let Ft=N(b,Zt);xt(i.TEXTURE_CUBE_MAP,b);let Et;if(jt){X&&bt&&n.texStorage2D(i.TEXTURE_CUBE_MAP,Ft,ue,Zt.width,Zt.height);for(let _t=0;_t<6;_t++){Et=Lt[_t].mipmaps;for(let Ht=0;Ht<Et.length;Ht++){const se=Et[Ht];b.format!==ci?kt!==null?X?Ct&&n.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Ht,0,0,se.width,se.height,kt,se.data):n.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Ht,ue,se.width,se.height,0,se.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):X?Ct&&n.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Ht,0,0,se.width,se.height,kt,wt,se.data):n.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Ht,ue,se.width,se.height,0,kt,wt,se.data)}}}else{if(Et=b.mipmaps,X&&bt){Et.length>0&&Ft++;const _t=Ke(Lt[0]);n.texStorage2D(i.TEXTURE_CUBE_MAP,Ft,ue,_t.width,_t.height)}for(let _t=0;_t<6;_t++)if(Mt){X?Ct&&n.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,0,0,0,Lt[_t].width,Lt[_t].height,kt,wt,Lt[_t].data):n.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,0,ue,Lt[_t].width,Lt[_t].height,0,kt,wt,Lt[_t].data);for(let Ht=0;Ht<Et.length;Ht++){const Ce=Et[Ht].image[_t].image;X?Ct&&n.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Ht+1,0,0,Ce.width,Ce.height,kt,wt,Ce.data):n.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Ht+1,ue,Ce.width,Ce.height,0,kt,wt,Ce.data)}}else{X?Ct&&n.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,0,0,0,kt,wt,Lt[_t]):n.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,0,ue,kt,wt,Lt[_t]);for(let Ht=0;Ht<Et.length;Ht++){const se=Et[Ht];X?Ct&&n.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Ht+1,0,0,kt,wt,se.image[_t]):n.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Ht+1,ue,kt,wt,se.image[_t])}}}S(b)&&y(i.TEXTURE_CUBE_MAP),lt.__version=mt.version,b.onUpdate&&b.onUpdate(b)}O.__version=b.version}function At(O,b,tt,ft,mt,lt){const Bt=u.convert(tt.format,tt.colorSpace),Rt=u.convert(tt.type),Xt=C(tt.internalFormat,Bt,Rt,tt.colorSpace),jt=r.get(b),Mt=r.get(tt);if(Mt.__renderTarget=b,!jt.__hasExternalTextures){const Lt=Math.max(1,b.width>>lt),Zt=Math.max(1,b.height>>lt);mt===i.TEXTURE_3D||mt===i.TEXTURE_2D_ARRAY?n.texImage3D(mt,lt,Xt,Lt,Zt,b.depth,0,Bt,Rt,null):n.texImage2D(mt,lt,Xt,Lt,Zt,0,Bt,Rt,null)}n.bindFramebuffer(i.FRAMEBUFFER,O),Gt(b)?f.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ft,mt,Mt.__webglTexture,0,He(b)):(mt===i.TEXTURE_2D||mt>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&mt<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,ft,mt,Mt.__webglTexture,lt),n.bindFramebuffer(i.FRAMEBUFFER,null)}function Qt(O,b,tt){if(i.bindRenderbuffer(i.RENDERBUFFER,O),b.depthBuffer){const ft=b.depthTexture,mt=ft&&ft.isDepthTexture?ft.type:null,lt=D(b.stencilBuffer,mt),Bt=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Rt=He(b);Gt(b)?f.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Rt,lt,b.width,b.height):tt?i.renderbufferStorageMultisample(i.RENDERBUFFER,Rt,lt,b.width,b.height):i.renderbufferStorage(i.RENDERBUFFER,lt,b.width,b.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Bt,i.RENDERBUFFER,O)}else{const ft=b.textures;for(let mt=0;mt<ft.length;mt++){const lt=ft[mt],Bt=u.convert(lt.format,lt.colorSpace),Rt=u.convert(lt.type),Xt=C(lt.internalFormat,Bt,Rt,lt.colorSpace),jt=He(b);tt&&Gt(b)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,jt,Xt,b.width,b.height):Gt(b)?f.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,jt,Xt,b.width,b.height):i.renderbufferStorage(i.RENDERBUFFER,Xt,b.width,b.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Yt(O,b){if(b&&b.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(n.bindFramebuffer(i.FRAMEBUFFER,O),!(b.depthTexture&&b.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const ft=r.get(b.depthTexture);ft.__renderTarget=b,(!ft.__webglTexture||b.depthTexture.image.width!==b.width||b.depthTexture.image.height!==b.height)&&(b.depthTexture.image.width=b.width,b.depthTexture.image.height=b.height,b.depthTexture.needsUpdate=!0),ut(b.depthTexture,0);const mt=ft.__webglTexture,lt=He(b);if(b.depthTexture.format===Ol)Gt(b)?f.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,mt,0,lt):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,mt,0);else if(b.depthTexture.format===Bl)Gt(b)?f.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,mt,0,lt):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,mt,0);else throw new Error("Unknown depthTexture format")}function me(O){const b=r.get(O),tt=O.isWebGLCubeRenderTarget===!0;if(b.__boundDepthTexture!==O.depthTexture){const ft=O.depthTexture;if(b.__depthDisposeCallback&&b.__depthDisposeCallback(),ft){const mt=()=>{delete b.__boundDepthTexture,delete b.__depthDisposeCallback,ft.removeEventListener("dispose",mt)};ft.addEventListener("dispose",mt),b.__depthDisposeCallback=mt}b.__boundDepthTexture=ft}if(O.depthTexture&&!b.__autoAllocateDepthBuffer){if(tt)throw new Error("target.depthTexture not supported in Cube render targets");const ft=O.texture.mipmaps;ft&&ft.length>0?Yt(b.__webglFramebuffer[0],O):Yt(b.__webglFramebuffer,O)}else if(tt){b.__webglDepthbuffer=[];for(let ft=0;ft<6;ft++)if(n.bindFramebuffer(i.FRAMEBUFFER,b.__webglFramebuffer[ft]),b.__webglDepthbuffer[ft]===void 0)b.__webglDepthbuffer[ft]=i.createRenderbuffer(),Qt(b.__webglDepthbuffer[ft],O,!1);else{const mt=O.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,lt=b.__webglDepthbuffer[ft];i.bindRenderbuffer(i.RENDERBUFFER,lt),i.framebufferRenderbuffer(i.FRAMEBUFFER,mt,i.RENDERBUFFER,lt)}}else{const ft=O.texture.mipmaps;if(ft&&ft.length>0?n.bindFramebuffer(i.FRAMEBUFFER,b.__webglFramebuffer[0]):n.bindFramebuffer(i.FRAMEBUFFER,b.__webglFramebuffer),b.__webglDepthbuffer===void 0)b.__webglDepthbuffer=i.createRenderbuffer(),Qt(b.__webglDepthbuffer,O,!1);else{const mt=O.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,lt=b.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,lt),i.framebufferRenderbuffer(i.FRAMEBUFFER,mt,i.RENDERBUFFER,lt)}}n.bindFramebuffer(i.FRAMEBUFFER,null)}function un(O,b,tt){const ft=r.get(O);b!==void 0&&At(ft.__webglFramebuffer,O,O.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),tt!==void 0&&me(O)}function V(O){const b=O.texture,tt=r.get(O),ft=r.get(b);O.addEventListener("dispose",z);const mt=O.textures,lt=O.isWebGLCubeRenderTarget===!0,Bt=mt.length>1;if(Bt||(ft.__webglTexture===void 0&&(ft.__webglTexture=i.createTexture()),ft.__version=b.version,c.memory.textures++),lt){tt.__webglFramebuffer=[];for(let Rt=0;Rt<6;Rt++)if(b.mipmaps&&b.mipmaps.length>0){tt.__webglFramebuffer[Rt]=[];for(let Xt=0;Xt<b.mipmaps.length;Xt++)tt.__webglFramebuffer[Rt][Xt]=i.createFramebuffer()}else tt.__webglFramebuffer[Rt]=i.createFramebuffer()}else{if(b.mipmaps&&b.mipmaps.length>0){tt.__webglFramebuffer=[];for(let Rt=0;Rt<b.mipmaps.length;Rt++)tt.__webglFramebuffer[Rt]=i.createFramebuffer()}else tt.__webglFramebuffer=i.createFramebuffer();if(Bt)for(let Rt=0,Xt=mt.length;Rt<Xt;Rt++){const jt=r.get(mt[Rt]);jt.__webglTexture===void 0&&(jt.__webglTexture=i.createTexture(),c.memory.textures++)}if(O.samples>0&&Gt(O)===!1){tt.__webglMultisampledFramebuffer=i.createFramebuffer(),tt.__webglColorRenderbuffer=[],n.bindFramebuffer(i.FRAMEBUFFER,tt.__webglMultisampledFramebuffer);for(let Rt=0;Rt<mt.length;Rt++){const Xt=mt[Rt];tt.__webglColorRenderbuffer[Rt]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,tt.__webglColorRenderbuffer[Rt]);const jt=u.convert(Xt.format,Xt.colorSpace),Mt=u.convert(Xt.type),Lt=C(Xt.internalFormat,jt,Mt,Xt.colorSpace,O.isXRRenderTarget===!0),Zt=He(O);i.renderbufferStorageMultisample(i.RENDERBUFFER,Zt,Lt,O.width,O.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Rt,i.RENDERBUFFER,tt.__webglColorRenderbuffer[Rt])}i.bindRenderbuffer(i.RENDERBUFFER,null),O.depthBuffer&&(tt.__webglDepthRenderbuffer=i.createRenderbuffer(),Qt(tt.__webglDepthRenderbuffer,O,!0)),n.bindFramebuffer(i.FRAMEBUFFER,null)}}if(lt){n.bindTexture(i.TEXTURE_CUBE_MAP,ft.__webglTexture),xt(i.TEXTURE_CUBE_MAP,b);for(let Rt=0;Rt<6;Rt++)if(b.mipmaps&&b.mipmaps.length>0)for(let Xt=0;Xt<b.mipmaps.length;Xt++)At(tt.__webglFramebuffer[Rt][Xt],O,b,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+Rt,Xt);else At(tt.__webglFramebuffer[Rt],O,b,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+Rt,0);S(b)&&y(i.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(Bt){for(let Rt=0,Xt=mt.length;Rt<Xt;Rt++){const jt=mt[Rt],Mt=r.get(jt);let Lt=i.TEXTURE_2D;(O.isWebGL3DRenderTarget||O.isWebGLArrayRenderTarget)&&(Lt=O.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),n.bindTexture(Lt,Mt.__webglTexture),xt(Lt,jt),At(tt.__webglFramebuffer,O,jt,i.COLOR_ATTACHMENT0+Rt,Lt,0),S(jt)&&y(Lt)}n.unbindTexture()}else{let Rt=i.TEXTURE_2D;if((O.isWebGL3DRenderTarget||O.isWebGLArrayRenderTarget)&&(Rt=O.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),n.bindTexture(Rt,ft.__webglTexture),xt(Rt,b),b.mipmaps&&b.mipmaps.length>0)for(let Xt=0;Xt<b.mipmaps.length;Xt++)At(tt.__webglFramebuffer[Xt],O,b,i.COLOR_ATTACHMENT0,Rt,Xt);else At(tt.__webglFramebuffer,O,b,i.COLOR_ATTACHMENT0,Rt,0);S(b)&&y(Rt),n.unbindTexture()}O.depthBuffer&&me(O)}function Le(O){const b=O.textures;for(let tt=0,ft=b.length;tt<ft;tt++){const mt=b[tt];if(S(mt)){const lt=w(O),Bt=r.get(mt).__webglTexture;n.bindTexture(lt,Bt),y(lt),n.unbindTexture()}}}const oe=[],ie=[];function Ot(O){if(O.samples>0){if(Gt(O)===!1){const b=O.textures,tt=O.width,ft=O.height;let mt=i.COLOR_BUFFER_BIT;const lt=O.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Bt=r.get(O),Rt=b.length>1;if(Rt)for(let jt=0;jt<b.length;jt++)n.bindFramebuffer(i.FRAMEBUFFER,Bt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+jt,i.RENDERBUFFER,null),n.bindFramebuffer(i.FRAMEBUFFER,Bt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+jt,i.TEXTURE_2D,null,0);n.bindFramebuffer(i.READ_FRAMEBUFFER,Bt.__webglMultisampledFramebuffer);const Xt=O.texture.mipmaps;Xt&&Xt.length>0?n.bindFramebuffer(i.DRAW_FRAMEBUFFER,Bt.__webglFramebuffer[0]):n.bindFramebuffer(i.DRAW_FRAMEBUFFER,Bt.__webglFramebuffer);for(let jt=0;jt<b.length;jt++){if(O.resolveDepthBuffer&&(O.depthBuffer&&(mt|=i.DEPTH_BUFFER_BIT),O.stencilBuffer&&O.resolveStencilBuffer&&(mt|=i.STENCIL_BUFFER_BIT)),Rt){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Bt.__webglColorRenderbuffer[jt]);const Mt=r.get(b[jt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Mt,0)}i.blitFramebuffer(0,0,tt,ft,0,0,tt,ft,mt,i.NEAREST),p===!0&&(oe.length=0,ie.length=0,oe.push(i.COLOR_ATTACHMENT0+jt),O.depthBuffer&&O.resolveDepthBuffer===!1&&(oe.push(lt),ie.push(lt),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,ie)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,oe))}if(n.bindFramebuffer(i.READ_FRAMEBUFFER,null),n.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),Rt)for(let jt=0;jt<b.length;jt++){n.bindFramebuffer(i.FRAMEBUFFER,Bt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+jt,i.RENDERBUFFER,Bt.__webglColorRenderbuffer[jt]);const Mt=r.get(b[jt]).__webglTexture;n.bindFramebuffer(i.FRAMEBUFFER,Bt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+jt,i.TEXTURE_2D,Mt,0)}n.bindFramebuffer(i.DRAW_FRAMEBUFFER,Bt.__webglMultisampledFramebuffer)}else if(O.depthBuffer&&O.resolveDepthBuffer===!1&&p){const b=O.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[b])}}}function He(O){return Math.min(o.maxSamples,O.samples)}function Gt(O){const b=r.get(O);return O.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&b.__useRenderToTexture!==!1}function le(O){const b=c.render.frame;m.get(O)!==b&&(m.set(O,b),O.update())}function je(O,b){const tt=O.colorSpace,ft=O.format,mt=O.type;return O.isCompressedTexture===!0||O.isVideoTexture===!0||tt!==fo&&tt!==ur&&(Ae.getTransfer(tt)===Fe?(ft!==ci||mt!==ba)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",tt)),b}function Ke(O){return typeof HTMLImageElement<"u"&&O instanceof HTMLImageElement?(d.width=O.naturalWidth||O.width,d.height=O.naturalHeight||O.height):typeof VideoFrame<"u"&&O instanceof VideoFrame?(d.width=O.displayWidth,d.height=O.displayHeight):(d.width=O.width,d.height=O.height),d}this.allocateTextureUnit=ct,this.resetTextureUnits=nt,this.setTexture2D=ut,this.setTexture2DArray=I,this.setTexture3D=q,this.setTextureCube=W,this.rebindTextures=un,this.setupRenderTarget=V,this.updateRenderTargetMipmap=Le,this.updateMultisampleRenderTarget=Ot,this.setupDepthRenderbuffer=me,this.setupFrameBufferTexture=At,this.useMultisampledRTT=Gt}function rD(i,t){function n(r,o=ur){let u;const c=Ae.getTransfer(o);if(r===ba)return i.UNSIGNED_BYTE;if(r===Om)return i.UNSIGNED_SHORT_4_4_4_4;if(r===Bm)return i.UNSIGNED_SHORT_5_5_5_1;if(r===US)return i.UNSIGNED_INT_5_9_9_9_REV;if(r===LS)return i.UNSIGNED_INT_10F_11F_11F_REV;if(r===wS)return i.BYTE;if(r===DS)return i.SHORT;if(r===Pl)return i.UNSIGNED_SHORT;if(r===Nm)return i.INT;if(r===es)return i.UNSIGNED_INT;if(r===Bi)return i.FLOAT;if(r===Wl)return i.HALF_FLOAT;if(r===PS)return i.ALPHA;if(r===NS)return i.RGB;if(r===ci)return i.RGBA;if(r===Ol)return i.DEPTH_COMPONENT;if(r===Bl)return i.DEPTH_STENCIL;if(r===OS)return i.RED;if(r===Fm)return i.RED_INTEGER;if(r===BS)return i.RG;if(r===Im)return i.RG_INTEGER;if(r===zm)return i.RGBA_INTEGER;if(r===Vc||r===Hc||r===Gc||r===kc)if(c===Fe)if(u=t.get("WEBGL_compressed_texture_s3tc_srgb"),u!==null){if(r===Vc)return u.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(r===Hc)return u.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(r===Gc)return u.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(r===kc)return u.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(u=t.get("WEBGL_compressed_texture_s3tc"),u!==null){if(r===Vc)return u.COMPRESSED_RGB_S3TC_DXT1_EXT;if(r===Hc)return u.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(r===Gc)return u.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(r===kc)return u.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(r===Pp||r===Np||r===Op||r===Bp)if(u=t.get("WEBGL_compressed_texture_pvrtc"),u!==null){if(r===Pp)return u.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(r===Np)return u.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(r===Op)return u.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(r===Bp)return u.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(r===Fp||r===Ip||r===zp)if(u=t.get("WEBGL_compressed_texture_etc"),u!==null){if(r===Fp||r===Ip)return c===Fe?u.COMPRESSED_SRGB8_ETC2:u.COMPRESSED_RGB8_ETC2;if(r===zp)return c===Fe?u.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:u.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(r===Vp||r===Hp||r===Gp||r===kp||r===Xp||r===Wp||r===qp||r===Yp||r===jp||r===Kp||r===Zp||r===Qp||r===$p||r===Jp)if(u=t.get("WEBGL_compressed_texture_astc"),u!==null){if(r===Vp)return c===Fe?u.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:u.COMPRESSED_RGBA_ASTC_4x4_KHR;if(r===Hp)return c===Fe?u.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:u.COMPRESSED_RGBA_ASTC_5x4_KHR;if(r===Gp)return c===Fe?u.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:u.COMPRESSED_RGBA_ASTC_5x5_KHR;if(r===kp)return c===Fe?u.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:u.COMPRESSED_RGBA_ASTC_6x5_KHR;if(r===Xp)return c===Fe?u.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:u.COMPRESSED_RGBA_ASTC_6x6_KHR;if(r===Wp)return c===Fe?u.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:u.COMPRESSED_RGBA_ASTC_8x5_KHR;if(r===qp)return c===Fe?u.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:u.COMPRESSED_RGBA_ASTC_8x6_KHR;if(r===Yp)return c===Fe?u.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:u.COMPRESSED_RGBA_ASTC_8x8_KHR;if(r===jp)return c===Fe?u.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:u.COMPRESSED_RGBA_ASTC_10x5_KHR;if(r===Kp)return c===Fe?u.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:u.COMPRESSED_RGBA_ASTC_10x6_KHR;if(r===Zp)return c===Fe?u.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:u.COMPRESSED_RGBA_ASTC_10x8_KHR;if(r===Qp)return c===Fe?u.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:u.COMPRESSED_RGBA_ASTC_10x10_KHR;if(r===$p)return c===Fe?u.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:u.COMPRESSED_RGBA_ASTC_12x10_KHR;if(r===Jp)return c===Fe?u.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:u.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(r===tm||r===em||r===nm)if(u=t.get("EXT_texture_compression_bptc"),u!==null){if(r===tm)return c===Fe?u.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:u.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(r===em)return u.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(r===nm)return u.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(r===im||r===am||r===rm||r===sm)if(u=t.get("EXT_texture_compression_rgtc"),u!==null){if(r===im)return u.COMPRESSED_RED_RGTC1_EXT;if(r===am)return u.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(r===rm)return u.COMPRESSED_RED_GREEN_RGTC2_EXT;if(r===sm)return u.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return r===Nl?i.UNSIGNED_INT_24_8:i[r]!==void 0?i[r]:null}return{convert:n}}const sD=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,oD=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class lD{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,n){if(this.texture===null){const r=new ZS(t.texture);(t.depthNear!==n.depthNear||t.depthFar!==n.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=r}}getMesh(t){if(this.texture!==null&&this.mesh===null){const n=t.cameras[0].viewport,r=new $i({vertexShader:sD,fragmentShader:oD,uniforms:{depthColor:{value:this.texture},depthWidth:{value:n.z},depthHeight:{value:n.w}}});this.mesh=new Fi(new Zl(20,20),r)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class uD extends go{constructor(t,n){super();const r=this;let o=null,u=1,c=null,f="local-floor",p=1,d=null,m=null,v=null,_=null,x=null,E=null;const T=typeof XRWebGLBinding<"u",S=new lD,y={},w=n.getContextAttributes();let C=null,D=null;const N=[],F=[],z=new we;let H=null;const U=new Ni;U.viewport=new rn;const L=new Ni;L.viewport=new rn;const G=[U,L],nt=new D1;let ct=null,pt=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(et){let vt=N[et];return vt===void 0&&(vt=new Vd,N[et]=vt),vt.getTargetRaySpace()},this.getControllerGrip=function(et){let vt=N[et];return vt===void 0&&(vt=new Vd,N[et]=vt),vt.getGripSpace()},this.getHand=function(et){let vt=N[et];return vt===void 0&&(vt=new Vd,N[et]=vt),vt.getHandSpace()};function ut(et){const vt=F.indexOf(et.inputSource);if(vt===-1)return;const At=N[vt];At!==void 0&&(At.update(et.inputSource,et.frame,d||c),At.dispatchEvent({type:et.type,data:et.inputSource}))}function I(){o.removeEventListener("select",ut),o.removeEventListener("selectstart",ut),o.removeEventListener("selectend",ut),o.removeEventListener("squeeze",ut),o.removeEventListener("squeezestart",ut),o.removeEventListener("squeezeend",ut),o.removeEventListener("end",I),o.removeEventListener("inputsourceschange",q);for(let et=0;et<N.length;et++){const vt=F[et];vt!==null&&(F[et]=null,N[et].disconnect(vt))}ct=null,pt=null,S.reset();for(const et in y)delete y[et];t.setRenderTarget(C),x=null,_=null,v=null,o=null,D=null,Vt.stop(),r.isPresenting=!1,t.setPixelRatio(H),t.setSize(z.width,z.height,!1),r.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(et){u=et,r.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(et){f=et,r.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return d||c},this.setReferenceSpace=function(et){d=et},this.getBaseLayer=function(){return _!==null?_:x},this.getBinding=function(){return v===null&&T&&(v=new XRWebGLBinding(o,n)),v},this.getFrame=function(){return E},this.getSession=function(){return o},this.setSession=async function(et){if(o=et,o!==null){if(C=t.getRenderTarget(),o.addEventListener("select",ut),o.addEventListener("selectstart",ut),o.addEventListener("selectend",ut),o.addEventListener("squeeze",ut),o.addEventListener("squeezestart",ut),o.addEventListener("squeezeend",ut),o.addEventListener("end",I),o.addEventListener("inputsourceschange",q),w.xrCompatible!==!0&&await n.makeXRCompatible(),H=t.getPixelRatio(),t.getSize(z),T&&"createProjectionLayer"in XRWebGLBinding.prototype){let At=null,Qt=null,Yt=null;w.depth&&(Yt=w.stencil?n.DEPTH24_STENCIL8:n.DEPTH_COMPONENT24,At=w.stencil?Bl:Ol,Qt=w.stencil?Nl:es);const me={colorFormat:n.RGBA8,depthFormat:Yt,scaleFactor:u};v=this.getBinding(),_=v.createProjectionLayer(me),o.updateRenderState({layers:[_]}),t.setPixelRatio(1),t.setSize(_.textureWidth,_.textureHeight,!1),D=new Aa(_.textureWidth,_.textureHeight,{format:ci,type:ba,depthTexture:new KS(_.textureWidth,_.textureHeight,Qt,void 0,void 0,void 0,void 0,void 0,void 0,At),stencilBuffer:w.stencil,colorSpace:t.outputColorSpace,samples:w.antialias?4:0,resolveDepthBuffer:_.ignoreDepthValues===!1,resolveStencilBuffer:_.ignoreDepthValues===!1})}else{const At={antialias:w.antialias,alpha:!0,depth:w.depth,stencil:w.stencil,framebufferScaleFactor:u};x=new XRWebGLLayer(o,n,At),o.updateRenderState({baseLayer:x}),t.setPixelRatio(1),t.setSize(x.framebufferWidth,x.framebufferHeight,!1),D=new Aa(x.framebufferWidth,x.framebufferHeight,{format:ci,type:ba,colorSpace:t.outputColorSpace,stencilBuffer:w.stencil,resolveDepthBuffer:x.ignoreDepthValues===!1,resolveStencilBuffer:x.ignoreDepthValues===!1})}D.isXRRenderTarget=!0,this.setFoveation(p),d=null,c=await o.requestReferenceSpace(f),Vt.setContext(o),Vt.start(),r.isPresenting=!0,r.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(o!==null)return o.environmentBlendMode},this.getDepthTexture=function(){return S.getDepthTexture()};function q(et){for(let vt=0;vt<et.removed.length;vt++){const At=et.removed[vt],Qt=F.indexOf(At);Qt>=0&&(F[Qt]=null,N[Qt].disconnect(At))}for(let vt=0;vt<et.added.length;vt++){const At=et.added[vt];let Qt=F.indexOf(At);if(Qt===-1){for(let me=0;me<N.length;me++)if(me>=F.length){F.push(At),Qt=me;break}else if(F[me]===null){F[me]=At,Qt=me;break}if(Qt===-1)break}const Yt=N[Qt];Yt&&Yt.connect(At)}}const W=new rt,yt=new rt;function P(et,vt,At){W.setFromMatrixPosition(vt.matrixWorld),yt.setFromMatrixPosition(At.matrixWorld);const Qt=W.distanceTo(yt),Yt=vt.projectionMatrix.elements,me=At.projectionMatrix.elements,un=Yt[14]/(Yt[10]-1),V=Yt[14]/(Yt[10]+1),Le=(Yt[9]+1)/Yt[5],oe=(Yt[9]-1)/Yt[5],ie=(Yt[8]-1)/Yt[0],Ot=(me[8]+1)/me[0],He=un*ie,Gt=un*Ot,le=Qt/(-ie+Ot),je=le*-ie;if(vt.matrixWorld.decompose(et.position,et.quaternion,et.scale),et.translateX(je),et.translateZ(le),et.matrixWorld.compose(et.position,et.quaternion,et.scale),et.matrixWorldInverse.copy(et.matrixWorld).invert(),Yt[10]===-1)et.projectionMatrix.copy(vt.projectionMatrix),et.projectionMatrixInverse.copy(vt.projectionMatrixInverse);else{const Ke=un+le,O=V+le,b=He-je,tt=Gt+(Qt-je),ft=Le*V/O*Ke,mt=oe*V/O*Ke;et.projectionMatrix.makePerspective(b,tt,ft,mt,Ke,O),et.projectionMatrixInverse.copy(et.projectionMatrix).invert()}}function J(et,vt){vt===null?et.matrixWorld.copy(et.matrix):et.matrixWorld.multiplyMatrices(vt.matrixWorld,et.matrix),et.matrixWorldInverse.copy(et.matrixWorld).invert()}this.updateCamera=function(et){if(o===null)return;let vt=et.near,At=et.far;S.texture!==null&&(S.depthNear>0&&(vt=S.depthNear),S.depthFar>0&&(At=S.depthFar)),nt.near=L.near=U.near=vt,nt.far=L.far=U.far=At,(ct!==nt.near||pt!==nt.far)&&(o.updateRenderState({depthNear:nt.near,depthFar:nt.far}),ct=nt.near,pt=nt.far),nt.layers.mask=et.layers.mask|6,U.layers.mask=nt.layers.mask&3,L.layers.mask=nt.layers.mask&5;const Qt=et.parent,Yt=nt.cameras;J(nt,Qt);for(let me=0;me<Yt.length;me++)J(Yt[me],Qt);Yt.length===2?P(nt,U,L):nt.projectionMatrix.copy(U.projectionMatrix),xt(et,nt,Qt)};function xt(et,vt,At){At===null?et.matrix.copy(vt.matrixWorld):(et.matrix.copy(At.matrixWorld),et.matrix.invert(),et.matrix.multiply(vt.matrixWorld)),et.matrix.decompose(et.position,et.quaternion,et.scale),et.updateMatrixWorld(!0),et.projectionMatrix.copy(vt.projectionMatrix),et.projectionMatrixInverse.copy(vt.projectionMatrixInverse),et.isPerspectiveCamera&&(et.fov=om*2*Math.atan(1/et.projectionMatrix.elements[5]),et.zoom=1)}this.getCamera=function(){return nt},this.getFoveation=function(){if(!(_===null&&x===null))return p},this.setFoveation=function(et){p=et,_!==null&&(_.fixedFoveation=et),x!==null&&x.fixedFoveation!==void 0&&(x.fixedFoveation=et)},this.hasDepthSensing=function(){return S.texture!==null},this.getDepthSensingMesh=function(){return S.getMesh(nt)},this.getCameraTexture=function(et){return y[et]};let St=null;function Ut(et,vt){if(m=vt.getViewerPose(d||c),E=vt,m!==null){const At=m.views;x!==null&&(t.setRenderTargetFramebuffer(D,x.framebuffer),t.setRenderTarget(D));let Qt=!1;At.length!==nt.cameras.length&&(nt.cameras.length=0,Qt=!0);for(let V=0;V<At.length;V++){const Le=At[V];let oe=null;if(x!==null)oe=x.getViewport(Le);else{const Ot=v.getViewSubImage(_,Le);oe=Ot.viewport,V===0&&(t.setRenderTargetTextures(D,Ot.colorTexture,Ot.depthStencilTexture),t.setRenderTarget(D))}let ie=G[V];ie===void 0&&(ie=new Ni,ie.layers.enable(V),ie.viewport=new rn,G[V]=ie),ie.matrix.fromArray(Le.transform.matrix),ie.matrix.decompose(ie.position,ie.quaternion,ie.scale),ie.projectionMatrix.fromArray(Le.projectionMatrix),ie.projectionMatrixInverse.copy(ie.projectionMatrix).invert(),ie.viewport.set(oe.x,oe.y,oe.width,oe.height),V===0&&(nt.matrix.copy(ie.matrix),nt.matrix.decompose(nt.position,nt.quaternion,nt.scale)),Qt===!0&&nt.cameras.push(ie)}const Yt=o.enabledFeatures;if(Yt&&Yt.includes("depth-sensing")&&o.depthUsage=="gpu-optimized"&&T){v=r.getBinding();const V=v.getDepthInformation(At[0]);V&&V.isValid&&V.texture&&S.init(V,o.renderState)}if(Yt&&Yt.includes("camera-access")&&T){t.state.unbindTexture(),v=r.getBinding();for(let V=0;V<At.length;V++){const Le=At[V].camera;if(Le){let oe=y[Le];oe||(oe=new ZS,y[Le]=oe);const ie=v.getCameraImage(Le);oe.sourceTexture=ie}}}}for(let At=0;At<N.length;At++){const Qt=F[At],Yt=N[At];Qt!==null&&Yt!==void 0&&Yt.update(Qt,vt,d||c)}St&&St(et,vt),vt.detectedPlanes&&r.dispatchEvent({type:"planesdetected",data:vt}),E=null}const Vt=new $S;Vt.setAnimationLoop(Ut),this.setAnimationLoop=function(et){St=et},this.dispose=function(){}}}const Vr=new ns,cD=new yn;function fD(i,t){function n(S,y){S.matrixAutoUpdate===!0&&S.updateMatrix(),y.value.copy(S.matrix)}function r(S,y){y.color.getRGB(S.fogColor.value,WS(i)),y.isFog?(S.fogNear.value=y.near,S.fogFar.value=y.far):y.isFogExp2&&(S.fogDensity.value=y.density)}function o(S,y,w,C,D){y.isMeshBasicMaterial||y.isMeshLambertMaterial?u(S,y):y.isMeshToonMaterial?(u(S,y),v(S,y)):y.isMeshPhongMaterial?(u(S,y),m(S,y)):y.isMeshStandardMaterial?(u(S,y),_(S,y),y.isMeshPhysicalMaterial&&x(S,y,D)):y.isMeshMatcapMaterial?(u(S,y),E(S,y)):y.isMeshDepthMaterial?u(S,y):y.isMeshDistanceMaterial?(u(S,y),T(S,y)):y.isMeshNormalMaterial?u(S,y):y.isLineBasicMaterial?(c(S,y),y.isLineDashedMaterial&&f(S,y)):y.isPointsMaterial?p(S,y,w,C):y.isSpriteMaterial?d(S,y):y.isShadowMaterial?(S.color.value.copy(y.color),S.opacity.value=y.opacity):y.isShaderMaterial&&(y.uniformsNeedUpdate=!1)}function u(S,y){S.opacity.value=y.opacity,y.color&&S.diffuse.value.copy(y.color),y.emissive&&S.emissive.value.copy(y.emissive).multiplyScalar(y.emissiveIntensity),y.map&&(S.map.value=y.map,n(y.map,S.mapTransform)),y.alphaMap&&(S.alphaMap.value=y.alphaMap,n(y.alphaMap,S.alphaMapTransform)),y.bumpMap&&(S.bumpMap.value=y.bumpMap,n(y.bumpMap,S.bumpMapTransform),S.bumpScale.value=y.bumpScale,y.side===$n&&(S.bumpScale.value*=-1)),y.normalMap&&(S.normalMap.value=y.normalMap,n(y.normalMap,S.normalMapTransform),S.normalScale.value.copy(y.normalScale),y.side===$n&&S.normalScale.value.negate()),y.displacementMap&&(S.displacementMap.value=y.displacementMap,n(y.displacementMap,S.displacementMapTransform),S.displacementScale.value=y.displacementScale,S.displacementBias.value=y.displacementBias),y.emissiveMap&&(S.emissiveMap.value=y.emissiveMap,n(y.emissiveMap,S.emissiveMapTransform)),y.specularMap&&(S.specularMap.value=y.specularMap,n(y.specularMap,S.specularMapTransform)),y.alphaTest>0&&(S.alphaTest.value=y.alphaTest);const w=t.get(y),C=w.envMap,D=w.envMapRotation;C&&(S.envMap.value=C,Vr.copy(D),Vr.x*=-1,Vr.y*=-1,Vr.z*=-1,C.isCubeTexture&&C.isRenderTargetTexture===!1&&(Vr.y*=-1,Vr.z*=-1),S.envMapRotation.value.setFromMatrix4(cD.makeRotationFromEuler(Vr)),S.flipEnvMap.value=C.isCubeTexture&&C.isRenderTargetTexture===!1?-1:1,S.reflectivity.value=y.reflectivity,S.ior.value=y.ior,S.refractionRatio.value=y.refractionRatio),y.lightMap&&(S.lightMap.value=y.lightMap,S.lightMapIntensity.value=y.lightMapIntensity,n(y.lightMap,S.lightMapTransform)),y.aoMap&&(S.aoMap.value=y.aoMap,S.aoMapIntensity.value=y.aoMapIntensity,n(y.aoMap,S.aoMapTransform))}function c(S,y){S.diffuse.value.copy(y.color),S.opacity.value=y.opacity,y.map&&(S.map.value=y.map,n(y.map,S.mapTransform))}function f(S,y){S.dashSize.value=y.dashSize,S.totalSize.value=y.dashSize+y.gapSize,S.scale.value=y.scale}function p(S,y,w,C){S.diffuse.value.copy(y.color),S.opacity.value=y.opacity,S.size.value=y.size*w,S.scale.value=C*.5,y.map&&(S.map.value=y.map,n(y.map,S.uvTransform)),y.alphaMap&&(S.alphaMap.value=y.alphaMap,n(y.alphaMap,S.alphaMapTransform)),y.alphaTest>0&&(S.alphaTest.value=y.alphaTest)}function d(S,y){S.diffuse.value.copy(y.color),S.opacity.value=y.opacity,S.rotation.value=y.rotation,y.map&&(S.map.value=y.map,n(y.map,S.mapTransform)),y.alphaMap&&(S.alphaMap.value=y.alphaMap,n(y.alphaMap,S.alphaMapTransform)),y.alphaTest>0&&(S.alphaTest.value=y.alphaTest)}function m(S,y){S.specular.value.copy(y.specular),S.shininess.value=Math.max(y.shininess,1e-4)}function v(S,y){y.gradientMap&&(S.gradientMap.value=y.gradientMap)}function _(S,y){S.metalness.value=y.metalness,y.metalnessMap&&(S.metalnessMap.value=y.metalnessMap,n(y.metalnessMap,S.metalnessMapTransform)),S.roughness.value=y.roughness,y.roughnessMap&&(S.roughnessMap.value=y.roughnessMap,n(y.roughnessMap,S.roughnessMapTransform)),y.envMap&&(S.envMapIntensity.value=y.envMapIntensity)}function x(S,y,w){S.ior.value=y.ior,y.sheen>0&&(S.sheenColor.value.copy(y.sheenColor).multiplyScalar(y.sheen),S.sheenRoughness.value=y.sheenRoughness,y.sheenColorMap&&(S.sheenColorMap.value=y.sheenColorMap,n(y.sheenColorMap,S.sheenColorMapTransform)),y.sheenRoughnessMap&&(S.sheenRoughnessMap.value=y.sheenRoughnessMap,n(y.sheenRoughnessMap,S.sheenRoughnessMapTransform))),y.clearcoat>0&&(S.clearcoat.value=y.clearcoat,S.clearcoatRoughness.value=y.clearcoatRoughness,y.clearcoatMap&&(S.clearcoatMap.value=y.clearcoatMap,n(y.clearcoatMap,S.clearcoatMapTransform)),y.clearcoatRoughnessMap&&(S.clearcoatRoughnessMap.value=y.clearcoatRoughnessMap,n(y.clearcoatRoughnessMap,S.clearcoatRoughnessMapTransform)),y.clearcoatNormalMap&&(S.clearcoatNormalMap.value=y.clearcoatNormalMap,n(y.clearcoatNormalMap,S.clearcoatNormalMapTransform),S.clearcoatNormalScale.value.copy(y.clearcoatNormalScale),y.side===$n&&S.clearcoatNormalScale.value.negate())),y.dispersion>0&&(S.dispersion.value=y.dispersion),y.iridescence>0&&(S.iridescence.value=y.iridescence,S.iridescenceIOR.value=y.iridescenceIOR,S.iridescenceThicknessMinimum.value=y.iridescenceThicknessRange[0],S.iridescenceThicknessMaximum.value=y.iridescenceThicknessRange[1],y.iridescenceMap&&(S.iridescenceMap.value=y.iridescenceMap,n(y.iridescenceMap,S.iridescenceMapTransform)),y.iridescenceThicknessMap&&(S.iridescenceThicknessMap.value=y.iridescenceThicknessMap,n(y.iridescenceThicknessMap,S.iridescenceThicknessMapTransform))),y.transmission>0&&(S.transmission.value=y.transmission,S.transmissionSamplerMap.value=w.texture,S.transmissionSamplerSize.value.set(w.width,w.height),y.transmissionMap&&(S.transmissionMap.value=y.transmissionMap,n(y.transmissionMap,S.transmissionMapTransform)),S.thickness.value=y.thickness,y.thicknessMap&&(S.thicknessMap.value=y.thicknessMap,n(y.thicknessMap,S.thicknessMapTransform)),S.attenuationDistance.value=y.attenuationDistance,S.attenuationColor.value.copy(y.attenuationColor)),y.anisotropy>0&&(S.anisotropyVector.value.set(y.anisotropy*Math.cos(y.anisotropyRotation),y.anisotropy*Math.sin(y.anisotropyRotation)),y.anisotropyMap&&(S.anisotropyMap.value=y.anisotropyMap,n(y.anisotropyMap,S.anisotropyMapTransform))),S.specularIntensity.value=y.specularIntensity,S.specularColor.value.copy(y.specularColor),y.specularColorMap&&(S.specularColorMap.value=y.specularColorMap,n(y.specularColorMap,S.specularColorMapTransform)),y.specularIntensityMap&&(S.specularIntensityMap.value=y.specularIntensityMap,n(y.specularIntensityMap,S.specularIntensityMapTransform))}function E(S,y){y.matcap&&(S.matcap.value=y.matcap)}function T(S,y){const w=t.get(y).light;S.referencePosition.value.setFromMatrixPosition(w.matrixWorld),S.nearDistance.value=w.shadow.camera.near,S.farDistance.value=w.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:o}}function hD(i,t,n,r){let o={},u={},c=[];const f=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function p(w,C){const D=C.program;r.uniformBlockBinding(w,D)}function d(w,C){let D=o[w.id];D===void 0&&(E(w),D=m(w),o[w.id]=D,w.addEventListener("dispose",S));const N=C.program;r.updateUBOMapping(w,N);const F=t.render.frame;u[w.id]!==F&&(_(w),u[w.id]=F)}function m(w){const C=v();w.__bindingPointIndex=C;const D=i.createBuffer(),N=w.__size,F=w.usage;return i.bindBuffer(i.UNIFORM_BUFFER,D),i.bufferData(i.UNIFORM_BUFFER,N,F),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,C,D),D}function v(){for(let w=0;w<f;w++)if(c.indexOf(w)===-1)return c.push(w),w;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function _(w){const C=o[w.id],D=w.uniforms,N=w.__cache;i.bindBuffer(i.UNIFORM_BUFFER,C);for(let F=0,z=D.length;F<z;F++){const H=Array.isArray(D[F])?D[F]:[D[F]];for(let U=0,L=H.length;U<L;U++){const G=H[U];if(x(G,F,U,N)===!0){const nt=G.__offset,ct=Array.isArray(G.value)?G.value:[G.value];let pt=0;for(let ut=0;ut<ct.length;ut++){const I=ct[ut],q=T(I);typeof I=="number"||typeof I=="boolean"?(G.__data[0]=I,i.bufferSubData(i.UNIFORM_BUFFER,nt+pt,G.__data)):I.isMatrix3?(G.__data[0]=I.elements[0],G.__data[1]=I.elements[1],G.__data[2]=I.elements[2],G.__data[3]=0,G.__data[4]=I.elements[3],G.__data[5]=I.elements[4],G.__data[6]=I.elements[5],G.__data[7]=0,G.__data[8]=I.elements[6],G.__data[9]=I.elements[7],G.__data[10]=I.elements[8],G.__data[11]=0):(I.toArray(G.__data,pt),pt+=q.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,nt,G.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function x(w,C,D,N){const F=w.value,z=C+"_"+D;if(N[z]===void 0)return typeof F=="number"||typeof F=="boolean"?N[z]=F:N[z]=F.clone(),!0;{const H=N[z];if(typeof F=="number"||typeof F=="boolean"){if(H!==F)return N[z]=F,!0}else if(H.equals(F)===!1)return H.copy(F),!0}return!1}function E(w){const C=w.uniforms;let D=0;const N=16;for(let z=0,H=C.length;z<H;z++){const U=Array.isArray(C[z])?C[z]:[C[z]];for(let L=0,G=U.length;L<G;L++){const nt=U[L],ct=Array.isArray(nt.value)?nt.value:[nt.value];for(let pt=0,ut=ct.length;pt<ut;pt++){const I=ct[pt],q=T(I),W=D%N,yt=W%q.boundary,P=W+yt;D+=yt,P!==0&&N-P<q.storage&&(D+=N-P),nt.__data=new Float32Array(q.storage/Float32Array.BYTES_PER_ELEMENT),nt.__offset=D,D+=q.storage}}}const F=D%N;return F>0&&(D+=N-F),w.__size=D,w.__cache={},this}function T(w){const C={boundary:0,storage:0};return typeof w=="number"||typeof w=="boolean"?(C.boundary=4,C.storage=4):w.isVector2?(C.boundary=8,C.storage=8):w.isVector3||w.isColor?(C.boundary=16,C.storage=12):w.isVector4?(C.boundary=16,C.storage=16):w.isMatrix3?(C.boundary=48,C.storage=48):w.isMatrix4?(C.boundary=64,C.storage=64):w.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",w),C}function S(w){const C=w.target;C.removeEventListener("dispose",S);const D=c.indexOf(C.__bindingPointIndex);c.splice(D,1),i.deleteBuffer(o[C.id]),delete o[C.id],delete u[C.id]}function y(){for(const w in o)i.deleteBuffer(o[w]);c=[],o={},u={}}return{bind:p,update:d,dispose:y}}class dD{constructor(t={}){const{canvas:n=$A(),context:r=null,depth:o=!0,stencil:u=!1,alpha:c=!1,antialias:f=!1,premultipliedAlpha:p=!0,preserveDrawingBuffer:d=!1,powerPreference:m="default",failIfMajorPerformanceCaveat:v=!1,reversedDepthBuffer:_=!1}=t;this.isWebGLRenderer=!0;let x;if(r!==null){if(typeof WebGLRenderingContext<"u"&&r instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");x=r.getContextAttributes().alpha}else x=c;const E=new Uint32Array(4),T=new Int32Array(4);let S=null,y=null;const w=[],C=[];this.domElement=n,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=hr,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const D=this;let N=!1;this._outputColorSpace=Si;let F=0,z=0,H=null,U=-1,L=null;const G=new rn,nt=new rn;let ct=null;const pt=new Ie(0);let ut=0,I=n.width,q=n.height,W=1,yt=null,P=null;const J=new rn(0,0,I,q),xt=new rn(0,0,I,q);let St=!1;const Ut=new jS;let Vt=!1,et=!1;const vt=new yn,At=new rt,Qt=new rn,Yt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let me=!1;function un(){return H===null?W:1}let V=r;function Le(R,Y){return n.getContext(R,Y)}try{const R={alpha:!0,depth:o,stencil:u,antialias:f,premultipliedAlpha:p,preserveDrawingBuffer:d,powerPreference:m,failIfMajorPerformanceCaveat:v};if("setAttribute"in n&&n.setAttribute("data-engine",`three.js r${Pm}`),n.addEventListener("webglcontextlost",Ct,!1),n.addEventListener("webglcontextrestored",Ft,!1),n.addEventListener("webglcontextcreationerror",Et,!1),V===null){const Y="webgl2";if(V=Le(Y,R),V===null)throw Le(Y)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(R){throw console.error("THREE.WebGLRenderer: "+R.message),R}let oe,ie,Ot,He,Gt,le,je,Ke,O,b,tt,ft,mt,lt,Bt,Rt,Xt,jt,Mt,Lt,Zt,kt,wt,ue;function X(){oe=new Ew(V),oe.init(),kt=new rD(V,oe),ie=new gw(V,oe,t,kt),Ot=new iD(V,oe),ie.reversedDepthBuffer&&_&&Ot.buffers.depth.setReversed(!0),He=new Aw(V),Gt=new X2,le=new aD(V,oe,Ot,Gt,ie,kt,He),je=new _w(D),Ke=new Mw(D),O=new L1(V),wt=new pw(V,O),b=new Tw(V,O,He,wt),tt=new Cw(V,b,O,He),Mt=new Rw(V,ie,le),Rt=new vw(Gt),ft=new k2(D,je,Ke,oe,ie,wt,Rt),mt=new fD(D,Gt),lt=new q2,Bt=new $2(oe),jt=new dw(D,je,Ke,Ot,tt,x,p),Xt=new eD(D,tt,ie),ue=new hD(V,He,ie,Ot),Lt=new mw(V,oe,He),Zt=new bw(V,oe,He),He.programs=ft.programs,D.capabilities=ie,D.extensions=oe,D.properties=Gt,D.renderLists=lt,D.shadowMap=Xt,D.state=Ot,D.info=He}X();const bt=new uD(D,V);this.xr=bt,this.getContext=function(){return V},this.getContextAttributes=function(){return V.getContextAttributes()},this.forceContextLoss=function(){const R=oe.get("WEBGL_lose_context");R&&R.loseContext()},this.forceContextRestore=function(){const R=oe.get("WEBGL_lose_context");R&&R.restoreContext()},this.getPixelRatio=function(){return W},this.setPixelRatio=function(R){R!==void 0&&(W=R,this.setSize(I,q,!1))},this.getSize=function(R){return R.set(I,q)},this.setSize=function(R,Y,st=!0){if(bt.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}I=R,q=Y,n.width=Math.floor(R*W),n.height=Math.floor(Y*W),st===!0&&(n.style.width=R+"px",n.style.height=Y+"px"),this.setViewport(0,0,R,Y)},this.getDrawingBufferSize=function(R){return R.set(I*W,q*W).floor()},this.setDrawingBufferSize=function(R,Y,st){I=R,q=Y,W=st,n.width=Math.floor(R*st),n.height=Math.floor(Y*st),this.setViewport(0,0,R,Y)},this.getCurrentViewport=function(R){return R.copy(G)},this.getViewport=function(R){return R.copy(J)},this.setViewport=function(R,Y,st,ot){R.isVector4?J.set(R.x,R.y,R.z,R.w):J.set(R,Y,st,ot),Ot.viewport(G.copy(J).multiplyScalar(W).round())},this.getScissor=function(R){return R.copy(xt)},this.setScissor=function(R,Y,st,ot){R.isVector4?xt.set(R.x,R.y,R.z,R.w):xt.set(R,Y,st,ot),Ot.scissor(nt.copy(xt).multiplyScalar(W).round())},this.getScissorTest=function(){return St},this.setScissorTest=function(R){Ot.setScissorTest(St=R)},this.setOpaqueSort=function(R){yt=R},this.setTransparentSort=function(R){P=R},this.getClearColor=function(R){return R.copy(jt.getClearColor())},this.setClearColor=function(){jt.setClearColor(...arguments)},this.getClearAlpha=function(){return jt.getClearAlpha()},this.setClearAlpha=function(){jt.setClearAlpha(...arguments)},this.clear=function(R=!0,Y=!0,st=!0){let ot=0;if(R){let K=!1;if(H!==null){const Tt=H.texture.format;K=Tt===zm||Tt===Im||Tt===Fm}if(K){const Tt=H.texture.type,Dt=Tt===ba||Tt===es||Tt===Pl||Tt===Nl||Tt===Om||Tt===Bm,It=jt.getClearColor(),Pt=jt.getClearAlpha(),Jt=It.r,ee=It.g,Wt=It.b;Dt?(E[0]=Jt,E[1]=ee,E[2]=Wt,E[3]=Pt,V.clearBufferuiv(V.COLOR,0,E)):(T[0]=Jt,T[1]=ee,T[2]=Wt,T[3]=Pt,V.clearBufferiv(V.COLOR,0,T))}else ot|=V.COLOR_BUFFER_BIT}Y&&(ot|=V.DEPTH_BUFFER_BIT),st&&(ot|=V.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),V.clear(ot)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){n.removeEventListener("webglcontextlost",Ct,!1),n.removeEventListener("webglcontextrestored",Ft,!1),n.removeEventListener("webglcontextcreationerror",Et,!1),jt.dispose(),lt.dispose(),Bt.dispose(),Gt.dispose(),je.dispose(),Ke.dispose(),tt.dispose(),wt.dispose(),ue.dispose(),ft.dispose(),bt.dispose(),bt.removeEventListener("sessionstart",mn),bt.removeEventListener("sessionend",gn),Je.stop()};function Ct(R){R.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),N=!0}function Ft(){console.log("THREE.WebGLRenderer: Context Restored."),N=!1;const R=He.autoReset,Y=Xt.enabled,st=Xt.autoUpdate,ot=Xt.needsUpdate,K=Xt.type;X(),He.autoReset=R,Xt.enabled=Y,Xt.autoUpdate=st,Xt.needsUpdate=ot,Xt.type=K}function Et(R){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",R.statusMessage)}function _t(R){const Y=R.target;Y.removeEventListener("dispose",_t),Ht(Y)}function Ht(R){se(R),Gt.remove(R)}function se(R){const Y=Gt.get(R).programs;Y!==void 0&&(Y.forEach(function(st){ft.releaseProgram(st)}),R.isShaderMaterial&&ft.releaseShaderCache(R))}this.renderBufferDirect=function(R,Y,st,ot,K,Tt){Y===null&&(Y=Yt);const Dt=K.isMesh&&K.matrixWorld.determinant()<0,It=La(R,Y,st,ot,K);Ot.setMaterial(ot,Dt);let Pt=st.index,Jt=1;if(ot.wireframe===!0){if(Pt=b.getWireframeAttribute(st),Pt===void 0)return;Jt=2}const ee=st.drawRange,Wt=st.attributes.position;let he=ee.start*Jt,Te=(ee.start+ee.count)*Jt;Tt!==null&&(he=Math.max(he,Tt.start*Jt),Te=Math.min(Te,(Tt.start+Tt.count)*Jt)),Pt!==null?(he=Math.max(he,0),Te=Math.min(Te,Pt.count)):Wt!=null&&(he=Math.max(he,0),Te=Math.min(Te,Wt.count));const Xe=Te-he;if(Xe<0||Xe===1/0)return;wt.setup(K,ot,It,st,Pt);let Pe,de=Lt;if(Pt!==null&&(Pe=O.get(Pt),de=Zt,de.setIndex(Pe)),K.isMesh)ot.wireframe===!0?(Ot.setLineWidth(ot.wireframeLinewidth*un()),de.setMode(V.LINES)):de.setMode(V.TRIANGLES);else if(K.isLine){let $t=ot.linewidth;$t===void 0&&($t=1),Ot.setLineWidth($t*un()),K.isLineSegments?de.setMode(V.LINES):K.isLineLoop?de.setMode(V.LINE_LOOP):de.setMode(V.LINE_STRIP)}else K.isPoints?de.setMode(V.POINTS):K.isSprite&&de.setMode(V.TRIANGLES);if(K.isBatchedMesh)if(K._multiDrawInstances!==null)Fl("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),de.renderMultiDrawInstances(K._multiDrawStarts,K._multiDrawCounts,K._multiDrawCount,K._multiDrawInstances);else if(oe.get("WEBGL_multi_draw"))de.renderMultiDraw(K._multiDrawStarts,K._multiDrawCounts,K._multiDrawCount);else{const $t=K._multiDrawStarts,ke=K._multiDrawCounts,_e=K._multiDrawCount,Ln=Pt?O.get(Pt).bytesPerElement:1,bi=Gt.get(ot).currentProgram.getUniforms();for(let zn=0;zn<_e;zn++)bi.setValue(V,"_gl_DrawID",zn),de.render($t[zn]/Ln,ke[zn])}else if(K.isInstancedMesh)de.renderInstances(he,Xe,K.count);else if(st.isInstancedBufferGeometry){const $t=st._maxInstanceCount!==void 0?st._maxInstanceCount:1/0,ke=Math.min(st.instanceCount,$t);de.renderInstances(he,Xe,ke)}else de.render(he,Xe)};function Ce(R,Y,st){R.transparent===!0&&R.side===Ma&&R.forceSinglePass===!1?(R.side=$n,R.needsUpdate=!0,Vi(R,Y,st),R.side=pr,R.needsUpdate=!0,Vi(R,Y,st),R.side=Ma):Vi(R,Y,st)}this.compile=function(R,Y,st=null){st===null&&(st=R),y=Bt.get(st),y.init(Y),C.push(y),st.traverseVisible(function(K){K.isLight&&K.layers.test(Y.layers)&&(y.pushLight(K),K.castShadow&&y.pushShadow(K))}),R!==st&&R.traverseVisible(function(K){K.isLight&&K.layers.test(Y.layers)&&(y.pushLight(K),K.castShadow&&y.pushShadow(K))}),y.setupLights();const ot=new Set;return R.traverse(function(K){if(!(K.isMesh||K.isPoints||K.isLine||K.isSprite))return;const Tt=K.material;if(Tt)if(Array.isArray(Tt))for(let Dt=0;Dt<Tt.length;Dt++){const It=Tt[Dt];Ce(It,st,K),ot.add(It)}else Ce(Tt,st,K),ot.add(Tt)}),y=C.pop(),ot},this.compileAsync=function(R,Y,st=null){const ot=this.compile(R,Y,st);return new Promise(K=>{function Tt(){if(ot.forEach(function(Dt){Gt.get(Dt).currentProgram.isReady()&&ot.delete(Dt)}),ot.size===0){K(R);return}setTimeout(Tt,10)}oe.get("KHR_parallel_shader_compile")!==null?Tt():setTimeout(Tt,10)})};let Ee=null;function Ti(R){Ee&&Ee(R)}function mn(){Je.stop()}function gn(){Je.start()}const Je=new $S;Je.setAnimationLoop(Ti),typeof self<"u"&&Je.setContext(self),this.setAnimationLoop=function(R){Ee=R,bt.setAnimationLoop(R),R===null?Je.stop():Je.start()},bt.addEventListener("sessionstart",mn),bt.addEventListener("sessionend",gn),this.render=function(R,Y){if(Y!==void 0&&Y.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(N===!0)return;if(R.matrixWorldAutoUpdate===!0&&R.updateMatrixWorld(),Y.parent===null&&Y.matrixWorldAutoUpdate===!0&&Y.updateMatrixWorld(),bt.enabled===!0&&bt.isPresenting===!0&&(bt.cameraAutoUpdate===!0&&bt.updateCamera(Y),Y=bt.getCamera()),R.isScene===!0&&R.onBeforeRender(D,R,Y,H),y=Bt.get(R,C.length),y.init(Y),C.push(y),vt.multiplyMatrices(Y.projectionMatrix,Y.matrixWorldInverse),Ut.setFromProjectionMatrix(vt,Yi,Y.reversedDepth),et=this.localClippingEnabled,Vt=Rt.init(this.clippingPlanes,et),S=lt.get(R,w.length),S.init(),w.push(S),bt.enabled===!0&&bt.isPresenting===!0){const Tt=D.xr.getDepthSensingMesh();Tt!==null&&zi(Tt,Y,-1/0,D.sortObjects)}zi(R,Y,0,D.sortObjects),S.finish(),D.sortObjects===!0&&S.sort(yt,P),me=bt.enabled===!1||bt.isPresenting===!1||bt.hasDepthSensing()===!1,me&&jt.addToRenderList(S,R),this.info.render.frame++,Vt===!0&&Rt.beginShadows();const st=y.state.shadowsArray;Xt.render(st,R,Y),Vt===!0&&Rt.endShadows(),this.info.autoReset===!0&&this.info.reset();const ot=S.opaque,K=S.transmissive;if(y.setupLights(),Y.isArrayCamera){const Tt=Y.cameras;if(K.length>0)for(let Dt=0,It=Tt.length;Dt<It;Dt++){const Pt=Tt[Dt];au(ot,K,R,Pt)}me&&jt.render(R);for(let Dt=0,It=Tt.length;Dt<It;Dt++){const Pt=Tt[Dt];as(S,R,Pt,Pt.viewport)}}else K.length>0&&au(ot,K,R,Y),me&&jt.render(R),as(S,R,Y);H!==null&&z===0&&(le.updateMultisampleRenderTarget(H),le.updateRenderTargetMipmap(H)),R.isScene===!0&&R.onAfterRender(D,R,Y),wt.resetDefaultState(),U=-1,L=null,C.pop(),C.length>0?(y=C[C.length-1],Vt===!0&&Rt.setGlobalState(D.clippingPlanes,y.state.camera)):y=null,w.pop(),w.length>0?S=w[w.length-1]:S=null};function zi(R,Y,st,ot){if(R.visible===!1)return;if(R.layers.test(Y.layers)){if(R.isGroup)st=R.renderOrder;else if(R.isLOD)R.autoUpdate===!0&&R.update(Y);else if(R.isLight)y.pushLight(R),R.castShadow&&y.pushShadow(R);else if(R.isSprite){if(!R.frustumCulled||Ut.intersectsSprite(R)){ot&&Qt.setFromMatrixPosition(R.matrixWorld).applyMatrix4(vt);const Dt=tt.update(R),It=R.material;It.visible&&S.push(R,Dt,It,st,Qt.z,null)}}else if((R.isMesh||R.isLine||R.isPoints)&&(!R.frustumCulled||Ut.intersectsObject(R))){const Dt=tt.update(R),It=R.material;if(ot&&(R.boundingSphere!==void 0?(R.boundingSphere===null&&R.computeBoundingSphere(),Qt.copy(R.boundingSphere.center)):(Dt.boundingSphere===null&&Dt.computeBoundingSphere(),Qt.copy(Dt.boundingSphere.center)),Qt.applyMatrix4(R.matrixWorld).applyMatrix4(vt)),Array.isArray(It)){const Pt=Dt.groups;for(let Jt=0,ee=Pt.length;Jt<ee;Jt++){const Wt=Pt[Jt],he=It[Wt.materialIndex];he&&he.visible&&S.push(R,Dt,he,st,Qt.z,Wt)}}else It.visible&&S.push(R,Dt,It,st,Qt.z,null)}}const Tt=R.children;for(let Dt=0,It=Tt.length;Dt<It;Dt++)zi(Tt[Dt],Y,st,ot)}function as(R,Y,st,ot){const K=R.opaque,Tt=R.transmissive,Dt=R.transparent;y.setupLightsView(st),Vt===!0&&Rt.setGlobalState(D.clippingPlanes,st),ot&&Ot.viewport(G.copy(ot)),K.length>0&&rs(K,Y,st),Tt.length>0&&rs(Tt,Y,st),Dt.length>0&&rs(Dt,Y,st),Ot.buffers.depth.setTest(!0),Ot.buffers.depth.setMask(!0),Ot.buffers.color.setMask(!0),Ot.setPolygonOffset(!1)}function au(R,Y,st,ot){if((st.isScene===!0?st.overrideMaterial:null)!==null)return;y.state.transmissionRenderTarget[ot.id]===void 0&&(y.state.transmissionRenderTarget[ot.id]=new Aa(1,1,{generateMipmaps:!0,type:oe.has("EXT_color_buffer_half_float")||oe.has("EXT_color_buffer_float")?Wl:ba,minFilter:jr,samples:4,stencilBuffer:u,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Ae.workingColorSpace}));const Tt=y.state.transmissionRenderTarget[ot.id],Dt=ot.viewport||G;Tt.setSize(Dt.z*D.transmissionResolutionScale,Dt.w*D.transmissionResolutionScale);const It=D.getRenderTarget(),Pt=D.getActiveCubeFace(),Jt=D.getActiveMipmapLevel();D.setRenderTarget(Tt),D.getClearColor(pt),ut=D.getClearAlpha(),ut<1&&D.setClearColor(16777215,.5),D.clear(),me&&jt.render(st);const ee=D.toneMapping;D.toneMapping=hr;const Wt=ot.viewport;if(ot.viewport!==void 0&&(ot.viewport=void 0),y.setupLightsView(ot),Vt===!0&&Rt.setGlobalState(D.clippingPlanes,ot),rs(R,st,ot),le.updateMultisampleRenderTarget(Tt),le.updateRenderTargetMipmap(Tt),oe.has("WEBGL_multisampled_render_to_texture")===!1){let he=!1;for(let Te=0,Xe=Y.length;Te<Xe;Te++){const Pe=Y[Te],de=Pe.object,$t=Pe.geometry,ke=Pe.material,_e=Pe.group;if(ke.side===Ma&&de.layers.test(ot.layers)){const Ln=ke.side;ke.side=$n,ke.needsUpdate=!0,To(de,st,ot,$t,ke,_e),ke.side=Ln,ke.needsUpdate=!0,he=!0}}he===!0&&(le.updateMultisampleRenderTarget(Tt),le.updateRenderTargetMipmap(Tt))}D.setRenderTarget(It,Pt,Jt),D.setClearColor(pt,ut),Wt!==void 0&&(ot.viewport=Wt),D.toneMapping=ee}function rs(R,Y,st){const ot=Y.isScene===!0?Y.overrideMaterial:null;for(let K=0,Tt=R.length;K<Tt;K++){const Dt=R[K],It=Dt.object,Pt=Dt.geometry,Jt=Dt.group;let ee=Dt.material;ee.allowOverride===!0&&ot!==null&&(ee=ot),It.layers.test(st.layers)&&To(It,Y,st,Pt,ee,Jt)}}function To(R,Y,st,ot,K,Tt){R.onBeforeRender(D,Y,st,ot,K,Tt),R.modelViewMatrix.multiplyMatrices(st.matrixWorldInverse,R.matrixWorld),R.normalMatrix.getNormalMatrix(R.modelViewMatrix),K.onBeforeRender(D,Y,st,ot,R,Tt),K.transparent===!0&&K.side===Ma&&K.forceSinglePass===!1?(K.side=$n,K.needsUpdate=!0,D.renderBufferDirect(st,Y,ot,K,R,Tt),K.side=pr,K.needsUpdate=!0,D.renderBufferDirect(st,Y,ot,K,R,Tt),K.side=Ma):D.renderBufferDirect(st,Y,ot,K,R,Tt),R.onAfterRender(D,Y,st,ot,K,Tt)}function Vi(R,Y,st){Y.isScene!==!0&&(Y=Yt);const ot=Gt.get(R),K=y.state.lights,Tt=y.state.shadowsArray,Dt=K.state.version,It=ft.getParameters(R,K.state,Tt,Y,st),Pt=ft.getProgramCacheKey(It);let Jt=ot.programs;ot.environment=R.isMeshStandardMaterial?Y.environment:null,ot.fog=Y.fog,ot.envMap=(R.isMeshStandardMaterial?Ke:je).get(R.envMap||ot.environment),ot.envMapRotation=ot.environment!==null&&R.envMap===null?Y.environmentRotation:R.envMapRotation,Jt===void 0&&(R.addEventListener("dispose",_t),Jt=new Map,ot.programs=Jt);let ee=Jt.get(Pt);if(ee!==void 0){if(ot.currentProgram===ee&&ot.lightsStateVersion===Dt)return ea(R,It),ee}else It.uniforms=ft.getUniforms(R),R.onBeforeCompile(It,D),ee=ft.acquireProgram(It,Pt),Jt.set(Pt,ee),ot.uniforms=It.uniforms;const Wt=ot.uniforms;return(!R.isShaderMaterial&&!R.isRawShaderMaterial||R.clipping===!0)&&(Wt.clippingPlanes=Rt.uniform),ea(R,It),ot.needsLights=Pa(R),ot.lightsStateVersion=Dt,ot.needsLights&&(Wt.ambientLightColor.value=K.state.ambient,Wt.lightProbe.value=K.state.probe,Wt.directionalLights.value=K.state.directional,Wt.directionalLightShadows.value=K.state.directionalShadow,Wt.spotLights.value=K.state.spot,Wt.spotLightShadows.value=K.state.spotShadow,Wt.rectAreaLights.value=K.state.rectArea,Wt.ltc_1.value=K.state.rectAreaLTC1,Wt.ltc_2.value=K.state.rectAreaLTC2,Wt.pointLights.value=K.state.point,Wt.pointLightShadows.value=K.state.pointShadow,Wt.hemisphereLights.value=K.state.hemi,Wt.directionalShadowMap.value=K.state.directionalShadowMap,Wt.directionalShadowMatrix.value=K.state.directionalShadowMatrix,Wt.spotShadowMap.value=K.state.spotShadowMap,Wt.spotLightMatrix.value=K.state.spotLightMatrix,Wt.spotLightMap.value=K.state.spotLightMap,Wt.pointShadowMap.value=K.state.pointShadowMap,Wt.pointShadowMatrix.value=K.state.pointShadowMatrix),ot.currentProgram=ee,ot.uniformsList=null,ee}function ss(R){if(R.uniformsList===null){const Y=R.currentProgram.getUniforms();R.uniformsList=Xc.seqWithValue(Y.seq,R.uniforms)}return R.uniformsList}function ea(R,Y){const st=Gt.get(R);st.outputColorSpace=Y.outputColorSpace,st.batching=Y.batching,st.batchingColor=Y.batchingColor,st.instancing=Y.instancing,st.instancingColor=Y.instancingColor,st.instancingMorph=Y.instancingMorph,st.skinning=Y.skinning,st.morphTargets=Y.morphTargets,st.morphNormals=Y.morphNormals,st.morphColors=Y.morphColors,st.morphTargetsCount=Y.morphTargetsCount,st.numClippingPlanes=Y.numClippingPlanes,st.numIntersection=Y.numClipIntersection,st.vertexAlphas=Y.vertexAlphas,st.vertexTangents=Y.vertexTangents,st.toneMapping=Y.toneMapping}function La(R,Y,st,ot,K){Y.isScene!==!0&&(Y=Yt),le.resetTextureUnits();const Tt=Y.fog,Dt=ot.isMeshStandardMaterial?Y.environment:null,It=H===null?D.outputColorSpace:H.isXRRenderTarget===!0?H.texture.colorSpace:fo,Pt=(ot.isMeshStandardMaterial?Ke:je).get(ot.envMap||Dt),Jt=ot.vertexColors===!0&&!!st.attributes.color&&st.attributes.color.itemSize===4,ee=!!st.attributes.tangent&&(!!ot.normalMap||ot.anisotropy>0),Wt=!!st.morphAttributes.position,he=!!st.morphAttributes.normal,Te=!!st.morphAttributes.color;let Xe=hr;ot.toneMapped&&(H===null||H.isXRRenderTarget===!0)&&(Xe=D.toneMapping);const Pe=st.morphAttributes.position||st.morphAttributes.normal||st.morphAttributes.color,de=Pe!==void 0?Pe.length:0,$t=Gt.get(ot),ke=y.state.lights;if(Vt===!0&&(et===!0||R!==L)){const tn=R===L&&ot.id===U;Rt.setState(ot,R,tn)}let _e=!1;ot.version===$t.__version?($t.needsLights&&$t.lightsStateVersion!==ke.state.version||$t.outputColorSpace!==It||K.isBatchedMesh&&$t.batching===!1||!K.isBatchedMesh&&$t.batching===!0||K.isBatchedMesh&&$t.batchingColor===!0&&K.colorTexture===null||K.isBatchedMesh&&$t.batchingColor===!1&&K.colorTexture!==null||K.isInstancedMesh&&$t.instancing===!1||!K.isInstancedMesh&&$t.instancing===!0||K.isSkinnedMesh&&$t.skinning===!1||!K.isSkinnedMesh&&$t.skinning===!0||K.isInstancedMesh&&$t.instancingColor===!0&&K.instanceColor===null||K.isInstancedMesh&&$t.instancingColor===!1&&K.instanceColor!==null||K.isInstancedMesh&&$t.instancingMorph===!0&&K.morphTexture===null||K.isInstancedMesh&&$t.instancingMorph===!1&&K.morphTexture!==null||$t.envMap!==Pt||ot.fog===!0&&$t.fog!==Tt||$t.numClippingPlanes!==void 0&&($t.numClippingPlanes!==Rt.numPlanes||$t.numIntersection!==Rt.numIntersection)||$t.vertexAlphas!==Jt||$t.vertexTangents!==ee||$t.morphTargets!==Wt||$t.morphNormals!==he||$t.morphColors!==Te||$t.toneMapping!==Xe||$t.morphTargetsCount!==de)&&(_e=!0):(_e=!0,$t.__version=ot.version);let Ln=$t.currentProgram;_e===!0&&(Ln=Vi(ot,Y,K));let bi=!1,zn=!1,Mn=!1;const ze=Ln.getUniforms(),Vn=$t.uniforms;if(Ot.useProgram(Ln.program)&&(bi=!0,zn=!0,Mn=!0),ot.id!==U&&(U=ot.id,zn=!0),bi||L!==R){Ot.buffers.depth.getReversed()&&R.reversedDepth!==!0&&(R._reversedDepth=!0,R.updateProjectionMatrix()),ze.setValue(V,"projectionMatrix",R.projectionMatrix),ze.setValue(V,"viewMatrix",R.matrixWorldInverse);const Rn=ze.map.cameraPosition;Rn!==void 0&&Rn.setValue(V,At.setFromMatrixPosition(R.matrixWorld)),ie.logarithmicDepthBuffer&&ze.setValue(V,"logDepthBufFC",2/(Math.log(R.far+1)/Math.LN2)),(ot.isMeshPhongMaterial||ot.isMeshToonMaterial||ot.isMeshLambertMaterial||ot.isMeshBasicMaterial||ot.isMeshStandardMaterial||ot.isShaderMaterial)&&ze.setValue(V,"isOrthographic",R.isOrthographicCamera===!0),L!==R&&(L=R,zn=!0,Mn=!0)}if(K.isSkinnedMesh){ze.setOptional(V,K,"bindMatrix"),ze.setOptional(V,K,"bindMatrixInverse");const tn=K.skeleton;tn&&(tn.boneTexture===null&&tn.computeBoneTexture(),ze.setValue(V,"boneTexture",tn.boneTexture,le))}K.isBatchedMesh&&(ze.setOptional(V,K,"batchingTexture"),ze.setValue(V,"batchingTexture",K._matricesTexture,le),ze.setOptional(V,K,"batchingIdTexture"),ze.setValue(V,"batchingIdTexture",K._indirectTexture,le),ze.setOptional(V,K,"batchingColorTexture"),K._colorsTexture!==null&&ze.setValue(V,"batchingColorTexture",K._colorsTexture,le));const Pn=st.morphAttributes;if((Pn.position!==void 0||Pn.normal!==void 0||Pn.color!==void 0)&&Mt.update(K,st,Ln),(zn||$t.receiveShadow!==K.receiveShadow)&&($t.receiveShadow=K.receiveShadow,ze.setValue(V,"receiveShadow",K.receiveShadow)),ot.isMeshGouraudMaterial&&ot.envMap!==null&&(Vn.envMap.value=Pt,Vn.flipEnvMap.value=Pt.isCubeTexture&&Pt.isRenderTargetTexture===!1?-1:1),ot.isMeshStandardMaterial&&ot.envMap===null&&Y.environment!==null&&(Vn.envMapIntensity.value=Y.environmentIntensity),zn&&(ze.setValue(V,"toneMappingExposure",D.toneMappingExposure),$t.needsLights&&_r(Vn,Mn),Tt&&ot.fog===!0&&mt.refreshFogUniforms(Vn,Tt),mt.refreshMaterialUniforms(Vn,ot,W,q,y.state.transmissionRenderTarget[R.id]),Xc.upload(V,ss($t),Vn,le)),ot.isShaderMaterial&&ot.uniformsNeedUpdate===!0&&(Xc.upload(V,ss($t),Vn,le),ot.uniformsNeedUpdate=!1),ot.isSpriteMaterial&&ze.setValue(V,"center",K.center),ze.setValue(V,"modelViewMatrix",K.modelViewMatrix),ze.setValue(V,"normalMatrix",K.normalMatrix),ze.setValue(V,"modelMatrix",K.matrixWorld),ot.isShaderMaterial||ot.isRawShaderMaterial){const tn=ot.uniformsGroups;for(let Rn=0,os=tn.length;Rn<os;Rn++){const Xn=tn[Rn];ue.update(Xn,Ln),ue.bind(Xn,Ln)}}return Ln}function _r(R,Y){R.ambientLightColor.needsUpdate=Y,R.lightProbe.needsUpdate=Y,R.directionalLights.needsUpdate=Y,R.directionalLightShadows.needsUpdate=Y,R.pointLights.needsUpdate=Y,R.pointLightShadows.needsUpdate=Y,R.spotLights.needsUpdate=Y,R.spotLightShadows.needsUpdate=Y,R.rectAreaLights.needsUpdate=Y,R.hemisphereLights.needsUpdate=Y}function Pa(R){return R.isMeshLambertMaterial||R.isMeshToonMaterial||R.isMeshPhongMaterial||R.isMeshStandardMaterial||R.isShadowMaterial||R.isShaderMaterial&&R.lights===!0}this.getActiveCubeFace=function(){return F},this.getActiveMipmapLevel=function(){return z},this.getRenderTarget=function(){return H},this.setRenderTargetTextures=function(R,Y,st){const ot=Gt.get(R);ot.__autoAllocateDepthBuffer=R.resolveDepthBuffer===!1,ot.__autoAllocateDepthBuffer===!1&&(ot.__useRenderToTexture=!1),Gt.get(R.texture).__webglTexture=Y,Gt.get(R.depthTexture).__webglTexture=ot.__autoAllocateDepthBuffer?void 0:st,ot.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(R,Y){const st=Gt.get(R);st.__webglFramebuffer=Y,st.__useDefaultFramebuffer=Y===void 0};const cn=V.createFramebuffer();this.setRenderTarget=function(R,Y=0,st=0){H=R,F=Y,z=st;let ot=!0,K=null,Tt=!1,Dt=!1;if(R){const Pt=Gt.get(R);if(Pt.__useDefaultFramebuffer!==void 0)Ot.bindFramebuffer(V.FRAMEBUFFER,null),ot=!1;else if(Pt.__webglFramebuffer===void 0)le.setupRenderTarget(R);else if(Pt.__hasExternalTextures)le.rebindTextures(R,Gt.get(R.texture).__webglTexture,Gt.get(R.depthTexture).__webglTexture);else if(R.depthBuffer){const Wt=R.depthTexture;if(Pt.__boundDepthTexture!==Wt){if(Wt!==null&&Gt.has(Wt)&&(R.width!==Wt.image.width||R.height!==Wt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");le.setupDepthRenderbuffer(R)}}const Jt=R.texture;(Jt.isData3DTexture||Jt.isDataArrayTexture||Jt.isCompressedArrayTexture)&&(Dt=!0);const ee=Gt.get(R).__webglFramebuffer;R.isWebGLCubeRenderTarget?(Array.isArray(ee[Y])?K=ee[Y][st]:K=ee[Y],Tt=!0):R.samples>0&&le.useMultisampledRTT(R)===!1?K=Gt.get(R).__webglMultisampledFramebuffer:Array.isArray(ee)?K=ee[st]:K=ee,G.copy(R.viewport),nt.copy(R.scissor),ct=R.scissorTest}else G.copy(J).multiplyScalar(W).floor(),nt.copy(xt).multiplyScalar(W).floor(),ct=St;if(st!==0&&(K=cn),Ot.bindFramebuffer(V.FRAMEBUFFER,K)&&ot&&Ot.drawBuffers(R,K),Ot.viewport(G),Ot.scissor(nt),Ot.setScissorTest(ct),Tt){const Pt=Gt.get(R.texture);V.framebufferTexture2D(V.FRAMEBUFFER,V.COLOR_ATTACHMENT0,V.TEXTURE_CUBE_MAP_POSITIVE_X+Y,Pt.__webglTexture,st)}else if(Dt){const Pt=Y;for(let Jt=0;Jt<R.textures.length;Jt++){const ee=Gt.get(R.textures[Jt]);V.framebufferTextureLayer(V.FRAMEBUFFER,V.COLOR_ATTACHMENT0+Jt,ee.__webglTexture,st,Pt)}}else if(R!==null&&st!==0){const Pt=Gt.get(R.texture);V.framebufferTexture2D(V.FRAMEBUFFER,V.COLOR_ATTACHMENT0,V.TEXTURE_2D,Pt.__webglTexture,st)}U=-1},this.readRenderTargetPixels=function(R,Y,st,ot,K,Tt,Dt,It=0){if(!(R&&R.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Pt=Gt.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Dt!==void 0&&(Pt=Pt[Dt]),Pt){Ot.bindFramebuffer(V.FRAMEBUFFER,Pt);try{const Jt=R.textures[It],ee=Jt.format,Wt=Jt.type;if(!ie.textureFormatReadable(ee)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!ie.textureTypeReadable(Wt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}Y>=0&&Y<=R.width-ot&&st>=0&&st<=R.height-K&&(R.textures.length>1&&V.readBuffer(V.COLOR_ATTACHMENT0+It),V.readPixels(Y,st,ot,K,kt.convert(ee),kt.convert(Wt),Tt))}finally{const Jt=H!==null?Gt.get(H).__webglFramebuffer:null;Ot.bindFramebuffer(V.FRAMEBUFFER,Jt)}}},this.readRenderTargetPixelsAsync=async function(R,Y,st,ot,K,Tt,Dt,It=0){if(!(R&&R.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Pt=Gt.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Dt!==void 0&&(Pt=Pt[Dt]),Pt)if(Y>=0&&Y<=R.width-ot&&st>=0&&st<=R.height-K){Ot.bindFramebuffer(V.FRAMEBUFFER,Pt);const Jt=R.textures[It],ee=Jt.format,Wt=Jt.type;if(!ie.textureFormatReadable(ee))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!ie.textureTypeReadable(Wt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const he=V.createBuffer();V.bindBuffer(V.PIXEL_PACK_BUFFER,he),V.bufferData(V.PIXEL_PACK_BUFFER,Tt.byteLength,V.STREAM_READ),R.textures.length>1&&V.readBuffer(V.COLOR_ATTACHMENT0+It),V.readPixels(Y,st,ot,K,kt.convert(ee),kt.convert(Wt),0);const Te=H!==null?Gt.get(H).__webglFramebuffer:null;Ot.bindFramebuffer(V.FRAMEBUFFER,Te);const Xe=V.fenceSync(V.SYNC_GPU_COMMANDS_COMPLETE,0);return V.flush(),await JA(V,Xe,4),V.bindBuffer(V.PIXEL_PACK_BUFFER,he),V.getBufferSubData(V.PIXEL_PACK_BUFFER,0,Tt),V.deleteBuffer(he),V.deleteSync(Xe),Tt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(R,Y=null,st=0){const ot=Math.pow(2,-st),K=Math.floor(R.image.width*ot),Tt=Math.floor(R.image.height*ot),Dt=Y!==null?Y.x:0,It=Y!==null?Y.y:0;le.setTexture2D(R,0),V.copyTexSubImage2D(V.TEXTURE_2D,st,0,0,Dt,It,K,Tt),Ot.unbindTexture()};const ru=V.createFramebuffer(),su=V.createFramebuffer();this.copyTextureToTexture=function(R,Y,st=null,ot=null,K=0,Tt=null){Tt===null&&(K!==0?(Fl("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),Tt=K,K=0):Tt=0);let Dt,It,Pt,Jt,ee,Wt,he,Te,Xe;const Pe=R.isCompressedTexture?R.mipmaps[Tt]:R.image;if(st!==null)Dt=st.max.x-st.min.x,It=st.max.y-st.min.y,Pt=st.isBox3?st.max.z-st.min.z:1,Jt=st.min.x,ee=st.min.y,Wt=st.isBox3?st.min.z:0;else{const Pn=Math.pow(2,-K);Dt=Math.floor(Pe.width*Pn),It=Math.floor(Pe.height*Pn),R.isDataArrayTexture?Pt=Pe.depth:R.isData3DTexture?Pt=Math.floor(Pe.depth*Pn):Pt=1,Jt=0,ee=0,Wt=0}ot!==null?(he=ot.x,Te=ot.y,Xe=ot.z):(he=0,Te=0,Xe=0);const de=kt.convert(Y.format),$t=kt.convert(Y.type);let ke;Y.isData3DTexture?(le.setTexture3D(Y,0),ke=V.TEXTURE_3D):Y.isDataArrayTexture||Y.isCompressedArrayTexture?(le.setTexture2DArray(Y,0),ke=V.TEXTURE_2D_ARRAY):(le.setTexture2D(Y,0),ke=V.TEXTURE_2D),V.pixelStorei(V.UNPACK_FLIP_Y_WEBGL,Y.flipY),V.pixelStorei(V.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Y.premultiplyAlpha),V.pixelStorei(V.UNPACK_ALIGNMENT,Y.unpackAlignment);const _e=V.getParameter(V.UNPACK_ROW_LENGTH),Ln=V.getParameter(V.UNPACK_IMAGE_HEIGHT),bi=V.getParameter(V.UNPACK_SKIP_PIXELS),zn=V.getParameter(V.UNPACK_SKIP_ROWS),Mn=V.getParameter(V.UNPACK_SKIP_IMAGES);V.pixelStorei(V.UNPACK_ROW_LENGTH,Pe.width),V.pixelStorei(V.UNPACK_IMAGE_HEIGHT,Pe.height),V.pixelStorei(V.UNPACK_SKIP_PIXELS,Jt),V.pixelStorei(V.UNPACK_SKIP_ROWS,ee),V.pixelStorei(V.UNPACK_SKIP_IMAGES,Wt);const ze=R.isDataArrayTexture||R.isData3DTexture,Vn=Y.isDataArrayTexture||Y.isData3DTexture;if(R.isDepthTexture){const Pn=Gt.get(R),tn=Gt.get(Y),Rn=Gt.get(Pn.__renderTarget),os=Gt.get(tn.__renderTarget);Ot.bindFramebuffer(V.READ_FRAMEBUFFER,Rn.__webglFramebuffer),Ot.bindFramebuffer(V.DRAW_FRAMEBUFFER,os.__webglFramebuffer);for(let Xn=0;Xn<Pt;Xn++)ze&&(V.framebufferTextureLayer(V.READ_FRAMEBUFFER,V.COLOR_ATTACHMENT0,Gt.get(R).__webglTexture,K,Wt+Xn),V.framebufferTextureLayer(V.DRAW_FRAMEBUFFER,V.COLOR_ATTACHMENT0,Gt.get(Y).__webglTexture,Tt,Xe+Xn)),V.blitFramebuffer(Jt,ee,Dt,It,he,Te,Dt,It,V.DEPTH_BUFFER_BIT,V.NEAREST);Ot.bindFramebuffer(V.READ_FRAMEBUFFER,null),Ot.bindFramebuffer(V.DRAW_FRAMEBUFFER,null)}else if(K!==0||R.isRenderTargetTexture||Gt.has(R)){const Pn=Gt.get(R),tn=Gt.get(Y);Ot.bindFramebuffer(V.READ_FRAMEBUFFER,ru),Ot.bindFramebuffer(V.DRAW_FRAMEBUFFER,su);for(let Rn=0;Rn<Pt;Rn++)ze?V.framebufferTextureLayer(V.READ_FRAMEBUFFER,V.COLOR_ATTACHMENT0,Pn.__webglTexture,K,Wt+Rn):V.framebufferTexture2D(V.READ_FRAMEBUFFER,V.COLOR_ATTACHMENT0,V.TEXTURE_2D,Pn.__webglTexture,K),Vn?V.framebufferTextureLayer(V.DRAW_FRAMEBUFFER,V.COLOR_ATTACHMENT0,tn.__webglTexture,Tt,Xe+Rn):V.framebufferTexture2D(V.DRAW_FRAMEBUFFER,V.COLOR_ATTACHMENT0,V.TEXTURE_2D,tn.__webglTexture,Tt),K!==0?V.blitFramebuffer(Jt,ee,Dt,It,he,Te,Dt,It,V.COLOR_BUFFER_BIT,V.NEAREST):Vn?V.copyTexSubImage3D(ke,Tt,he,Te,Xe+Rn,Jt,ee,Dt,It):V.copyTexSubImage2D(ke,Tt,he,Te,Jt,ee,Dt,It);Ot.bindFramebuffer(V.READ_FRAMEBUFFER,null),Ot.bindFramebuffer(V.DRAW_FRAMEBUFFER,null)}else Vn?R.isDataTexture||R.isData3DTexture?V.texSubImage3D(ke,Tt,he,Te,Xe,Dt,It,Pt,de,$t,Pe.data):Y.isCompressedArrayTexture?V.compressedTexSubImage3D(ke,Tt,he,Te,Xe,Dt,It,Pt,de,Pe.data):V.texSubImage3D(ke,Tt,he,Te,Xe,Dt,It,Pt,de,$t,Pe):R.isDataTexture?V.texSubImage2D(V.TEXTURE_2D,Tt,he,Te,Dt,It,de,$t,Pe.data):R.isCompressedTexture?V.compressedTexSubImage2D(V.TEXTURE_2D,Tt,he,Te,Pe.width,Pe.height,de,Pe.data):V.texSubImage2D(V.TEXTURE_2D,Tt,he,Te,Dt,It,de,$t,Pe);V.pixelStorei(V.UNPACK_ROW_LENGTH,_e),V.pixelStorei(V.UNPACK_IMAGE_HEIGHT,Ln),V.pixelStorei(V.UNPACK_SKIP_PIXELS,bi),V.pixelStorei(V.UNPACK_SKIP_ROWS,zn),V.pixelStorei(V.UNPACK_SKIP_IMAGES,Mn),Tt===0&&Y.generateMipmaps&&V.generateMipmap(ke),Ot.unbindTexture()},this.initRenderTarget=function(R){Gt.get(R).__webglFramebuffer===void 0&&le.setupRenderTarget(R)},this.initTexture=function(R){R.isCubeTexture?le.setTextureCube(R,0):R.isData3DTexture?le.setTexture3D(R,0):R.isDataArrayTexture||R.isCompressedArrayTexture?le.setTexture2DArray(R,0):le.setTexture2D(R,0),Ot.unbindTexture()},this.resetState=function(){F=0,z=0,H=null,Ot.reset(),wt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Yi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const n=this.getContext();n.drawingBufferColorSpace=Ae._getDrawingBufferColorSpace(t),n.unpackColorSpace=Ae._getUnpackColorSpace()}}const qe={brushSize:25,brushStrength:.5,distortionAmount:2.5,fluidDecay:.98,trailLength:.8,stopDecay:.85,color1:"#f7f7f8",color2:"#d9dadd",color3:"#bfc2c7",color4:"#9eb3ff",colorIntensity:1,softness:1};function cr(i){const t=parseInt(i.slice(1,3),16)/255,n=parseInt(i.slice(3,5),16)/255,r=parseInt(i.slice(5,7),16)/255;return[t,n,r]}const Ky=new QS(-1,1,1,-1,0,1),Kr=new dD({antialias:!0}),iM=document.querySelector(".gradient-canvas");Kr.setSize(window.innerWidth,window.innerHeight);iM.appendChild(Kr.domElement);const aM=new Aa(window.innerWidth,window.innerHeight,{minFilter:Zn,magFilter:Zn,format:ci,type:Bi}),rM=new Aa(window.innerWidth,window.innerHeight,{minFilter:Zn,magFilter:Zn,format:ci,type:Bi});let Oc=aM,jd=rM,um=0;const ui=new $i({uniforms:{iTime:{value:0},iResolution:{value:new we(window.innerWidth,window.innerHeight)},iMouse:{value:new rn(0,0,0,0)},iFrame:{value:0},iPreviousFrame:{value:null},uBrushSize:{value:qe.brushSize},uBrushStrength:{value:qe.brushStrength},uFluidDecay:{value:qe.fluidDecay},uTrailLength:{value:qe.trailLength},uStopDecay:{value:qe.stopDecay}},vertexShader:bS,fragmentShader:oA}),Li=new $i({uniforms:{iTime:{value:0},iResolution:{value:new we(window.innerWidth,window.innerHeight)},iFluid:{value:null},uDistortionAmount:{value:qe.distortionAmount},uColor1:{value:new rt(...cr(qe.color1))},uColor2:{value:new rt(...cr(qe.color2))},uColor3:{value:new rt(...cr(qe.color3))},uColor4:{value:new rt(...cr(qe.color4))},uColorIntensity:{value:qe.colorIntensity},uSoftness:{value:qe.softness}},vertexShader:bS,fragmentShader:lA}),sM=new Zl(2,2),pD=new Fi(sM,ui),mD=new Fi(sM,Li);let Kd=0,Zd=0,Zy=0,Qy=0,oM=0;document.addEventListener("mousemove",i=>{const t=iM.getBoundingClientRect();Zy=Kd,Qy=Zd,Kd=i.clientX-t.left,Zd=t.height-(i.clientY-t.top),oM=performance.now(),ui.uniforms.iMouse.value.set(Kd,Zd,Zy,Qy)});document.addEventListener("mouseleave",()=>{ui.uniforms.iMouse.value.set(0,0,0,0)});function lM(){requestAnimationFrame(lM);const i=performance.now()*.001;ui.uniforms.iTime.value=i,Li.uniforms.iTime.value=i,ui.uniforms.iFrame.value=um,performance.now()-oM>100&&ui.uniforms.iMouse.value.set(0,0,0,0),ui.uniforms.uBrushSize.value=qe.brushSize,ui.uniforms.uBrushStrength.value=qe.brushStrength,ui.uniforms.uFluidDecay.value=qe.fluidDecay,ui.uniforms.uTrailLength.value=qe.trailLength,ui.uniforms.uStopDecay.value=qe.stopDecay,Li.uniforms.uDistortionAmount.value=qe.distortionAmount,Li.uniforms.uColorIntensity.value=qe.colorIntensity,Li.uniforms.uSoftness.value=qe.softness,Li.uniforms.uColor1.value.set(...cr(qe.color1)),Li.uniforms.uColor2.value.set(...cr(qe.color2)),Li.uniforms.uColor3.value.set(...cr(qe.color3)),Li.uniforms.uColor4.value.set(...cr(qe.color4)),ui.uniforms.iPreviousFrame.value=jd.texture,Kr.setRenderTarget(Oc),Kr.render(pD,Ky),Li.uniforms.iFluid.value=Oc.texture,Kr.setRenderTarget(null),Kr.render(mD,Ky);const t=Oc;Oc=jd,jd=t,um++}window.addEventListener("resize",()=>{const i=window.innerWidth,t=window.innerHeight;Kr.setSize(i,t),ui.uniforms.iResolution.value.set(i,t),Li.uniforms.iResolution.value.set(i,t),aM.setSize(i,t),rM.setSize(i,t),um=0});lM();var Qd={exports:{}},Ml={};/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var $y;function gD(){if($y)return Ml;$y=1;var i=Symbol.for("react.transitional.element"),t=Symbol.for("react.fragment");function n(r,o,u){var c=null;if(u!==void 0&&(c=""+u),o.key!==void 0&&(c=""+o.key),"key"in o){u={};for(var f in o)f!=="key"&&(u[f]=o[f])}else u=o;return o=u.ref,{$$typeof:i,type:r,key:c,ref:o!==void 0?o:null,props:u}}return Ml.Fragment=t,Ml.jsx=n,Ml.jsxs=n,Ml}var Jy;function vD(){return Jy||(Jy=1,Qd.exports=gD()),Qd.exports}var qt=vD(),$d={exports:{}},El={},Jd={exports:{}},tp={};/**
 * @license React
 * scheduler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var tx;function _D(){return tx||(tx=1,(function(i){function t(I,q){var W=I.length;I.push(q);t:for(;0<W;){var yt=W-1>>>1,P=I[yt];if(0<o(P,q))I[yt]=q,I[W]=P,W=yt;else break t}}function n(I){return I.length===0?null:I[0]}function r(I){if(I.length===0)return null;var q=I[0],W=I.pop();if(W!==q){I[0]=W;t:for(var yt=0,P=I.length,J=P>>>1;yt<J;){var xt=2*(yt+1)-1,St=I[xt],Ut=xt+1,Vt=I[Ut];if(0>o(St,W))Ut<P&&0>o(Vt,St)?(I[yt]=Vt,I[Ut]=W,yt=Ut):(I[yt]=St,I[xt]=W,yt=xt);else if(Ut<P&&0>o(Vt,W))I[yt]=Vt,I[Ut]=W,yt=Ut;else break t}}return q}function o(I,q){var W=I.sortIndex-q.sortIndex;return W!==0?W:I.id-q.id}if(i.unstable_now=void 0,typeof performance=="object"&&typeof performance.now=="function"){var u=performance;i.unstable_now=function(){return u.now()}}else{var c=Date,f=c.now();i.unstable_now=function(){return c.now()-f}}var p=[],d=[],m=1,v=null,_=3,x=!1,E=!1,T=!1,S=!1,y=typeof setTimeout=="function"?setTimeout:null,w=typeof clearTimeout=="function"?clearTimeout:null,C=typeof setImmediate<"u"?setImmediate:null;function D(I){for(var q=n(d);q!==null;){if(q.callback===null)r(d);else if(q.startTime<=I)r(d),q.sortIndex=q.expirationTime,t(p,q);else break;q=n(d)}}function N(I){if(T=!1,D(I),!E)if(n(p)!==null)E=!0,F||(F=!0,nt());else{var q=n(d);q!==null&&ut(N,q.startTime-I)}}var F=!1,z=-1,H=5,U=-1;function L(){return S?!0:!(i.unstable_now()-U<H)}function G(){if(S=!1,F){var I=i.unstable_now();U=I;var q=!0;try{t:{E=!1,T&&(T=!1,w(z),z=-1),x=!0;var W=_;try{e:{for(D(I),v=n(p);v!==null&&!(v.expirationTime>I&&L());){var yt=v.callback;if(typeof yt=="function"){v.callback=null,_=v.priorityLevel;var P=yt(v.expirationTime<=I);if(I=i.unstable_now(),typeof P=="function"){v.callback=P,D(I),q=!0;break e}v===n(p)&&r(p),D(I)}else r(p);v=n(p)}if(v!==null)q=!0;else{var J=n(d);J!==null&&ut(N,J.startTime-I),q=!1}}break t}finally{v=null,_=W,x=!1}q=void 0}}finally{q?nt():F=!1}}}var nt;if(typeof C=="function")nt=function(){C(G)};else if(typeof MessageChannel<"u"){var ct=new MessageChannel,pt=ct.port2;ct.port1.onmessage=G,nt=function(){pt.postMessage(null)}}else nt=function(){y(G,0)};function ut(I,q){z=y(function(){I(i.unstable_now())},q)}i.unstable_IdlePriority=5,i.unstable_ImmediatePriority=1,i.unstable_LowPriority=4,i.unstable_NormalPriority=3,i.unstable_Profiling=null,i.unstable_UserBlockingPriority=2,i.unstable_cancelCallback=function(I){I.callback=null},i.unstable_forceFrameRate=function(I){0>I||125<I?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):H=0<I?Math.floor(1e3/I):5},i.unstable_getCurrentPriorityLevel=function(){return _},i.unstable_next=function(I){switch(_){case 1:case 2:case 3:var q=3;break;default:q=_}var W=_;_=q;try{return I()}finally{_=W}},i.unstable_requestPaint=function(){S=!0},i.unstable_runWithPriority=function(I,q){switch(I){case 1:case 2:case 3:case 4:case 5:break;default:I=3}var W=_;_=I;try{return q()}finally{_=W}},i.unstable_scheduleCallback=function(I,q,W){var yt=i.unstable_now();switch(typeof W=="object"&&W!==null?(W=W.delay,W=typeof W=="number"&&0<W?yt+W:yt):W=yt,I){case 1:var P=-1;break;case 2:P=250;break;case 5:P=1073741823;break;case 4:P=1e4;break;default:P=5e3}return P=W+P,I={id:m++,callback:q,priorityLevel:I,startTime:W,expirationTime:P,sortIndex:-1},W>yt?(I.sortIndex=W,t(d,I),n(p)===null&&I===n(d)&&(T?(w(z),z=-1):T=!0,ut(N,W-yt))):(I.sortIndex=P,t(p,I),E||x||(E=!0,F||(F=!0,nt()))),I},i.unstable_shouldYield=L,i.unstable_wrapCallback=function(I){var q=_;return function(){var W=_;_=q;try{return I.apply(this,arguments)}finally{_=W}}}})(tp)),tp}var ex;function yD(){return ex||(ex=1,Jd.exports=_D()),Jd.exports}var ep={exports:{}},ce={};/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var nx;function xD(){if(nx)return ce;nx=1;var i=Symbol.for("react.transitional.element"),t=Symbol.for("react.portal"),n=Symbol.for("react.fragment"),r=Symbol.for("react.strict_mode"),o=Symbol.for("react.profiler"),u=Symbol.for("react.consumer"),c=Symbol.for("react.context"),f=Symbol.for("react.forward_ref"),p=Symbol.for("react.suspense"),d=Symbol.for("react.memo"),m=Symbol.for("react.lazy"),v=Symbol.iterator;function _(P){return P===null||typeof P!="object"?null:(P=v&&P[v]||P["@@iterator"],typeof P=="function"?P:null)}var x={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},E=Object.assign,T={};function S(P,J,xt){this.props=P,this.context=J,this.refs=T,this.updater=xt||x}S.prototype.isReactComponent={},S.prototype.setState=function(P,J){if(typeof P!="object"&&typeof P!="function"&&P!=null)throw Error("takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,P,J,"setState")},S.prototype.forceUpdate=function(P){this.updater.enqueueForceUpdate(this,P,"forceUpdate")};function y(){}y.prototype=S.prototype;function w(P,J,xt){this.props=P,this.context=J,this.refs=T,this.updater=xt||x}var C=w.prototype=new y;C.constructor=w,E(C,S.prototype),C.isPureReactComponent=!0;var D=Array.isArray,N={H:null,A:null,T:null,S:null,V:null},F=Object.prototype.hasOwnProperty;function z(P,J,xt,St,Ut,Vt){return xt=Vt.ref,{$$typeof:i,type:P,key:J,ref:xt!==void 0?xt:null,props:Vt}}function H(P,J){return z(P.type,J,void 0,void 0,void 0,P.props)}function U(P){return typeof P=="object"&&P!==null&&P.$$typeof===i}function L(P){var J={"=":"=0",":":"=2"};return"$"+P.replace(/[=:]/g,function(xt){return J[xt]})}var G=/\/+/g;function nt(P,J){return typeof P=="object"&&P!==null&&P.key!=null?L(""+P.key):J.toString(36)}function ct(){}function pt(P){switch(P.status){case"fulfilled":return P.value;case"rejected":throw P.reason;default:switch(typeof P.status=="string"?P.then(ct,ct):(P.status="pending",P.then(function(J){P.status==="pending"&&(P.status="fulfilled",P.value=J)},function(J){P.status==="pending"&&(P.status="rejected",P.reason=J)})),P.status){case"fulfilled":return P.value;case"rejected":throw P.reason}}throw P}function ut(P,J,xt,St,Ut){var Vt=typeof P;(Vt==="undefined"||Vt==="boolean")&&(P=null);var et=!1;if(P===null)et=!0;else switch(Vt){case"bigint":case"string":case"number":et=!0;break;case"object":switch(P.$$typeof){case i:case t:et=!0;break;case m:return et=P._init,ut(et(P._payload),J,xt,St,Ut)}}if(et)return Ut=Ut(P),et=St===""?"."+nt(P,0):St,D(Ut)?(xt="",et!=null&&(xt=et.replace(G,"$&/")+"/"),ut(Ut,J,xt,"",function(Qt){return Qt})):Ut!=null&&(U(Ut)&&(Ut=H(Ut,xt+(Ut.key==null||P&&P.key===Ut.key?"":(""+Ut.key).replace(G,"$&/")+"/")+et)),J.push(Ut)),1;et=0;var vt=St===""?".":St+":";if(D(P))for(var At=0;At<P.length;At++)St=P[At],Vt=vt+nt(St,At),et+=ut(St,J,xt,Vt,Ut);else if(At=_(P),typeof At=="function")for(P=At.call(P),At=0;!(St=P.next()).done;)St=St.value,Vt=vt+nt(St,At++),et+=ut(St,J,xt,Vt,Ut);else if(Vt==="object"){if(typeof P.then=="function")return ut(pt(P),J,xt,St,Ut);throw J=String(P),Error("Objects are not valid as a React child (found: "+(J==="[object Object]"?"object with keys {"+Object.keys(P).join(", ")+"}":J)+"). If you meant to render a collection of children, use an array instead.")}return et}function I(P,J,xt){if(P==null)return P;var St=[],Ut=0;return ut(P,St,"","",function(Vt){return J.call(xt,Vt,Ut++)}),St}function q(P){if(P._status===-1){var J=P._result;J=J(),J.then(function(xt){(P._status===0||P._status===-1)&&(P._status=1,P._result=xt)},function(xt){(P._status===0||P._status===-1)&&(P._status=2,P._result=xt)}),P._status===-1&&(P._status=0,P._result=J)}if(P._status===1)return P._result.default;throw P._result}var W=typeof reportError=="function"?reportError:function(P){if(typeof window=="object"&&typeof window.ErrorEvent=="function"){var J=new window.ErrorEvent("error",{bubbles:!0,cancelable:!0,message:typeof P=="object"&&P!==null&&typeof P.message=="string"?String(P.message):String(P),error:P});if(!window.dispatchEvent(J))return}else if(typeof process=="object"&&typeof process.emit=="function"){process.emit("uncaughtException",P);return}console.error(P)};function yt(){}return ce.Children={map:I,forEach:function(P,J,xt){I(P,function(){J.apply(this,arguments)},xt)},count:function(P){var J=0;return I(P,function(){J++}),J},toArray:function(P){return I(P,function(J){return J})||[]},only:function(P){if(!U(P))throw Error("React.Children.only expected to receive a single React element child.");return P}},ce.Component=S,ce.Fragment=n,ce.Profiler=o,ce.PureComponent=w,ce.StrictMode=r,ce.Suspense=p,ce.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=N,ce.__COMPILER_RUNTIME={__proto__:null,c:function(P){return N.H.useMemoCache(P)}},ce.cache=function(P){return function(){return P.apply(null,arguments)}},ce.cloneElement=function(P,J,xt){if(P==null)throw Error("The argument must be a React element, but you passed "+P+".");var St=E({},P.props),Ut=P.key,Vt=void 0;if(J!=null)for(et in J.ref!==void 0&&(Vt=void 0),J.key!==void 0&&(Ut=""+J.key),J)!F.call(J,et)||et==="key"||et==="__self"||et==="__source"||et==="ref"&&J.ref===void 0||(St[et]=J[et]);var et=arguments.length-2;if(et===1)St.children=xt;else if(1<et){for(var vt=Array(et),At=0;At<et;At++)vt[At]=arguments[At+2];St.children=vt}return z(P.type,Ut,void 0,void 0,Vt,St)},ce.createContext=function(P){return P={$$typeof:c,_currentValue:P,_currentValue2:P,_threadCount:0,Provider:null,Consumer:null},P.Provider=P,P.Consumer={$$typeof:u,_context:P},P},ce.createElement=function(P,J,xt){var St,Ut={},Vt=null;if(J!=null)for(St in J.key!==void 0&&(Vt=""+J.key),J)F.call(J,St)&&St!=="key"&&St!=="__self"&&St!=="__source"&&(Ut[St]=J[St]);var et=arguments.length-2;if(et===1)Ut.children=xt;else if(1<et){for(var vt=Array(et),At=0;At<et;At++)vt[At]=arguments[At+2];Ut.children=vt}if(P&&P.defaultProps)for(St in et=P.defaultProps,et)Ut[St]===void 0&&(Ut[St]=et[St]);return z(P,Vt,void 0,void 0,null,Ut)},ce.createRef=function(){return{current:null}},ce.forwardRef=function(P){return{$$typeof:f,render:P}},ce.isValidElement=U,ce.lazy=function(P){return{$$typeof:m,_payload:{_status:-1,_result:P},_init:q}},ce.memo=function(P,J){return{$$typeof:d,type:P,compare:J===void 0?null:J}},ce.startTransition=function(P){var J=N.T,xt={};N.T=xt;try{var St=P(),Ut=N.S;Ut!==null&&Ut(xt,St),typeof St=="object"&&St!==null&&typeof St.then=="function"&&St.then(yt,W)}catch(Vt){W(Vt)}finally{N.T=J}},ce.unstable_useCacheRefresh=function(){return N.H.useCacheRefresh()},ce.use=function(P){return N.H.use(P)},ce.useActionState=function(P,J,xt){return N.H.useActionState(P,J,xt)},ce.useCallback=function(P,J){return N.H.useCallback(P,J)},ce.useContext=function(P){return N.H.useContext(P)},ce.useDebugValue=function(){},ce.useDeferredValue=function(P,J){return N.H.useDeferredValue(P,J)},ce.useEffect=function(P,J,xt){var St=N.H;if(typeof xt=="function")throw Error("useEffect CRUD overload is not enabled in this build of React.");return St.useEffect(P,J)},ce.useId=function(){return N.H.useId()},ce.useImperativeHandle=function(P,J,xt){return N.H.useImperativeHandle(P,J,xt)},ce.useInsertionEffect=function(P,J){return N.H.useInsertionEffect(P,J)},ce.useLayoutEffect=function(P,J){return N.H.useLayoutEffect(P,J)},ce.useMemo=function(P,J){return N.H.useMemo(P,J)},ce.useOptimistic=function(P,J){return N.H.useOptimistic(P,J)},ce.useReducer=function(P,J,xt){return N.H.useReducer(P,J,xt)},ce.useRef=function(P){return N.H.useRef(P)},ce.useState=function(P){return N.H.useState(P)},ce.useSyncExternalStore=function(P,J,xt){return N.H.useSyncExternalStore(P,J,xt)},ce.useTransition=function(){return N.H.useTransition()},ce.version="19.1.1",ce}var ix;function km(){return ix||(ix=1,ep.exports=xD()),ep.exports}var np={exports:{}},Fn={};/**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var ax;function SD(){if(ax)return Fn;ax=1;var i=km();function t(p){var d="https://react.dev/errors/"+p;if(1<arguments.length){d+="?args[]="+encodeURIComponent(arguments[1]);for(var m=2;m<arguments.length;m++)d+="&args[]="+encodeURIComponent(arguments[m])}return"Minified React error #"+p+"; visit "+d+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}function n(){}var r={d:{f:n,r:function(){throw Error(t(522))},D:n,C:n,L:n,m:n,X:n,S:n,M:n},p:0,findDOMNode:null},o=Symbol.for("react.portal");function u(p,d,m){var v=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:o,key:v==null?null:""+v,children:p,containerInfo:d,implementation:m}}var c=i.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;function f(p,d){if(p==="font")return"";if(typeof d=="string")return d==="use-credentials"?d:""}return Fn.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=r,Fn.createPortal=function(p,d){var m=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!d||d.nodeType!==1&&d.nodeType!==9&&d.nodeType!==11)throw Error(t(299));return u(p,d,null,m)},Fn.flushSync=function(p){var d=c.T,m=r.p;try{if(c.T=null,r.p=2,p)return p()}finally{c.T=d,r.p=m,r.d.f()}},Fn.preconnect=function(p,d){typeof p=="string"&&(d?(d=d.crossOrigin,d=typeof d=="string"?d==="use-credentials"?d:"":void 0):d=null,r.d.C(p,d))},Fn.prefetchDNS=function(p){typeof p=="string"&&r.d.D(p)},Fn.preinit=function(p,d){if(typeof p=="string"&&d&&typeof d.as=="string"){var m=d.as,v=f(m,d.crossOrigin),_=typeof d.integrity=="string"?d.integrity:void 0,x=typeof d.fetchPriority=="string"?d.fetchPriority:void 0;m==="style"?r.d.S(p,typeof d.precedence=="string"?d.precedence:void 0,{crossOrigin:v,integrity:_,fetchPriority:x}):m==="script"&&r.d.X(p,{crossOrigin:v,integrity:_,fetchPriority:x,nonce:typeof d.nonce=="string"?d.nonce:void 0})}},Fn.preinitModule=function(p,d){if(typeof p=="string")if(typeof d=="object"&&d!==null){if(d.as==null||d.as==="script"){var m=f(d.as,d.crossOrigin);r.d.M(p,{crossOrigin:m,integrity:typeof d.integrity=="string"?d.integrity:void 0,nonce:typeof d.nonce=="string"?d.nonce:void 0})}}else d==null&&r.d.M(p)},Fn.preload=function(p,d){if(typeof p=="string"&&typeof d=="object"&&d!==null&&typeof d.as=="string"){var m=d.as,v=f(m,d.crossOrigin);r.d.L(p,m,{crossOrigin:v,integrity:typeof d.integrity=="string"?d.integrity:void 0,nonce:typeof d.nonce=="string"?d.nonce:void 0,type:typeof d.type=="string"?d.type:void 0,fetchPriority:typeof d.fetchPriority=="string"?d.fetchPriority:void 0,referrerPolicy:typeof d.referrerPolicy=="string"?d.referrerPolicy:void 0,imageSrcSet:typeof d.imageSrcSet=="string"?d.imageSrcSet:void 0,imageSizes:typeof d.imageSizes=="string"?d.imageSizes:void 0,media:typeof d.media=="string"?d.media:void 0})}},Fn.preloadModule=function(p,d){if(typeof p=="string")if(d){var m=f(d.as,d.crossOrigin);r.d.m(p,{as:typeof d.as=="string"&&d.as!=="script"?d.as:void 0,crossOrigin:m,integrity:typeof d.integrity=="string"?d.integrity:void 0})}else r.d.m(p)},Fn.requestFormReset=function(p){r.d.r(p)},Fn.unstable_batchedUpdates=function(p,d){return p(d)},Fn.useFormState=function(p,d,m){return c.H.useFormState(p,d,m)},Fn.useFormStatus=function(){return c.H.useHostTransitionStatus()},Fn.version="19.1.1",Fn}var rx;function MD(){if(rx)return np.exports;rx=1;function i(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(i)}catch(t){console.error(t)}}return i(),np.exports=SD(),np.exports}/**
 * @license React
 * react-dom-client.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var sx;function ED(){if(sx)return El;sx=1;var i=yD(),t=km(),n=MD();function r(e){var a="https://react.dev/errors/"+e;if(1<arguments.length){a+="?args[]="+encodeURIComponent(arguments[1]);for(var s=2;s<arguments.length;s++)a+="&args[]="+encodeURIComponent(arguments[s])}return"Minified React error #"+e+"; visit "+a+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}function o(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function u(e){var a=e,s=e;if(e.alternate)for(;a.return;)a=a.return;else{e=a;do a=e,(a.flags&4098)!==0&&(s=a.return),e=a.return;while(e)}return a.tag===3?s:null}function c(e){if(e.tag===13){var a=e.memoizedState;if(a===null&&(e=e.alternate,e!==null&&(a=e.memoizedState)),a!==null)return a.dehydrated}return null}function f(e){if(u(e)!==e)throw Error(r(188))}function p(e){var a=e.alternate;if(!a){if(a=u(e),a===null)throw Error(r(188));return a!==e?null:e}for(var s=e,l=a;;){var h=s.return;if(h===null)break;var g=h.alternate;if(g===null){if(l=h.return,l!==null){s=l;continue}break}if(h.child===g.child){for(g=h.child;g;){if(g===s)return f(h),e;if(g===l)return f(h),a;g=g.sibling}throw Error(r(188))}if(s.return!==l.return)s=h,l=g;else{for(var M=!1,A=h.child;A;){if(A===s){M=!0,s=h,l=g;break}if(A===l){M=!0,l=h,s=g;break}A=A.sibling}if(!M){for(A=g.child;A;){if(A===s){M=!0,s=g,l=h;break}if(A===l){M=!0,l=g,s=h;break}A=A.sibling}if(!M)throw Error(r(189))}}if(s.alternate!==l)throw Error(r(190))}if(s.tag!==3)throw Error(r(188));return s.stateNode.current===s?e:a}function d(e){var a=e.tag;if(a===5||a===26||a===27||a===6)return e;for(e=e.child;e!==null;){if(a=d(e),a!==null)return a;e=e.sibling}return null}var m=Object.assign,v=Symbol.for("react.element"),_=Symbol.for("react.transitional.element"),x=Symbol.for("react.portal"),E=Symbol.for("react.fragment"),T=Symbol.for("react.strict_mode"),S=Symbol.for("react.profiler"),y=Symbol.for("react.provider"),w=Symbol.for("react.consumer"),C=Symbol.for("react.context"),D=Symbol.for("react.forward_ref"),N=Symbol.for("react.suspense"),F=Symbol.for("react.suspense_list"),z=Symbol.for("react.memo"),H=Symbol.for("react.lazy"),U=Symbol.for("react.activity"),L=Symbol.for("react.memo_cache_sentinel"),G=Symbol.iterator;function nt(e){return e===null||typeof e!="object"?null:(e=G&&e[G]||e["@@iterator"],typeof e=="function"?e:null)}var ct=Symbol.for("react.client.reference");function pt(e){if(e==null)return null;if(typeof e=="function")return e.$$typeof===ct?null:e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case E:return"Fragment";case S:return"Profiler";case T:return"StrictMode";case N:return"Suspense";case F:return"SuspenseList";case U:return"Activity"}if(typeof e=="object")switch(e.$$typeof){case x:return"Portal";case C:return(e.displayName||"Context")+".Provider";case w:return(e._context.displayName||"Context")+".Consumer";case D:var a=e.render;return e=e.displayName,e||(e=a.displayName||a.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case z:return a=e.displayName||null,a!==null?a:pt(e.type)||"Memo";case H:a=e._payload,e=e._init;try{return pt(e(a))}catch{}}return null}var ut=Array.isArray,I=t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,q=n.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,W={pending:!1,data:null,method:null,action:null},yt=[],P=-1;function J(e){return{current:e}}function xt(e){0>P||(e.current=yt[P],yt[P]=null,P--)}function St(e,a){P++,yt[P]=e.current,e.current=a}var Ut=J(null),Vt=J(null),et=J(null),vt=J(null);function At(e,a){switch(St(et,a),St(Vt,e),St(Ut,null),a.nodeType){case 9:case 11:e=(e=a.documentElement)&&(e=e.namespaceURI)?C_(e):0;break;default:if(e=a.tagName,a=a.namespaceURI)a=C_(a),e=w_(a,e);else switch(e){case"svg":e=1;break;case"math":e=2;break;default:e=0}}xt(Ut),St(Ut,e)}function Qt(){xt(Ut),xt(Vt),xt(et)}function Yt(e){e.memoizedState!==null&&St(vt,e);var a=Ut.current,s=w_(a,e.type);a!==s&&(St(Vt,e),St(Ut,s))}function me(e){Vt.current===e&&(xt(Ut),xt(Vt)),vt.current===e&&(xt(vt),hl._currentValue=W)}var un=Object.prototype.hasOwnProperty,V=i.unstable_scheduleCallback,Le=i.unstable_cancelCallback,oe=i.unstable_shouldYield,ie=i.unstable_requestPaint,Ot=i.unstable_now,He=i.unstable_getCurrentPriorityLevel,Gt=i.unstable_ImmediatePriority,le=i.unstable_UserBlockingPriority,je=i.unstable_NormalPriority,Ke=i.unstable_LowPriority,O=i.unstable_IdlePriority,b=i.log,tt=i.unstable_setDisableYieldValue,ft=null,mt=null;function lt(e){if(typeof b=="function"&&tt(e),mt&&typeof mt.setStrictMode=="function")try{mt.setStrictMode(ft,e)}catch{}}var Bt=Math.clz32?Math.clz32:jt,Rt=Math.log,Xt=Math.LN2;function jt(e){return e>>>=0,e===0?32:31-(Rt(e)/Xt|0)|0}var Mt=256,Lt=4194304;function Zt(e){var a=e&42;if(a!==0)return a;switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:return 64;case 128:return 128;case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194048;case 4194304:case 8388608:case 16777216:case 33554432:return e&62914560;case 67108864:return 67108864;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 0;default:return e}}function kt(e,a,s){var l=e.pendingLanes;if(l===0)return 0;var h=0,g=e.suspendedLanes,M=e.pingedLanes;e=e.warmLanes;var A=l&134217727;return A!==0?(l=A&~g,l!==0?h=Zt(l):(M&=A,M!==0?h=Zt(M):s||(s=A&~e,s!==0&&(h=Zt(s))))):(A=l&~g,A!==0?h=Zt(A):M!==0?h=Zt(M):s||(s=l&~e,s!==0&&(h=Zt(s)))),h===0?0:a!==0&&a!==h&&(a&g)===0&&(g=h&-h,s=a&-a,g>=s||g===32&&(s&4194048)!==0)?a:h}function wt(e,a){return(e.pendingLanes&~(e.suspendedLanes&~e.pingedLanes)&a)===0}function ue(e,a){switch(e){case 1:case 2:case 4:case 8:case 64:return a+250;case 16:case 32:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return a+5e3;case 4194304:case 8388608:case 16777216:case 33554432:return-1;case 67108864:case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function X(){var e=Mt;return Mt<<=1,(Mt&4194048)===0&&(Mt=256),e}function bt(){var e=Lt;return Lt<<=1,(Lt&62914560)===0&&(Lt=4194304),e}function Ct(e){for(var a=[],s=0;31>s;s++)a.push(e);return a}function Ft(e,a){e.pendingLanes|=a,a!==268435456&&(e.suspendedLanes=0,e.pingedLanes=0,e.warmLanes=0)}function Et(e,a,s,l,h,g){var M=e.pendingLanes;e.pendingLanes=s,e.suspendedLanes=0,e.pingedLanes=0,e.warmLanes=0,e.expiredLanes&=s,e.entangledLanes&=s,e.errorRecoveryDisabledLanes&=s,e.shellSuspendCounter=0;var A=e.entanglements,B=e.expirationTimes,$=e.hiddenUpdates;for(s=M&~s;0<s;){var ht=31-Bt(s),gt=1<<ht;A[ht]=0,B[ht]=-1;var it=$[ht];if(it!==null)for($[ht]=null,ht=0;ht<it.length;ht++){var at=it[ht];at!==null&&(at.lane&=-536870913)}s&=~gt}l!==0&&_t(e,l,0),g!==0&&h===0&&e.tag!==0&&(e.suspendedLanes|=g&~(M&~a))}function _t(e,a,s){e.pendingLanes|=a,e.suspendedLanes&=~a;var l=31-Bt(a);e.entangledLanes|=a,e.entanglements[l]=e.entanglements[l]|1073741824|s&4194090}function Ht(e,a){var s=e.entangledLanes|=a;for(e=e.entanglements;s;){var l=31-Bt(s),h=1<<l;h&a|e[l]&a&&(e[l]|=a),s&=~h}}function se(e){switch(e){case 2:e=1;break;case 8:e=4;break;case 32:e=16;break;case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:e=128;break;case 268435456:e=134217728;break;default:e=0}return e}function Ce(e){return e&=-e,2<e?8<e?(e&134217727)!==0?32:268435456:8:2}function Ee(){var e=q.p;return e!==0?e:(e=window.event,e===void 0?32:j_(e.type))}function Ti(e,a){var s=q.p;try{return q.p=e,a()}finally{q.p=s}}var mn=Math.random().toString(36).slice(2),gn="__reactFiber$"+mn,Je="__reactProps$"+mn,zi="__reactContainer$"+mn,as="__reactEvents$"+mn,au="__reactListeners$"+mn,rs="__reactHandles$"+mn,To="__reactResources$"+mn,Vi="__reactMarker$"+mn;function ss(e){delete e[gn],delete e[Je],delete e[as],delete e[au],delete e[rs]}function ea(e){var a=e[gn];if(a)return a;for(var s=e.parentNode;s;){if(a=s[zi]||s[gn]){if(s=a.alternate,a.child!==null||s!==null&&s.child!==null)for(e=P_(e);e!==null;){if(s=e[gn])return s;e=P_(e)}return a}e=s,s=e.parentNode}return null}function La(e){if(e=e[gn]||e[zi]){var a=e.tag;if(a===5||a===6||a===13||a===26||a===27||a===3)return e}return null}function _r(e){var a=e.tag;if(a===5||a===26||a===27||a===6)return e.stateNode;throw Error(r(33))}function Pa(e){var a=e[To];return a||(a=e[To]={hoistableStyles:new Map,hoistableScripts:new Map}),a}function cn(e){e[Vi]=!0}var ru=new Set,su={};function R(e,a){Y(e,a),Y(e+"Capture",a)}function Y(e,a){for(su[e]=a,e=0;e<a.length;e++)ru.add(a[e])}var st=RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"),ot={},K={};function Tt(e){return un.call(K,e)?!0:un.call(ot,e)?!1:st.test(e)?K[e]=!0:(ot[e]=!0,!1)}function Dt(e,a,s){if(Tt(a))if(s===null)e.removeAttribute(a);else{switch(typeof s){case"undefined":case"function":case"symbol":e.removeAttribute(a);return;case"boolean":var l=a.toLowerCase().slice(0,5);if(l!=="data-"&&l!=="aria-"){e.removeAttribute(a);return}}e.setAttribute(a,""+s)}}function It(e,a,s){if(s===null)e.removeAttribute(a);else{switch(typeof s){case"undefined":case"function":case"symbol":case"boolean":e.removeAttribute(a);return}e.setAttribute(a,""+s)}}function Pt(e,a,s,l){if(l===null)e.removeAttribute(s);else{switch(typeof l){case"undefined":case"function":case"symbol":case"boolean":e.removeAttribute(s);return}e.setAttributeNS(a,s,""+l)}}var Jt,ee;function Wt(e){if(Jt===void 0)try{throw Error()}catch(s){var a=s.stack.trim().match(/\n( *(at )?)/);Jt=a&&a[1]||"",ee=-1<s.stack.indexOf(`
    at`)?" (<anonymous>)":-1<s.stack.indexOf("@")?"@unknown:0:0":""}return`
`+Jt+e+ee}var he=!1;function Te(e,a){if(!e||he)return"";he=!0;var s=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{var l={DetermineComponentFrameRoot:function(){try{if(a){var gt=function(){throw Error()};if(Object.defineProperty(gt.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(gt,[])}catch(at){var it=at}Reflect.construct(e,[],gt)}else{try{gt.call()}catch(at){it=at}e.call(gt.prototype)}}else{try{throw Error()}catch(at){it=at}(gt=e())&&typeof gt.catch=="function"&&gt.catch(function(){})}}catch(at){if(at&&it&&typeof at.stack=="string")return[at.stack,it.stack]}return[null,null]}};l.DetermineComponentFrameRoot.displayName="DetermineComponentFrameRoot";var h=Object.getOwnPropertyDescriptor(l.DetermineComponentFrameRoot,"name");h&&h.configurable&&Object.defineProperty(l.DetermineComponentFrameRoot,"name",{value:"DetermineComponentFrameRoot"});var g=l.DetermineComponentFrameRoot(),M=g[0],A=g[1];if(M&&A){var B=M.split(`
`),$=A.split(`
`);for(h=l=0;l<B.length&&!B[l].includes("DetermineComponentFrameRoot");)l++;for(;h<$.length&&!$[h].includes("DetermineComponentFrameRoot");)h++;if(l===B.length||h===$.length)for(l=B.length-1,h=$.length-1;1<=l&&0<=h&&B[l]!==$[h];)h--;for(;1<=l&&0<=h;l--,h--)if(B[l]!==$[h]){if(l!==1||h!==1)do if(l--,h--,0>h||B[l]!==$[h]){var ht=`
`+B[l].replace(" at new "," at ");return e.displayName&&ht.includes("<anonymous>")&&(ht=ht.replace("<anonymous>",e.displayName)),ht}while(1<=l&&0<=h);break}}}finally{he=!1,Error.prepareStackTrace=s}return(s=e?e.displayName||e.name:"")?Wt(s):""}function Xe(e){switch(e.tag){case 26:case 27:case 5:return Wt(e.type);case 16:return Wt("Lazy");case 13:return Wt("Suspense");case 19:return Wt("SuspenseList");case 0:case 15:return Te(e.type,!1);case 11:return Te(e.type.render,!1);case 1:return Te(e.type,!0);case 31:return Wt("Activity");default:return""}}function Pe(e){try{var a="";do a+=Xe(e),e=e.return;while(e);return a}catch(s){return`
Error generating stack: `+s.message+`
`+s.stack}}function de(e){switch(typeof e){case"bigint":case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function $t(e){var a=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(a==="checkbox"||a==="radio")}function ke(e){var a=$t(e)?"checked":"value",s=Object.getOwnPropertyDescriptor(e.constructor.prototype,a),l=""+e[a];if(!e.hasOwnProperty(a)&&typeof s<"u"&&typeof s.get=="function"&&typeof s.set=="function"){var h=s.get,g=s.set;return Object.defineProperty(e,a,{configurable:!0,get:function(){return h.call(this)},set:function(M){l=""+M,g.call(this,M)}}),Object.defineProperty(e,a,{enumerable:s.enumerable}),{getValue:function(){return l},setValue:function(M){l=""+M},stopTracking:function(){e._valueTracker=null,delete e[a]}}}}function _e(e){e._valueTracker||(e._valueTracker=ke(e))}function Ln(e){if(!e)return!1;var a=e._valueTracker;if(!a)return!0;var s=a.getValue(),l="";return e&&(l=$t(e)?e.checked?"true":"false":e.value),e=l,e!==s?(a.setValue(e),!0):!1}function bi(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}var zn=/[\n"\\]/g;function Mn(e){return e.replace(zn,function(a){return"\\"+a.charCodeAt(0).toString(16)+" "})}function ze(e,a,s,l,h,g,M,A){e.name="",M!=null&&typeof M!="function"&&typeof M!="symbol"&&typeof M!="boolean"?e.type=M:e.removeAttribute("type"),a!=null?M==="number"?(a===0&&e.value===""||e.value!=a)&&(e.value=""+de(a)):e.value!==""+de(a)&&(e.value=""+de(a)):M!=="submit"&&M!=="reset"||e.removeAttribute("value"),a!=null?Pn(e,M,de(a)):s!=null?Pn(e,M,de(s)):l!=null&&e.removeAttribute("value"),h==null&&g!=null&&(e.defaultChecked=!!g),h!=null&&(e.checked=h&&typeof h!="function"&&typeof h!="symbol"),A!=null&&typeof A!="function"&&typeof A!="symbol"&&typeof A!="boolean"?e.name=""+de(A):e.removeAttribute("name")}function Vn(e,a,s,l,h,g,M,A){if(g!=null&&typeof g!="function"&&typeof g!="symbol"&&typeof g!="boolean"&&(e.type=g),a!=null||s!=null){if(!(g!=="submit"&&g!=="reset"||a!=null))return;s=s!=null?""+de(s):"",a=a!=null?""+de(a):s,A||a===e.value||(e.value=a),e.defaultValue=a}l=l??h,l=typeof l!="function"&&typeof l!="symbol"&&!!l,e.checked=A?e.checked:!!l,e.defaultChecked=!!l,M!=null&&typeof M!="function"&&typeof M!="symbol"&&typeof M!="boolean"&&(e.name=M)}function Pn(e,a,s){a==="number"&&bi(e.ownerDocument)===e||e.defaultValue===""+s||(e.defaultValue=""+s)}function tn(e,a,s,l){if(e=e.options,a){a={};for(var h=0;h<s.length;h++)a["$"+s[h]]=!0;for(s=0;s<e.length;s++)h=a.hasOwnProperty("$"+e[s].value),e[s].selected!==h&&(e[s].selected=h),h&&l&&(e[s].defaultSelected=!0)}else{for(s=""+de(s),a=null,h=0;h<e.length;h++){if(e[h].value===s){e[h].selected=!0,l&&(e[h].defaultSelected=!0);return}a!==null||e[h].disabled||(a=e[h])}a!==null&&(a.selected=!0)}}function Rn(e,a,s){if(a!=null&&(a=""+de(a),a!==e.value&&(e.value=a),s==null)){e.defaultValue!==a&&(e.defaultValue=a);return}e.defaultValue=s!=null?""+de(s):""}function os(e,a,s,l){if(a==null){if(l!=null){if(s!=null)throw Error(r(92));if(ut(l)){if(1<l.length)throw Error(r(93));l=l[0]}s=l}s==null&&(s=""),a=s}s=de(a),e.defaultValue=s,l=e.textContent,l===s&&l!==""&&l!==null&&(e.value=l)}function Xn(e,a){if(a){var s=e.firstChild;if(s&&s===e.lastChild&&s.nodeType===3){s.nodeValue=a;return}}e.textContent=a}var aT=new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));function Cg(e,a,s){var l=a.indexOf("--")===0;s==null||typeof s=="boolean"||s===""?l?e.setProperty(a,""):a==="float"?e.cssFloat="":e[a]="":l?e.setProperty(a,s):typeof s!="number"||s===0||aT.has(a)?a==="float"?e.cssFloat=s:e[a]=(""+s).trim():e[a]=s+"px"}function wg(e,a,s){if(a!=null&&typeof a!="object")throw Error(r(62));if(e=e.style,s!=null){for(var l in s)!s.hasOwnProperty(l)||a!=null&&a.hasOwnProperty(l)||(l.indexOf("--")===0?e.setProperty(l,""):l==="float"?e.cssFloat="":e[l]="");for(var h in a)l=a[h],a.hasOwnProperty(h)&&s[h]!==l&&Cg(e,h,l)}else for(var g in a)a.hasOwnProperty(g)&&Cg(e,g,a[g])}function gf(e){if(e.indexOf("-")===-1)return!1;switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var rT=new Map([["acceptCharset","accept-charset"],["htmlFor","for"],["httpEquiv","http-equiv"],["crossOrigin","crossorigin"],["accentHeight","accent-height"],["alignmentBaseline","alignment-baseline"],["arabicForm","arabic-form"],["baselineShift","baseline-shift"],["capHeight","cap-height"],["clipPath","clip-path"],["clipRule","clip-rule"],["colorInterpolation","color-interpolation"],["colorInterpolationFilters","color-interpolation-filters"],["colorProfile","color-profile"],["colorRendering","color-rendering"],["dominantBaseline","dominant-baseline"],["enableBackground","enable-background"],["fillOpacity","fill-opacity"],["fillRule","fill-rule"],["floodColor","flood-color"],["floodOpacity","flood-opacity"],["fontFamily","font-family"],["fontSize","font-size"],["fontSizeAdjust","font-size-adjust"],["fontStretch","font-stretch"],["fontStyle","font-style"],["fontVariant","font-variant"],["fontWeight","font-weight"],["glyphName","glyph-name"],["glyphOrientationHorizontal","glyph-orientation-horizontal"],["glyphOrientationVertical","glyph-orientation-vertical"],["horizAdvX","horiz-adv-x"],["horizOriginX","horiz-origin-x"],["imageRendering","image-rendering"],["letterSpacing","letter-spacing"],["lightingColor","lighting-color"],["markerEnd","marker-end"],["markerMid","marker-mid"],["markerStart","marker-start"],["overlinePosition","overline-position"],["overlineThickness","overline-thickness"],["paintOrder","paint-order"],["panose-1","panose-1"],["pointerEvents","pointer-events"],["renderingIntent","rendering-intent"],["shapeRendering","shape-rendering"],["stopColor","stop-color"],["stopOpacity","stop-opacity"],["strikethroughPosition","strikethrough-position"],["strikethroughThickness","strikethrough-thickness"],["strokeDasharray","stroke-dasharray"],["strokeDashoffset","stroke-dashoffset"],["strokeLinecap","stroke-linecap"],["strokeLinejoin","stroke-linejoin"],["strokeMiterlimit","stroke-miterlimit"],["strokeOpacity","stroke-opacity"],["strokeWidth","stroke-width"],["textAnchor","text-anchor"],["textDecoration","text-decoration"],["textRendering","text-rendering"],["transformOrigin","transform-origin"],["underlinePosition","underline-position"],["underlineThickness","underline-thickness"],["unicodeBidi","unicode-bidi"],["unicodeRange","unicode-range"],["unitsPerEm","units-per-em"],["vAlphabetic","v-alphabetic"],["vHanging","v-hanging"],["vIdeographic","v-ideographic"],["vMathematical","v-mathematical"],["vectorEffect","vector-effect"],["vertAdvY","vert-adv-y"],["vertOriginX","vert-origin-x"],["vertOriginY","vert-origin-y"],["wordSpacing","word-spacing"],["writingMode","writing-mode"],["xmlnsXlink","xmlns:xlink"],["xHeight","x-height"]]),sT=/^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;function ou(e){return sT.test(""+e)?"javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')":e}var vf=null;function _f(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var ls=null,us=null;function Dg(e){var a=La(e);if(a&&(e=a.stateNode)){var s=e[Je]||null;t:switch(e=a.stateNode,a.type){case"input":if(ze(e,s.value,s.defaultValue,s.defaultValue,s.checked,s.defaultChecked,s.type,s.name),a=s.name,s.type==="radio"&&a!=null){for(s=e;s.parentNode;)s=s.parentNode;for(s=s.querySelectorAll('input[name="'+Mn(""+a)+'"][type="radio"]'),a=0;a<s.length;a++){var l=s[a];if(l!==e&&l.form===e.form){var h=l[Je]||null;if(!h)throw Error(r(90));ze(l,h.value,h.defaultValue,h.defaultValue,h.checked,h.defaultChecked,h.type,h.name)}}for(a=0;a<s.length;a++)l=s[a],l.form===e.form&&Ln(l)}break t;case"textarea":Rn(e,s.value,s.defaultValue);break t;case"select":a=s.value,a!=null&&tn(e,!!s.multiple,a,!1)}}}var yf=!1;function Ug(e,a,s){if(yf)return e(a,s);yf=!0;try{var l=e(a);return l}finally{if(yf=!1,(ls!==null||us!==null)&&(qu(),ls&&(a=ls,e=us,us=ls=null,Dg(a),e)))for(a=0;a<e.length;a++)Dg(e[a])}}function bo(e,a){var s=e.stateNode;if(s===null)return null;var l=s[Je]||null;if(l===null)return null;s=l[a];t:switch(a){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(l=!l.disabled)||(e=e.type,l=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!l;break t;default:e=!1}if(e)return null;if(s&&typeof s!="function")throw Error(r(231,a,typeof s));return s}var na=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),xf=!1;if(na)try{var Ao={};Object.defineProperty(Ao,"passive",{get:function(){xf=!0}}),window.addEventListener("test",Ao,Ao),window.removeEventListener("test",Ao,Ao)}catch{xf=!1}var Na=null,Sf=null,lu=null;function Lg(){if(lu)return lu;var e,a=Sf,s=a.length,l,h="value"in Na?Na.value:Na.textContent,g=h.length;for(e=0;e<s&&a[e]===h[e];e++);var M=s-e;for(l=1;l<=M&&a[s-l]===h[g-l];l++);return lu=h.slice(e,1<l?1-l:void 0)}function uu(e){var a=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&a===13&&(e=13)):e=a,e===10&&(e=13),32<=e||e===13?e:0}function cu(){return!0}function Pg(){return!1}function Wn(e){function a(s,l,h,g,M){this._reactName=s,this._targetInst=h,this.type=l,this.nativeEvent=g,this.target=M,this.currentTarget=null;for(var A in e)e.hasOwnProperty(A)&&(s=e[A],this[A]=s?s(g):g[A]);return this.isDefaultPrevented=(g.defaultPrevented!=null?g.defaultPrevented:g.returnValue===!1)?cu:Pg,this.isPropagationStopped=Pg,this}return m(a.prototype,{preventDefault:function(){this.defaultPrevented=!0;var s=this.nativeEvent;s&&(s.preventDefault?s.preventDefault():typeof s.returnValue!="unknown"&&(s.returnValue=!1),this.isDefaultPrevented=cu)},stopPropagation:function(){var s=this.nativeEvent;s&&(s.stopPropagation?s.stopPropagation():typeof s.cancelBubble!="unknown"&&(s.cancelBubble=!0),this.isPropagationStopped=cu)},persist:function(){},isPersistent:cu}),a}var yr={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},fu=Wn(yr),Ro=m({},yr,{view:0,detail:0}),oT=Wn(Ro),Mf,Ef,Co,hu=m({},Ro,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:bf,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==Co&&(Co&&e.type==="mousemove"?(Mf=e.screenX-Co.screenX,Ef=e.screenY-Co.screenY):Ef=Mf=0,Co=e),Mf)},movementY:function(e){return"movementY"in e?e.movementY:Ef}}),Ng=Wn(hu),lT=m({},hu,{dataTransfer:0}),uT=Wn(lT),cT=m({},Ro,{relatedTarget:0}),Tf=Wn(cT),fT=m({},yr,{animationName:0,elapsedTime:0,pseudoElement:0}),hT=Wn(fT),dT=m({},yr,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),pT=Wn(dT),mT=m({},yr,{data:0}),Og=Wn(mT),gT={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},vT={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},_T={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function yT(e){var a=this.nativeEvent;return a.getModifierState?a.getModifierState(e):(e=_T[e])?!!a[e]:!1}function bf(){return yT}var xT=m({},Ro,{key:function(e){if(e.key){var a=gT[e.key]||e.key;if(a!=="Unidentified")return a}return e.type==="keypress"?(e=uu(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?vT[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:bf,charCode:function(e){return e.type==="keypress"?uu(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?uu(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),ST=Wn(xT),MT=m({},hu,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),Bg=Wn(MT),ET=m({},Ro,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:bf}),TT=Wn(ET),bT=m({},yr,{propertyName:0,elapsedTime:0,pseudoElement:0}),AT=Wn(bT),RT=m({},hu,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),CT=Wn(RT),wT=m({},yr,{newState:0,oldState:0}),DT=Wn(wT),UT=[9,13,27,32],Af=na&&"CompositionEvent"in window,wo=null;na&&"documentMode"in document&&(wo=document.documentMode);var LT=na&&"TextEvent"in window&&!wo,Fg=na&&(!Af||wo&&8<wo&&11>=wo),Ig=" ",zg=!1;function Vg(e,a){switch(e){case"keyup":return UT.indexOf(a.keyCode)!==-1;case"keydown":return a.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function Hg(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var cs=!1;function PT(e,a){switch(e){case"compositionend":return Hg(a);case"keypress":return a.which!==32?null:(zg=!0,Ig);case"textInput":return e=a.data,e===Ig&&zg?null:e;default:return null}}function NT(e,a){if(cs)return e==="compositionend"||!Af&&Vg(e,a)?(e=Lg(),lu=Sf=Na=null,cs=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(a.ctrlKey||a.altKey||a.metaKey)||a.ctrlKey&&a.altKey){if(a.char&&1<a.char.length)return a.char;if(a.which)return String.fromCharCode(a.which)}return null;case"compositionend":return Fg&&a.locale!=="ko"?null:a.data;default:return null}}var OT={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function Gg(e){var a=e&&e.nodeName&&e.nodeName.toLowerCase();return a==="input"?!!OT[e.type]:a==="textarea"}function kg(e,a,s,l){ls?us?us.push(l):us=[l]:ls=l,a=$u(a,"onChange"),0<a.length&&(s=new fu("onChange","change",null,s,l),e.push({event:s,listeners:a}))}var Do=null,Uo=null;function BT(e){E_(e,0)}function du(e){var a=_r(e);if(Ln(a))return e}function Xg(e,a){if(e==="change")return a}var Wg=!1;if(na){var Rf;if(na){var Cf="oninput"in document;if(!Cf){var qg=document.createElement("div");qg.setAttribute("oninput","return;"),Cf=typeof qg.oninput=="function"}Rf=Cf}else Rf=!1;Wg=Rf&&(!document.documentMode||9<document.documentMode)}function Yg(){Do&&(Do.detachEvent("onpropertychange",jg),Uo=Do=null)}function jg(e){if(e.propertyName==="value"&&du(Uo)){var a=[];kg(a,Uo,e,_f(e)),Ug(BT,a)}}function FT(e,a,s){e==="focusin"?(Yg(),Do=a,Uo=s,Do.attachEvent("onpropertychange",jg)):e==="focusout"&&Yg()}function IT(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return du(Uo)}function zT(e,a){if(e==="click")return du(a)}function VT(e,a){if(e==="input"||e==="change")return du(a)}function HT(e,a){return e===a&&(e!==0||1/e===1/a)||e!==e&&a!==a}var ti=typeof Object.is=="function"?Object.is:HT;function Lo(e,a){if(ti(e,a))return!0;if(typeof e!="object"||e===null||typeof a!="object"||a===null)return!1;var s=Object.keys(e),l=Object.keys(a);if(s.length!==l.length)return!1;for(l=0;l<s.length;l++){var h=s[l];if(!un.call(a,h)||!ti(e[h],a[h]))return!1}return!0}function Kg(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function Zg(e,a){var s=Kg(e);e=0;for(var l;s;){if(s.nodeType===3){if(l=e+s.textContent.length,e<=a&&l>=a)return{node:s,offset:a-e};e=l}t:{for(;s;){if(s.nextSibling){s=s.nextSibling;break t}s=s.parentNode}s=void 0}s=Kg(s)}}function Qg(e,a){return e&&a?e===a?!0:e&&e.nodeType===3?!1:a&&a.nodeType===3?Qg(e,a.parentNode):"contains"in e?e.contains(a):e.compareDocumentPosition?!!(e.compareDocumentPosition(a)&16):!1:!1}function $g(e){e=e!=null&&e.ownerDocument!=null&&e.ownerDocument.defaultView!=null?e.ownerDocument.defaultView:window;for(var a=bi(e.document);a instanceof e.HTMLIFrameElement;){try{var s=typeof a.contentWindow.location.href=="string"}catch{s=!1}if(s)e=a.contentWindow;else break;a=bi(e.document)}return a}function wf(e){var a=e&&e.nodeName&&e.nodeName.toLowerCase();return a&&(a==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||a==="textarea"||e.contentEditable==="true")}var GT=na&&"documentMode"in document&&11>=document.documentMode,fs=null,Df=null,Po=null,Uf=!1;function Jg(e,a,s){var l=s.window===s?s.document:s.nodeType===9?s:s.ownerDocument;Uf||fs==null||fs!==bi(l)||(l=fs,"selectionStart"in l&&wf(l)?l={start:l.selectionStart,end:l.selectionEnd}:(l=(l.ownerDocument&&l.ownerDocument.defaultView||window).getSelection(),l={anchorNode:l.anchorNode,anchorOffset:l.anchorOffset,focusNode:l.focusNode,focusOffset:l.focusOffset}),Po&&Lo(Po,l)||(Po=l,l=$u(Df,"onSelect"),0<l.length&&(a=new fu("onSelect","select",null,a,s),e.push({event:a,listeners:l}),a.target=fs)))}function xr(e,a){var s={};return s[e.toLowerCase()]=a.toLowerCase(),s["Webkit"+e]="webkit"+a,s["Moz"+e]="moz"+a,s}var hs={animationend:xr("Animation","AnimationEnd"),animationiteration:xr("Animation","AnimationIteration"),animationstart:xr("Animation","AnimationStart"),transitionrun:xr("Transition","TransitionRun"),transitionstart:xr("Transition","TransitionStart"),transitioncancel:xr("Transition","TransitionCancel"),transitionend:xr("Transition","TransitionEnd")},Lf={},tv={};na&&(tv=document.createElement("div").style,"AnimationEvent"in window||(delete hs.animationend.animation,delete hs.animationiteration.animation,delete hs.animationstart.animation),"TransitionEvent"in window||delete hs.transitionend.transition);function Sr(e){if(Lf[e])return Lf[e];if(!hs[e])return e;var a=hs[e],s;for(s in a)if(a.hasOwnProperty(s)&&s in tv)return Lf[e]=a[s];return e}var ev=Sr("animationend"),nv=Sr("animationiteration"),iv=Sr("animationstart"),kT=Sr("transitionrun"),XT=Sr("transitionstart"),WT=Sr("transitioncancel"),av=Sr("transitionend"),rv=new Map,Pf="abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");Pf.push("scrollEnd");function Ai(e,a){rv.set(e,a),R(a,[e])}var sv=new WeakMap;function fi(e,a){if(typeof e=="object"&&e!==null){var s=sv.get(e);return s!==void 0?s:(a={value:e,source:a,stack:Pe(a)},sv.set(e,a),a)}return{value:e,source:a,stack:Pe(a)}}var hi=[],ds=0,Nf=0;function pu(){for(var e=ds,a=Nf=ds=0;a<e;){var s=hi[a];hi[a++]=null;var l=hi[a];hi[a++]=null;var h=hi[a];hi[a++]=null;var g=hi[a];if(hi[a++]=null,l!==null&&h!==null){var M=l.pending;M===null?h.next=h:(h.next=M.next,M.next=h),l.pending=h}g!==0&&ov(s,h,g)}}function mu(e,a,s,l){hi[ds++]=e,hi[ds++]=a,hi[ds++]=s,hi[ds++]=l,Nf|=l,e.lanes|=l,e=e.alternate,e!==null&&(e.lanes|=l)}function Of(e,a,s,l){return mu(e,a,s,l),gu(e)}function ps(e,a){return mu(e,null,null,a),gu(e)}function ov(e,a,s){e.lanes|=s;var l=e.alternate;l!==null&&(l.lanes|=s);for(var h=!1,g=e.return;g!==null;)g.childLanes|=s,l=g.alternate,l!==null&&(l.childLanes|=s),g.tag===22&&(e=g.stateNode,e===null||e._visibility&1||(h=!0)),e=g,g=g.return;return e.tag===3?(g=e.stateNode,h&&a!==null&&(h=31-Bt(s),e=g.hiddenUpdates,l=e[h],l===null?e[h]=[a]:l.push(a),a.lane=s|536870912),g):null}function gu(e){if(50<al)throw al=0,Hh=null,Error(r(185));for(var a=e.return;a!==null;)e=a,a=e.return;return e.tag===3?e.stateNode:null}var ms={};function qT(e,a,s,l){this.tag=e,this.key=s,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.refCleanup=this.ref=null,this.pendingProps=a,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=l,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function ei(e,a,s,l){return new qT(e,a,s,l)}function Bf(e){return e=e.prototype,!(!e||!e.isReactComponent)}function ia(e,a){var s=e.alternate;return s===null?(s=ei(e.tag,a,e.key,e.mode),s.elementType=e.elementType,s.type=e.type,s.stateNode=e.stateNode,s.alternate=e,e.alternate=s):(s.pendingProps=a,s.type=e.type,s.flags=0,s.subtreeFlags=0,s.deletions=null),s.flags=e.flags&65011712,s.childLanes=e.childLanes,s.lanes=e.lanes,s.child=e.child,s.memoizedProps=e.memoizedProps,s.memoizedState=e.memoizedState,s.updateQueue=e.updateQueue,a=e.dependencies,s.dependencies=a===null?null:{lanes:a.lanes,firstContext:a.firstContext},s.sibling=e.sibling,s.index=e.index,s.ref=e.ref,s.refCleanup=e.refCleanup,s}function lv(e,a){e.flags&=65011714;var s=e.alternate;return s===null?(e.childLanes=0,e.lanes=a,e.child=null,e.subtreeFlags=0,e.memoizedProps=null,e.memoizedState=null,e.updateQueue=null,e.dependencies=null,e.stateNode=null):(e.childLanes=s.childLanes,e.lanes=s.lanes,e.child=s.child,e.subtreeFlags=0,e.deletions=null,e.memoizedProps=s.memoizedProps,e.memoizedState=s.memoizedState,e.updateQueue=s.updateQueue,e.type=s.type,a=s.dependencies,e.dependencies=a===null?null:{lanes:a.lanes,firstContext:a.firstContext}),e}function vu(e,a,s,l,h,g){var M=0;if(l=e,typeof e=="function")Bf(e)&&(M=1);else if(typeof e=="string")M=jb(e,s,Ut.current)?26:e==="html"||e==="head"||e==="body"?27:5;else t:switch(e){case U:return e=ei(31,s,a,h),e.elementType=U,e.lanes=g,e;case E:return Mr(s.children,h,g,a);case T:M=8,h|=24;break;case S:return e=ei(12,s,a,h|2),e.elementType=S,e.lanes=g,e;case N:return e=ei(13,s,a,h),e.elementType=N,e.lanes=g,e;case F:return e=ei(19,s,a,h),e.elementType=F,e.lanes=g,e;default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case y:case C:M=10;break t;case w:M=9;break t;case D:M=11;break t;case z:M=14;break t;case H:M=16,l=null;break t}M=29,s=Error(r(130,e===null?"null":typeof e,"")),l=null}return a=ei(M,s,a,h),a.elementType=e,a.type=l,a.lanes=g,a}function Mr(e,a,s,l){return e=ei(7,e,l,a),e.lanes=s,e}function Ff(e,a,s){return e=ei(6,e,null,a),e.lanes=s,e}function If(e,a,s){return a=ei(4,e.children!==null?e.children:[],e.key,a),a.lanes=s,a.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},a}var gs=[],vs=0,_u=null,yu=0,di=[],pi=0,Er=null,aa=1,ra="";function Tr(e,a){gs[vs++]=yu,gs[vs++]=_u,_u=e,yu=a}function uv(e,a,s){di[pi++]=aa,di[pi++]=ra,di[pi++]=Er,Er=e;var l=aa;e=ra;var h=32-Bt(l)-1;l&=~(1<<h),s+=1;var g=32-Bt(a)+h;if(30<g){var M=h-h%5;g=(l&(1<<M)-1).toString(32),l>>=M,h-=M,aa=1<<32-Bt(a)+h|s<<h|l,ra=g+e}else aa=1<<g|s<<h|l,ra=e}function zf(e){e.return!==null&&(Tr(e,1),uv(e,1,0))}function Vf(e){for(;e===_u;)_u=gs[--vs],gs[vs]=null,yu=gs[--vs],gs[vs]=null;for(;e===Er;)Er=di[--pi],di[pi]=null,ra=di[--pi],di[pi]=null,aa=di[--pi],di[pi]=null}var Hn=null,en=null,Re=!1,br=null,Hi=!1,Hf=Error(r(519));function Ar(e){var a=Error(r(418,""));throw Bo(fi(a,e)),Hf}function cv(e){var a=e.stateNode,s=e.type,l=e.memoizedProps;switch(a[gn]=e,a[Je]=l,s){case"dialog":xe("cancel",a),xe("close",a);break;case"iframe":case"object":case"embed":xe("load",a);break;case"video":case"audio":for(s=0;s<sl.length;s++)xe(sl[s],a);break;case"source":xe("error",a);break;case"img":case"image":case"link":xe("error",a),xe("load",a);break;case"details":xe("toggle",a);break;case"input":xe("invalid",a),Vn(a,l.value,l.defaultValue,l.checked,l.defaultChecked,l.type,l.name,!0),_e(a);break;case"select":xe("invalid",a);break;case"textarea":xe("invalid",a),os(a,l.value,l.defaultValue,l.children),_e(a)}s=l.children,typeof s!="string"&&typeof s!="number"&&typeof s!="bigint"||a.textContent===""+s||l.suppressHydrationWarning===!0||R_(a.textContent,s)?(l.popover!=null&&(xe("beforetoggle",a),xe("toggle",a)),l.onScroll!=null&&xe("scroll",a),l.onScrollEnd!=null&&xe("scrollend",a),l.onClick!=null&&(a.onclick=Ju),a=!0):a=!1,a||Ar(e)}function fv(e){for(Hn=e.return;Hn;)switch(Hn.tag){case 5:case 13:Hi=!1;return;case 27:case 3:Hi=!0;return;default:Hn=Hn.return}}function No(e){if(e!==Hn)return!1;if(!Re)return fv(e),Re=!0,!1;var a=e.tag,s;if((s=a!==3&&a!==27)&&((s=a===5)&&(s=e.type,s=!(s!=="form"&&s!=="button")||id(e.type,e.memoizedProps)),s=!s),s&&en&&Ar(e),fv(e),a===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(r(317));t:{for(e=e.nextSibling,a=0;e;){if(e.nodeType===8)if(s=e.data,s==="/$"){if(a===0){en=Ci(e.nextSibling);break t}a--}else s!=="$"&&s!=="$!"&&s!=="$?"||a++;e=e.nextSibling}en=null}}else a===27?(a=en,Za(e.type)?(e=od,od=null,en=e):en=a):en=Hn?Ci(e.stateNode.nextSibling):null;return!0}function Oo(){en=Hn=null,Re=!1}function hv(){var e=br;return e!==null&&(jn===null?jn=e:jn.push.apply(jn,e),br=null),e}function Bo(e){br===null?br=[e]:br.push(e)}var Gf=J(null),Rr=null,sa=null;function Oa(e,a,s){St(Gf,a._currentValue),a._currentValue=s}function oa(e){e._currentValue=Gf.current,xt(Gf)}function kf(e,a,s){for(;e!==null;){var l=e.alternate;if((e.childLanes&a)!==a?(e.childLanes|=a,l!==null&&(l.childLanes|=a)):l!==null&&(l.childLanes&a)!==a&&(l.childLanes|=a),e===s)break;e=e.return}}function Xf(e,a,s,l){var h=e.child;for(h!==null&&(h.return=e);h!==null;){var g=h.dependencies;if(g!==null){var M=h.child;g=g.firstContext;t:for(;g!==null;){var A=g;g=h;for(var B=0;B<a.length;B++)if(A.context===a[B]){g.lanes|=s,A=g.alternate,A!==null&&(A.lanes|=s),kf(g.return,s,e),l||(M=null);break t}g=A.next}}else if(h.tag===18){if(M=h.return,M===null)throw Error(r(341));M.lanes|=s,g=M.alternate,g!==null&&(g.lanes|=s),kf(M,s,e),M=null}else M=h.child;if(M!==null)M.return=h;else for(M=h;M!==null;){if(M===e){M=null;break}if(h=M.sibling,h!==null){h.return=M.return,M=h;break}M=M.return}h=M}}function Fo(e,a,s,l){e=null;for(var h=a,g=!1;h!==null;){if(!g){if((h.flags&524288)!==0)g=!0;else if((h.flags&262144)!==0)break}if(h.tag===10){var M=h.alternate;if(M===null)throw Error(r(387));if(M=M.memoizedProps,M!==null){var A=h.type;ti(h.pendingProps.value,M.value)||(e!==null?e.push(A):e=[A])}}else if(h===vt.current){if(M=h.alternate,M===null)throw Error(r(387));M.memoizedState.memoizedState!==h.memoizedState.memoizedState&&(e!==null?e.push(hl):e=[hl])}h=h.return}e!==null&&Xf(a,e,s,l),a.flags|=262144}function xu(e){for(e=e.firstContext;e!==null;){if(!ti(e.context._currentValue,e.memoizedValue))return!0;e=e.next}return!1}function Cr(e){Rr=e,sa=null,e=e.dependencies,e!==null&&(e.firstContext=null)}function Nn(e){return dv(Rr,e)}function Su(e,a){return Rr===null&&Cr(e),dv(e,a)}function dv(e,a){var s=a._currentValue;if(a={context:a,memoizedValue:s,next:null},sa===null){if(e===null)throw Error(r(308));sa=a,e.dependencies={lanes:0,firstContext:a},e.flags|=524288}else sa=sa.next=a;return s}var YT=typeof AbortController<"u"?AbortController:function(){var e=[],a=this.signal={aborted:!1,addEventListener:function(s,l){e.push(l)}};this.abort=function(){a.aborted=!0,e.forEach(function(s){return s()})}},jT=i.unstable_scheduleCallback,KT=i.unstable_NormalPriority,vn={$$typeof:C,Consumer:null,Provider:null,_currentValue:null,_currentValue2:null,_threadCount:0};function Wf(){return{controller:new YT,data:new Map,refCount:0}}function Io(e){e.refCount--,e.refCount===0&&jT(KT,function(){e.controller.abort()})}var zo=null,qf=0,_s=0,ys=null;function ZT(e,a){if(zo===null){var s=zo=[];qf=0,_s=jh(),ys={status:"pending",value:void 0,then:function(l){s.push(l)}}}return qf++,a.then(pv,pv),a}function pv(){if(--qf===0&&zo!==null){ys!==null&&(ys.status="fulfilled");var e=zo;zo=null,_s=0,ys=null;for(var a=0;a<e.length;a++)(0,e[a])()}}function QT(e,a){var s=[],l={status:"pending",value:null,reason:null,then:function(h){s.push(h)}};return e.then(function(){l.status="fulfilled",l.value=a;for(var h=0;h<s.length;h++)(0,s[h])(a)},function(h){for(l.status="rejected",l.reason=h,h=0;h<s.length;h++)(0,s[h])(void 0)}),l}var mv=I.S;I.S=function(e,a){typeof a=="object"&&a!==null&&typeof a.then=="function"&&ZT(e,a),mv!==null&&mv(e,a)};var wr=J(null);function Yf(){var e=wr.current;return e!==null?e:Ge.pooledCache}function Mu(e,a){a===null?St(wr,wr.current):St(wr,a.pool)}function gv(){var e=Yf();return e===null?null:{parent:vn._currentValue,pool:e}}var Vo=Error(r(460)),vv=Error(r(474)),Eu=Error(r(542)),jf={then:function(){}};function _v(e){return e=e.status,e==="fulfilled"||e==="rejected"}function Tu(){}function yv(e,a,s){switch(s=e[s],s===void 0?e.push(a):s!==a&&(a.then(Tu,Tu),a=s),a.status){case"fulfilled":return a.value;case"rejected":throw e=a.reason,Sv(e),e;default:if(typeof a.status=="string")a.then(Tu,Tu);else{if(e=Ge,e!==null&&100<e.shellSuspendCounter)throw Error(r(482));e=a,e.status="pending",e.then(function(l){if(a.status==="pending"){var h=a;h.status="fulfilled",h.value=l}},function(l){if(a.status==="pending"){var h=a;h.status="rejected",h.reason=l}})}switch(a.status){case"fulfilled":return a.value;case"rejected":throw e=a.reason,Sv(e),e}throw Ho=a,Vo}}var Ho=null;function xv(){if(Ho===null)throw Error(r(459));var e=Ho;return Ho=null,e}function Sv(e){if(e===Vo||e===Eu)throw Error(r(483))}var Ba=!1;function Kf(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,lanes:0,hiddenCallbacks:null},callbacks:null}}function Zf(e,a){e=e.updateQueue,a.updateQueue===e&&(a.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,callbacks:null})}function Fa(e){return{lane:e,tag:0,payload:null,callback:null,next:null}}function Ia(e,a,s){var l=e.updateQueue;if(l===null)return null;if(l=l.shared,(De&2)!==0){var h=l.pending;return h===null?a.next=a:(a.next=h.next,h.next=a),l.pending=a,a=gu(e),ov(e,null,s),a}return mu(e,l,a,s),gu(e)}function Go(e,a,s){if(a=a.updateQueue,a!==null&&(a=a.shared,(s&4194048)!==0)){var l=a.lanes;l&=e.pendingLanes,s|=l,a.lanes=s,Ht(e,s)}}function Qf(e,a){var s=e.updateQueue,l=e.alternate;if(l!==null&&(l=l.updateQueue,s===l)){var h=null,g=null;if(s=s.firstBaseUpdate,s!==null){do{var M={lane:s.lane,tag:s.tag,payload:s.payload,callback:null,next:null};g===null?h=g=M:g=g.next=M,s=s.next}while(s!==null);g===null?h=g=a:g=g.next=a}else h=g=a;s={baseState:l.baseState,firstBaseUpdate:h,lastBaseUpdate:g,shared:l.shared,callbacks:l.callbacks},e.updateQueue=s;return}e=s.lastBaseUpdate,e===null?s.firstBaseUpdate=a:e.next=a,s.lastBaseUpdate=a}var $f=!1;function ko(){if($f){var e=ys;if(e!==null)throw e}}function Xo(e,a,s,l){$f=!1;var h=e.updateQueue;Ba=!1;var g=h.firstBaseUpdate,M=h.lastBaseUpdate,A=h.shared.pending;if(A!==null){h.shared.pending=null;var B=A,$=B.next;B.next=null,M===null?g=$:M.next=$,M=B;var ht=e.alternate;ht!==null&&(ht=ht.updateQueue,A=ht.lastBaseUpdate,A!==M&&(A===null?ht.firstBaseUpdate=$:A.next=$,ht.lastBaseUpdate=B))}if(g!==null){var gt=h.baseState;M=0,ht=$=B=null,A=g;do{var it=A.lane&-536870913,at=it!==A.lane;if(at?(Me&it)===it:(l&it)===it){it!==0&&it===_s&&($f=!0),ht!==null&&(ht=ht.next={lane:0,tag:A.tag,payload:A.payload,callback:null,next:null});t:{var ae=e,te=A;it=a;var Be=s;switch(te.tag){case 1:if(ae=te.payload,typeof ae=="function"){gt=ae.call(Be,gt,it);break t}gt=ae;break t;case 3:ae.flags=ae.flags&-65537|128;case 0:if(ae=te.payload,it=typeof ae=="function"?ae.call(Be,gt,it):ae,it==null)break t;gt=m({},gt,it);break t;case 2:Ba=!0}}it=A.callback,it!==null&&(e.flags|=64,at&&(e.flags|=8192),at=h.callbacks,at===null?h.callbacks=[it]:at.push(it))}else at={lane:it,tag:A.tag,payload:A.payload,callback:A.callback,next:null},ht===null?($=ht=at,B=gt):ht=ht.next=at,M|=it;if(A=A.next,A===null){if(A=h.shared.pending,A===null)break;at=A,A=at.next,at.next=null,h.lastBaseUpdate=at,h.shared.pending=null}}while(!0);ht===null&&(B=gt),h.baseState=B,h.firstBaseUpdate=$,h.lastBaseUpdate=ht,g===null&&(h.shared.lanes=0),qa|=M,e.lanes=M,e.memoizedState=gt}}function Mv(e,a){if(typeof e!="function")throw Error(r(191,e));e.call(a)}function Ev(e,a){var s=e.callbacks;if(s!==null)for(e.callbacks=null,e=0;e<s.length;e++)Mv(s[e],a)}var xs=J(null),bu=J(0);function Tv(e,a){e=pa,St(bu,e),St(xs,a),pa=e|a.baseLanes}function Jf(){St(bu,pa),St(xs,xs.current)}function th(){pa=bu.current,xt(xs),xt(bu)}var za=0,ge=null,Ne=null,fn=null,Au=!1,Ss=!1,Dr=!1,Ru=0,Wo=0,Ms=null,$T=0;function sn(){throw Error(r(321))}function eh(e,a){if(a===null)return!1;for(var s=0;s<a.length&&s<e.length;s++)if(!ti(e[s],a[s]))return!1;return!0}function nh(e,a,s,l,h,g){return za=g,ge=a,a.memoizedState=null,a.updateQueue=null,a.lanes=0,I.H=e===null||e.memoizedState===null?o0:l0,Dr=!1,g=s(l,h),Dr=!1,Ss&&(g=Av(a,s,l,h)),bv(e),g}function bv(e){I.H=Pu;var a=Ne!==null&&Ne.next!==null;if(za=0,fn=Ne=ge=null,Au=!1,Wo=0,Ms=null,a)throw Error(r(300));e===null||En||(e=e.dependencies,e!==null&&xu(e)&&(En=!0))}function Av(e,a,s,l){ge=e;var h=0;do{if(Ss&&(Ms=null),Wo=0,Ss=!1,25<=h)throw Error(r(301));if(h+=1,fn=Ne=null,e.updateQueue!=null){var g=e.updateQueue;g.lastEffect=null,g.events=null,g.stores=null,g.memoCache!=null&&(g.memoCache.index=0)}I.H=rb,g=a(s,l)}while(Ss);return g}function JT(){var e=I.H,a=e.useState()[0];return a=typeof a.then=="function"?qo(a):a,e=e.useState()[0],(Ne!==null?Ne.memoizedState:null)!==e&&(ge.flags|=1024),a}function ih(){var e=Ru!==0;return Ru=0,e}function ah(e,a,s){a.updateQueue=e.updateQueue,a.flags&=-2053,e.lanes&=~s}function rh(e){if(Au){for(e=e.memoizedState;e!==null;){var a=e.queue;a!==null&&(a.pending=null),e=e.next}Au=!1}za=0,fn=Ne=ge=null,Ss=!1,Wo=Ru=0,Ms=null}function qn(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return fn===null?ge.memoizedState=fn=e:fn=fn.next=e,fn}function hn(){if(Ne===null){var e=ge.alternate;e=e!==null?e.memoizedState:null}else e=Ne.next;var a=fn===null?ge.memoizedState:fn.next;if(a!==null)fn=a,Ne=e;else{if(e===null)throw ge.alternate===null?Error(r(467)):Error(r(310));Ne=e,e={memoizedState:Ne.memoizedState,baseState:Ne.baseState,baseQueue:Ne.baseQueue,queue:Ne.queue,next:null},fn===null?ge.memoizedState=fn=e:fn=fn.next=e}return fn}function sh(){return{lastEffect:null,events:null,stores:null,memoCache:null}}function qo(e){var a=Wo;return Wo+=1,Ms===null&&(Ms=[]),e=yv(Ms,e,a),a=ge,(fn===null?a.memoizedState:fn.next)===null&&(a=a.alternate,I.H=a===null||a.memoizedState===null?o0:l0),e}function Cu(e){if(e!==null&&typeof e=="object"){if(typeof e.then=="function")return qo(e);if(e.$$typeof===C)return Nn(e)}throw Error(r(438,String(e)))}function oh(e){var a=null,s=ge.updateQueue;if(s!==null&&(a=s.memoCache),a==null){var l=ge.alternate;l!==null&&(l=l.updateQueue,l!==null&&(l=l.memoCache,l!=null&&(a={data:l.data.map(function(h){return h.slice()}),index:0})))}if(a==null&&(a={data:[],index:0}),s===null&&(s=sh(),ge.updateQueue=s),s.memoCache=a,s=a.data[a.index],s===void 0)for(s=a.data[a.index]=Array(e),l=0;l<e;l++)s[l]=L;return a.index++,s}function la(e,a){return typeof a=="function"?a(e):a}function wu(e){var a=hn();return lh(a,Ne,e)}function lh(e,a,s){var l=e.queue;if(l===null)throw Error(r(311));l.lastRenderedReducer=s;var h=e.baseQueue,g=l.pending;if(g!==null){if(h!==null){var M=h.next;h.next=g.next,g.next=M}a.baseQueue=h=g,l.pending=null}if(g=e.baseState,h===null)e.memoizedState=g;else{a=h.next;var A=M=null,B=null,$=a,ht=!1;do{var gt=$.lane&-536870913;if(gt!==$.lane?(Me&gt)===gt:(za&gt)===gt){var it=$.revertLane;if(it===0)B!==null&&(B=B.next={lane:0,revertLane:0,action:$.action,hasEagerState:$.hasEagerState,eagerState:$.eagerState,next:null}),gt===_s&&(ht=!0);else if((za&it)===it){$=$.next,it===_s&&(ht=!0);continue}else gt={lane:0,revertLane:$.revertLane,action:$.action,hasEagerState:$.hasEagerState,eagerState:$.eagerState,next:null},B===null?(A=B=gt,M=g):B=B.next=gt,ge.lanes|=it,qa|=it;gt=$.action,Dr&&s(g,gt),g=$.hasEagerState?$.eagerState:s(g,gt)}else it={lane:gt,revertLane:$.revertLane,action:$.action,hasEagerState:$.hasEagerState,eagerState:$.eagerState,next:null},B===null?(A=B=it,M=g):B=B.next=it,ge.lanes|=gt,qa|=gt;$=$.next}while($!==null&&$!==a);if(B===null?M=g:B.next=A,!ti(g,e.memoizedState)&&(En=!0,ht&&(s=ys,s!==null)))throw s;e.memoizedState=g,e.baseState=M,e.baseQueue=B,l.lastRenderedState=g}return h===null&&(l.lanes=0),[e.memoizedState,l.dispatch]}function uh(e){var a=hn(),s=a.queue;if(s===null)throw Error(r(311));s.lastRenderedReducer=e;var l=s.dispatch,h=s.pending,g=a.memoizedState;if(h!==null){s.pending=null;var M=h=h.next;do g=e(g,M.action),M=M.next;while(M!==h);ti(g,a.memoizedState)||(En=!0),a.memoizedState=g,a.baseQueue===null&&(a.baseState=g),s.lastRenderedState=g}return[g,l]}function Rv(e,a,s){var l=ge,h=hn(),g=Re;if(g){if(s===void 0)throw Error(r(407));s=s()}else s=a();var M=!ti((Ne||h).memoizedState,s);M&&(h.memoizedState=s,En=!0),h=h.queue;var A=Dv.bind(null,l,h,e);if(Yo(2048,8,A,[e]),h.getSnapshot!==a||M||fn!==null&&fn.memoizedState.tag&1){if(l.flags|=2048,Es(9,Du(),wv.bind(null,l,h,s,a),null),Ge===null)throw Error(r(349));g||(za&124)!==0||Cv(l,a,s)}return s}function Cv(e,a,s){e.flags|=16384,e={getSnapshot:a,value:s},a=ge.updateQueue,a===null?(a=sh(),ge.updateQueue=a,a.stores=[e]):(s=a.stores,s===null?a.stores=[e]:s.push(e))}function wv(e,a,s,l){a.value=s,a.getSnapshot=l,Uv(a)&&Lv(e)}function Dv(e,a,s){return s(function(){Uv(a)&&Lv(e)})}function Uv(e){var a=e.getSnapshot;e=e.value;try{var s=a();return!ti(e,s)}catch{return!0}}function Lv(e){var a=ps(e,2);a!==null&&si(a,e,2)}function ch(e){var a=qn();if(typeof e=="function"){var s=e;if(e=s(),Dr){lt(!0);try{s()}finally{lt(!1)}}}return a.memoizedState=a.baseState=e,a.queue={pending:null,lanes:0,dispatch:null,lastRenderedReducer:la,lastRenderedState:e},a}function Pv(e,a,s,l){return e.baseState=s,lh(e,Ne,typeof l=="function"?l:la)}function tb(e,a,s,l,h){if(Lu(e))throw Error(r(485));if(e=a.action,e!==null){var g={payload:h,action:e,next:null,isTransition:!0,status:"pending",value:null,reason:null,listeners:[],then:function(M){g.listeners.push(M)}};I.T!==null?s(!0):g.isTransition=!1,l(g),s=a.pending,s===null?(g.next=a.pending=g,Nv(a,g)):(g.next=s.next,a.pending=s.next=g)}}function Nv(e,a){var s=a.action,l=a.payload,h=e.state;if(a.isTransition){var g=I.T,M={};I.T=M;try{var A=s(h,l),B=I.S;B!==null&&B(M,A),Ov(e,a,A)}catch($){fh(e,a,$)}finally{I.T=g}}else try{g=s(h,l),Ov(e,a,g)}catch($){fh(e,a,$)}}function Ov(e,a,s){s!==null&&typeof s=="object"&&typeof s.then=="function"?s.then(function(l){Bv(e,a,l)},function(l){return fh(e,a,l)}):Bv(e,a,s)}function Bv(e,a,s){a.status="fulfilled",a.value=s,Fv(a),e.state=s,a=e.pending,a!==null&&(s=a.next,s===a?e.pending=null:(s=s.next,a.next=s,Nv(e,s)))}function fh(e,a,s){var l=e.pending;if(e.pending=null,l!==null){l=l.next;do a.status="rejected",a.reason=s,Fv(a),a=a.next;while(a!==l)}e.action=null}function Fv(e){e=e.listeners;for(var a=0;a<e.length;a++)(0,e[a])()}function Iv(e,a){return a}function zv(e,a){if(Re){var s=Ge.formState;if(s!==null){t:{var l=ge;if(Re){if(en){e:{for(var h=en,g=Hi;h.nodeType!==8;){if(!g){h=null;break e}if(h=Ci(h.nextSibling),h===null){h=null;break e}}g=h.data,h=g==="F!"||g==="F"?h:null}if(h){en=Ci(h.nextSibling),l=h.data==="F!";break t}}Ar(l)}l=!1}l&&(a=s[0])}}return s=qn(),s.memoizedState=s.baseState=a,l={pending:null,lanes:0,dispatch:null,lastRenderedReducer:Iv,lastRenderedState:a},s.queue=l,s=a0.bind(null,ge,l),l.dispatch=s,l=ch(!1),g=gh.bind(null,ge,!1,l.queue),l=qn(),h={state:a,dispatch:null,action:e,pending:null},l.queue=h,s=tb.bind(null,ge,h,g,s),h.dispatch=s,l.memoizedState=e,[a,s,!1]}function Vv(e){var a=hn();return Hv(a,Ne,e)}function Hv(e,a,s){if(a=lh(e,a,Iv)[0],e=wu(la)[0],typeof a=="object"&&a!==null&&typeof a.then=="function")try{var l=qo(a)}catch(M){throw M===Vo?Eu:M}else l=a;a=hn();var h=a.queue,g=h.dispatch;return s!==a.memoizedState&&(ge.flags|=2048,Es(9,Du(),eb.bind(null,h,s),null)),[l,g,e]}function eb(e,a){e.action=a}function Gv(e){var a=hn(),s=Ne;if(s!==null)return Hv(a,s,e);hn(),a=a.memoizedState,s=hn();var l=s.queue.dispatch;return s.memoizedState=e,[a,l,!1]}function Es(e,a,s,l){return e={tag:e,create:s,deps:l,inst:a,next:null},a=ge.updateQueue,a===null&&(a=sh(),ge.updateQueue=a),s=a.lastEffect,s===null?a.lastEffect=e.next=e:(l=s.next,s.next=e,e.next=l,a.lastEffect=e),e}function Du(){return{destroy:void 0,resource:void 0}}function kv(){return hn().memoizedState}function Uu(e,a,s,l){var h=qn();l=l===void 0?null:l,ge.flags|=e,h.memoizedState=Es(1|a,Du(),s,l)}function Yo(e,a,s,l){var h=hn();l=l===void 0?null:l;var g=h.memoizedState.inst;Ne!==null&&l!==null&&eh(l,Ne.memoizedState.deps)?h.memoizedState=Es(a,g,s,l):(ge.flags|=e,h.memoizedState=Es(1|a,g,s,l))}function Xv(e,a){Uu(8390656,8,e,a)}function Wv(e,a){Yo(2048,8,e,a)}function qv(e,a){return Yo(4,2,e,a)}function Yv(e,a){return Yo(4,4,e,a)}function jv(e,a){if(typeof a=="function"){e=e();var s=a(e);return function(){typeof s=="function"?s():a(null)}}if(a!=null)return e=e(),a.current=e,function(){a.current=null}}function Kv(e,a,s){s=s!=null?s.concat([e]):null,Yo(4,4,jv.bind(null,a,e),s)}function hh(){}function Zv(e,a){var s=hn();a=a===void 0?null:a;var l=s.memoizedState;return a!==null&&eh(a,l[1])?l[0]:(s.memoizedState=[e,a],e)}function Qv(e,a){var s=hn();a=a===void 0?null:a;var l=s.memoizedState;if(a!==null&&eh(a,l[1]))return l[0];if(l=e(),Dr){lt(!0);try{e()}finally{lt(!1)}}return s.memoizedState=[l,a],l}function dh(e,a,s){return s===void 0||(za&1073741824)!==0?e.memoizedState=a:(e.memoizedState=s,e=t_(),ge.lanes|=e,qa|=e,s)}function $v(e,a,s,l){return ti(s,a)?s:xs.current!==null?(e=dh(e,s,l),ti(e,a)||(En=!0),e):(za&42)===0?(En=!0,e.memoizedState=s):(e=t_(),ge.lanes|=e,qa|=e,a)}function Jv(e,a,s,l,h){var g=q.p;q.p=g!==0&&8>g?g:8;var M=I.T,A={};I.T=A,gh(e,!1,a,s);try{var B=h(),$=I.S;if($!==null&&$(A,B),B!==null&&typeof B=="object"&&typeof B.then=="function"){var ht=QT(B,l);jo(e,a,ht,ri(e))}else jo(e,a,l,ri(e))}catch(gt){jo(e,a,{then:function(){},status:"rejected",reason:gt},ri())}finally{q.p=g,I.T=M}}function nb(){}function ph(e,a,s,l){if(e.tag!==5)throw Error(r(476));var h=t0(e).queue;Jv(e,h,a,W,s===null?nb:function(){return e0(e),s(l)})}function t0(e){var a=e.memoizedState;if(a!==null)return a;a={memoizedState:W,baseState:W,baseQueue:null,queue:{pending:null,lanes:0,dispatch:null,lastRenderedReducer:la,lastRenderedState:W},next:null};var s={};return a.next={memoizedState:s,baseState:s,baseQueue:null,queue:{pending:null,lanes:0,dispatch:null,lastRenderedReducer:la,lastRenderedState:s},next:null},e.memoizedState=a,e=e.alternate,e!==null&&(e.memoizedState=a),a}function e0(e){var a=t0(e).next.queue;jo(e,a,{},ri())}function mh(){return Nn(hl)}function n0(){return hn().memoizedState}function i0(){return hn().memoizedState}function ib(e){for(var a=e.return;a!==null;){switch(a.tag){case 24:case 3:var s=ri();e=Fa(s);var l=Ia(a,e,s);l!==null&&(si(l,a,s),Go(l,a,s)),a={cache:Wf()},e.payload=a;return}a=a.return}}function ab(e,a,s){var l=ri();s={lane:l,revertLane:0,action:s,hasEagerState:!1,eagerState:null,next:null},Lu(e)?r0(a,s):(s=Of(e,a,s,l),s!==null&&(si(s,e,l),s0(s,a,l)))}function a0(e,a,s){var l=ri();jo(e,a,s,l)}function jo(e,a,s,l){var h={lane:l,revertLane:0,action:s,hasEagerState:!1,eagerState:null,next:null};if(Lu(e))r0(a,h);else{var g=e.alternate;if(e.lanes===0&&(g===null||g.lanes===0)&&(g=a.lastRenderedReducer,g!==null))try{var M=a.lastRenderedState,A=g(M,s);if(h.hasEagerState=!0,h.eagerState=A,ti(A,M))return mu(e,a,h,0),Ge===null&&pu(),!1}catch{}finally{}if(s=Of(e,a,h,l),s!==null)return si(s,e,l),s0(s,a,l),!0}return!1}function gh(e,a,s,l){if(l={lane:2,revertLane:jh(),action:l,hasEagerState:!1,eagerState:null,next:null},Lu(e)){if(a)throw Error(r(479))}else a=Of(e,s,l,2),a!==null&&si(a,e,2)}function Lu(e){var a=e.alternate;return e===ge||a!==null&&a===ge}function r0(e,a){Ss=Au=!0;var s=e.pending;s===null?a.next=a:(a.next=s.next,s.next=a),e.pending=a}function s0(e,a,s){if((s&4194048)!==0){var l=a.lanes;l&=e.pendingLanes,s|=l,a.lanes=s,Ht(e,s)}}var Pu={readContext:Nn,use:Cu,useCallback:sn,useContext:sn,useEffect:sn,useImperativeHandle:sn,useLayoutEffect:sn,useInsertionEffect:sn,useMemo:sn,useReducer:sn,useRef:sn,useState:sn,useDebugValue:sn,useDeferredValue:sn,useTransition:sn,useSyncExternalStore:sn,useId:sn,useHostTransitionStatus:sn,useFormState:sn,useActionState:sn,useOptimistic:sn,useMemoCache:sn,useCacheRefresh:sn},o0={readContext:Nn,use:Cu,useCallback:function(e,a){return qn().memoizedState=[e,a===void 0?null:a],e},useContext:Nn,useEffect:Xv,useImperativeHandle:function(e,a,s){s=s!=null?s.concat([e]):null,Uu(4194308,4,jv.bind(null,a,e),s)},useLayoutEffect:function(e,a){return Uu(4194308,4,e,a)},useInsertionEffect:function(e,a){Uu(4,2,e,a)},useMemo:function(e,a){var s=qn();a=a===void 0?null:a;var l=e();if(Dr){lt(!0);try{e()}finally{lt(!1)}}return s.memoizedState=[l,a],l},useReducer:function(e,a,s){var l=qn();if(s!==void 0){var h=s(a);if(Dr){lt(!0);try{s(a)}finally{lt(!1)}}}else h=a;return l.memoizedState=l.baseState=h,e={pending:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:h},l.queue=e,e=e.dispatch=ab.bind(null,ge,e),[l.memoizedState,e]},useRef:function(e){var a=qn();return e={current:e},a.memoizedState=e},useState:function(e){e=ch(e);var a=e.queue,s=a0.bind(null,ge,a);return a.dispatch=s,[e.memoizedState,s]},useDebugValue:hh,useDeferredValue:function(e,a){var s=qn();return dh(s,e,a)},useTransition:function(){var e=ch(!1);return e=Jv.bind(null,ge,e.queue,!0,!1),qn().memoizedState=e,[!1,e]},useSyncExternalStore:function(e,a,s){var l=ge,h=qn();if(Re){if(s===void 0)throw Error(r(407));s=s()}else{if(s=a(),Ge===null)throw Error(r(349));(Me&124)!==0||Cv(l,a,s)}h.memoizedState=s;var g={value:s,getSnapshot:a};return h.queue=g,Xv(Dv.bind(null,l,g,e),[e]),l.flags|=2048,Es(9,Du(),wv.bind(null,l,g,s,a),null),s},useId:function(){var e=qn(),a=Ge.identifierPrefix;if(Re){var s=ra,l=aa;s=(l&~(1<<32-Bt(l)-1)).toString(32)+s,a="«"+a+"R"+s,s=Ru++,0<s&&(a+="H"+s.toString(32)),a+="»"}else s=$T++,a="«"+a+"r"+s.toString(32)+"»";return e.memoizedState=a},useHostTransitionStatus:mh,useFormState:zv,useActionState:zv,useOptimistic:function(e){var a=qn();a.memoizedState=a.baseState=e;var s={pending:null,lanes:0,dispatch:null,lastRenderedReducer:null,lastRenderedState:null};return a.queue=s,a=gh.bind(null,ge,!0,s),s.dispatch=a,[e,a]},useMemoCache:oh,useCacheRefresh:function(){return qn().memoizedState=ib.bind(null,ge)}},l0={readContext:Nn,use:Cu,useCallback:Zv,useContext:Nn,useEffect:Wv,useImperativeHandle:Kv,useInsertionEffect:qv,useLayoutEffect:Yv,useMemo:Qv,useReducer:wu,useRef:kv,useState:function(){return wu(la)},useDebugValue:hh,useDeferredValue:function(e,a){var s=hn();return $v(s,Ne.memoizedState,e,a)},useTransition:function(){var e=wu(la)[0],a=hn().memoizedState;return[typeof e=="boolean"?e:qo(e),a]},useSyncExternalStore:Rv,useId:n0,useHostTransitionStatus:mh,useFormState:Vv,useActionState:Vv,useOptimistic:function(e,a){var s=hn();return Pv(s,Ne,e,a)},useMemoCache:oh,useCacheRefresh:i0},rb={readContext:Nn,use:Cu,useCallback:Zv,useContext:Nn,useEffect:Wv,useImperativeHandle:Kv,useInsertionEffect:qv,useLayoutEffect:Yv,useMemo:Qv,useReducer:uh,useRef:kv,useState:function(){return uh(la)},useDebugValue:hh,useDeferredValue:function(e,a){var s=hn();return Ne===null?dh(s,e,a):$v(s,Ne.memoizedState,e,a)},useTransition:function(){var e=uh(la)[0],a=hn().memoizedState;return[typeof e=="boolean"?e:qo(e),a]},useSyncExternalStore:Rv,useId:n0,useHostTransitionStatus:mh,useFormState:Gv,useActionState:Gv,useOptimistic:function(e,a){var s=hn();return Ne!==null?Pv(s,Ne,e,a):(s.baseState=e,[e,s.queue.dispatch])},useMemoCache:oh,useCacheRefresh:i0},Ts=null,Ko=0;function Nu(e){var a=Ko;return Ko+=1,Ts===null&&(Ts=[]),yv(Ts,e,a)}function Zo(e,a){a=a.props.ref,e.ref=a!==void 0?a:null}function Ou(e,a){throw a.$$typeof===v?Error(r(525)):(e=Object.prototype.toString.call(a),Error(r(31,e==="[object Object]"?"object with keys {"+Object.keys(a).join(", ")+"}":e)))}function u0(e){var a=e._init;return a(e._payload)}function c0(e){function a(j,k){if(e){var Z=j.deletions;Z===null?(j.deletions=[k],j.flags|=16):Z.push(k)}}function s(j,k){if(!e)return null;for(;k!==null;)a(j,k),k=k.sibling;return null}function l(j){for(var k=new Map;j!==null;)j.key!==null?k.set(j.key,j):k.set(j.index,j),j=j.sibling;return k}function h(j,k){return j=ia(j,k),j.index=0,j.sibling=null,j}function g(j,k,Z){return j.index=Z,e?(Z=j.alternate,Z!==null?(Z=Z.index,Z<k?(j.flags|=67108866,k):Z):(j.flags|=67108866,k)):(j.flags|=1048576,k)}function M(j){return e&&j.alternate===null&&(j.flags|=67108866),j}function A(j,k,Z,dt){return k===null||k.tag!==6?(k=Ff(Z,j.mode,dt),k.return=j,k):(k=h(k,Z),k.return=j,k)}function B(j,k,Z,dt){var zt=Z.type;return zt===E?ht(j,k,Z.props.children,dt,Z.key):k!==null&&(k.elementType===zt||typeof zt=="object"&&zt!==null&&zt.$$typeof===H&&u0(zt)===k.type)?(k=h(k,Z.props),Zo(k,Z),k.return=j,k):(k=vu(Z.type,Z.key,Z.props,null,j.mode,dt),Zo(k,Z),k.return=j,k)}function $(j,k,Z,dt){return k===null||k.tag!==4||k.stateNode.containerInfo!==Z.containerInfo||k.stateNode.implementation!==Z.implementation?(k=If(Z,j.mode,dt),k.return=j,k):(k=h(k,Z.children||[]),k.return=j,k)}function ht(j,k,Z,dt,zt){return k===null||k.tag!==7?(k=Mr(Z,j.mode,dt,zt),k.return=j,k):(k=h(k,Z),k.return=j,k)}function gt(j,k,Z){if(typeof k=="string"&&k!==""||typeof k=="number"||typeof k=="bigint")return k=Ff(""+k,j.mode,Z),k.return=j,k;if(typeof k=="object"&&k!==null){switch(k.$$typeof){case _:return Z=vu(k.type,k.key,k.props,null,j.mode,Z),Zo(Z,k),Z.return=j,Z;case x:return k=If(k,j.mode,Z),k.return=j,k;case H:var dt=k._init;return k=dt(k._payload),gt(j,k,Z)}if(ut(k)||nt(k))return k=Mr(k,j.mode,Z,null),k.return=j,k;if(typeof k.then=="function")return gt(j,Nu(k),Z);if(k.$$typeof===C)return gt(j,Su(j,k),Z);Ou(j,k)}return null}function it(j,k,Z,dt){var zt=k!==null?k.key:null;if(typeof Z=="string"&&Z!==""||typeof Z=="number"||typeof Z=="bigint")return zt!==null?null:A(j,k,""+Z,dt);if(typeof Z=="object"&&Z!==null){switch(Z.$$typeof){case _:return Z.key===zt?B(j,k,Z,dt):null;case x:return Z.key===zt?$(j,k,Z,dt):null;case H:return zt=Z._init,Z=zt(Z._payload),it(j,k,Z,dt)}if(ut(Z)||nt(Z))return zt!==null?null:ht(j,k,Z,dt,null);if(typeof Z.then=="function")return it(j,k,Nu(Z),dt);if(Z.$$typeof===C)return it(j,k,Su(j,Z),dt);Ou(j,Z)}return null}function at(j,k,Z,dt,zt){if(typeof dt=="string"&&dt!==""||typeof dt=="number"||typeof dt=="bigint")return j=j.get(Z)||null,A(k,j,""+dt,zt);if(typeof dt=="object"&&dt!==null){switch(dt.$$typeof){case _:return j=j.get(dt.key===null?Z:dt.key)||null,B(k,j,dt,zt);case x:return j=j.get(dt.key===null?Z:dt.key)||null,$(k,j,dt,zt);case H:var ve=dt._init;return dt=ve(dt._payload),at(j,k,Z,dt,zt)}if(ut(dt)||nt(dt))return j=j.get(Z)||null,ht(k,j,dt,zt,null);if(typeof dt.then=="function")return at(j,k,Z,Nu(dt),zt);if(dt.$$typeof===C)return at(j,k,Z,Su(k,dt),zt);Ou(k,dt)}return null}function ae(j,k,Z,dt){for(var zt=null,ve=null,Kt=k,ne=k=0,bn=null;Kt!==null&&ne<Z.length;ne++){Kt.index>ne?(bn=Kt,Kt=null):bn=Kt.sibling;var be=it(j,Kt,Z[ne],dt);if(be===null){Kt===null&&(Kt=bn);break}e&&Kt&&be.alternate===null&&a(j,Kt),k=g(be,k,ne),ve===null?zt=be:ve.sibling=be,ve=be,Kt=bn}if(ne===Z.length)return s(j,Kt),Re&&Tr(j,ne),zt;if(Kt===null){for(;ne<Z.length;ne++)Kt=gt(j,Z[ne],dt),Kt!==null&&(k=g(Kt,k,ne),ve===null?zt=Kt:ve.sibling=Kt,ve=Kt);return Re&&Tr(j,ne),zt}for(Kt=l(Kt);ne<Z.length;ne++)bn=at(Kt,j,ne,Z[ne],dt),bn!==null&&(e&&bn.alternate!==null&&Kt.delete(bn.key===null?ne:bn.key),k=g(bn,k,ne),ve===null?zt=bn:ve.sibling=bn,ve=bn);return e&&Kt.forEach(function(er){return a(j,er)}),Re&&Tr(j,ne),zt}function te(j,k,Z,dt){if(Z==null)throw Error(r(151));for(var zt=null,ve=null,Kt=k,ne=k=0,bn=null,be=Z.next();Kt!==null&&!be.done;ne++,be=Z.next()){Kt.index>ne?(bn=Kt,Kt=null):bn=Kt.sibling;var er=it(j,Kt,be.value,dt);if(er===null){Kt===null&&(Kt=bn);break}e&&Kt&&er.alternate===null&&a(j,Kt),k=g(er,k,ne),ve===null?zt=er:ve.sibling=er,ve=er,Kt=bn}if(be.done)return s(j,Kt),Re&&Tr(j,ne),zt;if(Kt===null){for(;!be.done;ne++,be=Z.next())be=gt(j,be.value,dt),be!==null&&(k=g(be,k,ne),ve===null?zt=be:ve.sibling=be,ve=be);return Re&&Tr(j,ne),zt}for(Kt=l(Kt);!be.done;ne++,be=Z.next())be=at(Kt,j,ne,be.value,dt),be!==null&&(e&&be.alternate!==null&&Kt.delete(be.key===null?ne:be.key),k=g(be,k,ne),ve===null?zt=be:ve.sibling=be,ve=be);return e&&Kt.forEach(function(sA){return a(j,sA)}),Re&&Tr(j,ne),zt}function Be(j,k,Z,dt){if(typeof Z=="object"&&Z!==null&&Z.type===E&&Z.key===null&&(Z=Z.props.children),typeof Z=="object"&&Z!==null){switch(Z.$$typeof){case _:t:{for(var zt=Z.key;k!==null;){if(k.key===zt){if(zt=Z.type,zt===E){if(k.tag===7){s(j,k.sibling),dt=h(k,Z.props.children),dt.return=j,j=dt;break t}}else if(k.elementType===zt||typeof zt=="object"&&zt!==null&&zt.$$typeof===H&&u0(zt)===k.type){s(j,k.sibling),dt=h(k,Z.props),Zo(dt,Z),dt.return=j,j=dt;break t}s(j,k);break}else a(j,k);k=k.sibling}Z.type===E?(dt=Mr(Z.props.children,j.mode,dt,Z.key),dt.return=j,j=dt):(dt=vu(Z.type,Z.key,Z.props,null,j.mode,dt),Zo(dt,Z),dt.return=j,j=dt)}return M(j);case x:t:{for(zt=Z.key;k!==null;){if(k.key===zt)if(k.tag===4&&k.stateNode.containerInfo===Z.containerInfo&&k.stateNode.implementation===Z.implementation){s(j,k.sibling),dt=h(k,Z.children||[]),dt.return=j,j=dt;break t}else{s(j,k);break}else a(j,k);k=k.sibling}dt=If(Z,j.mode,dt),dt.return=j,j=dt}return M(j);case H:return zt=Z._init,Z=zt(Z._payload),Be(j,k,Z,dt)}if(ut(Z))return ae(j,k,Z,dt);if(nt(Z)){if(zt=nt(Z),typeof zt!="function")throw Error(r(150));return Z=zt.call(Z),te(j,k,Z,dt)}if(typeof Z.then=="function")return Be(j,k,Nu(Z),dt);if(Z.$$typeof===C)return Be(j,k,Su(j,Z),dt);Ou(j,Z)}return typeof Z=="string"&&Z!==""||typeof Z=="number"||typeof Z=="bigint"?(Z=""+Z,k!==null&&k.tag===6?(s(j,k.sibling),dt=h(k,Z),dt.return=j,j=dt):(s(j,k),dt=Ff(Z,j.mode,dt),dt.return=j,j=dt),M(j)):s(j,k)}return function(j,k,Z,dt){try{Ko=0;var zt=Be(j,k,Z,dt);return Ts=null,zt}catch(Kt){if(Kt===Vo||Kt===Eu)throw Kt;var ve=ei(29,Kt,null,j.mode);return ve.lanes=dt,ve.return=j,ve}finally{}}}var bs=c0(!0),f0=c0(!1),mi=J(null),Gi=null;function Va(e){var a=e.alternate;St(_n,_n.current&1),St(mi,e),Gi===null&&(a===null||xs.current!==null||a.memoizedState!==null)&&(Gi=e)}function h0(e){if(e.tag===22){if(St(_n,_n.current),St(mi,e),Gi===null){var a=e.alternate;a!==null&&a.memoizedState!==null&&(Gi=e)}}else Ha()}function Ha(){St(_n,_n.current),St(mi,mi.current)}function ua(e){xt(mi),Gi===e&&(Gi=null),xt(_n)}var _n=J(0);function Bu(e){for(var a=e;a!==null;){if(a.tag===13){var s=a.memoizedState;if(s!==null&&(s=s.dehydrated,s===null||s.data==="$?"||sd(s)))return a}else if(a.tag===19&&a.memoizedProps.revealOrder!==void 0){if((a.flags&128)!==0)return a}else if(a.child!==null){a.child.return=a,a=a.child;continue}if(a===e)break;for(;a.sibling===null;){if(a.return===null||a.return===e)return null;a=a.return}a.sibling.return=a.return,a=a.sibling}return null}function vh(e,a,s,l){a=e.memoizedState,s=s(l,a),s=s==null?a:m({},a,s),e.memoizedState=s,e.lanes===0&&(e.updateQueue.baseState=s)}var _h={enqueueSetState:function(e,a,s){e=e._reactInternals;var l=ri(),h=Fa(l);h.payload=a,s!=null&&(h.callback=s),a=Ia(e,h,l),a!==null&&(si(a,e,l),Go(a,e,l))},enqueueReplaceState:function(e,a,s){e=e._reactInternals;var l=ri(),h=Fa(l);h.tag=1,h.payload=a,s!=null&&(h.callback=s),a=Ia(e,h,l),a!==null&&(si(a,e,l),Go(a,e,l))},enqueueForceUpdate:function(e,a){e=e._reactInternals;var s=ri(),l=Fa(s);l.tag=2,a!=null&&(l.callback=a),a=Ia(e,l,s),a!==null&&(si(a,e,s),Go(a,e,s))}};function d0(e,a,s,l,h,g,M){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(l,g,M):a.prototype&&a.prototype.isPureReactComponent?!Lo(s,l)||!Lo(h,g):!0}function p0(e,a,s,l){e=a.state,typeof a.componentWillReceiveProps=="function"&&a.componentWillReceiveProps(s,l),typeof a.UNSAFE_componentWillReceiveProps=="function"&&a.UNSAFE_componentWillReceiveProps(s,l),a.state!==e&&_h.enqueueReplaceState(a,a.state,null)}function Ur(e,a){var s=a;if("ref"in a){s={};for(var l in a)l!=="ref"&&(s[l]=a[l])}if(e=e.defaultProps){s===a&&(s=m({},s));for(var h in e)s[h]===void 0&&(s[h]=e[h])}return s}var Fu=typeof reportError=="function"?reportError:function(e){if(typeof window=="object"&&typeof window.ErrorEvent=="function"){var a=new window.ErrorEvent("error",{bubbles:!0,cancelable:!0,message:typeof e=="object"&&e!==null&&typeof e.message=="string"?String(e.message):String(e),error:e});if(!window.dispatchEvent(a))return}else if(typeof process=="object"&&typeof process.emit=="function"){process.emit("uncaughtException",e);return}console.error(e)};function m0(e){Fu(e)}function g0(e){console.error(e)}function v0(e){Fu(e)}function Iu(e,a){try{var s=e.onUncaughtError;s(a.value,{componentStack:a.stack})}catch(l){setTimeout(function(){throw l})}}function _0(e,a,s){try{var l=e.onCaughtError;l(s.value,{componentStack:s.stack,errorBoundary:a.tag===1?a.stateNode:null})}catch(h){setTimeout(function(){throw h})}}function yh(e,a,s){return s=Fa(s),s.tag=3,s.payload={element:null},s.callback=function(){Iu(e,a)},s}function y0(e){return e=Fa(e),e.tag=3,e}function x0(e,a,s,l){var h=s.type.getDerivedStateFromError;if(typeof h=="function"){var g=l.value;e.payload=function(){return h(g)},e.callback=function(){_0(a,s,l)}}var M=s.stateNode;M!==null&&typeof M.componentDidCatch=="function"&&(e.callback=function(){_0(a,s,l),typeof h!="function"&&(Ya===null?Ya=new Set([this]):Ya.add(this));var A=l.stack;this.componentDidCatch(l.value,{componentStack:A!==null?A:""})})}function sb(e,a,s,l,h){if(s.flags|=32768,l!==null&&typeof l=="object"&&typeof l.then=="function"){if(a=s.alternate,a!==null&&Fo(a,s,h,!0),s=mi.current,s!==null){switch(s.tag){case 13:return Gi===null?kh():s.alternate===null&&nn===0&&(nn=3),s.flags&=-257,s.flags|=65536,s.lanes=h,l===jf?s.flags|=16384:(a=s.updateQueue,a===null?s.updateQueue=new Set([l]):a.add(l),Wh(e,l,h)),!1;case 22:return s.flags|=65536,l===jf?s.flags|=16384:(a=s.updateQueue,a===null?(a={transitions:null,markerInstances:null,retryQueue:new Set([l])},s.updateQueue=a):(s=a.retryQueue,s===null?a.retryQueue=new Set([l]):s.add(l)),Wh(e,l,h)),!1}throw Error(r(435,s.tag))}return Wh(e,l,h),kh(),!1}if(Re)return a=mi.current,a!==null?((a.flags&65536)===0&&(a.flags|=256),a.flags|=65536,a.lanes=h,l!==Hf&&(e=Error(r(422),{cause:l}),Bo(fi(e,s)))):(l!==Hf&&(a=Error(r(423),{cause:l}),Bo(fi(a,s))),e=e.current.alternate,e.flags|=65536,h&=-h,e.lanes|=h,l=fi(l,s),h=yh(e.stateNode,l,h),Qf(e,h),nn!==4&&(nn=2)),!1;var g=Error(r(520),{cause:l});if(g=fi(g,s),il===null?il=[g]:il.push(g),nn!==4&&(nn=2),a===null)return!0;l=fi(l,s),s=a;do{switch(s.tag){case 3:return s.flags|=65536,e=h&-h,s.lanes|=e,e=yh(s.stateNode,l,e),Qf(s,e),!1;case 1:if(a=s.type,g=s.stateNode,(s.flags&128)===0&&(typeof a.getDerivedStateFromError=="function"||g!==null&&typeof g.componentDidCatch=="function"&&(Ya===null||!Ya.has(g))))return s.flags|=65536,h&=-h,s.lanes|=h,h=y0(h),x0(h,e,s,l),Qf(s,h),!1}s=s.return}while(s!==null);return!1}var S0=Error(r(461)),En=!1;function Cn(e,a,s,l){a.child=e===null?f0(a,null,s,l):bs(a,e.child,s,l)}function M0(e,a,s,l,h){s=s.render;var g=a.ref;if("ref"in l){var M={};for(var A in l)A!=="ref"&&(M[A]=l[A])}else M=l;return Cr(a),l=nh(e,a,s,M,g,h),A=ih(),e!==null&&!En?(ah(e,a,h),ca(e,a,h)):(Re&&A&&zf(a),a.flags|=1,Cn(e,a,l,h),a.child)}function E0(e,a,s,l,h){if(e===null){var g=s.type;return typeof g=="function"&&!Bf(g)&&g.defaultProps===void 0&&s.compare===null?(a.tag=15,a.type=g,T0(e,a,g,l,h)):(e=vu(s.type,null,l,a,a.mode,h),e.ref=a.ref,e.return=a,a.child=e)}if(g=e.child,!Rh(e,h)){var M=g.memoizedProps;if(s=s.compare,s=s!==null?s:Lo,s(M,l)&&e.ref===a.ref)return ca(e,a,h)}return a.flags|=1,e=ia(g,l),e.ref=a.ref,e.return=a,a.child=e}function T0(e,a,s,l,h){if(e!==null){var g=e.memoizedProps;if(Lo(g,l)&&e.ref===a.ref)if(En=!1,a.pendingProps=l=g,Rh(e,h))(e.flags&131072)!==0&&(En=!0);else return a.lanes=e.lanes,ca(e,a,h)}return xh(e,a,s,l,h)}function b0(e,a,s){var l=a.pendingProps,h=l.children,g=e!==null?e.memoizedState:null;if(l.mode==="hidden"){if((a.flags&128)!==0){if(l=g!==null?g.baseLanes|s:s,e!==null){for(h=a.child=e.child,g=0;h!==null;)g=g|h.lanes|h.childLanes,h=h.sibling;a.childLanes=g&~l}else a.childLanes=0,a.child=null;return A0(e,a,l,s)}if((s&536870912)!==0)a.memoizedState={baseLanes:0,cachePool:null},e!==null&&Mu(a,g!==null?g.cachePool:null),g!==null?Tv(a,g):Jf(),h0(a);else return a.lanes=a.childLanes=536870912,A0(e,a,g!==null?g.baseLanes|s:s,s)}else g!==null?(Mu(a,g.cachePool),Tv(a,g),Ha(),a.memoizedState=null):(e!==null&&Mu(a,null),Jf(),Ha());return Cn(e,a,h,s),a.child}function A0(e,a,s,l){var h=Yf();return h=h===null?null:{parent:vn._currentValue,pool:h},a.memoizedState={baseLanes:s,cachePool:h},e!==null&&Mu(a,null),Jf(),h0(a),e!==null&&Fo(e,a,l,!0),null}function zu(e,a){var s=a.ref;if(s===null)e!==null&&e.ref!==null&&(a.flags|=4194816);else{if(typeof s!="function"&&typeof s!="object")throw Error(r(284));(e===null||e.ref!==s)&&(a.flags|=4194816)}}function xh(e,a,s,l,h){return Cr(a),s=nh(e,a,s,l,void 0,h),l=ih(),e!==null&&!En?(ah(e,a,h),ca(e,a,h)):(Re&&l&&zf(a),a.flags|=1,Cn(e,a,s,h),a.child)}function R0(e,a,s,l,h,g){return Cr(a),a.updateQueue=null,s=Av(a,l,s,h),bv(e),l=ih(),e!==null&&!En?(ah(e,a,g),ca(e,a,g)):(Re&&l&&zf(a),a.flags|=1,Cn(e,a,s,g),a.child)}function C0(e,a,s,l,h){if(Cr(a),a.stateNode===null){var g=ms,M=s.contextType;typeof M=="object"&&M!==null&&(g=Nn(M)),g=new s(l,g),a.memoizedState=g.state!==null&&g.state!==void 0?g.state:null,g.updater=_h,a.stateNode=g,g._reactInternals=a,g=a.stateNode,g.props=l,g.state=a.memoizedState,g.refs={},Kf(a),M=s.contextType,g.context=typeof M=="object"&&M!==null?Nn(M):ms,g.state=a.memoizedState,M=s.getDerivedStateFromProps,typeof M=="function"&&(vh(a,s,M,l),g.state=a.memoizedState),typeof s.getDerivedStateFromProps=="function"||typeof g.getSnapshotBeforeUpdate=="function"||typeof g.UNSAFE_componentWillMount!="function"&&typeof g.componentWillMount!="function"||(M=g.state,typeof g.componentWillMount=="function"&&g.componentWillMount(),typeof g.UNSAFE_componentWillMount=="function"&&g.UNSAFE_componentWillMount(),M!==g.state&&_h.enqueueReplaceState(g,g.state,null),Xo(a,l,g,h),ko(),g.state=a.memoizedState),typeof g.componentDidMount=="function"&&(a.flags|=4194308),l=!0}else if(e===null){g=a.stateNode;var A=a.memoizedProps,B=Ur(s,A);g.props=B;var $=g.context,ht=s.contextType;M=ms,typeof ht=="object"&&ht!==null&&(M=Nn(ht));var gt=s.getDerivedStateFromProps;ht=typeof gt=="function"||typeof g.getSnapshotBeforeUpdate=="function",A=a.pendingProps!==A,ht||typeof g.UNSAFE_componentWillReceiveProps!="function"&&typeof g.componentWillReceiveProps!="function"||(A||$!==M)&&p0(a,g,l,M),Ba=!1;var it=a.memoizedState;g.state=it,Xo(a,l,g,h),ko(),$=a.memoizedState,A||it!==$||Ba?(typeof gt=="function"&&(vh(a,s,gt,l),$=a.memoizedState),(B=Ba||d0(a,s,B,l,it,$,M))?(ht||typeof g.UNSAFE_componentWillMount!="function"&&typeof g.componentWillMount!="function"||(typeof g.componentWillMount=="function"&&g.componentWillMount(),typeof g.UNSAFE_componentWillMount=="function"&&g.UNSAFE_componentWillMount()),typeof g.componentDidMount=="function"&&(a.flags|=4194308)):(typeof g.componentDidMount=="function"&&(a.flags|=4194308),a.memoizedProps=l,a.memoizedState=$),g.props=l,g.state=$,g.context=M,l=B):(typeof g.componentDidMount=="function"&&(a.flags|=4194308),l=!1)}else{g=a.stateNode,Zf(e,a),M=a.memoizedProps,ht=Ur(s,M),g.props=ht,gt=a.pendingProps,it=g.context,$=s.contextType,B=ms,typeof $=="object"&&$!==null&&(B=Nn($)),A=s.getDerivedStateFromProps,($=typeof A=="function"||typeof g.getSnapshotBeforeUpdate=="function")||typeof g.UNSAFE_componentWillReceiveProps!="function"&&typeof g.componentWillReceiveProps!="function"||(M!==gt||it!==B)&&p0(a,g,l,B),Ba=!1,it=a.memoizedState,g.state=it,Xo(a,l,g,h),ko();var at=a.memoizedState;M!==gt||it!==at||Ba||e!==null&&e.dependencies!==null&&xu(e.dependencies)?(typeof A=="function"&&(vh(a,s,A,l),at=a.memoizedState),(ht=Ba||d0(a,s,ht,l,it,at,B)||e!==null&&e.dependencies!==null&&xu(e.dependencies))?($||typeof g.UNSAFE_componentWillUpdate!="function"&&typeof g.componentWillUpdate!="function"||(typeof g.componentWillUpdate=="function"&&g.componentWillUpdate(l,at,B),typeof g.UNSAFE_componentWillUpdate=="function"&&g.UNSAFE_componentWillUpdate(l,at,B)),typeof g.componentDidUpdate=="function"&&(a.flags|=4),typeof g.getSnapshotBeforeUpdate=="function"&&(a.flags|=1024)):(typeof g.componentDidUpdate!="function"||M===e.memoizedProps&&it===e.memoizedState||(a.flags|=4),typeof g.getSnapshotBeforeUpdate!="function"||M===e.memoizedProps&&it===e.memoizedState||(a.flags|=1024),a.memoizedProps=l,a.memoizedState=at),g.props=l,g.state=at,g.context=B,l=ht):(typeof g.componentDidUpdate!="function"||M===e.memoizedProps&&it===e.memoizedState||(a.flags|=4),typeof g.getSnapshotBeforeUpdate!="function"||M===e.memoizedProps&&it===e.memoizedState||(a.flags|=1024),l=!1)}return g=l,zu(e,a),l=(a.flags&128)!==0,g||l?(g=a.stateNode,s=l&&typeof s.getDerivedStateFromError!="function"?null:g.render(),a.flags|=1,e!==null&&l?(a.child=bs(a,e.child,null,h),a.child=bs(a,null,s,h)):Cn(e,a,s,h),a.memoizedState=g.state,e=a.child):e=ca(e,a,h),e}function w0(e,a,s,l){return Oo(),a.flags|=256,Cn(e,a,s,l),a.child}var Sh={dehydrated:null,treeContext:null,retryLane:0,hydrationErrors:null};function Mh(e){return{baseLanes:e,cachePool:gv()}}function Eh(e,a,s){return e=e!==null?e.childLanes&~s:0,a&&(e|=gi),e}function D0(e,a,s){var l=a.pendingProps,h=!1,g=(a.flags&128)!==0,M;if((M=g)||(M=e!==null&&e.memoizedState===null?!1:(_n.current&2)!==0),M&&(h=!0,a.flags&=-129),M=(a.flags&32)!==0,a.flags&=-33,e===null){if(Re){if(h?Va(a):Ha(),Re){var A=en,B;if(B=A){t:{for(B=A,A=Hi;B.nodeType!==8;){if(!A){A=null;break t}if(B=Ci(B.nextSibling),B===null){A=null;break t}}A=B}A!==null?(a.memoizedState={dehydrated:A,treeContext:Er!==null?{id:aa,overflow:ra}:null,retryLane:536870912,hydrationErrors:null},B=ei(18,null,null,0),B.stateNode=A,B.return=a,a.child=B,Hn=a,en=null,B=!0):B=!1}B||Ar(a)}if(A=a.memoizedState,A!==null&&(A=A.dehydrated,A!==null))return sd(A)?a.lanes=32:a.lanes=536870912,null;ua(a)}return A=l.children,l=l.fallback,h?(Ha(),h=a.mode,A=Vu({mode:"hidden",children:A},h),l=Mr(l,h,s,null),A.return=a,l.return=a,A.sibling=l,a.child=A,h=a.child,h.memoizedState=Mh(s),h.childLanes=Eh(e,M,s),a.memoizedState=Sh,l):(Va(a),Th(a,A))}if(B=e.memoizedState,B!==null&&(A=B.dehydrated,A!==null)){if(g)a.flags&256?(Va(a),a.flags&=-257,a=bh(e,a,s)):a.memoizedState!==null?(Ha(),a.child=e.child,a.flags|=128,a=null):(Ha(),h=l.fallback,A=a.mode,l=Vu({mode:"visible",children:l.children},A),h=Mr(h,A,s,null),h.flags|=2,l.return=a,h.return=a,l.sibling=h,a.child=l,bs(a,e.child,null,s),l=a.child,l.memoizedState=Mh(s),l.childLanes=Eh(e,M,s),a.memoizedState=Sh,a=h);else if(Va(a),sd(A)){if(M=A.nextSibling&&A.nextSibling.dataset,M)var $=M.dgst;M=$,l=Error(r(419)),l.stack="",l.digest=M,Bo({value:l,source:null,stack:null}),a=bh(e,a,s)}else if(En||Fo(e,a,s,!1),M=(s&e.childLanes)!==0,En||M){if(M=Ge,M!==null&&(l=s&-s,l=(l&42)!==0?1:se(l),l=(l&(M.suspendedLanes|s))!==0?0:l,l!==0&&l!==B.retryLane))throw B.retryLane=l,ps(e,l),si(M,e,l),S0;A.data==="$?"||kh(),a=bh(e,a,s)}else A.data==="$?"?(a.flags|=192,a.child=e.child,a=null):(e=B.treeContext,en=Ci(A.nextSibling),Hn=a,Re=!0,br=null,Hi=!1,e!==null&&(di[pi++]=aa,di[pi++]=ra,di[pi++]=Er,aa=e.id,ra=e.overflow,Er=a),a=Th(a,l.children),a.flags|=4096);return a}return h?(Ha(),h=l.fallback,A=a.mode,B=e.child,$=B.sibling,l=ia(B,{mode:"hidden",children:l.children}),l.subtreeFlags=B.subtreeFlags&65011712,$!==null?h=ia($,h):(h=Mr(h,A,s,null),h.flags|=2),h.return=a,l.return=a,l.sibling=h,a.child=l,l=h,h=a.child,A=e.child.memoizedState,A===null?A=Mh(s):(B=A.cachePool,B!==null?($=vn._currentValue,B=B.parent!==$?{parent:$,pool:$}:B):B=gv(),A={baseLanes:A.baseLanes|s,cachePool:B}),h.memoizedState=A,h.childLanes=Eh(e,M,s),a.memoizedState=Sh,l):(Va(a),s=e.child,e=s.sibling,s=ia(s,{mode:"visible",children:l.children}),s.return=a,s.sibling=null,e!==null&&(M=a.deletions,M===null?(a.deletions=[e],a.flags|=16):M.push(e)),a.child=s,a.memoizedState=null,s)}function Th(e,a){return a=Vu({mode:"visible",children:a},e.mode),a.return=e,e.child=a}function Vu(e,a){return e=ei(22,e,null,a),e.lanes=0,e.stateNode={_visibility:1,_pendingMarkers:null,_retryCache:null,_transitions:null},e}function bh(e,a,s){return bs(a,e.child,null,s),e=Th(a,a.pendingProps.children),e.flags|=2,a.memoizedState=null,e}function U0(e,a,s){e.lanes|=a;var l=e.alternate;l!==null&&(l.lanes|=a),kf(e.return,a,s)}function Ah(e,a,s,l,h){var g=e.memoizedState;g===null?e.memoizedState={isBackwards:a,rendering:null,renderingStartTime:0,last:l,tail:s,tailMode:h}:(g.isBackwards=a,g.rendering=null,g.renderingStartTime=0,g.last=l,g.tail=s,g.tailMode=h)}function L0(e,a,s){var l=a.pendingProps,h=l.revealOrder,g=l.tail;if(Cn(e,a,l.children,s),l=_n.current,(l&2)!==0)l=l&1|2,a.flags|=128;else{if(e!==null&&(e.flags&128)!==0)t:for(e=a.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&U0(e,s,a);else if(e.tag===19)U0(e,s,a);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===a)break t;for(;e.sibling===null;){if(e.return===null||e.return===a)break t;e=e.return}e.sibling.return=e.return,e=e.sibling}l&=1}switch(St(_n,l),h){case"forwards":for(s=a.child,h=null;s!==null;)e=s.alternate,e!==null&&Bu(e)===null&&(h=s),s=s.sibling;s=h,s===null?(h=a.child,a.child=null):(h=s.sibling,s.sibling=null),Ah(a,!1,h,s,g);break;case"backwards":for(s=null,h=a.child,a.child=null;h!==null;){if(e=h.alternate,e!==null&&Bu(e)===null){a.child=h;break}e=h.sibling,h.sibling=s,s=h,h=e}Ah(a,!0,s,null,g);break;case"together":Ah(a,!1,null,null,void 0);break;default:a.memoizedState=null}return a.child}function ca(e,a,s){if(e!==null&&(a.dependencies=e.dependencies),qa|=a.lanes,(s&a.childLanes)===0)if(e!==null){if(Fo(e,a,s,!1),(s&a.childLanes)===0)return null}else return null;if(e!==null&&a.child!==e.child)throw Error(r(153));if(a.child!==null){for(e=a.child,s=ia(e,e.pendingProps),a.child=s,s.return=a;e.sibling!==null;)e=e.sibling,s=s.sibling=ia(e,e.pendingProps),s.return=a;s.sibling=null}return a.child}function Rh(e,a){return(e.lanes&a)!==0?!0:(e=e.dependencies,!!(e!==null&&xu(e)))}function ob(e,a,s){switch(a.tag){case 3:At(a,a.stateNode.containerInfo),Oa(a,vn,e.memoizedState.cache),Oo();break;case 27:case 5:Yt(a);break;case 4:At(a,a.stateNode.containerInfo);break;case 10:Oa(a,a.type,a.memoizedProps.value);break;case 13:var l=a.memoizedState;if(l!==null)return l.dehydrated!==null?(Va(a),a.flags|=128,null):(s&a.child.childLanes)!==0?D0(e,a,s):(Va(a),e=ca(e,a,s),e!==null?e.sibling:null);Va(a);break;case 19:var h=(e.flags&128)!==0;if(l=(s&a.childLanes)!==0,l||(Fo(e,a,s,!1),l=(s&a.childLanes)!==0),h){if(l)return L0(e,a,s);a.flags|=128}if(h=a.memoizedState,h!==null&&(h.rendering=null,h.tail=null,h.lastEffect=null),St(_n,_n.current),l)break;return null;case 22:case 23:return a.lanes=0,b0(e,a,s);case 24:Oa(a,vn,e.memoizedState.cache)}return ca(e,a,s)}function P0(e,a,s){if(e!==null)if(e.memoizedProps!==a.pendingProps)En=!0;else{if(!Rh(e,s)&&(a.flags&128)===0)return En=!1,ob(e,a,s);En=(e.flags&131072)!==0}else En=!1,Re&&(a.flags&1048576)!==0&&uv(a,yu,a.index);switch(a.lanes=0,a.tag){case 16:t:{e=a.pendingProps;var l=a.elementType,h=l._init;if(l=h(l._payload),a.type=l,typeof l=="function")Bf(l)?(e=Ur(l,e),a.tag=1,a=C0(null,a,l,e,s)):(a.tag=0,a=xh(null,a,l,e,s));else{if(l!=null){if(h=l.$$typeof,h===D){a.tag=11,a=M0(null,a,l,e,s);break t}else if(h===z){a.tag=14,a=E0(null,a,l,e,s);break t}}throw a=pt(l)||l,Error(r(306,a,""))}}return a;case 0:return xh(e,a,a.type,a.pendingProps,s);case 1:return l=a.type,h=Ur(l,a.pendingProps),C0(e,a,l,h,s);case 3:t:{if(At(a,a.stateNode.containerInfo),e===null)throw Error(r(387));l=a.pendingProps;var g=a.memoizedState;h=g.element,Zf(e,a),Xo(a,l,null,s);var M=a.memoizedState;if(l=M.cache,Oa(a,vn,l),l!==g.cache&&Xf(a,[vn],s,!0),ko(),l=M.element,g.isDehydrated)if(g={element:l,isDehydrated:!1,cache:M.cache},a.updateQueue.baseState=g,a.memoizedState=g,a.flags&256){a=w0(e,a,l,s);break t}else if(l!==h){h=fi(Error(r(424)),a),Bo(h),a=w0(e,a,l,s);break t}else{switch(e=a.stateNode.containerInfo,e.nodeType){case 9:e=e.body;break;default:e=e.nodeName==="HTML"?e.ownerDocument.body:e}for(en=Ci(e.firstChild),Hn=a,Re=!0,br=null,Hi=!0,s=f0(a,null,l,s),a.child=s;s;)s.flags=s.flags&-3|4096,s=s.sibling}else{if(Oo(),l===h){a=ca(e,a,s);break t}Cn(e,a,l,s)}a=a.child}return a;case 26:return zu(e,a),e===null?(s=F_(a.type,null,a.pendingProps,null))?a.memoizedState=s:Re||(s=a.type,e=a.pendingProps,l=tc(et.current).createElement(s),l[gn]=a,l[Je]=e,Dn(l,s,e),cn(l),a.stateNode=l):a.memoizedState=F_(a.type,e.memoizedProps,a.pendingProps,e.memoizedState),null;case 27:return Yt(a),e===null&&Re&&(l=a.stateNode=N_(a.type,a.pendingProps,et.current),Hn=a,Hi=!0,h=en,Za(a.type)?(od=h,en=Ci(l.firstChild)):en=h),Cn(e,a,a.pendingProps.children,s),zu(e,a),e===null&&(a.flags|=4194304),a.child;case 5:return e===null&&Re&&((h=l=en)&&(l=Ob(l,a.type,a.pendingProps,Hi),l!==null?(a.stateNode=l,Hn=a,en=Ci(l.firstChild),Hi=!1,h=!0):h=!1),h||Ar(a)),Yt(a),h=a.type,g=a.pendingProps,M=e!==null?e.memoizedProps:null,l=g.children,id(h,g)?l=null:M!==null&&id(h,M)&&(a.flags|=32),a.memoizedState!==null&&(h=nh(e,a,JT,null,null,s),hl._currentValue=h),zu(e,a),Cn(e,a,l,s),a.child;case 6:return e===null&&Re&&((e=s=en)&&(s=Bb(s,a.pendingProps,Hi),s!==null?(a.stateNode=s,Hn=a,en=null,e=!0):e=!1),e||Ar(a)),null;case 13:return D0(e,a,s);case 4:return At(a,a.stateNode.containerInfo),l=a.pendingProps,e===null?a.child=bs(a,null,l,s):Cn(e,a,l,s),a.child;case 11:return M0(e,a,a.type,a.pendingProps,s);case 7:return Cn(e,a,a.pendingProps,s),a.child;case 8:return Cn(e,a,a.pendingProps.children,s),a.child;case 12:return Cn(e,a,a.pendingProps.children,s),a.child;case 10:return l=a.pendingProps,Oa(a,a.type,l.value),Cn(e,a,l.children,s),a.child;case 9:return h=a.type._context,l=a.pendingProps.children,Cr(a),h=Nn(h),l=l(h),a.flags|=1,Cn(e,a,l,s),a.child;case 14:return E0(e,a,a.type,a.pendingProps,s);case 15:return T0(e,a,a.type,a.pendingProps,s);case 19:return L0(e,a,s);case 31:return l=a.pendingProps,s=a.mode,l={mode:l.mode,children:l.children},e===null?(s=Vu(l,s),s.ref=a.ref,a.child=s,s.return=a,a=s):(s=ia(e.child,l),s.ref=a.ref,a.child=s,s.return=a,a=s),a;case 22:return b0(e,a,s);case 24:return Cr(a),l=Nn(vn),e===null?(h=Yf(),h===null&&(h=Ge,g=Wf(),h.pooledCache=g,g.refCount++,g!==null&&(h.pooledCacheLanes|=s),h=g),a.memoizedState={parent:l,cache:h},Kf(a),Oa(a,vn,h)):((e.lanes&s)!==0&&(Zf(e,a),Xo(a,null,null,s),ko()),h=e.memoizedState,g=a.memoizedState,h.parent!==l?(h={parent:l,cache:l},a.memoizedState=h,a.lanes===0&&(a.memoizedState=a.updateQueue.baseState=h),Oa(a,vn,l)):(l=g.cache,Oa(a,vn,l),l!==h.cache&&Xf(a,[vn],s,!0))),Cn(e,a,a.pendingProps.children,s),a.child;case 29:throw a.pendingProps}throw Error(r(156,a.tag))}function fa(e){e.flags|=4}function N0(e,a){if(a.type!=="stylesheet"||(a.state.loading&4)!==0)e.flags&=-16777217;else if(e.flags|=16777216,!G_(a)){if(a=mi.current,a!==null&&((Me&4194048)===Me?Gi!==null:(Me&62914560)!==Me&&(Me&536870912)===0||a!==Gi))throw Ho=jf,vv;e.flags|=8192}}function Hu(e,a){a!==null&&(e.flags|=4),e.flags&16384&&(a=e.tag!==22?bt():536870912,e.lanes|=a,ws|=a)}function Qo(e,a){if(!Re)switch(e.tailMode){case"hidden":a=e.tail;for(var s=null;a!==null;)a.alternate!==null&&(s=a),a=a.sibling;s===null?e.tail=null:s.sibling=null;break;case"collapsed":s=e.tail;for(var l=null;s!==null;)s.alternate!==null&&(l=s),s=s.sibling;l===null?a||e.tail===null?e.tail=null:e.tail.sibling=null:l.sibling=null}}function Ze(e){var a=e.alternate!==null&&e.alternate.child===e.child,s=0,l=0;if(a)for(var h=e.child;h!==null;)s|=h.lanes|h.childLanes,l|=h.subtreeFlags&65011712,l|=h.flags&65011712,h.return=e,h=h.sibling;else for(h=e.child;h!==null;)s|=h.lanes|h.childLanes,l|=h.subtreeFlags,l|=h.flags,h.return=e,h=h.sibling;return e.subtreeFlags|=l,e.childLanes=s,a}function lb(e,a,s){var l=a.pendingProps;switch(Vf(a),a.tag){case 31:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return Ze(a),null;case 1:return Ze(a),null;case 3:return s=a.stateNode,l=null,e!==null&&(l=e.memoizedState.cache),a.memoizedState.cache!==l&&(a.flags|=2048),oa(vn),Qt(),s.pendingContext&&(s.context=s.pendingContext,s.pendingContext=null),(e===null||e.child===null)&&(No(a)?fa(a):e===null||e.memoizedState.isDehydrated&&(a.flags&256)===0||(a.flags|=1024,hv())),Ze(a),null;case 26:return s=a.memoizedState,e===null?(fa(a),s!==null?(Ze(a),N0(a,s)):(Ze(a),a.flags&=-16777217)):s?s!==e.memoizedState?(fa(a),Ze(a),N0(a,s)):(Ze(a),a.flags&=-16777217):(e.memoizedProps!==l&&fa(a),Ze(a),a.flags&=-16777217),null;case 27:me(a),s=et.current;var h=a.type;if(e!==null&&a.stateNode!=null)e.memoizedProps!==l&&fa(a);else{if(!l){if(a.stateNode===null)throw Error(r(166));return Ze(a),null}e=Ut.current,No(a)?cv(a):(e=N_(h,l,s),a.stateNode=e,fa(a))}return Ze(a),null;case 5:if(me(a),s=a.type,e!==null&&a.stateNode!=null)e.memoizedProps!==l&&fa(a);else{if(!l){if(a.stateNode===null)throw Error(r(166));return Ze(a),null}if(e=Ut.current,No(a))cv(a);else{switch(h=tc(et.current),e){case 1:e=h.createElementNS("http://www.w3.org/2000/svg",s);break;case 2:e=h.createElementNS("http://www.w3.org/1998/Math/MathML",s);break;default:switch(s){case"svg":e=h.createElementNS("http://www.w3.org/2000/svg",s);break;case"math":e=h.createElementNS("http://www.w3.org/1998/Math/MathML",s);break;case"script":e=h.createElement("div"),e.innerHTML="<script><\/script>",e=e.removeChild(e.firstChild);break;case"select":e=typeof l.is=="string"?h.createElement("select",{is:l.is}):h.createElement("select"),l.multiple?e.multiple=!0:l.size&&(e.size=l.size);break;default:e=typeof l.is=="string"?h.createElement(s,{is:l.is}):h.createElement(s)}}e[gn]=a,e[Je]=l;t:for(h=a.child;h!==null;){if(h.tag===5||h.tag===6)e.appendChild(h.stateNode);else if(h.tag!==4&&h.tag!==27&&h.child!==null){h.child.return=h,h=h.child;continue}if(h===a)break t;for(;h.sibling===null;){if(h.return===null||h.return===a)break t;h=h.return}h.sibling.return=h.return,h=h.sibling}a.stateNode=e;t:switch(Dn(e,s,l),s){case"button":case"input":case"select":case"textarea":e=!!l.autoFocus;break t;case"img":e=!0;break t;default:e=!1}e&&fa(a)}}return Ze(a),a.flags&=-16777217,null;case 6:if(e&&a.stateNode!=null)e.memoizedProps!==l&&fa(a);else{if(typeof l!="string"&&a.stateNode===null)throw Error(r(166));if(e=et.current,No(a)){if(e=a.stateNode,s=a.memoizedProps,l=null,h=Hn,h!==null)switch(h.tag){case 27:case 5:l=h.memoizedProps}e[gn]=a,e=!!(e.nodeValue===s||l!==null&&l.suppressHydrationWarning===!0||R_(e.nodeValue,s)),e||Ar(a)}else e=tc(e).createTextNode(l),e[gn]=a,a.stateNode=e}return Ze(a),null;case 13:if(l=a.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(h=No(a),l!==null&&l.dehydrated!==null){if(e===null){if(!h)throw Error(r(318));if(h=a.memoizedState,h=h!==null?h.dehydrated:null,!h)throw Error(r(317));h[gn]=a}else Oo(),(a.flags&128)===0&&(a.memoizedState=null),a.flags|=4;Ze(a),h=!1}else h=hv(),e!==null&&e.memoizedState!==null&&(e.memoizedState.hydrationErrors=h),h=!0;if(!h)return a.flags&256?(ua(a),a):(ua(a),null)}if(ua(a),(a.flags&128)!==0)return a.lanes=s,a;if(s=l!==null,e=e!==null&&e.memoizedState!==null,s){l=a.child,h=null,l.alternate!==null&&l.alternate.memoizedState!==null&&l.alternate.memoizedState.cachePool!==null&&(h=l.alternate.memoizedState.cachePool.pool);var g=null;l.memoizedState!==null&&l.memoizedState.cachePool!==null&&(g=l.memoizedState.cachePool.pool),g!==h&&(l.flags|=2048)}return s!==e&&s&&(a.child.flags|=8192),Hu(a,a.updateQueue),Ze(a),null;case 4:return Qt(),e===null&&$h(a.stateNode.containerInfo),Ze(a),null;case 10:return oa(a.type),Ze(a),null;case 19:if(xt(_n),h=a.memoizedState,h===null)return Ze(a),null;if(l=(a.flags&128)!==0,g=h.rendering,g===null)if(l)Qo(h,!1);else{if(nn!==0||e!==null&&(e.flags&128)!==0)for(e=a.child;e!==null;){if(g=Bu(e),g!==null){for(a.flags|=128,Qo(h,!1),e=g.updateQueue,a.updateQueue=e,Hu(a,e),a.subtreeFlags=0,e=s,s=a.child;s!==null;)lv(s,e),s=s.sibling;return St(_n,_n.current&1|2),a.child}e=e.sibling}h.tail!==null&&Ot()>Xu&&(a.flags|=128,l=!0,Qo(h,!1),a.lanes=4194304)}else{if(!l)if(e=Bu(g),e!==null){if(a.flags|=128,l=!0,e=e.updateQueue,a.updateQueue=e,Hu(a,e),Qo(h,!0),h.tail===null&&h.tailMode==="hidden"&&!g.alternate&&!Re)return Ze(a),null}else 2*Ot()-h.renderingStartTime>Xu&&s!==536870912&&(a.flags|=128,l=!0,Qo(h,!1),a.lanes=4194304);h.isBackwards?(g.sibling=a.child,a.child=g):(e=h.last,e!==null?e.sibling=g:a.child=g,h.last=g)}return h.tail!==null?(a=h.tail,h.rendering=a,h.tail=a.sibling,h.renderingStartTime=Ot(),a.sibling=null,e=_n.current,St(_n,l?e&1|2:e&1),a):(Ze(a),null);case 22:case 23:return ua(a),th(),l=a.memoizedState!==null,e!==null?e.memoizedState!==null!==l&&(a.flags|=8192):l&&(a.flags|=8192),l?(s&536870912)!==0&&(a.flags&128)===0&&(Ze(a),a.subtreeFlags&6&&(a.flags|=8192)):Ze(a),s=a.updateQueue,s!==null&&Hu(a,s.retryQueue),s=null,e!==null&&e.memoizedState!==null&&e.memoizedState.cachePool!==null&&(s=e.memoizedState.cachePool.pool),l=null,a.memoizedState!==null&&a.memoizedState.cachePool!==null&&(l=a.memoizedState.cachePool.pool),l!==s&&(a.flags|=2048),e!==null&&xt(wr),null;case 24:return s=null,e!==null&&(s=e.memoizedState.cache),a.memoizedState.cache!==s&&(a.flags|=2048),oa(vn),Ze(a),null;case 25:return null;case 30:return null}throw Error(r(156,a.tag))}function ub(e,a){switch(Vf(a),a.tag){case 1:return e=a.flags,e&65536?(a.flags=e&-65537|128,a):null;case 3:return oa(vn),Qt(),e=a.flags,(e&65536)!==0&&(e&128)===0?(a.flags=e&-65537|128,a):null;case 26:case 27:case 5:return me(a),null;case 13:if(ua(a),e=a.memoizedState,e!==null&&e.dehydrated!==null){if(a.alternate===null)throw Error(r(340));Oo()}return e=a.flags,e&65536?(a.flags=e&-65537|128,a):null;case 19:return xt(_n),null;case 4:return Qt(),null;case 10:return oa(a.type),null;case 22:case 23:return ua(a),th(),e!==null&&xt(wr),e=a.flags,e&65536?(a.flags=e&-65537|128,a):null;case 24:return oa(vn),null;case 25:return null;default:return null}}function O0(e,a){switch(Vf(a),a.tag){case 3:oa(vn),Qt();break;case 26:case 27:case 5:me(a);break;case 4:Qt();break;case 13:ua(a);break;case 19:xt(_n);break;case 10:oa(a.type);break;case 22:case 23:ua(a),th(),e!==null&&xt(wr);break;case 24:oa(vn)}}function $o(e,a){try{var s=a.updateQueue,l=s!==null?s.lastEffect:null;if(l!==null){var h=l.next;s=h;do{if((s.tag&e)===e){l=void 0;var g=s.create,M=s.inst;l=g(),M.destroy=l}s=s.next}while(s!==h)}}catch(A){Ve(a,a.return,A)}}function Ga(e,a,s){try{var l=a.updateQueue,h=l!==null?l.lastEffect:null;if(h!==null){var g=h.next;l=g;do{if((l.tag&e)===e){var M=l.inst,A=M.destroy;if(A!==void 0){M.destroy=void 0,h=a;var B=s,$=A;try{$()}catch(ht){Ve(h,B,ht)}}}l=l.next}while(l!==g)}}catch(ht){Ve(a,a.return,ht)}}function B0(e){var a=e.updateQueue;if(a!==null){var s=e.stateNode;try{Ev(a,s)}catch(l){Ve(e,e.return,l)}}}function F0(e,a,s){s.props=Ur(e.type,e.memoizedProps),s.state=e.memoizedState;try{s.componentWillUnmount()}catch(l){Ve(e,a,l)}}function Jo(e,a){try{var s=e.ref;if(s!==null){switch(e.tag){case 26:case 27:case 5:var l=e.stateNode;break;case 30:l=e.stateNode;break;default:l=e.stateNode}typeof s=="function"?e.refCleanup=s(l):s.current=l}}catch(h){Ve(e,a,h)}}function ki(e,a){var s=e.ref,l=e.refCleanup;if(s!==null)if(typeof l=="function")try{l()}catch(h){Ve(e,a,h)}finally{e.refCleanup=null,e=e.alternate,e!=null&&(e.refCleanup=null)}else if(typeof s=="function")try{s(null)}catch(h){Ve(e,a,h)}else s.current=null}function I0(e){var a=e.type,s=e.memoizedProps,l=e.stateNode;try{t:switch(a){case"button":case"input":case"select":case"textarea":s.autoFocus&&l.focus();break t;case"img":s.src?l.src=s.src:s.srcSet&&(l.srcset=s.srcSet)}}catch(h){Ve(e,e.return,h)}}function Ch(e,a,s){try{var l=e.stateNode;Db(l,e.type,s,a),l[Je]=a}catch(h){Ve(e,e.return,h)}}function z0(e){return e.tag===5||e.tag===3||e.tag===26||e.tag===27&&Za(e.type)||e.tag===4}function wh(e){t:for(;;){for(;e.sibling===null;){if(e.return===null||z0(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.tag===27&&Za(e.type)||e.flags&2||e.child===null||e.tag===4)continue t;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function Dh(e,a,s){var l=e.tag;if(l===5||l===6)e=e.stateNode,a?(s.nodeType===9?s.body:s.nodeName==="HTML"?s.ownerDocument.body:s).insertBefore(e,a):(a=s.nodeType===9?s.body:s.nodeName==="HTML"?s.ownerDocument.body:s,a.appendChild(e),s=s._reactRootContainer,s!=null||a.onclick!==null||(a.onclick=Ju));else if(l!==4&&(l===27&&Za(e.type)&&(s=e.stateNode,a=null),e=e.child,e!==null))for(Dh(e,a,s),e=e.sibling;e!==null;)Dh(e,a,s),e=e.sibling}function Gu(e,a,s){var l=e.tag;if(l===5||l===6)e=e.stateNode,a?s.insertBefore(e,a):s.appendChild(e);else if(l!==4&&(l===27&&Za(e.type)&&(s=e.stateNode),e=e.child,e!==null))for(Gu(e,a,s),e=e.sibling;e!==null;)Gu(e,a,s),e=e.sibling}function V0(e){var a=e.stateNode,s=e.memoizedProps;try{for(var l=e.type,h=a.attributes;h.length;)a.removeAttributeNode(h[0]);Dn(a,l,s),a[gn]=e,a[Je]=s}catch(g){Ve(e,e.return,g)}}var ha=!1,on=!1,Uh=!1,H0=typeof WeakSet=="function"?WeakSet:Set,Tn=null;function cb(e,a){if(e=e.containerInfo,ed=sc,e=$g(e),wf(e)){if("selectionStart"in e)var s={start:e.selectionStart,end:e.selectionEnd};else t:{s=(s=e.ownerDocument)&&s.defaultView||window;var l=s.getSelection&&s.getSelection();if(l&&l.rangeCount!==0){s=l.anchorNode;var h=l.anchorOffset,g=l.focusNode;l=l.focusOffset;try{s.nodeType,g.nodeType}catch{s=null;break t}var M=0,A=-1,B=-1,$=0,ht=0,gt=e,it=null;e:for(;;){for(var at;gt!==s||h!==0&&gt.nodeType!==3||(A=M+h),gt!==g||l!==0&&gt.nodeType!==3||(B=M+l),gt.nodeType===3&&(M+=gt.nodeValue.length),(at=gt.firstChild)!==null;)it=gt,gt=at;for(;;){if(gt===e)break e;if(it===s&&++$===h&&(A=M),it===g&&++ht===l&&(B=M),(at=gt.nextSibling)!==null)break;gt=it,it=gt.parentNode}gt=at}s=A===-1||B===-1?null:{start:A,end:B}}else s=null}s=s||{start:0,end:0}}else s=null;for(nd={focusedElem:e,selectionRange:s},sc=!1,Tn=a;Tn!==null;)if(a=Tn,e=a.child,(a.subtreeFlags&1024)!==0&&e!==null)e.return=a,Tn=e;else for(;Tn!==null;){switch(a=Tn,g=a.alternate,e=a.flags,a.tag){case 0:break;case 11:case 15:break;case 1:if((e&1024)!==0&&g!==null){e=void 0,s=a,h=g.memoizedProps,g=g.memoizedState,l=s.stateNode;try{var ae=Ur(s.type,h,s.elementType===s.type);e=l.getSnapshotBeforeUpdate(ae,g),l.__reactInternalSnapshotBeforeUpdate=e}catch(te){Ve(s,s.return,te)}}break;case 3:if((e&1024)!==0){if(e=a.stateNode.containerInfo,s=e.nodeType,s===9)rd(e);else if(s===1)switch(e.nodeName){case"HEAD":case"HTML":case"BODY":rd(e);break;default:e.textContent=""}}break;case 5:case 26:case 27:case 6:case 4:case 17:break;default:if((e&1024)!==0)throw Error(r(163))}if(e=a.sibling,e!==null){e.return=a.return,Tn=e;break}Tn=a.return}}function G0(e,a,s){var l=s.flags;switch(s.tag){case 0:case 11:case 15:ka(e,s),l&4&&$o(5,s);break;case 1:if(ka(e,s),l&4)if(e=s.stateNode,a===null)try{e.componentDidMount()}catch(M){Ve(s,s.return,M)}else{var h=Ur(s.type,a.memoizedProps);a=a.memoizedState;try{e.componentDidUpdate(h,a,e.__reactInternalSnapshotBeforeUpdate)}catch(M){Ve(s,s.return,M)}}l&64&&B0(s),l&512&&Jo(s,s.return);break;case 3:if(ka(e,s),l&64&&(e=s.updateQueue,e!==null)){if(a=null,s.child!==null)switch(s.child.tag){case 27:case 5:a=s.child.stateNode;break;case 1:a=s.child.stateNode}try{Ev(e,a)}catch(M){Ve(s,s.return,M)}}break;case 27:a===null&&l&4&&V0(s);case 26:case 5:ka(e,s),a===null&&l&4&&I0(s),l&512&&Jo(s,s.return);break;case 12:ka(e,s);break;case 13:ka(e,s),l&4&&W0(e,s),l&64&&(e=s.memoizedState,e!==null&&(e=e.dehydrated,e!==null&&(s=yb.bind(null,s),Fb(e,s))));break;case 22:if(l=s.memoizedState!==null||ha,!l){a=a!==null&&a.memoizedState!==null||on,h=ha;var g=on;ha=l,(on=a)&&!g?Xa(e,s,(s.subtreeFlags&8772)!==0):ka(e,s),ha=h,on=g}break;case 30:break;default:ka(e,s)}}function k0(e){var a=e.alternate;a!==null&&(e.alternate=null,k0(a)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(a=e.stateNode,a!==null&&ss(a)),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}var We=null,Yn=!1;function da(e,a,s){for(s=s.child;s!==null;)X0(e,a,s),s=s.sibling}function X0(e,a,s){if(mt&&typeof mt.onCommitFiberUnmount=="function")try{mt.onCommitFiberUnmount(ft,s)}catch{}switch(s.tag){case 26:on||ki(s,a),da(e,a,s),s.memoizedState?s.memoizedState.count--:s.stateNode&&(s=s.stateNode,s.parentNode.removeChild(s));break;case 27:on||ki(s,a);var l=We,h=Yn;Za(s.type)&&(We=s.stateNode,Yn=!1),da(e,a,s),ll(s.stateNode),We=l,Yn=h;break;case 5:on||ki(s,a);case 6:if(l=We,h=Yn,We=null,da(e,a,s),We=l,Yn=h,We!==null)if(Yn)try{(We.nodeType===9?We.body:We.nodeName==="HTML"?We.ownerDocument.body:We).removeChild(s.stateNode)}catch(g){Ve(s,a,g)}else try{We.removeChild(s.stateNode)}catch(g){Ve(s,a,g)}break;case 18:We!==null&&(Yn?(e=We,L_(e.nodeType===9?e.body:e.nodeName==="HTML"?e.ownerDocument.body:e,s.stateNode),gl(e)):L_(We,s.stateNode));break;case 4:l=We,h=Yn,We=s.stateNode.containerInfo,Yn=!0,da(e,a,s),We=l,Yn=h;break;case 0:case 11:case 14:case 15:on||Ga(2,s,a),on||Ga(4,s,a),da(e,a,s);break;case 1:on||(ki(s,a),l=s.stateNode,typeof l.componentWillUnmount=="function"&&F0(s,a,l)),da(e,a,s);break;case 21:da(e,a,s);break;case 22:on=(l=on)||s.memoizedState!==null,da(e,a,s),on=l;break;default:da(e,a,s)}}function W0(e,a){if(a.memoizedState===null&&(e=a.alternate,e!==null&&(e=e.memoizedState,e!==null&&(e=e.dehydrated,e!==null))))try{gl(e)}catch(s){Ve(a,a.return,s)}}function fb(e){switch(e.tag){case 13:case 19:var a=e.stateNode;return a===null&&(a=e.stateNode=new H0),a;case 22:return e=e.stateNode,a=e._retryCache,a===null&&(a=e._retryCache=new H0),a;default:throw Error(r(435,e.tag))}}function Lh(e,a){var s=fb(e);a.forEach(function(l){var h=xb.bind(null,e,l);s.has(l)||(s.add(l),l.then(h,h))})}function ni(e,a){var s=a.deletions;if(s!==null)for(var l=0;l<s.length;l++){var h=s[l],g=e,M=a,A=M;t:for(;A!==null;){switch(A.tag){case 27:if(Za(A.type)){We=A.stateNode,Yn=!1;break t}break;case 5:We=A.stateNode,Yn=!1;break t;case 3:case 4:We=A.stateNode.containerInfo,Yn=!0;break t}A=A.return}if(We===null)throw Error(r(160));X0(g,M,h),We=null,Yn=!1,g=h.alternate,g!==null&&(g.return=null),h.return=null}if(a.subtreeFlags&13878)for(a=a.child;a!==null;)q0(a,e),a=a.sibling}var Ri=null;function q0(e,a){var s=e.alternate,l=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:ni(a,e),ii(e),l&4&&(Ga(3,e,e.return),$o(3,e),Ga(5,e,e.return));break;case 1:ni(a,e),ii(e),l&512&&(on||s===null||ki(s,s.return)),l&64&&ha&&(e=e.updateQueue,e!==null&&(l=e.callbacks,l!==null&&(s=e.shared.hiddenCallbacks,e.shared.hiddenCallbacks=s===null?l:s.concat(l))));break;case 26:var h=Ri;if(ni(a,e),ii(e),l&512&&(on||s===null||ki(s,s.return)),l&4){var g=s!==null?s.memoizedState:null;if(l=e.memoizedState,s===null)if(l===null)if(e.stateNode===null){t:{l=e.type,s=e.memoizedProps,h=h.ownerDocument||h;e:switch(l){case"title":g=h.getElementsByTagName("title")[0],(!g||g[Vi]||g[gn]||g.namespaceURI==="http://www.w3.org/2000/svg"||g.hasAttribute("itemprop"))&&(g=h.createElement(l),h.head.insertBefore(g,h.querySelector("head > title"))),Dn(g,l,s),g[gn]=e,cn(g),l=g;break t;case"link":var M=V_("link","href",h).get(l+(s.href||""));if(M){for(var A=0;A<M.length;A++)if(g=M[A],g.getAttribute("href")===(s.href==null||s.href===""?null:s.href)&&g.getAttribute("rel")===(s.rel==null?null:s.rel)&&g.getAttribute("title")===(s.title==null?null:s.title)&&g.getAttribute("crossorigin")===(s.crossOrigin==null?null:s.crossOrigin)){M.splice(A,1);break e}}g=h.createElement(l),Dn(g,l,s),h.head.appendChild(g);break;case"meta":if(M=V_("meta","content",h).get(l+(s.content||""))){for(A=0;A<M.length;A++)if(g=M[A],g.getAttribute("content")===(s.content==null?null:""+s.content)&&g.getAttribute("name")===(s.name==null?null:s.name)&&g.getAttribute("property")===(s.property==null?null:s.property)&&g.getAttribute("http-equiv")===(s.httpEquiv==null?null:s.httpEquiv)&&g.getAttribute("charset")===(s.charSet==null?null:s.charSet)){M.splice(A,1);break e}}g=h.createElement(l),Dn(g,l,s),h.head.appendChild(g);break;default:throw Error(r(468,l))}g[gn]=e,cn(g),l=g}e.stateNode=l}else H_(h,e.type,e.stateNode);else e.stateNode=z_(h,l,e.memoizedProps);else g!==l?(g===null?s.stateNode!==null&&(s=s.stateNode,s.parentNode.removeChild(s)):g.count--,l===null?H_(h,e.type,e.stateNode):z_(h,l,e.memoizedProps)):l===null&&e.stateNode!==null&&Ch(e,e.memoizedProps,s.memoizedProps)}break;case 27:ni(a,e),ii(e),l&512&&(on||s===null||ki(s,s.return)),s!==null&&l&4&&Ch(e,e.memoizedProps,s.memoizedProps);break;case 5:if(ni(a,e),ii(e),l&512&&(on||s===null||ki(s,s.return)),e.flags&32){h=e.stateNode;try{Xn(h,"")}catch(at){Ve(e,e.return,at)}}l&4&&e.stateNode!=null&&(h=e.memoizedProps,Ch(e,h,s!==null?s.memoizedProps:h)),l&1024&&(Uh=!0);break;case 6:if(ni(a,e),ii(e),l&4){if(e.stateNode===null)throw Error(r(162));l=e.memoizedProps,s=e.stateNode;try{s.nodeValue=l}catch(at){Ve(e,e.return,at)}}break;case 3:if(ic=null,h=Ri,Ri=ec(a.containerInfo),ni(a,e),Ri=h,ii(e),l&4&&s!==null&&s.memoizedState.isDehydrated)try{gl(a.containerInfo)}catch(at){Ve(e,e.return,at)}Uh&&(Uh=!1,Y0(e));break;case 4:l=Ri,Ri=ec(e.stateNode.containerInfo),ni(a,e),ii(e),Ri=l;break;case 12:ni(a,e),ii(e);break;case 13:ni(a,e),ii(e),e.child.flags&8192&&e.memoizedState!==null!=(s!==null&&s.memoizedState!==null)&&(Ih=Ot()),l&4&&(l=e.updateQueue,l!==null&&(e.updateQueue=null,Lh(e,l)));break;case 22:h=e.memoizedState!==null;var B=s!==null&&s.memoizedState!==null,$=ha,ht=on;if(ha=$||h,on=ht||B,ni(a,e),on=ht,ha=$,ii(e),l&8192)t:for(a=e.stateNode,a._visibility=h?a._visibility&-2:a._visibility|1,h&&(s===null||B||ha||on||Lr(e)),s=null,a=e;;){if(a.tag===5||a.tag===26){if(s===null){B=s=a;try{if(g=B.stateNode,h)M=g.style,typeof M.setProperty=="function"?M.setProperty("display","none","important"):M.display="none";else{A=B.stateNode;var gt=B.memoizedProps.style,it=gt!=null&&gt.hasOwnProperty("display")?gt.display:null;A.style.display=it==null||typeof it=="boolean"?"":(""+it).trim()}}catch(at){Ve(B,B.return,at)}}}else if(a.tag===6){if(s===null){B=a;try{B.stateNode.nodeValue=h?"":B.memoizedProps}catch(at){Ve(B,B.return,at)}}}else if((a.tag!==22&&a.tag!==23||a.memoizedState===null||a===e)&&a.child!==null){a.child.return=a,a=a.child;continue}if(a===e)break t;for(;a.sibling===null;){if(a.return===null||a.return===e)break t;s===a&&(s=null),a=a.return}s===a&&(s=null),a.sibling.return=a.return,a=a.sibling}l&4&&(l=e.updateQueue,l!==null&&(s=l.retryQueue,s!==null&&(l.retryQueue=null,Lh(e,s))));break;case 19:ni(a,e),ii(e),l&4&&(l=e.updateQueue,l!==null&&(e.updateQueue=null,Lh(e,l)));break;case 30:break;case 21:break;default:ni(a,e),ii(e)}}function ii(e){var a=e.flags;if(a&2){try{for(var s,l=e.return;l!==null;){if(z0(l)){s=l;break}l=l.return}if(s==null)throw Error(r(160));switch(s.tag){case 27:var h=s.stateNode,g=wh(e);Gu(e,g,h);break;case 5:var M=s.stateNode;s.flags&32&&(Xn(M,""),s.flags&=-33);var A=wh(e);Gu(e,A,M);break;case 3:case 4:var B=s.stateNode.containerInfo,$=wh(e);Dh(e,$,B);break;default:throw Error(r(161))}}catch(ht){Ve(e,e.return,ht)}e.flags&=-3}a&4096&&(e.flags&=-4097)}function Y0(e){if(e.subtreeFlags&1024)for(e=e.child;e!==null;){var a=e;Y0(a),a.tag===5&&a.flags&1024&&a.stateNode.reset(),e=e.sibling}}function ka(e,a){if(a.subtreeFlags&8772)for(a=a.child;a!==null;)G0(e,a.alternate,a),a=a.sibling}function Lr(e){for(e=e.child;e!==null;){var a=e;switch(a.tag){case 0:case 11:case 14:case 15:Ga(4,a,a.return),Lr(a);break;case 1:ki(a,a.return);var s=a.stateNode;typeof s.componentWillUnmount=="function"&&F0(a,a.return,s),Lr(a);break;case 27:ll(a.stateNode);case 26:case 5:ki(a,a.return),Lr(a);break;case 22:a.memoizedState===null&&Lr(a);break;case 30:Lr(a);break;default:Lr(a)}e=e.sibling}}function Xa(e,a,s){for(s=s&&(a.subtreeFlags&8772)!==0,a=a.child;a!==null;){var l=a.alternate,h=e,g=a,M=g.flags;switch(g.tag){case 0:case 11:case 15:Xa(h,g,s),$o(4,g);break;case 1:if(Xa(h,g,s),l=g,h=l.stateNode,typeof h.componentDidMount=="function")try{h.componentDidMount()}catch($){Ve(l,l.return,$)}if(l=g,h=l.updateQueue,h!==null){var A=l.stateNode;try{var B=h.shared.hiddenCallbacks;if(B!==null)for(h.shared.hiddenCallbacks=null,h=0;h<B.length;h++)Mv(B[h],A)}catch($){Ve(l,l.return,$)}}s&&M&64&&B0(g),Jo(g,g.return);break;case 27:V0(g);case 26:case 5:Xa(h,g,s),s&&l===null&&M&4&&I0(g),Jo(g,g.return);break;case 12:Xa(h,g,s);break;case 13:Xa(h,g,s),s&&M&4&&W0(h,g);break;case 22:g.memoizedState===null&&Xa(h,g,s),Jo(g,g.return);break;case 30:break;default:Xa(h,g,s)}a=a.sibling}}function Ph(e,a){var s=null;e!==null&&e.memoizedState!==null&&e.memoizedState.cachePool!==null&&(s=e.memoizedState.cachePool.pool),e=null,a.memoizedState!==null&&a.memoizedState.cachePool!==null&&(e=a.memoizedState.cachePool.pool),e!==s&&(e!=null&&e.refCount++,s!=null&&Io(s))}function Nh(e,a){e=null,a.alternate!==null&&(e=a.alternate.memoizedState.cache),a=a.memoizedState.cache,a!==e&&(a.refCount++,e!=null&&Io(e))}function Xi(e,a,s,l){if(a.subtreeFlags&10256)for(a=a.child;a!==null;)j0(e,a,s,l),a=a.sibling}function j0(e,a,s,l){var h=a.flags;switch(a.tag){case 0:case 11:case 15:Xi(e,a,s,l),h&2048&&$o(9,a);break;case 1:Xi(e,a,s,l);break;case 3:Xi(e,a,s,l),h&2048&&(e=null,a.alternate!==null&&(e=a.alternate.memoizedState.cache),a=a.memoizedState.cache,a!==e&&(a.refCount++,e!=null&&Io(e)));break;case 12:if(h&2048){Xi(e,a,s,l),e=a.stateNode;try{var g=a.memoizedProps,M=g.id,A=g.onPostCommit;typeof A=="function"&&A(M,a.alternate===null?"mount":"update",e.passiveEffectDuration,-0)}catch(B){Ve(a,a.return,B)}}else Xi(e,a,s,l);break;case 13:Xi(e,a,s,l);break;case 23:break;case 22:g=a.stateNode,M=a.alternate,a.memoizedState!==null?g._visibility&2?Xi(e,a,s,l):tl(e,a):g._visibility&2?Xi(e,a,s,l):(g._visibility|=2,As(e,a,s,l,(a.subtreeFlags&10256)!==0)),h&2048&&Ph(M,a);break;case 24:Xi(e,a,s,l),h&2048&&Nh(a.alternate,a);break;default:Xi(e,a,s,l)}}function As(e,a,s,l,h){for(h=h&&(a.subtreeFlags&10256)!==0,a=a.child;a!==null;){var g=e,M=a,A=s,B=l,$=M.flags;switch(M.tag){case 0:case 11:case 15:As(g,M,A,B,h),$o(8,M);break;case 23:break;case 22:var ht=M.stateNode;M.memoizedState!==null?ht._visibility&2?As(g,M,A,B,h):tl(g,M):(ht._visibility|=2,As(g,M,A,B,h)),h&&$&2048&&Ph(M.alternate,M);break;case 24:As(g,M,A,B,h),h&&$&2048&&Nh(M.alternate,M);break;default:As(g,M,A,B,h)}a=a.sibling}}function tl(e,a){if(a.subtreeFlags&10256)for(a=a.child;a!==null;){var s=e,l=a,h=l.flags;switch(l.tag){case 22:tl(s,l),h&2048&&Ph(l.alternate,l);break;case 24:tl(s,l),h&2048&&Nh(l.alternate,l);break;default:tl(s,l)}a=a.sibling}}var el=8192;function Rs(e){if(e.subtreeFlags&el)for(e=e.child;e!==null;)K0(e),e=e.sibling}function K0(e){switch(e.tag){case 26:Rs(e),e.flags&el&&e.memoizedState!==null&&Zb(Ri,e.memoizedState,e.memoizedProps);break;case 5:Rs(e);break;case 3:case 4:var a=Ri;Ri=ec(e.stateNode.containerInfo),Rs(e),Ri=a;break;case 22:e.memoizedState===null&&(a=e.alternate,a!==null&&a.memoizedState!==null?(a=el,el=16777216,Rs(e),el=a):Rs(e));break;default:Rs(e)}}function Z0(e){var a=e.alternate;if(a!==null&&(e=a.child,e!==null)){a.child=null;do a=e.sibling,e.sibling=null,e=a;while(e!==null)}}function nl(e){var a=e.deletions;if((e.flags&16)!==0){if(a!==null)for(var s=0;s<a.length;s++){var l=a[s];Tn=l,$0(l,e)}Z0(e)}if(e.subtreeFlags&10256)for(e=e.child;e!==null;)Q0(e),e=e.sibling}function Q0(e){switch(e.tag){case 0:case 11:case 15:nl(e),e.flags&2048&&Ga(9,e,e.return);break;case 3:nl(e);break;case 12:nl(e);break;case 22:var a=e.stateNode;e.memoizedState!==null&&a._visibility&2&&(e.return===null||e.return.tag!==13)?(a._visibility&=-3,ku(e)):nl(e);break;default:nl(e)}}function ku(e){var a=e.deletions;if((e.flags&16)!==0){if(a!==null)for(var s=0;s<a.length;s++){var l=a[s];Tn=l,$0(l,e)}Z0(e)}for(e=e.child;e!==null;){switch(a=e,a.tag){case 0:case 11:case 15:Ga(8,a,a.return),ku(a);break;case 22:s=a.stateNode,s._visibility&2&&(s._visibility&=-3,ku(a));break;default:ku(a)}e=e.sibling}}function $0(e,a){for(;Tn!==null;){var s=Tn;switch(s.tag){case 0:case 11:case 15:Ga(8,s,a);break;case 23:case 22:if(s.memoizedState!==null&&s.memoizedState.cachePool!==null){var l=s.memoizedState.cachePool.pool;l!=null&&l.refCount++}break;case 24:Io(s.memoizedState.cache)}if(l=s.child,l!==null)l.return=s,Tn=l;else t:for(s=e;Tn!==null;){l=Tn;var h=l.sibling,g=l.return;if(k0(l),l===s){Tn=null;break t}if(h!==null){h.return=g,Tn=h;break t}Tn=g}}}var hb={getCacheForType:function(e){var a=Nn(vn),s=a.data.get(e);return s===void 0&&(s=e(),a.data.set(e,s)),s}},db=typeof WeakMap=="function"?WeakMap:Map,De=0,Ge=null,ye=null,Me=0,Ue=0,ai=null,Wa=!1,Cs=!1,Oh=!1,pa=0,nn=0,qa=0,Pr=0,Bh=0,gi=0,ws=0,il=null,jn=null,Fh=!1,Ih=0,Xu=1/0,Wu=null,Ya=null,wn=0,ja=null,Ds=null,Us=0,zh=0,Vh=null,J0=null,al=0,Hh=null;function ri(){if((De&2)!==0&&Me!==0)return Me&-Me;if(I.T!==null){var e=_s;return e!==0?e:jh()}return Ee()}function t_(){gi===0&&(gi=(Me&536870912)===0||Re?X():536870912);var e=mi.current;return e!==null&&(e.flags|=32),gi}function si(e,a,s){(e===Ge&&(Ue===2||Ue===9)||e.cancelPendingCommit!==null)&&(Ls(e,0),Ka(e,Me,gi,!1)),Ft(e,s),((De&2)===0||e!==Ge)&&(e===Ge&&((De&2)===0&&(Pr|=s),nn===4&&Ka(e,Me,gi,!1)),Wi(e))}function e_(e,a,s){if((De&6)!==0)throw Error(r(327));var l=!s&&(a&124)===0&&(a&e.expiredLanes)===0||wt(e,a),h=l?gb(e,a):Xh(e,a,!0),g=l;do{if(h===0){Cs&&!l&&Ka(e,a,0,!1);break}else{if(s=e.current.alternate,g&&!pb(s)){h=Xh(e,a,!1),g=!1;continue}if(h===2){if(g=a,e.errorRecoveryDisabledLanes&g)var M=0;else M=e.pendingLanes&-536870913,M=M!==0?M:M&536870912?536870912:0;if(M!==0){a=M;t:{var A=e;h=il;var B=A.current.memoizedState.isDehydrated;if(B&&(Ls(A,M).flags|=256),M=Xh(A,M,!1),M!==2){if(Oh&&!B){A.errorRecoveryDisabledLanes|=g,Pr|=g,h=4;break t}g=jn,jn=h,g!==null&&(jn===null?jn=g:jn.push.apply(jn,g))}h=M}if(g=!1,h!==2)continue}}if(h===1){Ls(e,0),Ka(e,a,0,!0);break}t:{switch(l=e,g=h,g){case 0:case 1:throw Error(r(345));case 4:if((a&4194048)!==a)break;case 6:Ka(l,a,gi,!Wa);break t;case 2:jn=null;break;case 3:case 5:break;default:throw Error(r(329))}if((a&62914560)===a&&(h=Ih+300-Ot(),10<h)){if(Ka(l,a,gi,!Wa),kt(l,0,!0)!==0)break t;l.timeoutHandle=D_(n_.bind(null,l,s,jn,Wu,Fh,a,gi,Pr,ws,Wa,g,2,-0,0),h);break t}n_(l,s,jn,Wu,Fh,a,gi,Pr,ws,Wa,g,0,-0,0)}}break}while(!0);Wi(e)}function n_(e,a,s,l,h,g,M,A,B,$,ht,gt,it,at){if(e.timeoutHandle=-1,gt=a.subtreeFlags,(gt&8192||(gt&16785408)===16785408)&&(fl={stylesheets:null,count:0,unsuspend:Kb},K0(a),gt=Qb(),gt!==null)){e.cancelPendingCommit=gt(u_.bind(null,e,a,g,s,l,h,M,A,B,ht,1,it,at)),Ka(e,g,M,!$);return}u_(e,a,g,s,l,h,M,A,B)}function pb(e){for(var a=e;;){var s=a.tag;if((s===0||s===11||s===15)&&a.flags&16384&&(s=a.updateQueue,s!==null&&(s=s.stores,s!==null)))for(var l=0;l<s.length;l++){var h=s[l],g=h.getSnapshot;h=h.value;try{if(!ti(g(),h))return!1}catch{return!1}}if(s=a.child,a.subtreeFlags&16384&&s!==null)s.return=a,a=s;else{if(a===e)break;for(;a.sibling===null;){if(a.return===null||a.return===e)return!0;a=a.return}a.sibling.return=a.return,a=a.sibling}}return!0}function Ka(e,a,s,l){a&=~Bh,a&=~Pr,e.suspendedLanes|=a,e.pingedLanes&=~a,l&&(e.warmLanes|=a),l=e.expirationTimes;for(var h=a;0<h;){var g=31-Bt(h),M=1<<g;l[g]=-1,h&=~M}s!==0&&_t(e,s,a)}function qu(){return(De&6)===0?(rl(0),!1):!0}function Gh(){if(ye!==null){if(Ue===0)var e=ye.return;else e=ye,sa=Rr=null,rh(e),Ts=null,Ko=0,e=ye;for(;e!==null;)O0(e.alternate,e),e=e.return;ye=null}}function Ls(e,a){var s=e.timeoutHandle;s!==-1&&(e.timeoutHandle=-1,Lb(s)),s=e.cancelPendingCommit,s!==null&&(e.cancelPendingCommit=null,s()),Gh(),Ge=e,ye=s=ia(e.current,null),Me=a,Ue=0,ai=null,Wa=!1,Cs=wt(e,a),Oh=!1,ws=gi=Bh=Pr=qa=nn=0,jn=il=null,Fh=!1,(a&8)!==0&&(a|=a&32);var l=e.entangledLanes;if(l!==0)for(e=e.entanglements,l&=a;0<l;){var h=31-Bt(l),g=1<<h;a|=e[h],l&=~g}return pa=a,pu(),s}function i_(e,a){ge=null,I.H=Pu,a===Vo||a===Eu?(a=xv(),Ue=3):a===vv?(a=xv(),Ue=4):Ue=a===S0?8:a!==null&&typeof a=="object"&&typeof a.then=="function"?6:1,ai=a,ye===null&&(nn=1,Iu(e,fi(a,e.current)))}function a_(){var e=I.H;return I.H=Pu,e===null?Pu:e}function r_(){var e=I.A;return I.A=hb,e}function kh(){nn=4,Wa||(Me&4194048)!==Me&&mi.current!==null||(Cs=!0),(qa&134217727)===0&&(Pr&134217727)===0||Ge===null||Ka(Ge,Me,gi,!1)}function Xh(e,a,s){var l=De;De|=2;var h=a_(),g=r_();(Ge!==e||Me!==a)&&(Wu=null,Ls(e,a)),a=!1;var M=nn;t:do try{if(Ue!==0&&ye!==null){var A=ye,B=ai;switch(Ue){case 8:Gh(),M=6;break t;case 3:case 2:case 9:case 6:mi.current===null&&(a=!0);var $=Ue;if(Ue=0,ai=null,Ps(e,A,B,$),s&&Cs){M=0;break t}break;default:$=Ue,Ue=0,ai=null,Ps(e,A,B,$)}}mb(),M=nn;break}catch(ht){i_(e,ht)}while(!0);return a&&e.shellSuspendCounter++,sa=Rr=null,De=l,I.H=h,I.A=g,ye===null&&(Ge=null,Me=0,pu()),M}function mb(){for(;ye!==null;)s_(ye)}function gb(e,a){var s=De;De|=2;var l=a_(),h=r_();Ge!==e||Me!==a?(Wu=null,Xu=Ot()+500,Ls(e,a)):Cs=wt(e,a);t:do try{if(Ue!==0&&ye!==null){a=ye;var g=ai;e:switch(Ue){case 1:Ue=0,ai=null,Ps(e,a,g,1);break;case 2:case 9:if(_v(g)){Ue=0,ai=null,o_(a);break}a=function(){Ue!==2&&Ue!==9||Ge!==e||(Ue=7),Wi(e)},g.then(a,a);break t;case 3:Ue=7;break t;case 4:Ue=5;break t;case 7:_v(g)?(Ue=0,ai=null,o_(a)):(Ue=0,ai=null,Ps(e,a,g,7));break;case 5:var M=null;switch(ye.tag){case 26:M=ye.memoizedState;case 5:case 27:var A=ye;if(!M||G_(M)){Ue=0,ai=null;var B=A.sibling;if(B!==null)ye=B;else{var $=A.return;$!==null?(ye=$,Yu($)):ye=null}break e}}Ue=0,ai=null,Ps(e,a,g,5);break;case 6:Ue=0,ai=null,Ps(e,a,g,6);break;case 8:Gh(),nn=6;break t;default:throw Error(r(462))}}vb();break}catch(ht){i_(e,ht)}while(!0);return sa=Rr=null,I.H=l,I.A=h,De=s,ye!==null?0:(Ge=null,Me=0,pu(),nn)}function vb(){for(;ye!==null&&!oe();)s_(ye)}function s_(e){var a=P0(e.alternate,e,pa);e.memoizedProps=e.pendingProps,a===null?Yu(e):ye=a}function o_(e){var a=e,s=a.alternate;switch(a.tag){case 15:case 0:a=R0(s,a,a.pendingProps,a.type,void 0,Me);break;case 11:a=R0(s,a,a.pendingProps,a.type.render,a.ref,Me);break;case 5:rh(a);default:O0(s,a),a=ye=lv(a,pa),a=P0(s,a,pa)}e.memoizedProps=e.pendingProps,a===null?Yu(e):ye=a}function Ps(e,a,s,l){sa=Rr=null,rh(a),Ts=null,Ko=0;var h=a.return;try{if(sb(e,h,a,s,Me)){nn=1,Iu(e,fi(s,e.current)),ye=null;return}}catch(g){if(h!==null)throw ye=h,g;nn=1,Iu(e,fi(s,e.current)),ye=null;return}a.flags&32768?(Re||l===1?e=!0:Cs||(Me&536870912)!==0?e=!1:(Wa=e=!0,(l===2||l===9||l===3||l===6)&&(l=mi.current,l!==null&&l.tag===13&&(l.flags|=16384))),l_(a,e)):Yu(a)}function Yu(e){var a=e;do{if((a.flags&32768)!==0){l_(a,Wa);return}e=a.return;var s=lb(a.alternate,a,pa);if(s!==null){ye=s;return}if(a=a.sibling,a!==null){ye=a;return}ye=a=e}while(a!==null);nn===0&&(nn=5)}function l_(e,a){do{var s=ub(e.alternate,e);if(s!==null){s.flags&=32767,ye=s;return}if(s=e.return,s!==null&&(s.flags|=32768,s.subtreeFlags=0,s.deletions=null),!a&&(e=e.sibling,e!==null)){ye=e;return}ye=e=s}while(e!==null);nn=6,ye=null}function u_(e,a,s,l,h,g,M,A,B){e.cancelPendingCommit=null;do ju();while(wn!==0);if((De&6)!==0)throw Error(r(327));if(a!==null){if(a===e.current)throw Error(r(177));if(g=a.lanes|a.childLanes,g|=Nf,Et(e,s,g,M,A,B),e===Ge&&(ye=Ge=null,Me=0),Ds=a,ja=e,Us=s,zh=g,Vh=h,J0=l,(a.subtreeFlags&10256)!==0||(a.flags&10256)!==0?(e.callbackNode=null,e.callbackPriority=0,Sb(je,function(){return p_(),null})):(e.callbackNode=null,e.callbackPriority=0),l=(a.flags&13878)!==0,(a.subtreeFlags&13878)!==0||l){l=I.T,I.T=null,h=q.p,q.p=2,M=De,De|=4;try{cb(e,a,s)}finally{De=M,q.p=h,I.T=l}}wn=1,c_(),f_(),h_()}}function c_(){if(wn===1){wn=0;var e=ja,a=Ds,s=(a.flags&13878)!==0;if((a.subtreeFlags&13878)!==0||s){s=I.T,I.T=null;var l=q.p;q.p=2;var h=De;De|=4;try{q0(a,e);var g=nd,M=$g(e.containerInfo),A=g.focusedElem,B=g.selectionRange;if(M!==A&&A&&A.ownerDocument&&Qg(A.ownerDocument.documentElement,A)){if(B!==null&&wf(A)){var $=B.start,ht=B.end;if(ht===void 0&&(ht=$),"selectionStart"in A)A.selectionStart=$,A.selectionEnd=Math.min(ht,A.value.length);else{var gt=A.ownerDocument||document,it=gt&&gt.defaultView||window;if(it.getSelection){var at=it.getSelection(),ae=A.textContent.length,te=Math.min(B.start,ae),Be=B.end===void 0?te:Math.min(B.end,ae);!at.extend&&te>Be&&(M=Be,Be=te,te=M);var j=Zg(A,te),k=Zg(A,Be);if(j&&k&&(at.rangeCount!==1||at.anchorNode!==j.node||at.anchorOffset!==j.offset||at.focusNode!==k.node||at.focusOffset!==k.offset)){var Z=gt.createRange();Z.setStart(j.node,j.offset),at.removeAllRanges(),te>Be?(at.addRange(Z),at.extend(k.node,k.offset)):(Z.setEnd(k.node,k.offset),at.addRange(Z))}}}}for(gt=[],at=A;at=at.parentNode;)at.nodeType===1&&gt.push({element:at,left:at.scrollLeft,top:at.scrollTop});for(typeof A.focus=="function"&&A.focus(),A=0;A<gt.length;A++){var dt=gt[A];dt.element.scrollLeft=dt.left,dt.element.scrollTop=dt.top}}sc=!!ed,nd=ed=null}finally{De=h,q.p=l,I.T=s}}e.current=a,wn=2}}function f_(){if(wn===2){wn=0;var e=ja,a=Ds,s=(a.flags&8772)!==0;if((a.subtreeFlags&8772)!==0||s){s=I.T,I.T=null;var l=q.p;q.p=2;var h=De;De|=4;try{G0(e,a.alternate,a)}finally{De=h,q.p=l,I.T=s}}wn=3}}function h_(){if(wn===4||wn===3){wn=0,ie();var e=ja,a=Ds,s=Us,l=J0;(a.subtreeFlags&10256)!==0||(a.flags&10256)!==0?wn=5:(wn=0,Ds=ja=null,d_(e,e.pendingLanes));var h=e.pendingLanes;if(h===0&&(Ya=null),Ce(s),a=a.stateNode,mt&&typeof mt.onCommitFiberRoot=="function")try{mt.onCommitFiberRoot(ft,a,void 0,(a.current.flags&128)===128)}catch{}if(l!==null){a=I.T,h=q.p,q.p=2,I.T=null;try{for(var g=e.onRecoverableError,M=0;M<l.length;M++){var A=l[M];g(A.value,{componentStack:A.stack})}}finally{I.T=a,q.p=h}}(Us&3)!==0&&ju(),Wi(e),h=e.pendingLanes,(s&4194090)!==0&&(h&42)!==0?e===Hh?al++:(al=0,Hh=e):al=0,rl(0)}}function d_(e,a){(e.pooledCacheLanes&=a)===0&&(a=e.pooledCache,a!=null&&(e.pooledCache=null,Io(a)))}function ju(e){return c_(),f_(),h_(),p_()}function p_(){if(wn!==5)return!1;var e=ja,a=zh;zh=0;var s=Ce(Us),l=I.T,h=q.p;try{q.p=32>s?32:s,I.T=null,s=Vh,Vh=null;var g=ja,M=Us;if(wn=0,Ds=ja=null,Us=0,(De&6)!==0)throw Error(r(331));var A=De;if(De|=4,Q0(g.current),j0(g,g.current,M,s),De=A,rl(0,!1),mt&&typeof mt.onPostCommitFiberRoot=="function")try{mt.onPostCommitFiberRoot(ft,g)}catch{}return!0}finally{q.p=h,I.T=l,d_(e,a)}}function m_(e,a,s){a=fi(s,a),a=yh(e.stateNode,a,2),e=Ia(e,a,2),e!==null&&(Ft(e,2),Wi(e))}function Ve(e,a,s){if(e.tag===3)m_(e,e,s);else for(;a!==null;){if(a.tag===3){m_(a,e,s);break}else if(a.tag===1){var l=a.stateNode;if(typeof a.type.getDerivedStateFromError=="function"||typeof l.componentDidCatch=="function"&&(Ya===null||!Ya.has(l))){e=fi(s,e),s=y0(2),l=Ia(a,s,2),l!==null&&(x0(s,l,a,e),Ft(l,2),Wi(l));break}}a=a.return}}function Wh(e,a,s){var l=e.pingCache;if(l===null){l=e.pingCache=new db;var h=new Set;l.set(a,h)}else h=l.get(a),h===void 0&&(h=new Set,l.set(a,h));h.has(s)||(Oh=!0,h.add(s),e=_b.bind(null,e,a,s),a.then(e,e))}function _b(e,a,s){var l=e.pingCache;l!==null&&l.delete(a),e.pingedLanes|=e.suspendedLanes&s,e.warmLanes&=~s,Ge===e&&(Me&s)===s&&(nn===4||nn===3&&(Me&62914560)===Me&&300>Ot()-Ih?(De&2)===0&&Ls(e,0):Bh|=s,ws===Me&&(ws=0)),Wi(e)}function g_(e,a){a===0&&(a=bt()),e=ps(e,a),e!==null&&(Ft(e,a),Wi(e))}function yb(e){var a=e.memoizedState,s=0;a!==null&&(s=a.retryLane),g_(e,s)}function xb(e,a){var s=0;switch(e.tag){case 13:var l=e.stateNode,h=e.memoizedState;h!==null&&(s=h.retryLane);break;case 19:l=e.stateNode;break;case 22:l=e.stateNode._retryCache;break;default:throw Error(r(314))}l!==null&&l.delete(a),g_(e,s)}function Sb(e,a){return V(e,a)}var Ku=null,Ns=null,qh=!1,Zu=!1,Yh=!1,Nr=0;function Wi(e){e!==Ns&&e.next===null&&(Ns===null?Ku=Ns=e:Ns=Ns.next=e),Zu=!0,qh||(qh=!0,Eb())}function rl(e,a){if(!Yh&&Zu){Yh=!0;do for(var s=!1,l=Ku;l!==null;){if(e!==0){var h=l.pendingLanes;if(h===0)var g=0;else{var M=l.suspendedLanes,A=l.pingedLanes;g=(1<<31-Bt(42|e)+1)-1,g&=h&~(M&~A),g=g&201326741?g&201326741|1:g?g|2:0}g!==0&&(s=!0,x_(l,g))}else g=Me,g=kt(l,l===Ge?g:0,l.cancelPendingCommit!==null||l.timeoutHandle!==-1),(g&3)===0||wt(l,g)||(s=!0,x_(l,g));l=l.next}while(s);Yh=!1}}function Mb(){v_()}function v_(){Zu=qh=!1;var e=0;Nr!==0&&(Ub()&&(e=Nr),Nr=0);for(var a=Ot(),s=null,l=Ku;l!==null;){var h=l.next,g=__(l,a);g===0?(l.next=null,s===null?Ku=h:s.next=h,h===null&&(Ns=s)):(s=l,(e!==0||(g&3)!==0)&&(Zu=!0)),l=h}rl(e)}function __(e,a){for(var s=e.suspendedLanes,l=e.pingedLanes,h=e.expirationTimes,g=e.pendingLanes&-62914561;0<g;){var M=31-Bt(g),A=1<<M,B=h[M];B===-1?((A&s)===0||(A&l)!==0)&&(h[M]=ue(A,a)):B<=a&&(e.expiredLanes|=A),g&=~A}if(a=Ge,s=Me,s=kt(e,e===a?s:0,e.cancelPendingCommit!==null||e.timeoutHandle!==-1),l=e.callbackNode,s===0||e===a&&(Ue===2||Ue===9)||e.cancelPendingCommit!==null)return l!==null&&l!==null&&Le(l),e.callbackNode=null,e.callbackPriority=0;if((s&3)===0||wt(e,s)){if(a=s&-s,a===e.callbackPriority)return a;switch(l!==null&&Le(l),Ce(s)){case 2:case 8:s=le;break;case 32:s=je;break;case 268435456:s=O;break;default:s=je}return l=y_.bind(null,e),s=V(s,l),e.callbackPriority=a,e.callbackNode=s,a}return l!==null&&l!==null&&Le(l),e.callbackPriority=2,e.callbackNode=null,2}function y_(e,a){if(wn!==0&&wn!==5)return e.callbackNode=null,e.callbackPriority=0,null;var s=e.callbackNode;if(ju()&&e.callbackNode!==s)return null;var l=Me;return l=kt(e,e===Ge?l:0,e.cancelPendingCommit!==null||e.timeoutHandle!==-1),l===0?null:(e_(e,l,a),__(e,Ot()),e.callbackNode!=null&&e.callbackNode===s?y_.bind(null,e):null)}function x_(e,a){if(ju())return null;e_(e,a,!0)}function Eb(){Pb(function(){(De&6)!==0?V(Gt,Mb):v_()})}function jh(){return Nr===0&&(Nr=X()),Nr}function S_(e){return e==null||typeof e=="symbol"||typeof e=="boolean"?null:typeof e=="function"?e:ou(""+e)}function M_(e,a){var s=a.ownerDocument.createElement("input");return s.name=a.name,s.value=a.value,e.id&&s.setAttribute("form",e.id),a.parentNode.insertBefore(s,a),e=new FormData(e),s.parentNode.removeChild(s),e}function Tb(e,a,s,l,h){if(a==="submit"&&s&&s.stateNode===h){var g=S_((h[Je]||null).action),M=l.submitter;M&&(a=(a=M[Je]||null)?S_(a.formAction):M.getAttribute("formAction"),a!==null&&(g=a,M=null));var A=new fu("action","action",null,l,h);e.push({event:A,listeners:[{instance:null,listener:function(){if(l.defaultPrevented){if(Nr!==0){var B=M?M_(h,M):new FormData(h);ph(s,{pending:!0,data:B,method:h.method,action:g},null,B)}}else typeof g=="function"&&(A.preventDefault(),B=M?M_(h,M):new FormData(h),ph(s,{pending:!0,data:B,method:h.method,action:g},g,B))},currentTarget:h}]})}}for(var Kh=0;Kh<Pf.length;Kh++){var Zh=Pf[Kh],bb=Zh.toLowerCase(),Ab=Zh[0].toUpperCase()+Zh.slice(1);Ai(bb,"on"+Ab)}Ai(ev,"onAnimationEnd"),Ai(nv,"onAnimationIteration"),Ai(iv,"onAnimationStart"),Ai("dblclick","onDoubleClick"),Ai("focusin","onFocus"),Ai("focusout","onBlur"),Ai(kT,"onTransitionRun"),Ai(XT,"onTransitionStart"),Ai(WT,"onTransitionCancel"),Ai(av,"onTransitionEnd"),Y("onMouseEnter",["mouseout","mouseover"]),Y("onMouseLeave",["mouseout","mouseover"]),Y("onPointerEnter",["pointerout","pointerover"]),Y("onPointerLeave",["pointerout","pointerover"]),R("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),R("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),R("onBeforeInput",["compositionend","keypress","textInput","paste"]),R("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),R("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),R("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var sl="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),Rb=new Set("beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(sl));function E_(e,a){a=(a&4)!==0;for(var s=0;s<e.length;s++){var l=e[s],h=l.event;l=l.listeners;t:{var g=void 0;if(a)for(var M=l.length-1;0<=M;M--){var A=l[M],B=A.instance,$=A.currentTarget;if(A=A.listener,B!==g&&h.isPropagationStopped())break t;g=A,h.currentTarget=$;try{g(h)}catch(ht){Fu(ht)}h.currentTarget=null,g=B}else for(M=0;M<l.length;M++){if(A=l[M],B=A.instance,$=A.currentTarget,A=A.listener,B!==g&&h.isPropagationStopped())break t;g=A,h.currentTarget=$;try{g(h)}catch(ht){Fu(ht)}h.currentTarget=null,g=B}}}}function xe(e,a){var s=a[as];s===void 0&&(s=a[as]=new Set);var l=e+"__bubble";s.has(l)||(T_(a,e,2,!1),s.add(l))}function Qh(e,a,s){var l=0;a&&(l|=4),T_(s,e,l,a)}var Qu="_reactListening"+Math.random().toString(36).slice(2);function $h(e){if(!e[Qu]){e[Qu]=!0,ru.forEach(function(s){s!=="selectionchange"&&(Rb.has(s)||Qh(s,!1,e),Qh(s,!0,e))});var a=e.nodeType===9?e:e.ownerDocument;a===null||a[Qu]||(a[Qu]=!0,Qh("selectionchange",!1,a))}}function T_(e,a,s,l){switch(j_(a)){case 2:var h=tA;break;case 8:h=eA;break;default:h=hd}s=h.bind(null,a,s,e),h=void 0,!xf||a!=="touchstart"&&a!=="touchmove"&&a!=="wheel"||(h=!0),l?h!==void 0?e.addEventListener(a,s,{capture:!0,passive:h}):e.addEventListener(a,s,!0):h!==void 0?e.addEventListener(a,s,{passive:h}):e.addEventListener(a,s,!1)}function Jh(e,a,s,l,h){var g=l;if((a&1)===0&&(a&2)===0&&l!==null)t:for(;;){if(l===null)return;var M=l.tag;if(M===3||M===4){var A=l.stateNode.containerInfo;if(A===h)break;if(M===4)for(M=l.return;M!==null;){var B=M.tag;if((B===3||B===4)&&M.stateNode.containerInfo===h)return;M=M.return}for(;A!==null;){if(M=ea(A),M===null)return;if(B=M.tag,B===5||B===6||B===26||B===27){l=g=M;continue t}A=A.parentNode}}l=l.return}Ug(function(){var $=g,ht=_f(s),gt=[];t:{var it=rv.get(e);if(it!==void 0){var at=fu,ae=e;switch(e){case"keypress":if(uu(s)===0)break t;case"keydown":case"keyup":at=ST;break;case"focusin":ae="focus",at=Tf;break;case"focusout":ae="blur",at=Tf;break;case"beforeblur":case"afterblur":at=Tf;break;case"click":if(s.button===2)break t;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":at=Ng;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":at=uT;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":at=TT;break;case ev:case nv:case iv:at=hT;break;case av:at=AT;break;case"scroll":case"scrollend":at=oT;break;case"wheel":at=CT;break;case"copy":case"cut":case"paste":at=pT;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":at=Bg;break;case"toggle":case"beforetoggle":at=DT}var te=(a&4)!==0,Be=!te&&(e==="scroll"||e==="scrollend"),j=te?it!==null?it+"Capture":null:it;te=[];for(var k=$,Z;k!==null;){var dt=k;if(Z=dt.stateNode,dt=dt.tag,dt!==5&&dt!==26&&dt!==27||Z===null||j===null||(dt=bo(k,j),dt!=null&&te.push(ol(k,dt,Z))),Be)break;k=k.return}0<te.length&&(it=new at(it,ae,null,s,ht),gt.push({event:it,listeners:te}))}}if((a&7)===0){t:{if(it=e==="mouseover"||e==="pointerover",at=e==="mouseout"||e==="pointerout",it&&s!==vf&&(ae=s.relatedTarget||s.fromElement)&&(ea(ae)||ae[zi]))break t;if((at||it)&&(it=ht.window===ht?ht:(it=ht.ownerDocument)?it.defaultView||it.parentWindow:window,at?(ae=s.relatedTarget||s.toElement,at=$,ae=ae?ea(ae):null,ae!==null&&(Be=u(ae),te=ae.tag,ae!==Be||te!==5&&te!==27&&te!==6)&&(ae=null)):(at=null,ae=$),at!==ae)){if(te=Ng,dt="onMouseLeave",j="onMouseEnter",k="mouse",(e==="pointerout"||e==="pointerover")&&(te=Bg,dt="onPointerLeave",j="onPointerEnter",k="pointer"),Be=at==null?it:_r(at),Z=ae==null?it:_r(ae),it=new te(dt,k+"leave",at,s,ht),it.target=Be,it.relatedTarget=Z,dt=null,ea(ht)===$&&(te=new te(j,k+"enter",ae,s,ht),te.target=Z,te.relatedTarget=Be,dt=te),Be=dt,at&&ae)e:{for(te=at,j=ae,k=0,Z=te;Z;Z=Os(Z))k++;for(Z=0,dt=j;dt;dt=Os(dt))Z++;for(;0<k-Z;)te=Os(te),k--;for(;0<Z-k;)j=Os(j),Z--;for(;k--;){if(te===j||j!==null&&te===j.alternate)break e;te=Os(te),j=Os(j)}te=null}else te=null;at!==null&&b_(gt,it,at,te,!1),ae!==null&&Be!==null&&b_(gt,Be,ae,te,!0)}}t:{if(it=$?_r($):window,at=it.nodeName&&it.nodeName.toLowerCase(),at==="select"||at==="input"&&it.type==="file")var zt=Xg;else if(Gg(it))if(Wg)zt=VT;else{zt=IT;var ve=FT}else at=it.nodeName,!at||at.toLowerCase()!=="input"||it.type!=="checkbox"&&it.type!=="radio"?$&&gf($.elementType)&&(zt=Xg):zt=zT;if(zt&&(zt=zt(e,$))){kg(gt,zt,s,ht);break t}ve&&ve(e,it,$),e==="focusout"&&$&&it.type==="number"&&$.memoizedProps.value!=null&&Pn(it,"number",it.value)}switch(ve=$?_r($):window,e){case"focusin":(Gg(ve)||ve.contentEditable==="true")&&(fs=ve,Df=$,Po=null);break;case"focusout":Po=Df=fs=null;break;case"mousedown":Uf=!0;break;case"contextmenu":case"mouseup":case"dragend":Uf=!1,Jg(gt,s,ht);break;case"selectionchange":if(GT)break;case"keydown":case"keyup":Jg(gt,s,ht)}var Kt;if(Af)t:{switch(e){case"compositionstart":var ne="onCompositionStart";break t;case"compositionend":ne="onCompositionEnd";break t;case"compositionupdate":ne="onCompositionUpdate";break t}ne=void 0}else cs?Vg(e,s)&&(ne="onCompositionEnd"):e==="keydown"&&s.keyCode===229&&(ne="onCompositionStart");ne&&(Fg&&s.locale!=="ko"&&(cs||ne!=="onCompositionStart"?ne==="onCompositionEnd"&&cs&&(Kt=Lg()):(Na=ht,Sf="value"in Na?Na.value:Na.textContent,cs=!0)),ve=$u($,ne),0<ve.length&&(ne=new Og(ne,e,null,s,ht),gt.push({event:ne,listeners:ve}),Kt?ne.data=Kt:(Kt=Hg(s),Kt!==null&&(ne.data=Kt)))),(Kt=LT?PT(e,s):NT(e,s))&&(ne=$u($,"onBeforeInput"),0<ne.length&&(ve=new Og("onBeforeInput","beforeinput",null,s,ht),gt.push({event:ve,listeners:ne}),ve.data=Kt)),Tb(gt,e,$,s,ht)}E_(gt,a)})}function ol(e,a,s){return{instance:e,listener:a,currentTarget:s}}function $u(e,a){for(var s=a+"Capture",l=[];e!==null;){var h=e,g=h.stateNode;if(h=h.tag,h!==5&&h!==26&&h!==27||g===null||(h=bo(e,s),h!=null&&l.unshift(ol(e,h,g)),h=bo(e,a),h!=null&&l.push(ol(e,h,g))),e.tag===3)return l;e=e.return}return[]}function Os(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5&&e.tag!==27);return e||null}function b_(e,a,s,l,h){for(var g=a._reactName,M=[];s!==null&&s!==l;){var A=s,B=A.alternate,$=A.stateNode;if(A=A.tag,B!==null&&B===l)break;A!==5&&A!==26&&A!==27||$===null||(B=$,h?($=bo(s,g),$!=null&&M.unshift(ol(s,$,B))):h||($=bo(s,g),$!=null&&M.push(ol(s,$,B)))),s=s.return}M.length!==0&&e.push({event:a,listeners:M})}var Cb=/\r\n?/g,wb=/\u0000|\uFFFD/g;function A_(e){return(typeof e=="string"?e:""+e).replace(Cb,`
`).replace(wb,"")}function R_(e,a){return a=A_(a),A_(e)===a}function Ju(){}function Oe(e,a,s,l,h,g){switch(s){case"children":typeof l=="string"?a==="body"||a==="textarea"&&l===""||Xn(e,l):(typeof l=="number"||typeof l=="bigint")&&a!=="body"&&Xn(e,""+l);break;case"className":It(e,"class",l);break;case"tabIndex":It(e,"tabindex",l);break;case"dir":case"role":case"viewBox":case"width":case"height":It(e,s,l);break;case"style":wg(e,l,g);break;case"data":if(a!=="object"){It(e,"data",l);break}case"src":case"href":if(l===""&&(a!=="a"||s!=="href")){e.removeAttribute(s);break}if(l==null||typeof l=="function"||typeof l=="symbol"||typeof l=="boolean"){e.removeAttribute(s);break}l=ou(""+l),e.setAttribute(s,l);break;case"action":case"formAction":if(typeof l=="function"){e.setAttribute(s,"javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')");break}else typeof g=="function"&&(s==="formAction"?(a!=="input"&&Oe(e,a,"name",h.name,h,null),Oe(e,a,"formEncType",h.formEncType,h,null),Oe(e,a,"formMethod",h.formMethod,h,null),Oe(e,a,"formTarget",h.formTarget,h,null)):(Oe(e,a,"encType",h.encType,h,null),Oe(e,a,"method",h.method,h,null),Oe(e,a,"target",h.target,h,null)));if(l==null||typeof l=="symbol"||typeof l=="boolean"){e.removeAttribute(s);break}l=ou(""+l),e.setAttribute(s,l);break;case"onClick":l!=null&&(e.onclick=Ju);break;case"onScroll":l!=null&&xe("scroll",e);break;case"onScrollEnd":l!=null&&xe("scrollend",e);break;case"dangerouslySetInnerHTML":if(l!=null){if(typeof l!="object"||!("__html"in l))throw Error(r(61));if(s=l.__html,s!=null){if(h.children!=null)throw Error(r(60));e.innerHTML=s}}break;case"multiple":e.multiple=l&&typeof l!="function"&&typeof l!="symbol";break;case"muted":e.muted=l&&typeof l!="function"&&typeof l!="symbol";break;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"defaultValue":case"defaultChecked":case"innerHTML":case"ref":break;case"autoFocus":break;case"xlinkHref":if(l==null||typeof l=="function"||typeof l=="boolean"||typeof l=="symbol"){e.removeAttribute("xlink:href");break}s=ou(""+l),e.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href",s);break;case"contentEditable":case"spellCheck":case"draggable":case"value":case"autoReverse":case"externalResourcesRequired":case"focusable":case"preserveAlpha":l!=null&&typeof l!="function"&&typeof l!="symbol"?e.setAttribute(s,""+l):e.removeAttribute(s);break;case"inert":case"allowFullScreen":case"async":case"autoPlay":case"controls":case"default":case"defer":case"disabled":case"disablePictureInPicture":case"disableRemotePlayback":case"formNoValidate":case"hidden":case"loop":case"noModule":case"noValidate":case"open":case"playsInline":case"readOnly":case"required":case"reversed":case"scoped":case"seamless":case"itemScope":l&&typeof l!="function"&&typeof l!="symbol"?e.setAttribute(s,""):e.removeAttribute(s);break;case"capture":case"download":l===!0?e.setAttribute(s,""):l!==!1&&l!=null&&typeof l!="function"&&typeof l!="symbol"?e.setAttribute(s,l):e.removeAttribute(s);break;case"cols":case"rows":case"size":case"span":l!=null&&typeof l!="function"&&typeof l!="symbol"&&!isNaN(l)&&1<=l?e.setAttribute(s,l):e.removeAttribute(s);break;case"rowSpan":case"start":l==null||typeof l=="function"||typeof l=="symbol"||isNaN(l)?e.removeAttribute(s):e.setAttribute(s,l);break;case"popover":xe("beforetoggle",e),xe("toggle",e),Dt(e,"popover",l);break;case"xlinkActuate":Pt(e,"http://www.w3.org/1999/xlink","xlink:actuate",l);break;case"xlinkArcrole":Pt(e,"http://www.w3.org/1999/xlink","xlink:arcrole",l);break;case"xlinkRole":Pt(e,"http://www.w3.org/1999/xlink","xlink:role",l);break;case"xlinkShow":Pt(e,"http://www.w3.org/1999/xlink","xlink:show",l);break;case"xlinkTitle":Pt(e,"http://www.w3.org/1999/xlink","xlink:title",l);break;case"xlinkType":Pt(e,"http://www.w3.org/1999/xlink","xlink:type",l);break;case"xmlBase":Pt(e,"http://www.w3.org/XML/1998/namespace","xml:base",l);break;case"xmlLang":Pt(e,"http://www.w3.org/XML/1998/namespace","xml:lang",l);break;case"xmlSpace":Pt(e,"http://www.w3.org/XML/1998/namespace","xml:space",l);break;case"is":Dt(e,"is",l);break;case"innerText":case"textContent":break;default:(!(2<s.length)||s[0]!=="o"&&s[0]!=="O"||s[1]!=="n"&&s[1]!=="N")&&(s=rT.get(s)||s,Dt(e,s,l))}}function td(e,a,s,l,h,g){switch(s){case"style":wg(e,l,g);break;case"dangerouslySetInnerHTML":if(l!=null){if(typeof l!="object"||!("__html"in l))throw Error(r(61));if(s=l.__html,s!=null){if(h.children!=null)throw Error(r(60));e.innerHTML=s}}break;case"children":typeof l=="string"?Xn(e,l):(typeof l=="number"||typeof l=="bigint")&&Xn(e,""+l);break;case"onScroll":l!=null&&xe("scroll",e);break;case"onScrollEnd":l!=null&&xe("scrollend",e);break;case"onClick":l!=null&&(e.onclick=Ju);break;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"innerHTML":case"ref":break;case"innerText":case"textContent":break;default:if(!su.hasOwnProperty(s))t:{if(s[0]==="o"&&s[1]==="n"&&(h=s.endsWith("Capture"),a=s.slice(2,h?s.length-7:void 0),g=e[Je]||null,g=g!=null?g[s]:null,typeof g=="function"&&e.removeEventListener(a,g,h),typeof l=="function")){typeof g!="function"&&g!==null&&(s in e?e[s]=null:e.hasAttribute(s)&&e.removeAttribute(s)),e.addEventListener(a,l,h);break t}s in e?e[s]=l:l===!0?e.setAttribute(s,""):Dt(e,s,l)}}}function Dn(e,a,s){switch(a){case"div":case"span":case"svg":case"path":case"a":case"g":case"p":case"li":break;case"img":xe("error",e),xe("load",e);var l=!1,h=!1,g;for(g in s)if(s.hasOwnProperty(g)){var M=s[g];if(M!=null)switch(g){case"src":l=!0;break;case"srcSet":h=!0;break;case"children":case"dangerouslySetInnerHTML":throw Error(r(137,a));default:Oe(e,a,g,M,s,null)}}h&&Oe(e,a,"srcSet",s.srcSet,s,null),l&&Oe(e,a,"src",s.src,s,null);return;case"input":xe("invalid",e);var A=g=M=h=null,B=null,$=null;for(l in s)if(s.hasOwnProperty(l)){var ht=s[l];if(ht!=null)switch(l){case"name":h=ht;break;case"type":M=ht;break;case"checked":B=ht;break;case"defaultChecked":$=ht;break;case"value":g=ht;break;case"defaultValue":A=ht;break;case"children":case"dangerouslySetInnerHTML":if(ht!=null)throw Error(r(137,a));break;default:Oe(e,a,l,ht,s,null)}}Vn(e,g,A,B,$,M,h,!1),_e(e);return;case"select":xe("invalid",e),l=M=g=null;for(h in s)if(s.hasOwnProperty(h)&&(A=s[h],A!=null))switch(h){case"value":g=A;break;case"defaultValue":M=A;break;case"multiple":l=A;default:Oe(e,a,h,A,s,null)}a=g,s=M,e.multiple=!!l,a!=null?tn(e,!!l,a,!1):s!=null&&tn(e,!!l,s,!0);return;case"textarea":xe("invalid",e),g=h=l=null;for(M in s)if(s.hasOwnProperty(M)&&(A=s[M],A!=null))switch(M){case"value":l=A;break;case"defaultValue":h=A;break;case"children":g=A;break;case"dangerouslySetInnerHTML":if(A!=null)throw Error(r(91));break;default:Oe(e,a,M,A,s,null)}os(e,l,h,g),_e(e);return;case"option":for(B in s)if(s.hasOwnProperty(B)&&(l=s[B],l!=null))switch(B){case"selected":e.selected=l&&typeof l!="function"&&typeof l!="symbol";break;default:Oe(e,a,B,l,s,null)}return;case"dialog":xe("beforetoggle",e),xe("toggle",e),xe("cancel",e),xe("close",e);break;case"iframe":case"object":xe("load",e);break;case"video":case"audio":for(l=0;l<sl.length;l++)xe(sl[l],e);break;case"image":xe("error",e),xe("load",e);break;case"details":xe("toggle",e);break;case"embed":case"source":case"link":xe("error",e),xe("load",e);case"area":case"base":case"br":case"col":case"hr":case"keygen":case"meta":case"param":case"track":case"wbr":case"menuitem":for($ in s)if(s.hasOwnProperty($)&&(l=s[$],l!=null))switch($){case"children":case"dangerouslySetInnerHTML":throw Error(r(137,a));default:Oe(e,a,$,l,s,null)}return;default:if(gf(a)){for(ht in s)s.hasOwnProperty(ht)&&(l=s[ht],l!==void 0&&td(e,a,ht,l,s,void 0));return}}for(A in s)s.hasOwnProperty(A)&&(l=s[A],l!=null&&Oe(e,a,A,l,s,null))}function Db(e,a,s,l){switch(a){case"div":case"span":case"svg":case"path":case"a":case"g":case"p":case"li":break;case"input":var h=null,g=null,M=null,A=null,B=null,$=null,ht=null;for(at in s){var gt=s[at];if(s.hasOwnProperty(at)&&gt!=null)switch(at){case"checked":break;case"value":break;case"defaultValue":B=gt;default:l.hasOwnProperty(at)||Oe(e,a,at,null,l,gt)}}for(var it in l){var at=l[it];if(gt=s[it],l.hasOwnProperty(it)&&(at!=null||gt!=null))switch(it){case"type":g=at;break;case"name":h=at;break;case"checked":$=at;break;case"defaultChecked":ht=at;break;case"value":M=at;break;case"defaultValue":A=at;break;case"children":case"dangerouslySetInnerHTML":if(at!=null)throw Error(r(137,a));break;default:at!==gt&&Oe(e,a,it,at,l,gt)}}ze(e,M,A,B,$,ht,g,h);return;case"select":at=M=A=it=null;for(g in s)if(B=s[g],s.hasOwnProperty(g)&&B!=null)switch(g){case"value":break;case"multiple":at=B;default:l.hasOwnProperty(g)||Oe(e,a,g,null,l,B)}for(h in l)if(g=l[h],B=s[h],l.hasOwnProperty(h)&&(g!=null||B!=null))switch(h){case"value":it=g;break;case"defaultValue":A=g;break;case"multiple":M=g;default:g!==B&&Oe(e,a,h,g,l,B)}a=A,s=M,l=at,it!=null?tn(e,!!s,it,!1):!!l!=!!s&&(a!=null?tn(e,!!s,a,!0):tn(e,!!s,s?[]:"",!1));return;case"textarea":at=it=null;for(A in s)if(h=s[A],s.hasOwnProperty(A)&&h!=null&&!l.hasOwnProperty(A))switch(A){case"value":break;case"children":break;default:Oe(e,a,A,null,l,h)}for(M in l)if(h=l[M],g=s[M],l.hasOwnProperty(M)&&(h!=null||g!=null))switch(M){case"value":it=h;break;case"defaultValue":at=h;break;case"children":break;case"dangerouslySetInnerHTML":if(h!=null)throw Error(r(91));break;default:h!==g&&Oe(e,a,M,h,l,g)}Rn(e,it,at);return;case"option":for(var ae in s)if(it=s[ae],s.hasOwnProperty(ae)&&it!=null&&!l.hasOwnProperty(ae))switch(ae){case"selected":e.selected=!1;break;default:Oe(e,a,ae,null,l,it)}for(B in l)if(it=l[B],at=s[B],l.hasOwnProperty(B)&&it!==at&&(it!=null||at!=null))switch(B){case"selected":e.selected=it&&typeof it!="function"&&typeof it!="symbol";break;default:Oe(e,a,B,it,l,at)}return;case"img":case"link":case"area":case"base":case"br":case"col":case"embed":case"hr":case"keygen":case"meta":case"param":case"source":case"track":case"wbr":case"menuitem":for(var te in s)it=s[te],s.hasOwnProperty(te)&&it!=null&&!l.hasOwnProperty(te)&&Oe(e,a,te,null,l,it);for($ in l)if(it=l[$],at=s[$],l.hasOwnProperty($)&&it!==at&&(it!=null||at!=null))switch($){case"children":case"dangerouslySetInnerHTML":if(it!=null)throw Error(r(137,a));break;default:Oe(e,a,$,it,l,at)}return;default:if(gf(a)){for(var Be in s)it=s[Be],s.hasOwnProperty(Be)&&it!==void 0&&!l.hasOwnProperty(Be)&&td(e,a,Be,void 0,l,it);for(ht in l)it=l[ht],at=s[ht],!l.hasOwnProperty(ht)||it===at||it===void 0&&at===void 0||td(e,a,ht,it,l,at);return}}for(var j in s)it=s[j],s.hasOwnProperty(j)&&it!=null&&!l.hasOwnProperty(j)&&Oe(e,a,j,null,l,it);for(gt in l)it=l[gt],at=s[gt],!l.hasOwnProperty(gt)||it===at||it==null&&at==null||Oe(e,a,gt,it,l,at)}var ed=null,nd=null;function tc(e){return e.nodeType===9?e:e.ownerDocument}function C_(e){switch(e){case"http://www.w3.org/2000/svg":return 1;case"http://www.w3.org/1998/Math/MathML":return 2;default:return 0}}function w_(e,a){if(e===0)switch(a){case"svg":return 1;case"math":return 2;default:return 0}return e===1&&a==="foreignObject"?0:e}function id(e,a){return e==="textarea"||e==="noscript"||typeof a.children=="string"||typeof a.children=="number"||typeof a.children=="bigint"||typeof a.dangerouslySetInnerHTML=="object"&&a.dangerouslySetInnerHTML!==null&&a.dangerouslySetInnerHTML.__html!=null}var ad=null;function Ub(){var e=window.event;return e&&e.type==="popstate"?e===ad?!1:(ad=e,!0):(ad=null,!1)}var D_=typeof setTimeout=="function"?setTimeout:void 0,Lb=typeof clearTimeout=="function"?clearTimeout:void 0,U_=typeof Promise=="function"?Promise:void 0,Pb=typeof queueMicrotask=="function"?queueMicrotask:typeof U_<"u"?function(e){return U_.resolve(null).then(e).catch(Nb)}:D_;function Nb(e){setTimeout(function(){throw e})}function Za(e){return e==="head"}function L_(e,a){var s=a,l=0,h=0;do{var g=s.nextSibling;if(e.removeChild(s),g&&g.nodeType===8)if(s=g.data,s==="/$"){if(0<l&&8>l){s=l;var M=e.ownerDocument;if(s&1&&ll(M.documentElement),s&2&&ll(M.body),s&4)for(s=M.head,ll(s),M=s.firstChild;M;){var A=M.nextSibling,B=M.nodeName;M[Vi]||B==="SCRIPT"||B==="STYLE"||B==="LINK"&&M.rel.toLowerCase()==="stylesheet"||s.removeChild(M),M=A}}if(h===0){e.removeChild(g),gl(a);return}h--}else s==="$"||s==="$?"||s==="$!"?h++:l=s.charCodeAt(0)-48;else l=0;s=g}while(s);gl(a)}function rd(e){var a=e.firstChild;for(a&&a.nodeType===10&&(a=a.nextSibling);a;){var s=a;switch(a=a.nextSibling,s.nodeName){case"HTML":case"HEAD":case"BODY":rd(s),ss(s);continue;case"SCRIPT":case"STYLE":continue;case"LINK":if(s.rel.toLowerCase()==="stylesheet")continue}e.removeChild(s)}}function Ob(e,a,s,l){for(;e.nodeType===1;){var h=s;if(e.nodeName.toLowerCase()!==a.toLowerCase()){if(!l&&(e.nodeName!=="INPUT"||e.type!=="hidden"))break}else if(l){if(!e[Vi])switch(a){case"meta":if(!e.hasAttribute("itemprop"))break;return e;case"link":if(g=e.getAttribute("rel"),g==="stylesheet"&&e.hasAttribute("data-precedence"))break;if(g!==h.rel||e.getAttribute("href")!==(h.href==null||h.href===""?null:h.href)||e.getAttribute("crossorigin")!==(h.crossOrigin==null?null:h.crossOrigin)||e.getAttribute("title")!==(h.title==null?null:h.title))break;return e;case"style":if(e.hasAttribute("data-precedence"))break;return e;case"script":if(g=e.getAttribute("src"),(g!==(h.src==null?null:h.src)||e.getAttribute("type")!==(h.type==null?null:h.type)||e.getAttribute("crossorigin")!==(h.crossOrigin==null?null:h.crossOrigin))&&g&&e.hasAttribute("async")&&!e.hasAttribute("itemprop"))break;return e;default:return e}}else if(a==="input"&&e.type==="hidden"){var g=h.name==null?null:""+h.name;if(h.type==="hidden"&&e.getAttribute("name")===g)return e}else return e;if(e=Ci(e.nextSibling),e===null)break}return null}function Bb(e,a,s){if(a==="")return null;for(;e.nodeType!==3;)if((e.nodeType!==1||e.nodeName!=="INPUT"||e.type!=="hidden")&&!s||(e=Ci(e.nextSibling),e===null))return null;return e}function sd(e){return e.data==="$!"||e.data==="$?"&&e.ownerDocument.readyState==="complete"}function Fb(e,a){var s=e.ownerDocument;if(e.data!=="$?"||s.readyState==="complete")a();else{var l=function(){a(),s.removeEventListener("DOMContentLoaded",l)};s.addEventListener("DOMContentLoaded",l),e._reactRetry=l}}function Ci(e){for(;e!=null;e=e.nextSibling){var a=e.nodeType;if(a===1||a===3)break;if(a===8){if(a=e.data,a==="$"||a==="$!"||a==="$?"||a==="F!"||a==="F")break;if(a==="/$")return null}}return e}var od=null;function P_(e){e=e.previousSibling;for(var a=0;e;){if(e.nodeType===8){var s=e.data;if(s==="$"||s==="$!"||s==="$?"){if(a===0)return e;a--}else s==="/$"&&a++}e=e.previousSibling}return null}function N_(e,a,s){switch(a=tc(s),e){case"html":if(e=a.documentElement,!e)throw Error(r(452));return e;case"head":if(e=a.head,!e)throw Error(r(453));return e;case"body":if(e=a.body,!e)throw Error(r(454));return e;default:throw Error(r(451))}}function ll(e){for(var a=e.attributes;a.length;)e.removeAttributeNode(a[0]);ss(e)}var vi=new Map,O_=new Set;function ec(e){return typeof e.getRootNode=="function"?e.getRootNode():e.nodeType===9?e:e.ownerDocument}var ma=q.d;q.d={f:Ib,r:zb,D:Vb,C:Hb,L:Gb,m:kb,X:Wb,S:Xb,M:qb};function Ib(){var e=ma.f(),a=qu();return e||a}function zb(e){var a=La(e);a!==null&&a.tag===5&&a.type==="form"?e0(a):ma.r(e)}var Bs=typeof document>"u"?null:document;function B_(e,a,s){var l=Bs;if(l&&typeof a=="string"&&a){var h=Mn(a);h='link[rel="'+e+'"][href="'+h+'"]',typeof s=="string"&&(h+='[crossorigin="'+s+'"]'),O_.has(h)||(O_.add(h),e={rel:e,crossOrigin:s,href:a},l.querySelector(h)===null&&(a=l.createElement("link"),Dn(a,"link",e),cn(a),l.head.appendChild(a)))}}function Vb(e){ma.D(e),B_("dns-prefetch",e,null)}function Hb(e,a){ma.C(e,a),B_("preconnect",e,a)}function Gb(e,a,s){ma.L(e,a,s);var l=Bs;if(l&&e&&a){var h='link[rel="preload"][as="'+Mn(a)+'"]';a==="image"&&s&&s.imageSrcSet?(h+='[imagesrcset="'+Mn(s.imageSrcSet)+'"]',typeof s.imageSizes=="string"&&(h+='[imagesizes="'+Mn(s.imageSizes)+'"]')):h+='[href="'+Mn(e)+'"]';var g=h;switch(a){case"style":g=Fs(e);break;case"script":g=Is(e)}vi.has(g)||(e=m({rel:"preload",href:a==="image"&&s&&s.imageSrcSet?void 0:e,as:a},s),vi.set(g,e),l.querySelector(h)!==null||a==="style"&&l.querySelector(ul(g))||a==="script"&&l.querySelector(cl(g))||(a=l.createElement("link"),Dn(a,"link",e),cn(a),l.head.appendChild(a)))}}function kb(e,a){ma.m(e,a);var s=Bs;if(s&&e){var l=a&&typeof a.as=="string"?a.as:"script",h='link[rel="modulepreload"][as="'+Mn(l)+'"][href="'+Mn(e)+'"]',g=h;switch(l){case"audioworklet":case"paintworklet":case"serviceworker":case"sharedworker":case"worker":case"script":g=Is(e)}if(!vi.has(g)&&(e=m({rel:"modulepreload",href:e},a),vi.set(g,e),s.querySelector(h)===null)){switch(l){case"audioworklet":case"paintworklet":case"serviceworker":case"sharedworker":case"worker":case"script":if(s.querySelector(cl(g)))return}l=s.createElement("link"),Dn(l,"link",e),cn(l),s.head.appendChild(l)}}}function Xb(e,a,s){ma.S(e,a,s);var l=Bs;if(l&&e){var h=Pa(l).hoistableStyles,g=Fs(e);a=a||"default";var M=h.get(g);if(!M){var A={loading:0,preload:null};if(M=l.querySelector(ul(g)))A.loading=5;else{e=m({rel:"stylesheet",href:e,"data-precedence":a},s),(s=vi.get(g))&&ld(e,s);var B=M=l.createElement("link");cn(B),Dn(B,"link",e),B._p=new Promise(function($,ht){B.onload=$,B.onerror=ht}),B.addEventListener("load",function(){A.loading|=1}),B.addEventListener("error",function(){A.loading|=2}),A.loading|=4,nc(M,a,l)}M={type:"stylesheet",instance:M,count:1,state:A},h.set(g,M)}}}function Wb(e,a){ma.X(e,a);var s=Bs;if(s&&e){var l=Pa(s).hoistableScripts,h=Is(e),g=l.get(h);g||(g=s.querySelector(cl(h)),g||(e=m({src:e,async:!0},a),(a=vi.get(h))&&ud(e,a),g=s.createElement("script"),cn(g),Dn(g,"link",e),s.head.appendChild(g)),g={type:"script",instance:g,count:1,state:null},l.set(h,g))}}function qb(e,a){ma.M(e,a);var s=Bs;if(s&&e){var l=Pa(s).hoistableScripts,h=Is(e),g=l.get(h);g||(g=s.querySelector(cl(h)),g||(e=m({src:e,async:!0,type:"module"},a),(a=vi.get(h))&&ud(e,a),g=s.createElement("script"),cn(g),Dn(g,"link",e),s.head.appendChild(g)),g={type:"script",instance:g,count:1,state:null},l.set(h,g))}}function F_(e,a,s,l){var h=(h=et.current)?ec(h):null;if(!h)throw Error(r(446));switch(e){case"meta":case"title":return null;case"style":return typeof s.precedence=="string"&&typeof s.href=="string"?(a=Fs(s.href),s=Pa(h).hoistableStyles,l=s.get(a),l||(l={type:"style",instance:null,count:0,state:null},s.set(a,l)),l):{type:"void",instance:null,count:0,state:null};case"link":if(s.rel==="stylesheet"&&typeof s.href=="string"&&typeof s.precedence=="string"){e=Fs(s.href);var g=Pa(h).hoistableStyles,M=g.get(e);if(M||(h=h.ownerDocument||h,M={type:"stylesheet",instance:null,count:0,state:{loading:0,preload:null}},g.set(e,M),(g=h.querySelector(ul(e)))&&!g._p&&(M.instance=g,M.state.loading=5),vi.has(e)||(s={rel:"preload",as:"style",href:s.href,crossOrigin:s.crossOrigin,integrity:s.integrity,media:s.media,hrefLang:s.hrefLang,referrerPolicy:s.referrerPolicy},vi.set(e,s),g||Yb(h,e,s,M.state))),a&&l===null)throw Error(r(528,""));return M}if(a&&l!==null)throw Error(r(529,""));return null;case"script":return a=s.async,s=s.src,typeof s=="string"&&a&&typeof a!="function"&&typeof a!="symbol"?(a=Is(s),s=Pa(h).hoistableScripts,l=s.get(a),l||(l={type:"script",instance:null,count:0,state:null},s.set(a,l)),l):{type:"void",instance:null,count:0,state:null};default:throw Error(r(444,e))}}function Fs(e){return'href="'+Mn(e)+'"'}function ul(e){return'link[rel="stylesheet"]['+e+"]"}function I_(e){return m({},e,{"data-precedence":e.precedence,precedence:null})}function Yb(e,a,s,l){e.querySelector('link[rel="preload"][as="style"]['+a+"]")?l.loading=1:(a=e.createElement("link"),l.preload=a,a.addEventListener("load",function(){return l.loading|=1}),a.addEventListener("error",function(){return l.loading|=2}),Dn(a,"link",s),cn(a),e.head.appendChild(a))}function Is(e){return'[src="'+Mn(e)+'"]'}function cl(e){return"script[async]"+e}function z_(e,a,s){if(a.count++,a.instance===null)switch(a.type){case"style":var l=e.querySelector('style[data-href~="'+Mn(s.href)+'"]');if(l)return a.instance=l,cn(l),l;var h=m({},s,{"data-href":s.href,"data-precedence":s.precedence,href:null,precedence:null});return l=(e.ownerDocument||e).createElement("style"),cn(l),Dn(l,"style",h),nc(l,s.precedence,e),a.instance=l;case"stylesheet":h=Fs(s.href);var g=e.querySelector(ul(h));if(g)return a.state.loading|=4,a.instance=g,cn(g),g;l=I_(s),(h=vi.get(h))&&ld(l,h),g=(e.ownerDocument||e).createElement("link"),cn(g);var M=g;return M._p=new Promise(function(A,B){M.onload=A,M.onerror=B}),Dn(g,"link",l),a.state.loading|=4,nc(g,s.precedence,e),a.instance=g;case"script":return g=Is(s.src),(h=e.querySelector(cl(g)))?(a.instance=h,cn(h),h):(l=s,(h=vi.get(g))&&(l=m({},s),ud(l,h)),e=e.ownerDocument||e,h=e.createElement("script"),cn(h),Dn(h,"link",l),e.head.appendChild(h),a.instance=h);case"void":return null;default:throw Error(r(443,a.type))}else a.type==="stylesheet"&&(a.state.loading&4)===0&&(l=a.instance,a.state.loading|=4,nc(l,s.precedence,e));return a.instance}function nc(e,a,s){for(var l=s.querySelectorAll('link[rel="stylesheet"][data-precedence],style[data-precedence]'),h=l.length?l[l.length-1]:null,g=h,M=0;M<l.length;M++){var A=l[M];if(A.dataset.precedence===a)g=A;else if(g!==h)break}g?g.parentNode.insertBefore(e,g.nextSibling):(a=s.nodeType===9?s.head:s,a.insertBefore(e,a.firstChild))}function ld(e,a){e.crossOrigin==null&&(e.crossOrigin=a.crossOrigin),e.referrerPolicy==null&&(e.referrerPolicy=a.referrerPolicy),e.title==null&&(e.title=a.title)}function ud(e,a){e.crossOrigin==null&&(e.crossOrigin=a.crossOrigin),e.referrerPolicy==null&&(e.referrerPolicy=a.referrerPolicy),e.integrity==null&&(e.integrity=a.integrity)}var ic=null;function V_(e,a,s){if(ic===null){var l=new Map,h=ic=new Map;h.set(s,l)}else h=ic,l=h.get(s),l||(l=new Map,h.set(s,l));if(l.has(e))return l;for(l.set(e,null),s=s.getElementsByTagName(e),h=0;h<s.length;h++){var g=s[h];if(!(g[Vi]||g[gn]||e==="link"&&g.getAttribute("rel")==="stylesheet")&&g.namespaceURI!=="http://www.w3.org/2000/svg"){var M=g.getAttribute(a)||"";M=e+M;var A=l.get(M);A?A.push(g):l.set(M,[g])}}return l}function H_(e,a,s){e=e.ownerDocument||e,e.head.insertBefore(s,a==="title"?e.querySelector("head > title"):null)}function jb(e,a,s){if(s===1||a.itemProp!=null)return!1;switch(e){case"meta":case"title":return!0;case"style":if(typeof a.precedence!="string"||typeof a.href!="string"||a.href==="")break;return!0;case"link":if(typeof a.rel!="string"||typeof a.href!="string"||a.href===""||a.onLoad||a.onError)break;switch(a.rel){case"stylesheet":return e=a.disabled,typeof a.precedence=="string"&&e==null;default:return!0}case"script":if(a.async&&typeof a.async!="function"&&typeof a.async!="symbol"&&!a.onLoad&&!a.onError&&a.src&&typeof a.src=="string")return!0}return!1}function G_(e){return!(e.type==="stylesheet"&&(e.state.loading&3)===0)}var fl=null;function Kb(){}function Zb(e,a,s){if(fl===null)throw Error(r(475));var l=fl;if(a.type==="stylesheet"&&(typeof s.media!="string"||matchMedia(s.media).matches!==!1)&&(a.state.loading&4)===0){if(a.instance===null){var h=Fs(s.href),g=e.querySelector(ul(h));if(g){e=g._p,e!==null&&typeof e=="object"&&typeof e.then=="function"&&(l.count++,l=ac.bind(l),e.then(l,l)),a.state.loading|=4,a.instance=g,cn(g);return}g=e.ownerDocument||e,s=I_(s),(h=vi.get(h))&&ld(s,h),g=g.createElement("link"),cn(g);var M=g;M._p=new Promise(function(A,B){M.onload=A,M.onerror=B}),Dn(g,"link",s),a.instance=g}l.stylesheets===null&&(l.stylesheets=new Map),l.stylesheets.set(a,e),(e=a.state.preload)&&(a.state.loading&3)===0&&(l.count++,a=ac.bind(l),e.addEventListener("load",a),e.addEventListener("error",a))}}function Qb(){if(fl===null)throw Error(r(475));var e=fl;return e.stylesheets&&e.count===0&&cd(e,e.stylesheets),0<e.count?function(a){var s=setTimeout(function(){if(e.stylesheets&&cd(e,e.stylesheets),e.unsuspend){var l=e.unsuspend;e.unsuspend=null,l()}},6e4);return e.unsuspend=a,function(){e.unsuspend=null,clearTimeout(s)}}:null}function ac(){if(this.count--,this.count===0){if(this.stylesheets)cd(this,this.stylesheets);else if(this.unsuspend){var e=this.unsuspend;this.unsuspend=null,e()}}}var rc=null;function cd(e,a){e.stylesheets=null,e.unsuspend!==null&&(e.count++,rc=new Map,a.forEach($b,e),rc=null,ac.call(e))}function $b(e,a){if(!(a.state.loading&4)){var s=rc.get(e);if(s)var l=s.get(null);else{s=new Map,rc.set(e,s);for(var h=e.querySelectorAll("link[data-precedence],style[data-precedence]"),g=0;g<h.length;g++){var M=h[g];(M.nodeName==="LINK"||M.getAttribute("media")!=="not all")&&(s.set(M.dataset.precedence,M),l=M)}l&&s.set(null,l)}h=a.instance,M=h.getAttribute("data-precedence"),g=s.get(M)||l,g===l&&s.set(null,h),s.set(M,h),this.count++,l=ac.bind(this),h.addEventListener("load",l),h.addEventListener("error",l),g?g.parentNode.insertBefore(h,g.nextSibling):(e=e.nodeType===9?e.head:e,e.insertBefore(h,e.firstChild)),a.state.loading|=4}}var hl={$$typeof:C,Provider:null,Consumer:null,_currentValue:W,_currentValue2:W,_threadCount:0};function Jb(e,a,s,l,h,g,M,A){this.tag=1,this.containerInfo=e,this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.next=this.pendingContext=this.context=this.cancelPendingCommit=null,this.callbackPriority=0,this.expirationTimes=Ct(-1),this.entangledLanes=this.shellSuspendCounter=this.errorRecoveryDisabledLanes=this.expiredLanes=this.warmLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Ct(0),this.hiddenUpdates=Ct(null),this.identifierPrefix=l,this.onUncaughtError=h,this.onCaughtError=g,this.onRecoverableError=M,this.pooledCache=null,this.pooledCacheLanes=0,this.formState=A,this.incompleteTransitions=new Map}function k_(e,a,s,l,h,g,M,A,B,$,ht,gt){return e=new Jb(e,a,s,M,A,B,$,gt),a=1,g===!0&&(a|=24),g=ei(3,null,null,a),e.current=g,g.stateNode=e,a=Wf(),a.refCount++,e.pooledCache=a,a.refCount++,g.memoizedState={element:l,isDehydrated:s,cache:a},Kf(g),e}function X_(e){return e?(e=ms,e):ms}function W_(e,a,s,l,h,g){h=X_(h),l.context===null?l.context=h:l.pendingContext=h,l=Fa(a),l.payload={element:s},g=g===void 0?null:g,g!==null&&(l.callback=g),s=Ia(e,l,a),s!==null&&(si(s,e,a),Go(s,e,a))}function q_(e,a){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var s=e.retryLane;e.retryLane=s!==0&&s<a?s:a}}function fd(e,a){q_(e,a),(e=e.alternate)&&q_(e,a)}function Y_(e){if(e.tag===13){var a=ps(e,67108864);a!==null&&si(a,e,67108864),fd(e,67108864)}}var sc=!0;function tA(e,a,s,l){var h=I.T;I.T=null;var g=q.p;try{q.p=2,hd(e,a,s,l)}finally{q.p=g,I.T=h}}function eA(e,a,s,l){var h=I.T;I.T=null;var g=q.p;try{q.p=8,hd(e,a,s,l)}finally{q.p=g,I.T=h}}function hd(e,a,s,l){if(sc){var h=dd(l);if(h===null)Jh(e,a,l,oc,s),K_(e,l);else if(iA(h,e,a,s,l))l.stopPropagation();else if(K_(e,l),a&4&&-1<nA.indexOf(e)){for(;h!==null;){var g=La(h);if(g!==null)switch(g.tag){case 3:if(g=g.stateNode,g.current.memoizedState.isDehydrated){var M=Zt(g.pendingLanes);if(M!==0){var A=g;for(A.pendingLanes|=2,A.entangledLanes|=2;M;){var B=1<<31-Bt(M);A.entanglements[1]|=B,M&=~B}Wi(g),(De&6)===0&&(Xu=Ot()+500,rl(0))}}break;case 13:A=ps(g,2),A!==null&&si(A,g,2),qu(),fd(g,2)}if(g=dd(l),g===null&&Jh(e,a,l,oc,s),g===h)break;h=g}h!==null&&l.stopPropagation()}else Jh(e,a,l,null,s)}}function dd(e){return e=_f(e),pd(e)}var oc=null;function pd(e){if(oc=null,e=ea(e),e!==null){var a=u(e);if(a===null)e=null;else{var s=a.tag;if(s===13){if(e=c(a),e!==null)return e;e=null}else if(s===3){if(a.stateNode.current.memoizedState.isDehydrated)return a.tag===3?a.stateNode.containerInfo:null;e=null}else a!==e&&(e=null)}}return oc=e,null}function j_(e){switch(e){case"beforetoggle":case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"toggle":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 2;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 8;case"message":switch(He()){case Gt:return 2;case le:return 8;case je:case Ke:return 32;case O:return 268435456;default:return 32}default:return 32}}var md=!1,Qa=null,$a=null,Ja=null,dl=new Map,pl=new Map,tr=[],nA="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(" ");function K_(e,a){switch(e){case"focusin":case"focusout":Qa=null;break;case"dragenter":case"dragleave":$a=null;break;case"mouseover":case"mouseout":Ja=null;break;case"pointerover":case"pointerout":dl.delete(a.pointerId);break;case"gotpointercapture":case"lostpointercapture":pl.delete(a.pointerId)}}function ml(e,a,s,l,h,g){return e===null||e.nativeEvent!==g?(e={blockedOn:a,domEventName:s,eventSystemFlags:l,nativeEvent:g,targetContainers:[h]},a!==null&&(a=La(a),a!==null&&Y_(a)),e):(e.eventSystemFlags|=l,a=e.targetContainers,h!==null&&a.indexOf(h)===-1&&a.push(h),e)}function iA(e,a,s,l,h){switch(a){case"focusin":return Qa=ml(Qa,e,a,s,l,h),!0;case"dragenter":return $a=ml($a,e,a,s,l,h),!0;case"mouseover":return Ja=ml(Ja,e,a,s,l,h),!0;case"pointerover":var g=h.pointerId;return dl.set(g,ml(dl.get(g)||null,e,a,s,l,h)),!0;case"gotpointercapture":return g=h.pointerId,pl.set(g,ml(pl.get(g)||null,e,a,s,l,h)),!0}return!1}function Z_(e){var a=ea(e.target);if(a!==null){var s=u(a);if(s!==null){if(a=s.tag,a===13){if(a=c(s),a!==null){e.blockedOn=a,Ti(e.priority,function(){if(s.tag===13){var l=ri();l=se(l);var h=ps(s,l);h!==null&&si(h,s,l),fd(s,l)}});return}}else if(a===3&&s.stateNode.current.memoizedState.isDehydrated){e.blockedOn=s.tag===3?s.stateNode.containerInfo:null;return}}}e.blockedOn=null}function lc(e){if(e.blockedOn!==null)return!1;for(var a=e.targetContainers;0<a.length;){var s=dd(e.nativeEvent);if(s===null){s=e.nativeEvent;var l=new s.constructor(s.type,s);vf=l,s.target.dispatchEvent(l),vf=null}else return a=La(s),a!==null&&Y_(a),e.blockedOn=s,!1;a.shift()}return!0}function Q_(e,a,s){lc(e)&&s.delete(a)}function aA(){md=!1,Qa!==null&&lc(Qa)&&(Qa=null),$a!==null&&lc($a)&&($a=null),Ja!==null&&lc(Ja)&&(Ja=null),dl.forEach(Q_),pl.forEach(Q_)}function uc(e,a){e.blockedOn===a&&(e.blockedOn=null,md||(md=!0,i.unstable_scheduleCallback(i.unstable_NormalPriority,aA)))}var cc=null;function $_(e){cc!==e&&(cc=e,i.unstable_scheduleCallback(i.unstable_NormalPriority,function(){cc===e&&(cc=null);for(var a=0;a<e.length;a+=3){var s=e[a],l=e[a+1],h=e[a+2];if(typeof l!="function"){if(pd(l||s)===null)continue;break}var g=La(s);g!==null&&(e.splice(a,3),a-=3,ph(g,{pending:!0,data:h,method:s.method,action:l},l,h))}}))}function gl(e){function a(B){return uc(B,e)}Qa!==null&&uc(Qa,e),$a!==null&&uc($a,e),Ja!==null&&uc(Ja,e),dl.forEach(a),pl.forEach(a);for(var s=0;s<tr.length;s++){var l=tr[s];l.blockedOn===e&&(l.blockedOn=null)}for(;0<tr.length&&(s=tr[0],s.blockedOn===null);)Z_(s),s.blockedOn===null&&tr.shift();if(s=(e.ownerDocument||e).$$reactFormReplay,s!=null)for(l=0;l<s.length;l+=3){var h=s[l],g=s[l+1],M=h[Je]||null;if(typeof g=="function")M||$_(s);else if(M){var A=null;if(g&&g.hasAttribute("formAction")){if(h=g,M=g[Je]||null)A=M.formAction;else if(pd(h)!==null)continue}else A=M.action;typeof A=="function"?s[l+1]=A:(s.splice(l,3),l-=3),$_(s)}}}function gd(e){this._internalRoot=e}fc.prototype.render=gd.prototype.render=function(e){var a=this._internalRoot;if(a===null)throw Error(r(409));var s=a.current,l=ri();W_(s,l,e,a,null,null)},fc.prototype.unmount=gd.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var a=e.containerInfo;W_(e.current,2,null,e,null,null),qu(),a[zi]=null}};function fc(e){this._internalRoot=e}fc.prototype.unstable_scheduleHydration=function(e){if(e){var a=Ee();e={blockedOn:null,target:e,priority:a};for(var s=0;s<tr.length&&a!==0&&a<tr[s].priority;s++);tr.splice(s,0,e),s===0&&Z_(e)}};var J_=t.version;if(J_!=="19.1.1")throw Error(r(527,J_,"19.1.1"));q.findDOMNode=function(e){var a=e._reactInternals;if(a===void 0)throw typeof e.render=="function"?Error(r(188)):(e=Object.keys(e).join(","),Error(r(268,e)));return e=p(a),e=e!==null?d(e):null,e=e===null?null:e.stateNode,e};var rA={bundleType:0,version:"19.1.1",rendererPackageName:"react-dom",currentDispatcherRef:I,reconcilerVersion:"19.1.1"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var hc=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!hc.isDisabled&&hc.supportsFiber)try{ft=hc.inject(rA),mt=hc}catch{}}return El.createRoot=function(e,a){if(!o(e))throw Error(r(299));var s=!1,l="",h=m0,g=g0,M=v0,A=null;return a!=null&&(a.unstable_strictMode===!0&&(s=!0),a.identifierPrefix!==void 0&&(l=a.identifierPrefix),a.onUncaughtError!==void 0&&(h=a.onUncaughtError),a.onCaughtError!==void 0&&(g=a.onCaughtError),a.onRecoverableError!==void 0&&(M=a.onRecoverableError),a.unstable_transitionCallbacks!==void 0&&(A=a.unstable_transitionCallbacks)),a=k_(e,1,!1,null,null,s,l,h,g,M,A,null),e[zi]=a.current,$h(e),new gd(a)},El.hydrateRoot=function(e,a,s){if(!o(e))throw Error(r(299));var l=!1,h="",g=m0,M=g0,A=v0,B=null,$=null;return s!=null&&(s.unstable_strictMode===!0&&(l=!0),s.identifierPrefix!==void 0&&(h=s.identifierPrefix),s.onUncaughtError!==void 0&&(g=s.onUncaughtError),s.onCaughtError!==void 0&&(M=s.onCaughtError),s.onRecoverableError!==void 0&&(A=s.onRecoverableError),s.unstable_transitionCallbacks!==void 0&&(B=s.unstable_transitionCallbacks),s.formState!==void 0&&($=s.formState)),a=k_(e,1,!0,a,s??null,l,h,g,M,A,B,$),a.context=X_(null),s=a.current,l=ri(),l=se(l),h=Fa(l),h.callback=null,Ia(s,h,l),s=l,a.current.lanes=s,Ft(a,s),Wi(a),e[zi]=a.current,$h(e),new fc(a)},El.version="19.1.1",El}var ox;function TD(){if(ox)return $d.exports;ox=1;function i(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(i)}catch(t){console.error(t)}}return i(),$d.exports=ED(),$d.exports}var bD=TD(),Q=km();/**
 * react-router v7.8.2
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */var lx="popstate";function AD(i={}){function t(r,o){let{pathname:u,search:c,hash:f}=r.location;return cm("",{pathname:u,search:c,hash:f},o.state&&o.state.usr||null,o.state&&o.state.key||"default")}function n(r,o){return typeof o=="string"?o:Il(o)}return CD(t,n,null,i)}function $e(i,t){if(i===!1||i===null||typeof i>"u")throw new Error(t)}function Ji(i,t){if(!i){typeof console<"u"&&console.warn(t);try{throw new Error(t)}catch{}}}function RD(){return Math.random().toString(36).substring(2,10)}function ux(i,t){return{usr:i.state,key:i.key,idx:t}}function cm(i,t,n=null,r){return{pathname:typeof i=="string"?i:i.pathname,search:"",hash:"",...typeof t=="string"?_o(t):t,state:n,key:t&&t.key||r||RD()}}function Il({pathname:i="/",search:t="",hash:n=""}){return t&&t!=="?"&&(i+=t.charAt(0)==="?"?t:"?"+t),n&&n!=="#"&&(i+=n.charAt(0)==="#"?n:"#"+n),i}function _o(i){let t={};if(i){let n=i.indexOf("#");n>=0&&(t.hash=i.substring(n),i=i.substring(0,n));let r=i.indexOf("?");r>=0&&(t.search=i.substring(r),i=i.substring(0,r)),i&&(t.pathname=i)}return t}function CD(i,t,n,r={}){let{window:o=document.defaultView,v5Compat:u=!1}=r,c=o.history,f="POP",p=null,d=m();d==null&&(d=0,c.replaceState({...c.state,idx:d},""));function m(){return(c.state||{idx:null}).idx}function v(){f="POP";let S=m(),y=S==null?null:S-d;d=S,p&&p({action:f,location:T.location,delta:y})}function _(S,y){f="PUSH";let w=cm(T.location,S,y);d=m()+1;let C=ux(w,d),D=T.createHref(w);try{c.pushState(C,"",D)}catch(N){if(N instanceof DOMException&&N.name==="DataCloneError")throw N;o.location.assign(D)}u&&p&&p({action:f,location:T.location,delta:1})}function x(S,y){f="REPLACE";let w=cm(T.location,S,y);d=m();let C=ux(w,d),D=T.createHref(w);c.replaceState(C,"",D),u&&p&&p({action:f,location:T.location,delta:0})}function E(S){return wD(S)}let T={get action(){return f},get location(){return i(o,c)},listen(S){if(p)throw new Error("A history only accepts one active listener");return o.addEventListener(lx,v),p=S,()=>{o.removeEventListener(lx,v),p=null}},createHref(S){return t(o,S)},createURL:E,encodeLocation(S){let y=E(S);return{pathname:y.pathname,search:y.search,hash:y.hash}},push:_,replace:x,go(S){return c.go(S)}};return T}function wD(i,t=!1){let n="http://localhost";typeof window<"u"&&(n=window.location.origin!=="null"?window.location.origin:window.location.href),$e(n,"No window.location.(origin|href) available to create URL");let r=typeof i=="string"?i:Il(i);return r=r.replace(/ $/,"%20"),!t&&r.startsWith("//")&&(r=n+r),new URL(r,n)}function uM(i,t,n="/"){return DD(i,t,n,!1)}function DD(i,t,n,r){let o=typeof t=="string"?_o(t):t,u=Ra(o.pathname||"/",n);if(u==null)return null;let c=cM(i);UD(c);let f=null;for(let p=0;f==null&&p<c.length;++p){let d=GD(u);f=VD(c[p],d,r)}return f}function cM(i,t=[],n=[],r="",o=!1){let u=(c,f,p=o,d)=>{let m={relativePath:d===void 0?c.path||"":d,caseSensitive:c.caseSensitive===!0,childrenIndex:f,route:c};if(m.relativePath.startsWith("/")){if(!m.relativePath.startsWith(r)&&p)return;$e(m.relativePath.startsWith(r),`Absolute route path "${m.relativePath}" nested under path "${r}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`),m.relativePath=m.relativePath.slice(r.length)}let v=Ta([r,m.relativePath]),_=n.concat(m);c.children&&c.children.length>0&&($e(c.index!==!0,`Index routes must not have child routes. Please remove all child routes from route path "${v}".`),cM(c.children,t,_,v,p)),!(c.path==null&&!c.index)&&t.push({path:v,score:ID(v,c.index),routesMeta:_})};return i.forEach((c,f)=>{if(c.path===""||!c.path?.includes("?"))u(c,f);else for(let p of fM(c.path))u(c,f,!0,p)}),t}function fM(i){let t=i.split("/");if(t.length===0)return[];let[n,...r]=t,o=n.endsWith("?"),u=n.replace(/\?$/,"");if(r.length===0)return o?[u,""]:[u];let c=fM(r.join("/")),f=[];return f.push(...c.map(p=>p===""?u:[u,p].join("/"))),o&&f.push(...c),f.map(p=>i.startsWith("/")&&p===""?"/":p)}function UD(i){i.sort((t,n)=>t.score!==n.score?n.score-t.score:zD(t.routesMeta.map(r=>r.childrenIndex),n.routesMeta.map(r=>r.childrenIndex)))}var LD=/^:[\w-]+$/,PD=3,ND=2,OD=1,BD=10,FD=-2,cx=i=>i==="*";function ID(i,t){let n=i.split("/"),r=n.length;return n.some(cx)&&(r+=FD),t&&(r+=ND),n.filter(o=>!cx(o)).reduce((o,u)=>o+(LD.test(u)?PD:u===""?OD:BD),r)}function zD(i,t){return i.length===t.length&&i.slice(0,-1).every((r,o)=>r===t[o])?i[i.length-1]-t[t.length-1]:0}function VD(i,t,n=!1){let{routesMeta:r}=i,o={},u="/",c=[];for(let f=0;f<r.length;++f){let p=r[f],d=f===r.length-1,m=u==="/"?t:t.slice(u.length)||"/",v=ef({path:p.relativePath,caseSensitive:p.caseSensitive,end:d},m),_=p.route;if(!v&&d&&n&&!r[r.length-1].route.index&&(v=ef({path:p.relativePath,caseSensitive:p.caseSensitive,end:!1},m)),!v)return null;Object.assign(o,v.params),c.push({params:o,pathname:Ta([u,v.pathname]),pathnameBase:qD(Ta([u,v.pathnameBase])),route:_}),v.pathnameBase!=="/"&&(u=Ta([u,v.pathnameBase]))}return c}function ef(i,t){typeof i=="string"&&(i={path:i,caseSensitive:!1,end:!0});let[n,r]=HD(i.path,i.caseSensitive,i.end),o=t.match(n);if(!o)return null;let u=o[0],c=u.replace(/(.)\/+$/,"$1"),f=o.slice(1);return{params:r.reduce((d,{paramName:m,isOptional:v},_)=>{if(m==="*"){let E=f[_]||"";c=u.slice(0,u.length-E.length).replace(/(.)\/+$/,"$1")}const x=f[_];return v&&!x?d[m]=void 0:d[m]=(x||"").replace(/%2F/g,"/"),d},{}),pathname:u,pathnameBase:c,pattern:i}}function HD(i,t=!1,n=!0){Ji(i==="*"||!i.endsWith("*")||i.endsWith("/*"),`Route path "${i}" will be treated as if it were "${i.replace(/\*$/,"/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${i.replace(/\*$/,"/*")}".`);let r=[],o="^"+i.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(c,f,p)=>(r.push({paramName:f,isOptional:p!=null}),p?"/?([^\\/]+)?":"/([^\\/]+)")).replace(/\/([\w-]+)\?(\/|$)/g,"(/$1)?$2");return i.endsWith("*")?(r.push({paramName:"*"}),o+=i==="*"||i==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):n?o+="\\/*$":i!==""&&i!=="/"&&(o+="(?:(?=\\/|$))"),[new RegExp(o,t?void 0:"i"),r]}function GD(i){try{return i.split("/").map(t=>decodeURIComponent(t).replace(/\//g,"%2F")).join("/")}catch(t){return Ji(!1,`The URL path "${i}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${t}).`),i}}function Ra(i,t){if(t==="/")return i;if(!i.toLowerCase().startsWith(t.toLowerCase()))return null;let n=t.endsWith("/")?t.length-1:t.length,r=i.charAt(n);return r&&r!=="/"?null:i.slice(n)||"/"}function kD(i,t="/"){let{pathname:n,search:r="",hash:o=""}=typeof i=="string"?_o(i):i;return{pathname:n?n.startsWith("/")?n:XD(n,t):t,search:YD(r),hash:jD(o)}}function XD(i,t){let n=t.replace(/\/+$/,"").split("/");return i.split("/").forEach(o=>{o===".."?n.length>1&&n.pop():o!=="."&&n.push(o)}),n.length>1?n.join("/"):"/"}function ip(i,t,n,r){return`Cannot include a '${i}' character in a manually specified \`to.${t}\` field [${JSON.stringify(r)}].  Please separate it out to the \`to.${n}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`}function WD(i){return i.filter((t,n)=>n===0||t.route.path&&t.route.path.length>0)}function hM(i){let t=WD(i);return t.map((n,r)=>r===t.length-1?n.pathname:n.pathnameBase)}function dM(i,t,n,r=!1){let o;typeof i=="string"?o=_o(i):(o={...i},$e(!o.pathname||!o.pathname.includes("?"),ip("?","pathname","search",o)),$e(!o.pathname||!o.pathname.includes("#"),ip("#","pathname","hash",o)),$e(!o.search||!o.search.includes("#"),ip("#","search","hash",o)));let u=i===""||o.pathname==="",c=u?"/":o.pathname,f;if(c==null)f=n;else{let v=t.length-1;if(!r&&c.startsWith("..")){let _=c.split("/");for(;_[0]==="..";)_.shift(),v-=1;o.pathname=_.join("/")}f=v>=0?t[v]:"/"}let p=kD(o,f),d=c&&c!=="/"&&c.endsWith("/"),m=(u||c===".")&&n.endsWith("/");return!p.pathname.endsWith("/")&&(d||m)&&(p.pathname+="/"),p}var Ta=i=>i.join("/").replace(/\/\/+/g,"/"),qD=i=>i.replace(/\/+$/,"").replace(/^\/*/,"/"),YD=i=>!i||i==="?"?"":i.startsWith("?")?i:"?"+i,jD=i=>!i||i==="#"?"":i.startsWith("#")?i:"#"+i;function KD(i){return i!=null&&typeof i.status=="number"&&typeof i.statusText=="string"&&typeof i.internal=="boolean"&&"data"in i}var pM=["POST","PUT","PATCH","DELETE"];new Set(pM);var ZD=["GET",...pM];new Set(ZD);var yo=Q.createContext(null);yo.displayName="DataRouter";var ff=Q.createContext(null);ff.displayName="DataRouterState";Q.createContext(!1);var mM=Q.createContext({isTransitioning:!1});mM.displayName="ViewTransition";var QD=Q.createContext(new Map);QD.displayName="Fetchers";var $D=Q.createContext(null);$D.displayName="Await";var ta=Q.createContext(null);ta.displayName="Navigation";var Ql=Q.createContext(null);Ql.displayName="Location";var Da=Q.createContext({outlet:null,matches:[],isDataRoute:!1});Da.displayName="Route";var Xm=Q.createContext(null);Xm.displayName="RouteError";function JD(i,{relative:t}={}){$e($l(),"useHref() may be used only in the context of a <Router> component.");let{basename:n,navigator:r}=Q.useContext(ta),{hash:o,pathname:u,search:c}=Jl(i,{relative:t}),f=u;return n!=="/"&&(f=u==="/"?n:Ta([n,u])),r.createHref({pathname:f,search:c,hash:o})}function $l(){return Q.useContext(Ql)!=null}function Ua(){return $e($l(),"useLocation() may be used only in the context of a <Router> component."),Q.useContext(Ql).location}var gM="You should call navigate() in a React.useEffect(), not when your component is first rendered.";function vM(i){Q.useContext(ta).static||Q.useLayoutEffect(i)}function tU(){let{isDataRoute:i}=Q.useContext(Da);return i?dU():eU()}function eU(){$e($l(),"useNavigate() may be used only in the context of a <Router> component.");let i=Q.useContext(yo),{basename:t,navigator:n}=Q.useContext(ta),{matches:r}=Q.useContext(Da),{pathname:o}=Ua(),u=JSON.stringify(hM(r)),c=Q.useRef(!1);return vM(()=>{c.current=!0}),Q.useCallback((p,d={})=>{if(Ji(c.current,gM),!c.current)return;if(typeof p=="number"){n.go(p);return}let m=dM(p,JSON.parse(u),o,d.relative==="path");i==null&&t!=="/"&&(m.pathname=m.pathname==="/"?t:Ta([t,m.pathname])),(d.replace?n.replace:n.push)(m,d.state,d)},[t,n,u,o,i])}Q.createContext(null);function Jl(i,{relative:t}={}){let{matches:n}=Q.useContext(Da),{pathname:r}=Ua(),o=JSON.stringify(hM(n));return Q.useMemo(()=>dM(i,JSON.parse(o),r,t==="path"),[i,o,r,t])}function nU(i,t){return _M(i,t)}function _M(i,t,n,r,o){$e($l(),"useRoutes() may be used only in the context of a <Router> component.");let{navigator:u}=Q.useContext(ta),{matches:c}=Q.useContext(Da),f=c[c.length-1],p=f?f.params:{},d=f?f.pathname:"/",m=f?f.pathnameBase:"/",v=f&&f.route;{let w=v&&v.path||"";yM(d,!v||w.endsWith("*")||w.endsWith("*?"),`You rendered descendant <Routes> (or called \`useRoutes()\`) at "${d}" (under <Route path="${w}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${w}"> to <Route path="${w==="/"?"*":`${w}/*`}">.`)}let _=Ua(),x;if(t){let w=typeof t=="string"?_o(t):t;$e(m==="/"||w.pathname?.startsWith(m),`When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${m}" but pathname "${w.pathname}" was given in the \`location\` prop.`),x=w}else x=_;let E=x.pathname||"/",T=E;if(m!=="/"){let w=m.replace(/^\//,"").split("/");T="/"+E.replace(/^\//,"").split("/").slice(w.length).join("/")}let S=uM(i,{pathname:T});Ji(v||S!=null,`No routes matched location "${x.pathname}${x.search}${x.hash}" `),Ji(S==null||S[S.length-1].route.element!==void 0||S[S.length-1].route.Component!==void 0||S[S.length-1].route.lazy!==void 0,`Matched leaf route at location "${x.pathname}${x.search}${x.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`);let y=oU(S&&S.map(w=>Object.assign({},w,{params:Object.assign({},p,w.params),pathname:Ta([m,u.encodeLocation?u.encodeLocation(w.pathname).pathname:w.pathname]),pathnameBase:w.pathnameBase==="/"?m:Ta([m,u.encodeLocation?u.encodeLocation(w.pathnameBase).pathname:w.pathnameBase])})),c,n,r,o);return t&&y?Q.createElement(Ql.Provider,{value:{location:{pathname:"/",search:"",hash:"",state:null,key:"default",...x},navigationType:"POP"}},y):y}function iU(){let i=hU(),t=KD(i)?`${i.status} ${i.statusText}`:i instanceof Error?i.message:JSON.stringify(i),n=i instanceof Error?i.stack:null,r="rgba(200,200,200, 0.5)",o={padding:"0.5rem",backgroundColor:r},u={padding:"2px 4px",backgroundColor:r},c=null;return console.error("Error handled by React Router default ErrorBoundary:",i),c=Q.createElement(Q.Fragment,null,Q.createElement("p",null,"💿 Hey developer 👋"),Q.createElement("p",null,"You can provide a way better UX than this when your app throws errors by providing your own ",Q.createElement("code",{style:u},"ErrorBoundary")," or"," ",Q.createElement("code",{style:u},"errorElement")," prop on your route.")),Q.createElement(Q.Fragment,null,Q.createElement("h2",null,"Unexpected Application Error!"),Q.createElement("h3",{style:{fontStyle:"italic"}},t),n?Q.createElement("pre",{style:o},n):null,c)}var aU=Q.createElement(iU,null),rU=class extends Q.Component{constructor(i){super(i),this.state={location:i.location,revalidation:i.revalidation,error:i.error}}static getDerivedStateFromError(i){return{error:i}}static getDerivedStateFromProps(i,t){return t.location!==i.location||t.revalidation!=="idle"&&i.revalidation==="idle"?{error:i.error,location:i.location,revalidation:i.revalidation}:{error:i.error!==void 0?i.error:t.error,location:t.location,revalidation:i.revalidation||t.revalidation}}componentDidCatch(i,t){this.props.unstable_onError?this.props.unstable_onError(i,t):console.error("React Router caught the following error during render",i)}render(){return this.state.error!==void 0?Q.createElement(Da.Provider,{value:this.props.routeContext},Q.createElement(Xm.Provider,{value:this.state.error,children:this.props.component})):this.props.children}};function sU({routeContext:i,match:t,children:n}){let r=Q.useContext(yo);return r&&r.static&&r.staticContext&&(t.route.errorElement||t.route.ErrorBoundary)&&(r.staticContext._deepestRenderedBoundaryId=t.route.id),Q.createElement(Da.Provider,{value:i},n)}function oU(i,t=[],n=null,r=null,o=null){if(i==null){if(!n)return null;if(n.errors)i=n.matches;else if(t.length===0&&!n.initialized&&n.matches.length>0)i=n.matches;else return null}let u=i,c=n?.errors;if(c!=null){let d=u.findIndex(m=>m.route.id&&c?.[m.route.id]!==void 0);$e(d>=0,`Could not find a matching route for errors on route IDs: ${Object.keys(c).join(",")}`),u=u.slice(0,Math.min(u.length,d+1))}let f=!1,p=-1;if(n)for(let d=0;d<u.length;d++){let m=u[d];if((m.route.HydrateFallback||m.route.hydrateFallbackElement)&&(p=d),m.route.id){let{loaderData:v,errors:_}=n,x=m.route.loader&&!v.hasOwnProperty(m.route.id)&&(!_||_[m.route.id]===void 0);if(m.route.lazy||x){f=!0,p>=0?u=u.slice(0,p+1):u=[u[0]];break}}}return u.reduceRight((d,m,v)=>{let _,x=!1,E=null,T=null;n&&(_=c&&m.route.id?c[m.route.id]:void 0,E=m.route.errorElement||aU,f&&(p<0&&v===0?(yM("route-fallback",!1,"No `HydrateFallback` element provided to render during initial hydration"),x=!0,T=null):p===v&&(x=!0,T=m.route.hydrateFallbackElement||null)));let S=t.concat(u.slice(0,v+1)),y=()=>{let w;return _?w=E:x?w=T:m.route.Component?w=Q.createElement(m.route.Component,null):m.route.element?w=m.route.element:w=d,Q.createElement(sU,{match:m,routeContext:{outlet:d,matches:S,isDataRoute:n!=null},children:w})};return n&&(m.route.ErrorBoundary||m.route.errorElement||v===0)?Q.createElement(rU,{location:n.location,revalidation:n.revalidation,component:E,error:_,children:y(),routeContext:{outlet:null,matches:S,isDataRoute:!0},unstable_onError:r}):y()},null)}function Wm(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function lU(i){let t=Q.useContext(yo);return $e(t,Wm(i)),t}function uU(i){let t=Q.useContext(ff);return $e(t,Wm(i)),t}function cU(i){let t=Q.useContext(Da);return $e(t,Wm(i)),t}function qm(i){let t=cU(i),n=t.matches[t.matches.length-1];return $e(n.route.id,`${i} can only be used on routes that contain a unique "id"`),n.route.id}function fU(){return qm("useRouteId")}function hU(){let i=Q.useContext(Xm),t=uU("useRouteError"),n=qm("useRouteError");return i!==void 0?i:t.errors?.[n]}function dU(){let{router:i}=lU("useNavigate"),t=qm("useNavigate"),n=Q.useRef(!1);return vM(()=>{n.current=!0}),Q.useCallback(async(o,u={})=>{Ji(n.current,gM),n.current&&(typeof o=="number"?i.navigate(o):await i.navigate(o,{fromRouteId:t,...u}))},[i,t])}var fx={};function yM(i,t,n){!t&&!fx[i]&&(fx[i]=!0,Ji(!1,n))}Q.memo(pU);function pU({routes:i,future:t,state:n,unstable_onError:r}){return _M(i,void 0,n,r,t)}function Wc(i){$e(!1,"A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.")}function mU({basename:i="/",children:t=null,location:n,navigationType:r="POP",navigator:o,static:u=!1}){$e(!$l(),"You cannot render a <Router> inside another <Router>. You should never have more than one in your app.");let c=i.replace(/^\/*/,"/"),f=Q.useMemo(()=>({basename:c,navigator:o,static:u,future:{}}),[c,o,u]);typeof n=="string"&&(n=_o(n));let{pathname:p="/",search:d="",hash:m="",state:v=null,key:_="default"}=n,x=Q.useMemo(()=>{let E=Ra(p,c);return E==null?null:{location:{pathname:E,search:d,hash:m,state:v,key:_},navigationType:r}},[c,p,d,m,v,_,r]);return Ji(x!=null,`<Router basename="${c}"> is not able to match the URL "${p}${d}${m}" because it does not start with the basename, so the <Router> won't render anything.`),x==null?null:Q.createElement(ta.Provider,{value:f},Q.createElement(Ql.Provider,{children:t,value:x}))}function gU({children:i,location:t}){return nU(fm(i),t)}function fm(i,t=[]){let n=[];return Q.Children.forEach(i,(r,o)=>{if(!Q.isValidElement(r))return;let u=[...t,o];if(r.type===Q.Fragment){n.push.apply(n,fm(r.props.children,u));return}$e(r.type===Wc,`[${typeof r.type=="string"?r.type:r.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`),$e(!r.props.index||!r.props.children,"An index route cannot have child routes.");let c={id:r.props.id||u.join("-"),caseSensitive:r.props.caseSensitive,element:r.props.element,Component:r.props.Component,index:r.props.index,path:r.props.path,loader:r.props.loader,action:r.props.action,hydrateFallbackElement:r.props.hydrateFallbackElement,HydrateFallback:r.props.HydrateFallback,errorElement:r.props.errorElement,ErrorBoundary:r.props.ErrorBoundary,hasErrorBoundary:r.props.hasErrorBoundary===!0||r.props.ErrorBoundary!=null||r.props.errorElement!=null,shouldRevalidate:r.props.shouldRevalidate,handle:r.props.handle,lazy:r.props.lazy};r.props.children&&(c.children=fm(r.props.children,u)),n.push(c)}),n}var qc="get",Yc="application/x-www-form-urlencoded";function hf(i){return i!=null&&typeof i.tagName=="string"}function vU(i){return hf(i)&&i.tagName.toLowerCase()==="button"}function _U(i){return hf(i)&&i.tagName.toLowerCase()==="form"}function yU(i){return hf(i)&&i.tagName.toLowerCase()==="input"}function xU(i){return!!(i.metaKey||i.altKey||i.ctrlKey||i.shiftKey)}function SU(i,t){return i.button===0&&(!t||t==="_self")&&!xU(i)}var Bc=null;function MU(){if(Bc===null)try{new FormData(document.createElement("form"),0),Bc=!1}catch{Bc=!0}return Bc}var EU=new Set(["application/x-www-form-urlencoded","multipart/form-data","text/plain"]);function ap(i){return i!=null&&!EU.has(i)?(Ji(!1,`"${i}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${Yc}"`),null):i}function TU(i,t){let n,r,o,u,c;if(_U(i)){let f=i.getAttribute("action");r=f?Ra(f,t):null,n=i.getAttribute("method")||qc,o=ap(i.getAttribute("enctype"))||Yc,u=new FormData(i)}else if(vU(i)||yU(i)&&(i.type==="submit"||i.type==="image")){let f=i.form;if(f==null)throw new Error('Cannot submit a <button> or <input type="submit"> without a <form>');let p=i.getAttribute("formaction")||f.getAttribute("action");if(r=p?Ra(p,t):null,n=i.getAttribute("formmethod")||f.getAttribute("method")||qc,o=ap(i.getAttribute("formenctype"))||ap(f.getAttribute("enctype"))||Yc,u=new FormData(f,i),!MU()){let{name:d,type:m,value:v}=i;if(m==="image"){let _=d?`${d}.`:"";u.append(`${_}x`,"0"),u.append(`${_}y`,"0")}else d&&u.append(d,v)}}else{if(hf(i))throw new Error('Cannot submit element that is not <form>, <button>, or <input type="submit|image">');n=qc,r=null,o=Yc,c=i}return u&&o==="text/plain"&&(c=u,u=void 0),{action:r,method:n.toLowerCase(),encType:o,formData:u,body:c}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");function Ym(i,t){if(i===!1||i===null||typeof i>"u")throw new Error(t)}function bU(i,t,n){let r=typeof i=="string"?new URL(i,typeof window>"u"?"server://singlefetch/":window.location.origin):i;return r.pathname==="/"?r.pathname=`_root.${n}`:t&&Ra(r.pathname,t)==="/"?r.pathname=`${t.replace(/\/$/,"")}/_root.${n}`:r.pathname=`${r.pathname.replace(/\/$/,"")}.${n}`,r}async function AU(i,t){if(i.id in t)return t[i.id];try{let n=await import(i.module);return t[i.id]=n,n}catch(n){return console.error(`Error loading route module \`${i.module}\`, reloading page...`),console.error(n),window.__reactRouterContext&&window.__reactRouterContext.isSpaMode,window.location.reload(),new Promise(()=>{})}}function RU(i){return i==null?!1:i.href==null?i.rel==="preload"&&typeof i.imageSrcSet=="string"&&typeof i.imageSizes=="string":typeof i.rel=="string"&&typeof i.href=="string"}async function CU(i,t,n){let r=await Promise.all(i.map(async o=>{let u=t.routes[o.route.id];if(u){let c=await AU(u,n);return c.links?c.links():[]}return[]}));return LU(r.flat(1).filter(RU).filter(o=>o.rel==="stylesheet"||o.rel==="preload").map(o=>o.rel==="stylesheet"?{...o,rel:"prefetch",as:"style"}:{...o,rel:"prefetch"}))}function hx(i,t,n,r,o,u){let c=(p,d)=>n[d]?p.route.id!==n[d].route.id:!0,f=(p,d)=>n[d].pathname!==p.pathname||n[d].route.path?.endsWith("*")&&n[d].params["*"]!==p.params["*"];return u==="assets"?t.filter((p,d)=>c(p,d)||f(p,d)):u==="data"?t.filter((p,d)=>{let m=r.routes[p.route.id];if(!m||!m.hasLoader)return!1;if(c(p,d)||f(p,d))return!0;if(p.route.shouldRevalidate){let v=p.route.shouldRevalidate({currentUrl:new URL(o.pathname+o.search+o.hash,window.origin),currentParams:n[0]?.params||{},nextUrl:new URL(i,window.origin),nextParams:p.params,defaultShouldRevalidate:!0});if(typeof v=="boolean")return v}return!0}):[]}function wU(i,t,{includeHydrateFallback:n}={}){return DU(i.map(r=>{let o=t.routes[r.route.id];if(!o)return[];let u=[o.module];return o.clientActionModule&&(u=u.concat(o.clientActionModule)),o.clientLoaderModule&&(u=u.concat(o.clientLoaderModule)),n&&o.hydrateFallbackModule&&(u=u.concat(o.hydrateFallbackModule)),o.imports&&(u=u.concat(o.imports)),u}).flat(1))}function DU(i){return[...new Set(i)]}function UU(i){let t={},n=Object.keys(i).sort();for(let r of n)t[r]=i[r];return t}function LU(i,t){let n=new Set;return new Set(t),i.reduce((r,o)=>{let u=JSON.stringify(UU(o));return n.has(u)||(n.add(u),r.push({key:u,link:o})),r},[])}function xM(){let i=Q.useContext(yo);return Ym(i,"You must render this element inside a <DataRouterContext.Provider> element"),i}function PU(){let i=Q.useContext(ff);return Ym(i,"You must render this element inside a <DataRouterStateContext.Provider> element"),i}var jm=Q.createContext(void 0);jm.displayName="FrameworkContext";function SM(){let i=Q.useContext(jm);return Ym(i,"You must render this element inside a <HydratedRouter> element"),i}function NU(i,t){let n=Q.useContext(jm),[r,o]=Q.useState(!1),[u,c]=Q.useState(!1),{onFocus:f,onBlur:p,onMouseEnter:d,onMouseLeave:m,onTouchStart:v}=t,_=Q.useRef(null);Q.useEffect(()=>{if(i==="render"&&c(!0),i==="viewport"){let T=y=>{y.forEach(w=>{c(w.isIntersecting)})},S=new IntersectionObserver(T,{threshold:.5});return _.current&&S.observe(_.current),()=>{S.disconnect()}}},[i]),Q.useEffect(()=>{if(r){let T=setTimeout(()=>{c(!0)},100);return()=>{clearTimeout(T)}}},[r]);let x=()=>{o(!0)},E=()=>{o(!1),c(!1)};return n?i!=="intent"?[u,_,{}]:[u,_,{onFocus:Tl(f,x),onBlur:Tl(p,E),onMouseEnter:Tl(d,x),onMouseLeave:Tl(m,E),onTouchStart:Tl(v,x)}]:[!1,_,{}]}function Tl(i,t){return n=>{i&&i(n),n.defaultPrevented||t(n)}}function OU({page:i,...t}){let{router:n}=xM(),r=Q.useMemo(()=>uM(n.routes,i,n.basename),[n.routes,i,n.basename]);return r?Q.createElement(FU,{page:i,matches:r,...t}):null}function BU(i){let{manifest:t,routeModules:n}=SM(),[r,o]=Q.useState([]);return Q.useEffect(()=>{let u=!1;return CU(i,t,n).then(c=>{u||o(c)}),()=>{u=!0}},[i,t,n]),r}function FU({page:i,matches:t,...n}){let r=Ua(),{manifest:o,routeModules:u}=SM(),{basename:c}=xM(),{loaderData:f,matches:p}=PU(),d=Q.useMemo(()=>hx(i,t,p,o,r,"data"),[i,t,p,o,r]),m=Q.useMemo(()=>hx(i,t,p,o,r,"assets"),[i,t,p,o,r]),v=Q.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let E=new Set,T=!1;if(t.forEach(y=>{let w=o.routes[y.route.id];!w||!w.hasLoader||(!d.some(C=>C.route.id===y.route.id)&&y.route.id in f&&u[y.route.id]?.shouldRevalidate||w.hasClientLoader?T=!0:E.add(y.route.id))}),E.size===0)return[];let S=bU(i,c,"data");return T&&E.size>0&&S.searchParams.set("_routes",t.filter(y=>E.has(y.route.id)).map(y=>y.route.id).join(",")),[S.pathname+S.search]},[c,f,r,o,d,t,i,u]),_=Q.useMemo(()=>wU(m,o),[m,o]),x=BU(m);return Q.createElement(Q.Fragment,null,v.map(E=>Q.createElement("link",{key:E,rel:"prefetch",as:"fetch",href:E,...n})),_.map(E=>Q.createElement("link",{key:E,rel:"modulepreload",href:E,...n})),x.map(({key:E,link:T})=>Q.createElement("link",{key:E,nonce:n.nonce,...T})))}function IU(...i){return t=>{i.forEach(n=>{typeof n=="function"?n(t):n!=null&&(n.current=t)})}}var MM=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";try{MM&&(window.__reactRouterVersion="7.8.2")}catch{}function zU({basename:i,children:t,window:n}){let r=Q.useRef();r.current==null&&(r.current=AD({window:n,v5Compat:!0}));let o=r.current,[u,c]=Q.useState({action:o.action,location:o.location}),f=Q.useCallback(p=>{Q.startTransition(()=>c(p))},[c]);return Q.useLayoutEffect(()=>o.listen(f),[o,f]),Q.createElement(mU,{basename:i,children:t,location:u.location,navigationType:u.action,navigator:o})}var EM=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,Km=Q.forwardRef(function({onClick:t,discover:n="render",prefetch:r="none",relative:o,reloadDocument:u,replace:c,state:f,target:p,to:d,preventScrollReset:m,viewTransition:v,..._},x){let{basename:E}=Q.useContext(ta),T=typeof d=="string"&&EM.test(d),S,y=!1;if(typeof d=="string"&&T&&(S=d,MM))try{let U=new URL(window.location.href),L=d.startsWith("//")?new URL(U.protocol+d):new URL(d),G=Ra(L.pathname,E);L.origin===U.origin&&G!=null?d=G+L.search+L.hash:y=!0}catch{Ji(!1,`<Link to="${d}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`)}let w=JD(d,{relative:o}),[C,D,N]=NU(r,_),F=kU(d,{replace:c,state:f,target:p,preventScrollReset:m,relative:o,viewTransition:v});function z(U){t&&t(U),U.defaultPrevented||F(U)}let H=Q.createElement("a",{..._,...N,href:S||w,onClick:y||u?t:z,ref:IU(x,D),target:p,"data-discover":!T&&n==="render"?"true":void 0});return C&&!T?Q.createElement(Q.Fragment,null,H,Q.createElement(OU,{page:w})):H});Km.displayName="Link";var VU=Q.forwardRef(function({"aria-current":t="page",caseSensitive:n=!1,className:r="",end:o=!1,style:u,to:c,viewTransition:f,children:p,...d},m){let v=Jl(c,{relative:d.relative}),_=Ua(),x=Q.useContext(ff),{navigator:E,basename:T}=Q.useContext(ta),S=x!=null&&jU(v)&&f===!0,y=E.encodeLocation?E.encodeLocation(v).pathname:v.pathname,w=_.pathname,C=x&&x.navigation&&x.navigation.location?x.navigation.location.pathname:null;n||(w=w.toLowerCase(),C=C?C.toLowerCase():null,y=y.toLowerCase()),C&&T&&(C=Ra(C,T)||C);const D=y!=="/"&&y.endsWith("/")?y.length-1:y.length;let N=w===y||!o&&w.startsWith(y)&&w.charAt(D)==="/",F=C!=null&&(C===y||!o&&C.startsWith(y)&&C.charAt(y.length)==="/"),z={isActive:N,isPending:F,isTransitioning:S},H=N?t:void 0,U;typeof r=="function"?U=r(z):U=[r,N?"active":null,F?"pending":null,S?"transitioning":null].filter(Boolean).join(" ");let L=typeof u=="function"?u(z):u;return Q.createElement(Km,{...d,"aria-current":H,className:U,ref:m,style:L,to:c,viewTransition:f},typeof p=="function"?p(z):p)});VU.displayName="NavLink";var HU=Q.forwardRef(({discover:i="render",fetcherKey:t,navigate:n,reloadDocument:r,replace:o,state:u,method:c=qc,action:f,onSubmit:p,relative:d,preventScrollReset:m,viewTransition:v,..._},x)=>{let E=qU(),T=YU(f,{relative:d}),S=c.toLowerCase()==="get"?"get":"post",y=typeof f=="string"&&EM.test(f),w=C=>{if(p&&p(C),C.defaultPrevented)return;C.preventDefault();let D=C.nativeEvent.submitter,N=D?.getAttribute("formmethod")||c;E(D||C.currentTarget,{fetcherKey:t,method:N,navigate:n,replace:o,state:u,relative:d,preventScrollReset:m,viewTransition:v})};return Q.createElement("form",{ref:x,method:S,action:T,onSubmit:r?p:w,..._,"data-discover":!y&&i==="render"?"true":void 0})});HU.displayName="Form";function GU(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function TM(i){let t=Q.useContext(yo);return $e(t,GU(i)),t}function kU(i,{target:t,replace:n,state:r,preventScrollReset:o,relative:u,viewTransition:c}={}){let f=tU(),p=Ua(),d=Jl(i,{relative:u});return Q.useCallback(m=>{if(SU(m,t)){m.preventDefault();let v=n!==void 0?n:Il(p)===Il(d);f(i,{replace:v,state:r,preventScrollReset:o,relative:u,viewTransition:c})}},[p,f,d,n,r,t,i,o,u,c])}var XU=0,WU=()=>`__${String(++XU)}__`;function qU(){let{router:i}=TM("useSubmit"),{basename:t}=Q.useContext(ta),n=fU();return Q.useCallback(async(r,o={})=>{let{action:u,method:c,encType:f,formData:p,body:d}=TU(r,t);if(o.navigate===!1){let m=o.fetcherKey||WU();await i.fetch(m,n,o.action||u,{preventScrollReset:o.preventScrollReset,formData:p,body:d,formMethod:o.method||c,formEncType:o.encType||f,flushSync:o.flushSync})}else await i.navigate(o.action||u,{preventScrollReset:o.preventScrollReset,formData:p,body:d,formMethod:o.method||c,formEncType:o.encType||f,replace:o.replace,state:o.state,fromRouteId:n,flushSync:o.flushSync,viewTransition:o.viewTransition})},[i,t,n])}function YU(i,{relative:t}={}){let{basename:n}=Q.useContext(ta),r=Q.useContext(Da);$e(r,"useFormAction must be used inside a RouteContext");let[o]=r.matches.slice(-1),u={...Jl(i||".",{relative:t})},c=Ua();if(i==null){u.search=c.search;let f=new URLSearchParams(u.search),p=f.getAll("index");if(p.some(m=>m==="")){f.delete("index"),p.filter(v=>v).forEach(v=>f.append("index",v));let m=f.toString();u.search=m?`?${m}`:""}}return(!i||i===".")&&o.route.index&&(u.search=u.search?u.search.replace(/^\?/,"?index&"):"?index"),n!=="/"&&(u.pathname=u.pathname==="/"?n:Ta([n,u.pathname])),Il(u)}function jU(i,{relative:t}={}){let n=Q.useContext(mM);$e(n!=null,"`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?");let{basename:r}=TM("useViewTransitionState"),o=Jl(i,{relative:t});if(!n.isTransitioning)return!1;let u=Ra(n.currentLocation.pathname,r)||n.currentLocation.pathname,c=Ra(n.nextLocation.pathname,r)||n.nextLocation.pathname;return ef(o.pathname,c)!=null||ef(o.pathname,u)!=null}const bM=Q.createContext({});function KU(i){const t=Q.useRef(null);return t.current===null&&(t.current=i()),t.current}const Zm=typeof window<"u",ZU=Zm?Q.useLayoutEffect:Q.useEffect,Qm=Q.createContext(null);function $m(i,t){i.indexOf(t)===-1&&i.push(t)}function Jm(i,t){const n=i.indexOf(t);n>-1&&i.splice(n,1)}const Ca=(i,t,n)=>n>t?t:n<i?i:n;let tg=()=>{};const wa={},AM=i=>/^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(i);function RM(i){return typeof i=="object"&&i!==null}const CM=i=>/^0[^.\s]+$/u.test(i);function eg(i){let t;return()=>(t===void 0&&(t=i()),t)}const Ei=i=>i,QU=(i,t)=>n=>t(i(n)),tu=(...i)=>i.reduce(QU),zl=(i,t,n)=>{const r=t-i;return r===0?1:(n-i)/r};class ng{constructor(){this.subscriptions=[]}add(t){return $m(this.subscriptions,t),()=>Jm(this.subscriptions,t)}notify(t,n,r){const o=this.subscriptions.length;if(o)if(o===1)this.subscriptions[0](t,n,r);else for(let u=0;u<o;u++){const c=this.subscriptions[u];c&&c(t,n,r)}}getSize(){return this.subscriptions.length}clear(){this.subscriptions.length=0}}const Ki=i=>i*1e3,Zi=i=>i/1e3;function wM(i,t){return t?i*(1e3/t):0}const DM=(i,t,n)=>(((1-3*n+3*t)*i+(3*n-6*t))*i+3*t)*i,$U=1e-7,JU=12;function tL(i,t,n,r,o){let u,c,f=0;do c=t+(n-t)/2,u=DM(c,r,o)-i,u>0?n=c:t=c;while(Math.abs(u)>$U&&++f<JU);return c}function eu(i,t,n,r){if(i===t&&n===r)return Ei;const o=u=>tL(u,0,1,i,n);return u=>u===0||u===1?u:DM(o(u),t,r)}const UM=i=>t=>t<=.5?i(2*t)/2:(2-i(2*(1-t)))/2,LM=i=>t=>1-i(1-t),PM=eu(.33,1.53,.69,.99),ig=LM(PM),NM=UM(ig),OM=i=>(i*=2)<1?.5*ig(i):.5*(2-Math.pow(2,-10*(i-1))),ag=i=>1-Math.sin(Math.acos(i)),BM=LM(ag),FM=UM(ag),eL=eu(.42,0,1,1),nL=eu(0,0,.58,1),IM=eu(.42,0,.58,1),iL=i=>Array.isArray(i)&&typeof i[0]!="number",zM=i=>Array.isArray(i)&&typeof i[0]=="number",aL={linear:Ei,easeIn:eL,easeInOut:IM,easeOut:nL,circIn:ag,circInOut:FM,circOut:BM,backIn:ig,backInOut:NM,backOut:PM,anticipate:OM},rL=i=>typeof i=="string",dx=i=>{if(zM(i)){tg(i.length===4);const[t,n,r,o]=i;return eu(t,n,r,o)}else if(rL(i))return aL[i];return i},Fc=["setup","read","resolveKeyframes","preUpdate","update","preRender","render","postRender"];function sL(i,t){let n=new Set,r=new Set,o=!1,u=!1;const c=new WeakSet;let f={delta:0,timestamp:0,isProcessing:!1};function p(m){c.has(m)&&(d.schedule(m),i()),m(f)}const d={schedule:(m,v=!1,_=!1)=>{const E=_&&o?n:r;return v&&c.add(m),E.has(m)||E.add(m),m},cancel:m=>{r.delete(m),c.delete(m)},process:m=>{if(f=m,o){u=!0;return}o=!0,[n,r]=[r,n],n.forEach(p),n.clear(),o=!1,u&&(u=!1,d.process(m))}};return d}const oL=40;function VM(i,t){let n=!1,r=!0;const o={delta:0,timestamp:0,isProcessing:!1},u=()=>n=!0,c=Fc.reduce((C,D)=>(C[D]=sL(u),C),{}),{setup:f,read:p,resolveKeyframes:d,preUpdate:m,update:v,preRender:_,render:x,postRender:E}=c,T=()=>{const C=wa.useManualTiming?o.timestamp:performance.now();n=!1,wa.useManualTiming||(o.delta=r?1e3/60:Math.max(Math.min(C-o.timestamp,oL),1)),o.timestamp=C,o.isProcessing=!0,f.process(o),p.process(o),d.process(o),m.process(o),v.process(o),_.process(o),x.process(o),E.process(o),o.isProcessing=!1,n&&t&&(r=!1,i(T))},S=()=>{n=!0,r=!0,o.isProcessing||i(T)};return{schedule:Fc.reduce((C,D)=>{const N=c[D];return C[D]=(F,z=!1,H=!1)=>(n||S(),N.schedule(F,z,H)),C},{}),cancel:C=>{for(let D=0;D<Fc.length;D++)c[Fc[D]].cancel(C)},state:o,steps:c}}const{schedule:Ye,cancel:mr,state:Un,steps:rp}=VM(typeof requestAnimationFrame<"u"?requestAnimationFrame:Ei,!0);let jc;function lL(){jc=void 0}const Qn={now:()=>(jc===void 0&&Qn.set(Un.isProcessing||wa.useManualTiming?Un.timestamp:performance.now()),jc),set:i=>{jc=i,queueMicrotask(lL)}},HM=i=>t=>typeof t=="string"&&t.startsWith(i),rg=HM("--"),uL=HM("var(--"),sg=i=>uL(i)?cL.test(i.split("/*")[0].trim()):!1,cL=/var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu,xo={test:i=>typeof i=="number",parse:parseFloat,transform:i=>i},Vl={...xo,transform:i=>Ca(0,1,i)},Ic={...xo,default:1},Cl=i=>Math.round(i*1e5)/1e5,og=/-?(?:\d+(?:\.\d+)?|\.\d+)/gu;function fL(i){return i==null}const hL=/^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu,lg=(i,t)=>n=>!!(typeof n=="string"&&hL.test(n)&&n.startsWith(i)||t&&!fL(n)&&Object.prototype.hasOwnProperty.call(n,t)),GM=(i,t,n)=>r=>{if(typeof r!="string")return r;const[o,u,c,f]=r.match(og);return{[i]:parseFloat(o),[t]:parseFloat(u),[n]:parseFloat(c),alpha:f!==void 0?parseFloat(f):1}},dL=i=>Ca(0,255,i),sp={...xo,transform:i=>Math.round(dL(i))},Zr={test:lg("rgb","red"),parse:GM("red","green","blue"),transform:({red:i,green:t,blue:n,alpha:r=1})=>"rgba("+sp.transform(i)+", "+sp.transform(t)+", "+sp.transform(n)+", "+Cl(Vl.transform(r))+")"};function pL(i){let t="",n="",r="",o="";return i.length>5?(t=i.substring(1,3),n=i.substring(3,5),r=i.substring(5,7),o=i.substring(7,9)):(t=i.substring(1,2),n=i.substring(2,3),r=i.substring(3,4),o=i.substring(4,5),t+=t,n+=n,r+=r,o+=o),{red:parseInt(t,16),green:parseInt(n,16),blue:parseInt(r,16),alpha:o?parseInt(o,16)/255:1}}const hm={test:lg("#"),parse:pL,transform:Zr.transform},nu=i=>({test:t=>typeof t=="string"&&t.endsWith(i)&&t.split(" ").length===1,parse:parseFloat,transform:t=>`${t}${i}`}),lr=nu("deg"),Qi=nu("%"),re=nu("px"),mL=nu("vh"),gL=nu("vw"),px={...Qi,parse:i=>Qi.parse(i)/100,transform:i=>Qi.transform(i*100)},to={test:lg("hsl","hue"),parse:GM("hue","saturation","lightness"),transform:({hue:i,saturation:t,lightness:n,alpha:r=1})=>"hsla("+Math.round(i)+", "+Qi.transform(Cl(t))+", "+Qi.transform(Cl(n))+", "+Cl(Vl.transform(r))+")"},pn={test:i=>Zr.test(i)||hm.test(i)||to.test(i),parse:i=>Zr.test(i)?Zr.parse(i):to.test(i)?to.parse(i):hm.parse(i),transform:i=>typeof i=="string"?i:i.hasOwnProperty("red")?Zr.transform(i):to.transform(i),getAnimatableNone:i=>{const t=pn.parse(i);return t.alpha=0,pn.transform(t)}},vL=/(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;function _L(i){return isNaN(i)&&typeof i=="string"&&(i.match(og)?.length||0)+(i.match(vL)?.length||0)>0}const kM="number",XM="color",yL="var",xL="var(",mx="${}",SL=/var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;function Hl(i){const t=i.toString(),n=[],r={color:[],number:[],var:[]},o=[];let u=0;const f=t.replace(SL,p=>(pn.test(p)?(r.color.push(u),o.push(XM),n.push(pn.parse(p))):p.startsWith(xL)?(r.var.push(u),o.push(yL),n.push(p)):(r.number.push(u),o.push(kM),n.push(parseFloat(p))),++u,mx)).split(mx);return{values:n,split:f,indexes:r,types:o}}function WM(i){return Hl(i).values}function qM(i){const{split:t,types:n}=Hl(i),r=t.length;return o=>{let u="";for(let c=0;c<r;c++)if(u+=t[c],o[c]!==void 0){const f=n[c];f===kM?u+=Cl(o[c]):f===XM?u+=pn.transform(o[c]):u+=o[c]}return u}}const ML=i=>typeof i=="number"?0:pn.test(i)?pn.getAnimatableNone(i):i;function EL(i){const t=WM(i);return qM(i)(t.map(ML))}const gr={test:_L,parse:WM,createTransformer:qM,getAnimatableNone:EL};function op(i,t,n){return n<0&&(n+=1),n>1&&(n-=1),n<1/6?i+(t-i)*6*n:n<1/2?t:n<2/3?i+(t-i)*(2/3-n)*6:i}function TL({hue:i,saturation:t,lightness:n,alpha:r}){i/=360,t/=100,n/=100;let o=0,u=0,c=0;if(!t)o=u=c=n;else{const f=n<.5?n*(1+t):n+t-n*t,p=2*n-f;o=op(p,f,i+1/3),u=op(p,f,i),c=op(p,f,i-1/3)}return{red:Math.round(o*255),green:Math.round(u*255),blue:Math.round(c*255),alpha:r}}function nf(i,t){return n=>n>0?t:i}const Qe=(i,t,n)=>i+(t-i)*n,lp=(i,t,n)=>{const r=i*i,o=n*(t*t-r)+r;return o<0?0:Math.sqrt(o)},bL=[hm,Zr,to],AL=i=>bL.find(t=>t.test(i));function gx(i){const t=AL(i);if(!t)return!1;let n=t.parse(i);return t===to&&(n=TL(n)),n}const vx=(i,t)=>{const n=gx(i),r=gx(t);if(!n||!r)return nf(i,t);const o={...n};return u=>(o.red=lp(n.red,r.red,u),o.green=lp(n.green,r.green,u),o.blue=lp(n.blue,r.blue,u),o.alpha=Qe(n.alpha,r.alpha,u),Zr.transform(o))},dm=new Set(["none","hidden"]);function RL(i,t){return dm.has(i)?n=>n<=0?i:t:n=>n>=1?t:i}function CL(i,t){return n=>Qe(i,t,n)}function ug(i){return typeof i=="number"?CL:typeof i=="string"?sg(i)?nf:pn.test(i)?vx:UL:Array.isArray(i)?YM:typeof i=="object"?pn.test(i)?vx:wL:nf}function YM(i,t){const n=[...i],r=n.length,o=i.map((u,c)=>ug(u)(u,t[c]));return u=>{for(let c=0;c<r;c++)n[c]=o[c](u);return n}}function wL(i,t){const n={...i,...t},r={};for(const o in n)i[o]!==void 0&&t[o]!==void 0&&(r[o]=ug(i[o])(i[o],t[o]));return o=>{for(const u in r)n[u]=r[u](o);return n}}function DL(i,t){const n=[],r={color:0,var:0,number:0};for(let o=0;o<t.values.length;o++){const u=t.types[o],c=i.indexes[u][r[u]],f=i.values[c]??0;n[o]=f,r[u]++}return n}const UL=(i,t)=>{const n=gr.createTransformer(t),r=Hl(i),o=Hl(t);return r.indexes.var.length===o.indexes.var.length&&r.indexes.color.length===o.indexes.color.length&&r.indexes.number.length>=o.indexes.number.length?dm.has(i)&&!o.values.length||dm.has(t)&&!r.values.length?RL(i,t):tu(YM(DL(r,o),o.values),n):nf(i,t)};function jM(i,t,n){return typeof i=="number"&&typeof t=="number"&&typeof n=="number"?Qe(i,t,n):ug(i)(i,t)}const LL=i=>{const t=({timestamp:n})=>i(n);return{start:(n=!0)=>Ye.update(t,n),stop:()=>mr(t),now:()=>Un.isProcessing?Un.timestamp:Qn.now()}},KM=(i,t,n=10)=>{let r="";const o=Math.max(Math.round(t/n),2);for(let u=0;u<o;u++)r+=Math.round(i(u/(o-1))*1e4)/1e4+", ";return`linear(${r.substring(0,r.length-2)})`},af=2e4;function cg(i){let t=0;const n=50;let r=i.next(t);for(;!r.done&&t<af;)t+=n,r=i.next(t);return t>=af?1/0:t}function PL(i,t=100,n){const r=n({...i,keyframes:[0,t]}),o=Math.min(cg(r),af);return{type:"keyframes",ease:u=>r.next(o*u).value/t,duration:Zi(o)}}const NL=5;function ZM(i,t,n){const r=Math.max(t-NL,0);return wM(n-i(r),t-r)}const an={stiffness:100,damping:10,mass:1,velocity:0,duration:800,bounce:.3,visualDuration:.3,restSpeed:{granular:.01,default:2},restDelta:{granular:.005,default:.5},minDuration:.01,maxDuration:10,minDamping:.05,maxDamping:1},up=.001;function OL({duration:i=an.duration,bounce:t=an.bounce,velocity:n=an.velocity,mass:r=an.mass}){let o,u,c=1-t;c=Ca(an.minDamping,an.maxDamping,c),i=Ca(an.minDuration,an.maxDuration,Zi(i)),c<1?(o=d=>{const m=d*c,v=m*i,_=m-n,x=pm(d,c),E=Math.exp(-v);return up-_/x*E},u=d=>{const v=d*c*i,_=v*n+n,x=Math.pow(c,2)*Math.pow(d,2)*i,E=Math.exp(-v),T=pm(Math.pow(d,2),c);return(-o(d)+up>0?-1:1)*((_-x)*E)/T}):(o=d=>{const m=Math.exp(-d*i),v=(d-n)*i+1;return-up+m*v},u=d=>{const m=Math.exp(-d*i),v=(n-d)*(i*i);return m*v});const f=5/i,p=FL(o,u,f);if(i=Ki(i),isNaN(p))return{stiffness:an.stiffness,damping:an.damping,duration:i};{const d=Math.pow(p,2)*r;return{stiffness:d,damping:c*2*Math.sqrt(r*d),duration:i}}}const BL=12;function FL(i,t,n){let r=n;for(let o=1;o<BL;o++)r=r-i(r)/t(r);return r}function pm(i,t){return i*Math.sqrt(1-t*t)}const IL=["duration","bounce"],zL=["stiffness","damping","mass"];function _x(i,t){return t.some(n=>i[n]!==void 0)}function VL(i){let t={velocity:an.velocity,stiffness:an.stiffness,damping:an.damping,mass:an.mass,isResolvedFromDuration:!1,...i};if(!_x(i,zL)&&_x(i,IL))if(i.visualDuration){const n=i.visualDuration,r=2*Math.PI/(n*1.2),o=r*r,u=2*Ca(.05,1,1-(i.bounce||0))*Math.sqrt(o);t={...t,mass:an.mass,stiffness:o,damping:u}}else{const n=OL(i);t={...t,...n,mass:an.mass},t.isResolvedFromDuration=!0}return t}function rf(i=an.visualDuration,t=an.bounce){const n=typeof i!="object"?{visualDuration:i,keyframes:[0,1],bounce:t}:i;let{restSpeed:r,restDelta:o}=n;const u=n.keyframes[0],c=n.keyframes[n.keyframes.length-1],f={done:!1,value:u},{stiffness:p,damping:d,mass:m,duration:v,velocity:_,isResolvedFromDuration:x}=VL({...n,velocity:-Zi(n.velocity||0)}),E=_||0,T=d/(2*Math.sqrt(p*m)),S=c-u,y=Zi(Math.sqrt(p/m)),w=Math.abs(S)<5;r||(r=w?an.restSpeed.granular:an.restSpeed.default),o||(o=w?an.restDelta.granular:an.restDelta.default);let C;if(T<1){const N=pm(y,T);C=F=>{const z=Math.exp(-T*y*F);return c-z*((E+T*y*S)/N*Math.sin(N*F)+S*Math.cos(N*F))}}else if(T===1)C=N=>c-Math.exp(-y*N)*(S+(E+y*S)*N);else{const N=y*Math.sqrt(T*T-1);C=F=>{const z=Math.exp(-T*y*F),H=Math.min(N*F,300);return c-z*((E+T*y*S)*Math.sinh(H)+N*S*Math.cosh(H))/N}}const D={calculatedDuration:x&&v||null,next:N=>{const F=C(N);if(x)f.done=N>=v;else{let z=N===0?E:0;T<1&&(z=N===0?Ki(E):ZM(C,N,F));const H=Math.abs(z)<=r,U=Math.abs(c-F)<=o;f.done=H&&U}return f.value=f.done?c:F,f},toString:()=>{const N=Math.min(cg(D),af),F=KM(z=>D.next(N*z).value,N,30);return N+"ms "+F},toTransition:()=>{}};return D}rf.applyToOptions=i=>{const t=PL(i,100,rf);return i.ease=t.ease,i.duration=Ki(t.duration),i.type="keyframes",i};function mm({keyframes:i,velocity:t=0,power:n=.8,timeConstant:r=325,bounceDamping:o=10,bounceStiffness:u=500,modifyTarget:c,min:f,max:p,restDelta:d=.5,restSpeed:m}){const v=i[0],_={done:!1,value:v},x=H=>f!==void 0&&H<f||p!==void 0&&H>p,E=H=>f===void 0?p:p===void 0||Math.abs(f-H)<Math.abs(p-H)?f:p;let T=n*t;const S=v+T,y=c===void 0?S:c(S);y!==S&&(T=y-v);const w=H=>-T*Math.exp(-H/r),C=H=>y+w(H),D=H=>{const U=w(H),L=C(H);_.done=Math.abs(U)<=d,_.value=_.done?y:L};let N,F;const z=H=>{x(_.value)&&(N=H,F=rf({keyframes:[_.value,E(_.value)],velocity:ZM(C,H,_.value),damping:o,stiffness:u,restDelta:d,restSpeed:m}))};return z(0),{calculatedDuration:null,next:H=>{let U=!1;return!F&&N===void 0&&(U=!0,D(H),z(H)),N!==void 0&&H>=N?F.next(H-N):(!U&&D(H),_)}}}function HL(i,t,n){const r=[],o=n||wa.mix||jM,u=i.length-1;for(let c=0;c<u;c++){let f=o(i[c],i[c+1]);if(t){const p=Array.isArray(t)?t[c]||Ei:t;f=tu(p,f)}r.push(f)}return r}function GL(i,t,{clamp:n=!0,ease:r,mixer:o}={}){const u=i.length;if(tg(u===t.length),u===1)return()=>t[0];if(u===2&&t[0]===t[1])return()=>t[1];const c=i[0]===i[1];i[0]>i[u-1]&&(i=[...i].reverse(),t=[...t].reverse());const f=HL(t,r,o),p=f.length,d=m=>{if(c&&m<i[0])return t[0];let v=0;if(p>1)for(;v<i.length-2&&!(m<i[v+1]);v++);const _=zl(i[v],i[v+1],m);return f[v](_)};return n?m=>d(Ca(i[0],i[u-1],m)):d}function kL(i,t){const n=i[i.length-1];for(let r=1;r<=t;r++){const o=zl(0,t,r);i.push(Qe(n,1,o))}}function XL(i){const t=[0];return kL(t,i.length-1),t}function WL(i,t){return i.map(n=>n*t)}function qL(i,t){return i.map(()=>t||IM).splice(0,i.length-1)}function wl({duration:i=300,keyframes:t,times:n,ease:r="easeInOut"}){const o=iL(r)?r.map(dx):dx(r),u={done:!1,value:t[0]},c=WL(n&&n.length===t.length?n:XL(t),i),f=GL(c,t,{ease:Array.isArray(o)?o:qL(t,o)});return{calculatedDuration:i,next:p=>(u.value=f(p),u.done=p>=i,u)}}const YL=i=>i!==null;function fg(i,{repeat:t,repeatType:n="loop"},r,o=1){const u=i.filter(YL),f=o<0||t&&n!=="loop"&&t%2===1?0:u.length-1;return!f||r===void 0?u[f]:r}const jL={decay:mm,inertia:mm,tween:wl,keyframes:wl,spring:rf};function QM(i){typeof i.type=="string"&&(i.type=jL[i.type])}class hg{constructor(){this.updateFinished()}get finished(){return this._finished}updateFinished(){this._finished=new Promise(t=>{this.resolve=t})}notifyFinished(){this.resolve()}then(t,n){return this.finished.then(t,n)}}const KL=i=>i/100;class dg extends hg{constructor(t){super(),this.state="idle",this.startTime=null,this.isStopped=!1,this.currentTime=0,this.holdTime=null,this.playbackSpeed=1,this.stop=()=>{const{motionValue:n}=this.options;n&&n.updatedAt!==Qn.now()&&this.tick(Qn.now()),this.isStopped=!0,this.state!=="idle"&&(this.teardown(),this.options.onStop?.())},this.options=t,this.initAnimation(),this.play(),t.autoplay===!1&&this.pause()}initAnimation(){const{options:t}=this;QM(t);const{type:n=wl,repeat:r=0,repeatDelay:o=0,repeatType:u,velocity:c=0}=t;let{keyframes:f}=t;const p=n||wl;p!==wl&&typeof f[0]!="number"&&(this.mixKeyframes=tu(KL,jM(f[0],f[1])),f=[0,100]);const d=p({...t,keyframes:f});u==="mirror"&&(this.mirroredGenerator=p({...t,keyframes:[...f].reverse(),velocity:-c})),d.calculatedDuration===null&&(d.calculatedDuration=cg(d));const{calculatedDuration:m}=d;this.calculatedDuration=m,this.resolvedDuration=m+o,this.totalDuration=this.resolvedDuration*(r+1)-o,this.generator=d}updateTime(t){const n=Math.round(t-this.startTime)*this.playbackSpeed;this.holdTime!==null?this.currentTime=this.holdTime:this.currentTime=n}tick(t,n=!1){const{generator:r,totalDuration:o,mixKeyframes:u,mirroredGenerator:c,resolvedDuration:f,calculatedDuration:p}=this;if(this.startTime===null)return r.next(0);const{delay:d=0,keyframes:m,repeat:v,repeatType:_,repeatDelay:x,type:E,onUpdate:T,finalKeyframe:S}=this.options;this.speed>0?this.startTime=Math.min(this.startTime,t):this.speed<0&&(this.startTime=Math.min(t-o/this.speed,this.startTime)),n?this.currentTime=t:this.updateTime(t);const y=this.currentTime-d*(this.playbackSpeed>=0?1:-1),w=this.playbackSpeed>=0?y<0:y>o;this.currentTime=Math.max(y,0),this.state==="finished"&&this.holdTime===null&&(this.currentTime=o);let C=this.currentTime,D=r;if(v){const H=Math.min(this.currentTime,o)/f;let U=Math.floor(H),L=H%1;!L&&H>=1&&(L=1),L===1&&U--,U=Math.min(U,v+1),!!(U%2)&&(_==="reverse"?(L=1-L,x&&(L-=x/f)):_==="mirror"&&(D=c)),C=Ca(0,1,L)*f}const N=w?{done:!1,value:m[0]}:D.next(C);u&&(N.value=u(N.value));let{done:F}=N;!w&&p!==null&&(F=this.playbackSpeed>=0?this.currentTime>=o:this.currentTime<=0);const z=this.holdTime===null&&(this.state==="finished"||this.state==="running"&&F);return z&&E!==mm&&(N.value=fg(m,this.options,S,this.speed)),T&&T(N.value),z&&this.finish(),N}then(t,n){return this.finished.then(t,n)}get duration(){return Zi(this.calculatedDuration)}get time(){return Zi(this.currentTime)}set time(t){t=Ki(t),this.currentTime=t,this.startTime===null||this.holdTime!==null||this.playbackSpeed===0?this.holdTime=t:this.driver&&(this.startTime=this.driver.now()-t/this.playbackSpeed),this.driver?.start(!1)}get speed(){return this.playbackSpeed}set speed(t){this.updateTime(Qn.now());const n=this.playbackSpeed!==t;this.playbackSpeed=t,n&&(this.time=Zi(this.currentTime))}play(){if(this.isStopped)return;const{driver:t=LL,startTime:n}=this.options;this.driver||(this.driver=t(o=>this.tick(o))),this.options.onPlay?.();const r=this.driver.now();this.state==="finished"?(this.updateFinished(),this.startTime=r):this.holdTime!==null?this.startTime=r-this.holdTime:this.startTime||(this.startTime=n??r),this.state==="finished"&&this.speed<0&&(this.startTime+=this.calculatedDuration),this.holdTime=null,this.state="running",this.driver.start()}pause(){this.state="paused",this.updateTime(Qn.now()),this.holdTime=this.currentTime}complete(){this.state!=="running"&&this.play(),this.state="finished",this.holdTime=null}finish(){this.notifyFinished(),this.teardown(),this.state="finished",this.options.onComplete?.()}cancel(){this.holdTime=null,this.startTime=0,this.tick(0),this.teardown(),this.options.onCancel?.()}teardown(){this.state="idle",this.stopDriver(),this.startTime=this.holdTime=null}stopDriver(){this.driver&&(this.driver.stop(),this.driver=void 0)}sample(t){return this.startTime=0,this.tick(t,!0)}attachTimeline(t){return this.options.allowFlatten&&(this.options.type="keyframes",this.options.ease="linear",this.initAnimation()),this.driver?.stop(),t.observe(this)}}function ZL(i){for(let t=1;t<i.length;t++)i[t]??(i[t]=i[t-1])}const Qr=i=>i*180/Math.PI,gm=i=>{const t=Qr(Math.atan2(i[1],i[0]));return vm(t)},QL={x:4,y:5,translateX:4,translateY:5,scaleX:0,scaleY:3,scale:i=>(Math.abs(i[0])+Math.abs(i[3]))/2,rotate:gm,rotateZ:gm,skewX:i=>Qr(Math.atan(i[1])),skewY:i=>Qr(Math.atan(i[2])),skew:i=>(Math.abs(i[1])+Math.abs(i[2]))/2},vm=i=>(i=i%360,i<0&&(i+=360),i),yx=gm,xx=i=>Math.sqrt(i[0]*i[0]+i[1]*i[1]),Sx=i=>Math.sqrt(i[4]*i[4]+i[5]*i[5]),$L={x:12,y:13,z:14,translateX:12,translateY:13,translateZ:14,scaleX:xx,scaleY:Sx,scale:i=>(xx(i)+Sx(i))/2,rotateX:i=>vm(Qr(Math.atan2(i[6],i[5]))),rotateY:i=>vm(Qr(Math.atan2(-i[2],i[0]))),rotateZ:yx,rotate:yx,skewX:i=>Qr(Math.atan(i[4])),skewY:i=>Qr(Math.atan(i[1])),skew:i=>(Math.abs(i[1])+Math.abs(i[4]))/2};function _m(i){return i.includes("scale")?1:0}function ym(i,t){if(!i||i==="none")return _m(t);const n=i.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);let r,o;if(n)r=$L,o=n;else{const f=i.match(/^matrix\(([-\d.e\s,]+)\)$/u);r=QL,o=f}if(!o)return _m(t);const u=r[t],c=o[1].split(",").map(t3);return typeof u=="function"?u(c):c[u]}const JL=(i,t)=>{const{transform:n="none"}=getComputedStyle(i);return ym(n,t)};function t3(i){return parseFloat(i.trim())}const So=["transformPerspective","x","y","z","translateX","translateY","translateZ","scale","scaleX","scaleY","rotate","rotateX","rotateY","rotateZ","skew","skewX","skewY"],Mo=new Set(So),Mx=i=>i===xo||i===re,e3=new Set(["x","y","z"]),n3=So.filter(i=>!e3.has(i));function i3(i){const t=[];return n3.forEach(n=>{const r=i.getValue(n);r!==void 0&&(t.push([n,r.get()]),r.set(n.startsWith("scale")?1:0))}),t}const Jr={width:({x:i},{paddingLeft:t="0",paddingRight:n="0"})=>i.max-i.min-parseFloat(t)-parseFloat(n),height:({y:i},{paddingTop:t="0",paddingBottom:n="0"})=>i.max-i.min-parseFloat(t)-parseFloat(n),top:(i,{top:t})=>parseFloat(t),left:(i,{left:t})=>parseFloat(t),bottom:({y:i},{top:t})=>parseFloat(t)+(i.max-i.min),right:({x:i},{left:t})=>parseFloat(t)+(i.max-i.min),x:(i,{transform:t})=>ym(t,"x"),y:(i,{transform:t})=>ym(t,"y")};Jr.translateX=Jr.x;Jr.translateY=Jr.y;const ts=new Set;let xm=!1,Sm=!1,Mm=!1;function $M(){if(Sm){const i=Array.from(ts).filter(r=>r.needsMeasurement),t=new Set(i.map(r=>r.element)),n=new Map;t.forEach(r=>{const o=i3(r);o.length&&(n.set(r,o),r.render())}),i.forEach(r=>r.measureInitialState()),t.forEach(r=>{r.render();const o=n.get(r);o&&o.forEach(([u,c])=>{r.getValue(u)?.set(c)})}),i.forEach(r=>r.measureEndState()),i.forEach(r=>{r.suspendedScrollY!==void 0&&window.scrollTo(0,r.suspendedScrollY)})}Sm=!1,xm=!1,ts.forEach(i=>i.complete(Mm)),ts.clear()}function JM(){ts.forEach(i=>{i.readKeyframes(),i.needsMeasurement&&(Sm=!0)})}function a3(){Mm=!0,JM(),$M(),Mm=!1}class pg{constructor(t,n,r,o,u,c=!1){this.state="pending",this.isAsync=!1,this.needsMeasurement=!1,this.unresolvedKeyframes=[...t],this.onComplete=n,this.name=r,this.motionValue=o,this.element=u,this.isAsync=c}scheduleResolve(){this.state="scheduled",this.isAsync?(ts.add(this),xm||(xm=!0,Ye.read(JM),Ye.resolveKeyframes($M))):(this.readKeyframes(),this.complete())}readKeyframes(){const{unresolvedKeyframes:t,name:n,element:r,motionValue:o}=this;if(t[0]===null){const u=o?.get(),c=t[t.length-1];if(u!==void 0)t[0]=u;else if(r&&n){const f=r.readValue(n,c);f!=null&&(t[0]=f)}t[0]===void 0&&(t[0]=c),o&&u===void 0&&o.set(t[0])}ZL(t)}setFinalKeyframe(){}measureInitialState(){}renderEndStyles(){}measureEndState(){}complete(t=!1){this.state="complete",this.onComplete(this.unresolvedKeyframes,this.finalKeyframe,t),ts.delete(this)}cancel(){this.state==="scheduled"&&(ts.delete(this),this.state="pending")}resume(){this.state==="pending"&&this.scheduleResolve()}}const r3=i=>i.startsWith("--");function s3(i,t,n){r3(t)?i.style.setProperty(t,n):i.style[t]=n}const o3=eg(()=>window.ScrollTimeline!==void 0),l3={};function u3(i,t){const n=eg(i);return()=>l3[t]??n()}const tE=u3(()=>{try{document.createElement("div").animate({opacity:0},{easing:"linear(0, 1)"})}catch{return!1}return!0},"linearEasing"),Rl=([i,t,n,r])=>`cubic-bezier(${i}, ${t}, ${n}, ${r})`,Ex={linear:"linear",ease:"ease",easeIn:"ease-in",easeOut:"ease-out",easeInOut:"ease-in-out",circIn:Rl([0,.65,.55,1]),circOut:Rl([.55,0,1,.45]),backIn:Rl([.31,.01,.66,-.59]),backOut:Rl([.33,1.53,.69,.99])};function eE(i,t){if(i)return typeof i=="function"?tE()?KM(i,t):"ease-out":zM(i)?Rl(i):Array.isArray(i)?i.map(n=>eE(n,t)||Ex.easeOut):Ex[i]}function c3(i,t,n,{delay:r=0,duration:o=300,repeat:u=0,repeatType:c="loop",ease:f="easeOut",times:p}={},d=void 0){const m={[t]:n};p&&(m.offset=p);const v=eE(f,o);Array.isArray(v)&&(m.easing=v);const _={delay:r,duration:o,easing:Array.isArray(v)?"linear":v,fill:"both",iterations:u+1,direction:c==="reverse"?"alternate":"normal"};return d&&(_.pseudoElement=d),i.animate(m,_)}function nE(i){return typeof i=="function"&&"applyToOptions"in i}function f3({type:i,...t}){return nE(i)&&tE()?i.applyToOptions(t):(t.duration??(t.duration=300),t.ease??(t.ease="easeOut"),t)}class h3 extends hg{constructor(t){if(super(),this.finishedTime=null,this.isStopped=!1,!t)return;const{element:n,name:r,keyframes:o,pseudoElement:u,allowFlatten:c=!1,finalKeyframe:f,onComplete:p}=t;this.isPseudoElement=!!u,this.allowFlatten=c,this.options=t,tg(typeof t.type!="string");const d=f3(t);this.animation=c3(n,r,o,d,u),d.autoplay===!1&&this.animation.pause(),this.animation.onfinish=()=>{if(this.finishedTime=this.time,!u){const m=fg(o,this.options,f,this.speed);this.updateMotionValue?this.updateMotionValue(m):s3(n,r,m),this.animation.cancel()}p?.(),this.notifyFinished()}}play(){this.isStopped||(this.animation.play(),this.state==="finished"&&this.updateFinished())}pause(){this.animation.pause()}complete(){this.animation.finish?.()}cancel(){try{this.animation.cancel()}catch{}}stop(){if(this.isStopped)return;this.isStopped=!0;const{state:t}=this;t==="idle"||t==="finished"||(this.updateMotionValue?this.updateMotionValue():this.commitStyles(),this.isPseudoElement||this.cancel())}commitStyles(){this.isPseudoElement||this.animation.commitStyles?.()}get duration(){const t=this.animation.effect?.getComputedTiming?.().duration||0;return Zi(Number(t))}get time(){return Zi(Number(this.animation.currentTime)||0)}set time(t){this.finishedTime=null,this.animation.currentTime=Ki(t)}get speed(){return this.animation.playbackRate}set speed(t){t<0&&(this.finishedTime=null),this.animation.playbackRate=t}get state(){return this.finishedTime!==null?"finished":this.animation.playState}get startTime(){return Number(this.animation.startTime)}set startTime(t){this.animation.startTime=t}attachTimeline({timeline:t,observe:n}){return this.allowFlatten&&this.animation.effect?.updateTiming({easing:"linear"}),this.animation.onfinish=null,t&&o3()?(this.animation.timeline=t,Ei):n(this)}}const iE={anticipate:OM,backInOut:NM,circInOut:FM};function d3(i){return i in iE}function p3(i){typeof i.ease=="string"&&d3(i.ease)&&(i.ease=iE[i.ease])}const Tx=10;class m3 extends h3{constructor(t){p3(t),QM(t),super(t),t.startTime&&(this.startTime=t.startTime),this.options=t}updateMotionValue(t){const{motionValue:n,onUpdate:r,onComplete:o,element:u,...c}=this.options;if(!n)return;if(t!==void 0){n.set(t);return}const f=new dg({...c,autoplay:!1}),p=Ki(this.finishedTime??this.time);n.setWithVelocity(f.sample(p-Tx).value,f.sample(p).value,Tx),f.stop()}}const bx=(i,t)=>t==="zIndex"?!1:!!(typeof i=="number"||Array.isArray(i)||typeof i=="string"&&(gr.test(i)||i==="0")&&!i.startsWith("url("));function g3(i){const t=i[0];if(i.length===1)return!0;for(let n=0;n<i.length;n++)if(i[n]!==t)return!0}function v3(i,t,n,r){const o=i[0];if(o===null)return!1;if(t==="display"||t==="visibility")return!0;const u=i[i.length-1],c=bx(o,t),f=bx(u,t);return!c||!f?!1:g3(i)||(n==="spring"||nE(n))&&r}function Em(i){i.duration=0,i.type}const _3=new Set(["opacity","clipPath","filter","transform"]),y3=eg(()=>Object.hasOwnProperty.call(Element.prototype,"animate"));function x3(i){const{motionValue:t,name:n,repeatDelay:r,repeatType:o,damping:u,type:c}=i;if(!(t?.owner?.current instanceof HTMLElement))return!1;const{onUpdate:p,transformTemplate:d}=t.owner.getProps();return y3()&&n&&_3.has(n)&&(n!=="transform"||!d)&&!p&&!r&&o!=="mirror"&&u!==0&&c!=="inertia"}const S3=40;class M3 extends hg{constructor({autoplay:t=!0,delay:n=0,type:r="keyframes",repeat:o=0,repeatDelay:u=0,repeatType:c="loop",keyframes:f,name:p,motionValue:d,element:m,...v}){super(),this.stop=()=>{this._animation&&(this._animation.stop(),this.stopTimeline?.()),this.keyframeResolver?.cancel()},this.createdAt=Qn.now();const _={autoplay:t,delay:n,type:r,repeat:o,repeatDelay:u,repeatType:c,name:p,motionValue:d,element:m,...v},x=m?.KeyframeResolver||pg;this.keyframeResolver=new x(f,(E,T,S)=>this.onKeyframesResolved(E,T,_,!S),p,d,m),this.keyframeResolver?.scheduleResolve()}onKeyframesResolved(t,n,r,o){this.keyframeResolver=void 0;const{name:u,type:c,velocity:f,delay:p,isHandoff:d,onUpdate:m}=r;this.resolvedAt=Qn.now(),v3(t,u,c,f)||((wa.instantAnimations||!p)&&m?.(fg(t,r,n)),t[0]=t[t.length-1],Em(r),r.repeat=0);const _={startTime:o?this.resolvedAt?this.resolvedAt-this.createdAt>S3?this.resolvedAt:this.createdAt:this.createdAt:void 0,finalKeyframe:n,...r,keyframes:t},x=!d&&x3(_)?new m3({..._,element:_.motionValue.owner.current}):new dg(_);x.finished.then(()=>this.notifyFinished()).catch(Ei),this.pendingTimeline&&(this.stopTimeline=x.attachTimeline(this.pendingTimeline),this.pendingTimeline=void 0),this._animation=x}get finished(){return this._animation?this.animation.finished:this._finished}then(t,n){return this.finished.finally(t).then(()=>{})}get animation(){return this._animation||(this.keyframeResolver?.resume(),a3()),this._animation}get duration(){return this.animation.duration}get time(){return this.animation.time}set time(t){this.animation.time=t}get speed(){return this.animation.speed}get state(){return this.animation.state}set speed(t){this.animation.speed=t}get startTime(){return this.animation.startTime}attachTimeline(t){return this._animation?this.stopTimeline=this.animation.attachTimeline(t):this.pendingTimeline=t,()=>this.stop()}play(){this.animation.play()}pause(){this.animation.pause()}complete(){this.animation.complete()}cancel(){this._animation&&this.animation.cancel(),this.keyframeResolver?.cancel()}}const E3=/^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u;function T3(i){const t=E3.exec(i);if(!t)return[,];const[,n,r,o]=t;return[`--${n??r}`,o]}function aE(i,t,n=1){const[r,o]=T3(i);if(!r)return;const u=window.getComputedStyle(t).getPropertyValue(r);if(u){const c=u.trim();return AM(c)?parseFloat(c):c}return sg(o)?aE(o,t,n+1):o}function mg(i,t){return i?.[t]??i?.default??i}const rE=new Set(["width","height","top","left","right","bottom",...So]),b3={test:i=>i==="auto",parse:i=>i},sE=i=>t=>t.test(i),oE=[xo,re,Qi,lr,gL,mL,b3],Ax=i=>oE.find(sE(i));function A3(i){return typeof i=="number"?i===0:i!==null?i==="none"||i==="0"||CM(i):!0}const R3=new Set(["brightness","contrast","saturate","opacity"]);function C3(i){const[t,n]=i.slice(0,-1).split("(");if(t==="drop-shadow")return i;const[r]=n.match(og)||[];if(!r)return i;const o=n.replace(r,"");let u=R3.has(t)?1:0;return r!==n&&(u*=100),t+"("+u+o+")"}const w3=/\b([a-z-]*)\(.*?\)/gu,Tm={...gr,getAnimatableNone:i=>{const t=i.match(w3);return t?t.map(C3).join(" "):i}},Rx={...xo,transform:Math.round},D3={rotate:lr,rotateX:lr,rotateY:lr,rotateZ:lr,scale:Ic,scaleX:Ic,scaleY:Ic,scaleZ:Ic,skew:lr,skewX:lr,skewY:lr,distance:re,translateX:re,translateY:re,translateZ:re,x:re,y:re,z:re,perspective:re,transformPerspective:re,opacity:Vl,originX:px,originY:px,originZ:re},gg={borderWidth:re,borderTopWidth:re,borderRightWidth:re,borderBottomWidth:re,borderLeftWidth:re,borderRadius:re,radius:re,borderTopLeftRadius:re,borderTopRightRadius:re,borderBottomRightRadius:re,borderBottomLeftRadius:re,width:re,maxWidth:re,height:re,maxHeight:re,top:re,right:re,bottom:re,left:re,padding:re,paddingTop:re,paddingRight:re,paddingBottom:re,paddingLeft:re,margin:re,marginTop:re,marginRight:re,marginBottom:re,marginLeft:re,backgroundPositionX:re,backgroundPositionY:re,...D3,zIndex:Rx,fillOpacity:Vl,strokeOpacity:Vl,numOctaves:Rx},U3={...gg,color:pn,backgroundColor:pn,outlineColor:pn,fill:pn,stroke:pn,borderColor:pn,borderTopColor:pn,borderRightColor:pn,borderBottomColor:pn,borderLeftColor:pn,filter:Tm,WebkitFilter:Tm},lE=i=>U3[i];function uE(i,t){let n=lE(i);return n!==Tm&&(n=gr),n.getAnimatableNone?n.getAnimatableNone(t):void 0}const L3=new Set(["auto","none","0"]);function P3(i,t,n){let r=0,o;for(;r<i.length&&!o;){const u=i[r];typeof u=="string"&&!L3.has(u)&&Hl(u).values.length&&(o=i[r]),r++}if(o&&n)for(const u of t)i[u]=uE(n,o)}class N3 extends pg{constructor(t,n,r,o,u){super(t,n,r,o,u,!0)}readKeyframes(){const{unresolvedKeyframes:t,element:n,name:r}=this;if(!n||!n.current)return;super.readKeyframes();for(let p=0;p<t.length;p++){let d=t[p];if(typeof d=="string"&&(d=d.trim(),sg(d))){const m=aE(d,n.current);m!==void 0&&(t[p]=m),p===t.length-1&&(this.finalKeyframe=d)}}if(this.resolveNoneKeyframes(),!rE.has(r)||t.length!==2)return;const[o,u]=t,c=Ax(o),f=Ax(u);if(c!==f)if(Mx(c)&&Mx(f))for(let p=0;p<t.length;p++){const d=t[p];typeof d=="string"&&(t[p]=parseFloat(d))}else Jr[r]&&(this.needsMeasurement=!0)}resolveNoneKeyframes(){const{unresolvedKeyframes:t,name:n}=this,r=[];for(let o=0;o<t.length;o++)(t[o]===null||A3(t[o]))&&r.push(o);r.length&&P3(t,r,n)}measureInitialState(){const{element:t,unresolvedKeyframes:n,name:r}=this;if(!t||!t.current)return;r==="height"&&(this.suspendedScrollY=window.pageYOffset),this.measuredOrigin=Jr[r](t.measureViewportBox(),window.getComputedStyle(t.current)),n[0]=this.measuredOrigin;const o=n[n.length-1];o!==void 0&&t.getValue(r,o).jump(o,!1)}measureEndState(){const{element:t,name:n,unresolvedKeyframes:r}=this;if(!t||!t.current)return;const o=t.getValue(n);o&&o.jump(this.measuredOrigin,!1);const u=r.length-1,c=r[u];r[u]=Jr[n](t.measureViewportBox(),window.getComputedStyle(t.current)),c!==null&&this.finalKeyframe===void 0&&(this.finalKeyframe=c),this.removedTransforms?.length&&this.removedTransforms.forEach(([f,p])=>{t.getValue(f).set(p)}),this.resolveNoneKeyframes()}}function O3(i,t,n){if(i instanceof EventTarget)return[i];if(typeof i=="string"){let r=document;const o=n?.[i]??r.querySelectorAll(i);return o?Array.from(o):[]}return Array.from(i)}const cE=(i,t)=>t&&typeof i=="number"?t.transform(i):i;function B3(i){return RM(i)&&"offsetHeight"in i}const Cx=30,F3=i=>!isNaN(parseFloat(i));class I3{constructor(t,n={}){this.canTrackVelocity=null,this.events={},this.updateAndNotify=r=>{const o=Qn.now();if(this.updatedAt!==o&&this.setPrevFrameValue(),this.prev=this.current,this.setCurrent(r),this.current!==this.prev&&(this.events.change?.notify(this.current),this.dependents))for(const u of this.dependents)u.dirty()},this.hasAnimated=!1,this.setCurrent(t),this.owner=n.owner}setCurrent(t){this.current=t,this.updatedAt=Qn.now(),this.canTrackVelocity===null&&t!==void 0&&(this.canTrackVelocity=F3(this.current))}setPrevFrameValue(t=this.current){this.prevFrameValue=t,this.prevUpdatedAt=this.updatedAt}onChange(t){return this.on("change",t)}on(t,n){this.events[t]||(this.events[t]=new ng);const r=this.events[t].add(n);return t==="change"?()=>{r(),Ye.read(()=>{this.events.change.getSize()||this.stop()})}:r}clearListeners(){for(const t in this.events)this.events[t].clear()}attach(t,n){this.passiveEffect=t,this.stopPassiveEffect=n}set(t){this.passiveEffect?this.passiveEffect(t,this.updateAndNotify):this.updateAndNotify(t)}setWithVelocity(t,n,r){this.set(n),this.prev=void 0,this.prevFrameValue=t,this.prevUpdatedAt=this.updatedAt-r}jump(t,n=!0){this.updateAndNotify(t),this.prev=t,this.prevUpdatedAt=this.prevFrameValue=void 0,n&&this.stop(),this.stopPassiveEffect&&this.stopPassiveEffect()}dirty(){this.events.change?.notify(this.current)}addDependent(t){this.dependents||(this.dependents=new Set),this.dependents.add(t)}removeDependent(t){this.dependents&&this.dependents.delete(t)}get(){return this.current}getPrevious(){return this.prev}getVelocity(){const t=Qn.now();if(!this.canTrackVelocity||this.prevFrameValue===void 0||t-this.updatedAt>Cx)return 0;const n=Math.min(this.updatedAt-this.prevUpdatedAt,Cx);return wM(parseFloat(this.current)-parseFloat(this.prevFrameValue),n)}start(t){return this.stop(),new Promise(n=>{this.hasAnimated=!0,this.animation=t(n),this.events.animationStart&&this.events.animationStart.notify()}).then(()=>{this.events.animationComplete&&this.events.animationComplete.notify(),this.clearAnimation()})}stop(){this.animation&&(this.animation.stop(),this.events.animationCancel&&this.events.animationCancel.notify()),this.clearAnimation()}isAnimating(){return!!this.animation}clearAnimation(){delete this.animation}destroy(){this.dependents?.clear(),this.events.destroy?.notify(),this.clearListeners(),this.stop(),this.stopPassiveEffect&&this.stopPassiveEffect()}}function po(i,t){return new I3(i,t)}const{schedule:vg}=VM(queueMicrotask,!1),Pi={x:!1,y:!1};function fE(){return Pi.x||Pi.y}function z3(i){return i==="x"||i==="y"?Pi[i]?null:(Pi[i]=!0,()=>{Pi[i]=!1}):Pi.x||Pi.y?null:(Pi.x=Pi.y=!0,()=>{Pi.x=Pi.y=!1})}function hE(i,t){const n=O3(i),r=new AbortController,o={passive:!0,...t,signal:r.signal};return[n,o,()=>r.abort()]}function wx(i){return!(i.pointerType==="touch"||fE())}function V3(i,t,n={}){const[r,o,u]=hE(i,n),c=f=>{if(!wx(f))return;const{target:p}=f,d=t(p,f);if(typeof d!="function"||!p)return;const m=v=>{wx(v)&&(d(v),p.removeEventListener("pointerleave",m))};p.addEventListener("pointerleave",m,o)};return r.forEach(f=>{f.addEventListener("pointerenter",c,o)}),u}const dE=(i,t)=>t?i===t?!0:dE(i,t.parentElement):!1,_g=i=>i.pointerType==="mouse"?typeof i.button!="number"||i.button<=0:i.isPrimary!==!1,H3=new Set(["BUTTON","INPUT","SELECT","TEXTAREA","A"]);function G3(i){return H3.has(i.tagName)||i.tabIndex!==-1}const Kc=new WeakSet;function Dx(i){return t=>{t.key==="Enter"&&i(t)}}function cp(i,t){i.dispatchEvent(new PointerEvent("pointer"+t,{isPrimary:!0,bubbles:!0}))}const k3=(i,t)=>{const n=i.currentTarget;if(!n)return;const r=Dx(()=>{if(Kc.has(n))return;cp(n,"down");const o=Dx(()=>{cp(n,"up")}),u=()=>cp(n,"cancel");n.addEventListener("keyup",o,t),n.addEventListener("blur",u,t)});n.addEventListener("keydown",r,t),n.addEventListener("blur",()=>n.removeEventListener("keydown",r),t)};function Ux(i){return _g(i)&&!fE()}function X3(i,t,n={}){const[r,o,u]=hE(i,n),c=f=>{const p=f.currentTarget;if(!Ux(f))return;Kc.add(p);const d=t(p,f),m=(x,E)=>{window.removeEventListener("pointerup",v),window.removeEventListener("pointercancel",_),Kc.has(p)&&Kc.delete(p),Ux(x)&&typeof d=="function"&&d(x,{success:E})},v=x=>{m(x,p===window||p===document||n.useGlobalTarget||dE(p,x.target))},_=x=>{m(x,!1)};window.addEventListener("pointerup",v,o),window.addEventListener("pointercancel",_,o)};return r.forEach(f=>{(n.useGlobalTarget?window:f).addEventListener("pointerdown",c,o),B3(f)&&(f.addEventListener("focus",d=>k3(d,o)),!G3(f)&&!f.hasAttribute("tabindex")&&(f.tabIndex=0))}),u}function pE(i){return RM(i)&&"ownerSVGElement"in i}function W3(i){return pE(i)&&i.tagName==="svg"}const In=i=>!!(i&&i.getVelocity),q3=[...oE,pn,gr],Y3=i=>q3.find(sE(i)),mE=Q.createContext({transformPagePoint:i=>i,isStatic:!1,reducedMotion:"never"});function j3(i=!0){const t=Q.useContext(Qm);if(t===null)return[!0,null];const{isPresent:n,onExitComplete:r,register:o}=t,u=Q.useId();Q.useEffect(()=>{if(i)return o(u)},[i]);const c=Q.useCallback(()=>i&&r&&r(u),[u,r,i]);return!n&&r?[!1,c]:[!0]}const gE=Q.createContext({strict:!1}),Lx={animation:["animate","variants","whileHover","whileTap","exit","whileInView","whileFocus","whileDrag"],exit:["exit"],drag:["drag","dragControls"],focus:["whileFocus"],hover:["whileHover","onHoverStart","onHoverEnd"],tap:["whileTap","onTap","onTapStart","onTapCancel"],pan:["onPan","onPanStart","onPanSessionStart","onPanEnd"],inView:["whileInView","onViewportEnter","onViewportLeave"],layout:["layout","layoutId"]},mo={};for(const i in Lx)mo[i]={isEnabled:t=>Lx[i].some(n=>!!t[n])};function K3(i){for(const t in i)mo[t]={...mo[t],...i[t]}}const Z3=new Set(["animate","exit","variants","initial","style","values","variants","transition","transformTemplate","custom","inherit","onBeforeLayoutMeasure","onAnimationStart","onAnimationComplete","onUpdate","onDragStart","onDrag","onDragEnd","onMeasureDragConstraints","onDirectionLock","onDragTransitionEnd","_dragX","_dragY","onHoverStart","onHoverEnd","onViewportEnter","onViewportLeave","globalTapTarget","ignoreStrict","viewport"]);function sf(i){return i.startsWith("while")||i.startsWith("drag")&&i!=="draggable"||i.startsWith("layout")||i.startsWith("onTap")||i.startsWith("onPan")||i.startsWith("onLayout")||Z3.has(i)}let vE=i=>!sf(i);function Q3(i){typeof i=="function"&&(vE=t=>t.startsWith("on")?!sf(t):i(t))}try{Q3(require("@emotion/is-prop-valid").default)}catch{}function $3(i,t,n){const r={};for(const o in i)o==="values"&&typeof i.values=="object"||(vE(o)||n===!0&&sf(o)||!t&&!sf(o)||i.draggable&&o.startsWith("onDrag"))&&(r[o]=i[o]);return r}const df=Q.createContext({});function pf(i){return i!==null&&typeof i=="object"&&typeof i.start=="function"}function Gl(i){return typeof i=="string"||Array.isArray(i)}const yg=["animate","whileInView","whileFocus","whileHover","whileTap","whileDrag","exit"],xg=["initial",...yg];function mf(i){return pf(i.animate)||xg.some(t=>Gl(i[t]))}function _E(i){return!!(mf(i)||i.variants)}function J3(i,t){if(mf(i)){const{initial:n,animate:r}=i;return{initial:n===!1||Gl(n)?n:void 0,animate:Gl(r)?r:void 0}}return i.inherit!==!1?t:{}}function tP(i){const{initial:t,animate:n}=J3(i,Q.useContext(df));return Q.useMemo(()=>({initial:t,animate:n}),[Px(t),Px(n)])}function Px(i){return Array.isArray(i)?i.join(" "):i}const kl={};function eP(i){for(const t in i)kl[t]=i[t],rg(t)&&(kl[t].isCSSVariable=!0)}function yE(i,{layout:t,layoutId:n}){return Mo.has(i)||i.startsWith("origin")||(t||n!==void 0)&&(!!kl[i]||i==="opacity")}const nP={x:"translateX",y:"translateY",z:"translateZ",transformPerspective:"perspective"},iP=So.length;function aP(i,t,n){let r="",o=!0;for(let u=0;u<iP;u++){const c=So[u],f=i[c];if(f===void 0)continue;let p=!0;if(typeof f=="number"?p=f===(c.startsWith("scale")?1:0):p=parseFloat(f)===0,!p||n){const d=cE(f,gg[c]);if(!p){o=!1;const m=nP[c]||c;r+=`${m}(${d}) `}n&&(t[c]=d)}}return r=r.trim(),n?r=n(t,o?"":r):o&&(r="none"),r}function Sg(i,t,n){const{style:r,vars:o,transformOrigin:u}=i;let c=!1,f=!1;for(const p in t){const d=t[p];if(Mo.has(p)){c=!0;continue}else if(rg(p)){o[p]=d;continue}else{const m=cE(d,gg[p]);p.startsWith("origin")?(f=!0,u[p]=m):r[p]=m}}if(t.transform||(c||n?r.transform=aP(t,i.transform,n):r.transform&&(r.transform="none")),f){const{originX:p="50%",originY:d="50%",originZ:m=0}=u;r.transformOrigin=`${p} ${d} ${m}`}}const Mg=()=>({style:{},transform:{},transformOrigin:{},vars:{}});function xE(i,t,n){for(const r in t)!In(t[r])&&!yE(r,n)&&(i[r]=t[r])}function rP({transformTemplate:i},t){return Q.useMemo(()=>{const n=Mg();return Sg(n,t,i),Object.assign({},n.vars,n.style)},[t])}function sP(i,t){const n=i.style||{},r={};return xE(r,n,i),Object.assign(r,rP(i,t)),r}function oP(i,t){const n={},r=sP(i,t);return i.drag&&i.dragListener!==!1&&(n.draggable=!1,r.userSelect=r.WebkitUserSelect=r.WebkitTouchCallout="none",r.touchAction=i.drag===!0?"none":`pan-${i.drag==="x"?"y":"x"}`),i.tabIndex===void 0&&(i.onTap||i.onTapStart||i.whileTap)&&(n.tabIndex=0),n.style=r,n}const lP={offset:"stroke-dashoffset",array:"stroke-dasharray"},uP={offset:"strokeDashoffset",array:"strokeDasharray"};function cP(i,t,n=1,r=0,o=!0){i.pathLength=1;const u=o?lP:uP;i[u.offset]=re.transform(-r);const c=re.transform(t),f=re.transform(n);i[u.array]=`${c} ${f}`}function SE(i,{attrX:t,attrY:n,attrScale:r,pathLength:o,pathSpacing:u=1,pathOffset:c=0,...f},p,d,m){if(Sg(i,f,d),p){i.style.viewBox&&(i.attrs.viewBox=i.style.viewBox);return}i.attrs=i.style,i.style={};const{attrs:v,style:_}=i;v.transform&&(_.transform=v.transform,delete v.transform),(_.transform||v.transformOrigin)&&(_.transformOrigin=v.transformOrigin??"50% 50%",delete v.transformOrigin),_.transform&&(_.transformBox=m?.transformBox??"fill-box",delete v.transformBox),t!==void 0&&(v.x=t),n!==void 0&&(v.y=n),r!==void 0&&(v.scale=r),o!==void 0&&cP(v,o,u,c,!1)}const ME=()=>({...Mg(),attrs:{}}),EE=i=>typeof i=="string"&&i.toLowerCase()==="svg";function fP(i,t,n,r){const o=Q.useMemo(()=>{const u=ME();return SE(u,t,EE(r),i.transformTemplate,i.style),{...u.attrs,style:{...u.style}}},[t]);if(i.style){const u={};xE(u,i.style,i),o.style={...u,...o.style}}return o}const hP=["animate","circle","defs","desc","ellipse","g","image","line","filter","marker","mask","metadata","path","pattern","polygon","polyline","rect","stop","switch","symbol","svg","text","tspan","use","view"];function Eg(i){return typeof i!="string"||i.includes("-")?!1:!!(hP.indexOf(i)>-1||/[A-Z]/u.test(i))}function dP(i,t,n,{latestValues:r},o,u=!1){const f=(Eg(i)?fP:oP)(t,r,o,i),p=$3(t,typeof i=="string",u),d=i!==Q.Fragment?{...p,...f,ref:n}:{},{children:m}=t,v=Q.useMemo(()=>In(m)?m.get():m,[m]);return Q.createElement(i,{...d,children:v})}function Nx(i){const t=[{},{}];return i?.values.forEach((n,r)=>{t[0][r]=n.get(),t[1][r]=n.getVelocity()}),t}function Tg(i,t,n,r){if(typeof t=="function"){const[o,u]=Nx(r);t=t(n!==void 0?n:i.custom,o,u)}if(typeof t=="string"&&(t=i.variants&&i.variants[t]),typeof t=="function"){const[o,u]=Nx(r);t=t(n!==void 0?n:i.custom,o,u)}return t}function Zc(i){return In(i)?i.get():i}function pP({scrapeMotionValuesFromProps:i,createRenderState:t},n,r,o){return{latestValues:mP(n,r,o,i),renderState:t()}}function mP(i,t,n,r){const o={},u=r(i,{});for(const _ in u)o[_]=Zc(u[_]);let{initial:c,animate:f}=i;const p=mf(i),d=_E(i);t&&d&&!p&&i.inherit!==!1&&(c===void 0&&(c=t.initial),f===void 0&&(f=t.animate));let m=n?n.initial===!1:!1;m=m||c===!1;const v=m?f:c;if(v&&typeof v!="boolean"&&!pf(v)){const _=Array.isArray(v)?v:[v];for(let x=0;x<_.length;x++){const E=Tg(i,_[x]);if(E){const{transitionEnd:T,transition:S,...y}=E;for(const w in y){let C=y[w];if(Array.isArray(C)){const D=m?C.length-1:0;C=C[D]}C!==null&&(o[w]=C)}for(const w in T)o[w]=T[w]}}}return o}const TE=i=>(t,n)=>{const r=Q.useContext(df),o=Q.useContext(Qm),u=()=>pP(i,t,r,o);return n?u():KU(u)};function bg(i,t,n){const{style:r}=i,o={};for(const u in r)(In(r[u])||t.style&&In(t.style[u])||yE(u,i)||n?.getValue(u)?.liveStyle!==void 0)&&(o[u]=r[u]);return o}const gP=TE({scrapeMotionValuesFromProps:bg,createRenderState:Mg});function bE(i,t,n){const r=bg(i,t,n);for(const o in i)if(In(i[o])||In(t[o])){const u=So.indexOf(o)!==-1?"attr"+o.charAt(0).toUpperCase()+o.substring(1):o;r[u]=i[o]}return r}const vP=TE({scrapeMotionValuesFromProps:bE,createRenderState:ME}),_P=Symbol.for("motionComponentSymbol");function eo(i){return i&&typeof i=="object"&&Object.prototype.hasOwnProperty.call(i,"current")}function yP(i,t,n){return Q.useCallback(r=>{r&&i.onMount&&i.onMount(r),t&&(r?t.mount(r):t.unmount()),n&&(typeof n=="function"?n(r):eo(n)&&(n.current=r))},[t])}const Ag=i=>i.replace(/([a-z])([A-Z])/gu,"$1-$2").toLowerCase(),xP="framerAppearId",AE="data-"+Ag(xP),RE=Q.createContext({});function SP(i,t,n,r,o){const{visualElement:u}=Q.useContext(df),c=Q.useContext(gE),f=Q.useContext(Qm),p=Q.useContext(mE).reducedMotion,d=Q.useRef(null);r=r||c.renderer,!d.current&&r&&(d.current=r(i,{visualState:t,parent:u,props:n,presenceContext:f,blockInitialAnimation:f?f.initial===!1:!1,reducedMotionConfig:p}));const m=d.current,v=Q.useContext(RE);m&&!m.projection&&o&&(m.type==="html"||m.type==="svg")&&MP(d.current,n,o,v);const _=Q.useRef(!1);Q.useInsertionEffect(()=>{m&&_.current&&m.update(n,f)});const x=n[AE],E=Q.useRef(!!x&&!window.MotionHandoffIsComplete?.(x)&&window.MotionHasOptimisedAnimation?.(x));return ZU(()=>{m&&(_.current=!0,window.MotionIsMounted=!0,m.updateFeatures(),m.scheduleRenderMicrotask(),E.current&&m.animationState&&m.animationState.animateChanges())}),Q.useEffect(()=>{m&&(!E.current&&m.animationState&&m.animationState.animateChanges(),E.current&&(queueMicrotask(()=>{window.MotionHandoffMarkAsComplete?.(x)}),E.current=!1),m.enteringChildren=void 0)}),m}function MP(i,t,n,r){const{layoutId:o,layout:u,drag:c,dragConstraints:f,layoutScroll:p,layoutRoot:d,layoutCrossfade:m}=t;i.projection=new n(i.latestValues,t["data-framer-portal-id"]?void 0:CE(i.parent)),i.projection.setOptions({layoutId:o,layout:u,alwaysMeasureLayout:!!c||f&&eo(f),visualElement:i,animationType:typeof u=="string"?u:"both",initialPromotionConfig:r,crossfade:m,layoutScroll:p,layoutRoot:d})}function CE(i){if(i)return i.options.allowProjection!==!1?i.projection:CE(i.parent)}function fp(i,{forwardMotionProps:t=!1}={},n,r){n&&K3(n);const o=Eg(i)?vP:gP;function u(f,p){let d;const m={...Q.useContext(mE),...f,layoutId:EP(f)},{isStatic:v}=m,_=tP(f),x=o(f,v);if(!v&&Zm){TP();const E=bP(m);d=E.MeasureLayout,_.visualElement=SP(i,x,m,r,E.ProjectionNode)}return qt.jsxs(df.Provider,{value:_,children:[d&&_.visualElement?qt.jsx(d,{visualElement:_.visualElement,...m}):null,dP(i,f,yP(x,_.visualElement,p),x,v,t)]})}u.displayName=`motion.${typeof i=="string"?i:`create(${i.displayName??i.name??""})`}`;const c=Q.forwardRef(u);return c[_P]=i,c}function EP({layoutId:i}){const t=Q.useContext(bM).id;return t&&i!==void 0?t+"-"+i:i}function TP(i,t){Q.useContext(gE).strict}function bP(i){const{drag:t,layout:n}=mo;if(!t&&!n)return{};const r={...t,...n};return{MeasureLayout:t?.isEnabled(i)||n?.isEnabled(i)?r.MeasureLayout:void 0,ProjectionNode:r.ProjectionNode}}function AP(i,t){if(typeof Proxy>"u")return fp;const n=new Map,r=(u,c)=>fp(u,c,i,t),o=(u,c)=>r(u,c);return new Proxy(o,{get:(u,c)=>c==="create"?r:(n.has(c)||n.set(c,fp(c,void 0,i,t)),n.get(c))})}function wE({top:i,left:t,right:n,bottom:r}){return{x:{min:t,max:n},y:{min:i,max:r}}}function RP({x:i,y:t}){return{top:t.min,right:i.max,bottom:t.max,left:i.min}}function CP(i,t){if(!t)return i;const n=t({x:i.left,y:i.top}),r=t({x:i.right,y:i.bottom});return{top:n.y,left:n.x,bottom:r.y,right:r.x}}function hp(i){return i===void 0||i===1}function bm({scale:i,scaleX:t,scaleY:n}){return!hp(i)||!hp(t)||!hp(n)}function Xr(i){return bm(i)||DE(i)||i.z||i.rotate||i.rotateX||i.rotateY||i.skewX||i.skewY}function DE(i){return Ox(i.x)||Ox(i.y)}function Ox(i){return i&&i!=="0%"}function of(i,t,n){const r=i-n,o=t*r;return n+o}function Bx(i,t,n,r,o){return o!==void 0&&(i=of(i,o,r)),of(i,n,r)+t}function Am(i,t=0,n=1,r,o){i.min=Bx(i.min,t,n,r,o),i.max=Bx(i.max,t,n,r,o)}function UE(i,{x:t,y:n}){Am(i.x,t.translate,t.scale,t.originPoint),Am(i.y,n.translate,n.scale,n.originPoint)}const Fx=.999999999999,Ix=1.0000000000001;function wP(i,t,n,r=!1){const o=n.length;if(!o)return;t.x=t.y=1;let u,c;for(let f=0;f<o;f++){u=n[f],c=u.projectionDelta;const{visualElement:p}=u.options;p&&p.props.style&&p.props.style.display==="contents"||(r&&u.options.layoutScroll&&u.scroll&&u!==u.root&&io(i,{x:-u.scroll.offset.x,y:-u.scroll.offset.y}),c&&(t.x*=c.x.scale,t.y*=c.y.scale,UE(i,c)),r&&Xr(u.latestValues)&&io(i,u.latestValues))}t.x<Ix&&t.x>Fx&&(t.x=1),t.y<Ix&&t.y>Fx&&(t.y=1)}function no(i,t){i.min=i.min+t,i.max=i.max+t}function zx(i,t,n,r,o=.5){const u=Qe(i.min,i.max,o);Am(i,t,n,u,r)}function io(i,t){zx(i.x,t.x,t.scaleX,t.scale,t.originX),zx(i.y,t.y,t.scaleY,t.scale,t.originY)}function LE(i,t){return wE(CP(i.getBoundingClientRect(),t))}function DP(i,t,n){const r=LE(i,n),{scroll:o}=t;return o&&(no(r.x,o.offset.x),no(r.y,o.offset.y)),r}const Vx=()=>({translate:0,scale:1,origin:0,originPoint:0}),ao=()=>({x:Vx(),y:Vx()}),Hx=()=>({min:0,max:0}),ln=()=>({x:Hx(),y:Hx()}),Rm={current:null},PE={current:!1};function UP(){if(PE.current=!0,!!Zm)if(window.matchMedia){const i=window.matchMedia("(prefers-reduced-motion)"),t=()=>Rm.current=i.matches;i.addEventListener("change",t),t()}else Rm.current=!1}const LP=new WeakMap;function PP(i,t,n){for(const r in t){const o=t[r],u=n[r];if(In(o))i.addValue(r,o);else if(In(u))i.addValue(r,po(o,{owner:i}));else if(u!==o)if(i.hasValue(r)){const c=i.getValue(r);c.liveStyle===!0?c.jump(o):c.hasAnimated||c.set(o)}else{const c=i.getStaticValue(r);i.addValue(r,po(c!==void 0?c:o,{owner:i}))}}for(const r in n)t[r]===void 0&&i.removeValue(r);return t}const Gx=["AnimationStart","AnimationComplete","Update","BeforeLayoutMeasure","LayoutMeasure","LayoutAnimationStart","LayoutAnimationComplete"];class NP{scrapeMotionValuesFromProps(t,n,r){return{}}constructor({parent:t,props:n,presenceContext:r,reducedMotionConfig:o,blockInitialAnimation:u,visualState:c},f={}){this.current=null,this.children=new Set,this.isVariantNode=!1,this.isControllingVariants=!1,this.shouldReduceMotion=null,this.values=new Map,this.KeyframeResolver=pg,this.features={},this.valueSubscriptions=new Map,this.prevMotionValues={},this.events={},this.propEventSubscriptions={},this.notifyUpdate=()=>this.notify("Update",this.latestValues),this.render=()=>{this.current&&(this.triggerBuild(),this.renderInstance(this.current,this.renderState,this.props.style,this.projection))},this.renderScheduledAt=0,this.scheduleRender=()=>{const _=Qn.now();this.renderScheduledAt<_&&(this.renderScheduledAt=_,Ye.render(this.render,!1,!0))};const{latestValues:p,renderState:d}=c;this.latestValues=p,this.baseTarget={...p},this.initialValues=n.initial?{...p}:{},this.renderState=d,this.parent=t,this.props=n,this.presenceContext=r,this.depth=t?t.depth+1:0,this.reducedMotionConfig=o,this.options=f,this.blockInitialAnimation=!!u,this.isControllingVariants=mf(n),this.isVariantNode=_E(n),this.isVariantNode&&(this.variantChildren=new Set),this.manuallyAnimateOnMount=!!(t&&t.current);const{willChange:m,...v}=this.scrapeMotionValuesFromProps(n,{},this);for(const _ in v){const x=v[_];p[_]!==void 0&&In(x)&&x.set(p[_])}}mount(t){this.current=t,LP.set(t,this),this.projection&&!this.projection.instance&&this.projection.mount(t),this.parent&&this.isVariantNode&&!this.isControllingVariants&&(this.removeFromVariantTree=this.parent.addVariantChild(this)),this.values.forEach((n,r)=>this.bindToMotionValue(r,n)),PE.current||UP(),this.shouldReduceMotion=this.reducedMotionConfig==="never"?!1:this.reducedMotionConfig==="always"?!0:Rm.current,this.parent?.addChild(this),this.update(this.props,this.presenceContext)}unmount(){this.projection&&this.projection.unmount(),mr(this.notifyUpdate),mr(this.render),this.valueSubscriptions.forEach(t=>t()),this.valueSubscriptions.clear(),this.removeFromVariantTree&&this.removeFromVariantTree(),this.parent?.removeChild(this);for(const t in this.events)this.events[t].clear();for(const t in this.features){const n=this.features[t];n&&(n.unmount(),n.isMounted=!1)}this.current=null}addChild(t){this.children.add(t),this.enteringChildren??(this.enteringChildren=new Set),this.enteringChildren.add(t)}removeChild(t){this.children.delete(t),this.enteringChildren&&this.enteringChildren.delete(t)}bindToMotionValue(t,n){this.valueSubscriptions.has(t)&&this.valueSubscriptions.get(t)();const r=Mo.has(t);r&&this.onBindTransform&&this.onBindTransform();const o=n.on("change",c=>{this.latestValues[t]=c,this.props.onUpdate&&Ye.preRender(this.notifyUpdate),r&&this.projection&&(this.projection.isTransformDirty=!0),this.scheduleRender()});let u;window.MotionCheckAppearSync&&(u=window.MotionCheckAppearSync(this,t,n)),this.valueSubscriptions.set(t,()=>{o(),u&&u(),n.owner&&n.stop()})}sortNodePosition(t){return!this.current||!this.sortInstanceNodePosition||this.type!==t.type?0:this.sortInstanceNodePosition(this.current,t.current)}updateFeatures(){let t="animation";for(t in mo){const n=mo[t];if(!n)continue;const{isEnabled:r,Feature:o}=n;if(!this.features[t]&&o&&r(this.props)&&(this.features[t]=new o(this)),this.features[t]){const u=this.features[t];u.isMounted?u.update():(u.mount(),u.isMounted=!0)}}}triggerBuild(){this.build(this.renderState,this.latestValues,this.props)}measureViewportBox(){return this.current?this.measureInstanceViewportBox(this.current,this.props):ln()}getStaticValue(t){return this.latestValues[t]}setStaticValue(t,n){this.latestValues[t]=n}update(t,n){(t.transformTemplate||this.props.transformTemplate)&&this.scheduleRender(),this.prevProps=this.props,this.props=t,this.prevPresenceContext=this.presenceContext,this.presenceContext=n;for(let r=0;r<Gx.length;r++){const o=Gx[r];this.propEventSubscriptions[o]&&(this.propEventSubscriptions[o](),delete this.propEventSubscriptions[o]);const u="on"+o,c=t[u];c&&(this.propEventSubscriptions[o]=this.on(o,c))}this.prevMotionValues=PP(this,this.scrapeMotionValuesFromProps(t,this.prevProps,this),this.prevMotionValues),this.handleChildMotionValue&&this.handleChildMotionValue()}getProps(){return this.props}getVariant(t){return this.props.variants?this.props.variants[t]:void 0}getDefaultTransition(){return this.props.transition}getTransformPagePoint(){return this.props.transformPagePoint}getClosestVariantNode(){return this.isVariantNode?this:this.parent?this.parent.getClosestVariantNode():void 0}addVariantChild(t){const n=this.getClosestVariantNode();if(n)return n.variantChildren&&n.variantChildren.add(t),()=>n.variantChildren.delete(t)}addValue(t,n){const r=this.values.get(t);n!==r&&(r&&this.removeValue(t),this.bindToMotionValue(t,n),this.values.set(t,n),this.latestValues[t]=n.get())}removeValue(t){this.values.delete(t);const n=this.valueSubscriptions.get(t);n&&(n(),this.valueSubscriptions.delete(t)),delete this.latestValues[t],this.removeValueFromRenderState(t,this.renderState)}hasValue(t){return this.values.has(t)}getValue(t,n){if(this.props.values&&this.props.values[t])return this.props.values[t];let r=this.values.get(t);return r===void 0&&n!==void 0&&(r=po(n===null?void 0:n,{owner:this}),this.addValue(t,r)),r}readValue(t,n){let r=this.latestValues[t]!==void 0||!this.current?this.latestValues[t]:this.getBaseTargetFromProps(this.props,t)??this.readValueFromInstance(this.current,t,this.options);return r!=null&&(typeof r=="string"&&(AM(r)||CM(r))?r=parseFloat(r):!Y3(r)&&gr.test(n)&&(r=uE(t,n)),this.setBaseTarget(t,In(r)?r.get():r)),In(r)?r.get():r}setBaseTarget(t,n){this.baseTarget[t]=n}getBaseTarget(t){const{initial:n}=this.props;let r;if(typeof n=="string"||typeof n=="object"){const u=Tg(this.props,n,this.presenceContext?.custom);u&&(r=u[t])}if(n&&r!==void 0)return r;const o=this.getBaseTargetFromProps(this.props,t);return o!==void 0&&!In(o)?o:this.initialValues[t]!==void 0&&r===void 0?void 0:this.baseTarget[t]}on(t,n){return this.events[t]||(this.events[t]=new ng),this.events[t].add(n)}notify(t,...n){this.events[t]&&this.events[t].notify(...n)}scheduleRenderMicrotask(){vg.render(this.render)}}class NE extends NP{constructor(){super(...arguments),this.KeyframeResolver=N3}sortInstanceNodePosition(t,n){return t.compareDocumentPosition(n)&2?1:-1}getBaseTargetFromProps(t,n){return t.style?t.style[n]:void 0}removeValueFromRenderState(t,{vars:n,style:r}){delete n[t],delete r[t]}handleChildMotionValue(){this.childSubscription&&(this.childSubscription(),delete this.childSubscription);const{children:t}=this.props;In(t)&&(this.childSubscription=t.on("change",n=>{this.current&&(this.current.textContent=`${n}`)}))}}function OE(i,{style:t,vars:n},r,o){const u=i.style;let c;for(c in t)u[c]=t[c];o?.applyProjectionStyles(u,r);for(c in n)u.setProperty(c,n[c])}function OP(i){return window.getComputedStyle(i)}class BP extends NE{constructor(){super(...arguments),this.type="html",this.renderInstance=OE}readValueFromInstance(t,n){if(Mo.has(n))return this.projection?.isProjecting?_m(n):JL(t,n);{const r=OP(t),o=(rg(n)?r.getPropertyValue(n):r[n])||0;return typeof o=="string"?o.trim():o}}measureInstanceViewportBox(t,{transformPagePoint:n}){return LE(t,n)}build(t,n,r){Sg(t,n,r.transformTemplate)}scrapeMotionValuesFromProps(t,n,r){return bg(t,n,r)}}const BE=new Set(["baseFrequency","diffuseConstant","kernelMatrix","kernelUnitLength","keySplines","keyTimes","limitingConeAngle","markerHeight","markerWidth","numOctaves","targetX","targetY","surfaceScale","specularConstant","specularExponent","stdDeviation","tableValues","viewBox","gradientTransform","pathLength","startOffset","textLength","lengthAdjust"]);function FP(i,t,n,r){OE(i,t,void 0,r);for(const o in t.attrs)i.setAttribute(BE.has(o)?o:Ag(o),t.attrs[o])}class IP extends NE{constructor(){super(...arguments),this.type="svg",this.isSVGTag=!1,this.measureInstanceViewportBox=ln}getBaseTargetFromProps(t,n){return t[n]}readValueFromInstance(t,n){if(Mo.has(n)){const r=lE(n);return r&&r.default||0}return n=BE.has(n)?n:Ag(n),t.getAttribute(n)}scrapeMotionValuesFromProps(t,n,r){return bE(t,n,r)}build(t,n,r){SE(t,n,this.isSVGTag,r.transformTemplate,r.style)}renderInstance(t,n,r,o){FP(t,n,r,o)}mount(t){this.isSVGTag=EE(t.tagName),super.mount(t)}}const zP=(i,t)=>Eg(i)?new IP(t):new BP(t,{allowProjection:i!==Q.Fragment});function oo(i,t,n){const r=i.getProps();return Tg(r,t,n!==void 0?n:r.custom,i)}const Cm=i=>Array.isArray(i);function VP(i,t,n){i.hasValue(t)?i.getValue(t).set(n):i.addValue(t,po(n))}function HP(i){return Cm(i)?i[i.length-1]||0:i}function GP(i,t){const n=oo(i,t);let{transitionEnd:r={},transition:o={},...u}=n||{};u={...u,...r};for(const c in u){const f=HP(u[c]);VP(i,c,f)}}function kP(i){return!!(In(i)&&i.add)}function wm(i,t){const n=i.getValue("willChange");if(kP(n))return n.add(t);if(!n&&wa.WillChange){const r=new wa.WillChange("auto");i.addValue("willChange",r),r.add(t)}}function FE(i){return i.props[AE]}const XP=i=>i!==null;function WP(i,{repeat:t,repeatType:n="loop"},r){const o=i.filter(XP),u=t&&n!=="loop"&&t%2===1?0:o.length-1;return o[u]}const qP={type:"spring",stiffness:500,damping:25,restSpeed:10},YP=i=>({type:"spring",stiffness:550,damping:i===0?2*Math.sqrt(550):30,restSpeed:10}),jP={type:"keyframes",duration:.8},KP={type:"keyframes",ease:[.25,.1,.35,1],duration:.3},ZP=(i,{keyframes:t})=>t.length>2?jP:Mo.has(i)?i.startsWith("scale")?YP(t[1]):qP:KP;function QP({when:i,delay:t,delayChildren:n,staggerChildren:r,staggerDirection:o,repeat:u,repeatType:c,repeatDelay:f,from:p,elapsed:d,...m}){return!!Object.keys(m).length}const Rg=(i,t,n,r={},o,u)=>c=>{const f=mg(r,i)||{},p=f.delay||r.delay||0;let{elapsed:d=0}=r;d=d-Ki(p);const m={keyframes:Array.isArray(n)?n:[null,n],ease:"easeOut",velocity:t.getVelocity(),...f,delay:-d,onUpdate:_=>{t.set(_),f.onUpdate&&f.onUpdate(_)},onComplete:()=>{c(),f.onComplete&&f.onComplete()},name:i,motionValue:t,element:u?void 0:o};QP(f)||Object.assign(m,ZP(i,m)),m.duration&&(m.duration=Ki(m.duration)),m.repeatDelay&&(m.repeatDelay=Ki(m.repeatDelay)),m.from!==void 0&&(m.keyframes[0]=m.from);let v=!1;if((m.type===!1||m.duration===0&&!m.repeatDelay)&&(Em(m),m.delay===0&&(v=!0)),(wa.instantAnimations||wa.skipAnimations)&&(v=!0,Em(m),m.delay=0),m.allowFlatten=!f.type&&!f.ease,v&&!u&&t.get()!==void 0){const _=WP(m.keyframes,f);if(_!==void 0){Ye.update(()=>{m.onUpdate(_),m.onComplete()});return}}return f.isSync?new dg(m):new M3(m)};function $P({protectedKeys:i,needsAnimating:t},n){const r=i.hasOwnProperty(n)&&t[n]!==!0;return t[n]=!1,r}function IE(i,t,{delay:n=0,transitionOverride:r,type:o}={}){let{transition:u=i.getDefaultTransition(),transitionEnd:c,...f}=t;r&&(u=r);const p=[],d=o&&i.animationState&&i.animationState.getState()[o];for(const m in f){const v=i.getValue(m,i.latestValues[m]??null),_=f[m];if(_===void 0||d&&$P(d,m))continue;const x={delay:n,...mg(u||{},m)},E=v.get();if(E!==void 0&&!v.isAnimating&&!Array.isArray(_)&&_===E&&!x.velocity)continue;let T=!1;if(window.MotionHandoffAnimation){const y=FE(i);if(y){const w=window.MotionHandoffAnimation(y,m,Ye);w!==null&&(x.startTime=w,T=!0)}}wm(i,m),v.start(Rg(m,v,_,i.shouldReduceMotion&&rE.has(m)?{type:!1}:x,i,T));const S=v.animation;S&&p.push(S)}return c&&Promise.all(p).then(()=>{Ye.update(()=>{c&&GP(i,c)})}),p}function zE(i,t,n,r=0,o=1){const u=Array.from(i).sort((d,m)=>d.sortNodePosition(m)).indexOf(t),c=i.size,f=(c-1)*r;return typeof n=="function"?n(u,c):o===1?u*r:f-u*r}function Dm(i,t,n={}){const r=oo(i,t,n.type==="exit"?i.presenceContext?.custom:void 0);let{transition:o=i.getDefaultTransition()||{}}=r||{};n.transitionOverride&&(o=n.transitionOverride);const u=r?()=>Promise.all(IE(i,r,n)):()=>Promise.resolve(),c=i.variantChildren&&i.variantChildren.size?(p=0)=>{const{delayChildren:d=0,staggerChildren:m,staggerDirection:v}=o;return JP(i,t,p,d,m,v,n)}:()=>Promise.resolve(),{when:f}=o;if(f){const[p,d]=f==="beforeChildren"?[u,c]:[c,u];return p().then(()=>d())}else return Promise.all([u(),c(n.delay)])}function JP(i,t,n=0,r=0,o=0,u=1,c){const f=[];for(const p of i.variantChildren)p.notify("AnimationStart",t),f.push(Dm(p,t,{...c,delay:n+(typeof r=="function"?0:r)+zE(i.variantChildren,p,r,o,u)}).then(()=>p.notify("AnimationComplete",t)));return Promise.all(f)}function tN(i,t,n={}){i.notify("AnimationStart",t);let r;if(Array.isArray(t)){const o=t.map(u=>Dm(i,u,n));r=Promise.all(o)}else if(typeof t=="string")r=Dm(i,t,n);else{const o=typeof t=="function"?oo(i,t,n.custom):t;r=Promise.all(IE(i,o,n))}return r.then(()=>{i.notify("AnimationComplete",t)})}function VE(i,t){if(!Array.isArray(t))return!1;const n=t.length;if(n!==i.length)return!1;for(let r=0;r<n;r++)if(t[r]!==i[r])return!1;return!0}const eN=xg.length;function HE(i){if(!i)return;if(!i.isControllingVariants){const n=i.parent?HE(i.parent)||{}:{};return i.props.initial!==void 0&&(n.initial=i.props.initial),n}const t={};for(let n=0;n<eN;n++){const r=xg[n],o=i.props[r];(Gl(o)||o===!1)&&(t[r]=o)}return t}const nN=[...yg].reverse(),iN=yg.length;function aN(i){return t=>Promise.all(t.map(({animation:n,options:r})=>tN(i,n,r)))}function rN(i){let t=aN(i),n=kx(),r=!0;const o=p=>(d,m)=>{const v=oo(i,m,p==="exit"?i.presenceContext?.custom:void 0);if(v){const{transition:_,transitionEnd:x,...E}=v;d={...d,...E,...x}}return d};function u(p){t=p(i)}function c(p){const{props:d}=i,m=HE(i.parent)||{},v=[],_=new Set;let x={},E=1/0;for(let S=0;S<iN;S++){const y=nN[S],w=n[y],C=d[y]!==void 0?d[y]:m[y],D=Gl(C),N=y===p?w.isActive:null;N===!1&&(E=S);let F=C===m[y]&&C!==d[y]&&D;if(F&&r&&i.manuallyAnimateOnMount&&(F=!1),w.protectedKeys={...x},!w.isActive&&N===null||!C&&!w.prevProp||pf(C)||typeof C=="boolean")continue;const z=sN(w.prevProp,C);let H=z||y===p&&w.isActive&&!F&&D||S>E&&D,U=!1;const L=Array.isArray(C)?C:[C];let G=L.reduce(o(y),{});N===!1&&(G={});const{prevResolvedValues:nt={}}=w,ct={...nt,...G},pt=q=>{H=!0,_.has(q)&&(U=!0,_.delete(q)),w.needsAnimating[q]=!0;const W=i.getValue(q);W&&(W.liveStyle=!1)};for(const q in ct){const W=G[q],yt=nt[q];if(x.hasOwnProperty(q))continue;let P=!1;Cm(W)&&Cm(yt)?P=!VE(W,yt):P=W!==yt,P?W!=null?pt(q):_.add(q):W!==void 0&&_.has(q)?pt(q):w.protectedKeys[q]=!0}w.prevProp=C,w.prevResolvedValues=G,w.isActive&&(x={...x,...G}),r&&i.blockInitialAnimation&&(H=!1);const ut=F&&z;H&&(!ut||U)&&v.push(...L.map(q=>{const W={type:y};if(typeof q=="string"&&r&&!ut&&i.manuallyAnimateOnMount&&i.parent){const{parent:yt}=i,P=oo(yt,q);if(yt.enteringChildren&&P){const{delayChildren:J}=P.transition||{};W.delay=zE(yt.enteringChildren,i,J)}}return{animation:q,options:W}}))}if(_.size){const S={};if(typeof d.initial!="boolean"){const y=oo(i,Array.isArray(d.initial)?d.initial[0]:d.initial);y&&y.transition&&(S.transition=y.transition)}_.forEach(y=>{const w=i.getBaseTarget(y),C=i.getValue(y);C&&(C.liveStyle=!0),S[y]=w??null}),v.push({animation:S})}let T=!!v.length;return r&&(d.initial===!1||d.initial===d.animate)&&!i.manuallyAnimateOnMount&&(T=!1),r=!1,T?t(v):Promise.resolve()}function f(p,d){if(n[p].isActive===d)return Promise.resolve();i.variantChildren?.forEach(v=>v.animationState?.setActive(p,d)),n[p].isActive=d;const m=c(p);for(const v in n)n[v].protectedKeys={};return m}return{animateChanges:c,setActive:f,setAnimateFunction:u,getState:()=>n,reset:()=>{n=kx(),r=!0}}}function sN(i,t){return typeof t=="string"?t!==i:Array.isArray(t)?!VE(t,i):!1}function Hr(i=!1){return{isActive:i,protectedKeys:{},needsAnimating:{},prevResolvedValues:{}}}function kx(){return{animate:Hr(!0),whileInView:Hr(),whileHover:Hr(),whileTap:Hr(),whileDrag:Hr(),whileFocus:Hr(),exit:Hr()}}class vr{constructor(t){this.isMounted=!1,this.node=t}update(){}}class oN extends vr{constructor(t){super(t),t.animationState||(t.animationState=rN(t))}updateAnimationControlsSubscription(){const{animate:t}=this.node.getProps();pf(t)&&(this.unmountControls=t.subscribe(this.node))}mount(){this.updateAnimationControlsSubscription()}update(){const{animate:t}=this.node.getProps(),{animate:n}=this.node.prevProps||{};t!==n&&this.updateAnimationControlsSubscription()}unmount(){this.node.animationState.reset(),this.unmountControls?.()}}let lN=0;class uN extends vr{constructor(){super(...arguments),this.id=lN++}update(){if(!this.node.presenceContext)return;const{isPresent:t,onExitComplete:n}=this.node.presenceContext,{isPresent:r}=this.node.prevPresenceContext||{};if(!this.node.animationState||t===r)return;const o=this.node.animationState.setActive("exit",!t);n&&!t&&o.then(()=>{n(this.id)})}mount(){const{register:t,onExitComplete:n}=this.node.presenceContext||{};n&&n(this.id),t&&(this.unmount=t(this.id))}unmount(){}}const cN={animation:{Feature:oN},exit:{Feature:uN}};function Xl(i,t,n,r={passive:!0}){return i.addEventListener(t,n,r),()=>i.removeEventListener(t,n)}function iu(i){return{point:{x:i.pageX,y:i.pageY}}}const fN=i=>t=>_g(t)&&i(t,iu(t));function Dl(i,t,n,r){return Xl(i,t,fN(n),r)}const GE=1e-4,hN=1-GE,dN=1+GE,kE=.01,pN=0-kE,mN=0+kE;function kn(i){return i.max-i.min}function gN(i,t,n){return Math.abs(i-t)<=n}function Xx(i,t,n,r=.5){i.origin=r,i.originPoint=Qe(t.min,t.max,i.origin),i.scale=kn(n)/kn(t),i.translate=Qe(n.min,n.max,i.origin)-i.originPoint,(i.scale>=hN&&i.scale<=dN||isNaN(i.scale))&&(i.scale=1),(i.translate>=pN&&i.translate<=mN||isNaN(i.translate))&&(i.translate=0)}function Ul(i,t,n,r){Xx(i.x,t.x,n.x,r?r.originX:void 0),Xx(i.y,t.y,n.y,r?r.originY:void 0)}function Wx(i,t,n){i.min=n.min+t.min,i.max=i.min+kn(t)}function vN(i,t,n){Wx(i.x,t.x,n.x),Wx(i.y,t.y,n.y)}function qx(i,t,n){i.min=t.min-n.min,i.max=i.min+kn(t)}function Ll(i,t,n){qx(i.x,t.x,n.x),qx(i.y,t.y,n.y)}function xi(i){return[i("x"),i("y")]}const XE=({current:i})=>i?i.ownerDocument.defaultView:null,Yx=(i,t)=>Math.abs(i-t);function _N(i,t){const n=Yx(i.x,t.x),r=Yx(i.y,t.y);return Math.sqrt(n**2+r**2)}class WE{constructor(t,n,{transformPagePoint:r,contextWindow:o=window,dragSnapToOrigin:u=!1,distanceThreshold:c=3}={}){if(this.startEvent=null,this.lastMoveEvent=null,this.lastMoveEventInfo=null,this.handlers={},this.contextWindow=window,this.updatePoint=()=>{if(!(this.lastMoveEvent&&this.lastMoveEventInfo))return;const _=pp(this.lastMoveEventInfo,this.history),x=this.startEvent!==null,E=_N(_.offset,{x:0,y:0})>=this.distanceThreshold;if(!x&&!E)return;const{point:T}=_,{timestamp:S}=Un;this.history.push({...T,timestamp:S});const{onStart:y,onMove:w}=this.handlers;x||(y&&y(this.lastMoveEvent,_),this.startEvent=this.lastMoveEvent),w&&w(this.lastMoveEvent,_)},this.handlePointerMove=(_,x)=>{this.lastMoveEvent=_,this.lastMoveEventInfo=dp(x,this.transformPagePoint),Ye.update(this.updatePoint,!0)},this.handlePointerUp=(_,x)=>{this.end();const{onEnd:E,onSessionEnd:T,resumeAnimation:S}=this.handlers;if(this.dragSnapToOrigin&&S&&S(),!(this.lastMoveEvent&&this.lastMoveEventInfo))return;const y=pp(_.type==="pointercancel"?this.lastMoveEventInfo:dp(x,this.transformPagePoint),this.history);this.startEvent&&E&&E(_,y),T&&T(_,y)},!_g(t))return;this.dragSnapToOrigin=u,this.handlers=n,this.transformPagePoint=r,this.distanceThreshold=c,this.contextWindow=o||window;const f=iu(t),p=dp(f,this.transformPagePoint),{point:d}=p,{timestamp:m}=Un;this.history=[{...d,timestamp:m}];const{onSessionStart:v}=n;v&&v(t,pp(p,this.history)),this.removeListeners=tu(Dl(this.contextWindow,"pointermove",this.handlePointerMove),Dl(this.contextWindow,"pointerup",this.handlePointerUp),Dl(this.contextWindow,"pointercancel",this.handlePointerUp))}updateHandlers(t){this.handlers=t}end(){this.removeListeners&&this.removeListeners(),mr(this.updatePoint)}}function dp(i,t){return t?{point:t(i.point)}:i}function jx(i,t){return{x:i.x-t.x,y:i.y-t.y}}function pp({point:i},t){return{point:i,delta:jx(i,qE(t)),offset:jx(i,yN(t)),velocity:xN(t,.1)}}function yN(i){return i[0]}function qE(i){return i[i.length-1]}function xN(i,t){if(i.length<2)return{x:0,y:0};let n=i.length-1,r=null;const o=qE(i);for(;n>=0&&(r=i[n],!(o.timestamp-r.timestamp>Ki(t)));)n--;if(!r)return{x:0,y:0};const u=Zi(o.timestamp-r.timestamp);if(u===0)return{x:0,y:0};const c={x:(o.x-r.x)/u,y:(o.y-r.y)/u};return c.x===1/0&&(c.x=0),c.y===1/0&&(c.y=0),c}function SN(i,{min:t,max:n},r){return t!==void 0&&i<t?i=r?Qe(t,i,r.min):Math.max(i,t):n!==void 0&&i>n&&(i=r?Qe(n,i,r.max):Math.min(i,n)),i}function Kx(i,t,n){return{min:t!==void 0?i.min+t:void 0,max:n!==void 0?i.max+n-(i.max-i.min):void 0}}function MN(i,{top:t,left:n,bottom:r,right:o}){return{x:Kx(i.x,n,o),y:Kx(i.y,t,r)}}function Zx(i,t){let n=t.min-i.min,r=t.max-i.max;return t.max-t.min<i.max-i.min&&([n,r]=[r,n]),{min:n,max:r}}function EN(i,t){return{x:Zx(i.x,t.x),y:Zx(i.y,t.y)}}function TN(i,t){let n=.5;const r=kn(i),o=kn(t);return o>r?n=zl(t.min,t.max-r,i.min):r>o&&(n=zl(i.min,i.max-o,t.min)),Ca(0,1,n)}function bN(i,t){const n={};return t.min!==void 0&&(n.min=t.min-i.min),t.max!==void 0&&(n.max=t.max-i.min),n}const Um=.35;function AN(i=Um){return i===!1?i=0:i===!0&&(i=Um),{x:Qx(i,"left","right"),y:Qx(i,"top","bottom")}}function Qx(i,t,n){return{min:$x(i,t),max:$x(i,n)}}function $x(i,t){return typeof i=="number"?i:i[t]||0}const RN=new WeakMap;class CN{constructor(t){this.openDragLock=null,this.isDragging=!1,this.currentDirection=null,this.originPoint={x:0,y:0},this.constraints=!1,this.hasMutatedConstraints=!1,this.elastic=ln(),this.latestPointerEvent=null,this.latestPanInfo=null,this.visualElement=t}start(t,{snapToCursor:n=!1,distanceThreshold:r}={}){const{presenceContext:o}=this.visualElement;if(o&&o.isPresent===!1)return;const u=v=>{const{dragSnapToOrigin:_}=this.getProps();_?this.pauseAnimation():this.stopAnimation(),n&&this.snapToCursor(iu(v).point)},c=(v,_)=>{const{drag:x,dragPropagation:E,onDragStart:T}=this.getProps();if(x&&!E&&(this.openDragLock&&this.openDragLock(),this.openDragLock=z3(x),!this.openDragLock))return;this.latestPointerEvent=v,this.latestPanInfo=_,this.isDragging=!0,this.currentDirection=null,this.resolveConstraints(),this.visualElement.projection&&(this.visualElement.projection.isAnimationBlocked=!0,this.visualElement.projection.target=void 0),xi(y=>{let w=this.getAxisMotionValue(y).get()||0;if(Qi.test(w)){const{projection:C}=this.visualElement;if(C&&C.layout){const D=C.layout.layoutBox[y];D&&(w=kn(D)*(parseFloat(w)/100))}}this.originPoint[y]=w}),T&&Ye.postRender(()=>T(v,_)),wm(this.visualElement,"transform");const{animationState:S}=this.visualElement;S&&S.setActive("whileDrag",!0)},f=(v,_)=>{this.latestPointerEvent=v,this.latestPanInfo=_;const{dragPropagation:x,dragDirectionLock:E,onDirectionLock:T,onDrag:S}=this.getProps();if(!x&&!this.openDragLock)return;const{offset:y}=_;if(E&&this.currentDirection===null){this.currentDirection=wN(y),this.currentDirection!==null&&T&&T(this.currentDirection);return}this.updateAxis("x",_.point,y),this.updateAxis("y",_.point,y),this.visualElement.render(),S&&S(v,_)},p=(v,_)=>{this.latestPointerEvent=v,this.latestPanInfo=_,this.stop(v,_),this.latestPointerEvent=null,this.latestPanInfo=null},d=()=>xi(v=>this.getAnimationState(v)==="paused"&&this.getAxisMotionValue(v).animation?.play()),{dragSnapToOrigin:m}=this.getProps();this.panSession=new WE(t,{onSessionStart:u,onStart:c,onMove:f,onSessionEnd:p,resumeAnimation:d},{transformPagePoint:this.visualElement.getTransformPagePoint(),dragSnapToOrigin:m,distanceThreshold:r,contextWindow:XE(this.visualElement)})}stop(t,n){const r=t||this.latestPointerEvent,o=n||this.latestPanInfo,u=this.isDragging;if(this.cancel(),!u||!o||!r)return;const{velocity:c}=o;this.startAnimation(c);const{onDragEnd:f}=this.getProps();f&&Ye.postRender(()=>f(r,o))}cancel(){this.isDragging=!1;const{projection:t,animationState:n}=this.visualElement;t&&(t.isAnimationBlocked=!1),this.panSession&&this.panSession.end(),this.panSession=void 0;const{dragPropagation:r}=this.getProps();!r&&this.openDragLock&&(this.openDragLock(),this.openDragLock=null),n&&n.setActive("whileDrag",!1)}updateAxis(t,n,r){const{drag:o}=this.getProps();if(!r||!zc(t,o,this.currentDirection))return;const u=this.getAxisMotionValue(t);let c=this.originPoint[t]+r[t];this.constraints&&this.constraints[t]&&(c=SN(c,this.constraints[t],this.elastic[t])),u.set(c)}resolveConstraints(){const{dragConstraints:t,dragElastic:n}=this.getProps(),r=this.visualElement.projection&&!this.visualElement.projection.layout?this.visualElement.projection.measure(!1):this.visualElement.projection?.layout,o=this.constraints;t&&eo(t)?this.constraints||(this.constraints=this.resolveRefConstraints()):t&&r?this.constraints=MN(r.layoutBox,t):this.constraints=!1,this.elastic=AN(n),o!==this.constraints&&r&&this.constraints&&!this.hasMutatedConstraints&&xi(u=>{this.constraints!==!1&&this.getAxisMotionValue(u)&&(this.constraints[u]=bN(r.layoutBox[u],this.constraints[u]))})}resolveRefConstraints(){const{dragConstraints:t,onMeasureDragConstraints:n}=this.getProps();if(!t||!eo(t))return!1;const r=t.current,{projection:o}=this.visualElement;if(!o||!o.layout)return!1;const u=DP(r,o.root,this.visualElement.getTransformPagePoint());let c=EN(o.layout.layoutBox,u);if(n){const f=n(RP(c));this.hasMutatedConstraints=!!f,f&&(c=wE(f))}return c}startAnimation(t){const{drag:n,dragMomentum:r,dragElastic:o,dragTransition:u,dragSnapToOrigin:c,onDragTransitionEnd:f}=this.getProps(),p=this.constraints||{},d=xi(m=>{if(!zc(m,n,this.currentDirection))return;let v=p&&p[m]||{};c&&(v={min:0,max:0});const _=o?200:1e6,x=o?40:1e7,E={type:"inertia",velocity:r?t[m]:0,bounceStiffness:_,bounceDamping:x,timeConstant:750,restDelta:1,restSpeed:10,...u,...v};return this.startAxisValueAnimation(m,E)});return Promise.all(d).then(f)}startAxisValueAnimation(t,n){const r=this.getAxisMotionValue(t);return wm(this.visualElement,t),r.start(Rg(t,r,0,n,this.visualElement,!1))}stopAnimation(){xi(t=>this.getAxisMotionValue(t).stop())}pauseAnimation(){xi(t=>this.getAxisMotionValue(t).animation?.pause())}getAnimationState(t){return this.getAxisMotionValue(t).animation?.state}getAxisMotionValue(t){const n=`_drag${t.toUpperCase()}`,r=this.visualElement.getProps(),o=r[n];return o||this.visualElement.getValue(t,(r.initial?r.initial[t]:void 0)||0)}snapToCursor(t){xi(n=>{const{drag:r}=this.getProps();if(!zc(n,r,this.currentDirection))return;const{projection:o}=this.visualElement,u=this.getAxisMotionValue(n);if(o&&o.layout){const{min:c,max:f}=o.layout.layoutBox[n];u.set(t[n]-Qe(c,f,.5))}})}scalePositionWithinConstraints(){if(!this.visualElement.current)return;const{drag:t,dragConstraints:n}=this.getProps(),{projection:r}=this.visualElement;if(!eo(n)||!r||!this.constraints)return;this.stopAnimation();const o={x:0,y:0};xi(c=>{const f=this.getAxisMotionValue(c);if(f&&this.constraints!==!1){const p=f.get();o[c]=TN({min:p,max:p},this.constraints[c])}});const{transformTemplate:u}=this.visualElement.getProps();this.visualElement.current.style.transform=u?u({},""):"none",r.root&&r.root.updateScroll(),r.updateLayout(),this.resolveConstraints(),xi(c=>{if(!zc(c,t,null))return;const f=this.getAxisMotionValue(c),{min:p,max:d}=this.constraints[c];f.set(Qe(p,d,o[c]))})}addListeners(){if(!this.visualElement.current)return;RN.set(this.visualElement,this);const t=this.visualElement.current,n=Dl(t,"pointerdown",p=>{const{drag:d,dragListener:m=!0}=this.getProps();d&&m&&this.start(p)}),r=()=>{const{dragConstraints:p}=this.getProps();eo(p)&&p.current&&(this.constraints=this.resolveRefConstraints())},{projection:o}=this.visualElement,u=o.addEventListener("measure",r);o&&!o.layout&&(o.root&&o.root.updateScroll(),o.updateLayout()),Ye.read(r);const c=Xl(window,"resize",()=>this.scalePositionWithinConstraints()),f=o.addEventListener("didUpdate",(({delta:p,hasLayoutChanged:d})=>{this.isDragging&&d&&(xi(m=>{const v=this.getAxisMotionValue(m);v&&(this.originPoint[m]+=p[m].translate,v.set(v.get()+p[m].translate))}),this.visualElement.render())}));return()=>{c(),n(),u(),f&&f()}}getProps(){const t=this.visualElement.getProps(),{drag:n=!1,dragDirectionLock:r=!1,dragPropagation:o=!1,dragConstraints:u=!1,dragElastic:c=Um,dragMomentum:f=!0}=t;return{...t,drag:n,dragDirectionLock:r,dragPropagation:o,dragConstraints:u,dragElastic:c,dragMomentum:f}}}function zc(i,t,n){return(t===!0||t===i)&&(n===null||n===i)}function wN(i,t=10){let n=null;return Math.abs(i.y)>t?n="y":Math.abs(i.x)>t&&(n="x"),n}class DN extends vr{constructor(t){super(t),this.removeGroupControls=Ei,this.removeListeners=Ei,this.controls=new CN(t)}mount(){const{dragControls:t}=this.node.getProps();t&&(this.removeGroupControls=t.subscribe(this.controls)),this.removeListeners=this.controls.addListeners()||Ei}unmount(){this.removeGroupControls(),this.removeListeners()}}const Jx=i=>(t,n)=>{i&&Ye.postRender(()=>i(t,n))};class UN extends vr{constructor(){super(...arguments),this.removePointerDownListener=Ei}onPointerDown(t){this.session=new WE(t,this.createPanHandlers(),{transformPagePoint:this.node.getTransformPagePoint(),contextWindow:XE(this.node)})}createPanHandlers(){const{onPanSessionStart:t,onPanStart:n,onPan:r,onPanEnd:o}=this.node.getProps();return{onSessionStart:Jx(t),onStart:Jx(n),onMove:r,onEnd:(u,c)=>{delete this.session,o&&Ye.postRender(()=>o(u,c))}}}mount(){this.removePointerDownListener=Dl(this.node.current,"pointerdown",t=>this.onPointerDown(t))}update(){this.session&&this.session.updateHandlers(this.createPanHandlers())}unmount(){this.removePointerDownListener(),this.session&&this.session.end()}}const Qc={hasAnimatedSinceResize:!0,hasEverUpdated:!1};function tS(i,t){return t.max===t.min?0:i/(t.max-t.min)*100}const bl={correct:(i,t)=>{if(!t.target)return i;if(typeof i=="string")if(re.test(i))i=parseFloat(i);else return i;const n=tS(i,t.target.x),r=tS(i,t.target.y);return`${n}% ${r}%`}},LN={correct:(i,{treeScale:t,projectionDelta:n})=>{const r=i,o=gr.parse(i);if(o.length>5)return r;const u=gr.createTransformer(i),c=typeof o[0]!="number"?1:0,f=n.x.scale*t.x,p=n.y.scale*t.y;o[0+c]/=f,o[1+c]/=p;const d=Qe(f,p,.5);return typeof o[2+c]=="number"&&(o[2+c]/=d),typeof o[3+c]=="number"&&(o[3+c]/=d),u(o)}};let mp=!1;class PN extends Q.Component{componentDidMount(){const{visualElement:t,layoutGroup:n,switchLayoutGroup:r,layoutId:o}=this.props,{projection:u}=t;eP(NN),u&&(n.group&&n.group.add(u),r&&r.register&&o&&r.register(u),mp&&u.root.didUpdate(),u.addEventListener("animationComplete",()=>{this.safeToRemove()}),u.setOptions({...u.options,onExitComplete:()=>this.safeToRemove()})),Qc.hasEverUpdated=!0}getSnapshotBeforeUpdate(t){const{layoutDependency:n,visualElement:r,drag:o,isPresent:u}=this.props,{projection:c}=r;return c&&(c.isPresent=u,mp=!0,o||t.layoutDependency!==n||n===void 0||t.isPresent!==u?c.willUpdate():this.safeToRemove(),t.isPresent!==u&&(u?c.promote():c.relegate()||Ye.postRender(()=>{const f=c.getStack();(!f||!f.members.length)&&this.safeToRemove()}))),null}componentDidUpdate(){const{projection:t}=this.props.visualElement;t&&(t.root.didUpdate(),vg.postRender(()=>{!t.currentAnimation&&t.isLead()&&this.safeToRemove()}))}componentWillUnmount(){const{visualElement:t,layoutGroup:n,switchLayoutGroup:r}=this.props,{projection:o}=t;mp=!0,o&&(o.scheduleCheckAfterUnmount(),n&&n.group&&n.group.remove(o),r&&r.deregister&&r.deregister(o))}safeToRemove(){const{safeToRemove:t}=this.props;t&&t()}render(){return null}}function YE(i){const[t,n]=j3(),r=Q.useContext(bM);return qt.jsx(PN,{...i,layoutGroup:r,switchLayoutGroup:Q.useContext(RE),isPresent:t,safeToRemove:n})}const NN={borderRadius:{...bl,applyTo:["borderTopLeftRadius","borderTopRightRadius","borderBottomLeftRadius","borderBottomRightRadius"]},borderTopLeftRadius:bl,borderTopRightRadius:bl,borderBottomLeftRadius:bl,borderBottomRightRadius:bl,boxShadow:LN};function ON(i,t,n){const r=In(i)?i:po(i);return r.start(Rg("",r,t,n)),r.animation}const BN=(i,t)=>i.depth-t.depth;class FN{constructor(){this.children=[],this.isDirty=!1}add(t){$m(this.children,t),this.isDirty=!0}remove(t){Jm(this.children,t),this.isDirty=!0}forEach(t){this.isDirty&&this.children.sort(BN),this.isDirty=!1,this.children.forEach(t)}}function IN(i,t){const n=Qn.now(),r=({timestamp:o})=>{const u=o-n;u>=t&&(mr(r),i(u-t))};return Ye.setup(r,!0),()=>mr(r)}const jE=["TopLeft","TopRight","BottomLeft","BottomRight"],zN=jE.length,eS=i=>typeof i=="string"?parseFloat(i):i,nS=i=>typeof i=="number"||re.test(i);function VN(i,t,n,r,o,u){o?(i.opacity=Qe(0,n.opacity??1,HN(r)),i.opacityExit=Qe(t.opacity??1,0,GN(r))):u&&(i.opacity=Qe(t.opacity??1,n.opacity??1,r));for(let c=0;c<zN;c++){const f=`border${jE[c]}Radius`;let p=iS(t,f),d=iS(n,f);if(p===void 0&&d===void 0)continue;p||(p=0),d||(d=0),p===0||d===0||nS(p)===nS(d)?(i[f]=Math.max(Qe(eS(p),eS(d),r),0),(Qi.test(d)||Qi.test(p))&&(i[f]+="%")):i[f]=d}(t.rotate||n.rotate)&&(i.rotate=Qe(t.rotate||0,n.rotate||0,r))}function iS(i,t){return i[t]!==void 0?i[t]:i.borderRadius}const HN=KE(0,.5,BM),GN=KE(.5,.95,Ei);function KE(i,t,n){return r=>r<i?0:r>t?1:n(zl(i,t,r))}function aS(i,t){i.min=t.min,i.max=t.max}function yi(i,t){aS(i.x,t.x),aS(i.y,t.y)}function rS(i,t){i.translate=t.translate,i.scale=t.scale,i.originPoint=t.originPoint,i.origin=t.origin}function sS(i,t,n,r,o){return i-=t,i=of(i,1/n,r),o!==void 0&&(i=of(i,1/o,r)),i}function kN(i,t=0,n=1,r=.5,o,u=i,c=i){if(Qi.test(t)&&(t=parseFloat(t),t=Qe(c.min,c.max,t/100)-c.min),typeof t!="number")return;let f=Qe(u.min,u.max,r);i===u&&(f-=t),i.min=sS(i.min,t,n,f,o),i.max=sS(i.max,t,n,f,o)}function oS(i,t,[n,r,o],u,c){kN(i,t[n],t[r],t[o],t.scale,u,c)}const XN=["x","scaleX","originX"],WN=["y","scaleY","originY"];function lS(i,t,n,r){oS(i.x,t,XN,n?n.x:void 0,r?r.x:void 0),oS(i.y,t,WN,n?n.y:void 0,r?r.y:void 0)}function uS(i){return i.translate===0&&i.scale===1}function ZE(i){return uS(i.x)&&uS(i.y)}function cS(i,t){return i.min===t.min&&i.max===t.max}function qN(i,t){return cS(i.x,t.x)&&cS(i.y,t.y)}function fS(i,t){return Math.round(i.min)===Math.round(t.min)&&Math.round(i.max)===Math.round(t.max)}function QE(i,t){return fS(i.x,t.x)&&fS(i.y,t.y)}function hS(i){return kn(i.x)/kn(i.y)}function dS(i,t){return i.translate===t.translate&&i.scale===t.scale&&i.originPoint===t.originPoint}class YN{constructor(){this.members=[]}add(t){$m(this.members,t),t.scheduleRender()}remove(t){if(Jm(this.members,t),t===this.prevLead&&(this.prevLead=void 0),t===this.lead){const n=this.members[this.members.length-1];n&&this.promote(n)}}relegate(t){const n=this.members.findIndex(o=>t===o);if(n===0)return!1;let r;for(let o=n;o>=0;o--){const u=this.members[o];if(u.isPresent!==!1){r=u;break}}return r?(this.promote(r),!0):!1}promote(t,n){const r=this.lead;if(t!==r&&(this.prevLead=r,this.lead=t,t.show(),r)){r.instance&&r.scheduleRender(),t.scheduleRender(),t.resumeFrom=r,n&&(t.resumeFrom.preserveOpacity=!0),r.snapshot&&(t.snapshot=r.snapshot,t.snapshot.latestValues=r.animationValues||r.latestValues),t.root&&t.root.isUpdating&&(t.isLayoutDirty=!0);const{crossfade:o}=t.options;o===!1&&r.hide()}}exitAnimationComplete(){this.members.forEach(t=>{const{options:n,resumingFrom:r}=t;n.onExitComplete&&n.onExitComplete(),r&&r.options.onExitComplete&&r.options.onExitComplete()})}scheduleRender(){this.members.forEach(t=>{t.instance&&t.scheduleRender(!1)})}removeLeadSnapshot(){this.lead&&this.lead.snapshot&&(this.lead.snapshot=void 0)}}function jN(i,t,n){let r="";const o=i.x.translate/t.x,u=i.y.translate/t.y,c=n?.z||0;if((o||u||c)&&(r=`translate3d(${o}px, ${u}px, ${c}px) `),(t.x!==1||t.y!==1)&&(r+=`scale(${1/t.x}, ${1/t.y}) `),n){const{transformPerspective:d,rotate:m,rotateX:v,rotateY:_,skewX:x,skewY:E}=n;d&&(r=`perspective(${d}px) ${r}`),m&&(r+=`rotate(${m}deg) `),v&&(r+=`rotateX(${v}deg) `),_&&(r+=`rotateY(${_}deg) `),x&&(r+=`skewX(${x}deg) `),E&&(r+=`skewY(${E}deg) `)}const f=i.x.scale*t.x,p=i.y.scale*t.y;return(f!==1||p!==1)&&(r+=`scale(${f}, ${p})`),r||"none"}const gp=["","X","Y","Z"],KN=1e3;let ZN=0;function vp(i,t,n,r){const{latestValues:o}=t;o[i]&&(n[i]=o[i],t.setStaticValue(i,0),r&&(r[i]=0))}function $E(i){if(i.hasCheckedOptimisedAppear=!0,i.root===i)return;const{visualElement:t}=i.options;if(!t)return;const n=FE(t);if(window.MotionHasOptimisedAnimation(n,"transform")){const{layout:o,layoutId:u}=i.options;window.MotionCancelOptimisedAnimation(n,"transform",Ye,!(o||u))}const{parent:r}=i;r&&!r.hasCheckedOptimisedAppear&&$E(r)}function JE({attachResizeListener:i,defaultParent:t,measureScroll:n,checkIsScrollRoot:r,resetTransform:o}){return class{constructor(c={},f=t?.()){this.id=ZN++,this.animationId=0,this.animationCommitId=0,this.children=new Set,this.options={},this.isTreeAnimating=!1,this.isAnimationBlocked=!1,this.isLayoutDirty=!1,this.isProjectionDirty=!1,this.isSharedProjectionDirty=!1,this.isTransformDirty=!1,this.updateManuallyBlocked=!1,this.updateBlockedByResize=!1,this.isUpdating=!1,this.isSVG=!1,this.needsReset=!1,this.shouldResetTransform=!1,this.hasCheckedOptimisedAppear=!1,this.treeScale={x:1,y:1},this.eventHandlers=new Map,this.hasTreeAnimated=!1,this.updateScheduled=!1,this.scheduleUpdate=()=>this.update(),this.projectionUpdateScheduled=!1,this.checkUpdateFailed=()=>{this.isUpdating&&(this.isUpdating=!1,this.clearAllSnapshots())},this.updateProjection=()=>{this.projectionUpdateScheduled=!1,this.nodes.forEach(JN),this.nodes.forEach(iO),this.nodes.forEach(aO),this.nodes.forEach(tO)},this.resolvedRelativeTargetAt=0,this.hasProjected=!1,this.isVisible=!0,this.animationProgress=0,this.sharedNodes=new Map,this.latestValues=c,this.root=f?f.root||f:this,this.path=f?[...f.path,f]:[],this.parent=f,this.depth=f?f.depth+1:0;for(let p=0;p<this.path.length;p++)this.path[p].shouldResetTransform=!0;this.root===this&&(this.nodes=new FN)}addEventListener(c,f){return this.eventHandlers.has(c)||this.eventHandlers.set(c,new ng),this.eventHandlers.get(c).add(f)}notifyListeners(c,...f){const p=this.eventHandlers.get(c);p&&p.notify(...f)}hasListeners(c){return this.eventHandlers.has(c)}mount(c){if(this.instance)return;this.isSVG=pE(c)&&!W3(c),this.instance=c;const{layoutId:f,layout:p,visualElement:d}=this.options;if(d&&!d.current&&d.mount(c),this.root.nodes.add(this),this.parent&&this.parent.children.add(this),this.root.hasTreeAnimated&&(p||f)&&(this.isLayoutDirty=!0),i){let m,v=0;const _=()=>this.root.updateBlockedByResize=!1;Ye.read(()=>{v=window.innerWidth}),i(c,()=>{const x=window.innerWidth;x!==v&&(v=x,this.root.updateBlockedByResize=!0,m&&m(),m=IN(_,250),Qc.hasAnimatedSinceResize&&(Qc.hasAnimatedSinceResize=!1,this.nodes.forEach(gS)))})}f&&this.root.registerSharedNode(f,this),this.options.animate!==!1&&d&&(f||p)&&this.addEventListener("didUpdate",({delta:m,hasLayoutChanged:v,hasRelativeLayoutChanged:_,layout:x})=>{if(this.isTreeAnimationBlocked()){this.target=void 0,this.relativeTarget=void 0;return}const E=this.options.transition||d.getDefaultTransition()||uO,{onLayoutAnimationStart:T,onLayoutAnimationComplete:S}=d.getProps(),y=!this.targetLayout||!QE(this.targetLayout,x),w=!v&&_;if(this.options.layoutRoot||this.resumeFrom||w||v&&(y||!this.currentAnimation)){this.resumeFrom&&(this.resumingFrom=this.resumeFrom,this.resumingFrom.resumingFrom=void 0);const C={...mg(E,"layout"),onPlay:T,onComplete:S};(d.shouldReduceMotion||this.options.layoutRoot)&&(C.delay=0,C.type=!1),this.startAnimation(C),this.setAnimationOrigin(m,w)}else v||gS(this),this.isLead()&&this.options.onExitComplete&&this.options.onExitComplete();this.targetLayout=x})}unmount(){this.options.layoutId&&this.willUpdate(),this.root.nodes.remove(this);const c=this.getStack();c&&c.remove(this),this.parent&&this.parent.children.delete(this),this.instance=void 0,this.eventHandlers.clear(),mr(this.updateProjection)}blockUpdate(){this.updateManuallyBlocked=!0}unblockUpdate(){this.updateManuallyBlocked=!1}isUpdateBlocked(){return this.updateManuallyBlocked||this.updateBlockedByResize}isTreeAnimationBlocked(){return this.isAnimationBlocked||this.parent&&this.parent.isTreeAnimationBlocked()||!1}startUpdate(){this.isUpdateBlocked()||(this.isUpdating=!0,this.nodes&&this.nodes.forEach(rO),this.animationId++)}getTransformTemplate(){const{visualElement:c}=this.options;return c&&c.getProps().transformTemplate}willUpdate(c=!0){if(this.root.hasTreeAnimated=!0,this.root.isUpdateBlocked()){this.options.onExitComplete&&this.options.onExitComplete();return}if(window.MotionCancelOptimisedAnimation&&!this.hasCheckedOptimisedAppear&&$E(this),!this.root.isUpdating&&this.root.startUpdate(),this.isLayoutDirty)return;this.isLayoutDirty=!0;for(let m=0;m<this.path.length;m++){const v=this.path[m];v.shouldResetTransform=!0,v.updateScroll("snapshot"),v.options.layoutRoot&&v.willUpdate(!1)}const{layoutId:f,layout:p}=this.options;if(f===void 0&&!p)return;const d=this.getTransformTemplate();this.prevTransformTemplateValue=d?d(this.latestValues,""):void 0,this.updateSnapshot(),c&&this.notifyListeners("willUpdate")}update(){if(this.updateScheduled=!1,this.isUpdateBlocked()){this.unblockUpdate(),this.clearAllSnapshots(),this.nodes.forEach(pS);return}if(this.animationId<=this.animationCommitId){this.nodes.forEach(mS);return}this.animationCommitId=this.animationId,this.isUpdating?(this.isUpdating=!1,this.nodes.forEach(nO),this.nodes.forEach(QN),this.nodes.forEach($N)):this.nodes.forEach(mS),this.clearAllSnapshots();const f=Qn.now();Un.delta=Ca(0,1e3/60,f-Un.timestamp),Un.timestamp=f,Un.isProcessing=!0,rp.update.process(Un),rp.preRender.process(Un),rp.render.process(Un),Un.isProcessing=!1}didUpdate(){this.updateScheduled||(this.updateScheduled=!0,vg.read(this.scheduleUpdate))}clearAllSnapshots(){this.nodes.forEach(eO),this.sharedNodes.forEach(sO)}scheduleUpdateProjection(){this.projectionUpdateScheduled||(this.projectionUpdateScheduled=!0,Ye.preRender(this.updateProjection,!1,!0))}scheduleCheckAfterUnmount(){Ye.postRender(()=>{this.isLayoutDirty?this.root.didUpdate():this.root.checkUpdateFailed()})}updateSnapshot(){this.snapshot||!this.instance||(this.snapshot=this.measure(),this.snapshot&&!kn(this.snapshot.measuredBox.x)&&!kn(this.snapshot.measuredBox.y)&&(this.snapshot=void 0))}updateLayout(){if(!this.instance||(this.updateScroll(),!(this.options.alwaysMeasureLayout&&this.isLead())&&!this.isLayoutDirty))return;if(this.resumeFrom&&!this.resumeFrom.instance)for(let p=0;p<this.path.length;p++)this.path[p].updateScroll();const c=this.layout;this.layout=this.measure(!1),this.layoutCorrected=ln(),this.isLayoutDirty=!1,this.projectionDelta=void 0,this.notifyListeners("measure",this.layout.layoutBox);const{visualElement:f}=this.options;f&&f.notify("LayoutMeasure",this.layout.layoutBox,c?c.layoutBox:void 0)}updateScroll(c="measure"){let f=!!(this.options.layoutScroll&&this.instance);if(this.scroll&&this.scroll.animationId===this.root.animationId&&this.scroll.phase===c&&(f=!1),f&&this.instance){const p=r(this.instance);this.scroll={animationId:this.root.animationId,phase:c,isRoot:p,offset:n(this.instance),wasRoot:this.scroll?this.scroll.isRoot:p}}}resetTransform(){if(!o)return;const c=this.isLayoutDirty||this.shouldResetTransform||this.options.alwaysMeasureLayout,f=this.projectionDelta&&!ZE(this.projectionDelta),p=this.getTransformTemplate(),d=p?p(this.latestValues,""):void 0,m=d!==this.prevTransformTemplateValue;c&&this.instance&&(f||Xr(this.latestValues)||m)&&(o(this.instance,d),this.shouldResetTransform=!1,this.scheduleRender())}measure(c=!0){const f=this.measurePageBox();let p=this.removeElementScroll(f);return c&&(p=this.removeTransform(p)),cO(p),{animationId:this.root.animationId,measuredBox:f,layoutBox:p,latestValues:{},source:this.id}}measurePageBox(){const{visualElement:c}=this.options;if(!c)return ln();const f=c.measureViewportBox();if(!(this.scroll?.wasRoot||this.path.some(fO))){const{scroll:d}=this.root;d&&(no(f.x,d.offset.x),no(f.y,d.offset.y))}return f}removeElementScroll(c){const f=ln();if(yi(f,c),this.scroll?.wasRoot)return f;for(let p=0;p<this.path.length;p++){const d=this.path[p],{scroll:m,options:v}=d;d!==this.root&&m&&v.layoutScroll&&(m.wasRoot&&yi(f,c),no(f.x,m.offset.x),no(f.y,m.offset.y))}return f}applyTransform(c,f=!1){const p=ln();yi(p,c);for(let d=0;d<this.path.length;d++){const m=this.path[d];!f&&m.options.layoutScroll&&m.scroll&&m!==m.root&&io(p,{x:-m.scroll.offset.x,y:-m.scroll.offset.y}),Xr(m.latestValues)&&io(p,m.latestValues)}return Xr(this.latestValues)&&io(p,this.latestValues),p}removeTransform(c){const f=ln();yi(f,c);for(let p=0;p<this.path.length;p++){const d=this.path[p];if(!d.instance||!Xr(d.latestValues))continue;bm(d.latestValues)&&d.updateSnapshot();const m=ln(),v=d.measurePageBox();yi(m,v),lS(f,d.latestValues,d.snapshot?d.snapshot.layoutBox:void 0,m)}return Xr(this.latestValues)&&lS(f,this.latestValues),f}setTargetDelta(c){this.targetDelta=c,this.root.scheduleUpdateProjection(),this.isProjectionDirty=!0}setOptions(c){this.options={...this.options,...c,crossfade:c.crossfade!==void 0?c.crossfade:!0}}clearMeasurements(){this.scroll=void 0,this.layout=void 0,this.snapshot=void 0,this.prevTransformTemplateValue=void 0,this.targetDelta=void 0,this.target=void 0,this.isLayoutDirty=!1}forceRelativeParentToResolveTarget(){this.relativeParent&&this.relativeParent.resolvedRelativeTargetAt!==Un.timestamp&&this.relativeParent.resolveTargetDelta(!0)}resolveTargetDelta(c=!1){const f=this.getLead();this.isProjectionDirty||(this.isProjectionDirty=f.isProjectionDirty),this.isTransformDirty||(this.isTransformDirty=f.isTransformDirty),this.isSharedProjectionDirty||(this.isSharedProjectionDirty=f.isSharedProjectionDirty);const p=!!this.resumingFrom||this!==f;if(!(c||p&&this.isSharedProjectionDirty||this.isProjectionDirty||this.parent?.isProjectionDirty||this.attemptToResolveRelativeTarget||this.root.updateBlockedByResize))return;const{layout:m,layoutId:v}=this.options;if(!(!this.layout||!(m||v))){if(this.resolvedRelativeTargetAt=Un.timestamp,!this.targetDelta&&!this.relativeTarget){const _=this.getClosestProjectingParent();_&&_.layout&&this.animationProgress!==1?(this.relativeParent=_,this.forceRelativeParentToResolveTarget(),this.relativeTarget=ln(),this.relativeTargetOrigin=ln(),Ll(this.relativeTargetOrigin,this.layout.layoutBox,_.layout.layoutBox),yi(this.relativeTarget,this.relativeTargetOrigin)):this.relativeParent=this.relativeTarget=void 0}if(!(!this.relativeTarget&&!this.targetDelta)&&(this.target||(this.target=ln(),this.targetWithTransforms=ln()),this.relativeTarget&&this.relativeTargetOrigin&&this.relativeParent&&this.relativeParent.target?(this.forceRelativeParentToResolveTarget(),vN(this.target,this.relativeTarget,this.relativeParent.target)):this.targetDelta?(this.resumingFrom?this.target=this.applyTransform(this.layout.layoutBox):yi(this.target,this.layout.layoutBox),UE(this.target,this.targetDelta)):yi(this.target,this.layout.layoutBox),this.attemptToResolveRelativeTarget)){this.attemptToResolveRelativeTarget=!1;const _=this.getClosestProjectingParent();_&&!!_.resumingFrom==!!this.resumingFrom&&!_.options.layoutScroll&&_.target&&this.animationProgress!==1?(this.relativeParent=_,this.forceRelativeParentToResolveTarget(),this.relativeTarget=ln(),this.relativeTargetOrigin=ln(),Ll(this.relativeTargetOrigin,this.target,_.target),yi(this.relativeTarget,this.relativeTargetOrigin)):this.relativeParent=this.relativeTarget=void 0}}}getClosestProjectingParent(){if(!(!this.parent||bm(this.parent.latestValues)||DE(this.parent.latestValues)))return this.parent.isProjecting()?this.parent:this.parent.getClosestProjectingParent()}isProjecting(){return!!((this.relativeTarget||this.targetDelta||this.options.layoutRoot)&&this.layout)}calcProjection(){const c=this.getLead(),f=!!this.resumingFrom||this!==c;let p=!0;if((this.isProjectionDirty||this.parent?.isProjectionDirty)&&(p=!1),f&&(this.isSharedProjectionDirty||this.isTransformDirty)&&(p=!1),this.resolvedRelativeTargetAt===Un.timestamp&&(p=!1),p)return;const{layout:d,layoutId:m}=this.options;if(this.isTreeAnimating=!!(this.parent&&this.parent.isTreeAnimating||this.currentAnimation||this.pendingAnimation),this.isTreeAnimating||(this.targetDelta=this.relativeTarget=void 0),!this.layout||!(d||m))return;yi(this.layoutCorrected,this.layout.layoutBox);const v=this.treeScale.x,_=this.treeScale.y;wP(this.layoutCorrected,this.treeScale,this.path,f),c.layout&&!c.target&&(this.treeScale.x!==1||this.treeScale.y!==1)&&(c.target=c.layout.layoutBox,c.targetWithTransforms=ln());const{target:x}=c;if(!x){this.prevProjectionDelta&&(this.createProjectionDeltas(),this.scheduleRender());return}!this.projectionDelta||!this.prevProjectionDelta?this.createProjectionDeltas():(rS(this.prevProjectionDelta.x,this.projectionDelta.x),rS(this.prevProjectionDelta.y,this.projectionDelta.y)),Ul(this.projectionDelta,this.layoutCorrected,x,this.latestValues),(this.treeScale.x!==v||this.treeScale.y!==_||!dS(this.projectionDelta.x,this.prevProjectionDelta.x)||!dS(this.projectionDelta.y,this.prevProjectionDelta.y))&&(this.hasProjected=!0,this.scheduleRender(),this.notifyListeners("projectionUpdate",x))}hide(){this.isVisible=!1}show(){this.isVisible=!0}scheduleRender(c=!0){if(this.options.visualElement?.scheduleRender(),c){const f=this.getStack();f&&f.scheduleRender()}this.resumingFrom&&!this.resumingFrom.instance&&(this.resumingFrom=void 0)}createProjectionDeltas(){this.prevProjectionDelta=ao(),this.projectionDelta=ao(),this.projectionDeltaWithTransform=ao()}setAnimationOrigin(c,f=!1){const p=this.snapshot,d=p?p.latestValues:{},m={...this.latestValues},v=ao();(!this.relativeParent||!this.relativeParent.options.layoutRoot)&&(this.relativeTarget=this.relativeTargetOrigin=void 0),this.attemptToResolveRelativeTarget=!f;const _=ln(),x=p?p.source:void 0,E=this.layout?this.layout.source:void 0,T=x!==E,S=this.getStack(),y=!S||S.members.length<=1,w=!!(T&&!y&&this.options.crossfade===!0&&!this.path.some(lO));this.animationProgress=0;let C;this.mixTargetDelta=D=>{const N=D/1e3;vS(v.x,c.x,N),vS(v.y,c.y,N),this.setTargetDelta(v),this.relativeTarget&&this.relativeTargetOrigin&&this.layout&&this.relativeParent&&this.relativeParent.layout&&(Ll(_,this.layout.layoutBox,this.relativeParent.layout.layoutBox),oO(this.relativeTarget,this.relativeTargetOrigin,_,N),C&&qN(this.relativeTarget,C)&&(this.isProjectionDirty=!1),C||(C=ln()),yi(C,this.relativeTarget)),T&&(this.animationValues=m,VN(m,d,this.latestValues,N,w,y)),this.root.scheduleUpdateProjection(),this.scheduleRender(),this.animationProgress=N},this.mixTargetDelta(this.options.layoutRoot?1e3:0)}startAnimation(c){this.notifyListeners("animationStart"),this.currentAnimation?.stop(),this.resumingFrom?.currentAnimation?.stop(),this.pendingAnimation&&(mr(this.pendingAnimation),this.pendingAnimation=void 0),this.pendingAnimation=Ye.update(()=>{Qc.hasAnimatedSinceResize=!0,this.motionValue||(this.motionValue=po(0)),this.currentAnimation=ON(this.motionValue,[0,1e3],{...c,velocity:0,isSync:!0,onUpdate:f=>{this.mixTargetDelta(f),c.onUpdate&&c.onUpdate(f)},onStop:()=>{},onComplete:()=>{c.onComplete&&c.onComplete(),this.completeAnimation()}}),this.resumingFrom&&(this.resumingFrom.currentAnimation=this.currentAnimation),this.pendingAnimation=void 0})}completeAnimation(){this.resumingFrom&&(this.resumingFrom.currentAnimation=void 0,this.resumingFrom.preserveOpacity=void 0);const c=this.getStack();c&&c.exitAnimationComplete(),this.resumingFrom=this.currentAnimation=this.animationValues=void 0,this.notifyListeners("animationComplete")}finishAnimation(){this.currentAnimation&&(this.mixTargetDelta&&this.mixTargetDelta(KN),this.currentAnimation.stop()),this.completeAnimation()}applyTransformsToTarget(){const c=this.getLead();let{targetWithTransforms:f,target:p,layout:d,latestValues:m}=c;if(!(!f||!p||!d)){if(this!==c&&this.layout&&d&&tT(this.options.animationType,this.layout.layoutBox,d.layoutBox)){p=this.target||ln();const v=kn(this.layout.layoutBox.x);p.x.min=c.target.x.min,p.x.max=p.x.min+v;const _=kn(this.layout.layoutBox.y);p.y.min=c.target.y.min,p.y.max=p.y.min+_}yi(f,p),io(f,m),Ul(this.projectionDeltaWithTransform,this.layoutCorrected,f,m)}}registerSharedNode(c,f){this.sharedNodes.has(c)||this.sharedNodes.set(c,new YN),this.sharedNodes.get(c).add(f);const d=f.options.initialPromotionConfig;f.promote({transition:d?d.transition:void 0,preserveFollowOpacity:d&&d.shouldPreserveFollowOpacity?d.shouldPreserveFollowOpacity(f):void 0})}isLead(){const c=this.getStack();return c?c.lead===this:!0}getLead(){const{layoutId:c}=this.options;return c?this.getStack()?.lead||this:this}getPrevLead(){const{layoutId:c}=this.options;return c?this.getStack()?.prevLead:void 0}getStack(){const{layoutId:c}=this.options;if(c)return this.root.sharedNodes.get(c)}promote({needsReset:c,transition:f,preserveFollowOpacity:p}={}){const d=this.getStack();d&&d.promote(this,p),c&&(this.projectionDelta=void 0,this.needsReset=!0),f&&this.setOptions({transition:f})}relegate(){const c=this.getStack();return c?c.relegate(this):!1}resetSkewAndRotation(){const{visualElement:c}=this.options;if(!c)return;let f=!1;const{latestValues:p}=c;if((p.z||p.rotate||p.rotateX||p.rotateY||p.rotateZ||p.skewX||p.skewY)&&(f=!0),!f)return;const d={};p.z&&vp("z",c,d,this.animationValues);for(let m=0;m<gp.length;m++)vp(`rotate${gp[m]}`,c,d,this.animationValues),vp(`skew${gp[m]}`,c,d,this.animationValues);c.render();for(const m in d)c.setStaticValue(m,d[m]),this.animationValues&&(this.animationValues[m]=d[m]);c.scheduleRender()}applyProjectionStyles(c,f){if(!this.instance||this.isSVG)return;if(!this.isVisible){c.visibility="hidden";return}const p=this.getTransformTemplate();if(this.needsReset){this.needsReset=!1,c.visibility="",c.opacity="",c.pointerEvents=Zc(f?.pointerEvents)||"",c.transform=p?p(this.latestValues,""):"none";return}const d=this.getLead();if(!this.projectionDelta||!this.layout||!d.target){this.options.layoutId&&(c.opacity=this.latestValues.opacity!==void 0?this.latestValues.opacity:1,c.pointerEvents=Zc(f?.pointerEvents)||""),this.hasProjected&&!Xr(this.latestValues)&&(c.transform=p?p({},""):"none",this.hasProjected=!1);return}c.visibility="";const m=d.animationValues||d.latestValues;this.applyTransformsToTarget();let v=jN(this.projectionDeltaWithTransform,this.treeScale,m);p&&(v=p(m,v)),c.transform=v;const{x:_,y:x}=this.projectionDelta;c.transformOrigin=`${_.origin*100}% ${x.origin*100}% 0`,d.animationValues?c.opacity=d===this?m.opacity??this.latestValues.opacity??1:this.preserveOpacity?this.latestValues.opacity:m.opacityExit:c.opacity=d===this?m.opacity!==void 0?m.opacity:"":m.opacityExit!==void 0?m.opacityExit:0;for(const E in kl){if(m[E]===void 0)continue;const{correct:T,applyTo:S,isCSSVariable:y}=kl[E],w=v==="none"?m[E]:T(m[E],d);if(S){const C=S.length;for(let D=0;D<C;D++)c[S[D]]=w}else y?this.options.visualElement.renderState.vars[E]=w:c[E]=w}this.options.layoutId&&(c.pointerEvents=d===this?Zc(f?.pointerEvents)||"":"none")}clearSnapshot(){this.resumeFrom=this.snapshot=void 0}resetTree(){this.root.nodes.forEach(c=>c.currentAnimation?.stop()),this.root.nodes.forEach(pS),this.root.sharedNodes.clear()}}}function QN(i){i.updateLayout()}function $N(i){const t=i.resumeFrom?.snapshot||i.snapshot;if(i.isLead()&&i.layout&&t&&i.hasListeners("didUpdate")){const{layoutBox:n,measuredBox:r}=i.layout,{animationType:o}=i.options,u=t.source!==i.layout.source;o==="size"?xi(m=>{const v=u?t.measuredBox[m]:t.layoutBox[m],_=kn(v);v.min=n[m].min,v.max=v.min+_}):tT(o,t.layoutBox,n)&&xi(m=>{const v=u?t.measuredBox[m]:t.layoutBox[m],_=kn(n[m]);v.max=v.min+_,i.relativeTarget&&!i.currentAnimation&&(i.isProjectionDirty=!0,i.relativeTarget[m].max=i.relativeTarget[m].min+_)});const c=ao();Ul(c,n,t.layoutBox);const f=ao();u?Ul(f,i.applyTransform(r,!0),t.measuredBox):Ul(f,n,t.layoutBox);const p=!ZE(c);let d=!1;if(!i.resumeFrom){const m=i.getClosestProjectingParent();if(m&&!m.resumeFrom){const{snapshot:v,layout:_}=m;if(v&&_){const x=ln();Ll(x,t.layoutBox,v.layoutBox);const E=ln();Ll(E,n,_.layoutBox),QE(x,E)||(d=!0),m.options.layoutRoot&&(i.relativeTarget=E,i.relativeTargetOrigin=x,i.relativeParent=m)}}}i.notifyListeners("didUpdate",{layout:n,snapshot:t,delta:f,layoutDelta:c,hasLayoutChanged:p,hasRelativeLayoutChanged:d})}else if(i.isLead()){const{onExitComplete:n}=i.options;n&&n()}i.options.transition=void 0}function JN(i){i.parent&&(i.isProjecting()||(i.isProjectionDirty=i.parent.isProjectionDirty),i.isSharedProjectionDirty||(i.isSharedProjectionDirty=!!(i.isProjectionDirty||i.parent.isProjectionDirty||i.parent.isSharedProjectionDirty)),i.isTransformDirty||(i.isTransformDirty=i.parent.isTransformDirty))}function tO(i){i.isProjectionDirty=i.isSharedProjectionDirty=i.isTransformDirty=!1}function eO(i){i.clearSnapshot()}function pS(i){i.clearMeasurements()}function mS(i){i.isLayoutDirty=!1}function nO(i){const{visualElement:t}=i.options;t&&t.getProps().onBeforeLayoutMeasure&&t.notify("BeforeLayoutMeasure"),i.resetTransform()}function gS(i){i.finishAnimation(),i.targetDelta=i.relativeTarget=i.target=void 0,i.isProjectionDirty=!0}function iO(i){i.resolveTargetDelta()}function aO(i){i.calcProjection()}function rO(i){i.resetSkewAndRotation()}function sO(i){i.removeLeadSnapshot()}function vS(i,t,n){i.translate=Qe(t.translate,0,n),i.scale=Qe(t.scale,1,n),i.origin=t.origin,i.originPoint=t.originPoint}function _S(i,t,n,r){i.min=Qe(t.min,n.min,r),i.max=Qe(t.max,n.max,r)}function oO(i,t,n,r){_S(i.x,t.x,n.x,r),_S(i.y,t.y,n.y,r)}function lO(i){return i.animationValues&&i.animationValues.opacityExit!==void 0}const uO={duration:.45,ease:[.4,0,.1,1]},yS=i=>typeof navigator<"u"&&navigator.userAgent&&navigator.userAgent.toLowerCase().includes(i),xS=yS("applewebkit/")&&!yS("chrome/")?Math.round:Ei;function SS(i){i.min=xS(i.min),i.max=xS(i.max)}function cO(i){SS(i.x),SS(i.y)}function tT(i,t,n){return i==="position"||i==="preserve-aspect"&&!gN(hS(t),hS(n),.2)}function fO(i){return i!==i.root&&i.scroll?.wasRoot}const hO=JE({attachResizeListener:(i,t)=>Xl(i,"resize",t),measureScroll:()=>({x:document.documentElement.scrollLeft||document.body.scrollLeft,y:document.documentElement.scrollTop||document.body.scrollTop}),checkIsScrollRoot:()=>!0}),_p={current:void 0},eT=JE({measureScroll:i=>({x:i.scrollLeft,y:i.scrollTop}),defaultParent:()=>{if(!_p.current){const i=new hO({});i.mount(window),i.setOptions({layoutScroll:!0}),_p.current=i}return _p.current},resetTransform:(i,t)=>{i.style.transform=t!==void 0?t:"none"},checkIsScrollRoot:i=>window.getComputedStyle(i).position==="fixed"}),dO={pan:{Feature:UN},drag:{Feature:DN,ProjectionNode:eT,MeasureLayout:YE}};function MS(i,t,n){const{props:r}=i;i.animationState&&r.whileHover&&i.animationState.setActive("whileHover",n==="Start");const o="onHover"+n,u=r[o];u&&Ye.postRender(()=>u(t,iu(t)))}class pO extends vr{mount(){const{current:t}=this.node;t&&(this.unmount=V3(t,(n,r)=>(MS(this.node,r,"Start"),o=>MS(this.node,o,"End"))))}unmount(){}}class mO extends vr{constructor(){super(...arguments),this.isActive=!1}onFocus(){let t=!1;try{t=this.node.current.matches(":focus-visible")}catch{t=!0}!t||!this.node.animationState||(this.node.animationState.setActive("whileFocus",!0),this.isActive=!0)}onBlur(){!this.isActive||!this.node.animationState||(this.node.animationState.setActive("whileFocus",!1),this.isActive=!1)}mount(){this.unmount=tu(Xl(this.node.current,"focus",()=>this.onFocus()),Xl(this.node.current,"blur",()=>this.onBlur()))}unmount(){}}function ES(i,t,n){const{props:r}=i;if(i.current instanceof HTMLButtonElement&&i.current.disabled)return;i.animationState&&r.whileTap&&i.animationState.setActive("whileTap",n==="Start");const o="onTap"+(n==="End"?"":n),u=r[o];u&&Ye.postRender(()=>u(t,iu(t)))}class gO extends vr{mount(){const{current:t}=this.node;t&&(this.unmount=X3(t,(n,r)=>(ES(this.node,r,"Start"),(o,{success:u})=>ES(this.node,o,u?"End":"Cancel")),{useGlobalTarget:this.node.props.globalTapTarget}))}unmount(){}}const Lm=new WeakMap,yp=new WeakMap,vO=i=>{const t=Lm.get(i.target);t&&t(i)},_O=i=>{i.forEach(vO)};function yO({root:i,...t}){const n=i||document;yp.has(n)||yp.set(n,{});const r=yp.get(n),o=JSON.stringify(t);return r[o]||(r[o]=new IntersectionObserver(_O,{root:i,...t})),r[o]}function xO(i,t,n){const r=yO(t);return Lm.set(i,n),r.observe(i),()=>{Lm.delete(i),r.unobserve(i)}}const SO={some:0,all:1};class MO extends vr{constructor(){super(...arguments),this.hasEnteredView=!1,this.isInView=!1}startObserver(){this.unmount();const{viewport:t={}}=this.node.getProps(),{root:n,margin:r,amount:o="some",once:u}=t,c={root:n?n.current:void 0,rootMargin:r,threshold:typeof o=="number"?o:SO[o]},f=p=>{const{isIntersecting:d}=p;if(this.isInView===d||(this.isInView=d,u&&!d&&this.hasEnteredView))return;d&&(this.hasEnteredView=!0),this.node.animationState&&this.node.animationState.setActive("whileInView",d);const{onViewportEnter:m,onViewportLeave:v}=this.node.getProps(),_=d?m:v;_&&_(p)};return xO(this.node.current,c,f)}mount(){this.startObserver()}update(){if(typeof IntersectionObserver>"u")return;const{props:t,prevProps:n}=this.node;["amount","margin","root"].some(EO(t,n))&&this.startObserver()}unmount(){}}function EO({viewport:i={}},{viewport:t={}}={}){return n=>i[n]!==t[n]}const TO={inView:{Feature:MO},tap:{Feature:gO},focus:{Feature:mO},hover:{Feature:pO}},bO={layout:{ProjectionNode:eT,MeasureLayout:YE}},AO={...cN,...TO,...dO,...bO},dr=AP(AO,zP);/**
 * @license lucide-react v0.543.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const RO=i=>i.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),CO=i=>i.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,n,r)=>r?r.toUpperCase():n.toLowerCase()),TS=i=>{const t=CO(i);return t.charAt(0).toUpperCase()+t.slice(1)},nT=(...i)=>i.filter((t,n,r)=>!!t&&t.trim()!==""&&r.indexOf(t)===n).join(" ").trim(),wO=i=>{for(const t in i)if(t.startsWith("aria-")||t==="role"||t==="title")return!0};/**
 * @license lucide-react v0.543.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var DO={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.543.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const UO=Q.forwardRef(({color:i="currentColor",size:t=24,strokeWidth:n=2,absoluteStrokeWidth:r,className:o="",children:u,iconNode:c,...f},p)=>Q.createElement("svg",{ref:p,...DO,width:t,height:t,stroke:i,strokeWidth:r?Number(n)*24/Number(t):n,className:nT("lucide",o),...!u&&!wO(f)&&{"aria-hidden":"true"},...f},[...c.map(([d,m])=>Q.createElement(d,m)),...Array.isArray(u)?u:[u]]));/**
 * @license lucide-react v0.543.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Eo=(i,t)=>{const n=Q.forwardRef(({className:r,...o},u)=>Q.createElement(UO,{ref:u,iconNode:t,className:nT(`lucide-${RO(TS(i))}`,`lucide-${i}`,r),...o}));return n.displayName=TS(i),n};/**
 * @license lucide-react v0.543.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const LO=[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]],PO=Eo("external-link",LO);/**
 * @license lucide-react v0.543.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const NO=[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]],OO=Eo("eye-off",NO);/**
 * @license lucide-react v0.543.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const BO=[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],FO=Eo("eye",BO);/**
 * @license lucide-react v0.543.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const IO=[["path",{d:"M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4",key:"tonef"}],["path",{d:"M9 18c-4.51 2-5-2-7-2",key:"9comsn"}]],zO=Eo("github",IO);/**
 * @license lucide-react v0.543.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const VO=[["path",{d:"M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z",key:"c2jq9f"}],["rect",{width:"4",height:"12",x:"2",y:"9",key:"mk3on5"}],["circle",{cx:"4",cy:"4",r:"2",key:"bt5ra8"}]],HO=Eo("linkedin",VO);/**
 * @license lucide-react v0.543.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const GO=[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]],kO=Eo("mail",GO),iT=({children:i})=>qt.jsx(qt.Fragment,{children:i}),XO=()=>qt.jsx(iT,{children:qt.jsx("section",{className:"min-h-screen flex flex-col items-center justify-center px-5 py-20",style:{color:"#000"},children:qt.jsxs("div",{className:"max-w-6xl mx-auto",children:[qt.jsx(dr.h1,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.6},className:"text-5xl md:text-6xl font-medium text-black mb-16 text-center font-sans",children:"Projects"}),qt.jsxs(dr.div,{initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{duration:.6,delay:.1},whileHover:{y:-3},className:"p-6 md:p-8 transition-all duration-300 flex flex-col rounded-2xl backdrop-blur-md bg-white/40 border border-black/10 shadow-sm",children:[qt.jsx("h3",{className:"text-xl font-semibold text-black font-sans mb-3 text-center",children:"Mesh"}),qt.jsx("p",{className:"text-black/80 mb-4 leading-relaxed font-sans text-center",children:"A data platform for prediction market trading."}),qt.jsx("div",{className:"flex gap-3 items-center justify-center",children:qt.jsxs("a",{href:"https://meshapi.app",target:"_blank",rel:"noopener noreferrer",className:"inline-flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md bg-white/40 border border-black/10 text-black transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/60",children:[qt.jsx(PO,{size:16}),qt.jsx("span",{children:"Visit"})]})})]})]})})}),WO=()=>{const[i,t]=Q.useState(!1),n=[{icon:kO,label:i?"Hide Email":"Email",action:()=>t(!i),isButton:!0},{icon:HO,label:"LinkedIn",href:"https://www.linkedin.com/in/axeledin/",isButton:!1},{icon:zO,label:"GitHub",href:"https://github.com/axlolo",isButton:!1}];return qt.jsx(iT,{children:qt.jsx("section",{className:"min-h-screen flex flex-col items-center justify-center px-5 py-20",style:{color:"#000"},children:qt.jsxs("div",{className:"max-w-2xl mx-auto text-center",children:[qt.jsx(dr.h1,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.6},className:"text-5xl md:text-6xl font-medium text-black mb-16 font-sans",children:"Contact"}),qt.jsx("div",{className:"space-y-6",children:n.map((r,o)=>qt.jsx(dr.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.6,delay:.1+o*.1},whileHover:{y:-2},whileTap:{scale:.98},children:r.isButton?qt.jsxs("button",{onClick:r.action,className:"flex items-center justify-center gap-3 w-full max-w-xs mx-auto px-6 py-4 group rounded-xl backdrop-blur-md bg-white/40 border border-black/10 text-black transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/60",children:[qt.jsx(r.icon,{size:20,className:"transition-transform group-hover:scale-110"}),qt.jsx("span",{className:"text-lg font-medium font-sans",children:r.label}),r.label.includes("Email")&&(i?qt.jsx(OO,{size:16}):qt.jsx(FO,{size:16}))]}):qt.jsxs("a",{href:r.href,target:"_blank",rel:"noopener noreferrer",className:"flex items-center justify-center gap-3 w-full max-w-xs mx-auto px-6 py-4 group rounded-xl backdrop-blur-md bg-white/40 border border-black/10 text-black transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/60",children:[qt.jsx(r.icon,{size:20,className:"transition-transform group-hover:scale-110"}),qt.jsx("span",{className:"text-lg font-medium font-sans",children:r.label})]})},r.label))}),qt.jsx(dr.div,{initial:{opacity:0},animate:{opacity:i?1:0},transition:{duration:.3},className:`mt-8 ${i?"block":"hidden"}`,children:qt.jsxs("div",{className:"p-6 rounded-2xl backdrop-blur-md bg-white/40 border border-black/10 shadow-sm",children:[qt.jsx("p",{className:"text-xl text-black font-medium font-sans",children:"personal: axeledin06@gmail.com"}),qt.jsx("p",{className:"text-xl text-black font-medium font-sans mt-2",children:"school: aedin@andrew.cmu.edu"})]})})]})})})},qO=()=>qt.jsx("section",{className:"min-h-screen flex flex-col items-center justify-center px-5 py-20",style:{color:"#000"},children:qt.jsxs("div",{className:"max-w-2xl mx-auto text-center",children:[qt.jsx(dr.h1,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.6},className:"text-5xl md:text-6xl font-medium text-black mb-6 font-sans",children:"AI Chatbot"}),qt.jsx(dr.p,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.6,delay:.1},className:"text-lg text-black/70 mb-8 font-sans",children:"This feature is coming soon."}),qt.jsx("div",{className:"card-light p-6",children:qt.jsx("p",{className:"text-black font-sans",children:"Stay tuned for updates."})})]})}),YO=()=>{const i=Ua(),t=i.pathname==="/",[n,r]=Q.useState(!0),o=Q.useRef(0),u=Q.useRef(!1);if(Q.useEffect(()=>{if(t){r(!0);return}o.current=window.scrollY;const p=()=>{u.current||(window.requestAnimationFrame(()=>{const d=window.scrollY;d>o.current?r(!1):d<o.current&&r(!0),o.current=d,u.current=!1}),u.current=!0)};return window.addEventListener("scroll",p,{passive:!0}),()=>window.removeEventListener("scroll",p)},[t]),t)return null;const f=[{path:"/",label:"Home",isExternal:!0},{path:"/projects",label:"Projects",isExternal:!1},{path:"/contact",label:"Contact",isExternal:!1}].filter(p=>p.path!==i.pathname);return qt.jsx(dr.nav,{initial:{opacity:0,y:-16},animate:{opacity:n?1:0,y:n?0:-16},transition:{duration:.22},className:"fixed top-5 left-0 right-0 z-50",children:qt.jsx("div",{className:"flex items-center justify-center",children:qt.jsx("div",{className:"nav-items",style:{display:"flex",gap:"2rem"},children:f.map(p=>p.isExternal?qt.jsx("a",{href:p.path,style:{color:"#000",textDecoration:"none"},children:p.label},p.path):qt.jsx(Km,{to:p.path,style:{color:"#000",textDecoration:"none"},children:p.label},p.path))})})})};function jO(){const{pathname:i}=Ua();return Q.useEffect(()=>{window.scrollTo({top:0});const t=document.documentElement;i!=="/"?t.classList.add("show-app"):t.classList.remove("show-app")},[i]),null}function KO(){return qt.jsx(zU,{children:qt.jsxs("div",{className:"min-h-screen",children:[qt.jsx(jO,{}),qt.jsx(YO,{}),qt.jsxs(gU,{children:[qt.jsx(Wc,{path:"/projects",element:qt.jsx("div",{className:"min-h-screen",style:{color:"#000"},children:qt.jsx(XO,{})})}),qt.jsx(Wc,{path:"/contact",element:qt.jsx("div",{className:"min-h-screen",style:{color:"#000"},children:qt.jsx(WO,{})})}),qt.jsx(Wc,{path:"/chatbot",element:qt.jsx("div",{className:"min-h-screen",style:{color:"#000"},children:qt.jsx(qO,{})})})]})]})})}bD.createRoot(document.getElementById("root")).render(qt.jsx(KO,{}));
