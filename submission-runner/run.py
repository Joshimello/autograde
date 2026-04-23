#!/usr/bin/env python3
import json
import os
import shutil
import stat
import subprocess
import sys
import textwrap
import zipfile
from pathlib import Path

INPUT_ARCHIVE = Path(os.getenv("INPUT_ARCHIVE", "/input/submission.zip"))
POLICY_PATH = Path(os.getenv("POLICY_PATH", "/input/policy.json"))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "/output"))
RESULT_PATH = OUTPUT_DIR / "result.json"
SOURCE_DIR = Path("/tmp/source")
BUILD_DIR = Path("/tmp/build")
BUILD_LOG_PATH = OUTPUT_DIR / "build.log"
CLAUDE_OUTPUT_PATH = OUTPUT_DIR / "claude-output.txt"

MAX_FILES = int(os.getenv("MAX_EXTRACTED_FILES", "5000"))
MAX_EXTRACTED_BYTES = int(os.getenv("MAX_EXTRACTED_BYTES", str(500 * 1024 * 1024)))


def main():
    log("Preparing submission runner")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    policy = read_json(POLICY_PATH)

    try:
        log("Extracting archive")
        safe_extract(INPUT_ARCHIVE, SOURCE_DIR)
        log("Archive extracted")
        log("Locking source directory read-only")
        make_read_only(SOURCE_DIR)
        log("Attempting build")
        build_status, build_summary = attempt_build()
        log(f"Build status: {build_status}")
        log("Running Claude Code")
        result = grade_with_claude(policy, build_status, build_summary)
        log("Claude Code completed")
        log("Writing result.json")
        write_result(result)
        log("Submission runner completed")
    except Exception as exc:
        log(f"Submission runner failed: {exc}")
        write_diagnostic_file(exc)
        fallback = build_failure_result(policy, str(exc))
        write_result(fallback)
        print(str(exc), file=sys.stderr)
        sys.exit(1)


def read_json(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


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
        summary = "No package.json was found, so the build step was skipped."
        BUILD_LOG_PATH.write_text(summary, encoding="utf-8")
        log(summary)
        return "skipped", summary

    package_json = read_json(project_root / "package.json")
    scripts = package_json.get("scripts") or {}

    if "build" not in scripts:
        summary = "package.json has no build script, so the build step was skipped."
        BUILD_LOG_PATH.write_text(summary, encoding="utf-8")
        log(summary)
        return "skipped", summary

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
            log(f"Build command failed with exit code {completed.returncode}")
            return "failed", trim(build_log, 4000)

        print(trim(completed.stdout, 4000), flush=True)

    build_log = "\n\n".join(log_parts)
    BUILD_LOG_PATH.write_text(trim(build_log, 20000), encoding="utf-8")
    log("Build passed")
    return "passed", trim(build_log or "Build passed.", 4000)


def find_project_root(root):
    queue = [root]

    while queue:
        candidate = queue.pop(0)

        if (candidate / "package.json").exists():
            return candidate

        children = sorted(
            [path for path in candidate.iterdir() if path.is_dir()],
            key=lambda path: path.as_posix(),
        )
        queue.extend(children)

    return None


def build_commands(project_root):
    if (project_root / "bun.lock").exists() or (project_root / "bun.lockb").exists():
        return ["bun install --frozen-lockfile", "bun run build"]

    if (project_root / "package-lock.json").exists():
        return ["npm ci", "npm run build"]

    return ["npm install", "npm run build"]


def grade_with_claude(policy, build_status, build_summary):
    prompt_path = OUTPUT_DIR / "prompt.md"
    prompt_path.write_text(
        build_prompt(policy, build_status, build_summary),
        encoding="utf-8",
    )

    env = os.environ.copy()
    env["ANTHROPIC_AUTH_TOKEN"] = required_env("ANTHROPIC_AUTH_TOKEN")
    env["ANTHROPIC_BASE_URL"] = required_env("ANTHROPIC_BASE_URL")
    env["ANTHROPIC_MODEL"] = required_env("ANTHROPIC_MODEL")
    default_haiku_model = os.getenv("ANTHROPIC_DEFAULT_HAIKU_MODEL")

    if default_haiku_model:
        env["ANTHROPIC_DEFAULT_HAIKU_MODEL"] = default_haiku_model

    completed = subprocess.run(
        [
            "claude",
            "--permission-mode",
            "plan",
            "--disallowedTools",
            "Edit,Write,MultiEdit",
            "-p",
            prompt_path.read_text(encoding="utf-8"),
        ],
        cwd=SOURCE_DIR,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=int(os.getenv("CLAUDE_TIMEOUT_SECONDS", "300")),
        env=env,
    )
    CLAUDE_OUTPUT_PATH.write_text(trim(completed.stdout, 40000), encoding="utf-8")

    if completed.returncode != 0:
        raise RuntimeError(f"Claude Code failed: {trim(completed.stdout, 4000)}")

    return parse_claude_json(completed.stdout)


def build_prompt(policy, build_status, build_summary):
    return textwrap.dedent(
        f"""
        You are grading a code submission. Do not edit files. Do not propose or attempt fixes.
        Inspect the repository read-only and grade it against the policy below.

        The build was already attempted by the runner before this prompt.
        Build status: {build_status}
        Build log summary:
        {build_summary}

        Policy JSON:
        {json.dumps(policy, indent=2)}

        Return only valid JSON in this exact shape:
        {{
          "score": 0,
          "maxScore": 100,
          "buildStatus": "{build_status}",
          "buildLogSummary": "Short build summary",
          "feedback": "Overall feedback",
          "rubricResults": [
            {{
              "criterionId": "criterion-id",
              "label": "Criterion label",
              "score": 0,
              "maxScore": 10,
              "feedback": "Criterion feedback"
            }}
          ]
        }}

        Use the policy criteria ids and point values exactly. If the build failed,
        explain the failure in the feedback and do not claim the app builds.
        """
    ).strip()


def parse_claude_json(output):
    stripped = output.strip()

    if stripped.startswith("```"):
        stripped = stripped.removeprefix("```json").removeprefix("```").strip()
        stripped = stripped.removesuffix("```").strip()

    start = stripped.find("{")
    end = stripped.rfind("}")

    if start < 0 or end < start:
        raise RuntimeError("Claude Code did not return JSON")

    return json.loads(stripped[start : end + 1])


def build_failure_result(policy, error):
    criteria = policy.get("criteria") or []
    rubric_results = []

    for criterion in criteria:
        rubric_results.append(
            {
                "criterionId": str(criterion.get("id", "")),
                "label": str(criterion.get("label", "Criterion")),
                "score": 0,
                "maxScore": number_or_zero(criterion.get("points")),
                "feedback": "Automatic grading failed before this criterion could be evaluated.",
            }
        )

    return {
        "score": 0,
        "maxScore": sum(item["maxScore"] for item in rubric_results),
        "buildStatus": "failed",
        "buildLogSummary": trim(error, 4000),
        "feedback": trim(f"Automatic grading failed: {error}", 8000),
        "rubricResults": rubric_results,
    }


def write_diagnostic_file(error):
    diagnostic = {
        "error": str(error),
        "buildLog": read_optional(BUILD_LOG_PATH, 20000),
        "claudeOutput": read_optional(CLAUDE_OUTPUT_PATH, 40000),
    }
    (OUTPUT_DIR / "diagnostics.json").write_text(
        json.dumps(diagnostic, indent=2),
        encoding="utf-8",
    )


def write_result(result):
    RESULT_PATH.write_text(json.dumps(result, indent=2), encoding="utf-8")


def required_env(name):
    value = os.getenv(name)

    if not value:
        raise RuntimeError(f"{name} is required")

    return value


def number_or_zero(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0

    return number if number >= 0 else 0


def trim(value, limit):
    return value if len(value) <= limit else value[-limit:]


def read_optional(path, limit):
    if not path.exists():
        return ""

    return trim(path.read_text(encoding="utf-8", errors="replace"), limit)


if __name__ == "__main__":
    main()
