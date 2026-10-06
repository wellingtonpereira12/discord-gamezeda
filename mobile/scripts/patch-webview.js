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
  if (content.includes('handler.cancel();')) {
    content = content.replace(
      'handler.cancel();',
      '// Bypass SSL check for self-signed certificates in private servers\n        handler.proceed();\n        return;'
    );
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✅ [patch-webview] Successfully patched RNCWebViewClient.java to proceed on SSL certificate errors!');
  } else if (content.includes('handler.proceed();')) {
    console.log('ℹ️ [patch-webview] RNCWebViewClient.java is already patched.');
  } else {
    console.warn('⚠️ [patch-webview] handler.cancel() not found in target file.');
  }
} else {
  console.log('⚠️ [patch-webview] Target file does not exist: ' + targetFile);
}
