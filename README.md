# YAMI Lucas Ouaniche 2018
---
## Sources :
I am working with the AMI library, available on github : https://github.com/FNNDSC/ami .

My development is under the commit [63c8ff5d5932b1132bc08ac7f63776fa54c0c938](https://github.com/FNNDSC/ami/commit/63c8ff5d5932b1132bc08ac7f63776fa54c0c938) done the 14 may 2018.

---

## New node.js server

### Install from the git
After cloning the git, dependencies are listed in the package.json . To install what is needed, run :
```
npm install
```

### New installation
In order to simplify the server code we get rid of everything running AMI examples and AMI compilation.

The easiest way to do that is create a new server. In theory our application can be run from any server, we choose a *Node.js* server (for 'require', 'let', or ES6 syntax).

```
mkdir myApplicationName
cd myApplicationName

npm init

npm install express --save
```

To avoid writing a super long js file, we use the Module behavior with Webpack :
```
touch webpack.config.js
cd public && touch index.html bundle.js
cd .. && cd src && touch index.js && cd ..

mkdir assets && cd assets && mkdir fonts icons images stylesheets
```
(general setup, now webpack :)
```
npm install webpack --save
```

---

## Architecture of this server
- `node_modules` are functional files/folders
- `package.json` is the first configuration of the server : dependencies and available commands (in the section "script")
- `index.js` is the entry point, contains the configuration of the server (host, port...)
- `webpack.config.js` is the configuration of the 'compilation' of our js
- `src` are readable .js before being bundled up.
- `public` is what we send to the user : html files and the bundle of our .js'

## Uses of this server
This server has 2 main purposes
#### The "bundling" of our .js files
It will stay active and watch for modifications. It can be used to work while we edit files that don't need server to be seen.

Here we can open public/viewer.html without the server and use webpack to update the bundle.js with the final script :
```
yarn webpack
```

#### The server itself, currently doing nothing peculiar (just serves static files)
Use this when you don't work on dev and want to use the server and don't change the sources.
```
yarn start
```

#### Both
Do both, the server is started and watch for modifications
```
yarn webpack_server
```
