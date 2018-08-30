# Organization of YAMI's Source folder

In this folder are all the files bundled-up to make YAMI.

Some of those are close for AMI.js original files, and other are completely different.

Here is a little explanation :

## YAMI specific files
At the root of this folder a YAMI's own files :

- **viewer.js**  the entry point of the application. Warning : this entry point is for the non-standalone version. The standalone entry-point is **Standalone/viewer.js**. To change the target (bundle the standalone version or not), you have to change the entry-point in **../webpack.config.js** (switching between config1 and config2).

- **viewer.config.js** are constants used in the application.

- **requestManager.js** contains the code to fetch and read files from a remote access. For the standalone (Web VV), see **Standalone/localRequestManager.js**.

- **sceneManager.js** registers every different stacks, builds and rebuilds materials when needed and generated the final render. It contains the scene itself.

- **animator.js** is a simple short script to managed the frame rate.

- **guiManager.js** contains the code to display and interact with the Graphical User Interface.

- **lutWindowManager.js** is a simple short file containing Medical Window presets for CTs.

## AMI.js re-written files
Some of the AMI.js classes had a behavior too different frm the one we wanted for YAMI. So we make our own classes, highly inspired from the ones from AMI.js.

The re-written files are in **AMIv2/** folder.

- **AMIv2/customControls.js** handles events
- **AMIv2/customLutHelpers.js** adds a the min/max and the unit on the graphical display of the lut.

Some modifications has been done in the shaders, we had to re-import *AMIv2/shaders/helpers/*, *AMIv2/shaders/interpolation/* and *AMIv2/shaders/shaders.base.js* for dependencies.

Other shader changes are :
- **AMIv2/shaders/shaders.layer.xxx.js** change of the mix-shader to display our fusion and overlay as we want to.
- **AMIv2/shaders/shaders.slice.xxx.js** a new shader to display data taken from a single slice and not a full 3D texture. This was made for a performance problem. See just below for more about slices.


For some computers of your laboratory, the system used in AMI that was "send all the data about your image to the graphical card as a 3D texture" was too heavy and made crashes. To resolve it, we chose to only send the active slice to the GC, sending the texture containing the data of ONE slice and one the whole stack.
This has one (and a second one implied) drawbacks : *we have to reslice when changing orientation*. As we only have the 3 side-views on YAMI, the reslicing is not too long or too difficult. But we *cannot display images given with a rotation*.

NB : the could be done with an interactive slicing and custom sampling, but the need wasn't worth the time in YAMI context.

To make AMI compatible with this slicing system, some modifications has been done :

- **shaders** see previous points.
- **AMIv2/2DSlices/customStack.js** change of the model to slice in frames in the correct direction.
- **AMIv2/2DSlices/customSliceHelper.js** changes to send the right 2D texture to the shader (via the uniform) and call you new shader.slice.
- **AMIv2/2DSlices/customStackHelper.js** little change to call you new customeSliceHelper.
- **AMIv2/2DSlices/modes.base.js** and **helpers.material.mixin.js** are here for the dependencies.


## Web VV specific files
Web VV is the standalone version of YAMI. Available on its specific branch.
You can find its public repository here : https://github.com/open-vv/web_vv .

To make a standalone from YAMI, some files had to be re-written. Those files are :

- **/index.html** the version at the root of this repository replaces the version in **../public/index.html**. To display the input-form.

- **Standalone/viewer.js** replaces **viewer.js** to take the input-form data.

- **Standalone/localRequestManager.js** replaces **requestManager.js** to fetch local files and not remote files.

Those files might not even exist and some branches of this repository.
