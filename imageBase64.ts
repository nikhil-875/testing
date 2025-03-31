import axios from 'axios';
import sharp from 'sharp';

const TARGET_SIZE_BYTES = 10 * 1024; // 10 KB target
const MIN_QUALITY = 10;             // minimum allowed quality
const QUALITY_STEP = 10;            // reduce quality in steps of 10

/**
 * Downloads an image from the provided URL, compresses it until it is
 * 10KB or less (or until MIN_QUALITY is reached), then returns a base64 string.
 *
 * @param imageUrl - The URL of the image to process.
 * @returns A promise that resolves to the base64 string of the compressed image.
 */
export async function compressImageToBase64(imageUrl: string): Promise<string> {
  try {
    // Download the image as an arraybuffer
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const originalBuffer = Buffer.from(response.data);

    let quality = 80; // starting quality value
    let compressedBuffer = await sharp(originalBuffer)
      .jpeg({ quality })
      .toBuffer();

    // Iteratively reduce quality until we reach the target file size
    while (compressedBuffer.length > TARGET_SIZE_BYTES && quality > MIN_QUALITY) {
      quality -= QUALITY_STEP;
      compressedBuffer = await sharp(originalBuffer)
        .jpeg({ quality })
        .toBuffer();
    }

    if (compressedBuffer.length > TARGET_SIZE_BYTES) {
      console.warn(`Warning: The compressed image is ${compressedBuffer.length} bytes, which is above 10KB.`);
    } else {
      console.log(`Image compressed to ${compressedBuffer.length} bytes using quality level ${quality}.`);
    }

    // Convert the compressed buffer to a Base64 string
    return compressedBuffer.toString('base64');
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}


