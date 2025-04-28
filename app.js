import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Image, Platform, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Camera from 'expo-camera';

// Заглушка для авторизации, так как next-auth не работает в React Native
const useSession = () => {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('unauthenticated');

  useEffect(() => {
    // Имитация авторизации
    setTimeout(() => {
      setSession({ user: { name: 'Test User' } });
      setStatus('authenticated');
    }, 1000);
  }, []);

  return { data: session, status };
};

const signIn = () => {
  Alert.alert('Sign In', 'Sign in with Google is not implemented in this demo.');
};

const signOut = () => {
  Alert.alert('Sign Out', 'Sign out is not implemented in this demo.');
};

export default function App() {
  const { t, i18n } = useTranslation();
  const { data: session, status } = useSession();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState('');
  const [userName, setUserName] = useState('User');
  const [currentLocale, setCurrentLocale] = useState('en');
  const [cameraPermission, requestCameraPermission] = Camera.useCameraPermissions();
  const [camera, setCamera] = useState(null);
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    i18n.changeLanguage('en');
    setCurrentLocale('en');
    (async () => {
      await requestCameraPermission();
      await MediaLibrary.requestPermissionsAsync();
    })();
  }, [i18n]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.name) {
      setUserName(session.user.name);
    }
  }, [session, status]);

  const handleUpload = async () => {
    if (!session) return Alert.alert('Please sign in');
    if (!file) return Alert.alert('Please select a file');
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.uri.split('/').pop(),
      type: file.type || 'image/jpeg',
    });
    formData.append('prompt', 'Generate a detailed caption for this image in a professional tone');
    try {
      const res = await axios.post('http://3.25.58.70:5000/api/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data.generatedContent);
    } catch (err) {
      console.error('Error in handleUpload:', err);
      setResult(t('error'));
    }
  };

  const generateImageFromText = async (text) => {
    if (!session) return Alert.alert('Please sign in');
    if (!text) return Alert.alert('Please enter text to generate an image');
    try {
      const res = await axios.post('http://3.25.58.70:5000/api/generate-image', { prompt: text });
      setResult(res.data.imageUrl);
    } catch (err) {
      console.error('Error in generateImageFromText:', err);
      setResult(t('error'));
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setFile(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    if (camera) {
      const photo = await camera.takePictureAsync();
      setCapturedMedia(photo.uri);
    }
  };

  const startRecording = async () => {
    if (camera) {
      setRecording(true);
      const video = await camera.recordAsync();
      setCapturedMedia(video.uri);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (camera && recording) {
      camera.stopRecording();
      setRecording(false);
    }
  };

  const createVideoFromImage = async () => {
    if (!session) return Alert.alert('Please sign in');
    if (!file) return Alert.alert('Please select an image');
    const formData = new FormData();
    formData.append('image', {
      uri: file.uri,
      name: file.uri.split('/').pop(),
      type: file.type || 'image/jpeg',
    });
    try {
      const res = await axios.post('http://3.25.58.70:5000/api/image-to-video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data.videoUrl);
    } catch (err) {
      console.error('Error in createVideoFromImage:', err);
      setResult(t('error'));
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.createAssetAsync(result);
        Alert.alert('File downloaded to gallery!');
      }
    } catch (err) {
      console.error('Error downloading file:', err);
      Alert.alert('Error downloading file');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.sidebar}>
        <Text style={styles.title}>{t('title')}</Text>
        <Text style={styles.locale}>Locale: {currentLocale}</Text>
        <View style={styles.selectContainer}>
          <Text style={styles.selectLabel}>Select Language:</Text>
          <View style={styles.select}>
            {['en', 'ru', 'uk', 'es', 'de', 'fr'].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.selectButton, currentLocale === lang && styles.selectButtonActive]}
                onPress={() => {
                  setCurrentLocale(lang);
                  i18n.changeLanguage(lang);
                }}
              >
                <Text style={styles.selectButtonText}>{lang}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.main}>
        {status === 'loading' ? (
          <Text style={styles.text}>Loading...</Text>
        ) : !session ? (
          <TouchableOpacity
            style={styles.button}
            onPress={() => signIn('google')}
          >
            <Text style={styles.buttonText}>{t('login')}</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <Text style={styles.text}>
              {status === 'authenticated' && userName
                ? t('welcome', { name: userName })
                : 'Loading user...'}
            </Text>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => signOut()}
            >
              <Text style={styles.buttonText}>{t('logout')}</Text>
            </TouchableOpacity>

            {/* Секция для генерации изображения из текста */}
            <View style={styles.card}>
              <Text style={styles.label}>{t('generateImage')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('enterTextForImage')}
                onChangeText={(text) => setResult(text)}
              />
              <TouchableOpacity
                style={styles.button}
                onPress={() => generateImageFromText(result)}
              >
                <Text style={styles.buttonText}>{t('generate')}</Text>
              </TouchableOpacity>
            </View>

            {/* Секция для загрузки файла и генерации текста */}
            <View style={styles.card}>
              <Text style={styles.label}>{t('selectFile')}</Text>
              <TouchableOpacity
                style={styles.button}
                onPress={pickImage}
              >
                <Text style={styles.buttonText}>Pick File</Text>
              </TouchableOpacity>
              {file && (
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleUpload}
                >
                  <Text style={styles.buttonText}>{t('upload')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Секция для создания видео из изображения */}
            <View style={styles.card}>
              <Text style={styles.label}>{t('createVideoFromImage')}</Text>
              <TouchableOpacity
                style={styles.button}
                onPress={pickImage}
              >
                <Text style={styles.buttonText}>Pick Image</Text>
              </TouchableOpacity>
              {file && (
                <TouchableOpacity
                  style={styles.button}
                  onPress={createVideoFromImage}
                >
                  <Text style={styles.buttonText}>{t('createVideo')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Секция для работы с камерой */}
            <View style={styles.card}>
              <Text style={styles.label}>{t('captureMedia')}</Text>
              {!camera ? (
                <TouchableOpacity
                  style={styles.button}
                  onPress={async () => {
                    if (cameraPermission.status !== 'granted') {
                      await requestCameraPermission();
                    }
                    setCamera(true);
                  }}
                >
                  <Text style={styles.buttonText}>{t('startCamera')}</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <Camera.Camera
                    style={styles.camera}
                    ref={(ref) => setCamera(ref)}
                  />
                  <View style={styles.cameraButtons}>
                    <TouchableOpacity
                      style={styles.button}
                      onPress={takePhoto}
                    >
                      <Text style={styles.buttonText}>{t('capturePhoto')}</Text>
                    </TouchableOpacity>
                    {!recording ? (
                      <TouchableOpacity
                        style={styles.button}
                        onPress={startRecording}
                      >
                        <Text style={styles.buttonText}>{t('startRecording')}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={stopRecording}
                      >
                        <Text style={styles.buttonText}>{t('stopRecording')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
              {capturedMedia && (
                <View style={styles.result}>
                  {capturedMedia.includes('image') ? (
                    <Image source={{ uri: capturedMedia }} style={styles.image} />
                  ) : (
                    <Text>Video playback not supported in this demo</Text>
                  )}
                </View>
              )}
            </View>

            {result && (
              <View style={styles.result}>
                {result.startsWith('http') ? (
                  result.includes('video') ? (
                    <Text>Video playback not supported in this demo</Text>
                  ) : (
                    <Image source={{ uri: result }} style={styles.image} />
                  )
                ) : (
                  <Text style={styles.text}>{result}</Text>
                )}
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleDownload}
                >
                  <Text style={styles.buttonText}>Download</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A8A',
  },
  sidebar: {
    backgroundColor: 'rgba(17, 24, 39, 0.3)',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: 'white',
    marginBottom: 16,
  },
  locale: {
    color: 'white',
    marginBottom: 16,
  },
  selectContainer: {
    marginBottom: 16,
  },
  selectLabel: {
    color: 'white',
    marginBottom: 8,
  },
  select: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectButton: {
    backgroundColor: '#2563EB',
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  selectButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  selectButtonText: {
    color: 'white',
  },
  main: {
    padding: 16,
    backgroundColor: '#2563EB',
  },
  text: {
    color: 'white',
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#8B5CF6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  label: {
    color: 'white',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1F2937',
    color: 'white',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  camera: {
    width: '100%',
    height: 200,
    marginBottom: 16,
  },
  cameraButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  result: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
});