var browserify = require('browserify')
var fs = require('fs')
var path = require('path')
var uglify = require('uglify-js')
var watchify = require('watchify')
// external libraries
var libBundle = [
    './public/js/jquery/jquery-1.11.2.js',
    './public/js/bootstrap/bootstrap-3.3.4.js',
    './public/js/json2/json2.js',
    './public/js/clone/clone.js',
    './public/js/bluebird/bluebird.js'
];
var clientBundle = [
    './public/js/app/ChatRenderer.js',
    './public/js/app/ChatModel.js',
    './public/js/app/ChatSocketListener.js',
    './public/js/app/ChatEventListener.js',
    './public/js/app/ChatController.js',
    './public/js/app/index.js'
];
// CSS
var cssBundle = [
    './public/css/bootstrap/bootstrap.css'
];

function minify (file) {
    var fileMinified = path.join(path.dirname(file), path.basename(file, '.js') + '.min.js')
    var fileMap = outputMinified + '.map'

    var result = uglify.minify(file, {
        outSourceMap: path.basename(fileMap)
    })

    fs.writeFileSync(fileMinified, result.code)
    fs.writeFileSync(fileMap, result.map)
}

function browserifyBundle (files, output, options) {
    options = options || {}

    var bundle = browserify({
        debug: options.debug
    })

    files.forEach(function (file) {
        bundle.add(file)
    })

    bundle.bundle(function (error, content) {
        if (error) {
            console.error(error.stack || error.message)
        } else {
            fs.writeFileSync(output, content)

            if (options.uglify) {
                minify(output)
            }
        }
    })
}

function watchifyBundle (files, output, options) {
    options = options || {}

    var bundle = watchify(browserify(files, watchify.args))

    var make = function () {
        bundle.bundle(function (error, content) {
            if (error) {
                console.error(error.stack || error.message)
            } else {
                fs.writeFileSync(output, content)

                if (options.uglify) {
                    minify(output)
                }
            }
        })
    }

    bundle.on('update', function () {
        make()
        bundle.close()
    })

    bundle.on('log', function (event) {
        console.log((new Date()).toISOString() + ' ' + event.toString())
    })

    make()
}

function fileConcat (files, output, options) {
    options = options || {}

    var content = files.reduce(function (content, file) {
        return content + fs.readFileSync(file).toString()
    }, '')

    fs.writeFileSync(output, content)

    if (options.uglify) {
        minify(output)
    }
}

function buildAll () {
    // external libraries concat build
    fileConcat(libBundle, './public/js/lib.js')

    // application browserify build
    browserifyBundle(clientBundle, './public/js/client.js', {debug: true})

    // CSS concat build
    fileConcat(cssBundle, './public/css/index.css')
}

switch (process.argv[2]) {
    default:
        buildAll();
}