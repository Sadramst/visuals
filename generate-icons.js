// Generate minimal PNG icons for Power BI visuals
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create a minimal valid PNG with a solid color and simple pattern
function createIcon(width, height, r, g, b, symbol) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // Create IHDR chunk (image header)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);   // width
  ihdrData.writeUInt32BE(height, 4);  // height
  ihdrData.writeUInt8(8, 8);          // bit depth
  ihdrData.writeUInt8(2, 9);          // color type (RGB)
  ihdrData.writeUInt8(0, 10);         // compression
  ihdrData.writeUInt8(0, 11);         // filter
  ihdrData.writeUInt8(0, 12);         // interlace
  const ihdr = createChunk('IHDR', ihdrData);
  
  // Create pixel data with simple pattern
  const pixels = [];
  for (let y = 0; y < height; y++) {
    pixels.push(0); // filter byte for each row
    for (let x = 0; x < width; x++) {
      // Create a simple icon pattern based on symbol
      let isIcon = false;
      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      // Simple circle pattern with letter initial
      if (symbol === 'H') { // Heatmap - grid pattern
        isIcon = (x % 4 < 2) !== (y % 4 < 2);
      } else if (symbol === 'S') { // Safety - shield
        isIcon = dist < 8 && y > 3 && (x > 5 && x < 15);
      } else if (symbol === 'W') { // Waterfall - bars
        isIcon = (y > 4 && y < 16) && ((x > 2 && x < 5) || (x > 6 && x < 10) || (x > 11 && x < 14) || (x > 15 && x < 18));
      } else if (symbol === '$') { // Cost - dollar
        isIcon = dist < 7;
      } else if (symbol === 'G') { // Gantt - horizontal bars
        isIcon = ((y > 3 && y < 6) || (y > 8 && y < 11) || (y > 13 && y < 16)) && x > 2 && x < 18;
      }
      
      if (isIcon) {
        pixels.push(255, 255, 255); // white icon
      } else {
        pixels.push(r, g, b); // background color
      }
    }
  }
  
  const rawData = Buffer.from(pixels);
  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);
  
  // Create IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = calculateCRC(crcData);
  
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 calculation for PNG
function calculateCRC(data) {
  let crc = 0xFFFFFFFF;
  const table = makeCRCTable();
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
  }
  return crc ^ 0xFFFFFFFF;
}

function makeCRCTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xEDB88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

// Generate icons
const icons = [
  { name: 'equipment-heatmap', r: 27, g: 54, b: 93, symbol: 'H' },
  { name: 'safety-kpi', r: 16, g: 124, b: 16, symbol: 'S' },
  { name: 'ore-grade-waterfall', r: 0, g: 120, b: 212, symbol: 'W' },
  { name: 'cost-tracker', r: 255, g: 185, b: 0, symbol: '$' },
  { name: 'production-gantt', r: 107, g: 107, b: 107, symbol: 'G' }
];

const outputDir = path.join(__dirname, 'test-data', 'icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

icons.forEach(icon => {
  const png = createIcon(20, 20, icon.r, icon.g, icon.b, icon.symbol);
  const outputPath = path.join(outputDir, `${icon.name}.png`);
  fs.writeFileSync(outputPath, png);
  console.log(`Created: ${icon.name}.png`);
});

console.log('All icons generated!');
