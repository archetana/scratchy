#!/usr/bin/env node
/** @scratch /intro/getting_started/0
 *
 * = Scratchy =
 * Rashid Khan
 * v0.1, 2013-11-18
 * :doctype: article
 *
 * [preface]
 * == The Scratchy Way ==
 * Scratchy is a simple system for extracting user focused documentation from code. Scratch is not
 * for API docs, though it could be if you really wanted.
 * Scratchy enforces no particular format. It's purpose is to assemble the scattered parts of your
 * documentation in the order you specify, then drop them into a directory and file structure.
 *
 * While scratchy doesn't force a particular format, there are some recommendations.
 * - Start every line in a comment with a specific character. Scratchy necessarily trims leading
 * whitespace to deal with indentation. If your formatter requires leading white space it will be
 * relative from your +--line+ argument
 *
 */

var
  _         = require('underscore'),
  glob      = require("glob"),
  fs        = require('fs'),
  mkdirp    = require('mkdirp'),
  files     = [],
  docs      = {};

  // Bring in underscore string functions
  _.str     = require('underscore.string');
  _.mixin(_.str.exports());
  _.str.include('Underscore.string', 'string'); // => true

var _d = {
  begin: '/**',
  end: '*/',
  line: '*',
  strip: ' ',
  extension: '.txt',
  unslash: false
};

/** @scratch /intro/getting_started/1
 * === Documentation Format ===
 *
 * It is up to you to decide what format you wish to document in. If you were some kind of sadist
 * you could write your docs in HTML and skip the post processing
 * footnote:[Don't do that]
 * The Scratchy documentation uses Asciidoc because it serves as a powerful intermediary to many
 * other formats, but you could just as easily use something like Markdown.  From there you can use
 * whatever tool you'd like to post process them.
 */
module.exports.extract = function (argv) {
  // If we're being called from require, populate defaults without optimist
  if(require.main !== module) {
    for (var prop in _d) {
      if (prop in argv) {
        continue;
      }
      argv[prop] = _d[prop];
    }
  }

  files = _.flatten(_.map(_.flatten([argv.pattern]),function(pattern) {
    return glob.sync(pattern);
  }));
  var counter = files.length;

  console.log(files.length+ " paths matched. Processing.");
  _.each(files,function(file,i) {

    // Make sure the path is a file and not a directory or something else weird
    if(!fs.lstatSync(file).isFile()) {
      return;
    }

    var fileLines = fs.readFileSync(file).toString().split('\n'),
     inBlock = false,
     path,
     order;

    _.each(fileLines,function(line) {
      // This is pause slow, but doing this entirely async isn't reliable
      // Plus it causes the queue to fill and node to die
      line = _.ltrim(line);
      /** @scratch /intro/getting_started/5
      *
      * === Scratch tag ===
      *
      * Scratchy does not want all of your comments. To denote doc blocks that scratchy should
      * extract, the opening of your comment should contain the +@scratch+ tag immediately following
      * the comment opening characters.
      */
      if(!inBlock && _(line).startsWith(argv.begin)) {
        line = line.substring(argv.begin.length);
        var m = line.match(/@scratch\s+(.*)\/([^\/]*)/);
        if(m) {
          inBlock = true;
          path = m[1];
          order = m[2];
          docs[path] = docs[path] || [];
          docs[path][order] = docs[path][order] || [];
        }
      }
      else if(inBlock && _(line).startsWith(argv.end)) {
        line = line.substring(argv.end.length);
        inBlock = false;
      }
      else if(inBlock && _(line).startsWith(argv.line)) {
        line = line.substring(argv.line.length);
        if(argv.strip.length > 0 && _(line).startsWith(argv.strip)) {
          line = line.substring(argv.strip.length);
        }
        line = argv.unslash ? line.replace('\\/','/') : line;
        docs[path][order].push(line+'\n');
      }
    });
    console.log("Processed: "+ file);
  });

  // Process each path
  _.each(docs, function(doc,path) {
    pathParts = path.match(/(.*)\/([^\/]*)/);
    var fsPath = argv.output+pathParts[1]+'/'+pathParts[2]+argv.extension;
    /** @scratch /intro/getting_started/7
     *
     * ==== Pre-existing files ====
     *
     * Scratchy will not overwrite your exist docs, nor will ti append to them or try to merge
     * them. You will need to move your old docs out of the way. Scratchy will not abort, but
     * will communicate that it failed to write that path
     */
    try {
      if (fs.statSync(fsPath).isFile()) {
        console.log(fsPath+' already exists, not overwriting');
        return;
      }
    } catch(e) {}
    /** @scratch /intro/getting_started/6
     *
     * === Scratch path ===
     *
     * The scratch path tells scratchy where to put the extracted documentation. The path is a
     * simple directory path, followed by an priority number. For example, +/intro/welcome/2+
     * would be written to your output directory, in the intro directory, in the 'welcome'
     * file. It would appear after +/intro/welcome/1+ if it existed. Gaps in
     * priority numbers are fine, as are duplicates. Of course
     * order is not guaranteed with duplicate priority numbers.
    */
    mkdirp.sync(argv.output+pathParts[1]);
    var fd = fs.openSync(fsPath, 'a');
    // within each path, process each chunk
    _.each(doc,function(part) {
      // And every line in each chunk
      _.each(part,function(line){
        fs.writeSync(fd, line);
      });
    });
    fs.closeSync(fd);
  });

  /** @scratch /intro/getting_started/10
   *
   * == Post-Processing ==
   *
   * Scratchy is designed to promote post processing. Why? Because how can anyone know what format
   * you will want your documentation in, or for what purpose? Scratchy does not assume you're
   * writing API docs, nor does it assume that a web browser will be the destination for the
   * documentation it extracts. How you choose to post process is up to you.
   *
   * ==== How does scratchy do it? ====
   *
   * Because the documentation for the Scratchy project is in ASCIIDoc, we have
   * the option of extracting it to HTML, PDF, ePub, and a host of other formats. Here is the command
   * we use to post process Scratchy's output:
   *
   *   find docs -name *.txt | xargs -L 1 asciidoc -a numbered -b html5 -a icons -a toc2 -a theme=scratchy
   *
   */
};

if(require.main === module) {
  var opts  = require('optimist')
    /** @scratch /intro/getting_started/9
     *
     * == Running Scratchy ==
     *
     * Scratchy has only one required argument +--output+, to tell scratchy where to put the docs it
     * extracts. For example:
     *
     *  scratchy -o docs
     *
     * Would put the extracted docs into +./docs+. Here is the command we used to build the docs you are
     * reading right now:
     *
     *  scratchy -uo docs -p scratchy
     *
     * Scratchy is extracting documentation from itself! Spooky.
     * If you're wondering what those switches
     * do, see the link:../usage.html[Command Line reference]
     *
     */

    /** @scratch /usage/0
     * == Command Line Reference ==
     *
     *
     * Scratchy takes a number of command line parameters to control how it parses your comments and
     * outputs files
     *
     * [cols="1,2,2,10",options="header"]
     * |=======================================
     * | Short | Long | Default | Description
     */
    .usage('Usage $0 -o [dir] -p [pattern]')
    /** @scratch /usage/1
     * | -o | --output | *required* |
     * Directory in which to store extracted documentation. This will be created if it does not exist.
     */
    .alias('o','output').describe('o','Directory to put extracted docs in').demand('o')
    /** @scratch /usage/1
     * | -p | --pattern | '\**\/*.js'|
     * File pattern to match when searching for source code. The default is to recursively search for
     * javascript files. Specified patterns must be quoted depending on how your shell treats globs
     */
    .alias('p','pattern').describe('p','Quoted file pattern to match, eg \'**/*.js\' to recursively process all .js files').demand('p')
    /** @scratch /usage/1
     * | -b | --begin | /** |
     * The string of characters that indicates a comment block is starting. These should be immediately
     * followed by @scratch /your/path/and/1234 in your code.
     */

    .alias('b','begin').default('b',_d.begin).describe('b','Characters that denote the beginning of a doc block')
    /** @scratch /usage/1
     * | -e | --end | *\/ |
     * String that indicates a comment block is ending
     */
    .alias('e','end').default('e',_d.end).describe('e','Characters that denote the end of a doc block')
    /** @scratch /usage/1
     * | -l | --line | * |
     * String at the beginning of every line in a comment block. Why? So that scratchy knows where
     * to begin considering white space to be important. Leaving this off a line allows you to make
     * comments within your comment blocks. OOooo.
     */
    .alias('l','line').default('l',_d.line).describe('l','Lines within comment blocks start with this')
    /** @scratch /usage/1
     * | -s | --strip | <space> |
     * String to strip, along with the --line string, from the beginning of every line. Useful if you
     * trim trailing white space, but want blank lines to be considered
     */
    .alias('s','strip').default('s',_d.strip).describe('s','Strip this string from the beginning of every line')
    /** @scratch /usage/1
     * | -x | --extension | .txt |
     * Extension, with leading dot, to add to exported documents
     */
    .alias('x','extension').default('x',_d.extension).describe('x','Extension for exported docs')
    /** @scratch /usage/1
     * | -u | --unslash | N/A |
     * Turn \\/ into /
     */
    .alias('u','unslash').describe('u','Convert \\/ to \/')
    /** @scratch /usage/2
     * |=======================================
     */
    .argv;
  module.exports.extract(opts);
}
