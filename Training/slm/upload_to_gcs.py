"""
Upload the finetuned GGUF model to Google Cloud Storage.

After uploading, the model is made publicly readable so the mobile app
can download it directly without authentication.

Usage:
    export GCS_BUCKET_NAME=your-bucket-name
    python upload_to_gcs.py

Or pass the bucket name as an argument:
    python upload_to_gcs.py --bucket your-bucket-name

Prerequisites:
    - gcloud CLI authenticated (gcloud auth application-default login)
    - Or GCS_PRIVATE_KEY / GCS_CLIENT_EMAIL env vars set (same as API/.env)
    - pip install google-cloud-storage
"""

import argparse
import glob
import os
import sys

from google.cloud import storage

GGUF_DIR = "./output/gguf"
GCS_MODEL_PREFIX = "models"


def find_gguf_file(directory: str, dest_filename: str) -> str:
    """Find the matching .gguf file in the output directory."""
    # Try exact match first
    exact = os.path.join(directory, dest_filename)
    if os.path.exists(exact):
        return exact
    # Fall back to any .gguf
    files = glob.glob(os.path.join(directory, "*.gguf"))
    if not files:
        print(f"Error: No .gguf files found in {directory}")
        print("Run finetune.py first to generate the model.")
        sys.exit(1)
    # Prefer Q4_K_M over F16
    for f in files:
        if "Q4_K_M" in f:
            return f
    return files[0]


def upload_to_gcs(bucket_name: str, source_path: str, destination_name: str) -> str:
    """Upload a file to GCS and make it publicly readable."""
    client = storage.Client(project=os.environ.get("GCS_PROJECT_ID", "research-ai-peer-dev"))
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(destination_name)

    file_size_mb = os.path.getsize(source_path) / (1024 * 1024)
    print(f"Uploading {source_path} ({file_size_mb:.0f} MB) to gs://{bucket_name}/{destination_name}")

    # Upload with resumable upload for large files
    blob.upload_from_filename(source_path, timeout=600)

    gcs_path = f"gs://{bucket_name}/{destination_name}"
    return gcs_path


def main():
    parser = argparse.ArgumentParser(description="Upload finetuned GGUF model to GCS")
    parser.add_argument(
        "--bucket",
        default=os.environ.get("GCS_BUCKET_NAME"),
        help="GCS bucket name (or set GCS_BUCKET_NAME env var)",
    )
    parser.add_argument(
        "--gguf-dir",
        default=GGUF_DIR,
        help=f"Directory containing the .gguf file (default: {GGUF_DIR})",
    )
    parser.add_argument(
        "--dest-filename",
        default="Qwen3.5-0.8B-aipeer-Q4_K_M.gguf",
        help="Filename to use in GCS",
    )
    args = parser.parse_args()

    if not args.bucket:
        print("Error: No bucket specified.")
        print("Set GCS_BUCKET_NAME env var or pass --bucket")
        sys.exit(1)

    # Find the GGUF file
    gguf_path = find_gguf_file(args.gguf_dir, args.dest_filename)
    print(f"Found model: {gguf_path}")

    # Upload
    dest_path = f"{GCS_MODEL_PREFIX}/{args.dest_filename}"
    gcs_path = upload_to_gcs(args.bucket, gguf_path, dest_path)

    print(f"\nUpload complete!")
    print(f"GCS path: {gcs_path}")
    print(f"\nThe API endpoint GET /model/getModelURL will serve signed URLs for this file.")
    print(f"Make sure the GCS_BUCKET_NAME env var on Cloud Run matches: {args.bucket}")


if __name__ == "__main__":
    main()
