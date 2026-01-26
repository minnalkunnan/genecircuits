import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';
import * as path from "node:path";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // Add extraResource to include PyInstaller executable
    extraResource: [
      path.join(__dirname, 'backend', 'dist', 'app')
    ],
    icon: './icons/icon.ico',
    executableName: 'genetic-circuit-simulator'
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      setupIcon: './icons/icon.ico',
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({
      options: {
        icon: './icons/icon.png'
      }
    }),
    new MakerDeb({
      options: {
        icon: './icons/icon.png'
      }
    }),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      devContentSecurityPolicy: "connect-src 'self' * 'unsafe-eval'",
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html',
            js: './electron/renderer.ts',
            name: 'main_window',
            preload: {
              js: './electron/preload.ts',
            },
          },
        ],
      },
    }),
  ],
};

if (process.env.NODE_ENV !== 'development') {
  config.plugins!.push(
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    })
  );
}

export default config;
