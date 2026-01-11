// Icon Generator Script
// Run this script with Node.js to generate PNG icons from SVG
// Requires: npm install canvas

const fs = require('fs');
const path = require('path');

// Simple canvas-based icon generator
// If canvas module is not available, this will create placeholder icons

const sizes = [16, 48, 128];

function createPlaceholderIcon(size) {
  // Create a simple PNG header for a colored square
  // This is a minimal valid PNG file

  const { createCanvas } = require('canvas');
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');

  // Draw rounded rectangle
  const radius = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw diagram-like shapes
  ctx.fillStyle = 'white';
  const nodeWidth = size * 0.25;
  const nodeHeight = size * 0.15;

  // Top row nodes
  ctx.fillRect(size * 0.2, size * 0.2, nodeWidth, nodeHeight);
  ctx.fillRect(size * 0.55, size * 0.2, nodeWidth, nodeHeight);

  // Middle node
  ctx.fillRect(size * 0.375, size * 0.42, nodeWidth, nodeHeight);

  // Bottom row nodes
  ctx.fillRect(size * 0.2, size * 0.65, nodeWidth, nodeHeight);
  ctx.fillRect(size * 0.55, size * 0.65, nodeWidth, nodeHeight);

  // Draw connection lines
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.02;

  // Top to middle
  ctx.beginPath();
  ctx.moveTo(size * 0.325, size * 0.35);
  ctx.lineTo(size * 0.5, size * 0.42);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(size * 0.675, size * 0.35);
  ctx.lineTo(size * 0.5, size * 0.42);
  ctx.stroke();

  // Middle to bottom
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.57);
  ctx.lineTo(size * 0.325, size * 0.65);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.57);
  ctx.lineTo(size * 0.675, size * 0.65);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

async function generateIcons() {
  const iconsDir = path.join(__dirname, 'icons');

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  try {
    for (const size of sizes) {
      const buffer = createPlaceholderIcon(size);
      const filename = path.join(iconsDir, `icon${size}.png`);
      fs.writeFileSync(filename, buffer);
      console.log(`Created ${filename}`);
    }
    console.log('All icons generated successfully!');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('Canvas module not found. Installing...');
      console.log('Run: npm install canvas');
      console.log('\nAlternatively, you can:');
      console.log('1. Use an online tool to convert icons/icon.svg to PNG');
      console.log('2. Use sizes: 16x16, 48x48, 128x128');
      console.log('3. Save as icon16.png, icon48.png, icon128.png in the icons folder');
    } else {
      throw error;
    }
  }
}

generateIcons();
