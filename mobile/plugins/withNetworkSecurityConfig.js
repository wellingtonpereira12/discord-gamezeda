const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const networkSecurityConfigXml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </base-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">jogosbolados.duckdns.org</domain>
    <domain includeSubdomains="true">duckdns.org</domain>
    <domain includeSubdomains="true">2.24.64.219</domain>
    <domain includeSubdomains="true">localhost</domain>
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </domain-config>
</network-security-config>`;

const withNetworkSecurityConfig = (config) => {
  // 1. Cria network_security_config.xml em android/app/src/main/res/xml/
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const resXmlDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );
      if (!fs.existsSync(resXmlDir)) {
        fs.mkdirSync(resXmlDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(resXmlDir, 'network_security_config.xml'),
        networkSecurityConfigXml,
        'utf8'
      );
      return modConfig;
    },
  ]);

  // 2. Adiciona android:networkSecurityConfig e android:usesCleartextTraffic no AndroidManifest.xml
  config = withAndroidManifest(config, async (modConfig) => {
    if (modConfig.modResults && modConfig.modResults.manifest && modConfig.modResults.manifest.application) {
      const mainApplication = modConfig.modResults.manifest.application[0];
      if (mainApplication && mainApplication.$) {
        mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config';
        mainApplication.$['android:usesCleartextTraffic'] = 'true';
      }
    }
    return modConfig;
  });

  return config;
};

module.exports = withNetworkSecurityConfig;
