"""
PDF Text and Page Image Extractor
==================================

This module extracts text content from PDF files and saves ALL pages as images
for visual reference in the frontend. It is standardized on Python's pathlib.Path.
"""

import re
from pathlib import Path
import os
import sys
from pathlib import Path # <-- Use Pathlib for consistency
import pdfplumber


# NOTE: Default paths are now pathlib.Path objects
def extract_text_and_page_images(
    source_dir: Path = Path("data/source_files"), 
    text_dir: Path = Path("data/text_extracted"),
    media_dir: Path = Path("data/question_media"),
    target_pdf: str = None 
):
    """
    Extract text from all PDF files and save ALL pages as images.
    
    This function processes all PDFs in the source directory, extracting text
    and saving every single page as an image for visual reference.
    
    Args:
    ----------
    source_dir : str, default="data/source_files"
        Directory containing the PDF files to process
    text_dir : str, default="data/text_extracted"
        Directory where extracted text files (.txt) will be saved
    media_dir : str, default="data/question_media"
        Directory where ALL page images will be stored.
    target_pdf : str, default=None
        If provided, only this specific PDF filename will be processed.
        
    Returns:
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
    >>> extract_text_and_page_images()  # Use defaults (legacy, process all)
    >>> extract_text_and_page_images(target_pdf="my_file.pdf") # Process one file
    """
    os.makedirs(text_dir, exist_ok=True)
    os.makedirs(media_dir, exist_ok=True)

    target_pdf = os.environ.get("TARGET_PDF")
    if target_pdf:
        pdf_path = os.path.join(source_dir, target_pdf)
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"TARGET_PDF = {target_pdf} not found in {source_dir}")
        base_name = os.path.splitext(target_pdf)[0]
        txt_filename = base_name + ".txt"
        text_output_path = text_dir / txt_filename

        print(f"🧾 Extracting text and saving ALL page images from {target_pdf}...")

        try:
            with pdfplumber.open(pdf_path) as pdf:
                full_text = []
                total_pages = len(pdf.pages)

                for i, page in enumerate(pdf.pages, start=1):
                    page_text = page.extract_text() or ""

                    # --- CLEANING STEP ---
                    page_text = re.sub(r'\(cid:\d+\)', '', page_text)  # removes markers
                    page_text = re.sub(r'\s{2,}', ' ', page_text)    # normalize extra spaces

                    # Save EVERY page as image
                    img_filename = f"{base_name}_page{i}.png"
                    img_rel_path = media_dir / img_filename # Full path where image is saved

                    # Render entire page as image and save
                    page_image = page.to_image(resolution=200)
                    page_image.save(img_rel_path)

                    # Insert placeholder with path AND page number
                    # The path reported in the text file MUST be relative to the media_dir base
                    # to be correctly resolved by the Flask app.
                    img_placeholder_path = Path(media_dir.name) / img_filename
                    placeholder = f"[PAGE_IMAGE_SAVED: {img_placeholder_path}] [PAGE_NUMBER: {i}]"
                    page_text += f"\n{placeholder}\n"

                    full_text.append(page_text.strip())

                # Combine pages with clear breaks
                text = "\n\n=== PAGE BREAK ===\n\n".join(full_text)

            # Write final text file
            with open(text_output_path, "w", encoding="utf-8") as f:
                f.write(text)

            print(f"✅ Saved extracted text to {text_output_path}")
            print(f"🖼️ Saved {total_pages} page image(s)")
            print()

        except Exception as e:
            print(f"❌ Failed to process {target_pdf}: {e}\n")

if __name__ == "__main__":
    # --- Execute the unified function based on ENV var ---
    
    target_pdf = os.getenv("TARGET_PDF")
    
    if not target_pdf:
        print("Warning: TARGET_PDF environment variable not set.")
        print("Running in 'process all' mode (legacy).\n")
        # Call with no args for batch processing
        extract_text_and_page_images() 
    else:
        print(f"Processing single file from TARGET_PDF: {target_pdf}\n")
        # Pass the environment variable directly (which is the filename string)
        extract_text_and_page_images(target_pdf=target_pdf)