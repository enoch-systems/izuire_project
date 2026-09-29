"""Uploads every .mp4 in VIDEO_DIR to Cloudinary.

Credentials come from the environment, or from a git-ignored `.env` file next
to this script (see `.env.example`):
    CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (required)
    VIDEO_DIR                                                         (optional)
"""

import os
import sys
from pathlib import Path

import cloudinary
import cloudinary.uploader

ROOT = Path(__file__).resolve().parent


def load_env_file(env_path: Path) -> None:
    """Populate os.environ from a simple KEY=VALUE file without extra deps.
    Variables already present in the real environment take precedence."""
    if not env_path.is_file():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip("\"'")
        if key and key not in os.environ:
            os.environ[key] = value


load_env_file(ROOT / ".env")

VIDEO_DIR = Path(os.getenv("VIDEO_DIR") or r"C:\Users\HP\Downloads\ders")


def upload_folder(folder: Path) -> list[str]:
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")

    if not cloud_name:
        raise RuntimeError(
            "Missing CLOUDINARY_CLOUD_NAME. Set the environment variable or add "
            "it to .env (see .env.example)."
        )
    if not api_key:
        raise RuntimeError(
            "Missing CLOUDINARY_API_KEY. Set the environment variable or add it "
            "to .env (see .env.example)."
        )
    if not api_secret:
        raise RuntimeError(
            "Missing CLOUDINARY_API_SECRET. Set the environment variable or add "
            "it to .env (see .env.example)."
        )

    cloudinary.config(
        cloud=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
    )

    files = sorted(folder.glob("*.mp4"))
    if not files:
        raise FileNotFoundError(f"No .mp4 files found in {folder}")

    results: list[str] = []
    for file in files:
        res = cloudinary.uploader.upload(
            str(file),
            resource_type="video",
            folder="ders-videos",
            use_filename=True,
            unique_filename=False,
        )
        results.append(res.get("secure_url", ""))

    return results


if __name__ == "__main__":
    try:
        urls = upload_folder(VIDEO_DIR)
        print("Uploaded videos:")
        for url in urls:
            print(url)
    except Exception as exc:  # pragma: no cover - CLI error output
        print(f"Upload failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
