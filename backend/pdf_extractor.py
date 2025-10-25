"""
PDF Text and Page Image Extractor
==================================

This module extracts text content from PDF files and saves ALL pages as images
for visual reference in the frontend.

Features:
- Extracts text from all pages of PDF files
- Saves EVERY page as PNG (not just pages with embedded images)
- Inserts page image path placeholders in text with page numbers
- Maintains page break information for context

The extracted text and page image references are used by llm_parser.py to 
structure questions into the database.
"""

import os
import pdfplumber


def extract_text_and_page_images(
    source_dir="data/source_files", 
    text_dir="data/text_extracted",
    media_dir="data/question_media"
):
    """
    Extract text from all PDF files and save ALL pages as images.
    
    This function processes all PDFs in the source directory, extracting text
    and saving every single page as an image for visual reference.
    
    Parameters
    ----------
    source_dir : str, default="data/source_files"
        Directory containing the PDF files to process.
    text_dir : str, default="data/text_extracted"
        Directory where extracted text files (.txt) will be saved.
    media_dir : str, default="data/question_media"
        Directory where ALL page images will be stored.
        
    Returns
    -------
    None
        Files are written to disk. Progress is printed to console.
        
    Notes
    -----
    - Page image placeholder format: [PAGE_IMAGE_SAVED: {path}] [PAGE_NUMBER: {num}]
    - Page breaks are marked with: === PAGE BREAK ===
    - Images are saved at 200 DPI resolution for quality
    - ALL pages are saved as images (not just those with embedded images)
    
    Examples
    --------
    >>> extract_text_and_page_images()  # Use defaults
    >>> extract_text_and_page_images(media_dir="data/custom_images")  # Custom path
    """
    os.makedirs(text_dir, exist_ok=True)
    os.makedirs(media_dir, exist_ok=True)
    
    pdf_files = [f for f in os.listdir(source_dir) if f.lower().endswith(".pdf")]

    if not pdf_files:
        print(f"⚠️  No PDF files found in {source_dir}")
        return

    print(f"\n🔍 Found {len(pdf_files)} PDF file(s) to process\n")

    for pdf_file in pdf_files:
        pdf_path = os.path.join(source_dir, pdf_file)
        base_name = os.path.splitext(pdf_file)[0]
        txt_filename = base_name + ".txt"
        text_output_path = os.path.join(text_dir, txt_filename)

        print(f"🧾 Extracting text and saving ALL page images from {pdf_file}...")

        try:
            with pdfplumber.open(pdf_path) as pdf:
                full_text = []
                total_pages = len(pdf.pages)

                for i, page in enumerate(pdf.pages, start=1):
                    page_text = page.extract_text() or ""

                    # Save EVERY page as image
                    img_filename = f"{base_name}_page{i}.png"
                    img_rel_path = os.path.join(media_dir, img_filename)

                    # Render entire page as image and save
                    page_image = page.to_image(resolution=200)
                    page_image.save(img_rel_path)

                    # Insert placeholder with path AND page number
                    placeholder = f"[PAGE_IMAGE_SAVED: {img_rel_path}] [PAGE_NUMBER: {i}]"
                    page_text += f"\n{placeholder}\n"

                    full_text.append(page_text.strip())

                # Combine pages with clear breaks
                text = "\n\n=== PAGE BREAK ===\n\n".join(full_text)

            # Write final text file
            with open(text_output_path, "w", encoding="utf-8") as f:
                f.write(text)

            print(f"✅ Saved extracted text to {text_output_path}")
            print(f"   🖼️  Saved {total_pages} page image(s)")
            print()

        except Exception as e:
            print(f"❌ Failed to process {pdf_file}: {e}\n")


if __name__ == "__main__":
    extract_text_and_page_images()