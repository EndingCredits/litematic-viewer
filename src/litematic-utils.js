class Litematic { }

class LitematicRegion {
  constructor(width, height, depth) {
    this.width = width;
    this.height = height;
    this.depth = depth;
  }
}

function readLitematicFromNBTData(nbtdata) {
  // Get rid of all the annoying stuff basically

  var litematic = new Litematic();
  litematic.regions = new Array();

  var regions = nbtdata.value.Regions.value;
  for (let regionName in regions) {
    
    var region = regions[regionName].value;
    
    var blockPalette = __stripNBTTyping(region.BlockStatePalette);
    
    // Find the minimum number of bits needed to express all blocks
    nbits = Math.ceil(Math.log2(blockPalette.length));

    // Get siize of region
    width = region.Size.value.x.value; 
    height = region.Size.value.y.value;
    depth = region.Size.value.z.value; 

    var blockData = region.BlockStates.value;

    var blocks = processNBTRegionData(blockData, nbits, width, height, depth);

    var litematicRegion = new LitematicRegion(width, height, depth);
    litematicRegion.blocks = blocks;
    litematicRegion.blockPalette = blockPalette;
    ['Size', 'Position', 'Entities']
     .forEach(attr => { litematicRegion[attr] = __stripNBTTyping(region[attr]); });

    litematic.regions.push(litematicRegion);
  }

  return litematic;
}

function processNBTRegionData(regionData, nbits, width, height, depth) {
  // Function to take the raw array and convert it into a 3D array
  // The raw data is a list of nbits-wide numbers all packed together into a single array of 64-bit* ints
  // I ripped off some python code for this, can't remember where from.
  // (* of course this is javascript so each int is split into an array fo 2 32-bit ints)
  
  mask = (1 << nbits) - 1;
  
  y_shift = Math.abs(width * depth);
  z_shift = Math.abs(width);
  var blocks = new Array();
  for (let x=0; x < Math.abs(width); x++) {
    blocks[x] = new Array();
    for (let y=0; y < Math.abs(height); y++) {
      blocks[x][y] = new Array();
      for (let z=0; z < Math.abs(depth); z++) {
        
        index = y * y_shift + z * z_shift + x;
        
        start_offset = index * nbits;
        
        start_arr_index = start_offset >>> 5; /// divide by 32
        end_arr_index = ((index + 1) * nbits - 1) >>> 5;
        start_bit_offset = start_offset & 0x1F; // % 32
        
        // This bit here is to handle the fact that the 64 bit numbers have to be broken down to
        // 32bit numbers in javascript.
        half_ind = start_arr_index >>> 1;
        if ((start_arr_index & 0x1) == 0) {
          blockStart = regionData[half_ind][1];
          blockEnd = regionData[half_ind][0];
        } else {
          blockStart = regionData[half_ind][0];
          if (half_ind+1 < regionData.length) {
            blockEnd = regionData[half_ind+1][1];
          } else {
            // It seems that sometimes the index can extend past the end of the array, but this fix works (for now)
            blockEnd = 0x0;
          }
        }
        
        if (start_arr_index == end_arr_index) {
            blocks[x][y][z] = (blockStart >>> start_bit_offset) & mask;
        } else {
            end_offset = 32 - start_bit_offset; // num curtailed bits
            val = ((blockStart >>> start_bit_offset) & mask) | ((blockEnd << end_offset) & mask);
            blocks[x][y][z] = val;// & mask;
        }
        
      }
    }
  }
  return blocks;
}

// Hacky function needed to convert NBT to pure JSON
// use at your own risk
function __stripNBTTyping(nbtData) {
  if (nbtData.hasOwnProperty("type")) {
    switch(nbtData.type) {
      case "compound":
        var newDict = {}
        for (const [k, v] of Object.entries(nbtData.value)) {
          newDict[k] = __stripNBTTyping(v);
        }
        return newDict;
        break;
      case "list":
        var newList = [];
        for (const [k, v] of Object.entries(nbtData.value.value)) {
          newList[k] = __stripNBTTyping(v);
        }
        return newList;
        break;
      default:
        return nbtData.value;
    } 
  } else {
    switch(nbtData.constructor) {
      case Object:
        var newDict = {}
        for (const [k, v] of Object.entries(nbtData)) {
          newDict[k] = __stripNBTTyping(v);
        }
        return newDict;
        break;
      default:
        return nbtData;
    }
  }
}


// Simple block counter
// it has been noted that there is the rare possibility that two regions overlap the same blocks
function getMaterialList(litematic) {
  var blockCounts = {};

  for (const region of litematic.regions) {
    var blocks = region.blocks;
    var blockPalette = region.blockPalette;

    width = blocks.length;
    height = blocks[0].length;
    depth = blocks[0][0].length;
    for (let x=0; x < width; x++) {
      for (let y=0; y < height; y++) {
        for (let z=0; z < depth; z++) {
          blockID = blocks[x][y][z];
          if (blockID > 0) {
            if(blockID < blockPalette.length) {
              blockInfo = blockPalette[blockID];
              blockName = blockInfo.Name;
              blockCounts[blockName] = (blockCounts[blockName] || 0) + 1;
            } else {
              // Something obvious so we know when things go wrong
              blockCounts["unknown"] = (blockCounts["unknown"] || 0) + 1;
            }
          }
        }
      }
    }
  }
  //console.log("Material list:", blockCounts);

  return blockCounts;
}


function calculateRegionBounds(litematic) {
  // Generated with help from Claude
  const regions = litematic.regions;

  // Convert negative sizes to positive and adjust position
  const normalizedRegions = regions.map(region => {
    const normalized = {
      pos: { ...region.Position },
      size: { ...region.Size }
    };
    
    // For each dimension, if size is negative:
    // - Make size positive
    // - Adjust position by (size-1)
    ['x', 'y', 'z'].forEach(dim => {
      if (normalized.size[dim] < 0) {
        normalized.pos[dim] += normalized.size[dim] + 1;
        normalized.size[dim] = Math.abs(normalized.size[dim]);
      }
    });
    
    return normalized;
  });

  // Find min/max bounds
  const bounds = normalizedRegions.reduce((acc, region) => {
    ['x', 'y', 'z'].forEach(dim => {
      acc.min[dim] = Math.min(acc.min[dim], region.pos[dim]);
      acc.max[dim] = Math.max(acc.max[dim], region.pos[dim] + region.size[dim] - 1);
    });
    return acc;
  }, {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity }
  });

  // Calculate offsets relative to 0,0,0
  const offsets = normalizedRegions.map(region => ({
    x: region.pos.x - bounds.min.x,
    y: region.pos.y - bounds.min.y, 
    z: region.pos.z - bounds.min.z
  }));

  return {
    bounds,
    offsets,
    size: {
      x: bounds.max.x - bounds.min.x + 1,
      y: bounds.max.y - bounds.min.y + 1,
      z: bounds.max.z - bounds.min.z + 1
    }
  };
}