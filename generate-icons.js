const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateIcons() {
    const svgBuffer = await fs.readFile('src/icons/icon.svg');
    
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    
    for (const size of sizes) {
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(`src/icons/icon-${size}.png`);
        
        console.log(`Created icon-${size}.png`);
    }
    
    // Создаем apple-touch-icon
    await sharp(svgBuffer)
        .resize(180, 180)
        .png()
        .toFile('src/icons/apple-touch-icon.png');
    
    console.log('Created apple-touch-icon.png');
    
    // Создаем favicon
    await sharp(svgBuffer)
        .resize(32, 32)
        .png()
        .toFile('src/icons/favicon.png');
    
    console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
