// Fetch depencies
const glob = require('glob');
const globParent = require('glob-parent');
const path = require('path');

let directories = [];

/**
 * class WebpackWatchedGlobEntries
 */
class WebpackWatchedGlobEntries {

    /**
     *
     * @param globs
     * @param globOptions
     * @param pluginOptions_
     * @returns {Function}
     */
    static getEntries(globs, globOptions, pluginOptions_) {

        // Type check pluginOptions_
        if (typeof pluginOptions_ !== 'undefined' && typeof pluginOptions_ !== 'object') {
            throw new TypeError('pluginOptions_ must be an object');
        }

        // Options defaults
        const pluginOptions = Object.assign({
            basename_as_entry_id: false
        }, pluginOptions_);

        return function() {

            // Check if globs are provided properly
            if (typeof globs !== 'string' && !Array.isArray(globs)) {
                throw new TypeError('globOptions must be a string or an array of strings');
            }

            // Check globOptions if provided properly
            if (globOptions && typeof globOptions !== 'object') {
                throw new TypeError('globOptions must be an object');
            }

            // Make entries an array
            if (!Array.isArray(globs)) {
                globs = [globs];
            }

            //
            let globbedFiles = {};

            // Map through the globs
            globs.forEach(function(globString) {

                let base = globParent(globString, {});

                // Dont add if its already in the directories
                if (directories.indexOf(base) === -1) {
                    directories.push(base);
                }

                // Get the globbedFiles
                let files = WebpackWatchedGlobEntries.getFiles(globString, globOptions, pluginOptions.nameCallback);

                // Set the globbed files
                globbedFiles = Object.assign(files, globbedFiles);

            });

            return globbedFiles;
        };
    }

    static defaultNaming (base, file) {
         return path
          .relative(base, file)
          .replace(path.extname(file), '')
          .split(path.sep)
          .join('/');
    }

    /**
     * Create webpack file entry object
     * @param globString
     * @param globOptions
     * @param basename_as_entry_name
     * @returns {Object}
     */
    static getFiles(globString, globOptions, nameCallback) {

        const files = {};
        let base = globParent(globString, {});

        const resolvedNameCallback = typeof nameCallback === 'function'
          ? nameCallback
          : WebpackWatchedGlobEntries.defaultNaming

        glob.sync(globString, globOptions).forEach(function(file) {
            // Format the entryName
            let entryName

            if (typeof nameCallback === 'function') {
                entryName = nameCallback(base, file)
            } else {

            }

            // Add the entry to the files obj
            files[entryName] = file;
        });

        return files;
    }

    /**
     * Install Plugin
     * @param {Object} compiler
     */
    apply(compiler) {
        if (compiler.hooks) {
            // Support Webpack >= 4
            compiler.hooks.afterCompile.tapAsync(this.constructor.name, this.afterCompile.bind(this));
        } else {
            // Support Webpack < 4
            compiler.plugin('after-compile', this.afterCompile);
        }
    }

    /**
     * After compiling, give webpack the globbed files
     * @param {Object} compilation
     * @param {Function} callback
     */
    afterCompile(compilation, callback) {
        if (Array.isArray(compilation.contextDependencies)) {
            // Support Webpack < 4
            compilation.contextDependencies = compilation.contextDependencies.concat(directories);
        } else {
            // Support Webpack >= 4
            for (const directory of directories) {
                compilation.contextDependencies.add(path.normalize(directory));
            }
        }
        callback();
    }
}

module.exports = WebpackWatchedGlobEntries;

