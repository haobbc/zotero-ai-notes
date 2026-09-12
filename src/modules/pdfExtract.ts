/**
 * PDF text extraction utilities for Zotero items
 */

/**
 * Maximum pages to extract from PDF
 */
const MAX_PAGES = 20;

/**
 * Extract text from a PDF attachment
 *
 * @param item - Zotero parent item
 * @returns Extracted text or null if no PDF found
 */
export async function extractPdfText(
  item: Zotero.Item,
): Promise<string | null> {
  // Get all attachments
  const attachmentIDs = item.getAttachments();

  if (!attachmentIDs || attachmentIDs.length === 0) {
    ztoolkit.log(`No attachments found for item ${item.id}`);
    return null;
  }

  // Find PDF attachment
  for (const attachmentID of attachmentIDs) {
    const attachment = await Zotero.Items.getAsync(attachmentID);

    if (!attachment) continue;

    const contentType = attachment.attachmentContentType;
    if (contentType !== "application/pdf") continue;

    ztoolkit.log(`Found PDF attachment: ${attachment.id}`);

    try {
      // Get file path to verify file exists
      const filePath = await attachment.getFilePathAsync();

      if (!filePath) {
        ztoolkit.log(`No file path for attachment ${attachment.id}`);
        continue;
      }

      ztoolkit.log(`PDF path: ${filePath}`);

      // Use Zotero's PDF extraction with attachment ID
      const text = await extractTextFromAttachment(attachment.id, filePath);

      if (text && text.trim().length > 0) {
        ztoolkit.log(`Extracted ${text.length} characters from PDF`);
        return text;
      }
    } catch (e) {
      ztoolkit.log(
        `Error extracting PDF: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  }

  return null;
}

/**
 * Extract text from a PDF attachment using Zotero's PDF worker
 *
 * @param attachmentID - Zotero attachment item ID
 * @param filePath - Path to the PDF file (for fallback)
 * @returns Extracted text
 */
async function extractTextFromAttachment(
  attachmentID: number,
  filePath: string,
): Promise<string> {
  // Method 1: Use Zotero.PDFWorker.getFullText with attachment ID
  try {
    const ZoteroAny = Zotero as any;
    if (ZoteroAny.PDFWorker && ZoteroAny.PDFWorker.getFullText) {
      ztoolkit.log(`Trying PDFWorker.getFullText with ID: ${attachmentID}`);
      const result = await ZoteroAny.PDFWorker.getFullText(
        attachmentID,
        MAX_PAGES,
      );
      if (result && result.text) {
        return result.text;
      }
    }
  } catch (e) {
    ztoolkit.log(`PDFWorker.getFullText failed: ${e}`);
  }

  // Method 2: Use Zotero.Fulltext.getTextFromDocument
  try {
    const ZoteroAny = Zotero as any;
    if (ZoteroAny.Fulltext && ZoteroAny.Fulltext.getItemContent) {
      ztoolkit.log(`Trying Fulltext.getItemContent with ID: ${attachmentID}`);
      const content = await ZoteroAny.Fulltext.getItemContent(attachmentID);
      if (content && content.content) {
        return content.content;
      }
    }
  } catch (e) {
    ztoolkit.log(`Fulltext.getItemContent failed: ${e}`);
  }

  // Method 3: Try reading cached full-text index
  try {
    const ZoteroAny = Zotero as any;
    if (ZoteroAny.Fulltext) {
      ztoolkit.log(`Trying to get cached fulltext for ID: ${attachmentID}`);
      const indexedContent =
        await ZoteroAny.Fulltext.getItemContent(attachmentID);
      if (indexedContent && indexedContent.content) {
        return indexedContent.content;
      }
    }
  } catch (e) {
    ztoolkit.log(`Cached fulltext failed: ${e}`);
  }

  // Method 4: Fall back to reading PDF file directly with IOUtils
  try {
    const text = await readPdfWithIOUtils(filePath);
    if (text) return text;
  } catch (e) {
    ztoolkit.log(`IOUtils PDF extraction failed: ${e}`);
  }

  throw new Error("Could not extract text from PDF");
}

/**
 * Read PDF text using IOUtils (Zotero 7 API)
 *
 * @param filePath - Path to PDF file
 * @returns Extracted text or null
 */
async function readPdfWithIOUtils(filePath: string): Promise<string | null> {
  try {
    const data = await IOUtils.read(filePath);

    // Try to use Zotero's PDF.js

    const pdfjsLib = (globalThis as any).pdfjsLib as
      | {
          getDocument: (opts: { data: Uint8Array }) => {
            promise: Promise<any>;
          };
        }
      | undefined;

    if (!pdfjsLib || !pdfjsLib.getDocument) {
      ztoolkit.log("pdf.js not available");
      return null;
    }

    // Load PDF
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    const textParts: string[] = [];
    const numPages = Math.min(pdf.numPages, MAX_PAGES);

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: { str?: string }) => item.str || "")
        .join(" ");
      textParts.push(pageText);
    }

    return textParts.join("\n\n");
  } catch (e) {
    ztoolkit.log(`readPdfWithIOUtils error: ${e}`);
    return null;
  }
}

/**
 * Get abstract from a Zotero item
 *
 * @param item - Zotero item
 * @returns Abstract text or null
 */
export function getAbstract(item: Zotero.Item): string | null {
  try {
    const abstract = item.getField("abstractNote") as string;
    if (abstract && abstract.trim().length > 0) {
      return abstract.trim();
    }
  } catch (e) {
    ztoolkit.log(`Error getting abstract: ${e}`);
  }
  return null;
}

/**
 * Get title from a Zotero item
 *
 * @param item - Zotero item
 * @returns Title or "Untitled"
 */
export function getTitle(item: Zotero.Item): string {
  try {
    const title = item.getField("title") as string;
    if (title && title.trim().length > 0) {
      return title.trim();
    }
  } catch (e) {
    ztoolkit.log(`Error getting title: ${e}`);
  }
  return "Untitled";
}

export { getCitationKey } from "../utils/citationKey";
