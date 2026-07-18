'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface UseVoiceBillingProps {
  products: any[];
  onCheckoutTrigger: () => void;
}

export const useVoiceBilling = ({ products, onCheckoutTrigger }: UseVoiceBillingProps) => {
  const { addToCart, adjustQuantity, removeFromCart } = useCart();
  const { apiFetch } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error: ', event.error);
        setIsListening(false);
      };

      rec.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        await processVoiceCommand(text);
      };

      setRecognition(rec);
    }
  }, [products, addToCart, adjustQuantity, removeFromCart, onCheckoutTrigger]);

  const startListening = (lang: string = 'en-US') => {
    if (!recognition) {
      alert('Speech Recognition is not supported by your browser.');
      return;
    }
    
    // Set appropriate recognition language (English, Hindi, Marathi)
    recognition.lang = lang;
    try {
      recognition.start();
    } catch (e) {
      console.warn('Recognition already started');
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
  };

  const processVoiceCommand = async (text: string) => {
    try {
      const response = await apiFetch('/api/voice-billing/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      });

      if (!response.ok) {
        throw new Error('Voice command parsing failed on server.');
      }

      const command = await response.json();
      console.log('[Voice Command Result] ', command);

      if (command.action === 'CHECKOUT') {
        onCheckoutTrigger();
        return;
      }

      if (command.action === 'UNKNOWN' || !command.productQuery) {
        alert(`Command not understood: "${text}"`);
        return;
      }

      // Find product in catalog matching query
      const query = command.productQuery.toLowerCase().trim();
      const matchedProduct = products.find(p => 
        p.sku.toLowerCase() === query || 
        p.name.toLowerCase().includes(query) || 
        query.includes(p.name.toLowerCase())
      );

      if (!matchedProduct) {
        alert(`Product "${command.productQuery}" not found in store catalog.`);
        return;
      }

      if (command.action === 'ADD') {
        // Adjust quantity in cart or add it
        for (let i = 0; i < command.quantity; i++) {
          addToCart(matchedProduct);
        }
      } else if (command.action === 'REMOVE') {
        removeFromCart(matchedProduct.id);
      }
    } catch (error) {
      console.error('Failed to resolve voice billing command: ', error);
    }
  };

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    hasSupport: !!(typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))
  };
};
