import { storage } from '../../lib/storage';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, quote } = req.body;

    if (!token || !quote) {
      return res.status(400).json({ error: 'Missing token or quote data' });
    }

    // Spara i storage istället för filsystem
    await storage.set(`quote:${token}`, quote, 86400); // 24 timmar

    console.log('Quote saved to storage with token:', token);
    
    res.status(200).json({ 
      ok: true, 
      message: 'Quote saved successfully',
      token: token
    });

  } catch (error) {
    console.error('Error saving quote:', error);
    res.status(500).json({ error: 'Failed to save quote' });
  }
}