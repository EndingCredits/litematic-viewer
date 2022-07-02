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