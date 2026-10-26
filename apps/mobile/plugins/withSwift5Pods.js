const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withSwift5Pods(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const iosDir = config.modRequest.platformProjectRoot;

      // 1. Patch Podfile: force Swift 5 on all pods (Xcode 26 defaults to Swift 6)
      const podfilePath = path.join(iosDir, "Podfile");
      let podfile = fs.readFileSync(podfilePath, "utf8");

      if (!podfile.includes("SWIFT_STRICT_CONCURRENCY")) {
        const snippet = [
          "",
          "    installer.pods_project.targets.each do |target|",
          "      target.build_configurations.each do |config|",
          "        config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
          "        config.build_settings['SWIFT_VERSION'] = '5.0'",
          "      end",
          "    end",
        ].join("\n");

        const marker = "    )\n  end\nend";
        if (podfile.includes(marker)) {
          podfile = podfile.replace(
            marker,
            "    )\n" + snippet + "\n  end\nend"
          );
          fs.writeFileSync(podfilePath, podfile);
        }
      }

      // 2. Ensure .xcode.env.local disables Sentry source map upload
      const xEnvPath = path.join(iosDir, ".xcode.env.local");
      let xEnv = "";
      if (fs.existsSync(xEnvPath)) {
        xEnv = fs.readFileSync(xEnvPath, "utf8");
      }
      if (!xEnv.includes("SENTRY_DISABLE_AUTO_UPLOAD")) {
        xEnv = xEnv.trimEnd() + "\nexport SENTRY_DISABLE_AUTO_UPLOAD=true\n";
        fs.writeFileSync(xEnvPath, xEnv);
      }

      return config;
    },
  ]);
};
