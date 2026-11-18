/**
 * NEXORA MEDIA DECODER & VERIFICATION UTILITY
 * Pure Node.js binary format verification for PNG, JPEG, WEBP, MP4, AAC, and WAV.
 */

const fs = require('fs');

function inspectImage(buffer) {
  if (!buffer || buffer.length < 8) {
    return { valid: false, error: 'Buffer too small for image signature' };
  }

  // PNG
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    const bitDepth = buffer.readUInt8(24);
    const colorType = buffer.readUInt8(25);
    return {
      valid: true,
      format: 'image/png',
      width,
      height,
      bitDepth,
      colorType,
      size: buffer.length,
      aspectRatio: (width / height).toFixed(2),
    };
  }

  // WEBP
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') {
    let width = 0;
    let height = 0;
    const vp8 = buffer.slice(12, 16).toString('ascii');
    if (vp8 === 'VP8 ') {
      // VP8 keyframe
      width = buffer.readUInt16LE(26) & 0x3fff;
      height = buffer.readUInt16LE(28) & 0x3fff;
    } else if (vp8 === 'VP8L') {
      // VP8L lossless
      const b0 = buffer.readUInt8(21);
      const b1 = buffer.readUInt8(22);
      const b2 = buffer.readUInt8(23);
      const b3 = buffer.readUInt8(24);
      width = 1 + (((b1 & 0x3f) << 8) | b0);
      height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    } else if (vp8 === 'VP8X') {
      // VP8X extended
      width = 1 + buffer.readUIntLE(24, 3);
      height = 1 + buffer.readUIntLE(27, 3);
    }
    return {
      valid: true,
      format: 'image/webp',
      width,
      height,
      size: buffer.length,
      aspectRatio: width && height ? (width / height).toFixed(2) : 'unknown',
    };
  }

  // JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xFF) break;
      const marker = buffer[offset + 1];
      if (marker === 0xC0 || marker === 0xC2) { // SOF0 or SOF2
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return {
          valid: true,
          format: 'image/jpeg',
          width,
          height,
          size: buffer.length,
          aspectRatio: (width / height).toFixed(2),
        };
      }
      offset += 2 + buffer.readUInt16BE(offset + 2);
    }
  }

  return { valid: false, error: 'Unknown or corrupted image container' };
}

function inspectAudio(buffer) {
  if (!buffer || buffer.length < 16) {
    return { valid: false, error: 'Buffer too small for audio stream' };
  }

  // WAV
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WAVE') {
    const channels = buffer.readUInt16LE(22);
    const sampleRate = buffer.readUInt32LE(24);
    const bitsPerSample = buffer.readUInt16LE(34);
    const dataSize = buffer.length - 44;
    const durationSeconds = (dataSize / (sampleRate * channels * (bitsPerSample / 8))).toFixed(2);
    return {
      valid: true,
      format: 'audio/wav',
      channels,
      sampleRate,
      bitsPerSample,
      durationSeconds: parseFloat(durationSeconds),
      size: buffer.length,
    };
  }

  // AAC ADTS
  if (buffer[0] === 0xFF && (buffer[1] & 0xF0) === 0xF0) {
    const mpegVersion = (buffer[1] & 0x08) === 0 ? 'MPEG-4' : 'MPEG-2';
    const sampleFreqIndex = (buffer[2] & 0x3C) >> 2;
    const sampleRates = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
    const sampleRate = sampleRates[sampleFreqIndex] || 44100;
    const channelConfig = ((buffer[2] & 0x01) << 2) | ((buffer[3] & 0xC0) >> 6);

    // Count ADTS frames to estimate duration
    let frames = 0;
    let offset = 0;
    while (offset < buffer.length - 7) {
      if (buffer[offset] === 0xFF && (buffer[offset + 1] & 0xF0) === 0xF0) {
        const frameLength = ((buffer[offset + 3] & 0x03) << 11) | (buffer[offset + 4] << 3) | ((buffer[offset + 5] & 0xE0) >> 5);
        if (frameLength < 7) break;
        frames++;
        offset += frameLength;
      } else {
        offset++;
      }
    }
    const durationSeconds = frames > 0 ? (frames * 1024 / sampleRate).toFixed(2) : 'unknown';

    return {
      valid: true,
      format: 'audio/aac',
      mpegVersion,
      sampleRate,
      channels: channelConfig,
      framesCount: frames,
      durationSeconds: parseFloat(durationSeconds) || undefined,
      size: buffer.length,
    };
  }

  // M4A / MP4 Audio container
  if (buffer.slice(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.slice(8, 12).toString('ascii').trim();
    const isMoov = buffer.includes(Buffer.from('moov'));
    const isMdat = buffer.includes(Buffer.from('mdat'));
    return {
      valid: isMoov && isMdat,
      format: 'audio/mp4',
      brand,
      hasMoovAtom: isMoov,
      hasMdatAtom: isMdat,
      size: buffer.length,
    };
  }

  return { valid: false, error: 'Unknown or uncompressed audio signature' };
}

function inspectVideo(buffer) {
  if (!buffer || buffer.length < 32) {
    return { valid: false, error: 'Buffer too small for video stream' };
  }

  const ftyp = buffer.slice(4, 8).toString('ascii');
  if (ftyp !== 'ftyp') {
    return { valid: false, error: 'Missing MP4 ftyp container header' };
  }

  const majorBrand = buffer.slice(8, 12).toString('ascii').trim();
  const hasMoov = buffer.includes(Buffer.from('moov'));
  const hasMdat = buffer.includes(Buffer.from('mdat'));
  const hasAvc1 = buffer.includes(Buffer.from('avc1'));
  const hasMp4v = buffer.includes(Buffer.from('mp4v'));

  const codec = hasAvc1 ? 'H.264 (avc1)' : hasMp4v ? 'MPEG-4 (mp4v)' : 'ISO Media / Video';

  return {
    valid: hasMoov && hasMdat,
    format: 'video/mp4',
    majorBrand,
    codec,
    hasMoovAtom: hasMoov,
    hasMdatAtom: hasMdat,
    browserPlayable: hasMoov && hasMdat && (hasAvc1 || hasMp4v || majorBrand.startsWith('mp4') || majorBrand.startsWith('isom')),
    size: buffer.length,
  };
}

module.exports = {
  inspectImage,
  inspectAudio,
  inspectVideo,
};
