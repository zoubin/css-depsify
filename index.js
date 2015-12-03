var mix = require('mixy')
var path = require('path')
var thr = require('through2')

var Walker = require('./lib/walker')
var resolver = require('./lib/resolver').custom

module.exports = function (opts) {
  opts = mix({}, opts)
  opts.basedir = path.resolve(opts.basedir || '.')
  if (opts.resolve && typeof opts.resolve !== 'function') {
    opts.resolve = resolver(opts.resolve)
  }
  opts.transform = [].concat(opts.transform).filter(Boolean)
  opts.atRuleName = opts.atRuleName || 'deps'

  var fakeFileOrder = 0
  var stream = thr.obj(write, end)
  var walker = new Walker(opts)
  var inputs = []

  function write(row, _, next) {
    if (row.transform) {
      opts.transform.push(row.transform)
      return next()
    }

    // NOT allow to modify the original `row`
    row = mix({}, row)

    row.file = row.file || row.id || fakeFile()
    row.file = path.resolve(opts.basedir, row.file)

    inputs.push(row)

    next()
  }

  function end(done) {
    var state = walker.loop(inputs)

    state.on('file', stream.emit.bind(stream, 'file'))
    state.on('result', function (result) {
      // To work with watchify
      // Transforms which read more files to accomplish the transformation,
      // should fire `file` on `result`, so that they will be watched
      stream.emit('transform', result, result.from)
    })

    state.then(function (rows) {
      rows.forEach(function (row) {
        stream.push(row)
      })
      done()
    }, stream.emit.bind(stream, 'error'))

  }

  function fakeFile() {
    fakeFileOrder++
    return 'fake_' + fakeFileOrder + '.css'
  }

  return stream

}

