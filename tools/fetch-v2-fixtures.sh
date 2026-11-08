#!/usr/bin/env bash
# Fetch a small set of Khronos glTF test fixtures at a pinned upstream revision.
# Run from anywhere: bash tools/fetch-v2-fixtures.sh
# No private Pokémon models or assets are fetched.
set -euo pipefail

UPSTREAM="KhronosGroup/glTF-Sample-Assets"
REVISION="8f492390ddc7a2ae221a1369ef560589cf8c70fb"  # 2026-10-23
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$HERE/v2/tests/fixtures/khronos}"
BASE="https://raw.githubusercontent.com/$UPSTREAM/$REVISION/Models"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required" >&2
  exit 2
fi
mkdir -p "$OUT"

fetch() {
  local model="$1" relative="$2" dest="$OUT/$1/$2"
  mkdir -p "$(dirname "$dest")"
  printf 'Fetching %s/%s\n' "$model" "$relative"
  curl -fL --retry 2 --connect-timeout 15 --max-time 120 --output "$dest.tmp" "$BASE/$model/$relative"
  mv "$dest.tmp" "$dest"
}

# CC0 model assets (license documentation itself is CC-BY-4.0).
fetch AnimatedMorphCube "glTF-Binary/AnimatedMorphCube.glb"
fetch AnimatedMorphCube "LICENSE.md"

fetch SimpleSkin "glTF/SimpleSkin.gltf"
fetch SimpleSkin "glTF/SimpleSkin_animation.bin"
fetch SimpleSkin "glTF/SimpleSkin_geometry.bin"
fetch SimpleSkin "glTF/SimpleSkin_inverseBindMatrices.bin"
fetch SimpleSkin "glTF/SimpleSkin_skinningData.bin"
fetch SimpleSkin "LICENSE.md"

fetch SimpleTexture "glTF/SimpleTexture.gltf"
fetch SimpleTexture "glTF/SimpleTexture.bin"
fetch SimpleTexture "glTF/testTexture.png"
fetch SimpleTexture "LICENSE.md"

cat >"$OUT/SOURCE.md" <<EOF
# Khronos development fixtures

Source: https://github.com/$UPSTREAM
Pinned revision: $REVISION

The three selected model asset families (AnimatedMorphCube, SimpleSkin,
SimpleTexture) are CC0-1.0 according to their per-model LICENSE.md.
Metadata documentation may be CC-BY-4.0; retain their upstream LICENSE.md.
No private/third-party Pokémon model is included.

These files are for importer tests and are intentionally not committed
to the public project repository. See V2_RESOURCES.md.
EOF

(
  cd "$OUT"
  find AnimatedMorphCube SimpleSkin SimpleTexture -type f -print0 |
    sort -z | xargs -0 sha256sum > SHA256SUMS
)
printf '\nSaved test fixtures to %s\n' "$OUT"
printf 'To create a Draco fixture locally (once glTF Transform is installed):\n'
printf '  gltf-transform draco "%s/AnimatedMorphCube/glTF-Binary/AnimatedMorphCube.glb" "%s/AnimatedMorphCube-draco.glb"\n' "$OUT" "$OUT"
