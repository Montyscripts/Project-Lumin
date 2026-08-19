import os
import sys
import glob
import shutil
import zipfile
import tempfile
import urllib.request
import logging
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

# Official and reliable static mirrors for Windows 64-bit ffmpeg essentials builds
FFMPEG_WINDOWS_URLS = [
    "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip",
    "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
]

def get_project_root() -> str:
    """Returns the absolute root directory of the LUMIN project."""
    # upload_pipeline is in core/, ffmpeg_bootstrap is in utils/ -> root is parent
    current_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(current_dir)

def get_portable_ffmpeg_dir() -> str:
    """Returns <project_root>/bin/ffmpeg path."""
    return os.path.join(get_project_root(), "bin", "ffmpeg")

def find_portable_binaries() -> Tuple[Optional[str], Optional[str]]:
    """
    Checks for project-local portable ffmpeg and ffprobe binaries.
    """
    bin_dir = get_portable_ffmpeg_dir()
    is_win = os.name == "nt" or sys.platform.startswith("win")
    
    ffmpeg_name = "ffmpeg.exe" if is_win else "ffmpeg"
    ffprobe_name = "ffprobe.exe" if is_win else "ffprobe"
    
    ffmpeg_path = os.path.join(bin_dir, ffmpeg_name)
    ffprobe_path = os.path.join(bin_dir, ffprobe_name)
    
    found_ffmpeg = ffmpeg_path if os.path.isfile(ffmpeg_path) else None
    found_ffprobe = ffprobe_path if os.path.isfile(ffprobe_path) else None
    
    return found_ffmpeg, found_ffprobe

def ensure_portable_ffmpeg() -> Tuple[Optional[str], Optional[str]]:
    """
    Ensures ffmpeg and ffprobe binaries are available in <project_root>/bin/ffmpeg.
    If missing and running on Windows, downloads and extracts only ffmpeg.exe and ffprobe.exe.
    Returns (ffmpeg_path, ffprobe_path) or (None, None) on failure.
    """
    # 1. First check if already present in project-local bin/ffmpeg
    ffmpeg_path, ffprobe_path = find_portable_binaries()
    if ffmpeg_path and ffprobe_path:
        return ffmpeg_path, ffprobe_path

    # Only auto-download on Windows environments where system ffmpeg is frequently missing
    is_win = os.name == "nt" or sys.platform.startswith("win")
    if not is_win:
        return ffmpeg_path, ffprobe_path

    target_dir = get_portable_ffmpeg_dir()
    os.makedirs(target_dir, exist_ok=True)

    logger.info("[FFMPEG-BOOTSTRAP] System ffmpeg not detected. Attempting portable auto-provision...")
    print(">>> [FFMPEG BOOTSTRAP]: Downloading portable ffmpeg essentials for video analysis...")

    temp_zip = None
    try:
        # Create temp file for download
        fd, temp_zip = tempfile.mkstemp(suffix=".zip", prefix="ffmpeg_dl_")
        os.close(fd)

        download_success = False
        for url in FFMPEG_WINDOWS_URLS:
            try:
                logger.info(f"[FFMPEG-BOOTSTRAP] Downloading from {url}...")
                req = urllib.request.Request(
                    url,
                    headers={"User-Agent": "LUMIN-Agent/1.0 (Windows NT; x64)"}
                )
                with urllib.request.urlopen(req, timeout=45) as resp, open(temp_zip, "wb") as out_file:
                    shutil.copyfileobj(resp, out_file)
                download_success = True
                break
            except Exception as dl_err:
                logger.warning(f"[FFMPEG-BOOTSTRAP] Download failed from {url}: {dl_err}")

        if not download_success:
            logger.warning("[FFMPEG-BOOTSTRAP] Could not download portable ffmpeg from any configured source.")
            return None, None

        # Extract only ffmpeg.exe and ffprobe.exe into target_dir
        with zipfile.ZipFile(temp_zip, "r") as zf:
            for member in zf.namelist():
                lower_name = member.lower().replace("\\", "/")
                if lower_name.endswith("/bin/ffmpeg.exe") or lower_name.endswith("ffmpeg.exe"):
                    source = zf.open(member)
                    target_file = os.path.join(target_dir, "ffmpeg.exe")
                    with open(target_file, "wb") as target:
                        shutil.copyfileobj(source, target)
                    ffmpeg_path = target_file
                elif lower_name.endswith("/bin/ffprobe.exe") or lower_name.endswith("ffprobe.exe"):
                    source = zf.open(member)
                    target_file = os.path.join(target_dir, "ffprobe.exe")
                    with open(target_file, "wb") as target:
                        shutil.copyfileobj(source, target)
                    ffprobe_path = target_file

        if ffmpeg_path and os.path.isfile(ffmpeg_path):
            print(f">>> [FFMPEG BOOTSTRAP]: Portable ffmpeg successfully provisioned at: {ffmpeg_path}")
            return ffmpeg_path, ffprobe_path

    except Exception as e:
        logger.error(f"[FFMPEG-BOOTSTRAP] Error during portable ffmpeg provisioning: {e}")
    finally:
        if temp_zip and os.path.exists(temp_zip):
            try:
                os.remove(temp_zip)
            except Exception:
                pass

    return ffmpeg_path, ffprobe_path
