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

  /**
   * Returns parameters given in URL (as GET parameters)
   * @return {Object} a dictionnary params['paramName'] = 'paramValue'
   */
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

  /**
   * Makes a json request to a given URL
   * @return {Promise} Promise object represents the content of the json request
   */
  function jsonHttpRequest(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.overrideMimeType("application/json");
      xhr.onload = () => {
        if (xhr.status == "200") {
          resolve(xhr.responseText)
        } else {
          reject(xhr.statusText)
        }
      };
      xhr.onerror = () => reject(xhr.statusText);
      xhr.open("GET", url);
      xhr.send();
    });
  }

  /**
   * Makes a binary request to a given URL
   * @return {Promise} Promise object represents the binary content of the http request
   */
  function binaryHttpRequest(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.responseType = "blob"; //force the HTTP response, response-type header to be blob
      xhr.onload = () => {
        if (xhr.status == "200") {
          resolve(xhr.response)
        } else {
          reject(xhr.statusText)
        }
      };
      xhr.onerror = () => reject(xhr.statusText);
      xhr.open("GET", url);
      xhr.send();
    });
  }

  /**
   * Fetches binary files given a json containing 'category : [url1, url2,...]'
   * @return {Promise} Promise object represents the array of fetched files.
   */
  function fetchCategoryFiles(jsonData, files, categoryName) {
    return new Promise((resolve, reject) => {
      if (!jsonData[categoryName])
        reject("No category with this name (" + categoryName + ") in json.");

      let promise = Promise.resolve();
      let subCategoryFiles = [];

      for (let i = 0; i < jsonData[categoryName].length; i++) {
        promise = promise
          .then(_ => {
            // for each url, fetch the appropriate file
            let fileURL = '/datafiles/' + jsonData.study + "/" + jsonData[categoryName][i];
            return binaryHttpRequest(fileURL);
          })
          .then((response) => {
            // and add it to the array
            let filename = jsonData[categoryName][i].split('/').pop();
            subCategoryFiles.push(new File([response], jsonData[categoryName][i].split('/').pop()));
          });
      }

      // finally we return "files" as the result
      promise = promise.then(_ => {
        files[categoryName] = subCategoryFiles;
        resolve();
      });

    });
  }

  /**
   * Parse incoming files
   * Reads an URL of a json (given in GET param), and parse files indicated in this json
   * @param {AMI.VolumeLoader} loader AMI given loader
   * @param {function} handleSeriesFunct a callback function that takes a param (seriesContainer)
   * seriesContainer format : {image : [array of IMG], fusion : [array of IMG], ...}
   */
  function readMultipleFiles(loader, handleSeriesFunct) {

    let seriesContainer = {};

    let files = {};
    let jsonParameters;

    // Use Promises to keep every call synchronous
    Promise.resolve()
      .then(_ => {
        // request the json, the url is read in the GET parameters
        console.log("Json request...");
        const GET = getGETparameters();
        const jsonURL = "/" + GET["viewer"]; //url to the json object
        return jsonHttpRequest(jsonURL);
      })
      .then((jsonResponse) => {
        jsonParameters = JSON.parse(jsonResponse);
      })
      /*
            .then(_=>{
              return loader.load(jsonParameters.)
            })*/
      // IMAGE
      .then(_ => {
        return fetchAndLoadData(jsonParameters, files, "image");
      })
      // FUSION
      .then(_ => {
        return fetchAndLoadData(jsonParameters, files, "fusion");
      })
      // Final callback
      .then((series) => {
        console.log("Files loaded.");
        handleSeriesFunct(seriesContainer);
      })


      // Error handling
      .catch((error) => {
        console.log("An error has occured:");
        console.log(error);
      });

    function fetchAndLoadData(jsonParameters, files, category) {
      return new Promise((resolve, reject) => {
        Promise.resolve()
        .then(_ => {
          if (jsonParameters[category] !== undefined) {
            console.log(category + " : Files request...");
            return fetchCategoryFiles(jsonParameters, files, category);
          }
        })
        .then(_ => {
          if (jsonParameters[category] !== undefined) {
            console.log(category + " : Files loading...");
            return loadData(files, category);
          }
        })
        .then(_ => {
          resolve();
        })
      });
  }

  // Load sequence
  function loadSequence(index, files, category) {
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
      .then(function(serie) {
        seriesContainer[category] = [];
        seriesContainer[category].push(serie);
      })
      .catch(function(error) {
        window.console.log('Oops... something went wrong while loading the sequence...');
        window.console.log(error);
      });
  }

  // Load group sequence
  function loadSequenceGroup(file, category) {
    const fetchSequencePromises = [];

    for (let formatName in file) {
      fetchSequencePromises.push(
        new Promise((resolve, reject) => {
          const myReader = new FileReader();
          // should handle errors too...
          myReader.onload = (e) => {
            resolve(e.target.result);
          };
          myReader.readAsArrayBuffer(file[formatName]);
        })
        .then(function(buffer) {
          return {
            // This is a AMI format
            url: file[formatName].name,
            buffer
          };
        })
      );
    }

    return Promise.all(fetchSequencePromises)
      .then((rawdata) => {
        // rawdata is given in the AMI format {url, buffer}
        return loader.parse(rawdata);
      })
      .then(function(serie) {
        seriesContainer[category] = [];
        seriesContainer[category].push(serie);
      })
      .catch(function(error) {
        window.console.log('oops... something went wrong while parsing the sequence...');
        window.console.log(error);
      });
  }

  // Load one image/sequence/header+image group
  function loadData(files, category) {
    return new Promise((resolve, reject) => {

      const loadSequencePromiseContainer = [];
      const data = [];
      const dataGroup = {};
      let separatedFormat;

      // convert object into array
      for (let i = 0; i < files[category].length; i++) {
        let dataUrl = AMI.UtilsCore.parseUrl(files[category][i].name);
        if (_filterByExtension('mhd', dataUrl)) {
          dataGroup["header"] = files[category][i];
          separatedFormat = true;
        } else if (_filterByExtension('raw', dataUrl)) {
          dataGroup["data"] = files[category][i];
        } else {
          data.push(files[category][i]);
        }
      }

      if (separatedFormat !== undefined) {
        if (dataGroup["header"] === undefined || dataGroup["data"] === undefined) {
          reject("Data seems to be 'header (mhd) + data (raw)' but data can't be found !");
        } else {
          loadSequencePromiseContainer.push(
            loadSequenceGroup(dataGroup, category)
          );
        }
      } else {
        // load the rest of the files
        for (let i = 0; i < data.length; i++) {
          loadSequencePromiseContainer.push(
            loadSequence(i, data, category)
          );
        }
      }

      // run the load sequence
      // load sequence for all files
      Promise
        .all(loadSequencePromiseContainer)
        .then(function() {
          resolve(seriesContainer);
        })
        .catch(function(error) {
          window.console.log(error);
          reject('oops... something went wrong while using the sequence...');
        });
    });
  }
}

// Using the module.exports system, we list here functions available from outside
return {
  readMultipleFiles: readMultipleFiles
}
}

module.exports = requestManager();
