"""Parse the feature OpenAPI document and validate every local JSON Pointer reference."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Iterator

import yaml


CONTRACT_PATH = Path(__file__).with_name("openapi.yaml")


def iter_references(value: Any) -> Iterator[str]:
    if isinstance(value, dict):
        reference = value.get("$ref")
        if isinstance(reference, str):
            yield reference
        for child in value.values():
            yield from iter_references(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_references(child)


def resolve_local_reference(document: Any, reference: str) -> Any:
    if not reference.startswith("#/"):
        raise ValueError(f"Only local references are allowed: {reference}")

    current = document
    for encoded_part in reference[2:].split("/"):
        part = encoded_part.replace("~1", "/").replace("~0", "~")
        if isinstance(current, dict) and part in current:
            current = current[part]
            continue
        if isinstance(current, list) and part.isdecimal() and int(part) < len(current):
            current = current[int(part)]
            continue
        raise ValueError(f"Unresolved local reference: {reference}")
    return current


def main() -> int:
    document = yaml.safe_load(CONTRACT_PATH.read_text(encoding="utf-8"))
    if not isinstance(document, dict):
        raise ValueError("OpenAPI document must be a YAML mapping.")
    if document.get("openapi") != "3.1.0":
        raise ValueError("Expected OpenAPI 3.1.0.")

    references = list(iter_references(document))
    for reference in references:
        resolve_local_reference(document, reference)

    path_count = len(document.get("paths", {}))
    print(
        f"Validated {CONTRACT_PATH.name}: {path_count} path(s), "
        f"{len(references)} local reference(s), 0 unresolved."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
