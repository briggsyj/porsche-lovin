// Resolves to the loaded image, or null if it's missing/broken (so callers can fall back).
export function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function imageFromCanvas(canvas) {
  return loadImage(canvas.toDataURL('image/png'));
}
