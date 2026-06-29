const { withDangerousMod } = require("@expo/config-plugins");
const { mergeContents } = require("@expo/config-plugins/build/utils/generateCode");
const path = require("path");
const fs = require("fs");

/**
 * Allows non-modular headers inside framework modules.
 * Required when using @react-native-firebase with use_frameworks! :linkage => :static.
 */
const withFirebaseFrameworkModules = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      let podfileContents = fs.readFileSync(podfilePath, "utf8");

      const snippet = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        if target.name.start_with?('RNFB')
          config.build_settings['DEFINES_MODULE'] = 'NO'
        end
        if target.name.start_with?('Expo')
          config.build_settings['SWIFT_VERSION'] = '5.10'
        end
      end
    end`;

      if (!podfileContents.includes("CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES")) {
        podfileContents = podfileContents.replace(
          /(\s*react_native_post_install\([\s\S]*?\)\s*\n)/,
          `$1${snippet}\n`
        );
        fs.writeFileSync(podfilePath, podfileContents);
      }

      return config;
    },
  ]);
};

module.exports = withFirebaseFrameworkModules;
