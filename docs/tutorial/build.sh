#!/usr/bin/env bash
# Build patient tutorial PDFs from Markdown sources.
#
# Usage:
#   ./build.sh           (builds all three languages)
#   ./build.sh en        (builds only English)
#
# Requires: pandoc, a LaTeX engine (tectonic, xelatex, or pdflatex). The
# GitHub Action in .github/workflows/build-tutorial.yml runs this inside
# pandoc/latex which has xelatex pre-installed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

mkdir -p pdf

LANGS=("en" "es" "ht")
if [[ $# -ge 1 ]]; then
  LANGS=("$@")
fi

# Pick an available LaTeX engine. xelatex handles UTF-8 and the accents in
# Spanish/Creole without extra preamble; pdflatex is the fallback.
if command -v xelatex >/dev/null 2>&1; then
  ENGINE="xelatex"
elif command -v pdflatex >/dev/null 2>&1; then
  ENGINE="pdflatex"
else
  echo "error: neither xelatex nor pdflatex found on PATH" >&2
  exit 1
fi

HEADER_INCLUDE="${SCRIPT_DIR}/.pandoc-header.tex"
# Pure-LaTeX heading size overrides. No extra packages required, so the build
# works in pandoc/latex (the Docker image used by the GitHub Action) and in
# minimal local TeX installs like BasicTeX or Tectonic.
cat > "${HEADER_INCLUDE}" <<'EOF'
\makeatletter
\renewcommand\section{\@startsection
  {section}{1}{0pt}%
  {-1.5ex plus -.5ex minus -.2ex}%
  {1ex plus .2ex}%
  {\normalfont\fontsize{22pt}{26pt}\bfseries}}
\renewcommand\subsection{\@startsection
  {subsection}{2}{0pt}%
  {-1.2ex plus -.5ex minus -.2ex}%
  {.8ex plus .2ex}%
  {\normalfont\fontsize{17pt}{21pt}\bfseries}}
\makeatother
\setlength{\parskip}{0.6em}
\setlength{\parindent}{0pt}
EOF

for LANG in "${LANGS[@]}"; do
  SRC="tutorial_${LANG}.md"
  OUT="pdf/tutorial_${LANG}.pdf"

  if [[ ! -f "${SRC}" ]]; then
    echo "skip: ${SRC} not found"
    continue
  fi

  echo "build: ${SRC} -> ${OUT}"
  pandoc "${SRC}" \
    -o "${OUT}" \
    --pdf-engine="${ENGINE}" \
    -V papersize=letter \
    -V fontsize=14pt \
    -V geometry:margin=1in \
    -V linkcolor=black \
    -V urlcolor=black \
    -H "${HEADER_INCLUDE}"
done

rm -f "${HEADER_INCLUDE}"
echo "done."
