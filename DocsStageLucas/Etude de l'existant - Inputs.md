# YAMI Input study and choice

Each software has different inputs. The purpose of this document is to determine shortcuts and input for YAMI.

- RMB / LMB / MMB : Right/Left/Middle mouse button

Note : shortcut can't use System input in browser (ex : F1-F12, Ctrl+S, ...)

### General remarks :
Each soft has its system. But some mechanisms often appear :
- The __select the tool__ system where zoom, slice, move, windowing are all LMB drag : first you have to select a tool (by pressing the Tool button or the associated key), and then a simple LMB Drag does the action (advantage : friendly with new user thanks to the buttons and icons + efficient thanks to shortcuts).
- __Change the slice__ : often wheel by default, sometime a simple drag with a tool (cf previous point).
- __shortcuts__ people who I talked to said they were not familiar with shortcut, the generally use 2 or 3 of them max, so the buttons/tools system might be better for someone who don't use it a lot.
- __Windowing__ drags directions are the same : vertical for the center (top dark) and horizontal for width (right for low contrasts).
- __customization__ windowing presets and color-map presets are generally customizable. The issue here is we are on a online service :
    - either we save it for everyone (i.e. save it in a database),
    - either save it for each one (i.e. save it in a database and having a user database...),
    - either saving on user's computer (_cookies_ : might be deleted often, _fixed file_ : where ?, _localStorage_ : persisted in the browser) useless if users don't works with the same computer every times
    - the let user create new colormaps (it's already ok for windowing), but never save it.


### Camera

|Name | VV shortcut | AMI shortcut | Monaco | DOSI soft | MIM | ZeroFootprint | Description |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
|Zoom| Ctrl+Wheel & i/o| RMB Drag (Bottom right --) & D+LMB Drag|+ / -| _tool + click_|Vertical LMB Drag||Drag => which direction + -|
|Rotate| ? | ? |_Menu + click_| _tool + click_|||-|
|Move| MMB Drag | LMB Drag|_Menu + click_| _tool + click_||| - |
|Change slice| Up/Down & Wheel | Wheel |?|Wheel|RMB Drag|LMB Drag| - |
|Preset Camera (reset) | R | ? |?||||-|
|Preset View | F2-F4 | ? |?|||| -|
|Horizontal flip | F5 | ? |_Menu_|||| -|
|Vertical flip | F6 | ? |_Menu_|||| -|
|Invert values | ? | ? |_Menu_|||| -|

### Window level & color

|Name | VV shortcut | AMI shortcut | Monaco | DOSI soft | MIM | ZeroFootprint | Description |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
|Change Window center | RMB Drag vertical (top dark) | ? |_Menu + click_ ||Tool + LMB Drag vertical|RMB Drag vertical |which direction darker (center height)|
| Change Window width | RMB Drag horizontal (right : wide : gray low contrast) | ? |_Menu + click_||Tool + LMB Drag horizontal|RMB Drag horizontal | which direction wider (low contrast)
|Preset Windowing | 0-5 | ? |_Menu + click_|||| -|
|Preset Colormap |6-9 | ? |_Menu_|||| -|

### Values & landmarks

|Name | VV shortcut | AMI shortcut | Monaco | DOSI soft | MIM | ZeroFootprint | Description |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
|Value prob | LMB | ? | ? ||||-|
|Center Camera to Prob | G|?|||||-|
| Set a mark | space | ? |?||||-|
