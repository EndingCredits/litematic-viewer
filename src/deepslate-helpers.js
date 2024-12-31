var deepslateResources;

function upperPowerOfTwo(x) {
	x -= 1
	x |= x >> 1
	x |= x >> 2
	x |= x >> 4
	x |= x >> 8
	x |= x >> 18
	x |= x >> 32
	return x + 1
}

// Load Deepslate resources from texture atlas image
// Taken from Deepslate examples
function loadDeepslateResources(textureImage) {
  console.log("loading resources...")
  const blockDefinitions = {};
  Object.keys(assets.blockstates).forEach(id => {
    blockDefinitions['minecraft:' + id] = deepslate.BlockDefinition.fromJson(id, assets.blockstates[id]);
  })

  const blockModels = {};
  Object.keys(assets.models).forEach(id => {
    blockModels['minecraft:' + id] = deepslate.BlockModel.fromJson(id, assets.models[id]);
  })
  Object.values(blockModels).forEach(m => m.flatten({ getBlockModel: id => blockModels[id] }));

  const atlasCanvas = document.createElement('canvas');
  const atlasSize = upperPowerOfTwo((textureImage.width >= textureImage.height) ? textureImage.width : textureImage.height);
  atlasCanvas.width = textureImage.width;
  atlasCanvas.height = textureImage.height;

  const atlasCtx = atlasCanvas.getContext('2d');
  atlasCtx.drawImage(textureImage, 0, 0);

  const atlasData = atlasCtx.getImageData(0, 0, atlasSize, atlasSize);

  const idMap = {};

  Object.keys(assets.textures).forEach(id => {
		const [u, v, du, dv] = assets.textures[id]
		const dv2 = (du !== dv && id.startsWith('block/')) ? du : dv
		idMap['minecraft:' + id] = [u / atlasSize, v / atlasSize, (u + du) / atlasSize, (v + dv2) / atlasSize]
	})

  const textureAtlas = new deepslate.TextureAtlas(atlasData, idMap);

  deepslateResources = {
    getBlockDefinition(id) { return blockDefinitions[id] },
    getBlockModel(id) { return blockModels[id] },
    getTextureUV(id) { return textureAtlas.getTextureUV(id) },
    getTextureAtlas() { return textureAtlas.getTextureAtlas() },
    getBlockFlags(id) { return { opaque: false } },
    getBlockProperties(id) { return null },
    getDefaultBlockProperties(id) { return null },
  }

  return deepslateResources;
}

function structureFromLitematic(litematic, y_min=0, y_max=1024) {

  const { bounds, offsets, size } = calculateRegionBounds(litematic);

  const structure = new deepslate.Structure([size.x, size.y, size.z]);
    
  for (const [index, region] of litematic.regions.entries()) {
    const offset = offsets[index];

    const blocks = region.blocks;
    const blockPalette = region.blockPalette;

    //console.log(blocks);

    // Could probably make an intermediate block array type for this
    // Does js have good 3D arrays?
    const width = blocks.length;
    const height = blocks[0].length;
    const depth = blocks[0][0].length;

    var y_min_r = y_min - offset.y;
    var y_max_r = y_max - offset.y;
    y_min_r = Math.max(y_min_r, 0);
    y_max_r = Math.min(y_max_r, height);

    // Add blocks manually from the blocks loaded from the NBT
    var blockCount = 0;
    console.log("Building blocks...");
    for (let x=0; x < width; x++) {
      for (let y=y_min_r; y < y_max_r; y++) {
        for (let z=0; z < depth; z++) {
          blockID = blocks[x][y][z];

          if (blockID > 0) { // Skip air-blocks
          
            if(blockID < blockPalette.length) {
              blockInfo = blockPalette[blockID];
              blockName = blockInfo.Name;
              blockCount++;
              
              if (blockInfo.hasOwnProperty("Properties")) {
                structure.addBlock([offset.x+x, offset.y+y, offset.z+z], blockName, blockInfo.Properties);
              } else {
                structure.addBlock([offset.x+x, offset.y+y, offset.z+z], blockName);
              }
              
            } else {
              // Something obvious so we know when things go wrong
              structure.addBlock([offset.x+x, offset.y+y, offset.z+z], "minecraft:cake")
            }
          }
        }
      }
    }
  }
  console.log("Done!", blockCount, " blocks created");

  return structure;
}
