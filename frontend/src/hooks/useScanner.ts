'use client';

import { useState, useEffect } from 'react';

interface UseScannerProps {
  elementId: string;
  onScanSuccess: (decodedText: string) => void;
}

export const useScanner = ({ elementId, onScanSuccess }: UseScannerProps) => {
  const [scanner, setScanner] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const startScanner = async () => {
    // Dynamic import to prevent SSR failure on Next.js build
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      const html5Qr = new Html5Qrcode(elementId);
      setScanner(html5Qr);
      setIsActive(true);
      setErrorMsg('');

      await html5Qr.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScanSuccess(decodedText);
        },
        () => {
          // Silent keep scanning errors
        }
      );
    } catch (e: any) {
      console.error('Camera Scanner initialization failed: ', e);
      setErrorMsg('Camera access blocked or not found. Try fallback simulation.');
      setIsActive(false);
    }
  };

  const stopScanner = async () => {
    if (scanner && scanner.isScanning) {
      try {
        await scanner.stop();
        document.getElementById(elementId)!.innerHTML = '';
      } catch (err) {
        console.error('Failed to clean scanner: ', err);
      }
    }
    setIsActive(false);
    setScanner(null);
  };

  useEffect(() => {
    return () => {
      if (scanner) {
        stopScanner();
      }
    };
  }, [scanner]);

  return {
    isActive,
    errorMsg,
    startScanner,
    stopScanner,
  };
};
