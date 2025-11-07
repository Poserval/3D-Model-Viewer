const sharp = require('sharp');
const fs = require('fs').promises;

async function generateIcons() {
    console.log('🎨 Generating icons...');
    
    const svgContent = `
    <svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="512" height="512" rx="96" fill="#007AFF"/>
        <path d="M256 128L128 256L256 384L384 256L256 128Z" fill="white"/>
        <path d="M192 224L256 160L320 224L256 288L192 224Z" fill="white" fill-opacity="0.8"/>
        <path d="M224 192L256 160L288 192L256 224L224 192Z" fill="white" fill-opacity="0.6"/>
    </svg>
    `;
    
    const sizes = [192, 512];
    
    for (const size of sizes) {
        await sharp(Buffer.from(svgContent))
            .resize(size, size)
            .png()
            .toFile(`src/icons/icon-${size}.png`);
        console.log(`✅ Generated icon-${size}.png`);
    }
    
    console.log('🎉 All icons generated!');
}

generateIcons().catch(console.error);
