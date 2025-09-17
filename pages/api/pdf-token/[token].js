import { storage } from '../../../lib/storage';
import { getBaseUrl, isValidToken } from '../../../lib/config';
import { pdfRateLimit } from '../../../lib/rate-limit';
import { generatePDF } from '../../../lib/generatePDF';

export default async function handler(req, res) {
  try {
    const rateLimitResult = await pdfRateLimit.limit(req);
    if (!rateLimitResult.success) {
      return res.status(429).json({ error: 'För många förfrågningar' });
    }

    const { token } = req.query;
    
    if (!token || !isValidToken(token)) {
      return res.status(400).json({ error: 'Ogiltig token-format' });
    }

    const debugMode = req.query.debug === '1';
    let finalData = null;

    // Försök hämta från storage
    finalData = await storage.get(`quote:${token}`);
    
    if (finalData) {
      console.log('Data fetched from storage');
    } else {
      // Försök Base44
      const UPSTREAM_BASE = getBaseUrl();
      const postUrl = `${UPSTREAM_BASE}/functions/publicQuoteByToken`;
      
      try {
        const response = await fetch(postUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ token: token })
        });
        
        if (response.ok) {
          const data = await response.json();
          finalData = data;
          await storage.set(`quote:${token}`, data, 86400);
          console.log('Data fetched from Base44 and cached');
        }
      } catch (error) {
        console.log('Base44 request failed:', error.message);
      }
    }

    if (!finalData) {
      finalData = {
        number: `BA-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        date: new Date().toISOString().split('T')[0],
        customer: { name: 'Kund', email: '', phone: '' },
        items: [{ name: 'Information saknas', quantity: 1, unitPrice: 0, total: 0 }],
        subtotal: 0,
        vat: 0,
        total: 0,
        notes: 'Kontakta säljaren för offertinformation'
      };
    }

    if (debugMode) {
      return res.status(200).json({
        debug: true,
        data: finalData
      });
    }

    const pdfBuffer = await generatePDF(finalData);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="offert-${finalData.number}.pdf"`);
    res.status(200).send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ 
      error: 'Kunde inte generera PDF',
      reference: `ERR-${Date.now()}`
    });
  }
}
