import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  BackHandler,
  Platform,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';

// URL padrão do servidor VPS do Jogos Bolados
const DEFAULT_SERVER_URL = 'https://2.24.64.219:3050';

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Solicita permissões de microfone e câmera no dispositivo nativo
  useEffect(() => {
    (async () => {
      try {
        if (Audio.requestPermissionsAsync) {
          const audioStatus = await Audio.requestPermissionsAsync();
          if (audioStatus.status !== 'granted') {
            console.warn('[Permissões] Acesso ao microfone não concedido');
          }
        }
        if (Camera.requestCameraPermissionsAsync) {
          const cameraStatus = await Camera.requestCameraPermissionsAsync();
          if (cameraStatus.status !== 'granted') {
            console.warn('[Permissões] Acesso à câmera não concedido');
          }
        }
      } catch (err) {
        console.warn('[Permissões] Erro ao solicitar permissões nativas:', err);
      }
    })();
  }, []);

  // Botão Voltar no Android
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [canGoBack]);

  const handleRetry = () => {
    setHasError(false);
    setLoading(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#111214" />

      {hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📡</Text>
          <Text style={styles.errorTitle}>Falha na Conexão</Text>
          <Text style={styles.errorText}>
            Não foi possível conectar ao servidor do Jogos Bolados.
          </Text>
          {errorMessage ? (
            <Text style={styles.errorDetail}>{errorMessage}</Text>
          ) : null}

          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.webviewWrapper}>
          <WebView
            ref={webViewRef}
            source={{ uri: DEFAULT_SERVER_URL }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            scalesPageToFit={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            overScrollMode="never"
            injectedJavaScript="document.body.classList.add('is-mobile-app'); true;"
            cacheEnabled={true}
            startInLoadingState={true}
            // Permissão para WebRTC e chamadas de voz no Android WebView
            onPermissionRequest={(request) => {
              if (request && typeof request.grant === 'function') {
                request.grant(request.resources);
              }
            }}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
              setLoading(navState.loading);
            }}
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={true}
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={() => true}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('[WebView Error]', nativeEvent);
              if (nativeEvent.description && nativeEvent.description.toLowerCase().includes('ssl')) {
                console.log('[WebView] Certificado autoassinado aceito, prosseguindo...');
                return;
              }
              setHasError(true);
              setErrorMessage(nativeEvent.description || 'Verifique sua conexão');
            }}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#5865F2" />
                <Text style={styles.loadingText}>Conectando ao Jogos Bolados...</Text>
              </View>
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111214',
  },
  webviewWrapper: {
    flex: 1,
    backgroundColor: '#1e1f22',
  },
  webview: {
    flex: 1,
    backgroundColor: '#1e1f22',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111214',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  loadingText: {
    color: '#dbdee1',
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#111214',
  },
  errorIcon: {
    fontSize: 54,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#949ba4',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 20,
  },
  errorDetail: {
    fontSize: 12,
    color: '#ed4245',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#5865F2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
