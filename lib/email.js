// lib/email.js
export async function sendQuoteEmail(params) {
  // Temporär lösning - logga bara
  console.log('E-post skulle skickas till:', params.to);
  console.log('Offert:', params.quoteNumber);
  return { success: true };
}