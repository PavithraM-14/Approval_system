import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import puppeteer from 'puppeteer';
import path from 'path';
import { writeFile, unlink, readFile as fsReadFile } from 'fs/promises';
import { tmpdir } from 'os';
import ConvertAPI from 'convertapi';

/**
 * Apply watermark to PDF buffer
 */
export async function applyPdfWatermark(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const now = new Date();
  const dateStr = now.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  for (const page of pages) {
    const { width, height } = page.getSize();
    
    const mainText = 'S.E.A.D.';
    const dateText = `Accessed: ${dateStr}`;
    
    const mainFontSize = 100;
    const dateFontSize = 20;
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    const mainTextWidth = font.widthOfTextAtSize(mainText, mainFontSize);
    const dateTextWidth = font.widthOfTextAtSize(dateText, dateFontSize);
    
    page.drawText(mainText, {
      x: centerX - mainTextWidth / 2,
      y: centerY,
      size: mainFontSize,
      font: font,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.5,
      rotate: degrees(45)
    });
    
    page.drawText(dateText, {
      x: centerX - dateTextWidth / 2,
      y: centerY - 60,
      size: dateFontSize,
      font: font,
      color: rgb(0.65, 0.65, 0.65),
      opacity: 0.5,
      rotate: degrees(45)
    });
  }

  const watermarkedPdfBytes = await pdfDoc.save();
  return Buffer.from(watermarkedPdfBytes);
}

/**
 * Convert Office document to PDF using ConvertAPI
 */
export async function convertOfficeToPdf(
  fileBuffer: Buffer,
  fileName: string,
  fileExt: string
): Promise<Buffer> {
  try {
    console.log('🔄 Converting Office document to PDF:', fileName);

    const convertApiSecret = process.env.CONVERTAPI_SECRET;
    
    if (!convertApiSecret) {
      console.warn('⚠️ CONVERTAPI_SECRET not set, falling back to basic conversion');
      return await fallbackConversion(fileBuffer, fileName, fileExt);
    }

    const convertapi = new ConvertAPI(convertApiSecret);

    const tempFileName = `temp_${Date.now()}${fileExt}`;
    const tempFilePath = path.join(tmpdir(), tempFileName);
    await writeFile(tempFilePath, fileBuffer);

    try {
      const sourceFormat = fileExt.substring(1); // Remove the dot (.docx -> docx)
      
      // Convert to PDF using ConvertAPI
      const result = await convertapi.convert('pdf', {
        File: tempFilePath
      }, sourceFormat);

      // Save the result to a temporary directory
      const outputDir = tmpdir();
      await result.saveFiles(outputDir);
      
      // The converted file will be saved with the original name but .pdf extension
      const outputFileName = path.basename(tempFileName, fileExt) + '.pdf';
      const outputPath = path.join(outputDir, outputFileName);
      
      // Read the converted PDF
      const pdfBuffer = await fsReadFile(outputPath);

      // Clean up temp files
      await unlink(tempFilePath).catch(() => {});
      await unlink(outputPath).catch(() => {});

      console.log('✅ Document converted successfully using ConvertAPI');
      return pdfBuffer;
    } catch (error) {
      await unlink(tempFilePath).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error('❌ ConvertAPI conversion failed:', error);
    console.log('⚠️ Falling back to basic conversion');
    return await fallbackConversion(fileBuffer, fileName, fileExt);
  }
}

/**
 * Convert Office document to PDF with watermark
 */
export async function convertOfficeToPdfWithWatermark(
  fileBuffer: Buffer,
  fileName: string,
  fileExt: string
): Promise<Buffer> {
  try {
    console.log('🔄 Converting Office document to PDF with watermark:', fileName);

    const pdfBuffer = await convertOfficeToPdf(fileBuffer, fileName, fileExt);
    const watermarkedPdf = await applyPdfWatermark(pdfBuffer);

    console.log('✅ Document converted and watermarked successfully');
    return watermarkedPdf;
  } catch (error) {
    console.error('❌ Office conversion with watermark failed:', error);
    throw error;
  }
}

/**
 * Fallback conversion using Puppeteer
 */
async function fallbackConversion(
  fileBuffer: Buffer,
  fileName: string,
  fileExt: string
): Promise<Buffer> {
  let browser;

  try {
    console.log('🔄 Using fallback conversion method');

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    const htmlContent = generateFallbackHtml(fileName, fileExt);
    
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    return Buffer.from(pdfBuffer);
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

/**
 * Generate fallback HTML
 */
function generateFallbackHtml(fileName: string, fileExt: string): string {
  const now = new Date();
  const dateStr = now.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          background: white;
        }
        .header {
          background: #f8f9fa;
          padding: 20px;
          border-bottom: 2px solid #dee2e6;
          margin-bottom: 30px;
        }
        .filename {
          font-size: 24px;
          font-weight: bold;
          color: #333;
          margin-bottom: 10px;
        }
        .info {
          font-size: 14px;
          color: #666;
        }
        .document-info {
          background: #fff3cd;
          border: 1px solid #ffc107;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .document-info p {
          margin: 5px 0;
          font-size: 14px;
          color: #856404;
        }
        .preview-notice {
          background: #d1ecf1;
          border: 1px solid #bee5eb;
          padding: 15px;
          border-radius: 5px;
        }
        .preview-notice p {
          margin: 5px 0;
          font-size: 14px;
          color: #0c5460;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="filename">${fileName}</div>
        <div class="info">Accessed: ${dateStr}</div>
      </div>
      
      <div class="document-info">
        <p><strong>⚠️ CONFIDENTIAL DOCUMENT</strong></p>
        <p>This document has been shared through S.E.A.D. secure sharing system.</p>
        <p>Unauthorized distribution is prohibited.</p>
      </div>
      
      <div class="preview-notice">
        <p><strong>📄 Document Preview</strong></p>
        <p>File Type: ${fileExt.toUpperCase()}</p>
        <p>This is a preview of the original ${getDocumentTypeName(fileExt)} document.</p>
        <p><strong>Note:</strong> Full document conversion requires ConvertAPI configuration.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Get document type name
 */
function getDocumentTypeName(ext: string): string {
  const names: { [key: string]: string } = {
    '.doc': 'Word',
    '.docx': 'Word',
    '.xls': 'Excel',
    '.xlsx': 'Excel',
    '.ppt': 'PowerPoint',
    '.pptx': 'PowerPoint'
  };
  return names[ext] || 'Office';
}

/**
 * Check if file type supports watermarking
 */
export function supportsWatermark(fileExt: string): boolean {
  const supportedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
  return supportedTypes.includes(fileExt.toLowerCase());
}

/**
 * Check if file is an Office document
 */
export function isOfficeDocument(fileExt: string): boolean {
  const officeTypes = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
  return officeTypes.includes(fileExt.toLowerCase());
}
