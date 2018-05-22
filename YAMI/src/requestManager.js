function requestManager() {
  /**
   * Filter array of data by extension
   * extension {String}
   * item {Object}
   * @return {Boolean}
   */
  function _filterByExtension(extension, item) {
    if (item.extension.toUpperCase() === extension.toUpperCase()) {
      return true;
    }
    return false;
  }

  function getGETparameters() {
    let params = [];
    let query = window.location.search.substring(1).split("&");
    for (let i = 0, max = query.length; i < max; i++) {
      if (query[i] === "") // check for trailing & with no param
        continue;
      let param = query[i].split("=");
      if (decodeURIComponent(param[0]) === "viewer")
        params[decodeURIComponent(param[0])] = decodeURIComponent(param[1] || "");
    }
    return params
  }

  // Parse incoming files
  function readMultipleFiles(loader, handleSeriesFunct) {

    const loadSequenceContainer = [];

    let seriesContainer = [];

    // load GET values
    let GET = getGETparameters();
    let jsonRequest = new XMLHttpRequest();
    let jsonData;
    let loadedFiles = 0;
    let files = [];
    let jsonURL = "/" + GET["viewer"];

    jsonRequest.overrideMimeType("application/json");
    jsonRequest.onreadystatechange = function() {
      if (jsonRequest.readyState === XMLHttpRequest.DONE && jsonRequest.status == "200") {
        let jsonFile = jsonRequest.responseText;

        // Read the Json file
        jsonData = JSON.parse(jsonFile);
        // Read the content of the JSon file
        loadXMLHttpRequest();
      }
    }
    jsonRequest.open("GET", jsonURL, true);
    jsonRequest.send(null);

    // Load sequence
    function loadSequence(index, files) {
      return Promise
        .resolve()
        // load the file
        .then(function() {
          return new Promise(function(resolve, reject) {
            const myReader = new FileReader();
            // should handle errors too...
            myReader.addEventListener('load', function(e) {
              resolve(e.target.result);
            });
            myReader.readAsArrayBuffer(files[index]);
          });
        })
        .then(function(buffer) {
          return loader.parse({
            url: files[index].name,
            buffer
          });
        })
        .then(function(series) {
          seriesContainer.push(series);
        })
        .catch(function(error) {
          window.console.log('Oops... something went wrong while loading the sequence...');
          window.console.log(error);
        });
    }

    // Load group sequence
    function loadSequenceGroup(files) {
      const fetchSequence = [];

      for (let i = 0; i < files.length; i++) {
        fetchSequence.push(
          new Promise((resolve, reject) => {
            const myReader = new FileReader();
            // should handle errors too...
            myReader.addEventListener('load', function(e) {
              resolve(e.target.result);
            });
            myReader.readAsArrayBuffer(files[i].file);
          })
          .then(function(buffer) {
            return {
              url: files[i].file.name,
              buffer
            };
          })
        );
      }

      return Promise.all(fetchSequence)
        .then((rawdata) => {
          return loader.parse(rawdata);
        })
        .then(function(series) {
          seriesContainer.push(series);
        })
        .catch(function(error) {
          window.console.log('oops... something went wrong while parsing the sequence...');
          window.console.log(error);
        });
    }

    function loadData() {
      const data = [];
      const dataGroups = [];
      // convert object into array
      for (let i = 0; i < files.length; i++) {
        //window.console.log(files[i]);
        let dataUrl = AMI.UtilsCore.parseUrl(files[i].name);
        if (dataUrl.extension.toUpperCase() === 'MHD' ||
          dataUrl.extension.toUpperCase() === 'RAW') {
          dataGroups.push({
            file: files[i],
            extension: dataUrl.extension.toUpperCase(),
          });
        } else {
          data.push(files[i]);
        }
      }

      // check if some files must be loaded together
      if (dataGroups.length === 2) {
        // if raw/mhd pair
        const mhdFile = dataGroups.filter(_filterByExtension.bind(null, 'MHD'));
        const rawFile = dataGroups.filter(_filterByExtension.bind(null, 'RAW'));
        if (mhdFile.length === 1 &&
          rawFile.length === 1) {
          loadSequenceContainer.push(
            loadSequenceGroup(dataGroups)
          );
        }
      }

      // load the rest of the files
      for (let i = 0; i < data.length; i++) {
        loadSequenceContainer.push(
          loadSequence(i, data)
        );
      }

      // run the load sequence
      // load sequence for all files
      Promise
        .all(loadSequenceContainer)
        .then(function() {
          handleSeriesFunct(seriesContainer);
        })
        .catch(function(error) {
          window.console.log('oops... something went wrong while using the sequence...');
          window.console.log(error);
        });
    }

    function loadXMLHttpRequest() {

      let filename = jsonData.image[loadedFiles].split('/').pop();
      let xhr = new XMLHttpRequest();
      let fileURL = '/datafiles/' + jsonData.study + "/" + jsonData.image[loadedFiles];
      xhr.open("GET", fileURL);
      xhr.responseType = "blob"; //force the HTTP response, response-type header to be blob
      xhr.onload = function() {
        window.console.log("Try to load " + filename);
      }
      xhr.addEventListener('readystatechange', function() {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status == "200") {
          files.push(new File([xhr.response], filename)); // convert blob to file
          loadedFiles++;
          if (loadedFiles === jsonData.image.length) {
            loadData();
          } else {
            loadXMLHttpRequest();
          }
        }
      });
      xhr.send();
    }

  }

  // Using the module.exports system, we list here functions available from outside
  return {
    readMultipleFiles: readMultipleFiles
  }
}

module.exports = requestManager();
