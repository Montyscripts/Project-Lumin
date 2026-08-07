/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
interface GenAiBlob {
  data: string;
  mimeType: string;
}

function encode(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function createBlob(data: Float32Array): GenAiBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // convert float32 -1 to 1 to int16 -32768 to 32767
    int16[i] = data[i] * 32768;
  }

  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function blobToBase64(blob: globalThis.Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // remove the "data:image/jpeg;base64," part
      resolve(base64data.substr(base64data.indexOf(',') + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


function sanitizeTextForTTS(text: string): string {
  if (!text) return '';

  let clean = String(text);

  // 1. Remove <thought>...</thought> tags and XML/HTML tags
  clean = clean.replace(/<thought>[\s\S]*?(?:<\/thought>|$)/gi, '');
  clean = clean.replace(/<[^>]+>/g, ' ');

  // 2. Handle fenced code blocks
  clean = clean.replace(/```[\s\S]*?```/g, (match) => {
    const lines = match.split('\n').filter(l => l.trim() && !l.trim().startsWith('```'));
    if (lines.length > 3 || match.length > 150) {
      return ' Code snippet omitted. ';
    }
    return ' ' + lines.join('. ') + '. ';
  });

  // 3. Remove inline code backticks: `code` -> code
  clean = clean.replace(/`([^`]+)`/g, '$1');

  // 4. Convert markdown links: [text](url) -> text
  clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 5. Remove standalone URLs (http://..., https://...)
  clean = clean.replace(/https?:\/\/\S+/gi, '');

  // 6. Remove Markdown headings: # Heading, ## Heading -> Heading.
  clean = clean.replace(/^[ \t]*#{1,6}[ \t]+(.*)$/gm, '$1.');

  // 7. Remove horizontal rules: ---, ***, ___
  clean = clean.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');

  // 8. Remove blockquotes prefix: > quote -> quote
  clean = clean.replace(/^[ \t]*>[ \t]*/gm, '');

  // 9. Remove Markdown tables formatting: | col | col |
  clean = clean.replace(/^[ \t]*\|.*?\|[ \t]*$/gm, (match) => {
    if (match.includes('---')) return '';
    const cells = match.split('|').map(c => c.trim()).filter(Boolean);
    return cells.length > 0 ? cells.join(', ') + '.' : '';
  });

  // 10. Clean up bullet points & numbered lists at start of lines
  clean = clean.replace(/^[ \t]*[*+\-•][ \t]+/gm, '');
  clean = clean.replace(/^[ \t]*(\d+)\.[ \t]+/gm, '$1, ');

  // 11. Remove bold, italic, strikethrough markers: **text**, *text*, __text__, _text_, ~~text~~
  clean = clean.replace(/\~\~([^\~]+)\~\~/g, '$1');
  clean = clean.replace(/\*\*([^*]+)\*\*/g, '$1');
  clean = clean.replace(/\*([^*]+)\*/g, '$1');
  clean = clean.replace(/__([^_]+)__/g, '$1');
  clean = clean.replace(/_([^_]+)_/g, '$1');

  // 12. Replace arrows and symbols with readable text
  clean = clean.replace(/->|=>/g, ' to ');
  clean = clean.replace(/<-|<=/g, ' from ');
  clean = clean.replace(/&/g, ' and ');

  // 13. Strip remaining raw markdown/formatting symbol characters (# * _ ~ ` | \ ^ < > { } [ ])
  clean = clean.replace(/[#*_~`|\\^<>{}\[\]]/g, ' ');

  // 14. Remove emojis and non-ASCII unicode symbols that TTS mispronounces
  clean = clean.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');

  // 15. Normalize spaces, newlines, and punctuation
  clean = clean.replace(/[ \t]+/g, ' ');
  clean = clean.replace(/(\s*[\r\n]\s*)+/g, '. ');
  clean = clean.replace(/\.{2,}/g, '.');
  clean = clean.replace(/\s+([.,!?])/g, '$1');

  return clean.trim();
}

export {blobToBase64, createBlob, decode, decodeAudioData, encode, sanitizeTextForTTS};