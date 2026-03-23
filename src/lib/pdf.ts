/**
 * Generate a PDF from markdown content using the browser's print API.
 * This creates a clean, styled document without external dependencies.
 */
export function downloadMarkdownAsPdf(title: string, markdownHtml: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Permita pop-ups para baixar o PDF.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Inter', system-ui, sans-serif;
          color: #1a1a1a;
          line-height: 1.7;
          padding: 48px;
          max-width: 800px;
          margin: 0 auto;
        }

        .header {
          border-bottom: 2px solid #2a9d6e;
          padding-bottom: 16px;
          margin-bottom: 32px;
        }

        .header h1 {
          font-size: 24px;
          font-weight: 700;
          color: #2a9d6e;
        }

        .header .meta {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }

        h1 { font-size: 22px; font-weight: 700; margin: 24px 0 12px; color: #1a1a1a; }
        h2 { font-size: 18px; font-weight: 600; margin: 20px 0 10px; color: #2a9d6e; }
        h3 { font-size: 15px; font-weight: 600; margin: 16px 0 8px; }
        
        p { margin: 8px 0; font-size: 14px; }
        
        ul, ol { margin: 8px 0; padding-left: 24px; font-size: 14px; }
        li { margin: 4px 0; }
        
        strong { font-weight: 600; }
        
        code {
          background: #f0f4f0;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
          font-family: 'Fira Code', monospace;
        }
        
        pre {
          background: #f5f7f5;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 12px 0;
          font-size: 13px;
        }
        
        blockquote {
          border-left: 3px solid #2a9d6e;
          padding-left: 16px;
          margin: 12px 0;
          color: #555;
          font-style: italic;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-size: 13px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px 12px;
          text-align: left;
        }
        th { background: #f0f4f0; font-weight: 600; }

        .footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid #ddd;
          font-size: 11px;
          color: #999;
          text-align: center;
        }

        @media print {
          body { padding: 24px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📚 ${title}</h1>
        <div class="meta">Gerado por StudyAI · ${new Date().toLocaleDateString("pt-BR")}</div>
      </div>
      ${markdownHtml}
      <div class="footer">Gerado automaticamente por StudyAI</div>
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 300);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
