const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * Copies the new-order alert sound into native Android/iOS projects during prebuild.
 */
const withNotificationSound = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const source = path.join(projectRoot, "assets/audio/new_order_alert.wav");
      const targetDir = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/res/raw"
      );
      if (fs.existsSync(source)) {
        fs.mkdirSync(targetDir, { recursive: true });
        fs.copyFileSync(source, path.join(targetDir, "new_order_alert.wav"));
      }
      return config;
    },
  ]);
};

module.exports = withNotificationSound;
