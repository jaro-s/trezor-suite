#!/usr/bin/env bash

# Generic bundle size check.
# Fails if the gzipped tarball of a built folder exceeds MAX_KB.
# Use to detect accidentally bundled heavy dependencies. See issue #8771.
#
# Usage:
#   scripts/check-build-size.sh <label> <target-dir> <baseline-kb> <max-kb>
#
# Example:
#   scripts/check-build-size.sh suite-web packages/suite-web/build 50000 55000
#
# MAX_KB typically = BASELINE_KB * 1.10 (10% buffer).
# After a legitimate size increase, update the baseline + max in the caller
# (CI workflow / release action) in the same PR as the change.

set -e

LABEL="$1"
TARGET_DIR="$2"
BASELINE_KB="$3"
MAX_KB="$4"

if [[ -z "$LABEL" || -z "$TARGET_DIR" || -z "$BASELINE_KB" || -z "$MAX_KB" ]]; then
    echo "Usage: $0 <label> <target-dir> <baseline-kb> <max-kb>"
    exit 2
fi

echo "[${LABEL}] bundle size check"

REPO_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
ABS_TARGET="$REPO_ROOT/$TARGET_DIR"

if [[ ! -d "$ABS_TARGET" ]]; then
    echo "Error: target folder not found at $ABS_TARGET"
    echo "       Build the package first."
    exit 1
fi

echo "Target:   $TARGET_DIR"
echo "Baseline: ${BASELINE_KB} KB"
echo "Max:      ${MAX_KB} KB"

PARENT_DIR="$( dirname "$ABS_TARGET" )"
FOLDER_NAME="$( basename "$ABS_TARGET" )"
TEMP_TAR="$( mktemp -t "check-build-size.XXXXXX" ).tar.gz"
trap 'rm -f "$TEMP_TAR"' EXIT

tar -czf "$TEMP_TAR" -C "$PARENT_DIR" "$FOLDER_NAME"

SIZE_KB=$(du -k "$TEMP_TAR" | cut -f1)

echo "Measured: ${SIZE_KB} KB (compressed)"

if (( SIZE_KB > MAX_KB )); then
    echo ""
    echo "[${LABEL}] bundle size check FAILED"
    echo "   ${SIZE_KB} KB exceeds limit ${MAX_KB} KB"
    echo "   If this growth is intentional, bump baseline+max in the caller."
    exit 1
fi

echo ""
echo "[${LABEL}] bundle size check PASSED"
echo "   Remaining budget: $((MAX_KB - SIZE_KB)) KB"
