/**
 * Where a gallery photo's print (its 360px thumbnail, see
 * scripts/build-prints.mjs) lives, relative to the media root:
 * "4fotos/410photos_peru/RIMG0781.jpg" -> "prints/4fotos/410photos_peru/RIMG0781.jpg".
 * Shared by the script that makes them and the gallery that shows them.
 *
 * @param {string} src gallery photo path relative to the media root
 * @returns {string}
 */
export function printPath(src) {
  return `prints/${src.replace(/\.[a-z0-9]+$/i, "")}.jpg`;
}

/** How far each print is turned, repeating — loose prints, not a grid. */
export const PRINT_TILTS = [-2, 1.5, -1, 2.2, -1.6, 0.6, 1.2, -0.5, 1.8, -2.3, 0.9, -1.1];
