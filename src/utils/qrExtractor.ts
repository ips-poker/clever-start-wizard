/**
 * Извлекает центральную белую область с QR кодом и надписью
 */
export const extractAndConvertQR = async (imageSrc: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Получаем данные изображения
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Находим самую большую непрерывную белую область (это будет белый фон QR кода)
      const whiteThreshold = 220;
      let maxWhiteArea = { minX: canvas.width, minY: canvas.height, maxX: 0, maxY: 0, pixels: 0 };
      
      // Сканируем изображение по горизонтальным линиям, начиная с середины
      for (let y = Math.floor(canvas.height * 0.3); y < canvas.height * 0.9; y++) {
        let consecutiveWhite = 0;
        let startX = -1;
        
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          if (r > whiteThreshold && g > whiteThreshold && b > whiteThreshold) {
            if (startX === -1) startX = x;
            consecutiveWhite++;
          } else if (consecutiveWhite > 0) {
            // Нашли белую область
            if (consecutiveWhite > maxWhiteArea.pixels) {
              maxWhiteArea = {
                minX: startX,
                minY: Math.floor(canvas.height * 0.3),
                maxX: startX + consecutiveWhite,
                maxY: Math.floor(canvas.height * 0.9),
                pixels: consecutiveWhite
              };
            }
            consecutiveWhite = 0;
            startX = -1;
          }
        }
      }
      
      // Уточняем границы белой области по вертикали
      let finalMinY = canvas.height;
      let finalMaxY = 0;
      
      for (let y = 0; y < canvas.height; y++) {
        let whitePixelsInRow = 0;
        for (let x = maxWhiteArea.minX; x < maxWhiteArea.maxX; x++) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          if (r > whiteThreshold && g > whiteThreshold && b > whiteThreshold) {
            whitePixelsInRow++;
          }
        }
        
        // Если большая часть пикселей белая, это часть нашей области
        if (whitePixelsInRow > (maxWhiteArea.maxX - maxWhiteArea.minX) * 0.7) {
          finalMinY = Math.min(finalMinY, y);
          finalMaxY = Math.max(finalMaxY, y);
        }
      }
      
      // Добавляем более агрессивные отступы для обрезки краев
      const padding = 30;
      const cropX = Math.max(0, maxWhiteArea.minX + padding);
      const cropY = Math.max(0, finalMinY + padding);
      const cropWidth = Math.min(maxWhiteArea.maxX - maxWhiteArea.minX - padding * 2, canvas.width - cropX);
      const cropHeight = Math.min(finalMaxY - finalMinY - padding * 2, canvas.height - cropY);
      
      // Создаем новый canvas с обрезанным изображением
      const croppedCanvas = document.createElement('canvas');
      const croppedCtx = croppedCanvas.getContext('2d');
      
      if (!croppedCtx) {
        reject(new Error('Could not get cropped canvas context'));
        return;
      }
      
      croppedCanvas.width = cropWidth;
      croppedCanvas.height = cropHeight;
      
      // Копируем обрезанную область
      croppedCtx.drawImage(
        canvas,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );
      
      // Конвертируем в черно-белое
      const croppedImageData = croppedCtx.getImageData(0, 0, cropWidth, cropHeight);
      const croppedData = croppedImageData.data;
      
      for (let i = 0; i < croppedData.length; i += 4) {
        const avg = (croppedData[i] + croppedData[i + 1] + croppedData[i + 2]) / 3;
        // Более агрессивный порог для четкого черно-белого
        const value = avg > 150 ? 255 : 0;
        croppedData[i] = value;
        croppedData[i + 1] = value;
        croppedData[i + 2] = value;
      }
      
      croppedCtx.putImageData(croppedImageData, 0, 0);
      
      // Конвертируем в base64
      resolve(croppedCanvas.toDataURL('image/png'));
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
};
