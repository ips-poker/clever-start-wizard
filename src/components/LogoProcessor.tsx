import React, { useState, useEffect } from 'react';
import { removeBackground, loadImageFromUrl, addRoundedCorners } from '@/utils/imageProcessor';
import { Loader2 } from 'lucide-react';

interface LogoProcessorProps {
  originalSrc: string;
  alt: string;
  className?: string;
  rounded?: boolean;
  radius?: number;
}

export function LogoProcessor({ originalSrc, alt, className, rounded = true, radius = 20 }: LogoProcessorProps) {
  const [processedSrc, setProcessedSrc] = useState<string>(originalSrc);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processLogo = async () => {
      try {
        setIsProcessing(true);
        setError(null);

        // Load the original image
        const img = await loadImageFromUrl(originalSrc);
        
        // Remove background
        const bgRemovedBlob = await removeBackground(img);
        
        if (rounded) {
          // Create canvas from blob for rounding
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get canvas context');
          
          const processedImg = new Image();
          processedImg.onload = () => {
            canvas.width = processedImg.width;
            canvas.height = processedImg.height;
            ctx.drawImage(processedImg, 0, 0);
            
            // Add rounded corners
            const roundedCanvas = addRoundedCorners(canvas, radius);
            
            // Convert to blob and create URL
            roundedCanvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                setProcessedSrc(url);
              }
            }, 'image/png');
          };
          
          processedImg.src = URL.createObjectURL(bgRemovedBlob);
        } else {
          // Use background-removed image as is
          const url = URL.createObjectURL(bgRemovedBlob);
          setProcessedSrc(url);
        }
        
      } catch (err) {
        console.error('Error processing logo:', err);
        setError('Failed to process logo');
        setProcessedSrc(originalSrc); // Fallback to original
      } finally {
        setIsProcessing(false);
      }
    };

    processLogo();

    // Cleanup function to revoke object URLs
    return () => {
      if (processedSrc !== originalSrc && processedSrc.startsWith('blob:')) {
        URL.revokeObjectURL(processedSrc);
      }
    };
  }, [originalSrc, rounded, radius]);

  if (isProcessing) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={processedSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (processedSrc !== originalSrc) {
          setProcessedSrc(originalSrc);
        }
      }}
    />
  );
}