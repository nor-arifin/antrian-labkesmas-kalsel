import { api } from './api';
import { printHtmlViaIframe } from './printHtml';

export async function printTicket(queueId) {
  try {
    const res = await api.printTicket(queueId);
    const { html } = res.data;

    if (!html) {
      return { success: true, message: 'No print data' };
    }

    if (window.electronAPI) {
      return new Promise((resolve) => {
        window.electronAPI.onPrintResult((result) => {
          resolve(result);
        });
        window.electronAPI.printTicket(html);
      });
    }

    return await printHtmlViaIframe(html);
  } catch (err) {
    console.error('Print failed:', err);
    return { success: false, error: err.message };
  }
}
