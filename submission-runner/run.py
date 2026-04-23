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
AGENT_OUTPUT_PATH = OUTPUT_DIR / "agent-output.txt"
CODEX_SCHEMA_PATH = OUTPUT_DIR / "codex-output-schema.json"
PROMPT_PATH = OUTPUT_DIR / "prompt.md"
CODEX_HOME_PATH = OUTPUT_DIR / ".codex-home"

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
        log("Running Codex")
        result = grade_with_codex(policy)
        log("Codex completed")
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


def grade_with_codex(policy):
    prompt = build_prompt(policy)
    PROMPT_PATH.write_text(prompt, encoding="utf-8")
    CODEX_SCHEMA_PATH.write_text(json.dumps(build_output_schema(), indent=2), encoding="utf-8")

    env = os.environ.copy()
    env["OPENAI_API_KEY"] = required_env("OPENAI_API_KEY")
    env["OPENAI_MODEL"] = os.getenv("OPENAI_MODEL", "GPT-5.3-Codex-Spark")
    env["CODEX_HOME"] = str(CODEX_HOME_PATH)

    openai_base_url = os.getenv("OPENAI_BASE_URL")
    config_args = []

    if openai_base_url:
        env["OPENAI_BASE_URL"] = openai_base_url
        config_args.extend(["-c", f"openai_base_url={json.dumps(openai_base_url)}"])

    if CODEX_HOME_PATH.exists():
        shutil.rmtree(CODEX_HOME_PATH)

    CODEX_HOME_PATH.mkdir(parents=True, exist_ok=True)

    try:
        login = subprocess.run(
            ["codex", "login", "--with-api-key", *config_args],
            cwd=SOURCE_DIR,
            input=f"{env['OPENAI_API_KEY']}\n",
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=60,
            env=env,
        )

        if login.returncode != 0:
            AGENT_OUTPUT_PATH.write_text(trim(login.stdout, 40000), encoding="utf-8")
            raise RuntimeError(f"Codex login failed: {trim(login.stdout, 4000)}")

        completed = subprocess.run(
            [
                "codex",
                "exec",
                "--skip-git-repo-check",
                "--sandbox",
                "read-only",
                "--ephemeral",
                "--ignore-user-config",
                "--output-schema",
                str(CODEX_SCHEMA_PATH),
                "--output-last-message",
                str(AGENT_OUTPUT_PATH),
                "--color",
                "never",
                "-m",
                env["OPENAI_MODEL"],
                *config_args,
                prompt,
            ],
            cwd=SOURCE_DIR,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=int(os.getenv("CODEX_TIMEOUT_SECONDS", os.getenv("CLAUDE_TIMEOUT_SECONDS", "300"))),
            env=env,
        )

        stdout = trim(completed.stdout, 40000)
        output_text = read_optional(AGENT_OUTPUT_PATH, 40000)

        if not output_text:
            AGENT_OUTPUT_PATH.write_text(stdout, encoding="utf-8")
            output_text = stdout

        if completed.returncode != 0:
            raise RuntimeError(f"Codex failed: {trim(stdout or output_text, 4000)}")

        return parse_agent_json(output_text)
    finally:
        if CODEX_HOME_PATH.exists():
            shutil.rmtree(CODEX_HOME_PATH, ignore_errors=True)


def build_prompt(policy):
    return textwrap.dedent(
        f"""
        You are grading a code submission. Do not edit files. Do not propose or attempt fixes.
        Inspect the repository read-only and grade it against the policy below.

        Policy JSON:
        {json.dumps(policy, indent=2)}

        Return only valid JSON in this exact shape:
        {{
          "score": 0,
          "maxScore": 100,
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

        Use the policy criteria ids and point values exactly.
        """
    ).strip()


def build_output_schema():
    return {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "score",
            "maxScore",
            "feedback",
            "rubricResults",
        ],
        "properties": {
            "score": {"type": "number"},
            "maxScore": {"type": "number"},
            "feedback": {"type": "string"},
            "rubricResults": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": [
                        "criterionId",
                        "label",
                        "score",
                        "maxScore",
                        "feedback",
                    ],
                    "properties": {
                        "criterionId": {"type": "string"},
                        "label": {"type": "string"},
                        "score": {"type": "number"},
                        "maxScore": {"type": "number"},
                        "feedback": {"type": "string"},
                    },
                },
            },
        },
    }


def parse_agent_json(output):
    stripped = output.strip()

    if stripped.startswith("```"):
        stripped = stripped.removeprefix("```json").removeprefix("```").strip()
        stripped = stripped.removesuffix("```").strip()

    start = stripped.find("{")
    end = stripped.rfind("}")

    if start < 0 or end < start:
        raise RuntimeError("Codex did not return JSON")

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
        "feedback": trim(f"Automatic grading failed: {error}", 8000),
        "rubricResults": rubric_results,
    }


def write_diagnostic_file(error):
    diagnostic = {
        "error": str(error),
        "agentOutput": read_optional(AGENT_OUTPUT_PATH, 40000),
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
