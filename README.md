# EndingCredits' Litematic Viewer

This is a basic utility that takes in a litematic file, reads in the nbt data, processes it to remove NBT junk, and bitshifts the whole litematic data format shebang, and then renders the resulting structure using [DeepSlate](https://github.com/misode/deepslate). It's not intended to be a fully featured tool, just a simple thing hacked together to allow viewing litematics in the browser/without having to boot up minecraft.

Load in the schematic with the upload button (or drag and drop) OR by pasting a URL into the text bar and hit submit. You can navigate the loaded schematic using WASD and shift/space to move around, and left click / middle click to drag the camera/view (check settings for this). There is also basic mobile device support with standard touch controls. You can also set which layers are rendered using the two sliders on the left, which may be useful for layer-by-layer building, and there is a button for a (very crude) material list, which you can also download as a CSV file.

Limitations:
* Litematics with multiple regions do not load properly
* Entities are not rendered
* Some blocks do not display properly (we are working on updating deepslate version to fix this)
* Most of the settings currently do not do anything
* There is currently no testing for all features/devices so YMMV

For comments/suggestions/bugs, best thing to do is create an issue on [Github](https://github.com/endingcredits/litematic-viewer/) but I also hang out on [Joa's discord](https://discord.gg/RUEVmTahYg) in the #litematic-viewer channel (you may need to ping me). Contributions are very welcome - I accept PRs, or feel free to just fork your own version (but please do feel free to let me know if you develop any new features). Please do forgive the poor code architecture as I am not a JS developer. And of course big thanks to all those who have helped with the project!