document.getElementById('add-ROI').addEventListener('click', addRoi);
document.getElementById('bg-files').addEventListener('change', changeFileInput);
document.getElementById('fusion-files').addEventListener('change', changeFileInput);
document.getElementById('overlay-files').addEventListener('change', changeFileInput);

document.getElementById('bg-reset').addEventListener('click', deleteImages);
document.getElementById('fusion-reset').addEventListener('click', deleteImages);
document.getElementById('overlay-reset').addEventListener('click', deleteImages);

let roiCount = 0;

function deleteImages(event) {
  let targetId = event.target.id.split('-')[0];
  targetForm = document.getElementById(targetId + '-form');
  targetInput = document.getElementById(targetId + '-files');
  if (targetForm)
    targetForm.classList.add('incomplete');
  if (targetInput)
    targetInput.value = "";
}

function addRoi() {
  let div = document.createElement('div');
  div.innerHTML = `
  <div class='incomplete' id='roi${roiCount}-form'>
    <button class='float-right del' id='roi${roiCount}-reset'>X</button>
    <h2>ROI ${roiCount}</h2> Select (mhd AND raw) or (mha) or (nifti)<br/> Hold Ctrl to select several files.<br/><br/>
    <label for='roi${roiCount}-files'>Files</label>
    <input type='file' name='roi${roiCount}-files' id='roi${roiCount}-files' multiple/>
    <label for='roi${roiCount}-name'>| Name</label>
    <input type='text' name='roi${roiCount}-name' id='roi${roiCount}-name' size='10'/>
    <br/>
  </div>
  `;
  document.getElementById('ROI-settings-container').appendChild(div);
  document.getElementById(`roi${roiCount}-files`).addEventListener('change', changeFileInput);
  document.getElementById(`roi${roiCount}-reset`).addEventListener('click', deleteImages);
  document.getElementById('ROI_count').value = ++roiCount;
}

function changeFileInput(event) {
  let inputIsVoid = event.target.files.length == 0;
  let targetId = event.target.id.split('-')[0];
  target = document.getElementById(targetId + '-form');
  if (target) {
    if (inputIsVoid)
      target.classList.add('incomplete');
    else
      target.classList.remove('incomplete');
  }
}
