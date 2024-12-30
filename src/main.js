var structureLitematic;

function loadAndProcessFile(file) {
   
   if (deepslateResources == null) {return;}

   // Remove input form to stop people submitting twice
   const elem = document.getElementById('file-loader-panel');
   elem.parentNode.removeChild(elem);
      
   let reader = new FileReader();
   reader.readAsArrayBuffer(file);
   reader.onload = function(evt) {

      //var buffer = new Uint8Array(reader.result);
      //console.log(buffer);

      const nbtdata = deepslate.readNbt(new Uint8Array(reader.result));//.result; // Don't care about .compressed
      console.log("Loaded litematic with NBT data:")
      console.log(nbtdata.value);
      structureLitematic = readLitematicFromNBTData(nbtdata);
      
      createRenderCanvas();

      //Create sliders
      var max_y = structureLitematic.regions[0].blocks[0].length;
      createRangeSliders(max_y);

      setStructure(structureFromLitematic(structureLitematic), reset_view=true);

   };
   reader.onerror = function() {
      console.log(reader.error);
   };
   
}

function createRangeSliders(max_y) {
    const slidersDiv = document.getElementById('sliders');
    slidersDiv.style.display = "block";

    const minSlider = document.createElement('input');
    minSlider.type = 'range';
    minSlider.id = 'miny';
    minSlider.min = 0;
    minSlider.max = max_y;
    minSlider.value = 0;
    minSlider.step = 1;

    console.log("max_y");
    console.log(max_y);

    const maxSlider = document.createElement('input');
    maxSlider.type = 'range';
    maxSlider.id = 'maxy';
    maxSlider.min = 0;
    maxSlider.max = max_y;
    maxSlider.value = max_y-1;
    maxSlider.step = 1;

    var y_min = 0;
    var y_max = max_y;

    minSlider.addEventListener('change', function(e) {
        y_min = e.target.value;
        console.log(y_min);
        setStructure(structureFromLitematic(structureLitematic, y_min=y_min, y_max=y_max));
    });

    maxSlider.addEventListener('change', function(e) {
        y_max = e.target.value;
        console.log(y_max);
        setStructure(structureFromLitematic(structureLitematic, y_min=y_min, y_max=y_max));
    });

    slidersDiv.appendChild(minSlider);
    slidersDiv.appendChild(maxSlider);
}
