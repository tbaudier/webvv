/**
 * This module manages HTTP requests and data loading<br/>
 * Note that most of these methods (all but readMultipleFiles) are not visible from outside
 * because not currently useful from outside, but they exist and can be made visible easly (adding them
 * to the return clause).
 *
 * @module localRequestManager
 */
function localRequestManager() {
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
   * Parse incoming files<br/>
   * Reads an URL of a json (given in GET param), and parse files indicated in this json<br/>
   * seriesContainer format : {image : [array of IMG], fusion : [array of IMG], ...}
   * @param  {AMI.VolumeLoader} loader AMI given loader
   * @param  {handleSeries} handleSeriesFunct  a callback function that takes a param (seriesContainer)
   * @param  {handleError} handleError        a callback function when an error is thrown
   * @memberof module:RequestManager
   */
  function readMultipleFiles(loader, files, handleSeriesFunct, handleError) {
    let seriesContainer = {};

    let total_files_i = 0;
    let file_i = -1;

    // Use Promises to keep every call synchronous
    let p = Promise.resolve()
      .then(_ => {
        // follow the count to show the
        for (let prop in files)
          if (files.hasOwnProperty(prop))
            ++total_files_i;

        let text = "";
        for (let prop in files)
          if (files.hasOwnProperty(prop))
            p = p.then(_ => {
              ++file_i;
              //Write filenames
              if (prop === "struct") {
                for (let roi in files[prop]) {
                  if (files[prop][roi].length > 0)
                    text += prop + ": " + files[prop][roi][0].name + "<br/>";
                }
              } else {
                if (files[prop].length > 0)
                  text += prop + ": " + files[prop][0].name + "<br/>";
              }
              document.getElementById("filenames").innerHTML = text;
              // and proceed
              return loadAllData(files, prop);
            });
        p = p.then(_ => {
          return new Promise((resolve, reject) => {
            // update loader
            if (loader._progressBar)
              loader._progressBar.update(95, 100, 'load'); // the last 5 percents will be the slicing
            setTimeout(resolve, 10);
          });
        });
        p = p.then((series) => {
          console.log("Files loaded.");
          handleSeriesFunct(seriesContainer);
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
     * @param  {Object} files      container object where the result is written
     * @param  {string} categoryName name of the fetched category, "information" and "study" will be ignored
     * @return {Promise} Promise object representing the loaded data
     * @memberof module:RequestManager
     */
    function loadAllData(files, category) {
      return new Promise((resolve, reject) => {
          let p = Promise.resolve();
          if (category === "struct") {
            for (let roi in files["struct"]) {
              p = p.then(_ => {
                console.log("struct " + roi + " : Files loading...");
                // update loader
                if (loader._progressBar) {
                  loader._progressBar.update(file_i, total_files_i, 'load');
                }
                return loadData(files, category, roi);
              });
            }
          } else {
            p = p.then(_ => {
              if (files[category] !== undefined) {
                console.log(category + " : Files loading...");
                // update loader
                if (loader._progressBar) {
                  loader._progressBar.update(file_i, total_files_i, 'load');
                }
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
        })
        .catch((e) => {
          window.console.log(e)
        });;
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
            })
            .catch((e) => {
              window.console.log(e)
            });
        })
        .then(function(buffer) {
          return loader.parse({
            url: files[index].name,
            buffer
          });
        })
        .then(function(serie) {
          if (category != "struct") {
            if (typeof seriesContainer[category] === 'undefined')
              seriesContainer[category] = [];
            seriesContainer[category].push(serie);
          } else {
            if (typeof seriesContainer[category] === 'undefined')
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
            window.console.log(e)
          })
        );
      }

      return Promise.all(fetchSequencePromises)
        .then((rawdata) => {
          // rawdata is given in the AMI format {url, buffer}
          return loader.parse(rawdata);
        })
        .then(function(serie) {
          if (category != "struct") {
            if (typeof seriesContainer[category] === 'undefined')
              seriesContainer[category] = [];
            seriesContainer[category].push(serie);
          } else {
            if (typeof seriesContainer[category] === 'undefined')
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
          if (category != "struct")
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
        })
        .catch((e) => {
          window.console.log(e)
        });
    }
  }

  // Using the module.exports system, we list here functions available from outside
  return {
    readMultipleFiles: readMultipleFiles
  }
}

module.exports = localRequestManager();
