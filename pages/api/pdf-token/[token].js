import { storage } from '../../../lib/storage';  // <-- LÄGG TILL DENNA RAD
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getBaseUrl, isValidToken } from '../../../lib/config';
import { pdfRateLimit } from '../../../lib/rate-limit';
import { generatePDF } from '../../../lib/generatePDF';

export default async function handler(req, res) {
  try {
    // Rate limiting
    const rateLimitResult = await pdfRateLimit.limit(req);
    if (!rateLimitResult.success) {
      return res.status(429).json({ error: 'För många förfrågningar' });
    }

    const { token } = req.query;
    
    // Validera token
    if (!token || !isValidToken(token)) {
      return res.status(400).json({ 
        error: 'Ogiltig token-format' 
      });
    }

    const debugMode = req.query.debug === '1';
    const triedUrls = [];
    let picked = false;
    let finalData = null;

    // FÖRST: Försök hämta från storage
try {
  finalData = await storage.get(`quote:${token}`);
  
  if (finalData) {
    picked = true;
    console.log('Data fetched from storage');
  }
} catch (error) {
  console.log('No data in storage, trying Base44...');
}

    // OM INTE I CACHE: Försök med Base44 via POST
    if (!picked) {
      const UPSTREAM_BASE = getBaseUrl();
      
      // BYT TILL POST-ANROP enligt Base44 support
      const postUrl = `${UPSTREAM_BASE}/functions/publicQuoteByToken`;
      triedUrls.push(postUrl);
      
      try {
        const response = await fetch(postUrl, {
          method: 'POST', // 👈 NYTT: Använd POST istället för GET
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ token: token }) // 👈 NYTT: Token i body
        });
        
        const contentType = response.headers.get('content-type');
        triedUrls[triedUrls.length - 1] += ` [Status: ${response.status}, CT: ${contentType}]`;

       if (response.ok && contentType && contentType.includes('application/json')) {
  const data = await response.json();
  finalData = data;
  picked = true;
  
  // Spara i storage för nästa gång
  await storage.set(`quote:${token}`, data, 86400);
  
  console.log('Data fetched from Base44 via POST and cached');
}
      } catch (error) {
        triedUrls[triedUrls.length - 1] += ` [Error: ${error.message}]`;
        console.log('Base44 POST request failed, using fallback data');
      }
    }

    // Fallback om ingen data hittades
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
        tried: triedUrls,
        picked,
        data: finalData
      });
    }

    // Generera PDF
    const pdfBuffer = await generatePDF(finalData);

    console.log('PDF Buffer length:', pdfBuffer.length);
    console.log('First few bytes:', pdfBuffer.slice(0, 10));
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="offert-${finalData.number}.pdf"`);
    res.status(200).send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ 
      error: 'Kunde inte generera PDF',
      reference: `ERR-${Date.now()}`
    });
  }
}
