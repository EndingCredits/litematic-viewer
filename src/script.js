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

// Taken from Deepslate examples
// TODO: Pass in assets.js and opaque.js
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
  atlasCanvas.width = textureImage.width;
  atlasCanvas.height = textureImage.height;
  const atlasCtx = atlasCanvas.getContext('2d');
  atlasCtx.drawImage(textureImage, 0, 0);
  const atlasData = atlasCtx.getImageData(0, 0, atlasCanvas.width, atlasCanvas.height);
  const part = 16 / atlasData.width;
  const idMap = {};
  Object.keys(assets.textures).forEach(id => {
    const [u, v] = assets.textures[id];
    idMap['minecraft:' + id] = [u, v, u + part, v + part];
  })
  const textureAtlas = new deepslate.TextureAtlas(atlasData, idMap);

  deepslateResources = {
    getBlockDefinition(id) { return blockDefinitions[id] },
    getBlockModel(id) { return blockModels[id] },
    getTextureUV(id) { return textureAtlas.getTextureUV(id) },
    getTextureAtlas() { return textureAtlas.getTextureAtlas() },
    getBlockFlags(id) { return { opaque: opaqueBlocks.has(id) } },
    getBlockProperties(id) { return null },
    getDefaultBlockProperties(id) { return null },
  }
}

function createRenderer(structure) {

  const canvasContainer = document.getElementById('canvas-container');
  const canvas = document.createElement('canvas');
  canvasContainer.appendChild(canvas);
  // Make it visually fill the positioned parent
  canvas.style.width  = '100%';
  canvas.style.height = '100%';
  // ...then set the internal size to match
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetWidth*0.75; // 4:3 aspect ratio

  //const canvas = document.getElementById('render-canvas');

  const gl = canvas.getContext('webgl');
  
  // Need chunksize 8 as seems to be a max number of faces per chunk that will render
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

  let rotatePos = null;
  let dragPos = null;
  canvas.addEventListener('mousedown', evt => {
    if (evt.button === 0) {
      evt.preventDefault();
      dragPos = [evt.clientX, evt.clientY];
    } else if (evt.button === 1) {
      evt.preventDefault();
      rotatePos = [evt.clientX, evt.clientY];;
    }
  })
  canvas.addEventListener('mousemove', evt => {
    if (rotatePos) {
      yRotation += (evt.clientX - rotatePos[0]) / 200;
      xRotation += (evt.clientY - rotatePos[1]) / 200;
      rotatePos = [evt.clientX, evt.clientY];

      requestAnimationFrame(render);

    } else if (dragPos) {
      xOffset = (evt.clientX - dragPos[0]) * viewDist / 500;
      yOffset = (evt.clientY - dragPos[1]) * viewDist / 500;
      dragPos = [evt.clientX, evt.clientY];

      let offset = vec3.create();
      vec3.set(offset, xOffset, -yOffset, 0);
      vec3.rotateX(offset, offset, [0,0,0], -xRotation);
      vec3.rotateY(offset, offset, [0,0,0], -yRotation);

      vec3.add(cameraPos, cameraPos, offset);

      requestAnimationFrame(render);
    }
  })
  canvas.addEventListener('mouseup', evt => {
    if (evt.button === 0) {
      dragPos = null;
    } else if (evt.button === 1) {
      rotatePos = null;
      evt.preventDefault();
    }
  })
  canvas.addEventListener('mouseout', evt => {
    dragPos = null;
    rotatePos = null;
    evt.preventDefault();
  })
  canvas.addEventListener('wheel', evt => {
    evt.preventDefault();
    //viewDist += evt.deltaY / 100;

    let offset = vec3.create();
    vec3.set(offset, 0, 0, - evt.deltaY / 200);
    vec3.rotateX(offset, offset, [0,0,0], -xRotation);
    vec3.rotateY(offset, offset, [0,0,0], -yRotation);

    vec3.add(cameraPos, cameraPos, offset);

    requestAnimationFrame(render);
  })

  const moveDist = 0.2;
  const keyMoves = {
    w: [0, 0, moveDist],
    s: [0, 0, -moveDist],
    a: [moveDist, 0, 0],
    d: [-moveDist, 0, 0],
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
    let offset = vec3.create();
    vec3.set(offset, 0, 0, 0);
    for (const key of pressedKeys) {
        if (key in keyMoves) {
            vec3.add(offset, offset, keyMoves[key]);
        }
    }
    
    // This makes keypresses move with respect to your facing direction.
    // i.e. 'w' when looking down moves down.
    // Feels pretty weird but could be useful for some things, leaving it as a comment:

    // vec3.rotateX(offset, offset, [0,0,0], -xRotation);
    
    vec3.rotateY(offset, offset, [0,0,0], -yRotation);
    vec3.add(cameraPos, cameraPos, offset);
    requestAnimationFrame(render);
  }, 1000/60);

  canvas.addEventListener("touchstart", touchHandler);
  canvas.addEventListener("touchmove", touchHandler);
  canvas.addEventListener("touchend", () => {
    prevX = null;
    prevY = null;
    prevDist = null;
    prevAvgX = null;
    prevAvgY = null;
  });

  const pinchSpeed = 0.015;
  const dragSpeed = 0.01;
  let prevX;
  let prevY;
  let prevAvgX;
  let prevAvgY;
  let prevDist;
  function touchHandler(evt) {
    evt.preventDefault();
    if(evt.touches.length == 1) {
      if (evt.touches && prevX && prevY) {
        const dx = evt.touches[0].pageX - prevX; // x movement
        const dy = evt.touches[0].pageY - prevY; // y movement
        yRotation += dx / 200;
        xRotation += dy / 200;

        let offset = vec3.create();
        vec3.set(offset, 0, 0, 0);

        vec3.rotateX(offset, offset, [0,0,0], -xRotation);
        vec3.rotateY(offset, offset, [0,0,0], -yRotation);
    
        vec3.add(cameraPos, cameraPos, offset);
    
        requestAnimationFrame(render);
      }
      prevX = evt.touches[0].pageX;
      prevY = evt.touches[0].pageY;

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

      // Move camera
      let offset = vec3.create();
      vec3.set(offset, 0, 0, 0);
      vec3.add(offset, offset, [distX, distY, (dist - prevDist) * pinchSpeed]);
    
      vec3.rotateX(offset, offset, [0,0,0], -xRotation);  
      vec3.rotateY(offset, offset, [0,0,0], -yRotation);
      vec3.add(cameraPos, cameraPos, offset);
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
