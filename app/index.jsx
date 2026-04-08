import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOTAL = 300;
const PHOTOS_KEY = 'gitex_photos_v1';
const { width: SW, height: SH } = Dimensions.get('window');

// ─── Colors ───────────────────────────────────────────────
const C = {
  bg: '#050508',
  surface: '#0d0d14',
  card: '#12121c',
  accent: '#00f5a0',
  accent2: '#00d9f5',
  muted: '#44445a',
  text: '#f0f0f0',
  border: 'rgba(0,245,160,0.18)',
};

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [preview, setPreview] = useState(null); // { uri, num }
  const [galleryPhoto, setGalleryPhoto] = useState(null);
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions({ writeOnly: true });

  const cameraRef = useRef(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const counterScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const previewScale = useRef(new Animated.Value(0.5)).current;
  const previewOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  // Load saved photos on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(PHOTOS_KEY);
        if (saved) setPhotos(JSON.parse(saved));
      } catch (_) {}
    })();
  }, []);

  const savePhotos = async (arr) => {
    try {
      await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(arr));
    } catch (_) {}
  };

  const count = photos.length;
  const remaining = TOTAL - count;
  const pct = count / TOTAL;

  // ─── Shoot ────────────────────────────────────────────────
  const shoot = async () => {
    if (!cameraRef.current || !cameraReady || count >= TOTAL) return;

    // Haptic
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Flash
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    // Ring burst
    ringScale.setValue(0);
    ringOpacity.setValue(0.9);
    Animated.parallel([
      Animated.timing(ringScale, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(ringOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, skipProcessing: true });
      showPreview(photo.uri);
    } catch (e) {
      console.warn('Camera error:', e);
    }
  };

  const showPreview = (uri) => {
    setPreview({ uri, num: count + 1 });
    previewScale.setValue(0.5);
    previewOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(previewScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
      Animated.timing(previewOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const confirmPhoto = async () => {
    if (!preview) return;
    const newPhotos = [...photos, { uri: preview.uri, num: preview.num }];
    setPhotos(newPhotos);
    await savePhotos(newPhotos);

    // Save to the phone gallery
    let canSaveToGallery = mediaPermission?.granted;
    if (!canSaveToGallery) {
      try {
        const permissionResult = await requestMediaPermission();
        canSaveToGallery = permissionResult.granted;
      } catch (_) {}
    }

    if (canSaveToGallery) {
      try { await MediaLibrary.saveToLibraryAsync(preview.uri); } catch (_) {}
    }

    // Counter animation
    Animated.sequence([
      Animated.spring(counterScale, { toValue: 1.2, useNativeDriver: true, tension: 200 }),
      Animated.spring(counterScale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.timing(glowOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    setPreview(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const dismissPreview = () => setPreview(null);

  const deletePhotoFromApp = (photoToDelete) => {
    if (!photoToDelete) return;

    Alert.alert(
      'Remove photo from app?',
      `Remove photo #${photoToDelete.num} from the app? The copy in the phone gallery will stay.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updatedPhotos = photos
              .filter((photo) => !(photo.uri === photoToDelete.uri && photo.num === photoToDelete.num))
              .map((photo, index) => ({ ...photo, num: index + 1 }));

            setPhotos(updatedPhotos);
            await savePhotos(updatedPhotos);
            setGalleryPhoto(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          },
        },
      ],
      { cancelable: true }
    );
  };

  // ─── Permissions UI ───────────────────────────────────────
  if (!camPermission) return <View style={s.centered}><Text style={s.mutedTxt}>Loading…</Text></View>;

  if (!camPermission.granted) {
    return (
      <View style={[s.centered, { backgroundColor: C.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <Text style={s.bigNum}>300</Text>
        <Text style={s.challengeLabel}>GITEX AFRICA CHALLENGE</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestCamPermission}>
          <Text style={s.permBtnTxt}>ENABLE CAMERA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Main UI ──────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Grid background lines */}
      <View style={s.gridOverlay} pointerEvents="none" />

      {/* ── Camera viewfinder ── */}
      <View style={s.cameraWrap}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
        />
        {/* Corners */}
        <View style={[s.corner, s.cornerTL]} />
        <View style={[s.corner, s.cornerTR]} />
        <View style={[s.corner, s.cornerBL]} />
        <View style={[s.corner, s.cornerBR]} />

        {/* Ring burst */}
        <Animated.View style={[s.ringBurst, {
          transform: [{ scale: ringScale }],
          opacity: ringOpacity,
        }]} pointerEvents="none" />

        {/* Flash overlay */}
        <Animated.View style={[s.flashOverlay, { opacity: flashAnim }]} pointerEvents="none" />

        {/* Badge overlay on camera */}
        {count > 0 && (
          <View style={s.cameraBadge}>
            <Text style={s.cameraBadgeTxt}>#{count} / {TOTAL}</Text>
          </View>
        )}
      </View>

      {/* ── Counter + Shoot ── */}
      <View style={s.controlsPanel}>
        {/* Counter */}
        <View style={s.counterSection}>
          <Text style={s.counterLabel}>STANDS REMAINING</Text>
          <Animated.View style={{ transform: [{ scale: counterScale }] }}>
            <Animated.View style={[s.counterGlow, { opacity: glowOpacity }]} />
            <Text style={s.counterNum}>{remaining}</Text>
          </Animated.View>

          {/* Progress bar */}
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${pct * 100}%` }]} />
          </View>
          <Text style={s.progressTxt}>{count} / {TOTAL} CAPTURED</Text>
        </View>

        {/* Shoot button */}
        <TouchableOpacity
          onPress={shoot}
          activeOpacity={0.8}
          style={s.shootBtn}
          disabled={count >= TOTAL}
        >
          <View style={s.shootInner}>
            <View style={s.shootCore} />
          </View>
        </TouchableOpacity>

        {/* Gallery strip */}
        <View style={s.galleryStrip}>
          {count === 0 ? (
            <Text style={s.mutedTxt}>YOUR SHOTS APPEAR HERE</Text>
          ) : (
            <FlatList
              data={[...photos].reverse()}
              horizontal
              keyExtractor={(item) => item.uri}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingHorizontal: 4 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => setGalleryPhoto(item)}>
                  <Image source={{ uri: item.uri }} style={s.thumb} />
                  <View style={s.thumbNumWrap}>
                    <Text style={s.thumbNum}>#{item.num}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>

      {/* ── Preview Modal ── */}
      <Modal visible={!!preview} transparent animationType="fade">
        <View style={s.modalBg}>
          <Animated.View style={[s.previewCard, {
            transform: [{ scale: previewScale }],
            opacity: previewOpacity,
          }]}>
            {preview && (
              <Image source={{ uri: preview.uri }} style={s.previewImg} resizeMode="cover" />
            )}
            <View style={s.previewInfo}>
              <Text style={s.previewBadge}>#{preview?.num} / {TOTAL}</Text>
              <Text style={s.previewSub}>GITEX AFRICA 2025 · 300 CHALLENGE</Text>
            </View>
            <View style={s.previewBtns}>
              <TouchableOpacity style={s.discardBtn} onPress={dismissPreview}>
                <Text style={s.discardTxt}>RETAKE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={confirmPhoto}>
                <Text style={s.confirmTxt}>ADD TO GALLERY →</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Gallery photo modal ── */}
      <Modal visible={!!galleryPhoto} transparent animationType="fade">
        <View style={s.modalBg}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setGalleryPhoto(null)} />
          <View style={s.galleryModalCard}>
            {galleryPhoto && (
              <Image source={{ uri: galleryPhoto.uri }} style={s.galleryModalImg} resizeMode="contain" />
            )}
            <Text style={s.previewBadge}>#{galleryPhoto?.num} / {TOTAL}</Text>
            <TouchableOpacity style={s.deleteBtn} onPress={() => deletePhotoFromApp(galleryPhoto)}>
              <Text style={s.deleteTxt}>REMOVE FROM APP</Text>
            </TouchableOpacity>
            <Text style={[s.mutedTxt, { marginTop: 6 }]}>TAP OUTSIDE TO CLOSE</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const CORNER_SIZE = 18;
const CORNER_THICKNESS = 2;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Rendered as decorative — grid effect via borders handled in JS for perf
  },

  // Camera
  cameraWrap: {
    width: '100%',
    height: SH * 0.48,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: C.accent,
  },
  cornerTL: { top: 12, left: 12, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerTR: { top: 12, right: 12, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  cornerBL: { bottom: 12, left: 12, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerBR: { bottom: 12, right: 12, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },

  ringBurst: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: C.accent,
    alignSelf: 'center',
    top: SH * 0.48 / 2 - 60,
  },

  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
  },

  cameraBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: C.border,
  },
  cameraBadgeTxt: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: C.accent,
    letterSpacing: 1,
  },

  // Controls panel
  controlsPanel: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },

  counterSection: { alignItems: 'center', gap: 4 },
  counterLabel: { fontSize: 9, letterSpacing: 4, color: C.muted, fontFamily: 'monospace' },
  counterGlow: {
    position: 'absolute',
    width: 160, height: 80,
    backgroundColor: C.accent,
    borderRadius: 80,
    opacity: 0,
    alignSelf: 'center',
    top: -10,
  },
  counterNum: {
    fontSize: 72,
    fontWeight: '900',
    color: C.text,
    letterSpacing: -4,
    lineHeight: 76,
    fontFamily: 'monospace',
  },

  progressBg: {
    width: '80%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  progressTxt: { fontSize: 9, letterSpacing: 2, color: C.muted, fontFamily: 'monospace' },

  // Shoot button
  shootBtn: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.accent,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  shootInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: 'rgba(0,245,160,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shootCore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,245,160,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,160,0.5)',
  },

  // Gallery strip
  galleryStrip: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 70,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: C.border,
  },
  thumbNumWrap: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 3,
    borderRadius: 2,
  },
  thumbNum: { fontSize: 9, color: C.text, fontFamily: 'monospace' },

  // Misc
  mutedTxt: {
    fontSize: 9,
    letterSpacing: 3,
    color: C.muted,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  bigNum: {
    fontSize: 100,
    fontWeight: '900',
    color: C.accent,
    fontFamily: 'monospace',
  },
  challengeLabel: {
    fontSize: 10,
    letterSpacing: 4,
    color: C.muted,
    fontFamily: 'monospace',
    marginBottom: 30,
  },
  permBtn: {
    borderWidth: 1,
    borderColor: C.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 2,
  },
  permBtnTxt: { color: C.accent, fontFamily: 'monospace', letterSpacing: 2, fontSize: 12 },

  // Preview modal
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  previewCard: {
    width: '100%',
    backgroundColor: C.card,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  previewImg: { width: '100%', height: SW * 0.75 },
  previewInfo: { alignItems: 'center', paddingVertical: 14, gap: 4 },
  previewBadge: {
    fontSize: 22,
    fontWeight: '900',
    color: C.accent,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  previewSub: { fontSize: 9, color: C.muted, letterSpacing: 2, fontFamily: 'monospace' },
  previewBtns: { flexDirection: 'row', borderTopWidth: 1, borderColor: C.border },
  discardBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRightWidth: 1,
    borderColor: C.border,
  },
  discardTxt: { color: C.muted, fontFamily: 'monospace', fontSize: 11, letterSpacing: 2 },
  confirmBtn: { flex: 2, paddingVertical: 14, alignItems: 'center' },
  confirmTxt: { color: C.accent, fontFamily: 'monospace', fontSize: 11, letterSpacing: 1 },

  // Gallery modal
  galleryModalCard: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  galleryModalImg: {
    width: SW - 40,
    height: SW - 40,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  deleteBtn: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.45)',
    backgroundColor: 'rgba(255,107,107,0.08)',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 2,
  },
  deleteTxt: {
    color: '#ff6b6b',
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 2,
  },
});
