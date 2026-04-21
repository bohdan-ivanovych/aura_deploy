const vibe = (pattern: VibratePattern) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const haptics = {
  light:   () => vibe(10),
  medium:  () => vibe(25),
  heavy:   () => vibe([40, 10, 40]),
  success: () => vibe([15, 10, 30]),
  error:   () => vibe([60, 20, 60, 20, 60]),
};
