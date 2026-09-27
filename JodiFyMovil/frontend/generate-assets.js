/* eslint-disable */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Ensure directories exist
['assets/images', 'assets/sounds'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function createIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#030305';
  ctx.fillRect(0, 0, size, size);

  // Gradient circle
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#7F00FF');
  gradient.addColorStop(1, '#57128bff');

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Inner glow
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(127, 0, 255, 0.3)';
  ctx.fill();

  // "J" letter
  ctx.font = `bold ${size * 0.4}px Outfit, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('J', size / 2, size / 2 + size * 0.05);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join('assets/images', filename), buffer);
  console.log(`Created ${filename} (${size}x${size})`);
}

// Create various sizes
createIcon(1024, 'icon.png');
createIcon(512, 'adaptive-icon.png');
createIcon(512, 'notification-icon.png');

function createSplash(size, filename) {
  const canvas = createCanvas(size.width, size.height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#030305';
  ctx.fillRect(0, 0, size.width, size.height);

  // Gradient overlay
  const gradient = ctx.createLinearGradient(0, 0, size.width, size.height);
  gradient.addColorStop(0, 'rgba(127, 0, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 229, 255, 0.2)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size.width, size.height);

  // Logo
  const logoSize = Math.min(size.width, size.height) * 0.3;
  ctx.font = `bold ${logoSize}px Outfit, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('J', size.width / 2, size.height / 2 - logoSize * 0.1);

  ctx.font = `${logoSize * 0.4}px Manrope, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText('JodiFy', size.width / 2, size.height / 2 + logoSize * 0.4);
  ctx.fillText('Free Music For Friends', size.width / 2, size.height / 2 + logoSize * 0.7);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join('assets/images', filename), buffer);
  console.log(`Created ${filename} (${size.width}x${size.height})`);
}

// Create splash screens
createSplash({ width: 1242, height: 2688 }, 'splash.png');
createSplash({ width: 1125, height: 2436 }, 'splash-dark.png');

function createNotificationSound(filename) {
  // Create a simple WAV file with a short beep
  const sampleRate = 44100;
  const duration = 0.3; // seconds
  const frequency = 880; // A5 note
  const numSamples = sampleRate * duration;

  const buffer = Buffer.alloc(44 + numSamples * 2);

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Generate sine wave with fade in/out
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t * 10) * Math.min(1, (duration - t) * 10);
    const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
    const intSample = Math.max(-32768, Math.min(32767, sample * 32767));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  fs.writeFileSync(path.join('assets/sounds', filename), buffer);
  console.log(`Created ${filename}`);
}

createNotificationSound('notification.wav');

console.log('\nAll assets generated!');
