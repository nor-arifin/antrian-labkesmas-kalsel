export function printHtmlViaIframe(html) {
  return new Promise((resolve) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');
      iframe.setAttribute('tabindex', '-1');
      iframe.src = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      };

      const timer = setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve({ success: true });
        } catch (err) {
          console.error('printHtmlViaIframe error:', err);
          resolve({ success: false, error: err.message });
        } finally {
          setTimeout(cleanup, 1500);
        }
      }, 300);

      iframe.onload = () => {
        clearTimeout(timer);
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve({ success: true });
        } catch (err) {
          console.error('printHtmlViaIframe error:', err);
          resolve({ success: false, error: err.message });
        } finally {
          setTimeout(cleanup, 1500);
        }
      };

      iframe.onerror = () => {
        clearTimeout(timer);
        resolve({ success: false, error: 'iframe load failed' });
        cleanup();
      };

      document.body.appendChild(iframe);
    } catch (err) {
      console.error('printHtmlViaIframe setup error:', err);
      resolve({ success: false, error: err.message });
    }
  });
}
