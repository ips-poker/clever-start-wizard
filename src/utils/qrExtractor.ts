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
      
      // Находим границы белой области (QR код на белом фоне)
      let minX = canvas.width, minY = canvas.height;
      let maxX = 0, maxY = 0;
      
      // Определяем порог для белого цвета
      const whiteThreshold = 180;
      
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Определяем светлые пиксели (белый фон QR кода)
          if (r > whiteThreshold && g > whiteThreshold && b > whiteThreshold) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }
      
      // Вычисляем центр белой области
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      // Определяем размер обрезки (квадрат вокруг центра)
      const size = Math.min(maxX - minX, maxY - minY) * 0.85;
      
      // Вычисляем координаты обрезки
      const cropX = Math.max(0, centerX - size / 2);
      const cropY = Math.max(0, centerY - size / 2);
      const cropWidth = Math.min(size, canvas.width - cropX);
      const cropHeight = Math.min(size, canvas.height - cropY);
      
      // Создаем новый canvas с обрезанным изображением
      const croppedCanvas = document.createElement('canvas');
      const croppedCtx = croppedCanvas.getContext('2d');
      
      if (!croppedCtx) {
        reject(new Error('Could not get cropped canvas context'));
        return;
      }
      
      croppedCanvas.width = cropWidth;
      croppedCanvas.height = cropHeight;
      
      // Заливаем белым фоном
      croppedCtx.fillStyle = '#FFFFFF';
      croppedCtx.fillRect(0, 0, cropWidth, cropHeight);
      
      // Копируем обрезанную область
      croppedCtx.drawImage(
        canvas,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );
      
      // Конвертируем в base64
      resolve(croppedCanvas.toDataURL('image/png'));
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
};
