import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import JSZip from 'jszip';
import { extractText } from './claude';
import type { AgentConfig } from './semanticLayer';

const TEXT_EXT = ['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'log', 'text'];
const IMG_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif', 'bmp', 'tiff'];

export interface ImportedDoc {
  title: string;
  content: string;
}

/** Opens the file picker and returns extracted text from any supported document, or null if cancelled. */
export async function pickAndExtract(cfg: AgentConfig | null): Promise<ImportedDoc | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (res.canceled) return null;
  const file = res.assets[0];
  if (!file) return null;

  const name = file.name || 'Document';
  const ext = name.toLowerCase().split('.').pop() || '';
  const mime = (file.mimeType || '').toLowerCase();
  const title = name.replace(/\.[^.]+$/, '');

  let content = '';

  if (TEXT_EXT.includes(ext) || mime.startsWith('text/') || mime === 'application/json') {
    content = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
  } else if (ext === 'docx') {
    content = await extractDocx(file.uri);
  } else if (ext === 'pdf' || mime.includes('pdf')) {
    if (!cfg) throw new Error('Add a Claude API key in Settings to import PDFs.');
    const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
    content = await extractText({ apiKey: cfg.apiKey, model: cfg.models.summarizer, kind: 'pdf', mediaType: 'application/pdf', base64 });
  } else if (IMG_EXT.includes(ext) || mime.startsWith('image/')) {
    if (!cfg) throw new Error('Add a Claude API key in Settings to import images.');
    const { base64, mediaType } = await prepareImage(file.uri);
    content = await extractText({ apiKey: cfg.apiKey, model: cfg.models.summarizer, kind: 'image', mediaType, base64 });
  } else if (ext === 'doc') {
    throw new Error('Old .doc files aren’t supported — save it as PDF or .docx and try again.');
  } else {
    // Last resort: try to read it as text.
    try {
      content = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
    } catch {
      throw new Error('Unsupported file. Try a PDF, Word (.docx), an image, or a text file.');
    }
  }

  content = content.trim();
  if (!content) throw new Error('No readable text was found in that file.');
  return { title, content };
}

/** Word .docx is a zip of XML — unzip in pure JS and strip the tags. */
async function extractDocx(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const zip = await JSZip.loadAsync(base64, { base64: true });
  const xmlFile = zip.file('word/document.xml');
  if (!xmlFile) throw new Error('Couldn’t read that Word file.');
  const xml = await xmlFile.async('string');
  return xml
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:tab[^>]*>/g, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Convert (HEIC/etc.) → JPEG and downscale so Claude vision can read it. */
async function prepareImage(uri: string): Promise<{ base64: string; mediaType: string }> {
  const result = await manipulateAsync(uri, [{ resize: { width: 1400 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  });
  return { base64: result.base64 || '', mediaType: 'image/jpeg' };
}
