import { cp, mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(projectDir, 'dist');
const publicFiles = ['index.html', 'styles.css', 'app.js', 'glitch.js', 'studio.js', 'content.js', '.nojekyll', 'assets', 'studio'];

// Validate application code before copying public files.
for (const file of ['app.js', 'glitch.js', 'studio.js', 'content.js']) {
  const result = spawnSync(process.execPath, ['--check', join(projectDir, file)], {
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

// The site serves its fonts locally, including their licenses.
const font = await stat(join(projectDir, 'assets/fonts/Archivo.ttf'));
if (font.size < 1000) throw new Error('The local Archivo font is missing or invalid.');
await readFile(join(projectDir, 'assets/fonts/OFL.txt'), 'utf8');
const displayFont = await stat(join(projectDir, 'assets/fonts/SpaceGrotesk.ttf'));
if (displayFont.size < 1000) throw new Error('The local Space Grotesk font is missing or invalid.');
await readFile(join(projectDir, 'assets/fonts/SpaceGrotesk-OFL.txt'), 'utf8');

// dist/ is generated output; edit the source files at the project root.
await mkdir(outputDir, { recursive: true });
for (const file of publicFiles) {
  await cp(join(projectDir, file), join(outputDir, file), { recursive: true });
}
console.log('Built static website in dist/');
