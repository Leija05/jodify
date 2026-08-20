/**
 * Config plugin de JodiFy: ecualizador nativo de Android.
 *
 * 1. Copia el módulo Kotlin `JodifyEqualizer` dentro del proyecto android.
 * 2. Lo registra en MainApplication.getPackages().
 * 3. Activa la New Architecture (gradle) para quitar el modo legacy.
 */
const { withDangerousMod, withMainApplication, withGradleProperties } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'with-jodify-equalizer');
const REL_DEST = 'app/src/main/java/com/leija/jodify/eq';
const IMPORT_LINE = 'import com.leija.jodify.eq.JodifyEqualizerPackage';

function withEqualizerSources(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dest = path.join(cfg.modRequest.projectRoot, 'android', REL_DEST);
      fs.mkdirSync(dest, { recursive: true });
      for (const file of fs.readdirSync(SRC_DIR)) {
        if (!file.endsWith('.kt')) continue;
        fs.copyFileSync(path.join(SRC_DIR, file), path.join(dest, file));
      }
      return cfg;
    },
  ]);
}

function withEqualizerRegistration(config) {
  return withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (contents.includes(IMPORT_LINE)) return cfg;

    contents = contents.replace(
      'import expo.modules.ApplicationLifecycleDispatcher',
      `import expo.modules.ApplicationLifecycleDispatcher\n${IMPORT_LINE}`,
    );

    contents = contents.replace(
      'PackageList(this).packages.apply {',
      `PackageList(this).packages.apply {
              // Ecualizador nativo de JodiFy.
              add(com.leija.jodify.eq.JodifyEqualizerPackage())`,
    );

    cfg.modResults.contents = contents;
    return cfg;
  });
}

function withNewArchitecture(config) {
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults;
    const existing = props.findIndex(
      (p) => p.type === 'property' && p.key === 'newArchEnabled',
    );
    if (existing >= 0) {
      props[existing].value = 'true';
    } else {
      props.push({ type: 'property', key: 'newArchEnabled', value: 'true' });
    }
    return cfg;
  });
}

module.exports = function withJodifyEqualizer(config) {
  config = withEqualizerSources(config);
  config = withEqualizerRegistration(config);
  config = withNewArchitecture(config);
  return config;
};