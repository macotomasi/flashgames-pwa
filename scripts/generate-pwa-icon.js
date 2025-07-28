// Génère une icône PWA 192x192px bleue avec le texte 'PWA' centré
const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const size = 192
const canvas = createCanvas(size, size)
const ctx = canvas.getContext('2d')

// Fond bleu
ctx.fillStyle = '#2563eb' // Bleu tailwind-600
ctx.fillRect(0, 0, size, size)

// Texte blanc centré
ctx.font = 'bold 72px sans-serif'
ctx.fillStyle = '#fff'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText('PWA', size / 2, size / 2)

// Sauvegarde
const outPath = path.join(__dirname, '../public/pwa-192x192.png')
const out = fs.createWriteStream(outPath)
const stream = canvas.createPNGStream()
stream.pipe(out)
out.on('finish', () => console.log('Icône PWA générée :', outPath)) 