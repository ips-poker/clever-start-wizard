/**
 * Извлекает QR код из изображения и конвертирует в черно-белый формат
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
      
      // Находим границы белой области (QR код на белом фоне)
      let minX = canvas.width, minY = canvas.height;
      let maxX = 0, maxY = 0;
      
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Определяем светлые пиксели (белый фон QR кода)
          if (r > 200 && g > 200 && b > 200) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }
      
      // Добавляем небольшой отступ
      const padding = 20;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(canvas.width, maxX + padding);
      maxY = Math.min(canvas.height, maxY + padding);
      
      // Создаем новый canvas с обрезанным изображением
      const croppedWidth = maxX - minX;
      const croppedHeight = maxY - minY;
      const croppedCanvas = document.createElement('canvas');
      const croppedCtx = croppedCanvas.getContext('2d');
      
      if (!croppedCtx) {
        reject(new Error('Could not get cropped canvas context'));
        return;
      }
      
      croppedCanvas.width = croppedWidth;
      croppedCanvas.height = croppedHeight;
      
      // Копируем обрезанную область
      croppedCtx.drawImage(
        canvas,
        minX, minY, croppedWidth, croppedHeight,
        0, 0, croppedWidth, croppedHeight
      );
      
      // Конвертируем в черно-белое
      const croppedImageData = croppedCtx.getImageData(0, 0, croppedWidth, croppedHeight);
      const croppedData = croppedImageData.data;
      
      for (let i = 0; i < croppedData.length; i += 4) {
        const avg = (croppedData[i] + croppedData[i + 1] + croppedData[i + 2]) / 3;
        // Пороговое значение для черно-белого
        const value = avg > 128 ? 255 : 0;
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
