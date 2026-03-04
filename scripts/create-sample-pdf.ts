import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFile } from 'fs/promises';
import path from 'path';

async function createSamplePDF() {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Add title
    page.drawText('Sample Approval Request Document', {
      x: 50,
      y: 750,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0.5)
    });

    // Add content
    const content = [
      '',
      'Request Type: Equipment Purchase',
      'Department: Computer Science',
      'Requested By: John Doe',
      'Date: March 2, 2026',
      '',
      'Description:',
      'This is a sample document for testing the approval system.',
      'It contains placeholder content for demonstration purposes.',
      '',
      'Budget Details:',
      '- Item: Laboratory Equipment',
      '- Quantity: 5 units',
      '- Unit Cost: $1,000',
      '- Total Cost: $5,000',
      '',
      'Justification:',
      'The requested equipment is essential for conducting research',
      'and improving the quality of education in our department.',
      '',
      'Approval Status: Pending',
      '',
      '---',
      'This is a system-generated sample document.',
      'For testing purposes only.'
    ];

    let y = 700;
    content.forEach(line => {
      page.drawText(line, {
        x: 50,
        y: y,
        size: 12,
        font: font,
        color: rgb(0, 0, 0)
      });
      y -= 20;
    });

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'sample-document.pdf');
    
    await writeFile(filePath, pdfBytes);
    console.log('✓ Sample PDF created successfully at:', filePath);
  } catch (error) {
    console.error('Error creating sample PDF:', error);
    process.exit(1);
  }
}

createSamplePDF();
