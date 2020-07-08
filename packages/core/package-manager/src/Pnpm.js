// @flow strict-local

import type {PackageInstaller, InstallerOptions} from './types';

import commandExists from 'command-exists';
import spawn from 'cross-spawn';
// import logger from '@parcel/logger';
// import split from 'split2';
// import JSONParseStream from './JSONParseStream';
import promiseFromProcess from './promiseFromProcess';
import {registerSerializableClass} from '@parcel/core';
import {npmSpecifierFromModuleRequest} from './utils';

// $FlowFixMe
import pkg from '../package.json';

const PNPM_CMD = 'pnpm';

const keypress = async () => {
  process.stdin.setRawMode(true);
  return new Promise(resolve =>
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      resolve();
    }),
  );
};

let hasPnpm: ?boolean;
export class Pnpm implements PackageInstaller {
  static async exists(): Promise<boolean> {
    if (hasPnpm != null) {
      return hasPnpm;
    }

    try {
      hasPnpm = Boolean(await commandExists('pnpm'));
    } catch (err) {
      hasPnpm = false;
    }

    return hasPnpm;
  }

  async install({
    modules,
    cwd,
    saveDev = true,
  }: InstallerOptions): Promise<void> {
    let args = [
      'add',
      '--stream',
      '--no-color',
      saveDev ? '--save-dev' : '--save-prod',
    ].concat(modules.map(npmSpecifierFromModuleRequest));

    console.log('INSTALL', {modules, cwd, saveDev});
    console.log('ARGS', {args});
    await keypress();

    let installProcess = spawn(PNPM_CMD, args, {
      cwd,
      env: {...process.env, NODE_ENV: 'development'},
    });
    //let ip2 = spawn(PNPM_CMD, ['i'], { cwd });
    let stdout = '';
    installProcess.stdout.on('data', str => {
      stdout += str;
    });

    let stderr = [];
    installProcess.stderr.on('data', str => {
      stderr.push(str);
    });

    try {
      await promiseFromProcess(installProcess);
      // await promiseFromProcess(ip2);
      // eslint-disable-next-line no-console
      console.log('!!!STDOUT!!!', {stdout});
      console.log('!!!STDERR!!!', {stderr});

      /*
      let results: NPMResults = JSON.parse(stdout);
      let addedCount = results.added.length;
      if (addedCount > 0) {
        logger.log({
          origin: '@parcel/package-manager',
          message: `Added ${addedCount} packages via npm`,
        });
      }

      // Since we succeeded, stderr might have useful information not included
      // in the json written to stdout. It's also not necessary to log these as
      // errors as they often aren't.
      for (let message of stderr) {
        logger.log({
          origin: '@parcel/package-manager',
          message,
        });
      }
      */
    } catch (e) {
      throw new Error('pnpm failed to install modules');
    }
  }
}

/*
function prefix(message: string): string {
  return 'pnpm: ' + message;
}
*/
registerSerializableClass(`${pkg.version}:Pnpm`, Pnpm);
