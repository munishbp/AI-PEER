# Patient Tutorial PDFs

This folder holds the one-page patient tutorial handed out in clinic, in all three supported languages.

- Sources: `tutorial_en.md`, `tutorial_es.md`, `tutorial_ht.md`.
- Rendered PDFs: `pdf/tutorial_en.pdf`, `pdf/tutorial_es.pdf`, `pdf/tutorial_ht.pdf`.

Sponsors who only want to print the PDF can grab the files directly from `pdf/` on GitHub. The rest of this document is for maintainers who need to edit the tutorial text or rebuild the PDFs.

## Editing the tutorial

1. Edit the Markdown source for the language you want (`tutorial_en.md` is the source of truth; please update it first, then mirror the change into the Spanish and Creole versions).
2. Keep language in step with the app. Button names, screen titles, and the answer choices should match what the app actually shows. The app's translations live in `front-end/AI-PEER/src/locales/{en,es,ht}/translation.json`.
3. Open a pull request. The GitHub Action `.github/workflows/build-tutorial.yml` rebuilds the three PDFs when the PR merges to `main`, and commits the regenerated files back to this folder automatically.

If you want to preview changes before merging, see "Building locally" below.

## Adding screenshots

The first version is text-only. The `images/` folder is reserved for future screenshots.

To add a screenshot:

1. Take the screenshot on a device and save it as a PNG in `images/` with a descriptive name, for example `images/home-screen.png`.
2. In the Markdown source, reference it with a normal image tag:

   ```markdown
   ![Home screen showing the Fall Risk Matrix card](images/home-screen.png)
   ```

3. Re-run the build (locally or by pushing to main). Pandoc will embed the image into the PDF.

Keep images simple and high-contrast. A screenshot that looks clear in color on a phone can lose detail when printed in black and white.

## Building locally

Requirements:

- Pandoc (`brew install pandoc` on macOS).
- A LaTeX engine that supports UTF-8. The easiest to install is Tectonic (`brew install tectonic`) or MacTeX's `xelatex`. The script auto-detects `xelatex` first and falls back to `pdflatex`.

Run:

```bash
cd docs/tutorial
./build.sh             # builds all three PDFs
./build.sh en          # builds only the English PDF
```

Output lands in `pdf/`.

## Typography defaults

The build script sets the following so the PDFs are comfortable to read at arm's length:

- Letter paper size, 1 inch margins.
- 14 point body text (Pandoc's largest out-of-the-box base size).
- 22 point top-level headings, 17 point subsection headings.
- Black text links so printed copies read cleanly.

If you want to tune any of this, edit the pandoc call in `build.sh`.

## GitHub Action

The workflow file lives at `.github/workflows/build-tutorial.yml`. It triggers when any of the following happens:

- A push to `main` changes a file under `docs/tutorial/` ending in `.md`.
- A maintainer clicks "Run workflow" on the Actions tab.

Inside the workflow, the `pandoc/latex` Docker image runs `build.sh`, and a follow-up step commits any changed PDFs back to `docs/tutorial/pdf/` on `main`. The commit message is `chore: rebuild tutorial PDFs`.
