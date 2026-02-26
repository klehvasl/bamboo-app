import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Asset paths (module-level so they're available when effects run)
const bambooSrc = '/bamboo.png';
const bgSrc = '/backg.png';

const App = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const [params, setParams] = useState({
    speed: 1.5,
    amplitude: 0.05,
    brightness: 1.1,
    contrast: 1.05,
    saturation: 1.15,
    bgScale: 1.1,
    bgOffsetX: 0.0,
    bgOffsetY: 0.0,
    chromaThreshold: 0.47 
  });

  const [activeWind, setActiveWind] = useState('Breeze');
  const [locationName, setLocationName] = useState('');
  const [windSpeed, setWindSpeed] = useState(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [catPos, setCatPos] = useState({x: 0, y: 0});
  const [showSplash, setShowSplash] = useState(() => {
    try {
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const force = urlParams && (urlParams.get('splash') === '1' || urlParams.get('forceSplash') === '1');
      if (force) return true;
      return !localStorage.getItem('seenSplash');
    } catch (e) {
      return true;
    }
  });
  const [acceptedLocation, setAcceptedLocation] = useState(() => {
    try {
      const value = localStorage.getItem('acceptedLocation');
      if (value === '1') return true;       // Explicit accept
      if (value === '0') return false;      // Explicit dismiss
      // For returning users (seenSplash set), default to allowing geolocation
      const seenSplash = localStorage.getItem('seenSplash');
      return seenSplash === '1';
    } catch (e) {
      return false;
    }
  });
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef(null);

  const acceptSplash = () => {
    try { localStorage.setItem('seenSplash', '1'); localStorage.setItem('acceptedLocation', '1'); } catch (e) {}
    setAcceptedLocation(true);
    setShowSplash(false);
  };

  const dismissSplash = () => {
    try { localStorage.setItem('seenSplash', '1'); localStorage.setItem('acceptedLocation', '0'); } catch (e) {}
    setAcceptedLocation(false);
    setShowSplash(false);
  };

  // Asset paths are defined at module top-level

  // debug visibility log
  useEffect(() => {
    try { console.log('splash visible:', showSplash, 'acceptedLocation:', acceptedLocation); } catch (e) {}
  }, [showSplash, acceptedLocation]);

  // Initialize audio when user has accepted location
  useEffect(() => {
    if (!acceptedLocation) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio('/song.mp3');
      audioRef.current.loop = true;
    }

    const appIsVisible = typeof document === 'undefined' || (!document.hidden && document.visibilityState === 'visible');

    if (audioEnabled && appIsVisible) {
      audioRef.current.play()
        .then(() => setIsAudioPlaying(true))
        .catch(() => console.log('Autoplay blocked - use toggle button'));
    } else {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [acceptedLocation, audioEnabled]);

  // Keep audio in sync with whether app is actually visible/foregrounded
  useEffect(() => {
    if (!acceptedLocation) return;

    const syncAudioWithVisibility = async () => {
      const audio = audioRef.current;
      if (!audio) return;

      const appIsVisible = typeof document === 'undefined' || (!document.hidden && document.visibilityState === 'visible');

      if (!appIsVisible || !audioEnabled) {
        audio.pause();
        setIsAudioPlaying(false);
        return;
      }

      try {
        await audio.play();
        setIsAudioPlaying(true);
      } catch (e) {
        setIsAudioPlaying(false);
      }
    };

    syncAudioWithVisibility();

    document.addEventListener('visibilitychange', syncAudioWithVisibility);
    window.addEventListener('blur', syncAudioWithVisibility);
    window.addEventListener('focus', syncAudioWithVisibility);
    window.addEventListener('pagehide', syncAudioWithVisibility);
    window.addEventListener('pageshow', syncAudioWithVisibility);

    return () => {
      document.removeEventListener('visibilitychange', syncAudioWithVisibility);
      window.removeEventListener('blur', syncAudioWithVisibility);
      window.removeEventListener('focus', syncAudioWithVisibility);
      window.removeEventListener('pagehide', syncAudioWithVisibility);
      window.removeEventListener('pageshow', syncAudioWithVisibility);
    };
  }, [acceptedLocation, audioEnabled]);

  // Toggle audio play/pause
  const toggleAudio = async () => {
    if (!audioRef.current) return;
    
    if (audioEnabled) {
      setAudioEnabled(false);
      audioRef.current.pause();
      setIsAudioPlaying(false);
    } else {
      setAudioEnabled(true);
      const appIsVisible = typeof document === 'undefined' || (!document.hidden && document.visibilityState === 'visible');
      if (!appIsVisible) return;
      try {
        await audioRef.current.play();
        setIsAudioPlaying(true);
      } catch (e) {
        console.log('Audio play failed:', e);
      }
    }
  };

  // Track container width for responsive cat positioning
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const updateCatPosition = () => {
      const rect = container.getBoundingClientRect();
      setCatPos({
        x: rect.left + container.clientWidth * 0.05,
        y: rect.top + container.clientHeight * 0.43
      });
    };
    
    const resizeObserver = new ResizeObserver(() => {
      setContainerWidth(container.clientWidth || 1200);
      updateCatPosition();
    });
    
    resizeObserver.observe(container);
    window.addEventListener('scroll', updateCatPosition);
    window.addEventListener('resize', updateCatPosition);
    
    updateCatPosition();
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updateCatPosition);
      window.removeEventListener('resize', updateCatPosition);
    };
  }, []);

  const windPresets = {
    'Calm': { amplitude: 0.005, speed: 0.5, maxWind: 2 },
    'Breeze': { amplitude: 0.08, speed: 2.2, maxWind: 15 },
    'Windy': { amplitude: 0.14, speed: 3.5, maxWind: 25 },
    'Strong': { amplitude: 0.20, speed: 3.8, maxWind: 100 },
    'Storm': { amplitude: 1.0, speed: 20.0, maxWind: 200 }
  };

  // Portal component so the splash modal renders at document.body and avoids clipping
  const SplashPortal = ({ children }) => {
    if (typeof document === 'undefined') return null;
    return createPortal(children, document.body);
  };

  const handleWindChange = (level) => {
    setActiveWind(level);
    setParams(prev => ({
      ...prev,
      amplitude: windPresets[level].amplitude,
      speed: windPresets[level].speed
    }));
  };

  // Small haptic helper for mobile taps
  const triggerHaptic = () => {
    try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
  };



  // Fetch user location and wind speed (only after user accepts the splash)
  useEffect(() => {
    if (!acceptedLocation) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Fetch weather data
          const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=wind_speed_10m&timezone=auto&t=${Date.now()}`
          );
          const weatherData = await weatherResponse.json();
          const windSpeed = weatherData.current.wind_speed_10m;

          // Fetch location name using reverse geocoding
          const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const geoData = await geoResponse.json();
          const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Unknown';
          const state = geoData.address?.state || '';
          const country = geoData.address?.country || '';
          const locationStr = `${city}${state ? ', ' + state : ''}${country ? ', ' + country : ''}`;

          // Map wind speed to preset level
          let selectedLevel = 'Calm';
          for (const [level, preset] of Object.entries(windPresets)) {
            if (windSpeed <= preset.maxWind) {
              selectedLevel = level;
              break;
            }
          }

          handleWindChange(selectedLevel);
          setLocationName(locationStr);
          setWindSpeed(windSpeed);
        } catch (error) {
          console.error('Failed to fetch weather data:', error);
        }
      });
    }
  }, [acceptedLocation]);

  // WebGL rendering effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current || canvas.parentElement;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: true });
    if (!gl) return;

    const aspect = 1200 / 800;
    const resizeCanvases = () => {
      const cssWidth = Math.max(200, Math.floor(container.clientWidth || 300));
      const cssHeight = Math.floor(cssWidth * aspect);
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.style.width = cssWidth + 'px';
      canvas.style.height = cssHeight + 'px';
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);

    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform sampler2D u_bamboo;
      uniform sampler2D u_bg;
      uniform float u_time;
      uniform float u_amplitude;
      uniform float u_speed;
      uniform float u_chromaThreshold;
      uniform vec3 u_colorAdjust; 
      uniform vec3 u_bgParams;    
      varying vec2 v_texCoord;

      vec3 applyColorAdjust(vec3 color, float b, float c, float s) {
        color *= b;
        color = (color - 0.5) * c + 0.5;
        float gray = dot(color, vec3(0.299, 0.587, 0.114));
        return mix(vec3(gray), color, s);
      }

      void main() {
        vec2 bgUV = (v_texCoord - 0.5) / u_bgParams.x + 0.5;
        bgUV.x -= u_bgParams.y;
        bgUV.y -= u_bgParams.z;
        vec4 bgColor = texture2D(u_bg, bgUV);

        // Strength falloff: rigid base (y=0) transitions to flexible top (y=1)
        float strength = pow(1.0 - v_texCoord.y, 2.8);
        
        // Primary sway with multiple harmonics for organic motion
        float baseSway = sin(u_time * u_speed + v_texCoord.y * 10.0);
        float secondarySway = sin(u_time * u_speed * 0.6 + v_texCoord.y * 5.0) * 0.6;
        float tertiarySway = sin(u_time * u_speed * 1.8 + v_texCoord.y * 15.0) * 0.3;
        
        float sway = (baseSway + secondarySway + tertiarySway) * u_amplitude * strength;
        
        // Subtle vertical compression/extension during sway
        float verticalCompress = (1.0 - abs(baseSway) * 0.08) * 0.02 * strength;
        
        // Scale bamboo smaller for sense of space
        float bambooScale = 0.7;
        vec2 scaledCoord = (v_texCoord - 0.5) / bambooScale + 0.5;
        scaledCoord.y -= 0.2; // Move bamboo down to align with ground
        vec2 bambooUV = vec2(scaledCoord.x - sway, scaledCoord.y - verticalCompress);
        
        vec4 bambooColor = texture2D(u_bamboo, bambooUV);

        float brightness = (bambooColor.r + bambooColor.g + bambooColor.b) / 3.0;
        float diff = abs(bambooColor.r - bambooColor.g) + abs(bambooColor.g - bambooColor.b);
        
        float alpha = 1.0;
        if (brightness > (1.0 - u_chromaThreshold) && diff < 0.1) {
          alpha = 0.0;
        }

        // Strong root blending at the very bottom
        float rootBlend = smoothstep(0.75, 1.0, v_texCoord.y);
        alpha *= (1.0 - rootBlend * 0.85);

        bambooColor.rgb = applyColorAdjust(bambooColor.rgb, u_colorAdjust.x, u_colorAdjust.y, u_colorAdjust.z);
        gl_FragColor = mix(bgColor, vec4(bambooColor.rgb, 1.0), alpha * bambooColor.a);
      }
    `;

    const compileShader = (source, type) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram();
    gl.attachShader(program, compileShader(vsSource, gl.VERTEX_SHADER));
    gl.attachShader(program, compileShader(fsSource, gl.FRAGMENT_SHADER));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 0, 1,   1, -1, 1, 1,   -1,  1, 0, 0,
      -1,  1, 0, 0,   1, -1, 1, 1,    1,  1, 1, 0,
    ]), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, "a_position");
    const texCoordLoc = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 16, 8);

    const loadTexture = (url) => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      const img = new Image();
      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      };
      img.src = url;
      return tex;
    };

    const bambooTex = loadTexture(bambooSrc);
    const bgTex = loadTexture(bgSrc);

    const uBambooLoc = gl.getUniformLocation(program, "u_bamboo");
    const uBgLoc = gl.getUniformLocation(program, "u_bg");
    const uTimeLoc = gl.getUniformLocation(program, "u_time");
    const uAmpLoc = gl.getUniformLocation(program, "u_amplitude");
    const uSpeedLoc = gl.getUniformLocation(program, "u_speed");
    const uChromaLoc = gl.getUniformLocation(program, "u_chromaThreshold");
    const uColorLoc = gl.getUniformLocation(program, "u_colorAdjust");
    const uBgParamsLoc = gl.getUniformLocation(program, "u_bgParams");

    let startTime = Date.now();
    let animationFrameId;

    const render = () => {
      const now = (Date.now() - startTime) * 0.001;
      
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform1f(uTimeLoc, now);
      gl.uniform1f(uAmpLoc, params.amplitude);
      gl.uniform1f(uSpeedLoc, params.speed);
      gl.uniform1f(uChromaLoc, params.chromaThreshold);
      gl.uniform3f(uColorLoc, params.brightness, params.contrast, params.saturation);
      gl.uniform3f(uBgParamsLoc, params.bgScale, params.bgOffsetX, params.bgOffsetY);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, bambooTex);
      gl.uniform1i(uBambooLoc, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bgTex);
      gl.uniform1i(uBgLoc, 1);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvases);
    };
  }, [params]);
  

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white p-2 sm:p-4 overflow-x-hidden w-screen">
      {showSplash && (
        <SplashPortal>
          <div style={{position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)'}}>
            <div style={{
              width: 'min(560px, 92%)',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              border: '4px solid rgba(125,211,198,0.7)',
              background: 'linear-gradient(180deg,#0b3a2b,#072b23)'
            }} role="dialog" aria-modal="true">
              <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(0,0,0,0.06))'}}>
                <div style={{width:44, height:44, borderRadius:8, background:'#082f24', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid rgba(255,255,255,0.06)'}}>
                  <div style={{fontSize:22}}>🎍</div>
                </div>
                <div>
                  <div style={{fontSize:18, fontWeight:700, color:'#ffffff'}}>Welcome</div>
                  <div style={{fontSize:12, color:'rgba(255,255,255,0.85)', marginTop:2, fontFamily:'monospace'}}>Bamboo — animated by your local wind</div>
                </div>
                <button onClick={dismissSplash} aria-label="Close" style={{marginLeft:'auto', background:'#ffffff', color:'#083529', border:'none', borderRadius:6, padding:'6px 8px', fontWeight:700}}>✕</button>
              </div>

              <div style={{padding:16, background:'linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.03))'}}>
                <p style={{color:'rgba(255,255,255,0.95)', fontSize:14, lineHeight:1.45, margin:0}}>We ask for your device's approximate location only to fetch local wind speed so the bamboo sways realistically for your area. We do not store precise coordinates — the location is used only to drive the animation.</p>

                <div style={{display:'flex', justifyContent:'flex-end', gap:10, marginTop:16}}>
                  <button onClick={dismissSplash} style={{padding:'8px 12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', color:'#ffffff', borderRadius:8, fontWeight:700}}>Not now</button>
                  <button onClick={acceptSplash} style={{padding:'8px 14px', background:'#a3e635', color:'#063f2a', borderRadius:8, fontWeight:800, boxShadow:'0 6px 18px rgba(163,230,53,0.14)'}}>OK, allow location</button>
                </div>

                <div style={{marginTop:10, fontSize:11, color:'rgba(255,255,255,0.65)', fontFamily:'monospace'}}>Appears once; clear site data to see again.</div>
              </div>
            </div>
          </div>
        </SplashPortal>
      )}
      <div ref={containerRef} className="relative bg-black rounded-xl overflow-hidden shadow-2xl border border-neutral-700 mb-4 w-full lg:max-w-2xl max-h-[90vh]">
        <canvas ref={canvasRef} className="w-full h-auto block object-contain z-0 relative" />
        {/* DOM-based info overlay (removed duplicate) */}

        {/* Wind Toggles Overlay - Mobile Responsive */}
        <div className="fixed left-1/2 transform -translate-x-1/2 bottom-6 z-50 w-[92%] max-w-2xl px-2" style={{maxWidth: 'calc(100vw - 16px)'}}>
          <div style={{borderRadius:28, padding:12, backdropFilter:'blur(10px)', background:'linear-gradient(180deg, rgba(0,0,0,0.5), rgba(12,18,16,0.75))', boxShadow:'0 20px 50px rgba(2,6,23,0.6)'}} className="mx-auto border border-white/8">
            <div style={{display:'flex', alignItems:'center', gap:12, flexWrap:'wrap'}}>
              <div style={{flex:'0 0 auto', minWidth:220, padding:'8px 12px', borderRadius:12, background:'linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.06))'}}>
                <div style={{fontFamily:'Palatino, Georgia, serif', color:'#f8fafc', fontWeight:800, fontSize:13, letterSpacing:1, marginBottom:6}}>📍 LOCATION</div>
                <div style={{fontFamily:'Georgia, serif', color:'#fff', fontSize:15, fontWeight:700}}>{locationName || 'Loading...'}</div>
                <div style={{height:8}} />
                <div style={{fontFamily:'Palatino, Georgia, serif', color:'#f8fafc', fontWeight:800, fontSize:13, letterSpacing:1, marginBottom:6}}>💨 WIND SPEED</div>
                <div style={{fontFamily:'Georgia, serif', color:'#fff', fontSize:15, fontWeight:700}}>{windSpeed !== null ? `${windSpeed.toFixed(1)} km/h - ${activeWind}` : 'Loading...'}</div>
              </div>

              <div style={{flex:'1 1 320px', minWidth:160}}>
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(70px, 1fr))', gap:8, padding:'6px'}} role="tablist" aria-label="Wind presets">
                  {Object.keys(windPresets).map((level) => (
                    <button
                      key={level}
                      role="tab"
                      aria-pressed={activeWind === level}
                      onClick={() => { triggerHaptic(); handleWindChange(level); }}
                      style={{padding:'10px 14px', borderRadius:999, fontWeight:800, fontFamily:'Georgia, serif', letterSpacing:0.8}}
                      className={
                        (activeWind === level
                          ? 'bg-amber-300 text-emerald-900 shadow-md'
                          : 'bg-transparent text-white/90 border border-white/6 hover:bg-white/5')
                      }>
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cat companion - positioned outside container at page level */}
      {(activeWind === 'Calm' || activeWind === 'Breeze') && (
        <div style={{
          position:'fixed',
          left: `${catPos.x}px`,
          top: `${catPos.y}px`,
          width:'270px',
          height:'351px',
          zIndex:10,
          opacity:0.95,
          pointerEvents:'none'
        }}>
          <img src="/catr.png" alt="Calm winds cat" style={{width:'100%', height:'100%', objectFit:'contain'}} />
        </div>
      )}

      {/* Audio toggle button - always visible when location accepted */}
      {acceptedLocation && (
        <button
          onClick={toggleAudio}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: isAudioPlaying 
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'linear-gradient(135deg, #6b7280, #4b5563)',
            border: '2px solid rgba(255,255,255,0.2)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            zIndex: 1000,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          aria-label={isAudioPlaying ? 'Mute music' : 'Play music'}
        >
          {isAudioPlaying ? '🔊' : '🔇'}
        </button>
      )}

      {/* Testing Controls - Commented Out */}
      {/* <div className="w-full max-w-5xl bg-neutral-800 p-6 rounded-xl border border-neutral-700 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest font-mono">Environment</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase text-neutral-500 flex justify-between">Zoom <span>{Math.round(params.bgScale * 100)}%</span></label>
              <input type="range" min="0.5" max="3" step="0.01" value={params.bgScale} onChange={(e) => setParams({...params, bgScale: parseFloat(e.target.value)})} className="w-full accent-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase text-neutral-500">H-Pos</label>
                <input type="range" min="-1" max="1" step="0.01" value={params.bgOffsetX} onChange={(e) => setParams({...params, bgOffsetX: parseFloat(e.target.value)})} className="w-full accent-blue-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-neutral-500">V-Pos</label>
                <input type="range" min="-1" max="1" step="0.01" value={params.bgOffsetY} onChange={(e) => setParams({...params, bgOffsetY: parseFloat(e.target.value)})} className="w-full accent-blue-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-green-400 uppercase tracking-widest font-mono">Wind Calibration</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase text-neutral-500 flex justify-between">Manual Force <span>{params.amplitude.toFixed(3)}</span></label>
              <input type="range" min="0" max="0.4" step="0.001" value={params.amplitude} onChange={(e) => setParams({...params, amplitude: parseFloat(e.target.value)})} className="w-full accent-green-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase text-neutral-500 flex justify-between">Manual Speed</label>
              <input type="range" min="0.1" max="10.0" step="0.1" value={params.speed} onChange={(e) => setParams({...params, speed: parseFloat(e.target.value)})} className="w-full accent-green-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase text-red-500 flex justify-between">Chroma Key</label>
              <input type="range" min="0" max="1" step="0.01" value={params.chromaThreshold} onChange={(e) => setParams({...params, chromaThreshold: parseFloat(e.target.value)})} className="w-full accent-red-500" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-orange-400 uppercase tracking-widest font-mono">Color Engine</h3>
          <div className="grid grid-cols-1 gap-2">
            {['brightness', 'contrast', 'saturation'].map(p => (
              <div key={p}>
                <label className="text-[10px] uppercase text-neutral-500 flex justify-between">{p}</label>
                <input type="range" min="0" max="2" step="0.01" value={params[p]} onChange={(e) => setParams({...params, [p]: parseFloat(e.target.value)})} className="w-full accent-orange-500" />
              </div>
            ))}
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default App;
