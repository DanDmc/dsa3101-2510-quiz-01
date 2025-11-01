"""
PDF Text and Page Image Extractor
==================================

This module extracts text content from PDF files and saves ALL pages as images
for visual reference in the frontend. It is standardized on Python's pathlib.Path.
"""
import re
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
    
    Parameters
    ----------
    source_dir : Path, default="data/source_files"
        Directory containing the PDF files to process.
    text_dir : Path, default="data/text_extracted"
        Directory where extracted text files (.txt) will be saved.
    media_dir : Path, default="data/question_media"
        Directory where ALL page images will be stored.
    target_pdf : str, default=None
        If provided, only this specific PDF filename will be processed.
    """
    # 1. Setup Directories
    text_dir.mkdir(parents=True, exist_ok=True)
    media_dir.mkdir(parents=True, exist_ok=True)
    
    pdf_files_to_process = []
    
    # 2. Determine Files to Process (Consolidated V2 Logic)
    if target_pdf:
        # SINGLE FILE MODE (Pipeline)
        pdf_file_name = Path(target_pdf).name # Ensure we only use the filename component
        pdf_path_full = source_dir / pdf_file_name
        
        if not pdf_path_full.exists():
            print(f" ❌ Error: Target file not found: {pdf_path_full}")
            sys.exit(1) # Signal failure to the main app
        
        pdf_files_to_process = [pdf_file_name] 
        print(f"\n Found 1 target PDF file to process: {pdf_file_name}\n")
    else:
        # LEGACY MODE (Batch process all .pdf files)
        # Use Path.glob() for clean file filtering
        pdf_files_to_process = [f.name for f in source_dir.glob("*.pdf")]
        
        if not pdf_files_to_process:
            print(f" No PDF files found in {source_dir}")
            return
        print(f"\n Found {len(pdf_files_to_process)} PDF file(s) to process (legacy mode)\n")
    # --- End Determination ---

    # 3. Process Files
    for pdf_file_name in pdf_files_to_process:
        pdf_path = source_dir / pdf_file_name
        base_name = pdf_file_name.stem
        txt_filename = base_name + ".txt"
        text_output_path = text_dir / txt_filename

        print(f"Extracting text and saving ALL page images from {pdf_file_name}...")

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

            print(f" ✅ Saved extracted text to {text_output_path.name}")
            print(f" 🖼️ Saved {total_pages} page image(s)")
            print()

        except Exception as e:
            print(f" ❌ Failed to process {pdf_file_name}: {e}\n")


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