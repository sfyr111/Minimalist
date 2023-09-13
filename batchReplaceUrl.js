const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');

const postsPath = 'source/_posts/';
const imagesPath = 'source/images/';
const urlPattern = /!\[.*?\]\((https?:\/\/.*?)(?=["\)])\)/g;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function generateFilenameFromUrl(url) {
  const ext = path.extname(url).split('?')[0]; // Extract the extension
  const basename = path.basename(url, ext).replace(/[^\w]/g, '_'); // Extract and sanitize the basename
  const query = url.split('?')[1];
  const queryPrefix = query ? query.replace(/[^\w]/g, '_') + '_' : ''; // Create a prefix from the query if it exists

  return `${queryPrefix}${basename}${ext}${Date.now()}.png`.toLowerCase();
}


async function downloadImage(url, outputPath) {
  const response = await axios.get(url, { responseType: 'stream' });
  await response.data.pipe(fs.createWriteStream(outputPath));
  await sleep(500);  // Wait for 0.5 seconds after writing a file
}

async function processMdFile(file) {
  const content = await fs.readFile(file, 'utf-8');
  let newContent = content;
  let matches;
  const replacements = [];

  while ((matches = urlPattern.exec(content)) !== null) {
    const imageUrl = matches[1];

    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      continue;
    }

    const imageName = generateFilenameFromUrl(imageUrl);
    const outputPath = path.join(imagesPath, imageName);

    try {
      console.log(`Downloading image from ${imageUrl} ...`);
      await downloadImage(imageUrl, outputPath);
      console.log(`Image downloaded to ${outputPath}`);

      const newImageUrl = `/images/${imageName}`;
      replacements.push({ old: imageUrl, new: newImageUrl });
      newContent = newContent.replace(imageUrl, newImageUrl);
    } catch (error) {
      console.error(`Error downloading image from ${imageUrl} in file ${file}: ${error.message}`);
    }
  }

  if (newContent !== content) {
    await fs.writeFile(file, newContent, 'utf-8');
    await sleep(500);  // Wait for 0.5 seconds after writing a file
    console.log(`Replaced URLs in ${file}`);
  }

  return replacements;
}

(async function() {
  try {
    const files = glob.sync(path.join(postsPath, '*.md'));
    const allReplacements = {};

    for (const file of files) {
      console.log(`Processing file ${file}`);
      const replacements = await processMdFile(file);
      if (replacements.length) {
        allReplacements[file] = replacements;
      }
      await sleep(1000);  // Wait for 1 second after processing a file
    }

    if (Object.keys(allReplacements).length) {
      await fs.writeJSON('replacements.json', allReplacements, { spaces: 2 });
      console.log('Wrote replacements to replacements.json');
    }

    console.log('All tasks done.');
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
  }
})();
