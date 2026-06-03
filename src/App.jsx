import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import {
  Aperture,
  Braces,
  ChevronDown,
  Clipboard,
  Download,
  Image as ImageIcon,
  Keyboard,
  PanelRightOpen,
  Shuffle,
  Sparkles,
  Type,
  Upload,
} from "lucide-react";

const TEXT_STYLES = [
  { id: "ascii", name: "ASCII", tag: "01", desc: "Figlet-ish mono banner forms." },
  { id: "ansi", name: "ANSI", tag: "02", desc: "BBS terminal color and glow." },
  { id: "petscii", name: "PETSCII", tag: "03", desc: "C64 palette and reverse video." },
  { id: "braille", name: "BRAILLE", tag: "04", desc: "Unicode Braille cell encoding." },
  { id: "typeblock", name: "TYPEBLOCK", tag: "05", desc: "Heavy block-character typography." },
  { id: "morse", name: "MORSE", tag: "06", desc: "Visual dot and dash signal tape." },
  { id: "zalgo", name: "ZALGO", tag: "07", desc: "Corrupted combining marks." },
  { id: "matrix", name: "MATRIX", tag: "08", desc: "Falling code animation." },
  { id: "kaomoji", name: "KAOMOJI", tag: "09", desc: "Internet face mosaic banner." },
  { id: "shadow3d", name: "SHADOW 3D", tag: "10", desc: "Layered extrusion typography." },
];

const IMAGE_STYLES = [
  { id: "ascii-photo", name: "ASCII PHOTO", tag: "11", desc: "Brightness mapped glyph field." },
  { id: "pixel", name: "8-BIT", tag: "12", desc: "Nearest-neighbor palette posterize." },
  { id: "glitch", name: "GLITCH", tag: "13", desc: "RGB split, bands, scan corruption." },
  { id: "halftone", name: "HALFTONE", tag: "14", desc: "Newspaper dot simulation." },
  { id: "lowpoly", name: "LOW POLY", tag: "15", desc: "Triangular code-art facets." },
  { id: "paint", name: "OIL/WATER", tag: "16", desc: "Soft smoothing and edge lift." },
  { id: "stitch", name: "STITCH", tag: "17", desc: "Embroidery cross grid." },
  { id: "thermal", name: "THERMAL", tag: "18", desc: "False-color heat map." },
  { id: "glass", name: "GLASS", tag: "19", desc: "Cell shards and lead borders." },
  { id: "comic", name: "COMIC", tag: "20", desc: "Flat color, ink edges, Ben-Day." },
  { id: "film", name: "35MM", tag: "21", desc: "Grain, halation, analog grade." },
  { id: "dream", name: "DREAM", tag: "22", desc: "Prism bloom and diffusion." },
  { id: "print", name: "LO-FI PRINT", tag: "23", desc: "Dust, scratches, light leaks." },
  { id: "kinetic", name: "KINETIC", tag: "24", desc: "Motion trails and zoom burst." },
  { id: "dither", name: "DITHER", tag: "25", desc: "Atkinson/Floyd two-tone grit." },
];

const ALL_STYLES = [...TEXT_STYLES, ...IMAGE_STYLES];

const PALETTES = {
  green: { label: "Terminal Green", fg: "#00ff66", bg: "#000000", alt: "#083b1c" },
  amber: { label: "Amber Phosphor", fg: "#ffb000", bg: "#0a0800", alt: "#4b3200" },
  ibm: { label: "IBM Blue", fg: "#e8ecff", bg: "#001a8f", alt: "#00a6ff" },
  synth: { label: "Synthwave", fg: "#ff4dff", bg: "#09000f", alt: "#00e5ff" },
  mono: { label: "Monochrome", fg: "#f5f2e8", bg: "#050505", alt: "#8f8f8f" },
  solar: { label: "Solarized", fg: "#93a1a1", bg: "#002b36", alt: "#b58900" },
};

const MORSE = {
  a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.", h: "....", i: "..", j: ".---",
  k: "-.-", l: ".-..", m: "--", n: "-.", o: "---", p: ".--.", q: "--.-", r: ".-.", s: "...",
  t: "-", u: "..-", v: "...-", w: ".--", x: "-..-", y: "-.--", z: "--..",
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....",
  6: "-....", 7: "--...", 8: "---..", 9: "----.",
};

const BLOCK_FONT = {
  A: [" ██ ", "█  █", "████", "█  █", "█  █"], B: ["███ ", "█  █", "███ ", "█  █", "███ "],
  C: [" ███", "█   ", "█   ", "█   ", " ███"], D: ["███ ", "█  █", "█  █", "█  █", "███ "],
  E: ["████", "█   ", "███ ", "█   ", "████"], F: ["████", "█   ", "███ ", "█   ", "█   "],
  G: [" ███", "█   ", "█ ██", "█  █", " ███"], H: ["█  █", "█  █", "████", "█  █", "█  █"],
  I: ["███", " █ ", " █ ", " █ ", "███"], J: ["  ██", "   █", "   █", "█  █", " ██ "],
  K: ["█  █", "█ █ ", "██  ", "█ █ ", "█  █"], L: ["█   ", "█   ", "█   ", "█   ", "████"],
  M: ["█  █", "████", "████", "█  █", "█  █"], N: ["█  █", "██ █", "█ ██", "█  █", "█  █"],
  O: [" ██ ", "█  █", "█  █", "█  █", " ██ "], P: ["███ ", "█  █", "███ ", "█   ", "█   "],
  Q: [" ██ ", "█  █", "█  █", "█ ██", " ███"], R: ["███ ", "█  █", "███ ", "█ █ ", "█  █"],
  S: [" ███", "█   ", " ██ ", "   █", "███ "], T: ["████", " ██ ", " ██ ", " ██ ", " ██ "],
  U: ["█  █", "█  █", "█  █", "█  █", " ██ "], V: ["█  █", "█  █", "█  █", " ██ ", " ██ "],
  W: ["█  █", "█  █", "████", "████", "█  █"], X: ["█  █", " ██ ", " ██ ", " ██ ", "█  █"],
  Y: ["█  █", " ██ ", " ██ ", " ██ ", " ██ "], Z: ["████", "  █ ", " ██ ", "█   ", "████"],
  "0": [" ██ ", "█  █", "█  █", "█  █", " ██ "], "1": [" ██", "  █", "  █", "  █", "████"],
  "2": ["███ ", "   █", " ██ ", "█   ", "████"], "3": ["███ ", "   █", " ██ ", "   █", "███ "],
  "4": ["█  █", "█  █", "████", "   █", "   █"], "5": ["████", "█   ", "███ ", "   █", "███ "],
  "6": [" ███", "█   ", "███ ", "█  █", " ██ "], "7": ["████", "   █", "  █ ", " █  ", "█   "],
  "8": [" ██ ", "█  █", " ██ ", "█  █", " ██ "], "9": [" ██ ", "█  █", " ███", "   █", "███ "],
  " ": ["    ", "    ", "    ", "    ", "    "],
};

function clamp(value, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value));
}

function downloadBlob(blob, filename) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

function bannerText(text) {
  const lines = ["", "", "", "", ""];
  String(text || "GLYPH").toUpperCase().slice(0, 24).split("").forEach((char) => {
    const glyph = BLOCK_FONT[char] || BLOCK_FONT[" "];
    glyph.forEach((line, index) => {
      lines[index] += `${line}  `;
    });
  });
  return lines.join("\n");
}

function seededNoise(seed) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}

function textToBraille(text) {
  const bytes = Array.from(new TextEncoder().encode(text || "GLYPH_DSGN"));
  const dots = [1, 2, 4, 64, 8, 16, 32, 128];
  return bytes.map((byte, index) => {
    let code = 0;
    dots.forEach((dot, bit) => {
      if ((byte >> bit) & 1) code += dot;
    });
    return String.fromCharCode(0x2800 + code) + ((index + 1) % 24 === 0 ? "\n" : "");
  }).join("");
}

function zalgoText(text, density) {
  const marks = ["\u0301", "\u0308", "\u0334", "\u035c", "\u036f", "\u032f", "\u031a", "\u0337"];
  return Array.from(text || "SIGNAL LOST").map((char, i) => {
    const count = Math.max(1, Math.round(density / 14));
    return char + Array.from({ length: count }, (_, j) => marks[(i + j) % marks.length]).join("");
  }).join("");
}

function createTextArt(style, text, settings) {
  const source = text.trim() || "GLYPH_DSGN";
  const banner = bannerText(source);

  // Style 01: Classic ASCII Art.
  if (style === "ascii") return banner.replaceAll("█", "#");

  // Style 02: ANSI Art.
  if (style === "ansi") return `\u001b[38;5;46m${banner}\u001b[0m\n\n[ BBS TERMINAL // 9600 BAUD // GLYPH_DSGN ]`;

  // Style 03: PETSCII Art.
  if (style === "petscii") return banner.replaceAll("█", "▓").replaceAll(" ", "·");

  // Style 04: Braille Art.
  if (style === "braille") return textToBraille(source.repeat(8));

  // Style 05: Block/Typeblock Art.
  if (style === "typeblock") return banner.replaceAll("█", "▓").replaceAll(" ", "░");

  // Style 06: Morse Code Visual.
  if (style === "morse") {
    return source.toLowerCase().split("").map((char) => {
      if (char === " ") return "     /     ";
      return (MORSE[char] || "·").replaceAll(".", "●").replaceAll("-", "━");
    }).join("   ");
  }

  // Style 07: Zalgo/Glitch Text.
  if (style === "zalgo") return zalgoText(source, settings.density);

  // Style 08: Matrix Rain Text.
  if (style === "matrix") return Array.from({ length: 16 }, (_, row) => {
    return Array.from({ length: 52 }, (_, col) => source[(row + col) % source.length] || "0").join("");
  }).join("\n");

  // Style 09: Emoticon/Kaomoji Art.
  if (style === "kaomoji") {
    const faces = ["(._.)", "(^_^)", "(o_o)", "(-_-)", "(>_<)", "(0_0)"];
    return banner.replace(/█/g, (_, i) => faces[i % faces.length]).replace(/ {2,}/g, "  ");
  }

  // Style 10: Shadow/3D Extrusion.
  return [
    banner.replaceAll("█", "▓"),
    banner.split("\n").map((line) => `  ${line.replaceAll("█", "▒")}`).join("\n"),
    banner.split("\n").map((line) => `    ${line.replaceAll("█", "░")}`).join("\n"),
  ].join("\n");
}

function drawBaseImage(ctx, img, maxSize = 940) {
  const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));
  ctx.canvas.width = width;
  ctx.canvas.height = height;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, width, height);
  return { width, height };
}

function mutatePixels(ctx, fn) {
  const { width, height } = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) fn(data, i, i / 4, width, height);
  ctx.putImageData(imageData, 0, 0);
}

function brightness(data, i) {
  return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
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

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function posterizeChannel(value, steps) {
  return Math.round(Math.round(value / (255 / (steps - 1))) * (255 / (steps - 1)));
}

function addGrain(ctx, amount, colored = false) {
  mutatePixels(ctx, (data, i, p) => {
    const n = (seededNoise(p + amount) - 0.5) * amount;
    data[i] = clamp(data[i] + n * (colored ? 1.35 : 1));
    data[i + 1] = clamp(data[i + 1] + n);
    data[i + 2] = clamp(data[i + 2] + n * (colored ? 0.75 : 1));
  });
}

function drawAsciiPhoto(ctx, img, settings) {
  // Style 11: ASCII Photo Conversion.
  const chars = " .'`^,:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  const width = 112;
  const scale = width / img.width;
  const height = Math.max(24, Math.round(img.height * scale * 0.48));
  const tmp = document.createElement("canvas");
  tmp.width = width;
  tmp.height = height;
  const tctx = tmp.getContext("2d", { willReadFrequently: true });
  tctx.drawImage(img, 0, 0, width, height);
  const data = tctx.getImageData(0, 0, width, height).data;
  ctx.canvas.width = width * 8;
  ctx.canvas.height = height * 12;
  const palette = PALETTES[settings.palette];
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.font = `${settings.density < 45 ? 11 : 9}px JetBrains Mono, monospace`;
  ctx.textBaseline = "top";
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const b = brightness(data, i);
      const char = chars[Math.floor((b / 255) * (chars.length - 1))];
      const [r, g, bl] = paletteColor(settings.colorize ? b : 255 - b, palette);
      ctx.fillStyle = settings.colorize ? `rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})` : `rgb(${r}, ${g}, ${bl})`;
      ctx.fillText(char, x * 8, y * 12);
    }
  }
}

function drawPixel(ctx, img, settings) {
  // Style 12: Pixel Art / 8-bit Posterize.
  const { width, height } = drawBaseImage(ctx, img);
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
  // Style 13: Algorithmic Glitch.
  const { width, height } = drawBaseImage(ctx, img);
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
  // Style 14: Halftone / Newspaper Print.
  const { width, height } = drawBaseImage(ctx, img);
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
  // Style 15: Generative/Code Art.
  const { width, height } = drawBaseImage(ctx, img);
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

function drawPaint(ctx, img, settings) {
  // Style 16: Watercolor / Oil Paint.
  drawBaseImage(ctx, img);
  ctx.filter = `blur(${Math.max(1, settings.bloom / 32)}px) saturate(1.22) contrast(0.96)`;
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = "none";
  mutatePixels(ctx, (data, i, p) => {
    const edge = Math.abs(data[i] - data[i + 4] || 0) + Math.abs(data[i + 1] - data[i + 5] || 0);
    if (edge > 42) {
      data[i] = clamp(data[i] - 42);
      data[i + 1] = clamp(data[i + 1] - 42);
      data[i + 2] = clamp(data[i + 2] - 42);
    }
    const paper = (seededNoise(p) - 0.5) * 18;
    data[i] = clamp(data[i] + paper);
    data[i + 1] = clamp(data[i + 1] + paper);
    data[i + 2] = clamp(data[i + 2] + paper);
  });
}

function drawStitch(ctx, img, settings) {
  // Style 17: Cross-Stitch / Embroidery.
  const { width, height } = drawBaseImage(ctx, img);
  const data = ctx.getImageData(0, 0, width, height).data;
  const step = Math.max(9, Math.round(28 - settings.density / 5));
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, width, height);
  ctx.lineWidth = 1.25;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (Math.min(height - 1, y) * width + Math.min(width - 1, x)) * 4;
      ctx.strokeStyle = `rgb(${posterizeChannel(data[i], 5)}, ${posterizeChannel(data[i + 1], 5)}, ${posterizeChannel(data[i + 2], 5)})`;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2);
      ctx.lineTo(x + step - 2, y + step - 2);
      ctx.moveTo(x + step - 2, y + 2);
      ctx.lineTo(x + 2, y + step - 2);
      ctx.stroke();
    }
  }
}

function drawThermal(ctx, img) {
  // Style 18: Thermal Camera.
  drawBaseImage(ctx, img);
  mutatePixels(ctx, (data, i) => {
    const b = brightness(data, i) / 255;
    data[i] = clamp(255 * Math.min(1, b * 2.4));
    data[i + 1] = clamp(255 * Math.sin(b * Math.PI));
    data[i + 2] = clamp(255 * (1 - b) * 1.4);
  });
}

function drawGlass(ctx, img, settings) {
  // Style 19: Stained Glass.
  const { width, height } = drawBaseImage(ctx, img);
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
  // Style 20: Comic Book / Ben-Day Dots.
  drawBaseImage(ctx, img);
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
  // Style 21: 35mm Film Emulation.
  drawBaseImage(ctx, img);
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
  // Style 22: Dreamscape / Prism Bloom.
  const { width, height } = drawBaseImage(ctx, img);
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
  // Style 23: Lo-Fi / Degraded Print.
  drawBaseImage(ctx, img);
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
  // Style 24: Kinetic & Radial Blur.
  const { width, height } = drawBaseImage(ctx, img);
  ctx.globalAlpha = 0.12;
  for (let i = 1; i < 12; i += 1) {
    const offset = i * settings.density * 0.08;
    ctx.drawImage(ctx.canvas, -offset, 0, width + offset * 2, height);
  }
  ctx.globalAlpha = 1;
}

function drawDither(ctx, img, settings) {
  // Style 25: Cyber-Brutalist Dither.
  drawBaseImage(ctx, img);
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
  if (styleId === "ascii-photo") drawAsciiPhoto(ctx, img, settings);
  else if (styleId === "pixel") drawPixel(ctx, img, settings);
  else if (styleId === "glitch") drawGlitch(ctx, img, settings);
  else if (styleId === "halftone") drawHalftone(ctx, img, settings);
  else if (styleId === "lowpoly") drawLowPoly(ctx, img, settings);
  else if (styleId === "paint") drawPaint(ctx, img, settings);
  else if (styleId === "stitch") drawStitch(ctx, img, settings);
  else if (styleId === "thermal") drawThermal(ctx, img, settings);
  else if (styleId === "glass") drawGlass(ctx, img, settings);
  else if (styleId === "comic") drawComic(ctx, img, settings);
  else if (styleId === "film") drawFilm(ctx, img, settings);
  else if (styleId === "dream") drawDream(ctx, img, settings);
  else if (styleId === "print") drawPrint(ctx, img, settings);
  else if (styleId === "kinetic") drawKinetic(ctx, img, settings);
  else drawDither(ctx, img, settings);

  if (styleId !== "ascii-photo" && settings.grain > 0) addGrain(ctx, settings.grain * 0.35, true);
}

function App() {
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("GLYPH_DSGN");
  const [styleId, setStyleId] = useState("ascii");
  const [palette, setPalette] = useState("green");
  const [density, setDensity] = useState(64);
  const [grain, setGrain] = useState(36);
  const [bloom, setBloom] = useState(42);
  const [chromatic, setChromatic] = useState(18);
  const [animation, setAnimation] = useState(true);
  const [colorize, setColorize] = useState(false);
  const [deckOpen, setDeckOpen] = useState(true);
  const [imageSrc, setImageSrc] = useState("");
  const [imageName, setImageName] = useState("");
  const [toast, setToast] = useState("");
  const [history, setHistory] = useState([]);
  const [dragging, setDragging] = useState(false);

  const canvasRef = useRef(null);
  const outputRef = useRef(null);
  const fileRef = useRef(null);
  const lastHashRef = useRef("");
  const activePalette = PALETTES[palette];
  const isTextMode = mode === "text";
  const currentStyle = ALL_STYLES.find((style) => style.id === styleId) || TEXT_STYLES[0];
  const visibleStyles = isTextMode ? TEXT_STYLES : IMAGE_STYLES;

  const settings = useMemo(() => ({ density, grain, bloom, chromatic, palette, colorize }), [
    density,
    grain,
    bloom,
    chromatic,
    palette,
    colorize,
  ]);

  const textOutput = useMemo(() => createTextArt(styleId, text, settings), [styleId, text, settings]);

  const flash = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1200);
  }, []);

  const addHistory = useCallback((kind, value, label) => {
    setHistory((items) => [{ id: Date.now(), kind, value, label }, ...items].slice(0, 5));
  }, []);

  const handleMode = (next) => {
    setMode(next);
    setStyleId(next === "text" ? "ascii" : "pixel");
  };

  const handleFile = useCallback((file) => {
    if (!file || !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      flash("[ IMAGE TYPE REJECTED ]");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setImageName(file.name);
      setMode("image");
      setStyleId((id) => IMAGE_STYLES.some((style) => style.id === id) ? id : "pixel");
      flash("[ IMAGE LOADED ]");
    };
    reader.readAsDataURL(file);
  }, [flash]);

  const rerenderImage = useCallback(() => {
    if (!imageSrc || !canvasRef.current || isTextMode) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
      renderImageStyle(ctx, img, styleId, settings);
      addHistory("image", canvasRef.current.toDataURL("image/png"), currentStyle.name);
    };
    img.src = imageSrc;
  }, [addHistory, currentStyle.name, imageSrc, isTextMode, settings, styleId]);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    try {
      const parsed = JSON.parse(decodeURIComponent(atob(hash)));
      if (parsed.text) setText(parsed.text);
      if (parsed.mode) setMode(parsed.mode);
      if (parsed.styleId) setStyleId(parsed.styleId);
      if (parsed.palette && PALETTES[parsed.palette]) setPalette(parsed.palette);
      if (parsed.density) setDensity(parsed.density);
    } catch {
      flash("[ HASH IGNORED ]");
    }
  }, [flash]);

  useEffect(() => {
    const hash = btoa(encodeURIComponent(JSON.stringify({ text, mode, styleId, palette, density })));
    if (lastHashRef.current !== hash) {
      lastHashRef.current = hash;
      window.history.replaceState(null, "", `#${hash}`);
    }
  }, [density, mode, palette, styleId, text]);

  useEffect(() => {
    if (isTextMode) {
      addHistory("text", textOutput, currentStyle.name);
      return;
    }
    rerenderImage();
  }, [addHistory, currentStyle.name, isTextMode, rerenderImage, textOutput]);

  useEffect(() => {
    const handler = (event) => {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      if (event.key === "Enter") {
        event.preventDefault();
        if (isTextMode) flash("[ RENDERED ]");
        else rerenderImage();
      }
      if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        downloadPng();
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        const pool = isTextMode ? TEXT_STYLES : IMAGE_STYLES;
        setStyleId(pool[Math.floor(Math.random() * pool.length)].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const downloadPng = async () => {
    if (!isTextMode && canvasRef.current) {
      canvasRef.current.toBlob((blob) => blob && downloadBlob(blob, `glyph_dsgn-${styleId}.png`), "image/png", 1);
      flash("[ PNG SAVED ]");
      return;
    }
    if (!outputRef.current) return;
    const canvas = await html2canvas(outputRef.current, { backgroundColor: activePalette.bg, scale: 2 });
    canvas.toBlob((blob) => blob && downloadBlob(blob, `glyph_dsgn-${styleId}.png`), "image/png", 1);
    flash("[ PNG SAVED ]");
  };

  const downloadTxt = () => {
    const blob = new Blob([isTextMode ? textOutput : `GLYPH_DSGN image style: ${currentStyle.name}`], { type: "text/plain" });
    downloadBlob(blob, `glyph_dsgn-${styleId}.txt`);
    flash("[ TXT SAVED ]");
  };

  const downloadSvg = () => {
    const escaped = textOutput.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720"><rect width="1200" height="720" fill="${activePalette.bg}"/><foreignObject x="48" y="48" width="1104" height="624"><pre xmlns="http://www.w3.org/1999/xhtml" style="font-family:monospace;font-size:22px;white-space:pre-wrap;color:${activePalette.fg};">${escaped}</pre></foreignObject></svg>`;
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `glyph_dsgn-${styleId}.svg`);
    flash("[ SVG SAVED ]");
  };

  const copyOutput = async () => {
    if (isTextMode) await navigator.clipboard.writeText(textOutput);
    else if (canvasRef.current) await navigator.clipboard.writeText(canvasRef.current.toDataURL("image/png"));
    flash("[ COPIED ]");
  };

  const randomize = () => {
    const pool = isTextMode ? TEXT_STYLES : IMAGE_STYLES;
    setStyleId(pool[Math.floor(Math.random() * pool.length)].id);
    setDensity(Math.round(30 + Math.random() * 62));
    setGrain(Math.round(Math.random() * 70));
    setBloom(Math.round(Math.random() * 82));
    setChromatic(Math.round(Math.random() * 52));
    flash("[ RANDOMIZED ]");
  };

  return (
    <main className="min-h-screen bg-deck text-bone">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
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
                className={`flex items-center justify-center gap-2 border-r border-bone/25 px-4 py-4 text-xs uppercase transition-colors duration-75 ${isTextMode ? "bg-bone text-black" : "hover:bg-white/10"}`}
                onClick={() => handleMode("text")}
              >
                <Type className="h-4 w-4" /> Text
              </button>
              <button
                className={`flex items-center justify-center gap-2 px-4 py-4 text-xs uppercase transition-colors duration-75 ${!isTextMode ? "bg-bone text-black" : "hover:bg-white/10"}`}
                onClick={() => handleMode("image")}
              >
                <ImageIcon className="h-4 w-4" /> Image
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="grid gap-2">
                {visibleStyles.map((style) => (
                  <button
                    key={style.id}
                    className={`group grid grid-cols-[42px_1fr] items-center border p-3 text-left transition-colors duration-75 ${styleId === style.id ? "border-volt bg-volt text-black" : "border-bone/25 bg-black hover:border-bone"}`}
                    onClick={() => setStyleId(style.id)}
                    title={style.desc}
                  >
                    <span className="flex h-8 w-8 items-center justify-center border border-current text-[10px]">{style.tag}</span>
                    <span>
                      <span className="block text-xs font-bold uppercase">{style.name}</span>
                      <span className={`mt-1 hidden text-[10px] uppercase ${styleId === style.id ? "text-black/70" : "text-ghost"} group-hover:block`}>
                        {style.desc}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="grid min-h-[680px] grid-rows-[auto_1fr_auto]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-bone/25 bg-black/75 px-5 py-3">
            <div>
              <p className="text-[10px] uppercase text-ghost">active processor</p>
              <h2 className="text-lg font-black uppercase">{currentStyle.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button className="border border-bone/25 p-2 hover:border-volt hover:text-volt" onClick={randomize} title="Random style">
                <Shuffle className="h-4 w-4" />
              </button>
              <button className="border border-bone/25 p-2 hover:border-volt hover:text-volt" onClick={() => setDeckOpen((v) => !v)} title="Toggle control deck">
                <PanelRightOpen className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="relative overflow-hidden p-4 sm:p-6">
            <div
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{ background: `radial-gradient(circle at 68% 18%, ${activePalette.alt}30, transparent 34%)` }}
            />
            <div className="relative grid h-full place-items-center border border-bone/25 bg-black/80 p-3 sm:p-5">
              <div className="absolute left-3 top-3 text-[10px] uppercase text-ghost">canvas / live</div>
              <div className="absolute right-3 top-3 text-[10px] uppercase text-ghost">{currentStyle.tag}</div>

              {isTextMode ? (
                <div
                  ref={outputRef}
                  className={`relative max-h-[70vh] w-full overflow-auto border border-bone/15 p-5 text-left ${styleId === "matrix" ? "shadow-[0_0_30px_rgba(0,255,80,0.25)]" : ""}`}
                  style={{ backgroundColor: activePalette.bg, color: activePalette.fg }}
                >
                  {styleId === "matrix" && animation && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-45">
                      {Array.from({ length: 22 }, (_, i) => (
                        <span
                          key={i}
                          className="absolute top-0 animate-rain text-xs"
                          style={{ left: `${(i / 22) * 100}%`, animationDelay: `${i * 0.11}s`, color: activePalette.fg }}
                        >
                          {text || "GLYPH_DSGN"}
                        </span>
                      ))}
                    </div>
                  )}
                  <pre className="relative m-0 whitespace-pre-wrap break-words text-[clamp(10px,1.8vw,18px)] leading-tight">
                    {textOutput}
                  </pre>
                </div>
              ) : (
                <div className="grid w-full gap-4">
                  {!imageSrc && (
                    <button
                      className={`grid min-h-[340px] place-items-center border border-dashed p-8 text-center transition-colors ${dragging ? "border-volt bg-volt/10" : "border-bone/30 bg-black"}`}
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDragging(false);
                        handleFile(event.dataTransfer.files?.[0]);
                      }}
                    >
                      <span>
                        <Upload className="mx-auto mb-4 h-10 w-10 text-volt" />
                        <span className="block text-sm uppercase">Drop image or click upload</span>
                        <span className="mt-2 block text-[10px] uppercase text-ghost">JPG / PNG / WebP / GIF</span>
                      </span>
                    </button>
                  )}
                  <canvas ref={canvasRef} className={`mx-auto max-h-[70vh] max-w-full border border-bone/20 bg-black ${imageSrc ? "block" : "hidden"}`} />
                  {imageSrc && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase text-ghost">
                      <span>{imageName || "uploaded-image"}</span>
                      <button className="border border-bone/25 px-3 py-2 hover:border-volt hover:text-volt" onClick={() => fileRef.current?.click()}>
                        Replace Image
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <footer className="grid gap-px border-t border-bone/25 bg-bone/25 sm:grid-cols-4">
            <button className="flex items-center justify-center gap-2 bg-black px-4 py-4 text-xs uppercase hover:bg-bone hover:text-black" onClick={copyOutput}>
              <Clipboard className="h-4 w-4" /> Copy
            </button>
            <button className="flex items-center justify-center gap-2 bg-black px-4 py-4 text-xs uppercase hover:bg-bone hover:text-black" onClick={downloadPng}>
              <Download className="h-4 w-4" /> PNG
            </button>
            <button className="flex items-center justify-center gap-2 bg-black px-4 py-4 text-xs uppercase hover:bg-bone hover:text-black" onClick={downloadTxt}>
              <Braces className="h-4 w-4" /> TXT
            </button>
            <button className="flex items-center justify-center gap-2 bg-black px-4 py-4 text-xs uppercase hover:bg-bone hover:text-black" onClick={downloadSvg} disabled={!isTextMode}>
              <Aperture className="h-4 w-4" /> SVG
            </button>
          </footer>
        </section>

        <aside className={`${deckOpen ? "block" : "hidden"} border-t border-bone/25 bg-black xl:border-l xl:border-t-0`}>
          <div className="border-b border-bone/25 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase text-ghost">mechanical panel</p>
                <h2 className="text-base font-black uppercase">Control Deck</h2>
              </div>
              <ChevronDown className="h-4 w-4 text-volt xl:hidden" />
            </div>
          </div>

          <div className="grid gap-5 p-5">
            {isTextMode ? (
              <label className="grid gap-2">
                <span className="text-[10px] uppercase text-ghost">Text Input</span>
                <textarea
                  className="min-h-36 resize-y border border-bone/25 bg-deck p-3 text-sm uppercase outline-none focus:border-volt"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  spellCheck="false"
                />
              </label>
            ) : (
              <div className="grid gap-2">
                <span className="text-[10px] uppercase text-ghost">Image Input</span>
                <button className="flex items-center justify-center gap-2 border border-bone/25 bg-deck px-4 py-5 text-xs uppercase hover:border-volt" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Select Media
                </button>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />

            <div className="grid gap-2">
              <span className="text-[10px] uppercase text-ghost">Palette</span>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PALETTES).map(([key, value]) => (
                  <button
                    key={key}
                    className={`flex items-center gap-2 border p-2 text-left text-[10px] uppercase ${palette === key ? "border-volt bg-volt text-black" : "border-bone/25"}`}
                    onClick={() => setPalette(key)}
                  >
                    <span className="h-4 w-4 border border-current" style={{ background: value.fg }} />
                    {value.label}
                  </button>
                ))}
              </div>
            </div>

            <Slider label="Density" value={density} setValue={setDensity} />
            <Slider label="Grain" value={grain} setValue={setGrain} />
            <Slider label="Bloom" value={bloom} setValue={setBloom} />
            <Slider label="Chromatic" value={chromatic} setValue={setChromatic} />

            <label className="flex items-center justify-between border border-bone/25 p-3 text-xs uppercase">
              <span>Color ASCII</span>
              <input type="checkbox" checked={colorize} onChange={(event) => setColorize(event.target.checked)} />
            </label>

            <label className="flex items-center justify-between border border-bone/25 p-3 text-xs uppercase">
              <span>Animation</span>
              <input type="checkbox" checked={animation} onChange={(event) => setAnimation(event.target.checked)} />
            </label>

            <div className="border border-bone/25 p-3">
              <div className="mb-3 flex items-center gap-2 text-[10px] uppercase text-ghost">
                <Keyboard className="h-3 w-3" /> Shortcuts
              </div>
              <div className="grid gap-2 text-[10px] uppercase">
                <span>Ctrl/Command + Enter Render</span>
                <span>Ctrl/Command + D Download</span>
                <span>Ctrl/Command + R Random</span>
              </div>
            </div>

            <div className="grid gap-2">
              <span className="text-[10px] uppercase text-ghost">History Rail</span>
              <div className="grid grid-cols-5 gap-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    className="aspect-square overflow-hidden border border-bone/25 bg-deck text-[8px] uppercase hover:border-volt"
                    onClick={() => {
                      if (item.kind === "text") {
                        setMode("text");
                        setText(item.value.slice(0, 160));
                      } else {
                        setMode("image");
                        setImageSrc(item.value);
                      }
                    }}
                    title={item.label}
                  >
                    {item.kind === "image" ? <img alt="" src={item.value} className="h-full w-full object-cover grayscale" /> : item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 border border-volt bg-black px-4 py-3 text-xs uppercase text-volt shadow-[0_0_20px_rgba(255,77,0,0.45)]">
          {toast}
        </div>
      )}
    </main>
  );
}

function Slider({ label, value, setValue }) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between text-[10px] uppercase text-ghost">
        {label}
        <span className="text-bone">{value}</span>
      </span>
      <input
        className="accent-[#ff4d00]"
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
      />
    </label>
  );
}

export default App;
