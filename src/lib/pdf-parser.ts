import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source to the unpkg CDN matching the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Use getDocument to load the PDF
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = '';

  // Iterate over all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    // Extract text from the page content items
    const strings = content.items.map((item: any) => item.str);
    // Join the strings with a space and add a newline at the end of the page
    fullText += strings.join(' ') + '\n\n';
  }

  return fullText.trim();
}
