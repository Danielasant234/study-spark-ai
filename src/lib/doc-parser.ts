import mammoth from 'mammoth';
import JSZip from 'jszip';

export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

export async function extractTextFromPptx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Collect slide files sorted by number
  const slideFiles: { name: string; num: number }[] = [];
  zip.forEach((path) => {
    const match = path.match(/ppt\/slides\/slide(\d+)\.xml$/);
    if (match) slideFiles.push({ name: path, num: parseInt(match[1]) });
  });
  slideFiles.sort((a, b) => a.num - b.num);

  const texts: string[] = [];

  for (const sf of slideFiles) {
    const xml = await zip.file(sf.name)!.async('text');
    // Extract all text runs from the XML
    const textParts: string[] = [];
    const regex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(xml)) !== null) {
      textParts.push(m[1]);
    }
    if (textParts.length > 0) {
      texts.push(`--- Slide ${sf.num} ---\n${textParts.join(' ')}`);
    }
  }

  return texts.join('\n\n').trim();
}
