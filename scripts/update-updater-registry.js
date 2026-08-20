const fs = require('fs');
const path = require('path');

const repo = "mishra-aashu/book-writer";
const tag = process.argv[2];

if (!tag) {
  console.error("Please provide tag (e.g. v0.2.0)");
  process.exit(1);
}

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("GITHUB_TOKEN is required");
  process.exit(1);
}

async function run() {
  console.log(`Fetching release for tag: ${tag}`);
  
  const response = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'tauri-updater-updater-script'
    }
  });

  if (!response.ok) {
    console.error(`Failed to fetch release: ${response.status} ${response.statusText}`);
    const body = await response.text();
    console.error(`Response body: ${body}`);
    process.exit(1);
  }

  const release = await response.json();
  const assets = release.assets;
  
  console.log(`Found ${assets.length} assets. Processing...`);

  // Map assets by name
  const assetMap = {};
  for (const asset of assets) {
    assetMap[asset.name] = asset;
  }

  const platforms = {};

  // Helper to fetch signature from url
  async function fetchSignature(sigUrl) {
    const res = await fetch(sigUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch signature from ${sigUrl}: ${res.statusText}`);
    }
    const text = await res.text();
    return text.trim();
  }

  // Categorize candidate assets
  const platformAssets = {
    'linux-x86_64': [],
    'windows-x86_64': [],
    'darwin-x86_64': [],
    'darwin-aarch64': []
  };

  for (const asset of assets) {
    const name = asset.name;
    if (name.endsWith('.sig')) continue;

    const sigAssetName = name + '.sig';
    if (!assetMap[sigAssetName]) continue; // No matching signature file

    if (name.endsWith('.AppImage.tar.gz')) {
      platformAssets['linux-x86_64'].push({ asset, priority: 2 });
    } else if (name.endsWith('.AppImage')) {
      platformAssets['linux-x86_64'].push({ asset, priority: 1 });
    } else if (name.endsWith('.nsis.zip') || name.endsWith('_x64-setup.nsis.zip')) {
      platformAssets['windows-x86_64'].push({ asset, priority: 3 });
    } else if (name.endsWith('.msi.zip')) {
      platformAssets['windows-x86_64'].push({ asset, priority: 2 });
    } else if (name.endsWith('.exe') && (name.includes('setup') || name.includes('Setup'))) {
      platformAssets['windows-x86_64'].push({ asset, priority: 1 });
    } else if (name.endsWith('.app.tar.gz')) {
      if (name.includes('aarch64')) {
        platformAssets['darwin-aarch64'].push({ asset, priority: 1 });
      } else if (name.includes('x64') || name.includes('x86_64') || name.includes('intel')) {
        platformAssets['darwin-x86_64'].push({ asset, priority: 1 });
      } else {
        platformAssets['darwin-x86_64'].push({ asset, priority: 0 });
        platformAssets['darwin-aarch64'].push({ asset, priority: 0 });
      }
    }
  }

  // Select the highest priority asset for each platform and fetch its signature
  for (const [platform, candidates] of Object.entries(platformAssets)) {
    if (candidates.length === 0) continue;

    candidates.sort((a, b) => b.priority - a.priority);
    const selected = candidates[0].asset;
    const sigAsset = assetMap[selected.name + '.sig'];

    console.log(`Platform ${platform}: Selected ${selected.name} (signature: ${sigAsset.name})`);
    try {
      const signature = await fetchSignature(sigAsset.browser_download_url);
      platforms[platform] = {
        signature,
        url: selected.browser_download_url
      };
    } catch (err) {
      console.error(`Error fetching signature for ${platform}:`, err);
    }
  }

  const version = tag.startsWith('v') ? tag.slice(1) : tag;

  const updateRegistry = {
    version: version,
    notes: `Release ${tag} is now available.`,
    pub_date: new Date().toISOString(),
    platforms: platforms
  };

  const filePath = path.join(__dirname, '..', 'update.json');
  fs.writeFileSync(filePath, JSON.stringify(updateRegistry, null, 2), 'utf8');
  console.log(`Successfully updated ${filePath} with version ${version} and ${Object.keys(platforms).length} platforms.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
