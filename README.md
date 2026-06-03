<div align="center">
  <p align="center">
    <img src="https://glyphdsgn.vercel.app/favicon.ico" alt="Logo" width="48" height="48" />
  </p>
  <h1>GLYPH_DSGN</h1>
  <p><strong>Advanced Retro-Tech Text & Aesthetic Image Art Generator</strong></p>

  <p>
    <a href="https://glyphdsgn.vercel.app/"><strong>Live Deployment (Vercel) ✦</strong></a>
  </p>

  <p>
    <img alt="React" src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" />
    <img alt="Vite" src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white" />
    <img alt="TailwindCSS" src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" />
    <img alt="License" src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" />
  </p>
</div>

---

## ✦ System Overview

**GLYPH_DSGN** is a stark, utilitarian, client-side web application designed to mutate text and images into pure digital art. Abandoning soft modern web design, it embraces a high-contrast, mechanical, retro-tech aesthetic reminiscent of Teenage Engineering hardware and vintage IBM systems. 

All processing runs entirely in your browser via the **HTML5 Canvas API**—zero backend calls, zero latency, maximum privacy.

## ✦ Live Demo

Access the live generator here: **[https://glyphdsgn.vercel.app/](https://glyphdsgn.vercel.app/)**

---

## ✦ Core Features

### 1. Dual Mode Operations
- **Text Processor:** Type directly into a focused input buffer.
- **Image Upload:** Dropzone architecture supporting `JPG`, `PNG`, `WebP`, and `GIF`.

### 2. 25 Embedded Art Styles

#### 🔠 Text Processors
Convert standard text arrays into:
- **Classic ASCII / Typeblock:** Figlet banners and chunky block extrusions.
- **ANSI / PETSCII:** IBM CP437 color rendering and Commodore 64 simulation.
- **Braille / Morse:** Visual dot-dash tapes and Braille cell encodings.
- **Zalgo / Matrix:** Falling green terminal rain and corrupted diacritics.
- **Shadow 3D:** Deep layered, multi-extruded typographic shadows.

#### 🌌 Image Processors
Mutate uploaded media into:
- **Pixel / Dither:** 8-bit downscaling and Cyber-brutalist Atkinson/Floyd-Steinberg dithering.
- **Analog / Film:** 35mm emulation featuring heavy grain, halation, and Kodak-style grading.
- **Glitch / Kinetic:** Chromatic RGB splits, scanline corruption, and zoom bursts.
- **Generative / Canvas:** Cross-stitch embroidery, Voronoi/Stained Glass cells, thermal heat maps, and comic-book Ben-Day dots.
- **Lo-Fi Print / Dreamscape:** Dust, scratches, light leaks, and soft prism optical blooms.

### 3. The Control Deck
Tweak the granular output using our hardware-inspired mechanical deck:
- **Palettes:** Terminal Green, Amber Phosphor, IBM Blue, Synthwave, Monochrome, Solarized.
- **Sliders:** Fine-tune Density, Grain, Bloom, and Chromatic aberration limits.
- **History Rail:** Non-destructive caching restores your last 5 iterations instantly.

### 4. Zero-Friction Export
Output your final mutations via `[⌘ + D]`:
- High-res **PNG** image downloads (2x scale).
- Vector **SVG** export.
- Pure **TXT** format.
- One-click copy-to-clipboard.

---

## ✦ Local Installation

To boot GLYPH_DSGN locally, ensure you have Node.js installed, then execute:

```bash
# Clone the repository
git clone https://github.com/ManasSoni-2009/GLYPH.DSGN.git
cd GLYPH.DSGN

# Install dependencies
npm install

# Initialize the dev server
npm run dev
```

> **Note for Windows Users:** If your PowerShell execution policies block `npm`, utilize `npm.cmd install` and `npm.cmd run dev`.

### Production Build
```bash
npm run build
```

---

## ✦ Technical Architecture

- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (strict inline configuration)
- **Engine:** Pure JavaScript Canvas API manipulation algorithms.
- **Export Utility:** `html2canvas`

---

## ✦ License

This project is open-sourced under the **MIT License**.
