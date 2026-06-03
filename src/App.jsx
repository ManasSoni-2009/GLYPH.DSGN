import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import {
  Aperture,
  Camera,
  ChevronDown,
  Clipboard,
  Download,
  Image as ImageIcon,
  Shuffle,
  Sparkles,
  Upload,
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

function brightness(data, i) {
  return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function paletteColor(value, palette) {
  const fg = hexToRgb(palette.fg);
  const bg = hexToRgb(palette.bg);
  const t = value / 255;
  return [
    Math.round(bg[0] + (fg[0] - bg[0]) * t),
    Math.round(bg[1] + (fg[1] - bg[1]) * t),
    Math.round(bg[2] + (fg[2] - bg[2]) * t),
  ];
}

function posterizeChannel(value, steps) {
  return Math.round(Math.round(value / (255 / (steps - 1))) * (255 / (steps - 1)));
}

function mutatePixels(ctx, fn) {
  const { width, height } = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) fn(data, i, i / 4, width, height);
  ctx.putImageData(imageData, 0, 0);
}

function addGrain(ctx, amount, colored = false) {
  if(amount <= 0) return;
  mutatePixels(ctx, (data, i, p) => {
    const n = (seededNoise(p + amount) - 0.5) * amount;
    data[i] = clamp(data[i] + n * (colored ? 1.35 : 1));
    data[i + 1] = clamp(data[i + 1] + n);
    data[i + 2] = clamp(data[i + 2] + n * (colored ? 0.75 : 1));
  });
}

function drawBaseImage(ctx, img, settings, maxSize = 800) {
  const iw = img.videoWidth || img.width;
  const ih = img.videoHeight || img.height;
  const ratio = Math.min(maxSize / iw, maxSize / ih, 1);
  const width = Math.max(1, Math.round(iw * ratio));
  const height = Math.max(1, Math.round(ih * ratio));
  
  if (ctx.canvas.width !== width || ctx.canvas.height !== height) {
    ctx.canvas.width = width;
    ctx.canvas.height = height;
  }
  
  ctx.imageSmoothingEnabled = true;
  if (img.videoWidth) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(img, -width, 0, width, height);
    ctx.restore();
  } else {
    ctx.drawImage(img, 0, 0, width, height);
  }

  if (settings.brightness !== 100 || settings.contrast !== 100) {
    mutatePixels(ctx, (data, i) => {
      for (let c = 0; c < 3; c++) {
        let v = data[i + c];
        v = v * (settings.brightness / 100);
        v = ((v / 255 - 0.5) * (settings.contrast / 100) + 0.5) * 255;
        data[i + c] = clamp(v);
      }
    });
  }

  return { width, height };
}

function downloadBlob(blob, filename) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

// ==================== ART STYLES ====================

function drawAscii(ctx, img, settings) {
  const chars = " .'`^,:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  const { width, height } = drawBaseImage(ctx, img, settings, 200);
  const data = ctx.getImageData(0, 0, width, height).data;
  
  const fSize = settings.fontSize;
  ctx.canvas.width = width * (fSize * 0.6);
  ctx.canvas.height = height * fSize;
  const palette = PALETTES[settings.palette];
  
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.font = `${fSize}px JetBrains Mono, monospace`;
  ctx.textBaseline = "top";
  
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const b = brightness(data, i);
      const char = chars[Math.floor((b / 255) * (chars.length - 1))];
      const [r, g, bl] = paletteColor(settings.colorize ? b : 255 - b, palette);
      ctx.fillStyle = settings.colorize ? `rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})` : `rgb(${r}, ${g}, ${bl})`;
      ctx.fillText(char, x * (fSize * 0.6), y * fSize);
    }
  }
}

function drawBraille(ctx, img, settings) {
  const { width, height } = drawBaseImage(ctx, img, settings, 400);
  const data = ctx.getImageData(0, 0, width, height).data;
  
  const fSize = Math.max(8, settings.fontSize);
  const cols = Math.floor(width / 2);
  const rows = Math.floor(height / 4);
  
  ctx.canvas.width = cols * (fSize * 0.6);
  ctx.canvas.height = rows * fSize;
  const palette = PALETTES[settings.palette];
  
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.font = `${fSize}px JetBrains Mono, monospace`;
  ctx.textBaseline = "top";
  ctx.fillStyle = palette.fg;
  
  const thresh = settings.density * 2.5;
  const dots = [[1, 8], [2, 16], [4, 32], [64, 128]];
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let code = 0;
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const x = c * 2 + dx;
          const y = r * 4 + dy;
          const i = (y * width + x) * 4;
          if (brightness(data, i) > thresh) {
            code += dots[dy][dx];
          }
        }
      }
      if (code > 0) {
        ctx.fillText(String.fromCharCode(0x2800 + code), c * (fSize * 0.6), r * fSize);
      }
    }
  }
}

function drawMatrix(ctx, img, settings) {
  const chars = "ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ";
  const { width, height } = drawBaseImage(ctx, img, settings, 200);
  const data = ctx.getImageData(0, 0, width, height).data;
  
  const fSize = settings.fontSize;
  ctx.canvas.width = width * (fSize * 0.6);
  ctx.canvas.height = height * fSize;
  
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.font = `${fSize}px JetBrains Mono, monospace`;
  ctx.textBaseline = "top";
  
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const b = brightness(data, i);
      if (b > settings.density * 2) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = `rgb(0, ${b}, 0)`;
        ctx.fillText(char, x * (fSize * 0.6), y * fSize);
      }
    }
  }
}

function drawCrosshatch(ctx, img, settings) {
  const { width, height } = drawBaseImage(ctx, img, settings);
  const data = ctx.getImageData(0, 0, width, height).data;
  ctx.fillStyle = PALETTES[settings.palette].bg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = PALETTES[settings.palette].fg;
  ctx.lineWidth = 1;
  const step = Math.max(3, Math.round(settings.fontSize / 2));
  
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const b = brightness(data, i);
      ctx.beginPath();
      if (b < 200) { ctx.moveTo(x, y); ctx.lineTo(x + step, y + step); }
      if (b < 150) { ctx.moveTo(x + step, y); ctx.lineTo(x, y + step); }
      if (b < 100) { ctx.moveTo(x, y + step / 2); ctx.lineTo(x + step, y + step / 2); }
      if (b < 50)  { ctx.moveTo(x + step / 2, y); ctx.lineTo(x + step / 2, y + step); }
      ctx.stroke();
    }
  }
}

function drawPixelSort(ctx, img, settings) {
  const { width, height } = drawBaseImage(ctx, img, settings, 400); // lower res for perf
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const threshold = settings.density * 2.5;
  
  for (let x = 0; x < width; x++) {
    let col = [];
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      col.push({ r: data[i], g: data[i+1], b: data[i+2], a: data[i+3], lum: brightness(data, i) });
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
}

function drawSobel(ctx, img, settings) {
  const { width, height } = drawBaseImage(ctx, img, settings, 600);
  const source = ctx.getImageData(0, 0, width, height).data;
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
          const val = brightness(source, idx);
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
}

function drawVignette(ctx, img, settings) {
  const { width, height } = drawBaseImage(ctx, img, settings);
  const grad = ctx.createRadialGradient(width/2, height/2, width * (settings.bloom/200), width/2, height/2, width * 0.8);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function drawPixel(ctx, img, settings) {
  const { width, height } = drawBaseImage(ctx, img, settings);
  const block = Math.max(5, Math.round(settings.density / 6));
  const tmp = document.createElement("canvas");
  tmp.width = Math.max(1, Math.round(width / block));
  tmp.height = Math.max(1, Math.round(height / block));
  const tctx = tmp.getContext("2d");
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(ctx.canvas, 0, 0, tmp.width, tmp.height);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(tmp, 0, 0, width, height);
  mutatePixels(ctx, (data, i) => {
    data[i] = posterizeChannel(data[i], 4);
    data[i + 1] = posterizeChannel(data[i + 1], 4);
    data[i + 2] = posterizeChannel(data[i + 2], 4);
  });
}

function drawGlitch(ctx, img, settings) {
  const { width, height } = drawBaseImage(ctx, img, settings);
  const source = ctx.getImageData(0, 0, width, height);
  const data = source.data;
  const copy = new Uint8ClampedArray(data);
  const offset = Math.round(settings.chromatic * 0.28) + 2;
  for (let y = 0; y < height; y += 1) {
    const bandShift = Math.sin(y * 0.08) * settings.density * 0.18;
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const xr = clamp(Math.round(x + offset + bandShift), 0, width - 1);
      const xb = clamp(Math.round(x - offset + bandShift), 0, width - 1);
      data[i] = copy[(y * width + xr) * 4];
      data[i + 2] = copy[(y * width + xb) * 4 + 2];
      if (y % 19 === 0) data[i + 1] = clamp(data[i + 1] + 90);
    }
  }
  ctx.putImageData(source, 0, 0);
  for (let y = 0; y < height; y += 33) {
    if (seededNoise(y) > 0.54) {
      const shift = (seededNoise(y + 8) - 0.5) * settings.density * 3;
      ctx.drawImage(ctx.canvas, 0, y, width, 13, shift, y, width, 13);
    }
  }
}

function drawHalftone(ctx, img, settings) {
  const { width, height } = drawBaseImage(ctx, img, settings);
  const data = ctx.getImageData(0, 0, width, height).data;
  const step = Math.max(6, Math.round(settings.density / 5));
  ctx.fillStyle = "#f5f2e8";
  ctx.fillRect(0, 0, width, height);
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (Math.min(height - 1, y) * width + Math.min(width - 1, x)) * 4;
      const b = brightness(data, i);
      const r = ((255 - b) / 255) * step * 0.62;
      ctx.fillStyle = `rgb(${clamp(data[i] - 35)}, ${clamp(data[i + 1] - 35)}, ${clamp(data[i + 2] - 35)})`;
      ctx.beginPath();
      ctx.arc(x + step / 2, y + step / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawLowPoly(ctx, img, settings) {
  const { width, height } = drawBaseImage(ctx, img, settings);
  const data = ctx.getImageData(0, 0, width, height).data;
  const cell = Math.max(24, Math.round(92 - settings.density));
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      const i = (Math.min(height - 1, y + cell / 2) * width + Math.min(width - 1, x + cell / 2)) * 4;
      ctx.fillStyle = `rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + cell, y + seededNoise(x + y) * cell);
      ctx.lineTo(x + seededNoise(y + 4) * cell, y + cell);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + seededNoise(x) * 0.16})`;
      ctx.beginPath();
      ctx.moveTo(x + cell, y);
      ctx.lineTo(x + cell, y + cell);
      ctx.lineTo(x, y + cell);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawGlass(ctx, img, settings) {
  const { width, height } = drawBaseImage(ctx, img, settings);
  const data = ctx.getImageData(0, 0, width, height).data;
  const cell = Math.max(22, Math.round(80 - settings.density / 1.6));
  ctx.lineWidth = Math.max(3, cell * 0.08);
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      const i = (Math.min(height - 1, y + cell / 2) * width + Math.min(width - 1, x + cell / 2)) * 4;
      const wobble = seededNoise(x * 7 + y) * cell * 0.35;
      ctx.fillStyle = `rgb(${clamp(data[i] + 22)}, ${clamp(data[i + 1] + 22)}, ${clamp(data[i + 2] + 22)})`;
      ctx.strokeStyle = "#050505";
      ctx.beginPath();
      ctx.moveTo(x + wobble, y);
      ctx.lineTo(x + cell, y + wobble);
      ctx.lineTo(x + cell - wobble, y + cell);
      ctx.lineTo(x, y + cell - wobble);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawComic(ctx, img, settings) {
  drawBaseImage(ctx, img, settings);
  mutatePixels(ctx, (data, i) => {
    data[i] = posterizeChannel(data[i] * 1.08, 4);
    data[i + 1] = posterizeChannel(data[i + 1] * 1.08, 4);
    data[i + 2] = posterizeChannel(data[i + 2] * 1.08, 4);
  });
  const { width, height } = ctx.canvas;
  const dot = Math.max(7, Math.round(24 - settings.density / 6));
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#050505";
  for (let y = 0; y < height; y += dot) {
    for (let x = (y / dot) % 2 ? dot / 2 : 0; x < width; x += dot) {
      ctx.beginPath();
      ctx.arc(x, y, dot * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawFilm(ctx, img, settings) {
  drawBaseImage(ctx, img, settings);
  mutatePixels(ctx, (data, i, p) => {
    const b = brightness(data, i);
    const halation = b > 190 ? (b - 190) * (settings.bloom / 80) : 0;
    const grain = (seededNoise(p) - 0.5) * settings.grain;
    data[i] = clamp(data[i] * 1.08 + halation + grain);
    data[i + 1] = clamp(data[i + 1] * 0.98 + grain * 0.7);
    data[i + 2] = clamp(data[i + 2] * 0.86 - halation * 0.25 + grain * 0.5);
  });
}

function drawDream(ctx, img, settings) {
  const { width, height } = drawBaseImage(ctx, img, settings);
  ctx.globalAlpha = 0.42;
  ctx.filter = `blur(${Math.max(3, settings.bloom / 18)}px) saturate(1.35)`;
  ctx.drawImage(ctx.canvas, 0, 0, width, height);
  ctx.filter = "none";
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.25;
  ctx.drawImage(ctx.canvas, settings.chromatic / 7, 0);
  ctx.drawImage(ctx.canvas, -settings.chromatic / 7, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function drawPrint(ctx, img, settings) {
  drawBaseImage(ctx, img, settings);
  mutatePixels(ctx, (data, i, p) => {
    const n = seededNoise(p);
    data[i] = clamp(data[i] * 1.06 + 16);
    data[i + 1] = clamp(data[i + 1] * 0.98 + 10);
    data[i + 2] = clamp(data[i + 2] * 0.88);
    if (n > 0.992) data[i] = data[i + 1] = data[i + 2] = 245;
  });
  const { width, height } = ctx.canvas;
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  for (let i = 0; i < settings.grain / 2; i += 1) {
    const x = seededNoise(i + 3) * width;
    ctx.beginPath();
    ctx.moveTo(x, seededNoise(i + 4) * height);
    ctx.lineTo(x + seededNoise(i + 8) * 40 - 20, height);
    ctx.stroke();
  }
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "rgba(255, 80, 0, 0.28)");
  grad.addColorStop(0.45, "transparent");
  grad.addColorStop(1, "rgba(0, 160, 255, 0.13)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function drawKinetic(ctx, img, settings) {
  const { width, height } = drawBaseImage(ctx, img, settings);
  ctx.globalAlpha = 0.12;
  for (let i = 1; i < 12; i += 1) {
    const offset = i * settings.density * 0.08;
    ctx.drawImage(ctx.canvas, -offset, 0, width + offset * 2, height);
  }
  ctx.globalAlpha = 1;
}

function drawDither(ctx, img, settings) {
  drawBaseImage(ctx, img, settings);
  const { width, height } = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const lum = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) lum[i / 4] = brightness(data, i);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      const old = lum[idx];
      const next = old < 128 ? 0 : 255;
      const err = old - next;
      lum[idx] = next;
      [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]].forEach(([dx, dy, amt]) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) lum[ny * width + nx] += err * amt;
      });
    }
  }
  const palette = PALETTES[settings.palette];
  const fg = hexToRgb(palette.fg);
  const bg = hexToRgb(palette.bg);
  for (let i = 0; i < data.length; i += 4) {
    const color = lum[i / 4] > 127 ? fg : bg;
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
  }
  ctx.putImageData(imageData, 0, 0);
}

function renderImageStyle(ctx, img, styleId, settings) {
  if (styleId === "ascii") drawAscii(ctx, img, settings);
  else if (styleId === "braille") drawBraille(ctx, img, settings);
  else if (styleId === "matrix") drawMatrix(ctx, img, settings);
  else if (styleId === "crosshatch") drawCrosshatch(ctx, img, settings);
  else if (styleId === "pixelsort") drawPixelSort(ctx, img, settings);
  else if (styleId === "sobel") drawSobel(ctx, img, settings);
  else if (styleId === "pixel") drawPixel(ctx, img, settings);
  else if (styleId === "glitch") drawGlitch(ctx, img, settings);
  else if (styleId === "halftone") drawHalftone(ctx, img, settings);
  else if (styleId === "lowpoly") drawLowPoly(ctx, img, settings);
  else if (styleId === "vignette") drawVignette(ctx, img, settings);
  else if (styleId === "glass") drawGlass(ctx, img, settings);
  else if (styleId === "comic") drawComic(ctx, img, settings);
  else if (styleId === "film") drawFilm(ctx, img, settings);
  else if (styleId === "dream") drawDream(ctx, img, settings);
  else if (styleId === "print") drawPrint(ctx, img, settings);
  else if (styleId === "kinetic") drawKinetic(ctx, img, settings);
  else drawDither(ctx, img, settings);

  if (settings.grain > 0) addGrain(ctx, settings.grain * 0.35, true);
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
  const [toast, setToast] = useState("");
  const [history, setHistory] = useState([]);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const staticImgRef = useRef(null);
  const animationRef = useRef(null);
  const outputRef = useRef(null);
  const activePalette = PALETTES[palette];

  const settings = useMemo(() => ({
    fontSize, density, grain, bloom, chromatic, contrast, brightness: brightnessVal, palette, colorize,
  }), [fontSize, density, grain, bloom, chromatic, contrast, brightnessVal, palette, colorize]);

  const flash = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1200);
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
    if (!useWebcam) {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
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
    const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
    
    let sourceImg = null;
    if (useWebcam && videoRef.current && videoRef.current.readyState >= 2) {
      sourceImg = videoRef.current;
    } else if (!useWebcam && staticImgRef.current) {
      sourceImg = staticImgRef.current;
    }
    
    if (sourceImg) {
       renderImageStyle(ctx, sourceImg, styleId, settings);
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
      style={{
        "--color-accent": activePalette.fg,
        "--bg-accent": activePalette.bg,
      }}
    >
      <div className="grid min-h-screen flex-1 grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="border-b border-bone/25 bg-black xl:border-b-0 xl:border-r">
          <div className="flex h-full flex-col">
            <div className="border-b border-bone/25 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase text-ghost">client side art machine</p>
                  <h1 className="mt-2 text-2xl font-black uppercase tracking-normal">GLYPH_DSGN</h1>
                </div>
                <Sparkles className="h-5 w-5 text-volt" aria-hidden="true" />
              </div>
            </div>

            <div className="grid grid-cols-2 border-b border-bone/25">
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
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
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

            <div className="border-t border-bone/25 bg-black p-3">
              <button
                onClick={randomize}
                className="group flex w-full items-center justify-center gap-2 border border-bone/25 bg-black py-4 text-xs font-bold uppercase tracking-widest text-ghost transition-colors hover:border-volt hover:text-volt"
              >
                <Shuffle className="h-4 w-4" /> Randomize
              </button>
            </div>
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
            {toast && (
              <span className="animate-pulse bg-bone px-2 py-1 text-[10px] font-bold uppercase text-black">
                {toast}
              </span>
            )}
          </div>
          <div className="pointer-events-none absolute bottom-8 right-8 text-right text-[10px] text-ghost opacity-50">
            <div>DSGN_SYS v1.0.1</div>
            <div>[CMD+D] SAVE</div>
          </div>
        </section>

        <aside className="flex flex-col border-t border-bone/25 bg-black xl:border-l xl:border-t-0">
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid gap-6">
              <div className="grid gap-2">
                <span className="text-[10px] uppercase text-ghost">Palette</span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PALETTES).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setPalette(key)}
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
                <Slider label="Font Size" value={fontSize} setValue={setFontSize} min={6} max={48} />
                <Slider label="Density" value={density} setValue={setDensity} min={0} max={100} />
                <Slider label="Contrast" value={contrast} setValue={setContrast} min={0} max={200} />
                <Slider label="Brightness" value={brightnessVal} setValue={setBrightnessVal} min={0} max={200} />
                <Slider label="Grain" value={grain} setValue={setGrain} min={0} max={100} />
                <Slider label="Bloom" value={bloom} setValue={setBloom} min={0} max={100} />
                <Slider label="Chromatic" value={chromatic} setValue={setChromatic} min={0} max={100} />
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

          <div className="h-48 border-t border-bone/25 bg-black p-3 xl:h-auto xl:flex-1 xl:border-b xl:border-t-0">
            <span className="mb-2 block text-[10px] uppercase text-ghost">Cache Memory</span>
            <div className="flex h-[calc(100%-1.5rem)] gap-2 overflow-x-auto xl:h-auto xl:flex-col xl:overflow-y-auto">
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
                    link.href = item.value;
                    link.download = `glyph_dsgn-snap-${item.id}.png`;
                    link.click();
                  }}
                  className="group relative h-full w-24 flex-shrink-0 border border-bone/25 xl:h-24 xl:w-full"
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
