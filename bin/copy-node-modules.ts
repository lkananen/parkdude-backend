import * as path from 'path';
import {removeSync, copySync} from 'fs-extra';

/**
 * This script is used to ensure that build directory, which gets copied to
 * lambda, also has necessary node_modules.
 *
 * Note: at the moment all node_modules are copied, including those only needed
 * for development. A better solution should be investigated.
 */

const nodeModulesPath = path.resolve(__dirname, '../node_modules');
const buildNodeModulesPath = path.resolve(__dirname, '../build/node_modules');

console.log('Copying node_modules to build directory...');

// Remove all files. This can be done with sync, since this is just a script.
removeSync(buildNodeModulesPath);
// Copy current node_modules to build
copySync(nodeModulesPath, buildNodeModulesPath);
