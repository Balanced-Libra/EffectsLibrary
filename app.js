document.getElementById('js-warning')?.remove();

/* Effects Lab — minimal registry + modal runner */

const TAGS_MASTER = [
  // Tech
  "css","svg","canvas","webgl","audio","worker",
  // Pattern
  "layout","scroll","nav","forms","table","loader","chart","dataviz","media",
  // Interaction
  "drag","keyboard","pointer","toggle",
  // Visual
  "particles","3d","shader","filter","mask","typography","animation",
  // A11y/Perf
  "a11y","reduced-motion","performance","heavy"
];

// Add this after the TAGS_MASTER definition:
const TAG_ALIASES = {
  navigation: 'nav',
  'micro-interaction': 'animation',
  'micro-interactions': 'animation',
  filters: 'filter',
  'audio-reactive': 'audio',
  '3D': '3d'
};
// Add this code right after the TAG_ALIASES definition in app.js:

// Iridescent Background Implementation
const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;

varying vec2 vUv;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  uv += (uMouse - vec2(0.5)) * uAmplitude;

  float d = -uTime * 0.5 * uSpeed;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += uTime * 0.5 * uSpeed;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Iridescent background class
class IridescentBackground {
  constructor(container, options = {}) {
    this.container = container;
    this.color = options.color || [0.07, 0.08, 0.12]; // Dark blue to match your theme
    this.speed = options.speed || 0.5;
    this.amplitude = options.amplitude || 0.05;
    this.mouseReact = options.mouseReact !== undefined ? options.mouseReact : true;
    
    this.mousePos = { x: 0.5, y: 0.5 };
    this.init();
  }

  init() {
    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '-1';
    this.canvas.style.pointerEvents = 'none';
    
    // Insert at the beginning of body
    document.body.insertBefore(this.canvas, document.body.firstChild);
    
    // Initialize WebGL
    this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    
    if (!this.gl) {
      console.error('WebGL not supported');
      return;
    }
    
    this.setup();
    this.animate();
    
    // Handle resize
    window.addEventListener('resize', this.handleResize.bind(this));
    this.handleResize();
    
    // Handle mouse movement
    if (this.mouseReact) {
      window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }
  }

  setup() {
    const gl = this.gl;
    
    // Create shaders
    const vertexShaderSource = this.createShader(gl.VERTEX_SHADER, vertexShader);
    const fragmentShaderSource = this.createShader(gl.FRAGMENT_SHADER, fragmentShader);
    
    // Create program
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertexShaderSource);
    gl.attachShader(this.program, fragmentShaderSource);
    gl.linkProgram(this.program);
    
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Unable to initialize the shader program');
      return;
    }
    
    gl.useProgram(this.program);
    
    // Set up vertices for a full-screen triangle
    const vertices = new Float32Array([
      -1, -1,  0, 0,
       3, -1,  2, 0,
      -1,  3,  0, 2
    ]);
    
    // Create buffer
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    // Get attribute locations
    const positionLocation = gl.getAttribLocation(this.program, 'position');
    const uvLocation = gl.getAttribLocation(this.program, 'uv');
    
    // Enable attributes
    gl.enableVertexAttribArray(positionLocation);
    gl.enableVertexAttribArray(uvLocation);
    
    // Set attribute pointers
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 16, 8);
    
    // Get uniform locations
    this.uniforms = {
      uTime: gl.getUniformLocation(this.program, 'uTime'),
      uColor: gl.getUniformLocation(this.program, 'uColor'),
      uResolution: gl.getUniformLocation(this.program, 'uResolution'),
      uMouse: gl.getUniformLocation(this.program, 'uMouse'),
      uAmplitude: gl.getUniformLocation(this.program, 'uAmplitude'),
      uSpeed: gl.getUniformLocation(this.program, 'uSpeed')
    };
    
    // Set uniform values
    gl.uniform3fv(this.uniforms.uColor, this.color);
    gl.uniform1f(this.uniforms.uAmplitude, this.amplitude);
    gl.uniform1f(this.uniforms.uSpeed, this.speed);
  }

  createShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  handleResize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.uniforms && this.uniforms.uResolution) {
      this.gl.uniform3f(
        this.uniforms.uResolution,
        this.canvas.width,
        this.canvas.height,
        this.canvas.width / this.canvas.height
      );
    }
  }

  handleMouseMove(event) {
    this.mousePos.x = event.clientX / window.innerWidth;
    this.mousePos.y = 1.0 - (event.clientY / window.innerHeight);
    
    if (this.uniforms && this.uniforms.uMouse) {
      this.gl.uniform2f(this.uniforms.uMouse, this.mousePos.x, this.mousePos.y);
    }
  }

  animate() {
    if (!this.gl) return;
    
    const render = (time) => {
      this.gl.uniform1f(this.uniforms.uTime, time * 0.001);
      this.gl.clearColor(0, 0, 0, 1);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
      
      this.animationId = requestAnimationFrame(render);
    };
    
    this.animationId = requestAnimationFrame(render);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mousemove', this.handleMouseMove);
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    if (this.gl) {
      const loseContext = this.gl.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
      }
    }
  }
}
// Add this code right after the IridescentBackground class in app.js:

// Fluid glass effect for topbar
class FluidGlassEffect {
  constructor(element) {
    this.element = element;
    this.init();
  }

  init() {
    // Track mouse position for the fluid effect
    this.element.addEventListener('mousemove', this.handleMouseMove.bind(this));
    
    // Add a subtle wave effect
    this.createWaveEffect();
  }

  handleMouseMove(e) {
    const rect = this.element.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    this.element.style.setProperty('--mouse-x', `${x}%`);
    this.element.style.setProperty('--mouse-y', `${y}%`);
  }

  createWaveEffect() {
    // Create a subtle wave animation
    let time = 0;
    
    const animate = () => {
      time += 0.01;
      const wave = Math.sin(time) * 5;
      this.element.style.transform = `translateY(${wave}px)`;
      requestAnimationFrame(animate);
    };
    
    // Only start the animation on hover
    this.element.addEventListener('mouseenter', () => {
      this.animationId = requestAnimationFrame(animate);
    });
    
    this.element.addEventListener('mouseleave', () => {
      cancelAnimationFrame(this.animationId);
      this.element.style.transform = 'translateY(0)';
    });
  }

  destroy() {
    this.element.removeEventListener('mousemove', this.handleMouseMove);
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

// Initialize the fluid glass effect
let fluidGlassEffect;

document.addEventListener('DOMContentLoaded', () => {
  const topbar = document.querySelector('.topbar');
  if (topbar) {
    fluidGlassEffect = new FluidGlassEffect(topbar);
  }
});
// Initialize the background
let iridescentBg;
function startIridescentBackground(){
  // Guard if already running
  if (iridescentBg) return;
  iridescentBg = new IridescentBackground(document.body, {
    color: [0.07, 0.08, 0.12],
    speed: 0.5,
    amplitude: 0.05,
    mouseReact: true
  });
}

document.addEventListener('DOMContentLoaded', () => {
  startIridescentBackground();
});

function techFromType(type='') {
  const t = type.toLowerCase();
  if (t.includes('webgl')) return 'webgl';
  if (t.includes('svg'))   return 'svg';
  if (t.includes('canvas'))return 'canvas';
  if (t.includes('audio')) return 'audio';
  if (t.includes('worker'))return 'worker';
  if (t.includes('css'))   return 'css';
  return null;
}

function normalizeTags(effect){
  const raw = Array.isArray(effect.tags) ? effect.tags : [];
  const tech = techFromType(effect.type);
  const mapped = raw.map(t => TAG_ALIASES[t] || t);
  return [...new Set(tech ? [tech, ...mapped] : mapped)];
}

// --- Effects (ALL DEFINED FIRST) --------------------------------------------

// 1) CSS-only “Magnetic Button”
const effectMagneticButton = {
  id: "css-magnetic-button",
  name: "Magnetic Button Hover",
  type: "CSS",
  tags: ["css","interaction","mobile-safe"],
  perf: "GPU-light",
  async load(){},
  init(container){
    container.innerHTML = `
      <div style="display:grid;place-items:center;height:100%;gap:20px">
        <button class="magnetic-btn" id="magBtn">Hover me</button>
        <p style="color:#9aa1ad;margin:0">CSS radial highlight follows pointer with slight translate.</p>
      </div>`;
    const btn = container.querySelector("#magBtn");
    const onMove = (e)=>{
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      btn.style.setProperty("--mx", `${(x/r.width)*100}%`);
      btn.style.setProperty("--my", `${(y/r.height)*100}%`);
      const dx = (x/r.width - .5)*12;
      const dy = (y/r.height - .5)*12;
      btn.style.setProperty("--dx", `${dx.toFixed(1)}px`);
      btn.style.setProperty("--dy", `${dy.toFixed(1)}px`);
    };
    btn.addEventListener("pointermove", onMove);
    btn.addEventListener("pointerleave", ()=>{ btn.style.removeProperty("--dx"); btn.style.removeProperty("--dy"); });
    this._cleanup = ()=> btn.removeEventListener("pointermove", onMove);
  },
  teardown(){ this._cleanup?.(); }
};

// 2) JS Canvas “Particle Fountain”
const effectParticleFountain = {
  id: "js-particle-fountain",
  name: "Particle Fountain",
  type: "JS/Canvas",
  tags: ["canvas","particles"],
  perf: "GPU/CPU medium",
  async load(){},
  init(container){
    const c = document.createElement("canvas");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    container.appendChild(c);
    const ctx = c.getContext("2d");

    const resize = ()=>{
      const w = container.clientWidth, h = container.clientHeight;
      c.width = Math.floor(w*dpr); c.height = Math.floor(h*dpr);
      c.style.width = w+"px"; c.style.height = h+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    resize(); const ro = new ResizeObserver(resize); ro.observe(container);

    const P = [];
    const GRAV = 0.12, DRAG = 0.995, EMIT_RATE = 6;
    function emit(){
      const cx = c.clientWidth/2, cy = c.clientHeight-20;
      for(let i=0;i<EMIT_RATE;i++){
        const angle = (-Math.PI/2) + (Math.random()-.5)*0.6;
        const speed = 4 + Math.random()*2.5;
        P.push({ x: cx, y: cy, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed-1.0, life: 90 + Math.random()*50 });
      }
    }

    let raf;
    const step = ()=>{
      emit();
      for(let i=P.length-1;i>=0;i--){
        const p=P[i];
        p.vx*=DRAG; p.vy=(p.vy+GRAV)*DRAG; p.x+=p.vx; p.y+=p.vy; p.life-=1;
        if(p.life<0 || p.y>c.clientHeight+20) P.splice(i,1);
      }
      ctx.clearRect(0,0,c.clientWidth,c.clientHeight);
      ctx.globalCompositeOperation="lighter";
      for(const p of P){
        const a = Math.max(0, Math.min(1, p.life/120));
        ctx.beginPath(); ctx.arc(p.x,p.y, 2.5, 0, Math.PI*2);
        ctx.fillStyle = `rgba(91,157,255,${a})`; ctx.fill();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    this._cleanup = ()=>{ cancelAnimationFrame(raf); ro.disconnect(); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};

// 3) CSS “Pulse Border Card”
const effectCssPulseBorder = {
  id: "css-pulse-border",
  name: "Pulse Border Card",
  type: "CSS",
  tags: ["css","micro-interaction"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>CSS <code>@keyframes</code> for subtle breathing/pulse.</li>
      <li><code>outline</code> + <code>box-shadow</code> glow.</li>
      <li>No JavaScript needed.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 0 rgba(91,157,255,0);} 50%{box-shadow:0 0 24px rgba(91,157,255,.25);} }
        .pulse-card{ width:min(520px,90%); margin:auto; margin-top:6%; background:linear-gradient(180deg,#12141a,#0e1116);
          border:1px solid var(--line); border-radius:16px; padding:20px; outline:1px solid rgba(91,157,255,.25);
          animation:pulseGlow 2.4s ease-in-out infinite; transition:transform .2s ease, box-shadow .2s ease; }
        .pulse-card:hover{ transform:translateY(-2px); box-shadow:0 12px 40px rgba(91,157,255,.18); }
        .pulse-card h4{margin:0 0 6px 0} .pulse-card p{margin:0; color:#9aa1ad}
      </style>
      <article class="pulse-card"><h4>CSS Pulse</h4><p>Breathing glow using keyframes + shadow.</p></article>`;
    this._cleanup = ()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};

// 4) JS “Card Tilt (Pointer)”
const effectTiltCard = {
  id: "js-tilt-card",
  name: "Card Tilt (Pointer)",
  type: "JS",
  tags: ["interaction","css","3d"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li>Pointer tracking</li><li>3D tilt with perspective</li><li>Reset on leave</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .tilt-wrap{display:grid;place-items:center;height:100%;}
        .tilt-card{ width:min(420px,90%); height:220px; border-radius:16px; border:1px solid var(--line);
          background:radial-gradient(120% 160% at 30% 10%, rgba(91,157,255,.18), transparent 60%), #0f1218;
          transition:transform .12s ease; transform-style:preserve-3d; will-change:transform; }
      </style>
      <div class="tilt-wrap"><div class="tilt-card" id="tilt"></div></div>`;
    const card = container.querySelector("#tilt");
    const max = 10;
    const onMove = (e)=>{
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left)/r.width - .5;
      const y = (e.clientY - r.top)/r.height - .5;
      card.style.transform = `perspective(800px) rotateX(${(y*-max).toFixed(2)}deg) rotateY(${(x*max).toFixed(2)}deg)`;
    };
    const onLeave = ()=>{ card.style.transform = "perspective(800px) rotateX(0) rotateY(0)"; };
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", onLeave);
    this._cleanup = ()=>{ card.removeEventListener("pointermove", onMove); card.removeEventListener("pointerleave", onLeave); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};

// 5) SVG “Path Draw”
const effectSvgPathDraw_v2 = {
  id: "svg-path-draw-v2",
  name: "SVG Path Draw",
  type: "SVG",
  tags: ["svg","typography"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li>Stroke dash draw animation</li><li>dasharray + dashoffset</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        @keyframes draw { from{ stroke-dashoffset: var(--len, 1000);} to{ stroke-dashoffset: 0;} }
        .draw path{ stroke:#5b9dff; stroke-width:3; fill:none; stroke-linecap:round; stroke-linejoin:round; animation:draw 2.5s ease forwards;}
      </style>
      <div style="display:grid;place-items:center;height:100%;">
        <svg class="draw" viewBox="0 0 600 200" width="90%" height="60%">
          <path id="p" d="M40 140 C 120 40, 220 40, 300 140 S 480 240, 560 140" />
        </svg>
      </div>`;
    const path = container.querySelector("#p");
    const len = Math.ceil(path.getTotalLength());
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    container.querySelector(".draw").style.setProperty("--len", len);
    this._cleanup = ()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};

// 6) Scroll “Mini Parallax”
const effectMiniParallax = {
  id: "scroll-mini-parallax",
  name: "Mini Parallax (Internal Scroll)",
  type: "Scroll",
  tags: ["scroll","parallax"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li>Parallax via translateY()</li><li>Internal scroller in the modal</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .para-wrap{height:100%; overflow:auto; position:relative; border-radius:12px;}
        .para-scene{position:relative; height:1400px; background:linear-gradient(#0b0d12,#0e1116);}
        .layer{position:absolute; left:0; right:0; will-change:transform;}
        .l-back{top:0; height:100%; background:radial-gradient(60% 40% at 50% 20%, #1a2336, transparent 60%);}
        .l-mid{top:120px; display:grid; place-items:center;}
        .l-front{top:420px; display:grid; place-items:center;}
        .para-card{ width:min(520px,88%); border:1px solid var(--line); border-radius:16px; background:#10131a; padding:16px; text-align:center; color:#cfd5df; }
      </style>
      <div class="para-wrap" id="scroller">
        <div class="para-scene">
          <div class="layer l-back" data-speed="0.2"></div>
          <div class="layer l-mid" data-speed="0.5"><div class="para-card">Mid Layer</div></div>
          <div class="layer l-front" data-speed="0.9"><div class="para-card">Front Layer</div></div>
        </div>
      </div>`;
    const scroller = container.querySelector("#scroller");
    const layers = [...container.querySelectorAll(".layer")];
    let ticking = false;
    const onScroll = ()=>{
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(()=>{
        const y = scroller.scrollTop;
        for(const el of layers){
          const s = parseFloat(el.dataset.speed||"0.5");
          el.style.transform = `translateY(${-(y*s).toFixed(1)}px)`;
        }
        ticking = false;
      });
    };
    scroller.addEventListener("scroll", onScroll, {passive:true});
    this._cleanup = ()=>{ scroller.removeEventListener("scroll", onScroll); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectRippleButton = {
  id: "js-ripple-button",
  name: "Ripple Button (Click)",
  type: "JS+CSS",
  tags: ["interaction","css","micro-interaction"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Create an element at the click position.</li>
      <li>Animate scale + fade with CSS keyframes.</li>
      <li>Clean up the ripple node on <code>animationend</code>.</li>
    </ul>
  `,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .rip-wrap{display:grid;place-items:center;height:100%;gap:14px}
        .rip-btn{
          position:relative; overflow:hidden; border-radius:12px; border:1px solid var(--line);
          background:#0f131b; padding:14px 20px; color:#fff; cursor:pointer;
        }
        .rip{ position:absolute; width:20px; height:20px; border-radius:50%;
          transform:translate(-50%,-50%) scale(0); pointer-events:none;
          background:radial-gradient(circle, rgba(91,157,255,.35), rgba(91,157,255,0) 60%);
          animation:rip 600ms ease-out forwards;
        }
        @keyframes rip{
          to{ transform:translate(-50%,-50%) scale(14); opacity:0; }
        }
      </style>
      <div class="rip-wrap">
        <button class="rip-btn" id="rb">Click for ripple</button>
        <p style="color:#9aa1ad;margin:0">JS places a radial span at the click point; CSS animates it.</p>
      </div>`;
    const btn = container.querySelector("#rb");
    const onClick = (e)=>{
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const s = document.createElement("span");
      s.className = "rip"; s.style.left = x+"px"; s.style.top = y+"px";
      btn.appendChild(s);
      s.addEventListener("animationend", ()=> s.remove());
    };
    btn.addEventListener("click", onClick);
    this._cleanup = ()=> btn.removeEventListener("click", onClick);
  },
  teardown(){ this._cleanup?.(); }
};
const effectConfettiClick = {
  id: "canvas-confetti-click",
  name: "Confetti Burst (Click)",
  type: "JS/Canvas",
  tags: ["canvas","particles"],
  perf: "GPU/CPU medium",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Canvas draw loop with <code>requestAnimationFrame</code>.</li>
      <li>Spawn particles on click; simple gravity + drag + rotation.</li>
      <li>Clean teardown (cancel rAF, remove listeners).</li>
    </ul>
  `,
  async load(){},
  init(container){
    const c = document.createElement("canvas"); container.appendChild(c);
    const ctx = c.getContext("2d"); const dpr = Math.min(2, window.devicePixelRatio||1);
    const resize=()=>{ const w=container.clientWidth,h=container.clientHeight;
      c.width=Math.floor(w*dpr); c.height=Math.floor(h*dpr); c.style.width=w+"px"; c.style.height=h+"px"; ctx.setTransform(dpr,0,0,dpr,0,0); };
    resize(); const ro=new ResizeObserver(resize); ro.observe(container);

    const colors=["#5b9dff","#a7f3d0","#f472b6","#fbbf24","#60a5fa","#34d399"];
    const P=[]; let raf;
    const spawn=(x,y)=>{
      for(let i=0;i<60;i++){
        P.push({
          x,y, w: 3+Math.random()*4, h: 6+Math.random()*8,
          vx:(Math.random()-.5)*6, vy:-Math.random()*6-3,
          r:Math.random()*Math.PI*2, vr:(Math.random()-.5)*0.2,
          col:colors[(Math.random()*colors.length)|0], life: 120+Math.random()*60
        });
      }
    };
    const click=(e)=>{ const r=c.getBoundingClientRect(); spawn(e.clientX-r.left, e.clientY-r.top); };
    c.addEventListener("click", click);

    const step=()=>{
      ctx.clearRect(0,0,c.clientWidth,c.clientHeight);
      for(let i=P.length-1;i>=0;i--){
        const p=P[i]; p.vx*=0.99; p.vy+=0.18; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr; p.life--;
        if(p.life<=0 || p.y>c.clientHeight+40) { P.splice(i,1); continue; }
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r);
        ctx.fillStyle=p.col; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
      }
      raf=requestAnimationFrame(step);
    };
    raf=requestAnimationFrame(step);

    this._cleanup=()=>{ cancelAnimationFrame(raf); ro.disconnect(); c.removeEventListener("click",click); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectSvgGooeyBlobs = {
  id: "svg-gooey-blobs",
  name: "Gooey Blobs",
  type: "SVG/Filter",
  tags: ["svg","filter"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li><code>feGaussianBlur</code> + <code>feColorMatrix</code> to create a gooey merge.</li>
      <li>CSS keyframes move circles; filter applied to a group.</li>
    </ul>
  `,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        @keyframes driftX { 0%{transform:translateX(-60px)} 50%{transform:translateX(60px)} 100%{transform:translateX(-60px)} }
        @keyframes driftY { 0%{transform:translateY(30px)} 50%{transform:translateY(-30px)} 100%{transform:translateY(30px)} }
        .blob{mix-blend-mode:screen}
      </style>
      <div style="display:grid;place-items:center;height:100%;">
        <svg viewBox="0 0 400 240" width="90%" height="75%">
          <defs>
            <filter id="goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/>
              <feColorMatrix in="blur" mode="matrix"
                values="1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 20 -10" result="goo"/>
              <feBlend in="SourceGraphic" in2="goo"/>
            </filter>
          </defs>
          <g filter="url(#goo)">
            <circle class="blob" cx="160" cy="120" r="40" fill="#5b9dff" style="animation:driftX 5s ease-in-out infinite"/>
            <circle class="blob" cx="220" cy="120" r="40" fill="#34d399" style="animation:driftY 4.5s ease-in-out infinite"/>
            <circle class="blob" cx="190" cy="120" r="32" fill="#f472b6"/>
          </g>
        </svg>
      </div>`;
    this._cleanup = ()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectScrollReveal = {
  id: "scroll-reveal-cards",
  name: "Scroll Reveal Cards",
  type: "Scroll",
  tags: ["scroll","a11y"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li><code>IntersectionObserver</code> with a custom root (internal scroller).</li>
      <li>Cards fade/slide in when 20% visible.</li>
    </ul>
  `,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .sr-wrap{height:100%; overflow:auto; padding:24px;}
        .sr-grid{display:grid; gap:16px;}
        .sr-card{
          opacity:.05; transform:translateY(14px);
          transition:opacity .5s ease, transform .5s ease;
          border:1px solid var(--line); border-radius:12px; background:#10131a; padding:16px; color:#cfd5df;
        }
        .sr-card.in{opacity:1; transform:none;}
      </style>
      <div class="sr-wrap" id="srRoot">
        <div class="sr-grid">
          ${Array.from({length:8},(_,i)=>`<article class="sr-card">Reveal card #${i+1}</article>`).join("")}
        </div>
      </div>`;
    const root = container.querySelector("#srRoot");
    const cards = [...container.querySelectorAll(".sr-card")];
    const io = new IntersectionObserver((entries)=>{
      for(const e of entries){ if(e.isIntersecting) e.target.classList.add("in"); }
    }, {root, threshold:0.2});
    cards.forEach(c=>io.observe(c));
    this._cleanup = ()=>{ io.disconnect(); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCssFlipCard = {
  id: "css-flip-card",
  name: "3D Flip Card (Hover/Focus)",
  type: "CSS",
  tags: ["css","3d","a11y"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Parent <code>perspective</code> + child rotateY.</li>
      <li>Flips on :hover and :focus-within for keyboard users.</li>
    </ul>
  `,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .flip-wrap{display:grid;place-items:center;height:100%; perspective:900px;}
        .flip{position:relative; width:min(420px,90%); height:240px; transform-style:preserve-3d;
              transition:transform .5s cubic-bezier(.2,.7,.2,1);}
        .flip-wrap:hover .flip, .flip:focus-within{ transform:rotateY(180deg); }
        .face{position:absolute; inset:0; display:grid; place-items:center; border:1px solid var(--line);
              border-radius:16px; background:#0f1218; backface-visibility:hidden;}
        .back{ transform:rotateY(180deg); background:#101a26; }
        .flip button{position:absolute; inset:auto auto 12px 12px}
      </style>
      <div class="flip-wrap">
        <div class="flip" tabindex="-1">
          <div class="face front">Front</div>
          <div class="face back">Back</div>
          <button class="btn">Focus me</button>
        </div>
      </div>`;
    this._cleanup = ()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectSpringyDrag = {
  id: "physics-springy-drag",
  name: "Springy Drag Dot",
  type: "JS/Physics",
  tags: ["physics","interaction"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Simple spring integration (Hooke’s law + damping).</li>
      <li>Pointer moves the target; dot eases toward it.</li>
    </ul>
  `,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .spr{ position:relative; height:100%; }
        .spr::before{ content:""; position:absolute; inset:0; background:radial-gradient(60% 40% at 50% 20%, #121a2a, transparent 60%); }
        .dot{ position:absolute; width:26px; height:26px; border-radius:50%; background:#5b9dff; box-shadow:0 6px 18px rgba(91,157,255,.35); }
      </style>
      <div class="spr" id="spr"></div>`;
    const el = container.querySelector("#spr");
    const dot = document.createElement("div"); dot.className="dot"; el.appendChild(dot);

    const center = ()=>({ x: el.clientWidth/2, y: el.clientHeight/2 });
    let target = center(), x=target.x, y=target.y, vx=0, vy=0;
    const k = 0.08, damp = 0.85;

    const onMove = (e)=>{ const r=el.getBoundingClientRect(); target={ x:e.clientX-r.left, y:e.clientY-r.top }; };
    const onLeave= ()=>{ target = center(); };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    let raf;
    const step=()=>{
      const ax = (target.x - x) * k;
      const ay = (target.y - y) * k;
      vx = (vx + ax) * damp;
      vy = (vy + ay) * damp;
      x += vx; y += vy;
      dot.style.transform = `translate(${(x-13).toFixed(1)}px, ${(y-13).toFixed(1)}px)`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    this._cleanup = ()=>{ cancelAnimationFrame(raf); el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCssShimmer = {
  id: "css-shimmer-skeleton",
  name: "Shimmer Skeleton",
  type: "CSS",
  tags: ["css","micro-interaction"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li>“Loading” placeholders using a moving gradient.</li>
        <li>Only CSS: keyframes + pseudo-element.</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        @keyframes sh { to { transform: translateX(100%);} }
        .sk-wrap{display:grid;place-items:center;height:100%;padding:20px;}
        .sk-card{width:min(520px,92%);border:1px solid var(--line);border-radius:14px;padding:16px;background:#0f1218}
        .sk-line,.sk-avatar{position:relative;overflow:hidden;background:#141923;border-radius:8px}
        .sk-avatar{width:56px;height:56px;border-radius:50%}
        .sk-line{height:12px}.sk-line.m{height:16px}.sk-line+.sk-line{margin-top:10px}
        .shimmer::before{
          content:"";position:absolute;inset:0;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent);
          transform:translateX(-100%);animation:sh 1.4s linear infinite;
        }
      </style>
      <div class="sk-wrap">
        <div class="sk-card">
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
            <div class="sk-avatar shimmer"></div>
            <div style="flex:1">
              <div class="sk-line m shimmer"></div>
              <div class="sk-line shimmer" style="width:60%"></div>
            </div>
          </div>
          <div class="sk-line shimmer"></div>
          <div class="sk-line shimmer" style="width:90%"></div>
          <div class="sk-line shimmer" style="width:70%"></div>
        </div>
      </div>`;
    this._cleanup = ()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectSvgTextOnPath = {
  id: "svg-text-on-path",
  name: "SVG Text on a Path",
  type: "SVG",
  tags: ["svg","typography"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li><code>&lt;textPath&gt;</code> to bind text to a curve.</li>
        <li>SMIL animation of <code>startOffset</code> to move it.</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>.top-wrap{display:grid;place-items:center;height:100%}</style>
      <div class="top-wrap">
        <svg viewBox="0 0 600 200" width="92%" height="60%">
          <defs><path id="curve" d="M20,140 C120,20 480,20 580,140"/></defs>
          <path d="M20,140 C120,20 480,20 580,140" fill="none" stroke="#223"/>
          <text fill="#5b9dff" font-size="24" font-family="system-ui,Segoe UI,Roboto,Inter,sans-serif">
            <textPath href="#curve" startOffset="0%">
              Moving text follows this curve — Effects Lab
              <animate attributeName="startOffset" values="0%;100%;0%" dur="10s" repeatCount="indefinite"/>
            </textPath>
          </text>
        </svg>
      </div>`;
    this._cleanup = ()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectTextScramble = {
  id: "js-text-scramble",
  name: "Text Scramble → Resolve",
  type: "JS",
  tags: ["interaction","typography"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li>rAF-driven character scrambling.</li>
        <li>Reveals target text progressively.</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .scr-wrap{display:grid;place-items:center;height:100%;gap:14px}
        .scr{font-size:28px;letter-spacing:.5px;color:#e7eaf0;text-align:center}
      </style>
      <div class="scr-wrap">
        <div id="scrTxt" class="scr"></div>
        <button class="btn" id="scrNext">Next</button>
      </div>`;
    const phrases = [
      "Hello, Effects Lab",
      "Scramble → Resolve",
      "Tiny, pasteable demos",
      "CSS · SVG · Canvas · Scroll"
    ];
    const chars = "!<>-_\\/[]{}—=+*^?#________";
    const el = container.querySelector("#scrTxt");
    const btn = container.querySelector("#scrNext");
    let i = 0, frame = 0, raf, queue = [];

    const scrambleTo = (text)=>{
      cancelAnimationFrame(raf);
      const old = el.textContent || "";
      const len = Math.max(old.length, text.length);
      queue = [];
      for(let n=0;n<len;n++){
        const from = old[n] || "";
        const to = text[n] || "";
        const start = Math.floor(Math.random()*20);
        const end   = start + 10 + Math.floor(Math.random()*20);
        queue.push({from,to,start,end,char:null});
      }
      frame = 0; update();
    };

    const update = ()=>{
      let out = "", done = 0;
      for(const q of queue){
        if(frame >= q.end){ done++; out += q.to; }
        else if(frame >= q.start){
          if(!q.char || Math.random()<0.28) q.char = chars[(Math.random()*chars.length)|0];
          out += `<span style="color:#9aa1ad">${q.char}</span>`;
        } else out += q.from;
      }
      el.innerHTML = out;
      if(done === queue.length) return;
      raf = requestAnimationFrame(update); frame++;
    };

    btn.addEventListener("click", ()=>{
      i = (i+1)%phrases.length;
      scrambleTo(phrases[i]);
    });
    scrambleTo(phrases[i]);

    this._cleanup = ()=>{ cancelAnimationFrame(raf); btn.replaceWith(btn.cloneNode(true)); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectScrollSnapCarousel = {
  id: "css-scroll-snap",
  name: "Scroll-Snap Carousel",
  type: "CSS",
  tags: ["scroll","css"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li><code>scroll-snap-type</code> for natural snapping.</li>
        <li>Smooth programmatic scroll with buttons.</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .snap-wrap{height:100%;display:grid;grid-template-rows:auto 1fr;gap:10px;padding:12px}
        .snap-track{display:flex;gap:12px;overflow:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;padding-bottom:10px}
        .snap-card{flex:0 0 80%;scroll-snap-align:center;border:1px solid var(--line);border-radius:16px;
                   background:#10131a;height:70%;display:grid;place-items:center;color:#cfd5df}
        .snap-track::-webkit-scrollbar{height:8px}
      </style>
      <div class="snap-wrap">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="badges"><span class="badge">scroll-snap-type</span><span class="badge">smooth</span></div>
          <div style="display:flex;gap:8px">
            <button class="btn" id="prev">◀</button>
            <button class="btn" id="next">▶</button>
          </div>
        </div>
        <div class="snap-track" id="track" aria-label="Carousel">
          ${Array.from({length:5},(_,i)=>`<div class="snap-card">Card ${i+1}</div>`).join("")}
        </div>
      </div>`;
    const track = container.querySelector("#track");
    const prev = container.querySelector("#prev");
    const next = container.querySelector("#next");
    const onPrev = ()=> track.scrollBy({left: -track.clientWidth*0.85, behavior:"smooth"});
    const onNext = ()=> track.scrollBy({left:  track.clientWidth*0.85, behavior:"smooth"});
    prev.addEventListener("click", onPrev); next.addEventListener("click", onNext);
    this._cleanup = ()=>{ prev.removeEventListener("click", onPrev); next.removeEventListener("click", onNext); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectSpotlightReveal = {
  id: "css-spotlight-reveal",
  name: "Spotlight Reveal (mask)",
  type: "JS+CSS",
  tags: ["css","interaction","filter"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Pointer-controlled CSS <code>mask-image</code> / <code>-webkit-mask</code>.</li>
      <li>We darken the layer and cut a circular “hole” that follows the mouse.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .spot-wrap{position:relative;height:100%;display:grid;place-items:center;
          background: radial-gradient(120% 80% at 10% 0%, #141c2a, transparent),
                      radial-gradient(100% 120% at 90% 100%, #0d1320, #0a0d14);
          color:#e7eaf0; overflow:hidden; border-radius:12px;
        }
        .spot-wrap h2{font-size:42px; letter-spacing:.5px; margin:0; text-align:center}
        .spot-overlay{position:absolute; inset:0; background:rgba(0,0,0,.62);}
        /* cut a hole with a mask: transparent center (hole), opaque outside */
        .spot-overlay{
          -webkit-mask: radial-gradient(closest-side at var(--x,50%) var(--y,50%),
                        transparent 0 120px, #fff 140px);
                  mask: radial-gradient(closest-side at var(--x,50%) var(--y,50%),
                        transparent 0 120px, #fff 140px);
          transition: -webkit-mask-position .06s linear, mask-position .06s linear;
        }
      </style>
      <div class="spot-wrap" id="spot">
        <h2>Spotlight Reveal</h2>
        <div class="spot-overlay"></div>
      </div>`;
    const wrap = container.querySelector("#spot");
    const move = (e)=>{
      const r = wrap.getBoundingClientRect();
      const x = ((e.clientX - r.left)/r.width)*100;
      const y = ((e.clientY - r.top)/r.height)*100;
      wrap.style.setProperty("--x", x+"%");
      wrap.style.setProperty("--y", y+"%");
    };
    const leave = ()=>{
      wrap.style.removeProperty("--x");
      wrap.style.removeProperty("--y");
    };
    wrap.addEventListener("pointermove", move);
    wrap.addEventListener("pointerleave", leave);
    this._cleanup = ()=>{ wrap.removeEventListener("pointermove", move); wrap.removeEventListener("pointerleave", leave); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectSvgMorphBlob = {
  id: "svg-morph-blob",
  name: "Morphing Blob",
  type: "SVG",
  tags: ["svg","filter","typography"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>SVG <code>&lt;animate&gt;</code> on the path’s <code>d</code> attribute.</li>
      <li>Compatible paths (same number of cubic curves) loop between shapes.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>.morph-wrap{display:grid;place-items:center;height:100%}</style>
      <div class="morph-wrap">
        <svg viewBox="0 0 260 240" width="70%" height="70%">
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#5b9dff"/><stop offset="1" stop-color="#34d399"/>
            </linearGradient>
          </defs>
          <path fill="url(#grad)">
            <animate attributeName="d" dur="7000ms" repeatCount="indefinite"
              values="
                M200,120 C200,70 160,40 120,40 C80,40 40,70 40,120 C40,170 80,200 120,200 C160,200 200,170 200,120 Z;
                M210,120 C210,65 170,50 130,60 C90,70 50,90 50,120 C50,150 90,165 130,175 C170,185 210,175 210,120 Z;
                M200,120 C200,70 160,40 120,40 C80,40 40,70 40,120 C40,170 80,200 120,200 C160,200 200,170 200,120 Z
              " />
          </path>
        </svg>
      </div>`;
    this._cleanup = ()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCanvasStarfield = {
  id: "canvas-starfield",
  name: "Starfield (warp on click)",
  type: "JS/Canvas",
  tags: ["canvas","particles"],
  perf: "GPU/CPU light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>2D canvas with depth-based speed.</li>
      <li>Resize-safe; click toggles warp speed.</li>
    </ul>`,
  async load(){},
  init(container){
    const c = document.createElement("canvas"); container.appendChild(c);
    const ctx = c.getContext("2d"); const dpr = Math.min(2, window.devicePixelRatio||1);
    const resize=()=>{ const w=container.clientWidth,h=container.clientHeight;
      c.width=Math.floor(w*dpr); c.height=Math.floor(h*dpr); c.style.width=w+"px"; c.style.height=h+"px"; ctx.setTransform(dpr,0,0,dpr,0,0); };
    resize(); const ro=new ResizeObserver(resize); ro.observe(container);

    const N = 240; const stars = []; let warp=false;
    const resetStar = (s)=>{ s.x=(Math.random()-0.5)*c.clientWidth; s.y=(Math.random()-0.5)*c.clientHeight; s.z=Math.random()*1+0.1; s.size = (1.2 - s.z)*2; };
    for(let i=0;i<N;i++){ stars.push({x:0,y:0,z:0,size:1}); resetStar(stars[i]); }

    const step=()=>{
      ctx.clearRect(0,0,c.clientWidth,c.clientHeight);
      ctx.translate(c.clientWidth/2, c.clientHeight/2);
      for(const s of stars){
        const spd = (warp? 4.5: 1.4) * (1.6 - s.z);
        s.y += spd;
        if(s.y > c.clientHeight/2 + 40) { s.y = -c.clientHeight/2 - 40; s.x = (Math.random()-0.5)*c.clientWidth; s.z = Math.random()*1+0.1; s.size=(1.2 - s.z)*2; }
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
        ctx.fillStyle = "rgba(231,234,240,0.85)"; ctx.fill();
      }
      ctx.setTransform(1,0,0,1,0,0);
      raf = requestAnimationFrame(step);
    };
    let raf = requestAnimationFrame(step);
    const toggle=()=>{ warp=!warp; };
    c.addEventListener("click", toggle);

    this._cleanup=()=>{ cancelAnimationFrame(raf); ro.disconnect(); c.removeEventListener("click", toggle); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectFormStrength = {
  id: "form-strength-floating",
  name: "Floating Labels + Strength Meter",
  type: "JS+CSS",
  tags: ["forms","a11y","interaction"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Floating labels using <code>:focus-within</code> and <code>:placeholder-shown</code>.</li>
      <li>Lightweight strength meter (length + variety of chars).</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .fx-form{height:100%;display:grid;place-items:center}
        .card{width:min(520px,92%);border:1px solid var(--line);border-radius:14px;background:#0f1218;padding:16px;color:#cfd5df}
        .row{position:relative;margin-top:12px}
        .row input{
          width:100%;padding:14px 12px;border-radius:10px;border:1px solid var(--line);
          background:#0c1016;color:#e7eaf0;outline:none;
        }
        .row label{
          position:absolute; left:12px; top:12px; pointer-events:none; color:#9aa1ad;
          transition:transform .15s ease, color .15s ease, font-size .15s ease;
          background:transparent; padding:0 4px;
        }
        .row:focus-within label,
        .row input:not(:placeholder-shown) + label{
          transform:translateY(-22px); font-size:12px; color:#5b9dff; background:#0f1218;
        }
        .meter{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}
        .meter span{height:8px;border-radius:6px;background:#1a202c;border:1px solid #232b3a}
        .meter span.on{background:#34d399;border-color:#256d5a}
        .hint{font-size:12px;color:#9aa1ad;margin-top:8px}
      </style>
      <div class="fx-form">
        <div class="card">
          <div class="row">
            <input id="email" type="email" placeholder=" " autocomplete="email">
            <label for="email">Email</label>
          </div>
          <div class="row">
            <input id="pw" type="password" placeholder=" " autocomplete="new-password">
            <label for="pw">Password</label>
            <div class="meter" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
            <div class="hint" id="hint">Strength: Weak</div>
          </div>
        </div>
      </div>`;
    const pw = container.querySelector("#pw");
    const bars = [...container.querySelectorAll(".meter span")];
    const hint = container.querySelector("#hint");

    const score = (s)=>{
      let sc = 0;
      if(s.length >= 8) sc++;
      if(/[A-Z]/.test(s) && /[a-z]/.test(s)) sc++;
      if(/\d/.test(s)) sc++;
      if(/[^A-Za-z0-9]/.test(s)) sc++;
      return sc;
    };
    const text = ["Very weak","Weak","OK","Good","Strong"];
    const onInput = ()=>{
      const n = score(pw.value);
      bars.forEach((b,i)=> b.classList.toggle("on", i < n));
      hint.textContent = "Strength: " + text[n];
    };
    pw.addEventListener("input", onInput);
    onInput();

    this._cleanup = ()=>{ pw.removeEventListener("input", onInput); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectMatrixRain = {
  id: "canvas-matrix-rain",
  name: "Matrix Rain",
  type: "JS/Canvas",
  tags: ["canvas","particles","typography"],
  perf: "GPU/CPU light",
  description: `
    <h3>What this shows</h3>
    <ul><li>Canvas columns with falling glyphs.</li>
        <li>Trail effect via translucent fill.</li></ul>`,
  async load(){},
  init(container){
    const c = document.createElement("canvas"); container.appendChild(c);
    const ctx = c.getContext("2d"); const dpr = Math.min(2, window.devicePixelRatio||1);
    const resize=()=>{ const w=container.clientWidth,h=container.clientHeight;
      c.width=Math.floor(w*dpr); c.height=Math.floor(h*dpr); c.style.width=w+"px"; c.style.height=h+"px"; ctx.setTransform(dpr,0,0,dpr,0,0);
      setup();
    };
    let fontSize=16, columns=0, drops=[], chars="アカサタナハマヤラワ0123456789ABCDEFGHJKMNPRSTUVWXYZ";
    function setup(){ columns = Math.max(1, Math.floor(c.clientWidth / fontSize)); drops = Array(columns).fill(0); }
    resize(); const ro=new ResizeObserver(resize); ro.observe(container);
    let raf;
    const step=()=>{
      ctx.fillStyle="rgba(11,12,15,0.08)"; ctx.fillRect(0,0,c.clientWidth,c.clientHeight);
      ctx.fillStyle="#5b9dff"; ctx.font=fontSize+"px monospace";
      for(let i=0;i<columns;i++){
        const x=i*fontSize, y=drops[i]*fontSize;
        const ch = chars[(Math.random()*chars.length)|0];
        ctx.fillText(ch, x, y);
        if(y > c.clientHeight && Math.random()>0.975) drops[i]=0; else drops[i]++;
      }
      raf=requestAnimationFrame(step);
    };
    raf=requestAnimationFrame(step);
    this._cleanup=()=>{ cancelAnimationFrame(raf); ro.disconnect(); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectScrollProgress = {
  id: "scroll-progress-bar",
  name: "Scroll Progress (Internal)",
  type: "Scroll",
  tags: ["scroll","a11y"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li>Maps scroll position to a top progress bar.</li>
        <li>Works inside the modal via an internal scroller.</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .prog-wrap{height:100%; position:relative; border-radius:12px; overflow:auto; background:#0e1116;}
        .prog-bar{position:sticky; top:0; height:4px; background:#1a2233}
        .prog-fill{height:100%; width:0; background:#5b9dff; transition:width .06s linear}
        .content{padding:16px; color:#cfd5df}
        .blk{border:1px solid var(--line); border-radius:12px; padding:16px; margin:12px 0; background:#10131a}
      </style>
      <div class="prog-wrap" id="prog">
        <div class="prog-bar"><div class="prog-fill" id="fill"></div></div>
        <div class="content">
          ${Array.from({length:12},(_,i)=>`<div class="blk">Scrollable content block #${i+1}</div>`).join("")}
        </div>
      </div>`;
    const root = container.querySelector("#prog"), fill = container.querySelector("#fill");
    const onScroll=()=>{
      const max = root.scrollHeight - root.clientHeight;
      const pct = max>0 ? (root.scrollTop / max) * 100 : 0;
      fill.style.width = pct.toFixed(1) + "%";
    };
    root.addEventListener("scroll", onScroll, {passive:true}); onScroll();
    this._cleanup=()=>{ root.removeEventListener("scroll", onScroll); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectTypewriter = {
  id: "js-typewriter",
  name: "Typewriter (Caret)",
  type: "JS",
  tags: ["typography","interaction"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li>Typed characters with variable delay.</li>
        <li>Blinking caret via CSS animation.</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .tw-wrap{display:grid;place-items:center;height:100%;gap:12px}
        .tw{font-size:28px;color:#e7eaf0}
        .caret{display:inline-block;width:10px; background:#e7eaf0; margin-left:4px; animation:blink 1s steps(1) infinite}
        @keyframes blink{ 0%,50%{opacity:1} 50.01%,100%{opacity:0} }
      </style>
      <div class="tw-wrap">
        <div class="tw" id="t"></div>
        <div style="display:flex;gap:8px">
          <button class="btn" id="prev">Prev</button>
          <button class="btn" id="next">Next</button>
        </div>
      </div>`;
    const phrases=["Small things, well done.","Typewriter with caret.","Pasteable micro-demos.","CSS · SVG · Canvas · Scroll."];
    let i=0, idx=0, timer, el=container.querySelector("#t");
    const type=()=>{
      const text=phrases[i];
      if(idx <= text.length){ el.innerHTML = text.slice(0,idx) + '<span class="caret"></span>'; idx++; timer=setTimeout(type, 40 + Math.random()*90); }
      else { /* pause then reset */ timer=setTimeout(()=>{ idx=0; }, 900); }
    };
    const run=()=>{ clearTimeout(timer); idx=0; type(); };
    container.querySelector("#next").addEventListener("click", ()=>{ i=(i+1)%phrases.length; run(); });
    container.querySelector("#prev").addEventListener("click", ()=>{ i=(i-1+phrases.length)%phrases.length; run(); });
    run();
    this._cleanup=()=>{ clearTimeout(timer); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCssAccordion = {
  id: "css-accordion",
  name: "Accordion (details/summary)",
  type: "CSS",
  tags: ["css","a11y","forms"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li>Native <code>&lt;details&gt;</code>/<code>&lt;summary&gt;</code> for accessibility.</li>
        <li>CSS-only smooth content reveal using <code>grid-template-rows</code>.</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .acc{height:100%;display:grid;place-items:center;padding:16px}
        .acc .panel{width:min(560px,92%); border:1px solid var(--line); border-radius:12px; background:#0f1218; overflow:hidden}
        .acc details{border-top:1px solid var(--line)}
        .acc details:first-child{border-top:none}
        .acc summary{list-style:none; cursor:pointer; padding:14px 16px; color:#e7eaf0}
        .acc summary::-webkit-details-marker{display:none}
        .acc .content{display:grid; grid-template-rows:0fr; transition:grid-template-rows .35s ease}
        .acc .content > div{overflow:hidden; padding:0 16px 12px 16px; color:#9aa1ad}
        .acc details[open] .content{grid-template-rows:1fr}
        .acc summary:focus-visible{outline:2px solid #5b9dff; outline-offset:4px; border-radius:8px}
      </style>
      <div class="acc">
        <div class="panel">
          <details open>
            <summary>What is this?</summary>
            <div class="content"><div>CSS-only accordion using <code>details</code>. No JS for toggle behavior.</div></div>
          </details>
          <details>
            <summary>Why grid for animation?</summary>
            <div class="content"><div>We animate <code>grid-template-rows</code> from 0fr → 1fr so height becomes smooth without JS.</div></div>
          </details>
          <details>
            <summary>Keyboard support?</summary>
            <div class="content"><div>Built-in: Space/Enter toggles the section, and focus styles help navigation.</div></div>
          </details>
        </div>
      </div>`;
    this._cleanup=()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectFlipGridShuffle = {
  id: "js-flip-grid",
  name: "FLIP Grid Shuffle",
  type: "JS",
  tags: ["nav","transitions","interaction"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>FLIP: First → Last → Invert → Play for smooth reorders.</li>
      <li>We measure item rects, reorder DOM, then animate via <code>transform</code>.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .flip-ui{display:flex;gap:8px;justify-content:center;padding:10px}
        .flip-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:12px}
        .flip-item{aspect-ratio:1/1;display:grid;place-items:center;border:1px solid var(--line);
          border-radius:12px;background:#0f1218;color:#e7eaf0;font-weight:600;will-change:transform}
      </style>
      <div class="flip-ui">
        <button class="btn" id="shuffle">Shuffle</button>
        <button class="btn" id="sort">Sort</button>
      </div>
      <div class="flip-grid" id="grid">
        ${Array.from({length:12},(_,i)=>`<div class="flip-item" data-key="${i+1}">${i+1}</div>`).join("")}
      </div>`;
    const grid = container.querySelector("#grid");
    const items = ()=> [...grid.querySelectorAll(".flip-item")];

    function flip(reorderFn){
      const first = new Map(items().map(el=>[el.dataset.key, el.getBoundingClientRect()]));
      reorderFn();
      const last  = new Map(items().map(el=>[el.dataset.key, el.getBoundingClientRect()]));
      items().forEach(el=>{
        const a=first.get(el.dataset.key), b=last.get(el.dataset.key);
        const dx = (a.left - b.left), dy = (a.top - b.top);
        el.style.transform = `translate(${dx}px,${dy}px)`;
        el.style.transition = "transform 0s";
        requestAnimationFrame(()=>{
          el.style.transform = "translate(0,0)";
          el.style.transition = "transform .35s cubic-bezier(.2,.7,.2,1)";
        });
        el.addEventListener("transitionend", ()=>{ el.style.transition=""; }, {once:true});
      });
    }

    const onShuffle = ()=>{
      flip(()=>{
        const arr = items();
        for(let i=arr.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; arr[i].before(arr[j]); }
      });
    };
    const onSort = ()=>{
      flip(()=>{
        items().sort((a,b)=>a.dataset.key - b.dataset.key).forEach(el=>grid.appendChild(el));
      });
    };
    container.querySelector("#shuffle").addEventListener("click", onShuffle);
    container.querySelector("#sort").addEventListener("click", onSort);
    this._cleanup = ()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectScrollPinSteps = {
  id: "scroll-pin-steps",
  name: "Scroll Pin Steps",
  type: "Scroll",
  tags: ["scroll","a11y"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li><code>position: sticky</code> to pin a panel while steps scroll.</li>
      <li><code>IntersectionObserver</code> updates the pinned text.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .pin-root{height:100%;overflow:auto;padding:12px;display:grid;grid-template-columns:1fr min(360px,35%);gap:12px}
        .steps{display:grid;gap:14px}
        .step{min-height:220px;border:1px solid var(--line);border-radius:12px;background:#10131a;color:#cfd5df;padding:16px}
        .pin{position:sticky; top:12px; align-self:start; border:1px solid var(--line); border-radius:12px; background:#0f1218; padding:16px; height:fit-content}
        .pin h4{margin:0 0 8px 0; color:#e7eaf0}
        .now{outline:1px solid #5b9dff}
      </style>
      <div class="pin-root" id="root">
        <div class="steps" id="steps">
          ${["Setup","Measure","Map scroll","Polish"].map((t,i)=>`
            <section class="step" data-title="${t}">
              <h3>Step ${i+1}: ${t}</h3>
              <p>Scrollable content block ${i+1}. As this enters view, the pinned panel updates.</p>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus non dui a arcu fermentum.</p>
            </section>`).join("")}
          ${Array.from({length:4},(_,i)=>`
            <section class="step" data-title="Extra ${i+5}">
              <h3>Extra ${i+5}</h3><p>More content for scrolling…</p>
            </section>`).join("")}
        </div>
        <aside class="pin" id="pin">
          <h4 id="pinTitle">Pinned Panel</h4>
          <p id="pinBody">Scroll the steps. This text updates to the current section.</p>
        </aside>
      </div>`;
    const root = container.querySelector("#root");
    const pinTitle = container.querySelector("#pinTitle");
    const pinBody = container.querySelector("#pinBody");
    const steps = [...container.querySelectorAll(".step")];

    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          steps.forEach(s=>s.classList.remove("now"));
          e.target.classList.add("now");
          pinTitle.textContent = e.target.dataset.title;
          pinBody.textContent  = `Currently viewing: “${e.target.dataset.title}”.`;
        }
      });
    }, {root, threshold:0.6});

    steps.forEach(s=>io.observe(s));
    this._cleanup = ()=>{ io.disconnect(); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectFilterPlayground = {
  id: "css-filter-playground",
  name: "Filter Playground",
  type: "JS+CSS",
  tags: ["filter","media","interaction"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Live CSS <code>filter</code> chain controlled by range inputs.</li>
      <li>Blur, brightness, saturate, hue-rotate.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .fp{height:100%;display:grid;grid-template-columns:min(380px,40%) 1fr;gap:12px}
        .fp .panel{border:1px solid var(--line);border-radius:12px;background:#0f1218;padding:14px;color:#cfd5df}
        .fp label{display:grid;grid-template-columns:90px 1fr auto;gap:10px;align-items:center;margin:8px 0}
        .fp input[type="range"]{width:100%}
        .fp .stage{display:grid;place-items:center;border:1px solid var(--line);border-radius:12px;background:#0b0d12}
        .fp .pic{width:min(92%,520px);aspect-ratio:16/10;border-radius:12px;
          background:
            radial-gradient(120% 120% at 10% 10%, rgba(91,157,255,.25), transparent 60%),
            url('https://picsum.photos/960/600?random=5') center/cover no-repeat; }
        @media (prefers-reduced-data: reduce){
          .fp .pic{ background:
            radial-gradient(120% 120% at 10% 10%, rgba(91,157,255,.25), transparent 60%),
            linear-gradient(135deg,#17202e,#0f1218); }
        }
      </style>
      <div class="fp">
        <div class="panel">
          <label>Blur
            <input id="bl" type="range" min="0" max="12" value="0" step="1"/>
            <output id="obl">0px</output>
          </label>
          <label>Brightness
            <input id="br" type="range" min="50" max="150" value="100" step="1"/>
            <output id="obr">100%</output>
          </label>
          <label>Saturate
            <input id="sa" type="range" min="50" max="250" value="120" step="1"/>
            <output id="osa">120%</output>
          </label>
          <label>Hue
            <input id="hu" type="range" min="0" max="360" value="0" step="1"/>
            <output id="ohu">0°</output>
          </label>
        </div>
        <div class="stage"><div class="pic" id="pic"></div></div>
      </div>`;
    const pic = container.querySelector("#pic");
    const $ = id => container.querySelector(id);
    const update = ()=>{
      const blur = +$("#bl").value, br=+$("#br").value, sa=+$("#sa").value, hu=+$("#hu").value;
      $("#obl").value = blur+"px"; $("#obr").value = br+"%"; $("#osa").value = sa+"%"; $("#ohu").value = hu+"°";
      pic.style.filter = `blur(${blur}px) brightness(${br}%) saturate(${sa}%) hue-rotate(${hu}deg)`;
    };
    ["#bl","#br","#sa","#hu"].forEach(id=> $(id).addEventListener("input", update));
    update();
    this._cleanup = ()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectSvgCircularTimer = {
  id: "svg-circular-timer",
  name: "Circular Timer",
  type: "SVG",
  tags: ["svg","interaction","a11y"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Circle progress via <code>stroke-dashoffset</code>.</li>
      <li>Simple JS timer with start/stop/reset.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .ct{height:100%;display:grid;grid-template-rows:auto 1fr auto;gap:10px;place-items:center}
        .ct .panel{display:flex;gap:8px}
        .ct svg{display:block}
        .ct .text{position:absolute;inset:0;display:grid;place-items:center;color:#e7eaf0;font-size:28px}
        .ct .wrap{position:relative;width:min(280px,60%);aspect-ratio:1/1}
      </style>
      <div class="ct">
        <div class="panel">
          <label style="color:#cfd5df">Seconds <input id="sec" type="number" value="10" min="1" max="300" style="width:70px;margin-left:6px"></label>
          <button class="btn" id="start">Start</button>
          <button class="btn" id="stop">Stop</button>
          <button class="btn" id="reset">Reset</button>
        </div>
        <div class="wrap">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" stroke="#1a2233" stroke-width="8" fill="none"/>
            <circle id="arc" cx="50" cy="50" r="44" stroke="#5b9dff" stroke-width="8" fill="none"
                    stroke-linecap="round" transform="rotate(-90 50 50)"/>
          </svg>
          <div class="text" id="readout">10</div>
        </div>
      </div>`;
    const arc = container.querySelector("#arc");
    const readout = container.querySelector("#readout");
    const sec = container.querySelector("#sec");
    const btnStart = container.querySelector("#start");
    const btnStop = container.querySelector("#stop");
    const btnReset = container.querySelector("#reset");

    const C = 2 * Math.PI * 44;
    arc.style.strokeDasharray = String(C);
    let raf, startT = null, dur = (+sec.value||10)*1000, pausedAt = 0, running = false;

    function setProgress(ms){
      const clamped = Math.max(0, Math.min(1, 1 - ms/dur));
      arc.style.strokeDashoffset = String((1 - clamped) * C);
      readout.textContent = Math.ceil(clamped * (dur/1000));
    }

    function frame(t){
      if(startT===null) startT = t;
      const elapsed = (t - startT) + pausedAt;
      setProgress(elapsed);
      if(elapsed < dur){ raf = requestAnimationFrame(frame); }
      else { running=false; pausedAt=0; setProgress(dur); }
    }

    function start(){
      if(running){ return; }
      dur = (+sec.value||10)*1000;
      running = true; startT = null;
      raf = requestAnimationFrame(frame);
    }
    function stop(){
      if(!running){ return; }
      running = false;
      cancelAnimationFrame(raf);
      // compute pausedAt from current style
      const d = parseFloat(arc.style.strokeDashoffset||"0");
      const progress = 1 - (d / C);
      pausedAt = progress * dur;
    }
    function reset(){
      cancelAnimationFrame(raf); running=false; pausedAt=0; setProgress(0);
      readout.textContent = (+sec.value||10);
      arc.style.strokeDashoffset = "0";
    }

    btnStart.addEventListener("click", start);
    btnStop.addEventListener("click", stop);
    btnReset.addEventListener("click", reset);
    reset();

    this._cleanup = ()=>{ cancelAnimationFrame(raf); btnStart.replaceWith(btnStart.cloneNode(true)); btnStop.replaceWith(btnStop.cloneNode(true)); btnReset.replaceWith(btnReset.cloneNode(true)); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectImageCompare = {
  id: "media-image-compare",
  name: "Image Compare (Slider)",
  type: "JS+CSS",
  tags: ["media","interaction","a11y"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Before/After with a draggable handle or range input.</li>
      <li>CSS variable <code>--split</code> controls the reveal.</li>
      <li>Keyboard accessible via the range.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .cmp-wrap{height:100%;display:grid;place-items:center;padding:12px}
        .cmp{position:relative;width:min(900px,92%);aspect-ratio:16/9;border:1px solid var(--line);border-radius:12px;overflow:hidden;
             --split:50;}
        .cmp img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;user-select:none;pointer-events:none}
        .cmp .top{clip-path:inset(0 calc(100% - var(--split)*1%) 0 0);}
        .cmp .handle{position:absolute;top:0;bottom:0;left:calc(var(--split)*1% - 1px);width:2px;background:#5b9dff}
        .cmp .knob{position:absolute;left:calc(var(--split)*1% - 14px);top:50%;transform:translateY(-50%);
                   width:28px;height:28px;border-radius:50%;background:#0f1218;border:1px solid var(--line);box-shadow:0 4px 12px rgba(0,0,0,.35)}
        .cmp .ui{position:absolute;inset:auto 8px 8px 8px;display:flex;gap:8px;align-items:center}
        .cmp input[type=range]{inline-size:200px}
      </style>
      <div class="cmp-wrap">
        <div class="cmp" id="cmp" aria-label="Image compare">
          <img src="https://picsum.photos/1200/675?random=12" alt="Before">
          <img class="top" src="https://picsum.photos/1200/675?random=24" alt="After">
          <div class="handle" aria-hidden="true"></div>
          <div class="knob" id="knob" role="presentation"></div>
          <div class="ui">
            <span class="badge">Before</span>
            <input id="cmpRange" type="range" min="0" max="100" value="50" aria-label="Reveal amount">
            <span class="badge">After</span>
          </div>
        </div>
      </div>`;
    const cmp = container.querySelector("#cmp");
    const range = container.querySelector("#cmpRange");
    const knob = container.querySelector("#knob");
    const set = v => { cmp.style.setProperty("--split", v); };
    const onInput = ()=> set(range.value);
    range.addEventListener("input", onInput);

    // Drag anywhere
    let dragging=false;
    const pctFromEvent = (e)=>{
      const r = cmp.getBoundingClientRect();
      const x = Math.max(0, Math.min(r.width, e.clientX - r.left));
      return ((x / r.width) * 100).toFixed(1);
    };
    const down = (e)=>{ dragging=true; set(pctFromEvent(e)); range.value = cmp.style.getPropertyValue("--split"); };
    const move = (e)=>{ if(!dragging) return; set(pctFromEvent(e)); range.value = cmp.style.getPropertyValue("--split"); };
    const up   = ()=> dragging=false;

    cmp.addEventListener("pointerdown", down);
    cmp.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);

    this._cleanup = ()=> {
      range.removeEventListener("input", onInput);
      cmp.removeEventListener("pointerdown", down);
      cmp.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      container.innerHTML="";
    };
  },
  teardown(){ this._cleanup?.(); }
};
const effectAudioVisualizer = {
  id: "audio-visualizer",
  name: "Audio Visualizer (Oscillator)",
  type: "JS/Audio+Canvas",
  tags: ["audio-reactive","canvas","interaction"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Web Audio API oscillator → analyser → canvas bars.</li>
      <li>Start/Stop and frequency control.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .av{height:100%;display:grid;grid-template-rows:auto 1fr;gap:10px}
        .av .panel{display:flex;gap:10px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:12px;background:#0f1218;color:#cfd5df}
        .av canvas{display:block;width:100%;height:100%;border:1px solid var(--line);border-radius:12px;background:#0b0d12}
      </style>
      <div class="av">
        <div class="panel">
          <button class="btn" id="start">Start</button>
          <button class="btn" id="stop">Stop</button>
          <label>Freq <input id="freq" type="range" min="80" max="1200" value="440"></label>
          <label>Gain <input id="gain" type="range" min="0" max="100" value="8"></label>
        </div>
        <canvas id="cv"></canvas>
      </div>`;
    const c = container.querySelector("#cv");
    const ctx2d = c.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio||1);
    const resize = ()=>{
      const w = container.clientWidth, h = container.clientHeight - 66;
      c.width = Math.floor(w*dpr); c.height = Math.floor(h*dpr);
      c.style.width = w+"px"; c.style.height = h+"px";
      ctx2d.setTransform(dpr,0,0,dpr,0,0);
    };
    resize(); const ro=new ResizeObserver(resize); ro.observe(container);

    let ac, osc, gain, ana, raf;
    const freq = container.querySelector("#freq");
    const g = container.querySelector("#gain");
    const start = async ()=>{
      if(!ac){
        ac = new (window.AudioContext||window.webkitAudioContext)();
        ana = ac.createAnalyser(); ana.fftSize = 256;
        gain = ac.createGain(); gain.gain.value = (+g.value || 8)/100;
        osc = ac.createOscillator(); osc.type="sine"; osc.frequency.value = +freq.value;
        osc.connect(gain).connect(ana).connect(ac.destination); osc.start();
      }else{
        await ac.resume();
      }
      draw();
    };
    const stop = async ()=>{
      if(ac?.state === "running"){ await ac.suspend(); }
      cancelAnimationFrame(raf);
      renderFrame(true);
    };
    const renderFrame = (paused=false)=>{
      ctx2d.clearRect(0,0,c.clientWidth,c.clientHeight);
      const W=c.clientWidth,H=c.clientHeight;
      ctx2d.fillStyle="#10131a"; ctx2d.fillRect(0,0,W,H);
      const bins = new Uint8Array(ana.frequencyBinCount);
      if(!paused) ana.getByteFrequencyData(bins);
      const n=bins.length, barW = W/n*1.1;
      for(let i=0;i<n;i++){
        const val = paused? 0 : bins[i];
        const h = (val/255)*(H*0.85);
        ctx2d.fillStyle = "rgba(91,157,255,0.9)";
        ctx2d.fillRect(i*barW, H-h, barW*0.9, h);
      }
    };
    const draw = ()=>{
      renderFrame(false);
      raf = requestAnimationFrame(draw);
    };

    const onFreq = ()=> { if(osc) osc.frequency.value = +freq.value; };
    const onGain = ()=> { if(gain) gain.gain.value = (+g.value || 0)/100; };

    container.querySelector("#start").addEventListener("click", start);
    container.querySelector("#stop").addEventListener("click", stop);
    freq.addEventListener("input", onFreq);
    g.addEventListener("input", onGain);

    this._cleanup = ()=>{
      cancelAnimationFrame(raf); ro.disconnect();
      freq.removeEventListener("input", onFreq); g.removeEventListener("input", onGain);
      container.querySelector("#start").replaceWith(container.querySelector("#start").cloneNode(true));
      container.querySelector("#stop").replaceWith(container.querySelector("#stop").cloneNode(true));
      try{ osc?.stop(); }catch{}
      try{ ac?.close(); }catch{}
      container.innerHTML="";
    };
  },
  teardown(){ this._cleanup?.(); }
};
const effectSvgAnalogClock = {
  id: "svg-analog-clock",
  name: "Analog Clock (SVG)",
  type: "SVG",
  tags: ["svg","typography","interaction"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>SVG hands rotated with transforms.</li>
      <li>Smooth second hand using <code>requestAnimationFrame</code>.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .clk{height:100%;display:grid;place-items:center}
        .dial{filter:drop-shadow(0 6px 20px rgba(0,0,0,.35))}
      </style>
      <div class="clk">
        <svg class="dial" viewBox="0 0 100 100" width="60%" height="60%">
          <circle cx="50" cy="50" r="46" fill="#0f1218" stroke="#21232b" stroke-width="2"/>
          ${Array.from({length:60},(_,i)=>{
            const a=(i/60)*2*Math.PI, r1= i%5===0? 41:44, r2=46;
            const x1=50+Math.sin(a)*r1, y1=50-Math.cos(a)*r1;
            const x2=50+Math.sin(a)*r2, y2=50-Math.cos(a)*r2;
            const w=i%5===0? 1.8:0.6;
            return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2a3243" stroke-width="${w}"/>`;
          }).join("")}
          <g id="h"><rect x="49" y="26" width="2" height="26" rx="1" fill="#e7eaf0"/></g>
          <g id="m"><rect x="49.5" y="18" width="1" height="34" rx="0.5" fill="#aab3c2"/></g>
          <g id="s"><rect x="49.5" y="14" width="1" height="38" rx="0.5" fill="#5b9dff"/></g>
          <circle cx="50" cy="50" r="2" fill="#5b9dff"/>
        </svg>
      </div>`;
    const gH = container.querySelector("#h"),
          gM = container.querySelector("#m"),
          gS = container.querySelector("#s");
    let raf;
    const tick = ()=>{
      const now = new Date();
      const ms = now.getMilliseconds();
      const s  = now.getSeconds() + ms/1000;
      const m  = now.getMinutes() + s/60;
      const h  = (now.getHours()%12) + m/60;

      gS.setAttribute("transform", `rotate(${s*6} 50 50)`);
      gM.setAttribute("transform", `rotate(${m*6} 50 50)`);
      gH.setAttribute("transform", `rotate(${h*30} 50 50)`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    this._cleanup = ()=>{ cancelAnimationFrame(raf); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCanvasMetaballs = {
  id: "canvas-metaballs",
  name: "Metaballs (blur+contrast)",
  type: "JS/Canvas",
  tags: ["canvas","filter","particles"],
  perf: "GPU/CPU medium",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Soft circles drawn to canvas, then CSS <code>filter: blur + contrast</code> for the goo merge.</li>
      <li>Click to add blobs (up to 12).</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .mb{height:100%;position:relative}
        .mb canvas{position:absolute;inset:0;filter:blur(12px) contrast(18) saturate(1.2);}
        .mb .hint{position:absolute;left:10px;bottom:10px;color:#9aa1ad;background:#0f1218;border:1px solid var(--line);
                  border-radius:10px;padding:6px 8px;font-size:12px}
      </style>
      <div class="mb">
        <canvas id="mbc"></canvas>
        <div class="hint">Click to add a blob</div>
      </div>`;
    const c = container.querySelector("#mbc"), ctx = c.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio||1);
    const resize = ()=>{
      const w = container.clientWidth, h = container.clientHeight;
      c.width = Math.floor(w*dpr); c.height = Math.floor(h*dpr);
      c.style.width = w+"px"; c.style.height = h+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    resize(); const ro=new ResizeObserver(resize); ro.observe(container);

    const balls = [];
    const addBall = (x,y)=>{
      if(balls.length>=12) return;
      const r = 20+Math.random()*30;
      balls.push({x,y, vx:(Math.random()-.5)*2, vy:(Math.random()-.5)*2, r});
    };
    // seed a few
    addBall(c.clientWidth*0.3, c.clientHeight*0.4);
    addBall(c.clientWidth*0.6, c.clientHeight*0.6);
    addBall(c.clientWidth*0.5, c.clientHeight*0.3);

    c.addEventListener("click", (e)=>{
      const r=c.getBoundingClientRect();
      addBall(e.clientX-r.left, e.clientY-r.top);
    });

    let raf;
    const step = ()=>{
      ctx.clearRect(0,0,c.clientWidth,c.clientHeight);
      ctx.globalCompositeOperation="lighter";
      for(const b of balls){
        b.x += b.vx; b.y += b.vy;
        if(b.x < b.r || b.x > c.clientWidth-b.r) b.vx*=-1;
        if(b.y < b.r || b.y > c.clientHeight-b.r) b.vy*=-1;

        const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grd.addColorStop(0, "rgba(91,157,255,0.95)");
        grd.addColorStop(1, "rgba(91,157,255,0)");
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    this._cleanup = ()=>{ cancelAnimationFrame(raf); ro.disconnect(); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCss3DCube = {
  id: "css-3d-cube",
  name: "3D Cube (CSS)",
  type: "CSS",
  tags: ["css","3d"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Parent <code>perspective</code> + child <code>transform-style: preserve-3d</code>.</li>
      <li>6 faces positioned with <code>translateZ</code> and axis rotations.</li>
      <li>Auto-rotate animation; pauses on hover.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .cube-wrap{height:100%;display:grid;place-items:center;perspective:900px}
        .cube{position:relative;width:min(200px,60%);aspect-ratio:1/1;transform-style:preserve-3d;
              animation:spin 8s linear infinite}
        .cube:hover{animation-play-state:paused}
        .face{position:absolute;inset:0;display:grid;place-items:center;font-weight:600;color:#e7eaf0;
              border:1px solid var(--line);border-radius:12px;background:#0f1218;backface-visibility:hidden}
        .f1{transform:translateZ(100px)}
        .f2{transform:rotateY(90deg) translateZ(100px)}
        .f3{transform:rotateY(180deg) translateZ(100px)}
        .f4{transform:rotateY(-90deg) translateZ(100px)}
        .f5{transform:rotateX(90deg) translateZ(100px)}
        .f6{transform:rotateX(-90deg) translateZ(100px)}
        @keyframes spin{
          0%{transform:rotateX(0) rotateY(0)}
          50%{transform:rotateX(180deg) rotateY(30deg)}
          100%{transform:rotateX(360deg) rotateY(360deg)}
        }
      </style>
      <div class="cube-wrap">
        <div class="cube">
          <div class="face f1">1</div>
          <div class="face f2">2</div>
          <div class="face f3">3</div>
          <div class="face f4">4</div>
          <div class="face f5">5</div>
          <div class="face f6">6</div>
        </div>
      </div>`;
    this._cleanup = ()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCanvasBouncingBalls = {
  id: "canvas-bouncing-balls",
  name: "Bouncing Balls",
  type: "JS/Canvas",
  tags: ["canvas","physics"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Gravity + wall bounce (restitution, friction).</li>
      <li>Resize-safe canvas; click to add a ball.</li>
    </ul>`,
  async load(){},
  init(container){
    const c = document.createElement("canvas"); container.appendChild(c);
    const ctx = c.getContext("2d"); const dpr = Math.min(2, window.devicePixelRatio||1);
    const resize=()=>{ const w=container.clientWidth,h=container.clientHeight;
      c.width=Math.floor(w*dpr); c.height=Math.floor(h*dpr); c.style.width=w+"px"; c.style.height=h+"px"; ctx.setTransform(dpr,0,0,dpr,0,0); };
    resize(); const ro=new ResizeObserver(resize); ro.observe(container);

    const balls=[]; const R=[10,14,18,22]; const COLORS=["#5b9dff","#34d399","#fbbf24","#f472b6","#60a5fa"];
    function addBall(x,y){
      const r = R[(Math.random()*R.length)|0];
      balls.push({x,y, vx:(Math.random()-.5)*6, vy:(Math.random()-.5)*2, r, col:COLORS[(Math.random()*COLORS.length)|0]});
    }
    // seed
    for(let i=0;i<8;i++) addBall(Math.random()*c.clientWidth, Math.random()*c.clientHeight*0.5);

    c.addEventListener("click",(e)=>{const r=c.getBoundingClientRect(); addBall(e.clientX-r.left, e.clientY-r.top);});

    const grav=0.35, bounce=0.78, fric=0.995; let raf;
    const step=()=>{
      ctx.clearRect(0,0,c.clientWidth,c.clientHeight);
      for(const b of balls){
        b.vy += grav;
        b.x += b.vx; b.y += b.vy;
        // walls
        if(b.x < b.r){ b.x=b.r; b.vx*=-bounce; }
        if(b.x > c.clientWidth-b.r){ b.x=c.clientWidth-b.r; b.vx*=-bounce; }
        if(b.y < b.r){ b.y=b.r; b.vy*=-bounce; }
        if(b.y > c.clientHeight-b.r){ b.y=c.clientHeight-b.r; b.vy*=-bounce; b.vx*=0.98; }
        b.vx*=fric; b.vy*=fric;
        // draw
        const g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);
        g.addColorStop(0,"rgba(231,234,240,.95)"); g.addColorStop(1,b.col+"00");
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle="#1c2332"; ctx.lineWidth=1; ctx.stroke();
      }
      raf=requestAnimationFrame(step);
    };
    raf=requestAnimationFrame(step);

    this._cleanup=()=>{ cancelAnimationFrame(raf); ro.disconnect(); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectSvgMiniLineChart = {
  id: "svg-mini-line-chart",
  name: "Mini Line Chart (Tooltip)",
  type: "SVG",
  tags: ["svg","interaction","typography"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Build an SVG path from data.</li>
      <li>Pointer tracking + nearest point tooltip.</li>
    </ul>`,
  async load(){},
  init(container){
    // random data
    const N=24, data=Array.from({length:N},(_,i)=>({x:i, y: 40 + Math.sin(i/3)*20 + Math.random()*12}));
    const W=600,H=240, pad=24, xMax=N-1, yMin=Math.min(...data.map(d=>d.y))-5, yMax=Math.max(...data.map(d=>d.y))+5;
    const sx = x => pad + (x/xMax)*(W-2*pad);
    const sy = y => H-pad - ((y - yMin)/(yMax - yMin))*(H-2*pad);
    const d = data.map((p,i)=> (i? "L":"M")+sx(p.x)+","+sy(p.y)).join(" ");

    container.innerHTML = `
      <style>
        .lc{height:100%;display:grid;place-items:center}
        .lc .card{width:92%;max-width:720px;border:1px solid var(--line);border-radius:12px;background:#0f1218;padding:12px}
        .axis{stroke:#2a3243;stroke-width:1}
        .line{fill:none;stroke:#5b9dff;stroke-width:2}
        .pt{fill:#e7eaf0;stroke:#1a2233;stroke-width:.8}
        .tip{pointer-events:none}
        .tip rect{fill:#0b0d12;stroke:#21232b;rx:6}
        .tip text{font-size:12px;fill:#e7eaf0}
      </style>
      <div class="lc">
        <div class="card">
          <svg viewBox="0 0 ${W} ${H}" width="100%" height="260">
            <g>
              <line class="axis" x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}"/>
              <line class="axis" x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}"/>
              <path d="${d}" class="line"/>
              ${data.map(p=>`<circle class="pt" cx="${sx(p.x)}" cy="${sy(p.y)}" r="2.5"></circle>`).join("")}
              <rect id="hit" x="${pad}" y="${pad}" width="${W-2*pad}" height="${H-2*pad}" fill="transparent"/>
              <g id="tip" class="tip" opacity="0">
                <line id="vl" x1="0" x2="0" y1="${pad}" y2="${H-pad}" stroke="#2a3243" stroke-dasharray="4 4"/>
                <circle id="tp" r="4" fill="#5b9dff" stroke="#1a2233"/>
                <g id="tb">
                  <rect id="tbbox" x="0" y="0" width="80" height="24"></rect>
                  <text id="tbtext" x="6" y="16">0, 0</text>
                </g>
              </g>
            </g>
          </svg>
        </div>
      </div>`;

    const svg = container.querySelector("svg");
    const hit = container.querySelector("#hit");
    const tip = container.querySelector("#tip");
    const vl = container.querySelector("#vl");
    const tp = container.querySelector("#tp");
    const tb = container.querySelector("#tb");
    const tbbox = container.querySelector("#tbbox");
    const tbtext = container.querySelector("#tbtext");

    const onMove = (e)=>{
      const r = svg.getBoundingClientRect();
      const x = Math.max(pad, Math.min(W-pad, e.clientX - r.left));
      const t = (x - pad) / (W - 2*pad) * xMax;
      const idx = Math.max(0, Math.min(N-1, Math.round(t)));
      const p = data[idx];
      const px = sx(p.x), py = sy(p.y);
      tip.setAttribute("opacity","1");
      vl.setAttribute("x1", px); vl.setAttribute("x2", px);
      tp.setAttribute("cx", px); tp.setAttribute("cy", py);
      const label = `x ${idx} • y ${p.y.toFixed(1)}`;
      tbtext.textContent = label;
      // size + position bubble
      const tw = Math.max(60, label.length*6.5);
      tbbox.setAttribute("width", tw);
      const bx = Math.min(W - pad - tw, Math.max(pad, px + 8));
      const by = Math.max(pad, py - 30);
      tb.setAttribute("transform", `translate(${bx},${by})`);
    };
    const onLeave = ()=> tip.setAttribute("opacity","0");

    hit.addEventListener("pointermove", onMove);
    hit.addEventListener("pointerleave", onLeave);

    this._cleanup = ()=>{ hit.removeEventListener("pointermove", onMove); hit.removeEventListener("pointerleave", onLeave); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectClipboardToast = {
  id: "js-clipboard-toast",
  name: "Copy to Clipboard (Toast)",
  type: "JS",
  tags: ["forms","interaction","a11y"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li><code>navigator.clipboard.writeText</code> with success/fail states.</li>
      <li>Small toast using CSS transitions.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .clip-wrap{height:100%;display:grid;place-items:center}
        .card{width:min(560px,92%);border:1px solid var(--line);border-radius:12px;background:#0f1218;padding:16px;color:#cfd5df;display:grid;gap:10px}
        .row{display:grid;grid-template-columns:1fr auto;gap:8px}
        .toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%) translateY(20px);
               padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:#0b0d12;color:#e7eaf0;
               opacity:0; transition:opacity .2s ease, transform .2s ease; pointer-events:none}
        .toast.show{opacity:1; transform:translateX(-50%) translateY(0)}
      </style>
      <div class="clip-wrap">
        <div class="card">
          <label for="txt">Text to copy</label>
          <div class="row">
            <input id="txt" value="Effects Lab — tiny pasteable demos" style="padding:12px;border-radius:10px;border:1px solid var(--line);background:#0c1016;color:#e7eaf0"/>
            <button class="btn" id="copy">Copy</button>
          </div>
          <p class="hint" style="color:#9aa1ad;margin:0">Tip: Try pasting after clicking "Copy".</p>
        </div>
      </div>
      <div class="toast" id="toast" role="status" aria-live="polite">Copied!</div>`;
    const input = container.querySelector("#txt");
    const btn = container.querySelector("#copy");
    const toast = container.querySelector("#toast");
    let t;

    const showToast = (msg="Copied!")=>{
      toast.textContent = msg;
      toast.classList.add("show");
      clearTimeout(t);
      t = setTimeout(()=> toast.classList.remove("show"), 1200);
    };

    const onCopy = async ()=>{
      try{
        await navigator.clipboard.writeText(input.value);
        showToast("Copied!");
      }catch(e){
        // fallback: select + execCommand (older browsers)
        input.select(); document.execCommand?.("copy");
        showToast("Copied (fallback)");
      }
    };

    btn.addEventListener("click", onCopy);
    this._cleanup = ()=>{ clearTimeout(t); btn.removeEventListener("click", onCopy); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCssMasonryColumns = {
  id: "css-masonry-columns",
  name: "Masonry Gallery (CSS columns)",
  type: "CSS",
  tags: ["css","layout","media"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Masonry-like layout using <code>columns</code> + <code>break-inside: avoid</code>.</li>
      <li>No JS layout logic.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .msn{height:100%;overflow:auto;padding:12px}
        .cols{columns: 3 220px; column-gap:12px}
        .tile{display:block; break-inside:avoid; margin:0 0 12px 0;
              border:1px solid var(--line); border-radius:12px; overflow:hidden; background:#0f1218}
        .tile img{display:block; width:100%; height:auto}
      </style>
      <div class="msn">
        <div class="cols">
          ${Array.from({length:12},(_,i)=>`<a class="tile" href="#" tabindex="0"><img src="https://picsum.photos/seed/m${i}/600/${260+((i*37)%220)}" alt="Random ${i+1}"></a>`).join("")}
        </div>
      </div>`;
    this._cleanup = ()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectDragSortList = {
  id: "js-drag-sort-list",
  name: "Drag-Sort List",
  type: "JS",
  tags: ["interaction","forms","nav"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Native HTML5 drag &amp; drop (<code>draggable</code>).</li>
      <li>Reorders items by inserting before/after nearest sibling.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .dl-wrap{height:100%;display:grid;place-items:center;padding:12px}
        .dl{width:min(520px,92%); border:1px solid var(--line); border-radius:12px; background:#0f1218; padding:10px}
        .item{user-select:none; background:#10131a; color:#e7eaf0; padding:12px; border:1px solid var(--line);
              border-radius:10px; margin:8px 0; display:flex; align-items:center; gap:10px}
        .handle{font-weight:700; opacity:.6; cursor:grab}
        .dragging{opacity:.6; border-style:dashed}
      </style>
      <div class="dl-wrap">
        <div class="dl" id="list">
          ${["Alpha","Bravo","Charlie","Delta","Echo","Foxtrot"].map(t=>`
            <div class="item" draggable="true"><span class="handle">⋮⋮</span>${t}</div>`).join("")}
        </div>
      </div>`;
    const list = container.querySelector("#list");
    const items = ()=>[...list.querySelectorAll(".item")];

    const getAfter = (y)=>{
      const els = items().filter(el=>!el.classList.contains("dragging"));
      let closest = null, closestOffset = Number.NEGATIVE_INFINITY;
      for(const el of els){
        const box = el.getBoundingClientRect();
        const offset = y - box.top - box.height/2;
        if(offset < 0 && offset > closestOffset){ closestOffset = offset; closest = el; }
      }
      return closest;
    };

    list.addEventListener("dragstart", e=>{
      if(!e.target.classList.contains("item")) return;
      e.dataTransfer.effectAllowed = "move";
      e.target.classList.add("dragging");
    });
    list.addEventListener("dragend", e=>{
      e.target.classList.remove("dragging");
    });
    list.addEventListener("dragover", e=>{
      e.preventDefault();
      const after = getAfter(e.clientY);
      const dragging = list.querySelector(".dragging");
      if(!dragging) return;
      after ? list.insertBefore(dragging, after) : list.appendChild(dragging);
    });

    this._cleanup = ()=>{ container.innerHTML = ""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectLazyImages = {
  id: "js-lazy-images",
  name: "Lazy-Load Images",
  type: "JS",
  tags: ["media","scroll","a11y"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li><code>IntersectionObserver</code> swaps <code>data-src</code> → <code>src</code> when visible.</li>
      <li>Simple skeleton shimmer until load.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .lz-root{height:100%;overflow:auto;padding:12px;display:grid;gap:12px}
        .lz-card{border:1px solid var(--line);border-radius:12px;background:#0f1218;padding:8px}
        .ph{position:relative;height:180px;border-radius:10px;background:#141923; overflow:hidden}
        .ph::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent);
                   transform:translateX(-100%); animation:sh 1.2s linear infinite}
        @keyframes sh { to { transform:translateX(100%); } }
        .ph img{opacity:0; width:100%; height:100%; object-fit:cover; transition:opacity .35s ease}
        .ph.loaded::after{display:none}
        .ph.loaded img{opacity:1}
      </style>
      <div class="lz-root" id="root">
        ${Array.from({length:12},(_,i)=>`
          <div class="lz-card">
            <div class="ph"><img data-src="https://picsum.photos/seed/lz${i}/800/500" alt="Lazy ${i+1}" /></div>
          </div>`).join("")}
      </div>`;
    const root = container.querySelector("#root");
    const targets = [...container.querySelectorAll("img[data-src]")];
    const io = new IntersectionObserver((entries)=>{
      for(const e of entries){
        if(!e.isIntersecting) continue;
        const img = e.target;
        img.src = img.dataset.src;
        img.addEventListener("load", ()=>{
          img.parentElement.classList.add("loaded");
          img.removeAttribute("data-src");
        }, {once:true});
        io.unobserve(img);
      }
    }, {root, threshold:0.1});
    targets.forEach(t=>io.observe(t));

    this._cleanup = ()=>{ io.disconnect(); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCursorTrail = {
  id: "canvas-cursor-trail",
  name: "Cursor Trail (soft particles)",
  type: "JS/Canvas",
  tags: ["canvas","interaction","particles"],
  perf: "GPU/CPU light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Pointer-driven particle emission.</li>
      <li>Fade + shrink until particles die.</li>
    </ul>`,
  async load(){},
  init(container){
    const c = document.createElement("canvas"); container.appendChild(c);
    const ctx = c.getContext("2d"); const dpr = Math.min(2, window.devicePixelRatio||1);
    const resize=()=>{ const w=container.clientWidth,h=container.clientHeight;
      c.width=Math.floor(w*dpr); c.height=Math.floor(h*dpr); c.style.width=w+"px"; c.style.height=h+"px"; ctx.setTransform(dpr,0,0,dpr,0,0); };
    resize(); const ro=new ResizeObserver(resize); ro.observe(container);

    const P=[]; let raf, mouse=null;
    const emit = (x,y)=>{ for(let i=0;i<6;i++){ P.push({x,y, vx:(Math.random()-.5)*1.2, vy:(Math.random()-.5)*1.2, r:6+Math.random()*6, a:1}); } };
    const onMove = (e)=>{ const r=c.getBoundingClientRect(); mouse={x:e.clientX-r.left, y:e.clientY-r.top}; emit(mouse.x, mouse.y); };
    const onLeave = ()=>{ mouse=null; };

    c.addEventListener("pointermove", onMove);
    c.addEventListener("pointerleave", onLeave);

    const step=()=>{
      ctx.clearRect(0,0,c.clientWidth,c.clientHeight);
      for(let i=P.length-1;i>=0;i--){
        const p=P[i];
        p.x+=p.vx; p.y+=p.vy; p.r*=0.985; p.a*=0.96;
        if(p.a<0.03 || p.r<0.6){ P.splice(i,1); continue; }
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);
        g.addColorStop(0, `rgba(91,157,255,${p.a})`);
        g.addColorStop(1, `rgba(91,157,255,0)`);
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      }
      raf=requestAnimationFrame(step);
    };
    raf=requestAnimationFrame(step);

    this._cleanup = ()=>{ cancelAnimationFrame(raf); ro.disconnect(); c.removeEventListener("pointermove", onMove); c.removeEventListener("pointerleave", onLeave); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCssConicPie = {
  id: "css-conic-pie",
  name: "Conic Pie Chart (sliders)",
  type: "JS+CSS",
  tags: ["css","typography","interaction"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Pie via <code>conic-gradient</code> using CSS variables.</li>
      <li>Two sliders set A &amp; B; C = 100 − A − B (clamped).</li>
      <li>Legend updates live.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .pie-wrap{height:100%;display:grid;grid-template-columns:min(360px,40%) 1fr;gap:14px;align-items:center}
        .panel{border:1px solid var(--line);border-radius:12px;background:#0f1218;padding:14px;color:#cfd5df}
        .row{display:grid;grid-template-columns:70px 1fr auto;gap:10px;align-items:center}
        .stage{display:grid;place-items:center;height:100%}
        .pie{
          --a:40; --b:30; --c:30;
          width:min(300px,70%); aspect-ratio:1/1; border-radius:50%;
          border:1px solid var(--line);
          background:
            conic-gradient(#5b9dff 0 calc(var(--a)*1%),
                           #34d399 calc(var(--a)*1%) calc((var(--a)+var(--b))*1%),
                           #fbbf24 calc((var(--a)+var(--b))*1%) 100%);
          box-shadow:0 10px 30px rgba(0,0,0,.25);
        }
        .legend{display:grid;gap:6px;margin-top:10px}
        .dot{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:middle}
      </style>
      <div class="pie-wrap">
        <div class="panel">
          <div class="row"><span>A</span><input id="ra" type="range" min="0" max="100" value="40"><output id="oa">40%</output></div>
          <div class="row"><span>B</span><input id="rb" type="range" min="0" max="100" value="30"><output id="ob">30%</output></div>
          <div class="legend">
            <div><span class="dot" style="background:#5b9dff"></span>A: <span id="la">40%</span></div>
            <div><span class="dot" style="background:#34d399"></span>B: <span id="lb">30%</span></div>
            <div><span class="dot" style="background:#fbbf24"></span>C: <span id="lc">30%</span></div>
          </div>
        </div>
        <div class="stage"><div class="pie" id="pie"></div></div>
      </div>`;
    const $ = s=>container.querySelector(s);
    const pie=$("#pie"), ra=$("#ra"), rb=$("#rb"), oa=$("#oa"), ob=$("#ob"), la=$("#la"), lb=$("#lb"), lc=$("#lc");
    const update=()=>{
      let A=+ra.value, B=+rb.value;
      if (A+B>100) { const over=A+B-100; if (B>=over) B-=over; else { A=Math.max(0,A-(over-B)); B=0; } ra.value=A; rb.value=B; }
      const C = Math.max(0, 100 - A - B);
      pie.style.setProperty("--a", A); pie.style.setProperty("--b", B); pie.style.setProperty("--c", C);
      oa.value=A+"%"; ob.value=B+"%"; la.textContent=oa.value; lb.textContent=ob.value; lc.textContent=C+"%";
    };
    ra.addEventListener("input", update); rb.addEventListener("input", update); update();
    this._cleanup=()=>{ ra.replaceWith(ra.cloneNode(true)); rb.replaceWith(rb.cloneNode(true)); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCanvasFireworks = {
  id: "canvas-fireworks",
  name: "Fireworks (click)",
  type: "JS/Canvas",
  tags: ["canvas","particles","interaction"],
  perf: "GPU/CPU medium",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Launch → burst → fade arcs with gravity.</li>
      <li>Click to launch at pointer; multiple concurrent shells.</li>
    </ul>`,
  async load(){},
  init(container){
    const c=document.createElement("canvas"); container.appendChild(c);
    const ctx=c.getContext("2d"); const dpr=Math.min(2,window.devicePixelRatio||1);
    const resize=()=>{ const w=container.clientWidth,h=container.clientHeight;
      c.width=Math.floor(w*dpr); c.height=Math.floor(h*dpr); c.style.width=w+"px"; c.style.height=h+"px"; ctx.setTransform(dpr,0,0,dpr,0,0); };
    resize(); const ro=new ResizeObserver(resize); ro.observe(container);

    const shells=[], sparks=[]; const colors=["#5b9dff","#34d399","#fbbf24","#f472b6","#60a5fa"];
    const launch=(x,y)=>{ shells.push({x, y:c.clientHeight, vx:(Math.random()-.5)*1.2, vy:-(6+Math.random()*3), col:colors[(Math.random()*colors.length)|0]}); };
    c.addEventListener("click",(e)=>{ const r=c.getBoundingClientRect(); launch(e.clientX-r.left,e.clientY-r.top); });

    let raf;
    const step=()=>{
      ctx.fillStyle="rgba(11,12,15,0.25)"; ctx.fillRect(0,0,c.clientWidth,c.clientHeight);
      // shells
      for(let i=shells.length-1;i>=0;i--){
        const s=shells[i]; s.x+=s.vx; s.y+=s.vy; s.vy+=0.08;
        ctx.beginPath(); ctx.arc(s.x,s.y,2,0,Math.PI*2); ctx.fillStyle=s.col; ctx.fill();
        if(s.vy> -0.5){ // burst
          const N=60+((Math.random()*40)|0);
          for(let k=0;k<N;k++){
            const a=Math.random()*Math.PI*2, sp=1.8+Math.random()*3.2;
            sparks.push({x:s.x,y:s.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:90+((Math.random()*40)|0),col:s.col});
          }
          shells.splice(i,1);
        }
      }
      // sparks
      for(let i=sparks.length-1;i>=0;i--){
        const p=sparks[i];
        p.vx*=0.99; p.vy=(p.vy+0.04)*0.99; p.x+=p.vx; p.y+=p.vy; p.life--;
        if(p.life<=0){ sparks.splice(i,1); continue; }
        const a=Math.max(0,Math.min(1,p.life/110));
        ctx.beginPath(); ctx.arc(p.x,p.y,1.8,0,Math.PI*2); ctx.fillStyle=`rgba(255,255,255,${a})`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.strokeStyle=p.col+"90"; ctx.lineWidth=0.6; ctx.stroke();
      }
      raf=requestAnimationFrame(step);
    };
    raf=requestAnimationFrame(step);

    // seed one
    launch(c.clientWidth*0.5, c.clientHeight*0.35);

    this._cleanup=()=>{ cancelAnimationFrame(raf); ro.disconnect(); c.replaceWith(c.cloneNode(true)); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCssGlassFrosted = {
  id: "css-glass-frosted",
  name: "Glass Frosted Panel",
  type: "CSS",
  tags: ["css","filter","layout"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Backdrop blur/saturate (“glassmorphism”).</li>
      <li>Animated background blobs for parallax-y depth.</li>
      <li>Graceful fallback if <code>backdrop-filter</code> unsupported.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .glass-root{position:relative;height:100%;border-radius:12px;overflow:hidden}
        .bg{position:absolute;inset:0; background:
          radial-gradient(40% 60% at 20% 30%, #5b9dff33, transparent 60%),
          radial-gradient(50% 40% at 80% 70%, #34d39933, transparent 60%),
          radial-gradient(30% 30% at 50% 50%, #f472b633, transparent 60%);
          animation:move 14s ease-in-out infinite alternate;}
        @keyframes move{
          0%{transform:translate(0,0) scale(1)}
          100%{transform:translate(-20px,10px) scale(1.05)}
        }
        .panel{
          position:absolute; inset:20% 20%; display:grid; place-items:center;
          border:1px solid #ffffff22; border-radius:18px; padding:18px;
          background:rgba(16,19,26,.35);
          -webkit-backdrop-filter: blur(12px) saturate(1.2);
                  backdrop-filter: blur(12px) saturate(1.2);
          color:#e7eaf0; text-align:center;
        }
        @supports not ((backdrop-filter: blur(10px)) or (-webkit-backdrop-filter: blur(10px))){
          .panel{ background:rgba(16,19,26,.8); }
        }
      </style>
      <div class="glass-root">
        <div class="bg"></div>
        <div class="panel"><div>
          <h3 style="margin:0 0 6px 0">Frosted Glass</h3>
          <p style="color:#cfd5df;margin:0">Backdrop blur + subtle animated blobs.</p>
        </div></div>
      </div>`;
    this._cleanup=()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectJsCountUp = {
  id: "js-countup-stats",
  name: "Count-Up Stats (on reveal)",
  type: "JS",
  tags: ["typography","scroll","a11y"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Number counters that animate once when visible.</li>
      <li><code>IntersectionObserver</code> + easing function.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .cu-root{height:100%;overflow:auto;padding:16px}
        .stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .stat{border:1px solid var(--line);border-radius:12px;background:#0f1218;padding:16px;color:#cfd5df;text-align:center}
        .n{font-size:34px;color:#e7eaf0}
        @media (max-width:560px){ .stats{grid-template-columns:1fr} }
      </style>
      <div class="cu-root" id="root">
        <div class="stats">
          <div class="stat"><div class="n" data-to="1280">0</div><div>Users</div></div>
          <div class="stat"><div class="n" data-to="98">0</div><div>Projects</div></div>
          <div class="stat"><div class="n" data-to="4.8" data-decimals="1">0</div><div>Rating</div></div>
          <div class="stat"><div class="n" data-to="120000" data-format="true">0</div><div>Revenue (€)</div></div>
        </div>
        ${Array.from({length:8},(_,i)=>`<div style="height:120px"></div>`).join("")}
      </div>`;
    const root = container.querySelector("#root");
    const els = [...container.querySelectorAll(".n")];
    const ease = t => 1 - Math.pow(1 - t, 3);
    const animate = (el)=>{
      const target = parseFloat(el.dataset.to||"0");
      const decimals = +el.dataset.decimals||0;
      const format = el.dataset.format === "true";
      let start=null, dur=1200;
      const step=(ts)=>{
        if(!start) start=ts;
        const p = Math.min(1, (ts-start)/dur);
        const v = ease(p)*target;
        const num = decimals ? v.toFixed(decimals) : Math.round(v);
        el.textContent = format ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : num;
        if(p<1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries)=>{
      for(const e of entries){
        if(e.isIntersecting){
          const el = e.target.querySelector(".n");
          if(el && !el.dataset.done){ el.dataset.done="1"; animate(el); }
        }
      }
    }, {root, threshold:0.6});
    for(const stat of container.querySelectorAll(".stat")) io.observe(stat);

    this._cleanup=()=>{ io.disconnect(); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectSplitResizer = {
  id: "layout-split-resizer",
  name: "Split View Resizer",
  type: "JS+CSS",
  tags: ["layout","interaction","a11y"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Resizable two-pane layout with a draggable gutter.</li>
      <li>Clamped to 20%–80%. Arrow keys on the handle also work.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .split{height:100%;display:grid;grid-template-columns:var(--left,50%) 8px 1fr;gap:0}
        .pane{padding:12px;border:1px solid var(--line);background:#0f1218;color:#cfd5df}
        .gut{background:#121824;border:1px solid var(--line);cursor:col-resize;display:grid;place-items:center}
        .gut:focus-visible{outline:2px solid #5b9dff;outline-offset:2px}
        .hint{font-size:12px;color:#9aa1ad}
      </style>
      <div class="split" id="split">
        <section class="pane"><h4 style="margin:0 0 6px 0;color:#e7eaf0">Left</h4>
          <p class="hint">Drag the handle or use ←/→ when focused.</p>
        </section>
        <div class="gut" id="gut" role="separator" aria-orientation="vertical" tabindex="0" aria-valuemin="20" aria-valuemax="80" aria-valuenow="50">⋮⋮</div>
        <section class="pane"><h4 style="margin:0 0 6px 0;color:#e7eaf0">Right</h4>
          <p class="hint">Grid columns track a CSS variable.</p>
        </section>
      </div>`;
    const root = container.querySelector("#split");
    const gut = container.querySelector("#gut");
    let dragging=false;

    const setPct = (pct)=>{
      const v = Math.max(20, Math.min(80, pct));
      root.style.setProperty("--left", v+"%");
      gut.setAttribute("aria-valuenow", String(Math.round(v)));
    };
    const toPct = (clientX)=>{
      const r = root.getBoundingClientRect();
      return ((clientX - r.left)/r.width)*100;
    };

    const onDown = e=>{ dragging=true; setPct(toPct(e.clientX)); };
    const onMove = e=>{ if(!dragging) return; setPct(toPct(e.clientX)); };
    const onUp   = ()=>{ dragging=false; };

    gut.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    const onKey = e=>{
      if(e.key==="ArrowLeft"){ setPct(parseFloat(getComputedStyle(root).getPropertyValue("--left")) - 2); }
      if(e.key==="ArrowRight"){ setPct(parseFloat(getComputedStyle(root).getPropertyValue("--left")) + 2); }
    };
    gut.addEventListener("keydown", onKey);
    setPct(50);

    this._cleanup = ()=>{
      gut.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      gut.removeEventListener("keydown", onKey);
      container.innerHTML="";
    };
  },
  teardown(){ this._cleanup?.(); }
};
const effectClipRevealGrid = {
  id: "css-clip-reveal-grid",
  name: "Clip-Path Hover Grid",
  type: "CSS",
  tags: ["css","media","interaction"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Image captions revealed with a <code>clip-path</code> polygon.</li>
      <li>Pure CSS hover/focus; no JS.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .cr{height:100%;overflow:auto;padding:12px}
        .crg{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
        .tile{position:relative;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#0f1218}
        .tile img{display:block;width:100%;height:160px;object-fit:cover}
        .cap{position:absolute;inset:auto 0 0 0;background:rgba(11,13,18,.85);color:#e7eaf0;padding:10px 12px;line-height:1.3;
             clip-path:polygon(0 100%,100% 100%,100% 70%,0 100%);transition:clip-path .35s ease}
        .tile:focus-within .cap, .tile:hover .cap{
          clip-path:polygon(0 0,100% 0,100% 100%,0 100%);
        }
        .tile a{position:absolute;inset:0;outline:none}
        .tile a:focus-visible{outline:2px solid #5b9dff;outline-offset:-4px}
      </style>
      <div class="cr"><div class="crg">
        ${Array.from({length:8},(_,i)=>`
          <figure class="tile">
            <img src="https://picsum.photos/seed/clip${i}/600/400" alt="Photo ${i+1}">
            <figcaption class="cap">Caption ${i+1} — clip-path diagonal reveal</figcaption>
            <a href="#" aria-label="Open item ${i+1}"></a>
          </figure>`).join("")}
      </div></div>`;
    this._cleanup = ()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectWASDMove = {
  id: "js-wasd-move",
  name: "WASD Move (Keyboard)",
  type: "JS",
  tags: ["interaction","physics","a11y"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Keyboard state (keydown/keyup) + rAF loop.</li>
      <li>Movement with acceleration &amp; damping; bounded stage.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .stage{position:relative;height:100%;border:1px solid var(--line);border-radius:12px;background:#0b0d12;overflow:hidden}
        .player{position:absolute;width:28px;height:28px;border-radius:8px;background:#5b9dff;box-shadow:0 6px 18px rgba(91,157,255,.35)}
        .kbd{position:absolute;left:10px;bottom:10px;color:#9aa1ad;background:#0f1218;border:1px solid var(--line);border-radius:10px;padding:6px 8px;font-size:12px}
      </style>
      <div class="stage" id="st"><div class="player" id="p"></div><div class="kbd">WASD / Arrow keys</div></div>`;
    const st = container.querySelector("#st");
    const p = container.querySelector("#p");
    let x=60, y=60, vx=0, vy=0;
    const accel=0.5, damp=0.90, max=7;
    const keys = new Set();
    const onKeyDown = e=>{
      const k=e.key.toLowerCase();
      if(["w","a","s","d","arrowup","arrowleft","arrowdown","arrowright"].includes(k)) keys.add(k);
    };
    const onKeyUp = e=>{
      const k=e.key.toLowerCase();
      keys.delete(k);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let raf;
    const step=()=>{
      if(keys.has("w")||keys.has("arrowup")) vy-=accel;
      if(keys.has("s")||keys.has("arrowdown")) vy+=accel;
      if(keys.has("a")||keys.has("arrowleft")) vx-=accel;
      if(keys.has("d")||keys.has("arrowright")) vx+=accel;
      vx*=damp; vy*=damp;
      vx=Math.max(-max,Math.min(max,vx)); vy=Math.max(-max,Math.min(max,vy));
      x+=vx; y+=vy;
      // bounds
      const r=14, W=st.clientWidth, H=st.clientHeight;
      if(x<r){x=r; vx*=-0.4} if(x>W-r){x=W-r; vx*=-0.4}
      if(y<r){y=r; vy*=-0.4} if(y>H-r){y=H-r; vy*=-0.4}
      p.style.transform=`translate(${(x-r).toFixed(1)}px, ${(y-r).toFixed(1)}px)`;
      raf=requestAnimationFrame(step);
    };
    raf=requestAnimationFrame(step);

    this._cleanup=()=>{
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      container.innerHTML="";
    };
  },
  teardown(){ this._cleanup?.(); }
};
const effectWebglPlasma = {
  id: "webgl-plasma",
  name: "WebGL Plasma (Shader)",
  type: "WebGL",
  tags: ["webgl","shader","media"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Minimal WebGL: full-screen triangle + fragment shader.</li>
      <li>Uniforms: resolution &amp; time; DPR-aware resize.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>.glwrap{height:100%;position:relative}.glcanvas{width:100%;height:100%;display:block;border-radius:12px;border:1px solid var(--line);background:#000}
      .glerr{position:absolute;inset:0;display:grid;place-items:center;color:#e7eaf0}</style>
      <div class="glwrap"><canvas class="glcanvas" id="gl"></canvas><div class="glerr" id="glerr" hidden>WebGL not supported</div></div>`;
    const canvas = container.querySelector("#gl");
    const err = container.querySelector("#glerr");
    const gl = canvas.getContext("webgl");
    if(!gl){ err.hidden=false; this._cleanup=()=>{container.innerHTML=""}; return; }

    const vsrc = `
      attribute vec2 a_pos;
      void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
    `;
    const fsrc = `
      precision mediump float;
      uniform vec2 u_res;
      uniform float u_time;
      // cosine palette by iq
      vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a + b*cos(6.28318*(c*t + d)); }
      void main(){
        vec2 uv = gl_FragCoord.xy / u_res.xy;
        uv = uv*2.0 - 1.0;
        uv.x *= u_res.x/u_res.y; // keep aspect
        float t = u_time*0.25;
        float v = 0.0;
        v += sin(uv.x*3.0 + t*1.3);
        v += sin(uv.y*3.0 - t*1.7);
        v += sin((uv.x+uv.y)*2.5 + t*1.1);
        v += sin(length(uv)*3.5 - t*1.9);
        v = v/4.0;
        vec3 col = pal(v, vec3(0.5), vec3(0.5), vec3(1.0,0.7,0.4), vec3(0.0,0.15,0.2));
        gl_FragColor = vec4(col, 1.0);
      }
    `;
    const compile = (type, src)=>{
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ console.error(gl.getShaderInfoLog(s)); }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, vsrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){ console.error(gl.getProgramInfoLog(prog)); }
    gl.useProgram(prog);

    // full-screen triangle
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");

    const dpr = Math.min(2, window.devicePixelRatio||1);
    const ro = new ResizeObserver(()=>resize()); ro.observe(container);
    function resize(){
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      canvas.width = Math.floor(w*dpr);
      canvas.height = Math.floor(h*dpr);
      canvas.style.width = w+"px";
      canvas.style.height = h+"px";
      gl.viewport(0,0,canvas.width, canvas.height);
    }
    resize();

    let raf, start = performance.now();
    const draw = ()=>{
      const t = (performance.now() - start)/1000;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    this._cleanup = ()=>{
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteBuffer(buf); gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs);
      container.innerHTML="";
    };
  },
  teardown(){ this._cleanup?.(); }
};
const effectA11yContrast = {
  id: "a11y-contrast-checker",
  name: "Color Contrast Checker (WCAG)",
  type: "JS+CSS",
  tags: ["a11y","forms","typography"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Computes contrast ratio per WCAG (relative luminance).</li>
      <li>Live verdicts for AA/AAA (normal &amp; large text).</li>
      <li>Preview blocks update in real time.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .cc{height:100%;display:grid;grid-template-columns:min(360px,40%) 1fr;gap:12px}
        .cc .panel{border:1px solid var(--line);border-radius:12px;background:#0f1218;padding:12px;color:#cfd5df;display:grid;gap:10px}
        .cc .row{display:grid;grid-template-columns:80px 1fr auto;gap:8px;align-items:center}
        .cc input[type="text"]{padding:10px;border-radius:8px;border:1px solid var(--line);background:#0c1016;color:#e7eaf0}
        .cc input[type="color"]{width:44px;height:32px;border:none;background:transparent}
        .cc .stage{border:1px solid var(--line);border-radius:12px;background:#0b0d12;display:grid;grid-template-rows:auto 1fr;gap:10px;padding:12px}
        .cc .swatch{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .cc .box{border:1px solid var(--line);border-radius:10px;padding:12px}
        .cc .big{font-size:28px}
        .cc .ratio{font-size:18px;color:#e7eaf0}
        .cc .badges{display:flex;gap:8px;flex-wrap:wrap}
        .cc .pass{border:1px solid #245d3f;background:#11261d;padding:4px 8px;border-radius:8px;color:#7fe2b1}
        .cc .fail{border:1px solid #5d2424;background:#261111;padding:4px 8px;border-radius:8px;color:#ffb3b3}
      </style>
      <div class="cc">
        <div class="panel">
          <div class="row">
            <label>Foreground</label>
            <input id="fgTxt" type="text" value="#e7eaf0" />
            <input id="fgPick" type="color" value="#e7eaf0" />
          </div>
          <div class="row">
            <label>Background</label>
            <input id="bgTxt" type="text" value="#0b0d12" />
            <input id="bgPick" type="color" value="#0b0d12" />
          </div>
          <div><span class="ratio" id="ratio">–</span></div>
          <div class="badges" id="verdicts"></div>
        </div>
        <div class="stage">
          <div class="swatch">
            <div class="box" id="normal">Normal text sample — lorem ipsum dolor sit amet.</div>
            <div class="box big" id="large">Large text sample — Display</div>
          </div>
          <div class="box" id="code">
            <code>ratio = (L1 + 0.05) / (L2 + 0.05)</code>
          </div>
        </div>
      </div>`;
    const $ = s => container.querySelector(s);
    const fgTxt=$("#fgTxt"), bgTxt=$("#bgTxt"), fgPick=$("#fgPick"), bgPick=$("#bgPick");
    const normal=$("#normal"), large=$("#large"), ratioEl=$("#ratio"), verdicts=$("#verdicts");

    const hex = s => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : null;
    const parse = h=>{
      h=h.replace("#",""); if(h.length===3) h=[...h].map(c=>c+c).join("");
      const n=parseInt(h,16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
    };
    const srgb2lin = v=>{ v/=255; return v<=0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
    const luminance = ({r,g,b})=> 0.2126*srgb2lin(r)+0.7152*srgb2lin(g)+0.0722*srgb2lin(b);
    const fmt = n => (Math.round(n*100)/100).toFixed(2);

    const classify = ratio => ({
      AA_normal: ratio >= 4.5, AAA_normal: ratio >= 7,
      AA_large:  ratio >= 3,   AAA_large:  ratio >= 4.5
    });

    const update = ()=>{
      const f = hex(fgTxt.value.trim()) || fgPick.value;
      const b = hex(bgTxt.value.trim()) || bgPick.value;
      fgTxt.value=f; fgPick.value=f; bgTxt.value=b; bgPick.value=b;
      normal.style.color=f; normal.style.background=b;
      large.style.color=f;  large.style.background=b;
      const Lf=luminance(parse(f)), Lb=luminance(parse(b));
      const ratio = (Math.max(Lf,Lb)+0.05)/(Math.min(Lf,Lb)+0.05);
      ratioEl.textContent = `Contrast: ${fmt(ratio)} : 1`;
      const v = classify(ratio);
      verdicts.innerHTML = `
        <span class="${v.AA_normal?'pass':'fail'}">AA normal</span>
        <span class="${v.AAA_normal?'pass':'fail'}">AAA normal</span>
        <span class="${v.AA_large?'pass':'fail'}">AA large</span>
        <span class="${v.AAA_large?'pass':'fail'}">AAA large</span>`;
    };

    const link = (picker, input) => {
      picker.addEventListener("input", ()=>{ input.value=picker.value; update(); });
      input.addEventListener("input", ()=>{ if(hex(input.value)) picker.value=input.value; update(); });
    };
    link(fgPick, fgTxt); link(bgPick, bgTxt); update();

    this._cleanup = ()=>{
      fgPick.replaceWith(fgPick.cloneNode(true));
      bgPick.replaceWith(bgPick.cloneNode(true));
      fgTxt.replaceWith(fgTxt.cloneNode(true));
      bgTxt.replaceWith(bgTxt.cloneNode(true));
      container.innerHTML="";
    };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCssNeonText = {
  id: "css-neon-text",
  name: "Neon Text Glow",
  type: "CSS",
  tags: ["css","typography","micro-interaction"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Layered <code>text-shadow</code> for neon glow.</li>
      <li>Subtle flicker via keyframes.</li>
      <li>No JavaScript.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        @keyframes flicker{
          0%,19%,21%,23%,80%,100%{ opacity:1; text-shadow:
            0 0 6px #5b9dff66, 0 0 12px #5b9dffaa, 0 0 24px #5b9dffcc, 0 0 48px #5b9dff88; }
          20%,22%{ opacity:0.8; text-shadow:
            0 0 3px #5b9dff44, 0 0 6px #5b9dff88, 0 0 12px #5b9dff99, 0 0 24px #5b9dff55; }
        }
        .neon-wrap{display:grid;place-items:center;height:100%;text-align:center}
        .neon{
          font-size: clamp(28px, 6vw, 64px);
          color:#e7eaf0;
          letter-spacing:.08em;
          animation:flicker 3.5s infinite;
        }
        .sub{color:#9aa1ad;margin-top:8px}
      </style>
      <div class="neon-wrap">
        <div>
          <div class="neon">NEON GLOW</div>
          <div class="sub">Text-shadow layers + flicker</div>
        </div>
      </div>`;
    this._cleanup = ()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCanvasFlowField = {
  id: "canvas-flow-field",
  name: "Flow Field Lines",
  type: "JS/Canvas",
  tags: ["canvas","particles","heavy"],
  perf: "GPU/CPU medium",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Lines advected by a pseudo-noise vector field.</li>
      <li>Alpha fade trail for smooth motion.</li>
      <li>Regenerate &amp; pause controls.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .ff{height:100%;display:grid;grid-template-rows:auto 1fr;gap:8px}
        .ff .ui{display:flex;gap:8px;align-items:center}
        .ff canvas{border:1px solid var(--line);border-radius:12px;background:#0b0d12;display:block;width:100%;height:100%}
      </style>
      <div class="ff">
        <div class="ui">
          <button class="btn" id="regen">Regenerate</button>
          <button class="btn" id="toggle">Pause</button>
        </div>
        <canvas id="cv"></canvas>
      </div>`;
    const c = container.querySelector("#cv"), ctx = c.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio||1);
    const resize=()=>{ const w=container.clientWidth,h=container.clientHeight-44;
      c.width=Math.floor(w*dpr); c.height=Math.floor(h*dpr); c.style.width=w+"px"; c.style.height=h+"px"; ctx.setTransform(dpr,0,0,dpr,0,0); };
    resize(); const ro=new ResizeObserver(resize); ro.observe(container);

    let pts=[], running=true, t=0, raf;
    const N = 1800; // particles
    function seed(){
      pts = Array.from({length:N}, ()=>({
        x: Math.random()*c.clientWidth,
        y: Math.random()*c.clientHeight
      }));
      ctx.clearRect(0,0,c.clientWidth,c.clientHeight);
    }
    seed();

    // cheap "noise" field
    function angle(x,y,tt){
      return Math.sin((x*0.004)+tt)*Math.cos((y*0.004)-tt);
    }

    function step(){
      if(!running){ raf=requestAnimationFrame(step); return; }
      ctx.fillStyle="rgba(11,13,18,0.08)"; // fade
      ctx.fillRect(0,0,c.clientWidth,c.clientHeight);
      ctx.beginPath();
      for(const p of pts){
        const a = angle(p.x, p.y, t)*Math.PI;
        const vx = Math.cos(a), vy = Math.sin(a);
        const nx = p.x + vx*1.2, ny = p.y + vy*1.2;
        ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny);
        p.x = (nx + c.clientWidth) % c.clientWidth;
        p.y = (ny + c.clientHeight) % c.clientHeight;
      }
      ctx.strokeStyle="rgba(91,157,255,0.35)";
      ctx.lineWidth=1; ctx.stroke();
      t += 0.01;
      raf=requestAnimationFrame(step);
    }
    raf=requestAnimationFrame(step);

    const btnRegen = container.querySelector("#regen");
    const btnToggle = container.querySelector("#toggle");
    const onRegen=()=>seed();
    const onToggle=()=>{ running=!running; btnToggle.textContent = running? "Pause" : "Resume"; };
    btnRegen.addEventListener("click", onRegen);
    btnToggle.addEventListener("click", onToggle);

    this._cleanup = ()=>{
      cancelAnimationFrame(raf); ro.disconnect();
      btnRegen.removeEventListener("click", onRegen);
      btnToggle.removeEventListener("click", onToggle);
      container.innerHTML="";
    };
  },
  teardown(){ this._cleanup?.(); }
};
const effectSvgTextMaskWave = {
  id: "svg-text-mask-wave",
  name: "Text Mask Wave",
  type: "SVG",
  tags: ["svg","typography","filter"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li><code>&lt;mask&gt;</code> to show a moving gradient only where text is.</li>
      <li>CSS animation shifts the gradient for a wave effect.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .tm{height:100%;display:grid;place-items:center}
        .wave{
          --bg: linear-gradient(90deg, #5b9dff, #34d399, #fbbf24, #5b9dff);
          background: var(--bg); background-size: 300% 100%;
          animation: slide 6s linear infinite;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          font-size: clamp(28px, 7vw, 72px); font-weight: 800; letter-spacing:.04em;
        }
        @keyframes slide{ to { background-position: 300% 0; } }
        /* fallback (SVG mask variant) */
        .maskbox { display:none; }
        @supports not ((background-clip: text) or (-webkit-background-clip: text)){
          .wave{ display:none }
          .maskbox{ display:block }
          .gradMove{ animation: slide 6s linear infinite }
        }
      </style>
      <div class="tm">
        <div class="wave">MASKED WAVE</div>
        <svg class="maskbox" viewBox="0 0 800 200" width="90%" height="60%">
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="3" y2="0" gradientUnits="userSpaceOnUse" class="gradMove">
              <stop offset="0" stop-color="#5b9dff"/><stop offset="0.5" stop-color="#34d399"/><stop offset="1" stop-color="#fbbf24"/>
            </linearGradient>
            <mask id="txtmask">
              <rect width="100%" height="100%" fill="white"/>
              <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
                    font-size="120" font-weight="800" font-family="system-ui,Segoe UI,Roboto,Inter,sans-serif" fill="black">MASKED WAVE</text>
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="url(#grad)" mask="url(#txtmask)"/>
        </svg>
      </div>`;
    this._cleanup = ()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCssMarquee = {
  id: "css-seamless-marquee",
  name: "Seamless Marquee (Speed Slider)",
  type: "CSS",
  tags: ["css","typography","micro-interaction"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Infinite loop using duplicated content + <code>translateX</code> animation.</li>
      <li>Speed controlled by a CSS variable from a range input.</li>
      <li>Respects <code>prefers-reduced-motion</code> (pauses).</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        @keyframes slideX { to { transform: translateX(-50%); } }
        .mq{height:100%;display:grid;grid-template-rows:auto 1fr;gap:10px}
        .mq .panel{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:12px;background:#0f1218;padding:10px;color:#cfd5df}
        .track{--speed: 14s; position:relative; overflow:hidden; border:1px solid var(--line); border-radius:12px; background:#0b0d12}
        .inner{display:flex; width:max-content; gap:32px; padding:18px; animation: slideX var(--speed) linear infinite}
        .chunk{white-space:nowrap; font-size:22px; color:#e7eaf0}
        .chunk .badge{margin-left:10px}
        @media (prefers-reduced-motion: reduce){
          .inner{ animation: none; }
        }
      </style>
      <div class="mq">
        <div class="panel">
          <label>Speed
            <input id="spd" type="range" min="4" max="30" value="14" />
          </label>
          <span id="spdOut">14s</span>
        </div>
        <div class="track" id="track" aria-label="Marquee">
          <div class="inner" id="inner">
            <div class="chunk">Effects Lab • CSS • SVG • Canvas • WebGL <span class="badge">∞</span></div>
            <div class="chunk">Micro-demos • Interactions • Scroll • Filters <span class="badge">∞</span></div>
            <!-- duplicate to make it seamless -->
            <div class="chunk">Effects Lab • CSS • SVG • Canvas • WebGL <span class="badge">∞</span></div>
            <div class="chunk">Micro-demos • Interactions • Scroll • Filters <span class="badge">∞</span></div>
          </div>
        </div>
      </div>`;
    const track = container.querySelector("#track");
    const inner = container.querySelector("#inner");
    const spd = container.querySelector("#spd");
    const out = container.querySelector("#spdOut");
    const update=()=>{ const s = spd.value+"s"; inner.style.setProperty("--speed", s); out.textContent = s; };
    spd.addEventListener("input", update); update();
    this._cleanup = ()=>{ spd.replaceWith(spd.cloneNode(true)); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectSmartTooltip = {
  id: "js-smart-tooltip",
  name: "Smart Tooltip (Clamp to Bounds)",
  type: "JS",
  tags: ["interaction","a11y"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>A tooltip that follows the pointer.</li>
      <li>Clamped so it never overflows the sandbox.</li>
      <li>Arrow flips based on which side was clamped.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .tt-stage{position:relative;height:100%;border:1px solid var(--line);border-radius:12px;background:#0b0d12}
        .tt-target{position:absolute; display:grid; place-items:center; width:120px; height:60px;
          border:1px solid var(--line); border-radius:10px; background:#0f1218; color:#e7eaf0}
        .tt-target:nth-child(1){ top:14%; left:12%}
        .tt-target:nth-child(2){ top:18%; right:12%}
        .tt-target:nth-child(3){ bottom:18%; left:22%}
        .tt-target:nth-child(4){ bottom:16%; right:20%}
        .tt{position:absolute; padding:8px 10px; background:#0f1218; color:#e7eaf0; border:1px solid var(--line);
            border-radius:8px; pointer-events:none; transform:translate(-50%,-120%); transition:opacity .08s ease}
        .tt[hidden]{opacity:0}
        .tt::after{
          content:""; position:absolute; width:10px; height:10px; background:#0f1218; border-left:1px solid var(--line); border-top:1px solid var(--line);
          transform:rotate(45deg); left:50%; top:100%; margin-left:-5px;
        }
        .tt[data-side="left"]{ transform:translate(12px,-50%); }
        .tt[data-side="left"]::after{ left:-5px; top:50%; transform:rotate(225deg); }
        .tt[data-side="right"]{ transform:translate(-100%,-50%); }
        .tt[data-side="right"]::after{ left:calc(100% - 5px); top:50%; transform:rotate(45deg); }
        .tt[data-side="bottom"]{ transform:translate(-50%,12px); }
        .tt[data-side="bottom"]::after{ top:-5px; transform:rotate(135deg); }
      </style>
      <div class="tt-stage" id="stage" aria-label="Tooltip stage">
        <div class="tt-target" tabindex="0">Alpha</div>
        <div class="tt-target" tabindex="0">Bravo</div>
        <div class="tt-target" tabindex="0">Charlie</div>
        <div class="tt-target" tabindex="0">Delta</div>
        <div class="tt" id="tip" hidden>Tooltip</div>
      </div>`;
    const stage = container.querySelector("#stage");
    const tip = container.querySelector("#tip");
    let active=null;

    function show(text){ tip.textContent=text; tip.hidden=false; }
    function hide(){ tip.hidden=true; }

    const clamp = (x, y)=>{
      const r = stage.getBoundingClientRect();
      const tw = 160, th = 40; // approx tooltip bounds
      const pad = 8;
      let side = "top";
      let cx = Math.max(r.left+pad, Math.min(r.right-pad, x));
      let cy = Math.max(r.top+pad,  Math.min(r.bottom-pad, y));
      // pick side if clamped strongly
      if (x > r.right - tw/2) side="left";
      else if (x < r.left + tw/2) side="right";
      else if (y > r.bottom - th) side="top";
      else if (y < r.top + th) side="bottom";
      return { x: cx - r.left, y: cy - r.top, side };
    };

    const move = (e)=>{
      if(!active) return;
      const {x,y,side} = clamp(e.clientX, e.clientY);
      tip.style.left = x+"px";
      tip.style.top  = y+"px";
      tip.dataset.side = side;
    };

    const enter = (e)=>{
      if(!(e.target).classList.contains("tt-target")) return;
      active = e.target; show(active.textContent);
    };
    const leave = (e)=>{
      if(e.relatedTarget?.closest?.(".tt-target") === active) return;
      active=null; hide();
    };

    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerover", enter);
    stage.addEventListener("pointerout", leave);
    stage.addEventListener("focusin", e=>{ if(e.target.classList.contains("tt-target")){ active=e.target; show(active.textContent); }});
    stage.addEventListener("focusout", e=>{ if(!stage.contains(e.relatedTarget)){ active=null; hide(); }});

    this._cleanup = ()=>{
      stage.replaceWith(stage.cloneNode(true));
      container.innerHTML="";
    };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCanvasPixelate = {
  id: "canvas-pixelate",
  name: "Pixelate Filter (Slider)",
  type: "JS/Canvas",
  tags: ["canvas","media","interaction"],
  perf: "GPU/CPU light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Classic pixelation via downscale &amp; upscale with smoothing off.</li>
      <li>Responsive canvas + slider for block size.</li>
      <li>Draws a generated scene (gradient + text) to avoid CORS issues.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .px{height:100%;display:grid;grid-template-rows:auto 1fr;gap:10px}
        .px .panel{display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:12px;background:#0f1218;padding:10px;color:#cfd5df}
        .px canvas{display:block;width:100%;height:100%;border:1px solid var(--line);border-radius:12px;background:#0b0d12}
      </style>
      <div class="px">
        <div class="panel">Block size <input id="blk" type="range" min="1" max="40" value="8"><output id="out">8</output> px</div>
        <canvas id="cv"></canvas>
      </div>`;
    const c = container.querySelector("#cv");
    const ctx = c.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio||1);
    const off = document.createElement("canvas");
    const octx = off.getContext("2d");

    const renderSource = (w,h)=>{
      off.width = w; off.height = h;
      const g = octx.createLinearGradient(0,0,w,h);
      g.addColorStop(0,"#0f131b"); g.addColorStop(1,"#172133");
      octx.fillStyle=g; octx.fillRect(0,0,w,h);
      // blobs
      for(let i=0;i<8;i++){
        const rx=Math.random()*w, ry=Math.random()*h, rr=60+Math.random()*160;
        const rgrad = octx.createRadialGradient(rx,ry,0, rx,ry,rr);
        rgrad.addColorStop(0, "rgba(91,157,255,.55)");
        rgrad.addColorStop(1, "rgba(91,157,255,0)");
        octx.fillStyle=rgrad; octx.beginPath(); octx.arc(rx,ry,rr,0,Math.PI*2); octx.fill();
      }
      // title
      octx.fillStyle="#e7eaf0"; octx.font="600 48px system-ui,Segoe UI,Roboto,Inter"; octx.textAlign="center";
      octx.fillText("PIXELATE", w/2, h/2);
    };

    const resize = ()=>{
      const w = container.clientWidth, h = container.clientHeight - 48;
      c.width = Math.floor(w*dpr); c.height = Math.floor(h*dpr);
      c.style.width = w+"px"; c.style.height = h+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
      renderSource(w, h);
      draw();
    };

    let block = 8;
    const blk = container.querySelector("#blk"), out = container.querySelector("#out");
    const ro = new ResizeObserver(resize); ro.observe(container);
    blk.addEventListener("input", ()=>{ block=+blk.value; out.value=String(block); draw(); });

    function draw(){
      const w = c.clientWidth, h = c.clientHeight;
      if(block<=1){ ctx.drawImage(off,0,0,w,h); return; }
      const sw = Math.ceil(w / block), sh = Math.ceil(h / block);
      ctx.imageSmoothingEnabled = false;
      // downscale to tiny temp canvas
      const tmp = document.createElement("canvas");
      tmp.width = sw; tmp.height = sh;
      const tctx = tmp.getContext("2d");
      tctx.imageSmoothingEnabled = false;
      tctx.drawImage(off,0,0,w,h, 0,0, sw,sh);
      ctx.clearRect(0,0,w,h);
      ctx.drawImage(tmp, 0,0, sw,sh, 0,0, w,h);
    }

    resize();
    this._cleanup = ()=>{ ro.disconnect(); blk.replaceWith(blk.cloneNode(true)); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCssRadarSweep = {
  id: "css-radar-sweep",
  name: "Radar Sweep (Conic + Mask)",
  type: "CSS",
  tags: ["css","filter","media"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Animated sweep via <code>conic-gradient</code> rotation.</li>
      <li>Ring mask using <code>radial-gradient</code> to cut the center.</li>
      <li>Decorative grid + blips.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        @keyframes spin360 { to { transform: rotate(360deg); } }
        .rad{position:relative;height:100%;display:grid;place-items:center;background:#0b0d12;border-radius:12px;overflow:hidden}
        .rad .ring{
          --size: min(70vmin, 90%);
          width:var(--size); aspect-ratio:1/1; position:relative; border:1px solid var(--line); border-radius:50%;
          background:
            radial-gradient(closest-side, transparent 58%, #0b0d12 59% 61%, transparent 62%),
            radial-gradient(circle at 50% 50%, #1a2233 1px, transparent 1px) 0 0/10% 10%,
            radial-gradient(circle at 50% 50%, #111622, #0b0d12 55%);
          overflow:hidden;
        }
        .sweep{
          position:absolute; inset:0;
          background: conic-gradient(from 0deg, rgba(91,157,255,.35), rgba(91,157,255,0) 60%);
          animation: spin360 6s linear infinite;
          /* mask to ring */
          -webkit-mask: radial-gradient(closest-side, transparent 0 34%, #000 35%);
                  mask: radial-gradient(closest-side, transparent 0 34%, #000 35%);
        }
        .blip{
          position:absolute; width:8px; height:8px; border-radius:50%; background:#5b9dff; box-shadow:0 0 10px #5b9dff;
          animation: ping 2.4s ease-in-out infinite;
        }
        @keyframes ping {
          0%,100%{ transform: scale(1); opacity:.9 }
          50%{ transform: scale(1.6); opacity:.3 }
        }
      </style>
      <div class="rad">
        <div class="ring" id="ring">
          <div class="sweep"></div>
          <div class="blip" style="left:22%; top:36%"></div>
          <div class="blip" style="left:68%; top:62%"></div>
          <div class="blip" style="left:42%; top:74%"></div>
        </div>
      </div>`;
    this._cleanup = ()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCssRadioTabs = {
  id: "css-radio-tabs",
  name: "Radio Tabs (CSS-only)",
  type: "CSS",
  tags: ["css","a11y","nav"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li>Tabs using radios + labels (no JS).</li>
        <li>Only one panel visible via sibling selectors.</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .tabs{height:100%;display:grid;grid-template-rows:auto 1fr;gap:10px}
        .tabbar{display:flex;gap:8px;flex-wrap:wrap}
        .tabbar label{padding:8px 12px;border:1px solid var(--line);border-radius:10px;cursor:pointer;color:#cfd5df;background:#0f1218}
        .tabbar input{position:absolute;opacity:0;pointer-events:none}
        .tabbar input:checked + label{outline:1px solid #5b9dff;color:#e7eaf0}
        .panes{border:1px solid var(--line);border-radius:12px;background:#0b0d12;padding:12px;height:100%;overflow:auto}
        .pane{display:none}
        #t1:checked ~ .panes #p1,
        #t2:checked ~ .panes #p2,
        #t3:checked ~ .panes #p3 {display:block}
      </style>
      <div class="tabs">
        <div class="tabbar" role="tablist">
          <input id="t1" type="radio" name="t" checked>
          <label for="t1" role="tab" aria-controls="p1" aria-selected="true">Intro</label>
          <input id="t2" type="radio" name="t">
          <label for="t2" role="tab" aria-controls="p2" aria-selected="false">Details</label>
          <input id="t3" type="radio" name="t">
          <label for="t3" role="tab" aria-controls="p3" aria-selected="false">More</label>
        </div>
        <div class="panes">
          <section id="p1" class="pane"><p>Pure CSS tabs using radio inputs.</p></section>
          <section id="p2" class="pane"><p>Each label toggles a radio; sibling selectors reveal its panel.</p></section>
          <section id="p3" class="pane"><p>Keyboard users can tab to the labels and press Space/Enter.</p></section>
        </div>
      </div>`;
    this._cleanup=()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectTableSortSearch = {
  id: "js-table-sort-search",
  name: "Table — Sort + Search",
  type: "JS",
  tags: ["tables","forms","a11y"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li>Click headers to sort (asc/desc).</li>
        <li>Client-side search filter.</li></ul>`,
  async load(){},
  init(container){
    const data = [
      { name:"Alpha",   score:82,  role:"Engineer" },
      { name:"Bravo",   score:91,  role:"Designer" },
      { name:"Charlie", score:67,  role:"PM" },
      { name:"Delta",   score:74,  role:"Engineer" },
      { name:"Echo",    score:99,  role:"Analyst" },
      { name:"Foxtrot", score:85,  role:"Engineer" },
    ];
    container.innerHTML = `
      <style>
        .tbl-wrap{height:100%;display:grid;grid-template-rows:auto 1fr;gap:10px}
        .tbl-wrap .panel{display:flex;gap:10px;align-items:center;border:1px solid var(--line);
          border-radius:12px;background:#0f1218;padding:10px;color:#cfd5df}
        table{width:100%;border-collapse:collapse;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#0b0d12;color:#e7eaf0}
        thead th{background:#10141c;text-align:left;padding:10px;border-bottom:1px solid var(--line);user-select:none}
        tbody td{padding:10px;border-top:1px solid var(--line);color:#cfd5df}
        th.sort{cursor:pointer}
        th.sort .dir{opacity:.7;font-size:12px;margin-left:6px}
        tr:nth-child(odd){background:#0e1219}
      </style>
      <div class="tbl-wrap">
        <div class="panel">
          <label>Search <input id="q" placeholder="name or role" style="padding:8px;border-radius:8px;border:1px solid var(--line);background:#0c1016;color:#e7eaf0"></label>
        </div>
        <div style="overflow:auto">
          <table aria-label="Sortable">
            <thead>
              <tr>
                <th class="sort" data-key="name">Name<span class="dir"></span></th>
                <th class="sort" data-key="score">Score<span class="dir"></span></th>
                <th class="sort" data-key="role">Role<span class="dir"></span></th>
              </tr>
            </thead>
            <tbody id="body"></tbody>
          </table>
        </div>
      </div>`;
    const body = container.querySelector("#body");
    const q = container.querySelector("#q");
    let sortKey = "name", sortDir = 1;

    const render = ()=>{
      const term = (q.value||"").trim().toLowerCase();
      const filtered = data.filter(r => !term || `${r.name} ${r.role}`.toLowerCase().includes(term));
      const rows = filtered.sort((a,b)=>{
        const A=a[sortKey], B=b[sortKey];
        const na = typeof A==="number", nb = typeof B==="number";
        return (na&&nb ? (A-B) : String(A).localeCompare(String(B))) * sortDir;
      });
      body.innerHTML = rows.map(r=>`<tr><td>${r.name}</td><td>${r.score}</td><td>${r.role}</td></tr>`).join("");
      container.querySelectorAll("th.sort .dir").forEach(el=>el.textContent="");
      const th = container.querySelector(`th[data-key="${sortKey}"] .dir`);
      th.textContent = sortDir>0 ? "▲" : "▼";
    };

    container.querySelectorAll("th.sort").forEach(th=>{
      th.addEventListener("click", ()=>{
        const key = th.dataset.key;
        if(sortKey===key) sortDir *= -1; else { sortKey = key; sortDir = 1; }
        render();
      });
    });
    q.addEventListener("input", render);
    render();

    this._cleanup=()=>{ q.replaceWith(q.cloneNode(true)); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectThemeToggleCard = {
  id: "js-theme-toggle-card",
  name: "Theme Toggle (CSS Vars)",
  type: "JS+CSS",
  tags: ["css","a11y","forms"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li>Swap themes by toggling a <code>data-theme</code> attribute.</li>
        <li>Colors flow from CSS custom properties.</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .ttc{height:100%;display:grid;place-items:center}
        .card{
          --bg:#0f1218; --fg:#e7eaf0; --mut:#9aa1ad; --line: #1d2635;
          border:1px solid var(--line); border-radius:14px; padding:16px; width:min(520px,92%);
          background:var(--bg); color:var(--fg); transition:background .2s ease, color .2s ease, border-color .2s ease;
        }
        .card[data-theme="light"]{ --bg:#f7f8fb; --fg:#0e1116; --mut:#2c3446; --line:#cfd6e6; }
        .row{display:flex;justify-content:space-between;align-items:center}
        .mut{color:var(--mut)}
        .toggle{border:1px solid var(--line); border-radius:999px; padding:6px 10px; background:none; color:inherit; cursor:pointer}
        .chip{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:4px 8px;margin-right:6px}
      </style>
      <div class="ttc">
        <div class="card" id="card" data-theme="dark" aria-live="polite">
          <div class="row">
            <h4 style="margin:0">Theme Toggle</h4>
            <button class="toggle" id="btn">Switch to Light</button>
          </div>
          <p class="mut">This card's colors come from CSS variables. Toggling the theme swaps the variables.</p>
          <div><span class="chip">--bg</span><span class="chip">--fg</span><span class="chip">--mut</span><span class="chip">--line</span></div>
        </div>
      </div>`;
    const card = container.querySelector("#card");
    const btn = container.querySelector("#btn");
    const click = ()=>{
      const next = card.dataset.theme === "dark" ? "light" : "dark";
      card.dataset.theme = next;
      btn.textContent = next==="dark" ? "Switch to Light" : "Switch to Dark";
      card.setAttribute("aria-label", `Theme set to ${next}`);
    };
    btn.addEventListener("click", click);
    this._cleanup=()=>{ btn.removeEventListener("click", click); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectStarRating = {
  id: "form-star-rating",
  name: "Star Rating (Radios)",
  type: "JS+CSS",
  tags: ["forms","a11y","interaction"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li>Accessible rating with radio inputs.</li>
        <li>CSS-only hover fill; tiny JS updates readout.</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .rate-wrap{height:100%;display:grid;place-items:center}
        .rate{display:inline-grid;grid-auto-flow:column;gap:6px;direction:rtl}
        .rate input{position:absolute;opacity:0;width:0;height:0}
        .star{
          width:34px;height:34px;display:inline-block;cursor:pointer;border:1px solid var(--line);border-radius:8px;background:#0f1218;
          -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23000" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>') center/70% no-repeat;
                  mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23000" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>') center/70% no-repeat;
          background-image: linear-gradient(#222,#222); background-size:0% 0%; background-repeat:no-repeat;
        }
        /* hover fill (rtl + adjacent sibling) */
        .rate label:hover ~ label .star,
        .rate input:checked ~ label .star { background-size:100% 100%; background-image:linear-gradient(#5b9dff,#5b9dff) }
        .out{margin-top:10px;color:#cfd5df;text-align:center}
      </style>
      <div class="rate-wrap">
        <form class="rate" id="rate" aria-label="Star rating" role="radiogroup">
          <input type="radio" id="s5" name="r" value="5"><label for="s5" aria-label="5 stars"><span class="star"></span></label>
          <input type="radio" id="s4" name="r" value="4"><label for="s4" aria-label="4 stars"><span class="star"></span></label>
          <input type="radio" id="s3" name="r" value="3"><label for="s3" aria-label="3 stars"><span class="star"></span></label>
          <input type="radio" id="s2" name="r" value="2"><label for="s2" aria-label="2 stars"><span class="star"></span></label>
          <input type="radio" id="s1" name="r" value="1"><label for="s1" aria-label="1 star"><span class="star"></span></label>
        </form>
        <div class="out" id="out">Choose a rating.</div>
      </div>`;
    const form = container.querySelector("#rate");
    const out = container.querySelector("#out");
    const onChange = (e)=>{
      if(e.target.name!=="r") return;
      out.textContent = `You picked ${e.target.value} / 5`;
    };
    form.addEventListener("change", onChange);
    this._cleanup=()=>{ form.removeEventListener("change", onChange); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCssGradientBorder = {
  id: "css-gradient-border",
  name: "Animated Gradient Border",
  type: "CSS",
  tags: ["css","micro-interaction","layout"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li>Gradient border via double background + masking.</li>
        <li>Slow rotation using <code>@keyframes</code>.</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        @keyframes spinBorder{ to{ transform: rotate(360deg); } }
        .gb-wrap{height:100%;display:grid;place-items:center}
        .gb{
          position:relative; width:min(520px,90%); padding:18px; border-radius:16px;
          background:
            linear-gradient(#0f1218,#0f1218) padding-box,
            conic-gradient(#5b9dff, #34d399, #fbbf24, #5b9dff) border-box;
          border:1.5px solid transparent;
        }
        .gb::before{
          content:""; position:absolute; inset:-40%; border-radius:inherit;
          background: conic-gradient(#5b9dff, #34d399, #fbbf24, #5b9dff);
          filter: blur(18px) saturate(1.2); z-index:-1; animation:spinBorder 20s linear infinite;
        }
        .gb h4{margin:0 0 6px 0; color:#e7eaf0} .gb p{margin:0;color:#9aa1ad}
      </style>
      <div class="gb-wrap">
        <article class="gb">
          <h4>Gradient Border</h4>
          <p>Two-layer background + transparent border; animated glow “under” the card.</p>
        </article>
      </div>`;
    this._cleanup=()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectDeviceTiltParallax = {
  id: "js-device-tilt-parallax",
  name: "Device Tilt Parallax",
  type: "JS",
  tags: ["interaction","mobile-safe","3d"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li><code>DeviceOrientationEvent</code> for phone tilt.</li>
        <li>Pointer fallback on desktop.</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .tilt-stage{height:100%;display:grid;place-items:center;perspective:900px}
        .stack{position:relative;width:min(420px,90%);height:240px;transform-style:preserve-3d;border-radius:16px;
               border:1px solid var(--line); background:#0f1218; overflow:hidden}
        .layer{position:absolute;inset:0;display:grid;place-items:center;font-weight:700;color:#e7eaf0;will-change:transform}
        .l1{transform:translateZ(60px);} .l2{transform:translateZ(30px);} .l3{transform:translateZ(0);}
        .panel{position:absolute;left:10px;bottom:10px;font-size:12px;color:#9aa1ad;background:#10131a;border:1px solid var(--line);border-radius:8px;padding:6px 8px}
        .btn{margin-left:8px}
      </style>
      <div class="tilt-stage">
        <div class="stack" id="stack">
          <div class="layer l3">Background</div>
          <div class="layer l2">Middle</div>
          <div class="layer l1">Front</div>
          <div class="panel">Tilt your phone or move mouse.
            <button class="btn" id="enable">Enable motion</button>
          </div>
        </div>
      </div>`;
    const card = container.querySelector("#stack");
    const enable = container.querySelector("#enable");
    const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
    const apply = (ax, ay)=>{
      // ax, ay = [-1,1]
      const rx = clamp(ay*10,-12,12);
      const ry = clamp(ax*10,-12,12);
      card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    };
    const onPointer = e=>{
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left)/r.width - .5;
      const y = (e.clientY - r.top)/r.height - .5;
      apply(x, -y);
    };
    card.addEventListener("pointermove", onPointer);
    // Motion (needs permission on iOS)
    const ask = async ()=>{
      try{
        const need = typeof DeviceOrientationEvent!=="undefined" && DeviceOrientationEvent.requestPermission;
        if(need){ const res = await DeviceOrientationEvent.requestPermission(); if(res!=="granted") return; }
        window.addEventListener("deviceorientation", (ev)=>{
          // gamma = left/right (-90..90), beta = front/back (-180..180)
          const ax = clamp((ev.gamma||0)/45, -1, 1);
          const ay = clamp((ev.beta||0)/45,  -1, 1);
          apply(ax, ay);
        });
      }catch{}
    };
    enable.addEventListener("click", ask);

    this._cleanup=()=>{ card.removeEventListener("pointermove", onPointer); enable.replaceWith(enable.cloneNode(true)); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectPanZoomViewer = {
  id: "js-pan-zoom-viewer",
  name: "Pan & Zoom (Image)",
  type: "JS",
  tags: ["media","interaction","a11y"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li>Wheel to zoom around the cursor; drag to pan.</li>
        <li>Clamped scale &amp; momentum-free, simple UX.</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .pz{height:100%;display:grid;place-items:center}
        .viewport{position:relative;width:min(900px,92%);aspect-ratio:16/9;border:1px solid var(--line);border-radius:12px;background:#0b0d12;overflow:hidden;touch-action:none}
        .img{position:absolute;left:0;top:0; user-select:none; will-change:transform}
        .hint{position:absolute;left:10px;bottom:10px;font-size:12px;color:#9aa1ad;background:#10131a;border:1px solid var(--line);border-radius:8px;padding:6px 8px}
      </style>
      <div class="pz">
        <div class="viewport" id="vp" aria-label="Pan & Zoom">
          <img class="img" id="img" src="https://picsum.photos/1600/900?random=7" alt="Zoomable">
          <div class="hint">Wheel = zoom • Drag = pan • Double-click = reset</div>
        </div>
      </div>`;
    const vp = container.querySelector("#vp");
    const img = container.querySelector("#img");
    let scale = 1, minS=1, maxS=5, tx=0, ty=0;
    const render = ()=> img.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
    const clampPan = ()=>{
      const vw = vp.clientWidth, vh = vp.clientHeight;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const sw = iw*scale, sh = ih*scale;
      const maxX = Math.max(0, (sw - vw)/2), maxY = Math.max(0, (sh - vh)/2);
      tx = Math.max(-maxX, Math.min(maxX, tx));
      ty = Math.max(-maxY, Math.min(maxY, ty));
    };
    const zoom = (delta, cx, cy)=>{
      const rect = vp.getBoundingClientRect();
      const x = cx - rect.left - vp.clientWidth/2 - tx;
      const y = cy - rect.top  - vp.clientHeight/2 - ty;
      const prev = scale;
      scale = Math.max(minS, Math.min(maxS, scale * (delta<0 ? 1.1 : 0.9)));
      // keep the point under cursor stationary
      tx -= (x/prev - x/scale);
      ty -= (y/prev - y/scale);
      clampPan(); render();
    };
    vp.addEventListener("wheel", e=>{ e.preventDefault(); zoom(e.deltaY, e.clientX, e.clientY); }, {passive:false});
    // drag
    let dragging=false, sx=0, sy=0, stx=0, sty=0;
    const down = e=>{ dragging=true; sx=e.clientX; sy=e.clientY; stx=tx; sty=ty; vp.setPointerCapture(e.pointerId); };
    const move = e=>{ if(!dragging) return; tx = stx + (e.clientX - sx); ty = sty + (e.clientY - sy); clampPan(); render(); };
    const up = e=>{ dragging=false; vp.releasePointerCapture(e.pointerId); };
    vp.addEventListener("pointerdown", down); vp.addEventListener("pointermove", move); vp.addEventListener("pointerup", up);
    vp.addEventListener("dblclick", ()=>{ scale=1; tx=ty=0; render(); });
    img.addEventListener("load", ()=>{ scale=1; tx=ty=0; render(); });

    this._cleanup=()=>{ vp.replaceWith(vp.cloneNode(true)); };
  },
  teardown(){ this._cleanup?.(); }
};
const effectInfiniteScroll = {
  id: "scroll-infinite-loader",
  name: "Infinite Scroll (Internal)",
  type: "Scroll",
  tags: ["scroll","a11y","forms"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul><li><code>IntersectionObserver</code> sentinel to load more items.</li>
        <li>Fake latency + skeletons; stops after 5 pages.</li></ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .inf{height:100%;overflow:auto;padding:12px;display:grid;gap:12px}
        .card{border:1px solid var(--line);border-radius:12px;background:#0f1218;padding:14px;color:#cfd5df}
        .sk{height:18px;border-radius:8px;background:#141923;position:relative;overflow:hidden}
        .sk::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent);
                    transform:translateX(-100%);animation:sh 1.2s linear infinite}
        @keyframes sh{ to { transform:translateX(100%); } }
        .sent{height:1px}
      </style>
      <div class="inf" id="root"></div>
      <div class="sent" id="sentinel"></div>`;
    const root = container.querySelector("#root");
    const sentinel = container.querySelector("#sentinel");
    let page=0, max=5, busy=false;

    const renderSkeletons = ()=>{
      const frag = document.createDocumentFragment();
      for(let i=0;i<6;i++){
        const el = document.createElement("article");
        el.className="card"; el.innerHTML = `<div class="sk"></div><div class="sk" style="margin-top:8px;width:60%"></div>`;
        frag.appendChild(el);
      }
      root.appendChild(frag);
      return ()=>{ for(let i=0;i<6;i++) root.lastElementChild?.remove(); };
    };

    const loadPage = async()=>{
      if(busy) return; busy=true;
      const removeSk = renderSkeletons();
      await new Promise(r=>setTimeout(r, 650)); // simulated latency
      removeSk();
      const frag = document.createDocumentFragment();
      for(let i=0;i<8;i++){
        const idx = page*8 + i + 1;
        const el = document.createElement("article");
        el.className="card"; el.innerHTML = `<strong>Item #${idx}</strong><p style="margin:6px 0 0 0;color:#9aa1ad">Loaded via IO sentinel</p>`;
        frag.appendChild(el);
      }
      root.appendChild(frag);
      page++; busy=false;
      if(page>=max) io.disconnect();
    };

    const io = new IntersectionObserver((entries)=>{
      for(const e of entries){ if(e.isIntersecting) loadPage(); }
    }, {root: container, threshold:0.1});
    io.observe(sentinel);
    loadPage();

    this._cleanup=()=>{ io.disconnect(); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectHamburgerToggle = {
  id: "ui-hamburger-toggle",
  name: "Hamburger ↔ X Toggle",
  type: "JS+CSS",
  tags: ["nav","css","micro-interaction"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Animated hamburger icon transforming to an “X”.</li>
      <li>CSS transitions on <code>transform</code> + <code>opacity</code>.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .ham-wrap{height:100%;display:grid;place-items:center}
        .ham-btn{width:54px;height:54px;border-radius:12px;border:1px solid var(--line);
                 display:grid;place-items:center;cursor:pointer;background:#0f1218}
        .ham{position:relative;width:26px;height:18px}
        .ham span{position:absolute;left:0;width:100%;height:2px;background:#e7eaf0;border-radius:2px;
                  transition:transform .25s ease, opacity .2s ease, top .25s ease}
        .ham span:nth-child(1){top:0}
        .ham span:nth-child(2){top:8px}
        .ham span:nth-child(3){top:16px}
        .ham-btn.active .ham span:nth-child(1){top:8px; transform:rotate(45deg)}
        .ham-btn.active .ham span:nth-child(2){opacity:0}
        .ham-btn.active .ham span:nth-child(3){top:8px; transform:rotate(-45deg)}
      </style>
      <div class="ham-wrap">
        <button class="ham-btn" id="h"><div class="ham"><span></span><span></span><span></span></div></button>
        <p class="hint" style="color:#9aa1ad;margin-top:10px">Click to toggle. This would control a menu.</p>
      </div>`;
    const btn = container.querySelector("#h");
    const onClick = ()=> btn.classList.toggle("active");
    btn.addEventListener("click", onClick);
    this._cleanup = ()=>{ btn.removeEventListener("click", onClick); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectDropzonePreview = {
  id: "dropzone-upload-preview",
  name: "Drag & Drop Upload (Previews)",
  type: "JS",
  tags: ["forms","media","interaction"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Drop or select images → thumbnail gallery.</li>
      <li>Fake progress bars; uses <code>URL.createObjectURL</code>.</li>
      <li>Keyboard accessible (button opens file input).</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .dz{height:100%;display:grid;grid-template-rows:auto 1fr;gap:10px}
        .zone{border:2px dashed #2a3243;border-radius:12px;background:#0f1218;color:#cfd5df;display:grid;place-items:center;padding:18px}
        .zone.focus{outline:2px solid #5b9dff; outline-offset:4px}
        .grid{margin-top:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;overflow:auto}
        .thumb{position:relative;border:1px solid var(--line);border-radius:10px;background:#0b0d12;overflow:hidden}
        .thumb img{display:block;width:100%;height:100px;object-fit:cover}
        .bar{position:absolute;left:0;right:0;bottom:0;height:4px;background:#1a2233}
        .bar > span{display:block;height:100%;width:0;background:#5b9dff;transition:width .2s linear}
        .rm{position:absolute;top:6px;right:6px;border:1px solid var(--line);background:#0f1218;color:#e7eaf0;border-radius:8px;font-size:12px;padding:4px 6px;cursor:pointer}
      </style>
      <div class="dz">
        <div class="zone" id="zone" tabindex="0" role="button" aria-label="Upload images">Drop images here or click to choose</div>
        <input id="file" type="file" accept="image/*" multiple hidden>
        <div class="grid" id="grid" aria-live="polite"></div>
      </div>`;
    const zone = container.querySelector("#zone");
    const input = container.querySelector("#file");
    const grid  = container.querySelector("#grid");

    const prevent = e=>{ e.preventDefault(); e.stopPropagation(); };
    ["dragenter","dragover","dragleave","drop"].forEach(ev=> zone.addEventListener(ev, prevent));
    zone.addEventListener("dragenter", ()=> zone.classList.add("focus"));
    zone.addEventListener("dragleave", ()=> zone.classList.remove("focus"));
    zone.addEventListener("drop", e=>{ zone.classList.remove("focus"); handleFiles(e.dataTransfer.files); });
    zone.addEventListener("click", ()=> input.click());
    zone.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" "){ input.click(); }});
    input.addEventListener("change", ()=> handleFiles(input.files));

    function handleFiles(files){
      [...files].forEach(f=>{
        if(!f.type.startsWith("image/")) return;
        const url = URL.createObjectURL(f);
        const card = document.createElement("div");
        card.className="thumb";
        const normalizedTags = normalizeTags(e);
        card.innerHTML = `
          <div class="thumb"></div>
          <div class="body">
            <h3>${e.name}</h3>
            <div class="badges">
              <span class="badge">${e.type}</span>
              ${normalizedTags.slice(0,3).map(t=>`<span class="badge">#${t}</span>`).join("") || ""}
            </div>
            <div class="actions">
              <button class="btn" data-id="${e.id}">Run</button>
              <span class="badge">${e.perf||""}</span>
            </div>
          </div>`;

        // Add click event to the entire card
        card.addEventListener("click", (ev)=>{
          if (!ev.target.closest("button")) openDemo(e);
        });

        // Add keyboard support for accessibility
        card.tabIndex = 0;
        card.addEventListener("keydown", (ev)=>{
          if ((ev.key === "Enter" || ev.key === " ") && !ev.target.closest("button")) {
            ev.preventDefault(); openDemo(e);
          }
        });
        grid.appendChild(card);
        // fake progress
        const fill = card.querySelector(".bar > span");
        let p = 0; const t = setInterval(()=>{ p+= Math.random()*20+10; fill.style.width = Math.min(100,p).toFixed(0) + "%";
          if(p>=100){ clearInterval(t); setTimeout(()=> card.querySelector(".bar").remove(), 300); }}, 200);
        card.querySelector(".rm").addEventListener("click", ()=>{
          clearInterval(t); URL.revokeObjectURL(url); card.remove();
        }, {once:true});
      });
      input.value = ""; // reset
    }

    this._cleanup = ()=>{
      zone.replaceWith(zone.cloneNode(true));
      input.replaceWith(input.cloneNode(true));
      container.innerHTML="";
    };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCssContainerCard = {
  id: "css-container-query-card",
  name: "Container Query Card",
  type: "CSS",
  tags: ["css","layout","a11y"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li><code>@container</code> queries: component adapts to its own width.</li>
      <li>Switches from stacked → side-by-side layout.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .cq-wrap{height:100%;display:grid;place-items:center;padding:12px}
        .card{container-type:inline-size; width:min(680px,92%); border:1px solid var(--line); border-radius:12px;
              background:#0f1218; color:#cfd5df; padding:14px; display:grid; gap:12px}
        .media{border-radius:10px; background:linear-gradient(135deg,#121a28,#0d121b); height:160px}
        .body{display:grid;gap:6px}
        .title{color:#e7eaf0;font-weight:600}
        /* default: stacked */
        @container (min-width: 520px){
          .card{ grid-template-columns: 220px 1fr; align-items:center }
          .media{ height:140px }
        }
        @container (min-width: 620px){
          .card{ grid-template-columns: 260px 1fr; }
        }
      </style>
      <div class="cq-wrap">
        <article class="card">
          <div class="media"></div>
          <div class="body">
            <div class="title">Container Queries</div>
            <p>Resize the modal to see this card switch between stacked and side-by-side layouts. The breakpoints are based on the <em>card’s own width</em>, not the viewport.</p>
            <div class="badges"><span class="badge">@container</span><span class="badge">inline-size</span></div>
          </div>
        </article>
      </div>`;
    this._cleanup = ()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectSvgPathDraw = {
  id: "svg-path-draw",
  name: "SVG Path Draw",
  type: "SVG",
  tags: ["svg","typography","micro-interaction"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Compute path lengths, set <code>stroke-dasharray</code>/<code>dashoffset</code>.</li>
      <li>Replay by resetting offsets and triggering a reflow.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .pd{height:100%;display:grid;grid-template-rows:auto 1fr;gap:10px}
        .pd .panel{display:flex;gap:8px;align-items:center;border:1px solid var(--line);border-radius:12px;background:#0f1218;padding:10px;color:#cfd5df}
        .pd svg{display:block;width:100%;height:100%;border:1px solid var(--line);border-radius:12px;background:#0b0d12}
        .path{fill:none;stroke:#5b9dff;stroke-width:3;stroke-linecap:round}
        .dash{transition:stroke-dashoffset 2.2s cubic-bezier(.2,.7,.2,1)}
      </style>
      <div class="pd">
        <div class="panel">
          <button class="btn" id="play">Replay</button>
          <span class="hint">Stroke-dash draws the paths.</span>
        </div>
        <svg viewBox="0 0 600 240" id="svg">
          <path class="path dash" d="M40,140 C120,40 240,200 320,100 S520,40 560,140"/>
          <path class="path dash" stroke="#34d399" d="M60,180 Q160,120 260,180 T460,180"/>
          <path class="path dash" stroke="#fbbf24" d="M80,70 h120 a40,40 0 0 1 40,40 v60"/>
          <text x="50%" y="42" text-anchor="middle" fill="#e7eaf0" font-size="18">SVG Stroke Path Draw</text>
        </svg>
      </div>`;
    const svg = container.querySelector("#svg");
    const btn = container.querySelector("#play");
    const paths = [...svg.querySelectorAll(".dash")];
    const prep = ()=>{
      paths.forEach(p=>{
        const L = p.getTotalLength();
        p.style.strokeDasharray = String(L);
        p.style.strokeDashoffset = String(L);
        // force reflow so next change animates
        void p.getBoundingClientRect();
        p.style.strokeDashoffset = "0";
      });
    };
    const replay = ()=>{
      paths.forEach(p=>{
        const L = parseFloat(p.style.strokeDasharray||p.getTotalLength());
        p.style.transition = "none";
        p.style.strokeDashoffset = String(L);
        void p.getBoundingClientRect();
        p.style.transition = ""; // restore
        p.style.strokeDashoffset = "0";
      });
    };
    btn.addEventListener("click", replay);
    prep();
    this._cleanup = ()=>{ btn.removeEventListener("click", replay); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectAudioOscilloscope = {
  id: "audio-oscilloscope",
  name: "WebAudio Oscilloscope",
  type: "JS/Canvas",
  tags: ["audio","canvas","visualizer"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Web Audio graph: Oscillator → Gain → Analyser.</li>
      <li>Time-domain trace + frequency bars on canvas.</li>
      <li>Start/Stop + waveform select; clean teardown.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .au{height:100%;display:grid;grid-template-rows:auto 1fr;gap:10px}
        .au .panel{display:flex;gap:8px;align-items:center;border:1px solid var(--line);
                   border-radius:12px;background:#0f1218;padding:10px;color:#cfd5df}
        .au canvas{display:block;width:100%;height:100%;border:1px solid var(--line);
                   border-radius:12px;background:#0b0d12}
      </style>
      <div class="au">
        <div class="panel">
          <button class="btn" id="start">Start</button>
          <button class="btn" id="stop">Stop</button>
          <label>Wave <select id="type">
            <option>sine</option><option>square</option><option>sawtooth</option><option>triangle</option>
          </select></label>
          <label>Vol <input id="vol" type="range" min="0" max="1" step="0.01" value="0.08"></label>
        </div>
        <canvas id="cv"></canvas>
      </div>`;
    const c = container.querySelector("#cv"), ctx = c.getContext("2d");
    const startBtn=container.querySelector("#start"), stopBtn=container.querySelector("#stop");
    const typeSel=container.querySelector("#type"), vol=container.querySelector("#vol");
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const resize=()=>{const w=container.clientWidth,h=container.clientHeight-58;
      c.width=Math.floor(w*dpr); c.height=Math.floor(h*dpr); c.style.width=w+"px"; c.style.height=h+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);};
    resize(); const ro=new ResizeObserver(resize); ro.observe(container);

    let ac,gain,osc,ana,raf,running=false;
    const dataT=new Uint8Array(1024), dataF=new Uint8Array(512);

    function draw(){
      const w=c.clientWidth,h=c.clientHeight; ctx.clearRect(0,0,w,h);
      // time domain
      ana.getByteTimeDomainData(dataT);
      ctx.beginPath(); for(let i=0;i<dataT.length;i++){
        const x = i/(dataT.length-1)*w, y = (dataT[i]/255)*h;
        i?ctx.lineTo(x,y):ctx.moveTo(x,y);
      }
      ctx.lineWidth=2; ctx.strokeStyle="#5b9dff"; ctx.stroke();
      // frequency bars
      ana.getByteFrequencyData(dataF);
      const bw = Math.max(1, w/dataF.length);
      for(let i=0;i<dataF.length;i++){
        const v=dataF[i]/255, bh=v*(h*0.4);
        ctx.fillStyle="rgba(164,196,255,.55)";
        ctx.fillRect(i*bw, h-bh, bw*0.9, bh);
      }
      raf=requestAnimationFrame(draw);
    }
    function start(){
      if(running) return;
      ac = new (window.AudioContext||window.webkitAudioContext)();
      gain = ac.createGain(); gain.gain.value = +vol.value;
      osc = ac.createOscillator(); osc.type = typeSel.value; osc.frequency.value = 220;
      ana = ac.createAnalyser(); ana.fftSize=1024;
      osc.connect(gain).connect(ana).connect(ac.destination); osc.start();
      running=true; draw();
    }
    function stop(){
      if(!running) return;
      cancelAnimationFrame(raf);
      osc.stop(); ac.close();
      running=false;
    }
    startBtn.addEventListener("click", start);
    stopBtn.addEventListener("click", stop);
    typeSel.addEventListener("change", ()=>{ if(osc) osc.type=typeSel.value; });
    vol.addEventListener("input", ()=>{ if(gain) gain.gain.value=+vol.value; });

    this._cleanup=()=>{ try{stop();}catch{} ro.disconnect();
      startBtn.replaceWith(startBtn.cloneNode(true)); stopBtn.replaceWith(stopBtn.cloneNode(true));
      container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectDragReorderList = {
  id: "ui-drag-reorder",
  name: "Drag to Reorder List",
  type: "JS+CSS",
  tags: ["interaction","a11y","forms"],
  perf: "CPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Native drag &amp; drop on list items.</li>
      <li>Drop position detection via mouse Y vs item midpoint.</li>
      <li>ARIA live region announces moves.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .re{height:100%;display:grid;grid-template-rows:auto 1fr;gap:10px}
        .re ul{list-style:none;margin:0;padding:8px;border:1px solid var(--line);border-radius:12px;background:#0f1218}
        .re li{padding:10px 12px;margin:6px 0;border:1px solid var(--line);border-radius:10px;background:#0b0d12;cursor:grab}
        .re li.dragging{opacity:.6}
        .re .mut{color:#9aa1ad}
      </style>
      <div class="re">
        <div class="mut">Drag items to reorder. (Keyboard: focus + Alt+Up/Down)</div>
        <ul id="list" aria-live="polite">
          <li draggable="true" tabindex="0">Alpha</li>
          <li draggable="true" tabindex="0">Bravo</li>
          <li draggable="true" tabindex="0">Charlie</li>
          <li draggable="true" tabindex="0">Delta</li>
        </ul>
      </div>`;
    const list = container.querySelector("#list");
    let dragEl=null;

    const onDragStart = e=>{ dragEl = e.target; dragEl.classList.add("dragging"); e.dataTransfer.effectAllowed="move"; };
    const onDragEnd   = e=>{ e.target.classList.remove("dragging"); dragEl=null; };
    const onDragOver  = e=>{
      e.preventDefault();
      const y = e.clientY;
      const siblings = [...list.querySelectorAll("li:not(.dragging)")];
      let next = null;
      for(const s of siblings){
        const r = s.getBoundingClientRect();
        const offset = y - (r.top + r.height/2);
        if(offset < 0){ next = s; break; }
      }
      list.insertBefore(dragEl, next);
    };
    const onKey = e=>{
      if(!["ArrowUp","ArrowDown"].includes(e.key) || !e.altKey) return;
      e.preventDefault();
      const li = e.target.closest("li");
      if(!li) return;
      if(e.key==="ArrowUp" && li.previousElementSibling) list.insertBefore(li, li.previousElementSibling);
      if(e.key==="ArrowDown" && li.nextElementSibling) list.insertBefore(li.nextElementSibling, li);
      list.setAttribute("aria-label", `Moved ${li.textContent}`);
      li.focus();
    };
    list.addEventListener("dragstart", onDragStart);
    list.addEventListener("dragend", onDragEnd);
    list.addEventListener("dragover", onDragOver);
    list.addEventListener("keydown", onKey);

    this._cleanup=()=>{ list.replaceWith(list.cloneNode(true)); container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectCssShapeOutside = {
  id: "css-shape-outside",
  name: "CSS Shapes (shape-outside)",
  type: "CSS",
  tags: ["css","layout","typography"],
  perf: "GPU-light",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li><code>shape-outside</code> with floated elements (circle &amp; polygon).</li>
      <li>Text flows around custom shapes.</li>
      <li>No JS. Pure CSS layout trick.</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .sh{height:100%;padding:18px;line-height:1.6;color:#cfd5df}
        .ball,.poly{float:left;margin:0 18px 8px 0;background:#1a2336;border:1px solid var(--line)}
        .ball{width:180px;height:180px;border-radius:50%;shape-outside:circle(50%);}
        .poly{float:right;width:220px;height:220px;margin:0 0 8px 18px;
              clip-path:polygon(10% 10%, 90% 15%, 80% 90%, 20% 80%);
              shape-outside:polygon(10% 10%, 90% 15%, 80% 90%, 20% 80%);}
        .sh p{margin:0 0 12px 0}
        @container (width < 520px){ .poly{display:none} }
      </style>
      <div class="sh">
        <div class="ball"></div>
        <div class="poly"></div>
        <p>CSS Shapes let inline content wrap around arbitrary outlines instead of rectangles. The left circle uses <code>shape-outside: circle()</code>; the right panel uses a polygon. Shapes must be floated and have explicit dimensions.</p>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent at turpis tincidunt, porttitor arcu vel, viverra purus. Integer bibendum nisl vitae commodo faucibus. Nulla facilisi. Cras consequat, metus a suscipit porta, felis augue lacinia arcu, vel iaculis massa nibh nec arcu.</p>
      </div>`;
    this._cleanup=()=>{ container.innerHTML=""; };
  },
  teardown(){ this._cleanup?.(); }
};
const effectWorkerPrimes = {
  id: "worker-primes",
  name: "Web Worker: Prime Sieve",
  type: "JS/Worker",
  tags: ["performance","worker","heavy"],
  perf: "CPU-medium",
  description: `
    <h3>What this shows</h3>
    <ul>
      <li>Compute primes in a Web Worker (UI stays responsive).</li>
      <li>Progress messages and cancel/terminate.</li>
      <li>Falls back to chunked main-thread if workers are blocked (e.g., file://).</li>
    </ul>`,
  async load(){},
  init(container){
    container.innerHTML = `
      <style>
        .wk{height:100%;display:grid;grid-template-rows:auto 1fr;gap:10px}
        .wk .panel{display:flex;gap:10px;align-items:center;border:1px solid var(--line);
                   border-radius:12px;background:#0f1218;padding:10px;color:#cfd5df}
        .wk .out{border:1px solid var(--line);border-radius:12px;background:#0b0d12;padding:10px;overflow:auto}
        progress{width:240px}
      </style>
      <div class="wk">
        <div class="panel">
          <label>Max N <input id="max" type="number" min="10000" step="10000" value="300000"></label>
          <button class="btn" id="run">Start</button>
          <button class="btn" id="cancel">Cancel</button>
          <progress id="prog" value="0" max="100"></progress>
          <span id="status" class="mut"></span>
        </div>
        <div class="out" id="out"></div>
      </div>`;
    const maxI=container.querySelector("#max"),
          run=container.querySelector("#run"),
          cancel=container.querySelector("#cancel"),
          prog=container.querySelector("#prog"),
          status=container.querySelector("#status"),
          out=container.querySelector("#out");

    // --- Worker code as a string (classic worker) ---
    const code = `
      self.onmessage = e=>{
        const N = e.data.max|0;
        const sieve = new Uint8Array(N+1);
        let last = 0, count = 0;
        for(let i=2;i<=N;i++){
          if(!sieve[i]){ count++; if(i*i<=N){ for(let j=i*i;j<=N;j+=i) sieve[j]=1; } }
          const p = ((i/N)*100)|0;
          if(p!==last && (i%5000===0)){ last=p; postMessage({t:'p', v:p}); }
        }
        const tail=[]; for(let k=N;k>=2 && tail.length<10;k--) if(!sieve[k]) tail.push(k);
        postMessage({t:'d', count, last: tail.reverse()});
      };`;

    let w=null, blobUrl=null, fallbackCancel=false;

    function newWorker(){
      try{
        const blob = new Blob([code], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);
        const worker = new Worker(url); // may throw on file:// (SecurityError)
        worker._blobUrl = url;
        return worker;
      }catch(err){
        return null;
      }
    }

    function start(){
      cancelRun(); // clear old runs
      out.textContent=""; prog.value=0; status.textContent="Starting…";

      // Prefer Worker; if blocked (file://) run fallback
      w = newWorker();
      if(w){
        blobUrl = w._blobUrl;
        status.textContent = "Working in Web Worker…";
        w.onmessage = (e)=>{
          if(e.data.t==='p'){ prog.value = e.data.v; }
          else if(e.data.t==='d'){
            status.textContent = `Found ${e.data.count} primes.`;
            out.textContent = "Last 10 primes: " + e.data.last.join(", ");
            cancelRun(false);
          }
        };
        w.postMessage({max: +maxI.value || 300000});
        return;
      }

      // --- Fallback: chunked sieve on main thread ---
      const N = (+maxI.value || 300000) | 0;
      const sieve = new Uint8Array(N+1);
      let i = 2, j = 0, count = 0, lastP = 0;
      fallbackCancel = false;
      status.textContent = "Worker blocked — running on main thread (chunked)…";

      const step = ()=>{
        if(fallbackCancel) return;
        const t0 = performance.now();
        // ~16ms budget per slice
        while(performance.now() - t0 < 16 && i <= N){
          if(j){ // marking multiples of current i
            for(; j<=N && performance.now()-t0 < 16; j += i) sieve[j]=1;
            if(j > N){ j = 0; i++; }
          } else {
            if(!sieve[i]){
              count++;
              if(i*i <= N){ j = i*i; } else { i++; }
            } else { i++; }
          }
          const p = ((i/N)*100)|0;
          if(p!==lastP && (i%5000===0)){ lastP = p; prog.value = p; }
        }
        if(i <= N){ setTimeout(step, 0); }
        else {
          const tail=[]; for(let k=N;k>=2 && tail.length<10;k--) if(!sieve[k]) tail.push(k);
          status.textContent = `Found ${count} primes.`;
          out.textContent = "Last 10 primes: " + tail.reverse().join(", ");
        }
      };
      step();
    }

    function cancelRun(updateText=true){
      if(w){ try{ w.terminate(); }catch{} w=null; }
      if(blobUrl){ URL.revokeObjectURL(blobUrl); blobUrl=null; }
      fallbackCancel = true;
      if(updateText) status.textContent = "Cancelled.";
    }

    run.addEventListener("click", start);
    cancel.addEventListener("click", ()=>cancelRun(true));

    this._cleanup=()=>{
      cancelRun(false);
      run.replaceWith(run.cloneNode(true));
      cancel.replaceWith(cancel.cloneNode(true));
      container.innerHTML="";
    };
  },
  teardown(){ this._cleanup?.(); }
};

// --- Registry ---------------------------------------------------------------
const EFFECTS = [
  effectMagneticButton,
  effectParticleFountain,
  effectCssPulseBorder,
  effectTiltCard,
  effectSvgPathDraw,
  effectMiniParallax,
  effectRippleButton,
  effectConfettiClick,
  effectSvgGooeyBlobs,
  effectScrollReveal,
  effectCssFlipCard,
  effectSpringyDrag,
  effectCssShimmer,
  effectSvgTextOnPath,
  effectTextScramble,
  effectScrollSnapCarousel,
  effectSpotlightReveal,
  effectSvgMorphBlob,
  effectCanvasStarfield,
  effectFormStrength,
  effectMatrixRain,
  effectScrollProgress,
  effectTypewriter,
  effectCssAccordion,
  effectFlipGridShuffle,
  effectScrollPinSteps,
  effectFilterPlayground,
  effectSvgCircularTimer,
  effectImageCompare,
  effectAudioVisualizer,
  effectSvgAnalogClock,
  effectCanvasMetaballs,
  effectCss3DCube,
  effectCanvasBouncingBalls,
  effectSvgMiniLineChart,
  effectClipboardToast,
  effectCssMasonryColumns,
  effectDragSortList,
  effectLazyImages,
  effectCursorTrail,
  effectCssConicPie,
  effectCanvasFireworks,
  effectCssGlassFrosted,
  effectJsCountUp,
  effectSplitResizer,
  effectClipRevealGrid,
  effectWASDMove,
  effectWebglPlasma,
  effectA11yContrast,
  effectCssNeonText,
  effectCanvasFlowField,
  effectSvgTextMaskWave,
  effectCssMarquee,
  effectSmartTooltip,
  effectCanvasPixelate,
  effectCssRadarSweep,
  effectCssRadioTabs,
  effectTableSortSearch,
  effectThemeToggleCard,
  effectStarRating,
  effectCssGradientBorder,
  effectDeviceTiltParallax,
  effectPanZoomViewer,
  effectInfiniteScroll,
  effectHamburgerToggle,
  effectDropzonePreview,
  effectCssContainerCard,
  effectSvgPathDraw_v2,
  effectAudioOscilloscope, 
  effectDragReorderList, 
  effectCssShapeOutside,
  effectWorkerPrimes,
];

// --- UI wiring --------------------------------------------------------------
const $grid = document.getElementById("grid");
const $search = document.getElementById("search");
const $tags = document.getElementById("tags");
const $modal = document.getElementById("demoModal");
const $sandbox = document.getElementById("sandbox");
const $title = document.getElementById("demoTitle");
const $metaType = document.getElementById("metaType");
const $metaLoad = document.getElementById("metaLoad");
const $metaTags = document.getElementById("metaTags");
const $close = document.getElementById("closeModal");
const $explain = document.getElementById("explain");

let activeEffect = null;
let activeTags = new Set();

function renderTags(){
  $tags.innerHTML = "";
  // Group tags by category for better organization
  const tagCategories = {
    "Tech": ["css","svg","canvas","webgl","audio","worker"],
    "Pattern": ["layout","scroll","nav","forms","table","loader","chart","dataviz","media"],
    "Interaction": ["drag","keyboard","pointer","toggle"],
    "Visual": ["particles","3d","shader","filter","mask","typography","animation"],
    "A11y/Perf": ["a11y","reduced-motion","performance","heavy"]
  };
  
  Object.entries(tagCategories).forEach(([category, tags]) => {
    const categoryDiv = document.createElement("div");
    categoryDiv.style.cssText = "margin-bottom: 8px;";
    
    const categoryLabel = document.createElement("div");
    categoryLabel.textContent = category;
    categoryLabel.style.cssText = "font-size: 11px; color: var(--muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;";
    categoryDiv.appendChild(categoryLabel);
    
    tags.forEach(t => {
      const b = document.createElement("button");
      b.className = "tag" + (activeTags.has(t) ? " active":"");
      b.textContent = t;
      b.onclick = ()=>{
        activeTags.has(t) ? activeTags.delete(t) : activeTags.add(t);
        renderTags(); renderGrid();
      };
      categoryDiv.appendChild(b);
    });
    
    $tags.appendChild(categoryDiv);
  });
}

function renderGrid(){
  const q = ($search.value||"").trim().toLowerCase();
  $grid.innerHTML = "";
  const filtered = EFFECTS.filter(e=>{
    const normalizedTags = normalizeTags(e);
    const qHit = !q || [e.name,e.type,normalizedTags.join(" ")].toLowerCase().includes(q);
    const tagHit = activeTags.size===0 || normalizedTags.some(t=>activeTags.has(t));
    return qHit && tagHit;
  });
  for(const e of filtered){
    const card = document.createElement("article"); card.className="card";
    card.innerHTML = `
      <div class="thumb"></div>
      <div class="body">
        <h3>${e.name}</h3>
        <div class="badges">
          <span class="badge">${e.type}</span>
          ${e.tags?.slice(0,3).map(t=>`<span class="badge">#${t}</span>`).join("") || ""}
        </div>
        <div class="actions">
          <button class="btn" data-id="${e.id}">Run</button>
          <span class="badge">${e.perf||""}</span>
        </div>
      </div>`;
      card.addEventListener("click", (ev)=>{
        if (!ev.target.closest("button")) openDemo(e);
      });
      card.tabIndex = 0;
      card.addEventListener("keydown", (ev)=>{
        if ((ev.key === "Enter" || ev.key === " ") && !ev.target.closest("button")) {
          ev.preventDefault(); openDemo(e);
        }
      });
    $grid.appendChild(card);
  }
  if(filtered.length===0){
    const empty = document.createElement("div");
    empty.style.cssText="grid-column:1/-1; color:#9aa1ad; padding:24px";
    empty.textContent = "No matches. Try clearing filters.";
    $grid.appendChild(empty);
  }
}
// Add this code to your app.js file, right after the card rendering in the renderGrid function:

// Add magnetic effect to card thumbs
function addMagneticThumbEffect(card) {
  const thumb = card.querySelector('.thumb');
  if (!thumb) return;
  
  const onMove = (e) => {
    const rect = thumb.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate position as percentage
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    // Set CSS variables for the gradient position
    thumb.style.setProperty('--thumb-mx', `${xPercent}%`);
    thumb.style.setProperty('--thumb-my', `${yPercent}%`);
    
    // Calculate the tilt amount (max 12px)
    const maxTilt = 12;
    const dx = ((x / rect.width) - 0.5) * maxTilt;
    const dy = ((y / rect.height) - 0.5) * maxTilt;
    
    // Set CSS variables for the transform
    thumb.style.setProperty('--thumb-dx', `${dx.toFixed(1)}px`);
    thumb.style.setProperty('--thumb-dy', `${dy.toFixed(1)}px`);
  };
  
  const onLeave = () => {
    // Reset the CSS variables
    thumb.style.removeProperty('--thumb-mx');
    thumb.style.removeProperty('--thumb-my');
    thumb.style.removeProperty('--thumb-dx');
    thumb.style.removeProperty('--thumb-dy');
  };
  
  // Add event listeners
  thumb.addEventListener('pointermove', onMove);
  thumb.addEventListener('pointerleave', onLeave);
  
  // Store the cleanup function
  thumb._magneticCleanup = () => {
    thumb.removeEventListener('pointermove', onMove);
    thumb.removeEventListener('pointerleave', onLeave);
  };
}

// Update the renderGrid function to add the magnetic effect
function renderGrid(){
  const q = ($search.value||"").trim().toLowerCase();
  $grid.innerHTML = "";
  const filtered = EFFECTS.filter(e=>{
    const normalizedTags = normalizeTags(e);
    const qHit = !q || [e.name,e.type,normalizedTags.join(" ")].toLowerCase().includes(q);
    const tagHit = activeTags.size===0 || normalizedTags.some(t=>activeTags.has(t));
    return qHit && tagHit;
  });
  for(const e of filtered){
    const normalizedTags = normalizeTags(e);
    const card = document.createElement("article"); 
    card.className = "card";
    card.innerHTML = `
      <div class="thumb"></div>
      <div class="body">
        <h3>${e.name}</h3>
        <div class="badges">
          <span class="badge">${e.type}</span>
          ${normalizedTags.slice(0,3).map(t=>`<span class="badge">#${t}</span>`).join("") || ""}
        </div>
        <div class="actions">
          <button class="btn" data-id="${e.id}">Run</button>
          <span class="badge">${e.perf||""}</span>
        </div>
      </div>`;
    
    // Add magnetic effect to the thumb
    addMagneticThumbEffect(card);
    
    card.addEventListener("click", (ev)=>{
      if (!ev.target.closest("button")) openDemo(e);
    });
    card.tabIndex = 0;
    card.addEventListener("keydown", (ev)=>{
      if ((ev.key === "Enter" || ev.key === " ") && !ev.target.closest("button")) {
        ev.preventDefault(); openDemo(e);
      }
    });
    $grid.appendChild(card);
  }
  if(filtered.length===0){
    const empty = document.createElement("div");
    empty.style.cssText="grid-column:1/-1; color:#9aa1ad; padding:24px";
    empty.textContent = "No matches. Try clearing filters.";
    $grid.appendChild(empty);
  }
}

// Update the renderGrid function call to clean up magnetic effects
function renderGrid(){
  // Clean up previous magnetic effects
  document.querySelectorAll('.thumb').forEach(thumb => {
    if (thumb._magneticCleanup) {
      thumb._magneticCleanup();
    }
  });
  
  const q = ($search.value||"").trim().toLowerCase();
  $grid.innerHTML = "";
  const filtered = EFFECTS.filter(e=>{
    const normalizedTags = normalizeTags(e);
    const qHit = !q || [e.name,e.type,normalizedTags.join(" ")].toLowerCase().includes(q);
    const tagHit = activeTags.size===0 || normalizedTags.some(t=>activeTags.has(t));
    return qHit && tagHit;
  });
  for(const e of filtered){
    const normalizedTags = normalizeTags(e);
    const card = document.createElement("article"); 
    card.className = "card";
    card.innerHTML = `
      <div class="thumb"></div>
      <div class="body">
        <h3>${e.name}</h3>
        <div class="badges">
          <span class="badge">${e.type}</span>
          ${normalizedTags.slice(0,3).map(t=>`<span class="badge">#${t}</span>`).join("") || ""}
        </div>
        <div class="actions">
          <button class="btn" data-id="${e.id}">Run</button>
          <span class="badge">${e.perf||""}</span>
        </div>
      </div>`;
    
    // Add magnetic effect to the thumb
    addMagneticThumbEffect(card);
    
    card.addEventListener("click", (ev)=>{
      if (!ev.target.closest("button")) openDemo(e);
    });
    card.tabIndex = 0;
    card.addEventListener("keydown", (ev)=>{
      if ((ev.key === "Enter" || ev.key === " ") && !ev.target.closest("button")) {
        ev.preventDefault(); openDemo(e);
      }
    });
    $grid.appendChild(card);
  }
  if(filtered.length===0){
    const empty = document.createElement("div");
    empty.style.cssText="grid-column:1/-1; color:#9aa1ad; padding:24px";
    empty.textContent = "No matches. Try clearing filters.";
    $grid.appendChild(empty);
  }
}
async function openDemo(effect){
  if (iridescentBg) { iridescentBg.destroy(); iridescentBg = null; }
  activeEffect?.teardown?.();
  $sandbox.innerHTML="";
  $title.textContent = effect.name;
  $metaType.textContent = effect.type;
  const normalizedTags = normalizeTags(effect);
  $metaTags.textContent = normalizedTags.map(t=>`#${t}`).join(" ");
  $metaLoad.textContent = "loading…";
  $explain.innerHTML = effect.description || "<h3>About this demo</h3><p>No description provided.</p>";

  if(!$modal.open) $modal.showModal();
  const t0 = performance.now();
  await effect.load?.();
  $metaLoad.textContent = `load ${Math.round(performance.now()-t0)}ms`;
  effect.init($sandbox);
  activeEffect = effect;
}

$close.onclick = () => { 
  $modal.close(); 
};

$modal.addEventListener("close", () => {
  // Single source of truth for cleanup + background resume
  activeEffect?.teardown?.();
  if (typeof startIridescentBackground === "function") startIridescentBackground();
});

$search.addEventListener("input", renderGrid);

renderTags();
renderGrid();

// NEW — clicking the side/backdrop closes the modal
$modal.addEventListener("click", (e) => {
  // For <dialog>, a click on the backdrop targets the dialog element itself
  if (e.target === $modal) {
    $modal.close();
  }
});

