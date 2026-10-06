const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-webview',
  'android',
  'src',
  'main',
  'java',
  'com',
  'reactnativecommunity',
  'webview',
  'RNCWebViewClient.java'
);

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');

  const replacement = `@Override
    public void onReceivedSslError(final WebView webView, final SslErrorHandler handler, final SslError error) {
        if (handler != null) {
            handler.proceed();
        }
    }`;

  const sslRegexWithOriginal = /@Override\s+public\s+void\s+onReceivedSslError\s*\([\s\S]*?this\.onReceivedError\s*\([\s\S]*?\);\s*\}/m;
  const sslRegexAny = /@Override\s+public\s+void\s+onReceivedSslError\s*\([\s\S]*?\n    \}/m;

  if (sslRegexWithOriginal.test(content)) {
    content = content.replace(sslRegexWithOriginal, replacement);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✅ [patch-webview] Replaced onReceivedSslError with clean handler.proceed() implementation!');
  } else if (sslRegexAny.test(content)) {
    content = content.replace(sslRegexAny, replacement);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✅ [patch-webview] Updated onReceivedSslError with clean handler.proceed() implementation!');
  } else {
    console.log('ℹ️ [patch-webview] onReceivedSslError already clean.');
  }
} else {
  console.log('⚠️ [patch-webview] Target file does not exist: ' + targetFile);
}
