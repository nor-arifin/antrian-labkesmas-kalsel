import { useEffect, useRef } from 'react';
import { printHtmlViaIframe } from '../lib/printHtml';
import './PrintTicket.css';

export default function PrintTicket({ html, onClose }) {
  const doneRef = useRef(false);

  useEffect(() => {
    if (!html || doneRef.current) return;
    doneRef.current = true;
    let cancelled = false;

    printHtmlViaIframe(html).finally(() => {
      if (cancelled) return;
      setTimeout(onClose, 800);
    });

    return () => {
      cancelled = true;
    };
  }, [html, onClose]);

  return (
    <div className="ticket-popup-overlay no-print" onClick={onClose}>
      <iframe
        srcDoc={html}
        className="ticket-frame"
        title="Ticket"
      />
    </div>
  );
}
