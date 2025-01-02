var structureLitematic;

function loadAndProcessFile(file) {
   
   if (deepslateResources == null) {return;}

   // Remove input form to stop people submitting twice
   const elem = document.getElementById('file-loader-panel');
   elem.parentNode.removeChild(elem);
      
   //Read in file and process
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

      // Create sliders
      const { size } = calculateRegionBounds(structureLitematic);
      createRangeSliders(size.y);

      // Create material list button
      const blockCounts = getMaterialList(structureLitematic);
      createMaterialsList(blockCounts);

      setStructure(structureFromLitematic(structureLitematic), reset_view=true);
   };
   reader.onerror = function() {
      console.log(reader.error);
   };
   
}

function createMaterialsList(blockCounts) {
   const materialList = document.getElementById('materialList');

   materialList.innerHTML = Object.entries(blockCounts)
    .sort(([,a], [,b]) => b - a)
    .map(([key, val]) => `<div class="count-item"><span>${key.replace('minecraft:', '')}</span><span>${val}</span></div>`)
    //.map(([key, val]) => `<tr><td>${key}</td><td>${val}</td></tr>`)
    .join('');
   materialList.style.display = 'none';

   const materialListButton = document.getElementById('materialListButton');
   materialListButton.style.display = 'block';
   //materialListButton.onmouseover = () => materialList.style.display = 'block';
   //materialListButton.onmouseout = () => materialList.style.display = 'none';

   materialListButton.onclick = () => materialList.style.display = materialList.style.display === 'none' ? 'block' : 'none';

   function downloadMaterialsCSV() {
      const csvContent = Object.entries(blockCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([key, val]) => `${key},${val}`)
      .join('\n');

       const blob = new Blob([csvContent], { type: 'text/csv' });
       const url = window.URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = 'MaterialList.csv';
       a.click();
       window.URL.revokeObjectURL(url);
   }

   // Add download button
   const downloadBtn = document.createElement('button');
   downloadBtn.innerHTML = '<span class="material-icons">download</span>';
   downloadBtn.className = 'material-button';
   downloadBtn.onclick = downloadMaterialsCSV;
   materialList.appendChild(downloadBtn);

}

function createRangeSliders(max_y) {
    // Creating all the elements like this is horrific, but it works

    const slidersDiv = document.getElementById('sliders');
    slidersDiv.style.display = "block";

    // Create container for each slider and its controls
    const minSliderContainer = document.createElement('div');
    const maxSliderContainer = document.createElement('div');
    minSliderContainer.className = 'slider-container';
    maxSliderContainer.className = 'slider-container';

    // Create sliders
    const minSlider = document.createElement('input');
    minSlider.type = 'range';
    minSlider.id = 'miny';
    minSlider.min = 0;
    minSlider.max = max_y;
    minSlider.value = 0;
    minSlider.step = 1;

    const maxSlider = document.createElement('input');
    maxSlider.type = 'range';
    maxSlider.id = 'maxy';
    maxSlider.min = 0;
    maxSlider.max = max_y;
    maxSlider.value = max_y;
    maxSlider.step = 1;


    // Create value displays
    // Create value inputs
    const minValue = document.createElement('input');
    minValue.type = 'number';
    minValue.className = 'slider-value';
    minValue.value = minSlider.value;
    minValue.min = 0;
    minValue.max = max_y;

    const maxValue = document.createElement('input');
    maxValue.type = 'number';
    maxValue.className = 'slider-value';
    maxValue.value = maxSlider.value;
    maxValue.min = 0;
    maxValue.max = max_y;


    // Create increment/decrement buttons
    const minIncButton = document.createElement('button');
    minIncButton.textContent = '↑';
    minIncButton.className = 'slider-button';

    const minDecButton = document.createElement('button');
    minDecButton.textContent = '↓';
    minDecButton.className = 'slider-button';

    const maxIncButton = document.createElement('button');
    maxIncButton.textContent = '↑';
    maxIncButton.className = 'slider-button';

    const maxDecButton = document.createElement('button');
    maxDecButton.textContent = '↓';
    maxDecButton.className = 'slider-button';

    var y_min = 0;
    var y_max = max_y;
    var updateTimeout = null;

    // Debounced update function
    function debouncedUpdateStructure() {
        // Clear any existing timeout
        if (updateTimeout) { clearTimeout(updateTimeout); }

        // Set new timeout
        updateTimeout = setTimeout(() => {
            setStructure(structureFromLitematic(structureLitematic, y_min=y_min, y_max=y_max));
        }, 1000); // 1 second delay
    }

    // Update function for min slider
    function updateMin(value, debounced=false) {
        value = Math.max(0, Math.min(y_max-1, parseInt(value)));
        minSlider.value = value;
        y_min = value;
        minValue.value = value;
        if (debounced) {
            debouncedUpdateStructure();
        } else {
            setStructure(structureFromLitematic(structureLitematic, y_min=y_min, y_max=y_max));
        }
    }

    // Update function for max slider
    function updateMax(value, debounced=false) {
        value = Math.max(y_min+1, Math.min(max_y, parseInt(value)));
        maxSlider.value = value;
        y_max = value;
        maxValue.value = value;
        if (debounced) {
            debouncedUpdateStructure();
        } else {
            setStructure(structureFromLitematic(structureLitematic, y_min=y_min, y_max=y_max));
        }
    }

    // Event listeners for sliders
    minSlider.addEventListener('input', function(e) { updateMin(e.target.value, debounced=true); });
    maxSlider.addEventListener('input', function(e) { updateMax(e.target.value, debounced=true); });

    // Event listeners for value inputs
    minValue.addEventListener('change', function(e) { updateMin(e.target.value); });
    maxValue.addEventListener('change', function(e) { updateMax(e.target.value); });

    // Event listeners for buttons
    minIncButton.addEventListener('click', () => updateMin(parseInt(minSlider.value) + 1), debounced=true);
    minDecButton.addEventListener('click', () => updateMin(parseInt(minSlider.value) - 1), debounced=true);
    maxIncButton.addEventListener('click', () => updateMax(parseInt(maxSlider.value) + 1), debounced=true);
    maxDecButton.addEventListener('click', () => updateMax(parseInt(maxSlider.value) - 1), debounced=true);

    // Append elements to their containers
    minSliderContainer.appendChild(minSlider);
    minSliderContainer.appendChild(minIncButton);
    minSliderContainer.appendChild(minDecButton);
    minSliderContainer.appendChild(minValue);


    maxSliderContainer.appendChild(maxSlider);
    maxSliderContainer.appendChild(maxIncButton);
    maxSliderContainer.appendChild(maxDecButton);
    maxSliderContainer.appendChild(maxValue);

    // Append containers to sliders div
    slidersDiv.appendChild(minSliderContainer);
    slidersDiv.appendChild(maxSliderContainer);
}
