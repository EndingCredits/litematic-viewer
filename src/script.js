var deepslateResources;
const { mat4, vec3 } = glMatrix;

document.addEventListener("DOMContentLoaded", function(event) {

  const image = document.getElementById('atlas');
  if (image.complete) {
    loadResources(image);
  } else {
    image.addEventListener('load', () => loadResources(image));
  }

});

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

// Taken from Deepslate examples
function loadResources(textureImage) {
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
}

function createRenderer(structure) {

  // Create canvas and size it appropriately
  // TODO: Make size change on window resize
  const viewer = document.getElementById('viewer');
  const canvas = document.createElement('canvas');
  viewer.appendChild(canvas);

  canvas.width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  canvas.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

  // Remove old content
  const oldContent = document.getElementById('main-content');
  oldContent.style.display = "none";


  // Create Deepslate Renderer
  // Need chunksize 8 as seems to be a max number of faces per chunk that will render
  const gl = canvas.getContext('webgl');
  const renderer = new deepslate.StructureRenderer(gl, structure, deepslateResources, options={chunkSize: 8});

  // Crappy controls
  let viewDist = 4;
  let xRotation = 0.8;
  let yRotation = 0.5;
  let xOffset = 0;
  let yOffset = 0;
  const size = structure.getSize();
  let cameraPos = vec3.create();
  vec3.set(cameraPos, -size[0] / 2, -size[1] / 2, -size[2] / 2);
  

  // refactor this code to use separate functions for each type of control
  function render() {

    yRotation = yRotation % (Math.PI * 2);
    xRotation = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, xRotation));
    viewDist = Math.max(1, Math.min(20, viewDist));

    const view = mat4.create();
    mat4.rotateX(view, view, xRotation);
    mat4.rotateY(view, view, yRotation);
    mat4.translate(view, view, cameraPos);//[xOffset, yOffset, -viewDist]);
    //mat4.translate(view, view, );

    renderer.drawStructure(view);
    renderer.drawGrid(view);
  }
  
  requestAnimationFrame(render);

  function move3d(direction, relativeVertical = true, sensitivity = 1) {
    let offset = vec3.create();
    vec3.set(offset,
      direction[0] * sensitivity,
      direction[1] * sensitivity,
      direction[2] * sensitivity);
    if( relativeVertical) {
      vec3.rotateX(offset, offset, [0, 0, 0], -xRotation * sensitivity);
    }
    vec3.rotateY(offset, offset, [0, 0, 0], -yRotation * sensitivity);
    vec3.add(cameraPos, cameraPos, offset);
  }
  
  function pan(direction, sensitivity = 1) {
    // seems backwards but is correct
    yRotation += direction[0] / 200 * sensitivity;
    xRotation += direction[1] / 200 * sensitivity;
  }
  
  function move(offset, sensitivity) {
    xOffset = offset[0] * viewDist / 500 * sensitivity;
    yOffset = offset[1] * viewDist / 500 * sensitivity;
    let offset_vector = vec3.create();
    vec3.set(offset_vector, xOffset, -yOffset, 0);
    vec3.rotateX(offset_vector, offset_vector, [0, 0, 0], -xRotation);
    vec3.rotateY(offset_vector, offset_vector, [0, 0, 0], -yRotation);
    vec3.add(cameraPos, cameraPos, offset_vector);
  }

  function runMovementFunction(setting, evt, controls, invertSetting = null, sensitivitySetting = null) {
    
    const value = localStorage.getItem(setting) ?? document.getElementById(setting).value;
    let sensitivity = 1;
    if (sensitivitySetting) {
      sensitivity *= parseFloat(localStorage.getItem(sensitivitySetting) ?? 1);
    }
    if (invertSetting) {
      const invert = localStorage.getItem(invertSetting) === 'true' ?? document.getElementById(invertSetting)?.checked === 'true';
      if (invert) {
        sensitivity *= -1;
      }
    }
    controls[value](evt, sensitivity);
    // controls[value](evt);
  }
  
  let middleClickPos = null;
  let leftPos = null;
  canvas.addEventListener('mousedown', evt => {
    if (evt.button === 0) {
      evt.preventDefault();
      leftPos = [evt.clientX, evt.clientY];
    } else if (evt.button === 1) {
      evt.preventDefault();
      middleClickPos = [evt.clientX, evt.clientY];;
    }
  });
  canvas.addEventListener('mousemove', evt => {
    if (middleClickPos) {
      const args = [
        evt.clientX - middleClickPos[0],
        evt.clientY - middleClickPos[1]
      ]
      runMovementFunction(
        'middle-click-drag',
        args,
        {move, pan},
        'middle-click-drag-invert',
        'middle-click-drag-sensitivity'
      );
      middleClickPos = [evt.clientX, evt.clientY];
      requestAnimationFrame(render);
      
    } else if (leftPos) {
      const args = [
        evt.clientX - leftPos[0],
        evt.clientY - leftPos[1]
      ]
      runMovementFunction('click-drag', args, {move, pan}, 'click-drag-invert', 'click-drag-sensitivity');
      // move([evt.clientX - leftPos[0], evt.clientY - leftPos[1]]);
      leftPos = [evt.clientX, evt.clientY];
      requestAnimationFrame(render);
    }
  });
  canvas.addEventListener('mouseup', evt => {
    if (evt.button === 0) {
      leftPos = null;
    } else if (evt.button === 1) {
      middleClickPos = null;
      evt.preventDefault();
    }
  });
  canvas.addEventListener('mouseout', evt => {
    leftPos = null;
    middleClickPos = null;
    evt.preventDefault();
  });
  canvas.addEventListener('wheel', evt => {
    evt.preventDefault();
    move3d([0, 0, -evt.deltaY / 200]);
    requestAnimationFrame(render);
  });
  
  const moveDist = 0.2;
  const keyMoves = {
    w: [0, 0, moveDist],
    s: [0, 0, -moveDist],
    a: [moveDist, 0, 0],
    d: [-moveDist, 0, 0],
    ArrowUp: [0, 0, moveDist],
    ArrowDown: [0, 0, -moveDist],
    ArrowLeft: [moveDist, 0, 0],
    ArrowRight: [-moveDist, 0, 0],
    Shift: [0, moveDist, 0],
    ' ': [0, -moveDist, 0]
  };
  let pressedKeys = new Set();
  
  document.addEventListener('keydown', evt => {
    if (evt.key in keyMoves) {
      evt.preventDefault();
      pressedKeys.add(evt.key);
    }
  });
  
  document.addEventListener('keyup', evt => {
    pressedKeys.delete(evt.key);
  });
  
  setInterval(() => {
    if(pressedKeys.size == 0) return;

    let direction = vec3.create();
    for (const key of pressedKeys) {
      vec3.add(direction, direction, keyMoves[key]);
    }
    move3d(direction, false);
    requestAnimationFrame(render);

  }, 1000/60);

  canvas.addEventListener("touchstart", touchHandler);
  canvas.addEventListener("touchmove", touchHandler);
  canvas.addEventListener("touchend", () => {
    middleClickPos = null;
    prevDist = null;
    prevAvgX = null;
    prevAvgY = null;
  });

  const pinchSpeed = 0.015;
  const dragSpeed = 0.01;
  let prevAvgX;
  let prevAvgY;
  let prevDist;
  function touchHandler(evt) {
    evt.preventDefault();
    if(evt.touches.length == 1) {
      if (evt.touches && middleClickPos) {
        const dx = evt.touches[0].pageX - middleClickPos[0]; // x movement
        const dy = evt.touches[0].pageY - middleClickPos[1]; // y movement
        
        pan([dx, dy]);
    
        requestAnimationFrame(render);
      }
      middleClickPos = [evt.touches[0].pageX, evt.touches[0].pageY];

    } else if(evt.touches.length == 2) {

      // Pinch to move forward/backward
      const dx = evt.touches[0].pageX - evt.touches[1].pageX;
      const dy = evt.touches[0].pageY - evt.touches[1].pageY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (!prevDist) prevDist = dist;
      
      // Drag to move left/right/up/down
      const avgX = evt.touches[0].pageX + evt.touches[1].pageX / 2;
      const avgY = evt.touches[0].pageY + evt.touches[1].pageY / 2;
      if (!prevAvgX) prevAvgX = avgX;
      if (!prevAvgY) prevAvgY = avgY;
      const distX = (avgX - prevAvgX) * dragSpeed;
      const distY = (prevAvgY - avgY) * dragSpeed;

      move3d([distX, distY, (dist - prevDist) * pinchSpeed]);
      requestAnimationFrame(render);
      prevDist = dist;
      prevAvgX = avgX;
      prevAvgY = avgY;
    }
  }
}

function structureFromLitematic(litematic) {
  var blocks = litematic.regions[0].blocks;
  var blockPalette = litematic.regions[0].blockPalette;

  // Could probably make an intermediate block array type for this
  // Does js have good 3D arrays?
  width = blocks.length;
  height = blocks[0].length;
  depth = blocks[0][0].length;
  
  const structure = new deepslate.Structure([width, height, depth]);
  
  /*
  // Example blocks
  structure.addBlock([1, 0, 0], "minecraft:stone")
  structure.addBlock([2, 0, 0], "minecraft:grass_block", { "snowy": "false" });
  structure.addBlock([1, 1, 0], "minecraft:cake", { "bites": "3" })
  structure.addBlock([0, 0, 0], "minecraft:wall_torch", { "facing": "west" });
  structure.addBlock([2, 1, 0], "minecraft:scaffolding", { "bottom": "false", "waterlogged": "true", "distance": "0" });
  */
  
  // Add blocks manually from the blocks loaded from the NBT
  var blockCount = 0
  console.log("Building blocks...");
  for (let x=0; x < width; x++) {
    for (let y=0; y < height; y++) {
      for (let z=0; z < depth; z++) {
        blockID = blocks[x][y][z];
        if (blockID > 0) { // Skip air-blocks
        
          if(blockID < blockPalette.length) {
            blockInfo = blockPalette[blockID];
            blockName = blockInfo.Name;
            blockCount++;
            
            if (blockInfo.hasOwnProperty("Properties")) {
              structure.addBlock([x, y, z], blockName, blockInfo.Properties);
            } else {
              structure.addBlock([x, y, z], blockName);
            }
            
          } else {
            // Something obvious so we know when things go wrong
            structure.addBlock([x, y, z], "minecraft:stone")
          }
        }
      }
    }
  }
  console.log("Done!", blockCount, " blocks created");

  return structure;
}


/* Set the width of the side navigation to 250px */
function openSettings() {
  document.getElementById("settings-panel").style.width = "800px";
}

/* Set the width of the side navigation to 0 */
function closeSettings() {
  document.getElementById("settings-panel").style.width = "0";
} 