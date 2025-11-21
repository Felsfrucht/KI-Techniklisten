export const extractTextFromPDF = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    
    fileReader.onload = async function() {
      const typedarray = new Uint8Array(this.result as ArrayBuffer);

      try {
        // Initialize PDF.js worker
        if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
           window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Simple text extraction, preserving some spatial awareness by newlines
          const pageText = textContent.items
            .map((item: any) => item.str + (item.hasEOL ? '\n' : ' '))
            .join('');
            
          fullText += `--- PAGE ${i} ---\n${pageText}\n`;
        }

        resolve(fullText);
      } catch (error) {
        console.error("PDF Extraction Error:", error);
        reject(error);
      }
    };

    fileReader.onerror = reject;
    fileReader.readAsArrayBuffer(file);
  });
};