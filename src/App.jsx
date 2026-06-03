import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  Aperture, Camera, ChevronDown, Clipboard, Download, ImageIcon, Shuffle, Sparkles, Upload
} from "lucide-react";

const ALL_STYLES = [
  { id: "ascii", name: "ASCII", tag: "01", desc: "Brightness mapped glyph field." },
  { id: "braille", name: "BRAILLE", tag: "02", desc: "Unicode Braille cell encoding." },
  { id: "matrix", name: "MATRIX", tag: "03", desc: "Falling code animation from feed." },
  { id: "crosshatch", name: "CROSSHATCH", tag: "04", desc: "Directional lines by brightness." },
  { id: "pixelsort", name: "PIXEL SORT", tag: "05", desc: "Gravity threshold sorting." },
  { id: "sobel", name: "EDGE TRACE", tag: "06", desc: "Sobel operator edge detection." },
  { id: "pixel", name: "8-BIT", tag: "07", desc: "Nearest-neighbor palette posterize." },
  { id: "glitch", name: "GLITCH", tag: "08", desc: "RGB split, bands, scan corruption." },
  { id: "halftone", name: "HALFTONE", tag: "09", desc: "Newspaper dot simulation." },
  { id: "lowpoly", name: "LOW POLY", tag: "10", desc: "Triangular code-art facets." },
  { id: "vignette", name: "VIGNETTE", tag: "11", desc: "Deep lens shading and borders." },
  { id: "glass", name: "GLASS", tag: "12", desc: "Cell shards and lead borders." },
  { id: "comic", name: "COMIC", tag: "13", desc: "Flat color, ink edges, Ben-Day." },
  { id: "film", name: "35MM", tag: "14", desc: "Grain, halation, analog grade." },
  { id: "dream", name: "DREAM", tag: "15", desc: "Prism bloom and diffusion." },
  { id: "print", name: "LO-FI PRINT", tag: "16", desc: "Dust, scratches, light leaks." },
  { id: "kinetic", name: "KINETIC", tag: "17", desc: "Motion trails and zoom burst." },
  { id: "dither", name: "DITHER", tag: "18", desc: "Atkinson/Floyd two-tone grit." },
];

const PALETTES = {
  green: { label: "Terminal Green", fg: "#00ff66", bg: "#000000", alt: "#083b1c" },
  amber: { label: "Amber Phosphor", fg: "#ffb000", bg: "#0a0800", alt: "#4b3200" },
  ibm: { label: "IBM Blue", fg: "#e8ecff", bg: "#001a8f", alt: "#00a6ff" },
  synth: { label: "Synthwave", fg: "#ff4dff", bg: "#09000f", alt: "#00e5ff" },
  mono: { label: "Monochrome", fg: "#f5f2e8", bg: "#050505", alt: "#8f8f8f" },
  solar: { label: "Solarized", fg: "#93a1a1", bg: "#002b36", alt: "#b58900" },
};

function clamp(value, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value));
}

function seededNoise(seed) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}

function getAsciiChar(brightness, density) {
  const chars = " .'`^,:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  return chars[Math.floor((brightness / 255) * (chars.length - 1))];
}

function getMatrixChar() {
  const chars = "ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ";
  return chars[Math.floor(Math.random() * chars.length)];
}

function renderNonTextFilter(ctx, styleId, settings, width, height) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const getLum = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

  if (styleId === "pixelsort") {
    const threshold = settings.density * 2.5;
    for (let x = 0; x < width; x++) {
      let col = [];
      for (let y = 0; y < height; y++) {
        const i = (y * width + x) * 4;
        col.push({ r: data[i], g: data[i+1], b: data[i+2], a: data[i+3], lum: getLum(i) });
      }
      let start = -1;
      for (let y = 0; y <= height; y++) {
        if (y < height && col[y].lum > threshold) {
          if (start === -1) start = y;
        } else {
          if (start !== -1) {
            const chunk = col.slice(start, y);
            chunk.sort((a, b) => a.lum - b.lum);
            for (let k = 0; k < chunk.length; k++) col[start + k] = chunk[k];
            start = -1;
          }
        }
      }
      for (let y = 0; y < height; y++) {
        const i = (y * width + x) * 4;
        data[i] = col[y].r; data[i+1] = col[y].g; data[i+2] = col[y].b; data[i+3] = col[y].a;
      }
    }
    ctx.putImageData(imgData, 0, 0);

  } else if (styleId === "sobel") {
    const target = ctx.createImageData(width, height);
    const tdata = target.data;
    const kX = [-1,0,1, -2,0,2, -1,0,1];
    const kY = [-1,-2,-1, 0,0,0, 1,2,1];
    
    for(let y=1; y<height-1; y++) {
      for(let x=1; x<width-1; x++) {
        let px=0, py=0;
        for(let ky=-1; ky<=1; ky++) {
          for(let kx=-1; kx<=1; kx++) {
            const idx = ((y+ky)*width + (x+kx))*4;
            const val = getLum(idx);
            const kIdx = (ky+1)*3 + (kx+1);
            px += val * kX[kIdx];
            py += val * kY[kIdx];
          }
        }
        const mag = Math.min(255, Math.sqrt(px*px + py*py) * (settings.density/50));
        const i = (y*width + x)*4;
        tdata[i] = mag; tdata[i+1] = mag; tdata[i+2] = mag; tdata[i+3] = 255;
      }
    }
    ctx.putImageData(target, 0, 0);

  } else if (styleId === "crosshatch") {
    ctx.fillStyle = PALETTES[settings.palette].bg;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = PALETTES[settings.palette].fg;
    ctx.lineWidth = 1;
    const step = Math.max(3, Math.round(settings.fontSize / 2));
    
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        const b = getLum(i);
        ctx.beginPath();
        if (b < 200) { ctx.moveTo(x, y); ctx.lineTo(x + step, y + step); }
        if (b < 150) { ctx.moveTo(x + step, y); ctx.lineTo(x, y + step); }
        if (b < 100) { ctx.moveTo(x, y + step / 2); ctx.lineTo(x + step, y + step / 2); }
        if (b < 50)  { ctx.moveTo(x + step / 2, y); ctx.lineTo(x + step / 2, y + step); }
        ctx.stroke();
      }
    }

  } else if (styleId === "vignette") {
    const grad = ctx.createRadialGradient(width/2, height/2, width * (settings.bloom/200), width/2, height/2, width * 0.8);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (styleId === "glitch") {
    const copy = new Uint8ClampedArray(data);
    const offset = Math.round(settings.chromatic * 0.28) + 2;
    for (let y = 0; y < height; y++) {
      const bandShift = Math.sin(y * 0.08) * settings.density * 0.18;
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const xr = clamp(Math.round(x + offset + bandShift), 0, width - 1);
        const xb = clamp(Math.round(x - offset + bandShift), 0, width - 1);
        data[i] = copy[(y * width + xr) * 4];
        data[i + 2] = copy[(y * width + xb) * 4 + 2];
        if (y % 19 === 0) data[i + 1] = clamp(data[i + 1] + 90);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
}

function downloadBlob(blob, filename) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

function Slider({ label, value, setValue, min=0, max=100 }) {
  return (
    <div className="group relative">
      <div className="mb-1 flex justify-between text-[10px] uppercase text-ghost">
        <span>{label}</span>
        <span className="text-volt">[ {value} ]</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden border border-bone/25 bg-black">
        <div
          className="absolute bottom-0 left-0 top-0 bg-bone transition-all duration-75 group-hover:bg-volt"
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-crosshair opacity-0"
        />
      </div>
    </div>
  );
}

export default function App() {
  const [styleId, setStyleId] = useState("ascii");
  const [palette, setPalette] = useState("green");
  const [fontSize, setFontSize] = useState(12);
  const [density, setDensity] = useState(64);
  const [grain, setGrain] = useState(36);
  const [bloom, setBloom] = useState(42);
  const [chromatic, setChromatic] = useState(18);
  const [contrast, setContrast] = useState(100);
  const [brightnessVal, setBrightnessVal] = useState(100);
  const [colorize, setColorize] = useState(false);
  const [useWebcam, setUseWebcam] = useState(true);
  const [isolateSubject, setIsolateSubject] = useState(true);
  const [toast, setToast] = useState("");
  const [history, setHistory] = useState([]);

  const canvasRef = useRef(null);
  const hiddenCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const prevFrameRef = useRef(null);
  const segmenterRef = useRef(null);
  
  const videoRef = useRef(null);
  const staticImgRef = useRef(null);
  const animationRef = useRef(null);
  const outputRef = useRef(null);
  
  const activePalette = PALETTES[palette];

  const settings = useMemo(() => ({
    fontSize, density, grain, bloom, chromatic, contrast, brightness: brightnessVal, palette, colorize, isolateSubject
  }), [fontSize, density, grain, bloom, chromatic, contrast, brightnessVal, palette, colorize, isolateSubject]);

  const flash = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1200);
  }, []);

  useEffect(() => {
    let active = true;
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        const segmenter = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          outputCategoryMask: true,
          outputConfidenceMasks: false
        });
        if (active) {
            segmenterRef.current = segmenter;
            console.log("MediaPipe Segmenter Loaded");
        }
      } catch (err) { console.error("MediaPipe failed to load", err); }
    };
    initMediaPipe();
    return () => { active = false; };
  }, []);

  const addHistory = useCallback(() => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const label = ALL_STYLES.find(s => s.id === styleId)?.name || styleId;
    setHistory((items) => [{ id: Date.now(), value: url, label }, ...items].slice(0, 5));
    flash("[ FRAME SNAPPED ]");
  }, [styleId, flash]);

  const handleFile = useCallback((file) => {
    if (!file || !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      flash("[ IMAGE TYPE REJECTED ]");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        staticImgRef.current = img;
        setUseWebcam(false);
        flash("[ IMAGE LOADED ]");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }, [flash]);

  useEffect(() => {
    if (!hiddenCanvasRef.current) hiddenCanvasRef.current = document.createElement("canvas");
    if (!maskCanvasRef.current) maskCanvasRef.current = document.createElement("canvas");
    
    if (!useWebcam) {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch((err) => {
        console.error(err);
        flash("[ WEBCAM DENIED ]");
        setUseWebcam(false);
      });
      
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, [useWebcam, flash]);

  const drawFrame = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false });
    
    let sourceImg = null;
    if (useWebcam && videoRef.current && videoRef.current.readyState >= 2) {
      sourceImg = videoRef.current;
    } else if (!useWebcam && staticImgRef.current) {
      sourceImg = staticImgRef.current;
    }
    
    if (sourceImg) {
        const parent = canvas.parentElement;
        if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        }
        
        const isTextMode = ["ascii", "braille", "matrix"].includes(styleId);
        const fSize = settings.fontSize;
        const charWidth = fSize * 0.6;
        
        let cols = isTextMode ? Math.floor(canvas.width / charWidth) : canvas.width;
        let rows = isTextMode ? Math.floor(canvas.height / fSize) : canvas.height;
        
        if (!isTextMode) {
           const maxSize = 800;
           const ratio = Math.min(maxSize / cols, maxSize / rows, 1);
           cols = Math.round(cols * ratio);
           rows = Math.round(rows * ratio);
        }
        
        if (cols <= 0 || rows <= 0) {
            if (useWebcam) animationRef.current = requestAnimationFrame(drawFrame);
            return;
        }

        const hiddenCanvas = hiddenCanvasRef.current;
        if (hiddenCanvas.width !== cols || hiddenCanvas.height !== rows) {
           hiddenCanvas.width = cols;
           hiddenCanvas.height = rows;
           prevFrameRef.current = null;
        }
        
        const hctx = hiddenCanvas.getContext("2d", { willReadFrequently: true });
        
        // 1. Segmentation
        if (settings.isolateSubject && segmenterRef.current) {
            try {
               const result = segmenterRef.current.segmentForVideo(sourceImg, performance.now());
               if (result.categoryMask) {
                  const mask = result.categoryMask;
                  const mCanvas = maskCanvasRef.current;
                  if (mCanvas.width !== mask.width || mCanvas.height !== mask.height) {
                     mCanvas.width = mask.width; mCanvas.height = mask.height;
                  }
                  const mctx = mCanvas.getContext("2d", {willReadFrequently: true});
                  const idata = mctx.createImageData(mask.width, mask.height);
                  const arr = mask.getAsUint8Array();
                  for(let i=0; i<arr.length; i++) {
                     idata.data[i*4+3] = arr[i] > 0 ? 255 : 0; 
                  }
                  mctx.putImageData(idata, 0, 0);
               }
            } catch(e) {}
        }
        
        // 2. Draw downsampled source
        hctx.save();
        if (useWebcam) {
            hctx.translate(cols, 0);
            hctx.scale(-1, 1);
        }
        hctx.drawImage(sourceImg, 0, 0, cols, rows);
        hctx.restore();
        
        // 3. Mask out background
        if (settings.isolateSubject && maskCanvasRef.current.width > 0) {
            hctx.save();
            if (useWebcam) { hctx.translate(cols, 0); hctx.scale(-1, 1); }
            hctx.globalCompositeOperation = "destination-in";
            hctx.drawImage(maskCanvasRef.current, 0, 0, cols, rows);
            hctx.globalCompositeOperation = "destination-over";
            hctx.fillStyle = "black";
            hctx.fillRect(0, 0, cols, rows); 
            hctx.restore();
        }
        
        const frameData = hctx.getImageData(0, 0, cols, rows);
        const data = frameData.data;
        
        // 4. Color Correction & Smoothing
        const contrastFactor = (259 * (settings.contrast * 2.55 + 255)) / (255 * (259 - settings.contrast * 2.55));
        for (let i = 0; i < data.length; i+=4) {
            for (let c=0; c<3; c++) {
               let v = data[i+c];
               v = v * (settings.brightness / 100);
               v = ((v / 255 - 0.5) * (settings.contrast / 100) + 0.5) * 255;
               data[i+c] = Math.max(0, Math.min(255, v));
            }
        }
        
        if (!prevFrameRef.current || prevFrameRef.current.length !== data.length) {
            prevFrameRef.current = new Float32Array(data.length);
            for(let i=0; i<data.length; i++) prevFrameRef.current[i] = data[i];
        }
        const prev = prevFrameRef.current;
        const inertia = 0.65;
        for(let i=0; i<data.length; i++) {
            const nv = prev[i] + (data[i] - prev[i]) * (1 - inertia);
            prev[i] = nv;
            data[i] = nv;
        }
        
        // 5. Render
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (isTextMode) {
            ctx.font = `${fSize}px 'JetBrains Mono', monospace`;
            ctx.textBaseline = "top";
            
            const palette = PALETTES[settings.palette];
            if (styleId === 'matrix') ctx.fillStyle = palette.fg;
            else if (styleId === 'ascii' && !settings.colorize) ctx.fillStyle = palette.fg;
            
            if (styleId === 'braille') {
                const bRows = Math.floor(rows / 4);
                const bCols = Math.floor(cols / 2);
                ctx.fillStyle = palette.fg;
                for (let r = 0; r < bRows; r++) {
                   let rowText = "";
                   for (let c = 0; c < bCols; c++) {
                      let code = 0;
                      const dots = [[1, 8], [2, 16], [4, 32], [64, 128]];
                      for (let dy=0; dy<4; dy++) {
                          for(let dx=0; dx<2; dx++) {
                             const x = c*2 + dx;
                             const y = r*4 + dy;
                             if (x >= cols || y >= rows) continue;
                             const offset = (y * cols + x) * 4;
                             const lum = 0.2126*data[offset] + 0.7152*data[offset+1] + 0.0722*data[offset+2];
                             if (lum > settings.density * 2.5) code += dots[dy][dx];
                          }
                      }
                      rowText += code > 0 ? String.fromCharCode(0x2800 + code) : " ";
                   }
                   ctx.fillText(rowText, 0, r * 4 * fSize);
                }
            } else {
                for (let y = 0; y < rows; y++) {
                    let rowText = "";
                    for (let x = 0; x < cols; x++) {
                       const offset = (y * cols + x) * 4;
                       const r = data[offset], g = data[offset+1], b = data[offset+2];
                       let lum = 0.2126*r + 0.7152*g + 0.0722*b;
                       
                       if (styleId === 'ascii') {
                           if (settings.colorize) {
                              const char = getAsciiChar(lum, settings.density);
                              ctx.fillStyle = `rgb(${r},${g},${b})`;
                              ctx.fillText(char, x * charWidth, y * fSize);
                           } else {
                              rowText += getAsciiChar(lum, settings.density);
                           }
                       } else if (styleId === 'matrix') {
                           if (lum > settings.density * 2) {
                              ctx.fillStyle = `rgb(0, ${Math.max(100, lum)}, 0)`;
                              ctx.fillText(getMatrixChar(), x * charWidth, y * fSize);
                           }
                       }
                    }
                    if (styleId === 'ascii' && !settings.colorize) {
                       ctx.fillText(rowText, 0, y * fSize);
                    }
                }
            }
        } else {
            hctx.putImageData(new ImageData(new Uint8ClampedArray(data), cols, rows), 0, 0);
            renderNonTextFilter(hctx, styleId, settings, cols, rows);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(hiddenCanvas, 0, 0, canvas.width, canvas.height);
        }
    }
    
    if (useWebcam) {
       animationRef.current = requestAnimationFrame(drawFrame);
    }
  }, [useWebcam, styleId, settings]);

  useEffect(() => {
    if (useWebcam) {
       animationRef.current = requestAnimationFrame(drawFrame);
       return () => cancelAnimationFrame(animationRef.current);
    } else {
       drawFrame();
    }
  }, [drawFrame, useWebcam]);

  const downloadPng = async () => {
    if (canvasRef.current) {
      canvasRef.current.toBlob((blob) => blob && downloadBlob(blob, `glyph_dsgn-${styleId}.png`), "image/png", 1);
      flash("[ PNG SAVED ]");
    }
  };

  const randomize = () => {
    setStyleId(ALL_STYLES[Math.floor(Math.random() * ALL_STYLES.length)].id);
    setDensity(Math.round(30 + Math.random() * 62));
    setGrain(Math.round(Math.random() * 70));
    setBloom(Math.round(Math.random() * 82));
    setChromatic(Math.round(Math.random() * 52));
    setContrast(Math.round(80 + Math.random() * 40));
    setBrightnessVal(Math.round(80 + Math.random() * 40));
    setFontSize(Math.round(8 + Math.random() * 16));
    flash("[ RANDOMIZED ]");
  };

  return (
    <main 
      className="min-h-screen bg-deck text-bone flex flex-col"
      style={{ "--color-accent": activePalette.fg, "--bg-accent": activePalette.bg }}
    >
      <div className="grid min-h-screen flex-1 grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="border-b border-bone/25 bg-black xl:border-b-0 xl:border-r flex flex-col h-screen overflow-hidden">
            <div className="border-b border-bone/25 p-5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase text-ghost">client side art machine</p>
                  <h1 className="mt-2 text-2xl font-black uppercase tracking-normal">GLYPH_DSGN</h1>
                </div>
                <Sparkles className="h-5 w-5 text-volt" aria-hidden="true" />
              </div>
            </div>

            <div className="grid grid-cols-2 border-b border-bone/25 flex-shrink-0">
              <button
                className={`flex items-center justify-center gap-2 border-r border-bone/25 px-4 py-4 text-xs uppercase transition-colors duration-75 ${useWebcam ? "bg-bone text-black" : "hover:bg-white/10"}`}
                onClick={() => setUseWebcam(true)}
              >
                <Camera className="h-4 w-4" /> Live
              </button>
              <label
                className={`flex cursor-pointer items-center justify-center gap-2 px-4 py-4 text-xs uppercase transition-colors duration-75 ${!useWebcam ? "bg-bone text-black" : "hover:bg-white/10"}`}
              >
                <ImageIcon className="h-4 w-4" /> Upload
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="grid gap-2">
                {ALL_STYLES.map((style) => (
                  <button
                    key={style.id}
                    className={`group grid grid-cols-[42px_1fr] items-center border p-3 text-left transition-colors duration-75 ${styleId === style.id ? "border-volt bg-volt text-black" : "border-bone/25 bg-black hover:border-bone"}`}
                    onClick={() => setStyleId(style.id)}
                    title={style.desc}
                  >
                    <span className="flex h-8 w-8 items-center justify-center border border-current text-[10px]">{style.tag}</span>
                    <span className="pl-3 text-sm font-bold uppercase tracking-widest">{style.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-bone/25 bg-black p-3 flex-shrink-0">
              <button onClick={randomize} className="group flex w-full items-center justify-center gap-2 border border-bone/25 bg-black py-4 text-xs font-bold uppercase tracking-widest text-ghost transition-colors hover:border-volt hover:text-volt">
                <Shuffle className="h-4 w-4" /> Randomize
              </button>
            </div>
        </aside>

        <section className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-deck p-8" ref={outputRef}>
          <video ref={videoRef} className="hidden" playsInline muted autoPlay />
          <div className="relative flex h-full w-full items-center justify-center">
            <canvas ref={canvasRef} className="max-h-full max-w-full object-contain shadow-2xl" />
          </div>

          <div className="pointer-events-none absolute bottom-8 left-8 flex flex-col gap-1">
            <div className="flex gap-2">
              <span className="bg-volt px-2 py-1 text-[10px] font-bold uppercase text-black">REC</span>
              <span className="bg-black px-2 py-1 text-[10px] uppercase text-bone border border-bone/25">
                {ALL_STYLES.find((s) => s.id === styleId)?.name}
              </span>
            </div>
            {toast && <span className="animate-pulse bg-bone px-2 py-1 text-[10px] font-bold uppercase text-black">{toast}</span>}
          </div>
          <div className="pointer-events-none absolute bottom-8 right-8 text-right text-[10px] text-ghost opacity-50">
            <div>DSGN_SYS v1.1.0</div>
            <div>[AI ACCELERATED]</div>
          </div>
        </section>

        <aside className="flex flex-col border-t border-bone/25 bg-black xl:border-l xl:border-t-0 h-screen overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid gap-6">
              <div className="grid gap-2">
                <span className="text-[10px] uppercase text-ghost">Palette</span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PALETTES).map(([key, value]) => (
                    <button
                      key={key} onClick={() => setPalette(key)}
                      className={`flex h-8 items-center justify-between border px-2 text-[10px] uppercase transition-colors ${palette === key ? "border-volt text-volt" : "border-bone/25 text-ghost hover:border-bone"}`}
                    >
                      <span>{key}</span>
                      <div className="flex h-4 w-4 border border-current" style={{ backgroundColor: value.bg }}>
                        <div className="h-full w-1/2" style={{ backgroundColor: value.fg }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <span className="border-b border-bone/25 pb-2 text-[10px] uppercase text-ghost">Parameters</span>
                
                <label className="group flex cursor-pointer items-center justify-between border border-bone/25 px-3 py-3 hover:border-volt">
                  <span className="text-[10px] uppercase font-bold text-ghost group-hover:text-volt">Isolate Subject</span>
                  <input type="checkbox" checked={isolateSubject} onChange={(e) => setIsolateSubject(e.target.checked)} className="accent-volt" />
                </label>

                <Slider label="Font Size" value={fontSize} setValue={setFontSize} min={6} max={48} />
                <Slider label="Density" value={density} setValue={setDensity} min={0} max={100} />
                <Slider label="Contrast" value={contrast} setValue={setContrast} min={0} max={200} />
                <Slider label="Brightness" value={brightnessVal} setValue={setBrightnessVal} min={0} max={200} />
                <Slider label="Grain" value={grain} setValue={setGrain} min={0} max={100} />
                
                <label className="group flex cursor-pointer items-center justify-between border border-bone/25 px-3 py-2 hover:border-volt">
                  <span className="text-[10px] uppercase text-ghost group-hover:text-volt">Colorize Output</span>
                  <input type="checkbox" checked={colorize} onChange={(e) => setColorize(e.target.checked)} className="accent-volt" />
                </label>
              </div>

              <div className="grid gap-2">
                <span className="border-b border-bone/25 pb-2 text-[10px] uppercase text-ghost">Export</span>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={downloadPng} className="flex items-center justify-center gap-2 border border-bone/25 bg-black py-3 text-[10px] font-bold uppercase text-ghost hover:border-volt hover:bg-volt hover:text-black">
                    <Download className="h-3 w-3" /> PNG
                  </button>
                  <button onClick={addHistory} className="flex items-center justify-center gap-2 border border-bone/25 bg-black py-3 text-[10px] font-bold uppercase text-ghost hover:border-volt hover:bg-volt hover:text-black">
                    <Camera className="h-3 w-3" /> SNAP
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="h-48 border-t border-bone/25 bg-black p-3 xl:h-auto xl:flex-shrink-0 xl:border-b xl:border-t-0">
            <span className="mb-2 block text-[10px] uppercase text-ghost">Cache Memory</span>
            <div className="flex h-[calc(100%-1.5rem)] gap-2 overflow-x-auto xl:h-24">
              {history.length === 0 && (
                <div className="flex h-full w-full items-center justify-center border border-dashed border-bone/25 p-4 text-center text-[10px] text-ghost">
                  NO SNAPS
                </div>
              )}
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = item.value; link.download = `glyph_dsgn-snap-${item.id}.png`; link.click();
                  }}
                  className="group relative h-full w-24 flex-shrink-0 border border-bone/25"
                >
                  <img alt="" src={item.value} className="h-full w-full object-cover grayscale transition-all group-hover:grayscale-0" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <Download className="h-4 w-4 text-volt" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
