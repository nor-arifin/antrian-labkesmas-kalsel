import { api } from './api';

export async function printTicket(queueId) {
  try {
    const res = await api.printTicket(queueId);
    const { printer, printData } = res.data;

    if (printer === 'remote' && printData) {
      const binary = atob(printData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return { success: true, data: bytes };
    }

    return { success: true, message: 'Print job sent to local printer' };
  } catch (err) {
    console.error('Print failed:', err);
    return { success: false, error: err.message };
  }
}
