#!/usr/bin/env python3
import json
import os
import shutil
import stat
import subprocess
import sys
import zipfile
from pathlib import Path

INPUT_ARCHIVE = Path(os.getenv("INPUT_ARCHIVE", "/input/submission.zip"))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "/output"))
OUTPUT_SITE_DIR = Path(os.getenv("OUTPUT_SITE_DIR", "/output/site"))
RESULT_PATH = OUTPUT_DIR / "deploy-result.json"
BUILD_LOG_PATH = OUTPUT_DIR / "build.log"
WORK_DIR = OUTPUT_DIR / "_work"
SOURCE_DIR = WORK_DIR / "source"
BUILD_DIR = WORK_DIR / "build"

MAX_FILES = int(os.getenv("MAX_EXTRACTED_FILES", "5000"))
MAX_EXTRACTED_BYTES = int(os.getenv("MAX_EXTRACTED_BYTES", str(500 * 1024 * 1024)))


def main():
    log("Preparing deployment runner")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    try:
        log("Extracting archive")
        safe_extract(INPUT_ARCHIVE, SOURCE_DIR)
        log("Archive extracted")
        log("Locking source directory read-only")
        make_read_only(SOURCE_DIR)
        log("Attempting build")
        build_summary = attempt_build()
        log("Writing deployment result")
        write_result(
            {
                "buildStatus": "passed",
                "buildLogSummary": build_summary,
                "outputDir": OUTPUT_SITE_DIR.name,
            }
        )
        log("Deployment runner completed")
    except Exception as exc:
        log(f"Deployment runner failed: {exc}")
        write_diagnostic_file(exc)
        write_result(
            {
                "buildStatus": "failed",
                "buildLogSummary": trim(str(exc), 4000),
                "outputDir": "",
            }
        )
        print(str(exc), file=sys.stderr)
        sys.exit(1)
    finally:
        cleanup_workdirs()


def log(message):
    print(message, flush=True)


def safe_extract(archive_path, target_dir):
    if target_dir.exists():
        shutil.rmtree(target_dir)

    target_dir.mkdir(parents=True)
    total_size = 0

    with zipfile.ZipFile(archive_path) as archive:
        entries = archive.infolist()

        if len(entries) > MAX_FILES:
            raise RuntimeError(f"Archive has too many files: {len(entries)}")

        for entry in entries:
            path = Path(entry.filename)

            if path.is_absolute() or ".." in path.parts:
                raise RuntimeError(f"Unsafe archive path: {entry.filename}")

            mode = entry.external_attr >> 16

            if stat.S_ISLNK(mode):
                raise RuntimeError(f"Archive contains symlink: {entry.filename}")

            total_size += entry.file_size

            if total_size > MAX_EXTRACTED_BYTES:
                raise RuntimeError("Archive exceeds extracted size limit")

        archive.extractall(target_dir)


def cleanup_workdirs():
    for target in [SOURCE_DIR, BUILD_DIR]:
        if target.exists():
            shutil.rmtree(target, ignore_errors=True)

    if WORK_DIR.exists():
        shutil.rmtree(WORK_DIR, ignore_errors=True)


def make_read_only(path):
    for root, dirs, files in os.walk(path):
        for directory in dirs:
            os.chmod(Path(root) / directory, 0o555)
        for file_name in files:
            os.chmod(Path(root) / file_name, 0o444)

    os.chmod(path, 0o555)


def make_writable(path):
    for root, dirs, files in os.walk(path):
        for directory in dirs:
            os.chmod(Path(root) / directory, 0o755)
        for file_name in files:
            os.chmod(Path(root) / file_name, 0o644)

    os.chmod(path, 0o755)


def attempt_build():
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)

    shutil.copytree(SOURCE_DIR, BUILD_DIR)
    make_writable(BUILD_DIR)
    project_root = find_project_root(BUILD_DIR)

    if not project_root:
        static_root = find_static_site_root(BUILD_DIR)

        if not static_root:
            raise RuntimeError(
                "No package.json or static index.html was found, so preview deployment was skipped."
            )

        prepare_output_site(static_root)
        summary = (
            "No package.json was found. Treated the submission as a plain static site "
            f"from {static_root.relative_to(BUILD_DIR)}."
            if static_root != BUILD_DIR
            else "No package.json was found. Treated the submission as a plain static site from the repository root."
        )
        BUILD_LOG_PATH.write_text(summary, encoding="utf-8")
        log(summary)
        return summary

    package_json = read_json(project_root / "package.json")
    scripts = package_json.get("scripts") or {}

    if "build" not in scripts:
        static_root = find_static_site_root(project_root)

        if not static_root:
            raise RuntimeError(
                "package.json has no build script and no static index.html was found, so preview deployment was skipped."
            )

        prepare_output_site(static_root)
        summary = (
            "package.json has no build script. Treated the submission as a plain static site "
            f"from {static_root.relative_to(BUILD_DIR)}."
        )
        BUILD_LOG_PATH.write_text(summary, encoding="utf-8")
        log(summary)
        return summary

    commands = build_commands(project_root)
    log_parts = []

    for command in commands:
        log(f"$ {command}")
        completed = subprocess.run(
            command,
            cwd=project_root,
            shell=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=int(os.getenv("BUILD_TIMEOUT_SECONDS", "180")),
        )
        log_parts.append(f"$ {command}\n{completed.stdout}")

        if completed.returncode != 0:
            build_log = "\n\n".join(log_parts)
            BUILD_LOG_PATH.write_text(trim(build_log, 20000), encoding="utf-8")
            print(trim(completed.stdout, 4000), flush=True)
            raise RuntimeError(
                f"Build command failed with exit code {completed.returncode}: {trim(build_log, 4000)}"
            )

        print(trim(completed.stdout, 4000), flush=True)

    deploy_root = detect_output_dir(project_root)
    prepare_output_site(deploy_root)

    build_log = "\n\n".join(log_parts)
    BUILD_LOG_PATH.write_text(trim(build_log, 20000), encoding="utf-8")
    log(f"Prepared deploy output from {deploy_root.name}")
    return trim(build_log or "Build passed.", 4000)


def read_json(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def find_project_root(root):
    for candidate in walk_directories(root):
        if (candidate / "package.json").exists():
            return candidate

    return None


def build_commands(project_root):
    if (project_root / "bun.lock").exists() or (project_root / "bun.lockb").exists():
        return ["bun install --frozen-lockfile", "bun run build"]

    return ["bun install", "bun run build"]


def detect_output_dir(project_root):
    for candidate in ["dist", "build", "out"]:
        directory = project_root / candidate

        if directory.is_dir() and (directory / "index.html").exists():
            return directory

    raise RuntimeError(
        "Build passed but no deployable output directory was found. Expected dist/, build/, or out/ with index.html."
    )


def find_static_site_root(root):
    for candidate in walk_directories(root):
        if (candidate / "index.html").exists():
            return candidate

    return None


def walk_directories(root):
    queue = [root]

    while queue:
        current = queue.pop(0)
        yield current

        children = sorted(
            [path for path in current.iterdir() if path.is_dir()],
            key=lambda path: path.as_posix(),
        )
        queue.extend(children)


def prepare_output_site(deploy_root):
    if OUTPUT_SITE_DIR.exists():
        shutil.rmtree(OUTPUT_SITE_DIR)

    shutil.copytree(deploy_root, OUTPUT_SITE_DIR)


def write_result(result):
    RESULT_PATH.write_text(json.dumps(result, indent=2), encoding="utf-8")


def write_diagnostic_file(error):
    diagnostic = {
        "error": str(error),
        "buildLog": read_optional(BUILD_LOG_PATH, 20000),
    }
    (OUTPUT_DIR / "diagnostics.json").write_text(
        json.dumps(diagnostic, indent=2),
        encoding="utf-8",
    )


def read_optional(path, limit):
    if not path.exists():
        return ""

    return trim(path.read_text(encoding="utf-8"), limit)


def trim(value, limit):
    return value if len(value) <= limit else value[-limit:]


if __name__ == "__main__":
    main()
