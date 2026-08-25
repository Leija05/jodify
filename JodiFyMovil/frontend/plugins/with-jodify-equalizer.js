/**
 * Config plugin de JodiFy: ecualizador nativo de Android.
 *
 * 1. Copia el módulo Kotlin dentro del proyecto android.
 * 2. Lo registra en MainApplication.
 * 3. New Architecture se gestiona desde app.json (no forzar aquí).
 */
const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');
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
      try {
        fs.mkdirSync(dest, { recursive: true });
        for (const file of fs.readdirSync(SRC_DIR)) {
          if (!file.endsWith('.kt')) continue;
          fs.copyFileSync(path.join(SRC_DIR, file), path.join(dest, file));
        }
      } catch (e) {
        console.warn('[with-jodify-equalizer] No se pudieron copiar los sources:', e.message);
      }
      return cfg;
    },
  ]);
}

function withEqualizerRegistration(config) {
  return withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (contents.includes(IMPORT_LINE)) return cfg;

    // Import
    contents = contents.replace(
      'import expo.modules.ApplicationLifecycleDispatcher',
      `import expo.modules.ApplicationLifecycleDispatcher\n${IMPORT_LINE}`,
    );

    // Registro del paquete — buscar el patrón correcto
    if (contents.includes('PackageList(this).packages.apply {')) {
      contents = contents.replace(
        'PackageList(this).packages.apply {',
        `PackageList(this).packages.apply {
              // Ecualizador nativo de JodiFy.
              add(com.leija.jodify.eq.JodifyEqualizerPackage())`,
      );
    } else if (contents.includes('PackageList(this).packages')) {
      contents = contents.replace(
        'PackageList(this).packages',
        `PackageList(this).packages
              // Ecualizador nativo de JodiFy.
              .also { it.add(com.leija.jodify.eq.JodifyEqualizerPackage()) }`,
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = function withJodifyEqualizer(config) {
  config = withEqualizerSources(config);
  config = withEqualizerRegistration(config);
  return config;
};
