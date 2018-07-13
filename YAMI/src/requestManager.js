/**
 * This module manages HTTP requests and data loading<br/>
 * Note that most of these methods (all but readMultipleFiles) are not visible from outside
 * because not currently useful from outside, but they exist and can be made visible easly (adding them
* to the return clause).
 *
 * @module RequestManager
 */
function requestManager() {
  /**
   * Returns true if an object has the requested extension, false otherwise.
   *
   * @param  {string} extension requested extension (as string)
   * @param  {Object} item object having a <i>extension</i> attribute (string) to compare
   * @param  {String} item.extension string to compare to extension (ignoring case)
   * @return {Boolean} true if item has the same extension (ignoring case)
   * @memberof module:RequestManager
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
   * @memberof module:RequestManager
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
   *
   * @param  {string} url url to the json to fetch
   * @return {Promise} Promise object representing the content of the response of the json request
   * @memberof module:RequestManager
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
      })
      .catch((e) => {
        console.log(e)
      });
  }

  /**
   * Makes a binary request to a given URL
   *
   * @param  {string} url url to the binary file to fetch
   * @return {Promise} Promise object represents the binary content of the response of the http request
   * @memberof module:RequestManager
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
      })
      .catch((e) => {
        console.log(e)
      });
  }

  /**
   * Fetches binary files given a json containing 'category : [url1, url2,...]'
   *
   * @param  {Object} jsonData   parsed input json
   * @param  {Object} files      container object where the result is written
   * @param  {string} categoryName name of the fetched category
   * @param  {string} structNum index of ROI if category == "struct"
   * @return {Promise} Promise object represents the array of fetched files.
   * @memberof module:RequestManager
   */
  function fetchCategoryFiles(jsonData, files, categoryName, structNum) {
    return new Promise((resolve, reject) => {
      if (!jsonData[categoryName])
        reject("No category with this name (" + categoryName + ") in json.");

      let promise = Promise.resolve();
      let subCategoryFiles = [];
      let cat;
      if(categoryName != "struct")
        cat = jsonData[categoryName];
      else
        cat = jsonData[categoryName]["data"][structNum];

      // TODO faire la 4D !!!
      let time = 0;
      for (let i = 0; i < cat["data"][time].length; i++) {
        promise = promise
          .then(_ => {
            // for each url, fetch the appropriate file
            let fileURL = '/datafiles/' + jsonData.study + "/" + cat["data"][time][i];
            return binaryHttpRequest(fileURL);
          })
          .then((response) => {
            // and add it to the array
            let filename = cat["data"][0][i].split('/').pop();
            subCategoryFiles.push(new File([response], cat["data"][time][i].split('/').pop()));
          })
          .catch((e) => {
            reject(e)
          });
      }

      // finally we return "files" as the result
      promise = promise.then(_ => {
        if(categoryName != "struct")
          files[categoryName] = subCategoryFiles;
        else{
          if(typeof files[categoryName] === 'undefined')
            files[categoryName] = [];
          files[categoryName][structNum] = subCategoryFiles;
        }
        resolve();
      });

    });
  }

  /**
   * Parse incoming files<br/>
   * Reads an URL of a json (given in GET param), and parse files indicated in this json<br/>
   * seriesContainer format : {image : [array of IMG], fusion : [array of IMG], ...}
   * @param  {AMI.VolumeLoader} loader AMI given loader
   * @param  {handleSeries} handleSeriesFunct  a callback function that takes a param (seriesContainer)
   * @param  {handleError} handleError        a callback function when an error is thrown
   * @memberof module:RequestManager
   */
  function readMultipleFiles(loader, handleSeriesFunct, handleError) {

    let seriesContainer = {};

    let files = {};
    let jsonParameters;

    // Use Promises to keep every call synchronous
    let p = Promise.resolve()
      .then(_ => {
        // request the json, the url is read in the GET parameters
        console.log("Json request...");
        const GET = getGETparameters();
        const jsonURL = "/" + GET["viewer"]; //url to the json object
        return jsonHttpRequest(jsonURL);
      })
      .then((jsonResponse) => {
        jsonParameters = JSON.parse(jsonResponse);
        parseInformationData(jsonParameters, files);
      })
      .then( _ => {
        for (let prop in jsonParameters)
          if (jsonParameters.hasOwnProperty(prop))
            p = p.then(_ => {
              return fetchAndLoadData(jsonParameters, files, prop);
            });
        p = p.then((series) => {
          console.log("Files loaded.");
          handleSeriesFunct(seriesContainer, files["information"]);
        });
      })

      // Error handling
      .catch((error) => {
        console.log("An error has occured:");
        console.log(error);
        handleError();
      });

    /**
     * Takes a json object as input, fetch corresponding data and loads them.
     *
     * @param  {Object} jsonParameters parsed input json
     * @param  {Object} files      container object where the result is written
     * @param  {string} categoryName name of the fetched category, "information" and "study" will be ignored
     * @return {Promise} Promise object representing the loaded data
     * @memberof module:RequestManager
     */
    function fetchAndLoadData(jsonParameters, files, category) {
      if(category === "information" || category === "study")
        return;
      return new Promise((resolve, reject) => {
        let p = Promise.resolve();
        if(category === "struct"){
          for(let roi in jsonParameters["struct"]["data"]){
            // TODO remember name : jsonParameters["struct"]["data"][roi]["roi"]
            let name =  jsonParameters["struct"]["data"][roi]["roi"];
            p = p.then(_ => {
                console.log("struct " + name + " : Files request...");
                return fetchCategoryFiles(jsonParameters, files, category, roi);
            })
            .then(_ => {
                console.log("struct " + name + " : Files loading...");
                return loadData(files, category, roi);
            });
          }
        }else{
          p = p.then(_ => {
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
          });
        }

          p = p.then(_ => {
            resolve();
          })
          .catch((e) => {
            reject(e)
          });
      });
    }

    /**
     * Create the information object
     *
     * @param  {Object} json          input json object
     * @param  {Object} futureContainer output json object
     */
    function parseInformationData(json, futureContainer) {
      futureContainer["information"] = {};
      futureContainer["information"]["data"] = json["information"];
      futureContainer["information"]["data"]["study"] = json["study"];
      if (json["image"])
        futureContainer["information"]["image"] = {
          "unit": json["image"]["unit"]
        };
      if (json["fusion"])
        futureContainer["information"]["fusion"] = {
          "unit": json["fusion"]["unit"]
        };
      if (json["struct"]){
        futureContainer["information"]["struct"] = {
          "unit": json["struct"]["unit"],
          "names":[]
        };
        for(let i = 0; i < json["struct"]["data"].length; ++i)
          futureContainer["information"]["struct"]["names"][i] = json["struct"]["data"][i].roi;
      }
    }

    // Load sequence
    function loadSequence(index, files, category, structNum) {
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
            if(category != "struct"){
              if (typeof seriesContainer[category] === 'undefined')
                seriesContainer[category] = [];
              seriesContainer[category].push(serie);
            }else{
              if(typeof seriesContainer[category] === 'undefined')
                seriesContainer[category] = [];
              seriesContainer[category][structNum] = [];
              seriesContainer[category][structNum].push(serie);
            }

        })
        .catch(function(error) {
          window.console.log('Oops... something went wrong while loading the sequence...');
          window.console.log(error);
        });
    }

    // Load group sequence
    function loadSequenceGroup(file, category, structNum) {
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
          .catch((e) => {
            reject(e)
          })
        );
      }

      return Promise.all(fetchSequencePromises)
        .then((rawdata) => {
          // rawdata is given in the AMI format {url, buffer}
          return loader.parse(rawdata);
        })
        .then(function(serie) {
          if(category != "struct"){
            if(typeof seriesContainer[category] === 'undefined')
              seriesContainer[category] = [];
            seriesContainer[category].push(serie);
          }else{
            if(typeof seriesContainer[category] === 'undefined')
              seriesContainer[category] = [];
            seriesContainer[category][structNum] = [];
            seriesContainer[category][structNum].push(serie);
          }
        })
        .catch(function(error) {
          window.console.log('oops... something went wrong while parsing the sequence...');
          window.console.log(error);
        });
    }

    // Load one image/sequence/header+image group
    function loadData(files, category, structNum) {
      return new Promise((resolve, reject) => {

        const loadSequencePromiseContainer = [];
        const data = [];
        const dataGroup = {};
        let separatedFormat;
        let cat;
        if(category != "struct")
          cat = files[category];
        else
          cat = files[category][structNum];

        // convert object into array
        for (let i = 0; i < cat.length; i++) {
          let dataUrl = AMI.UtilsCore.parseUrl(cat[i].name);
          if (_filterByExtension('mhd', dataUrl)) {
            dataGroup["header"] = cat[i];
            separatedFormat = true;
          } else if (_filterByExtension('raw', dataUrl)) {
            dataGroup["data"] = cat[i];
          } else {
            data.push(cat[i]);
          }
        }

        if (separatedFormat !== undefined) {
          if (dataGroup["header"] === undefined || dataGroup["data"] === undefined) {
            reject("Data seems to be 'header (mhd) + data (raw)' but data can't be found !");
          } else {
            loadSequencePromiseContainer.push(
              loadSequenceGroup(dataGroup, category, structNum)
            );
          }
        } else {
          // load the rest of the files
          for (let i = 0; i < data.length; i++) {
            loadSequencePromiseContainer.push(
              loadSequence(i, data, category, structNum)
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
