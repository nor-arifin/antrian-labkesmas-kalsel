import { useEffect, useRef } from 'react';
import './PrintTicket.css';

export default function PrintTicket({ html, onClose }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!iframeRef.current) return;
    const timer = setTimeout(() => {
      try {
        iframeRef.current.contentWindow.print();
      } catch (err) {
        console.error('Print error:', err);
      }
      setTimeout(onClose, 1000);
    }, 300);
    return () => clearTimeout(timer);
  }, [html, onClose]);

  return (
    <div className="ticket-popup-overlay no-print" onClick={onClose}>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        className="ticket-frame"
        title="Ticket"
      />
    </div>
  );
}
