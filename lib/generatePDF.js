import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const generatePDF = async (quoteData) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4-storlek
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Rita offertinformation
  page.drawText(`Offert: ${quoteData.number || 'BA-0000'}`, {
    x: 50,
    y: height - 50,
    size: 16,
    font,
    color: rgb(0, 0, 0)
  });

  page.drawText(`Datum: ${quoteData.date || new Date().toISOString().split('T')[0]}`, {
    x: 50,
    y: height - 80,
    size: 12,
    font,
    color: rgb(0, 0, 0)
  });

  page.drawText(`Kund: ${quoteData.customer?.name || 'Ej angiven'}`, {
    x: 50,
    y: height - 110,
    size: 12,
    font,
    color: rgb(0, 0, 0)
  });

  // Rita totalbelopp
  page.drawText(`Totalbelopp: ${quoteData.total || 0} SEK`, {
    x: 50,
    y: height - 150,
    size: 14,
    font,
    color: rgb(0, 0, 0)
  });

  // Om det finns items, rita dem
  if (quoteData.items && quoteData.items.length > 0) {
    let yPosition = height - 200;
    quoteData.items.forEach((item, index) => {
      if (yPosition > 50) { // Se till att vi inte ritar utanför sidan
        page.drawText(`${item.name}: ${item.quantity} st x ${item.unitPrice} SEK = ${item.total} SEK`, {
          x: 50,
          y: yPosition,
          size: 10,
          font,
          color: rgb(0, 0, 0)
        });
        yPosition -= 25;
      }
    });
  }

  // Lägg till företagsinfo i botten
  page.drawText('ByggAssist AB - Org.nr: 556123-1234 - Tel: 08-123 45 67', {
    x: 50,
    y: 50,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5)
  });

  return await pdfDoc.save();
};