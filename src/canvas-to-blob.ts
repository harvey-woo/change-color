export function canvasToBlob(canvas: OffscreenCanvas | HTMLCanvasElement): Promise<Blob> {
  if ('toBlob' in canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('canvas to blob failed'));
        }
      });
    });
  }
  return canvas.convertToBlob();
}

export default canvasToBlob;
